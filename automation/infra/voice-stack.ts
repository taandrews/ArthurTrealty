import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as connect from 'aws-cdk-lib/aws-connect';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lex from 'aws-cdk-lib/aws-lex';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { AppConfig } from '../src/config';
import { VOICE_NUMBER_PARAMETER, VOICE_PARAMETER } from '../src/services/channels';
import type { SharedData } from './stack';

export interface VoiceStackProps extends StackProps {
  config: AppConfig;
  shared: SharedData;
}

const TALK_TO_PERSON_UTTERANCES = [
  'talk to a person', 'speak to a person', 'speak to someone', 'can I talk to a real person', 'real person',
  'representative', 'agent', 'human', 'operator', 'can someone call me', 'have someone call me back',
  'I want to speak with my coordinator', 'connect me to someone',
];

/**
 * Two-way AI phone calls: an Amazon Connect instance and phone number, a Lex bot that turns speech
 * into text, and a Lambda that asks Claude on Bedrock what to say. The call flow reads the step's
 * script, then hands the conversation to the bot. Data stays in the main stack's region.
 */
export class VoiceStack extends Stack {
  constructor(scope: Construct, id: string, props: VoiceStackProps) {
    super(scope, id, props);
    const { config: cfg, shared } = props;

    /* ——— Amazon Connect instance and phone number ——— */

    const instance = new connect.CfnInstance(this, 'Instance', {
      identityManagementType: 'CONNECT_MANAGED',
      instanceAlias: `arthur-t-realty-${this.account}`,
      attributes: { inboundCalls: true, outboundCalls: true, contactflowLogs: true },
    });
    const phone = new connect.CfnPhoneNumber(this, 'PhoneNumber', {
      targetArn: instance.attrArn,
      countryCode: 'US',
      type: 'DID',
      description: 'Arthur T Realty AI homeownership assistant',
    });

    /* ——— The assistant's brain: Lambda + Claude on Bedrock ——— */

    const botFn = new NodejsFunction(this, 'VoiceBotFn', {
      entry: path.join(__dirname, '../src/handlers/voice-bot.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(25),
      environment: shared.environment,
      logGroup: new logs.LogGroup(this, 'VoiceBotLogs', {
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: { minify: true, sourceMap: true, target: 'node22' },
      projectRoot: path.join(__dirname, '..'),
      depsLockFilePath: path.join(__dirname, '../package-lock.json'),
    });
    const allow = (actions: string[], resources: string[]) =>
      botFn.addToRolePolicy(new iam.PolicyStatement({ actions, resources }));
    allow(['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Query', 'dynamodb:Scan'], shared.tableArns);
    allow(['sns:Publish'], [shared.staffAlertsTopicArn]);
    allow(['states:SendTaskSuccess', 'states:StopExecution'], [shared.stateMachineArn, shared.executionsArn]);
    allow(['scheduler:CreateSchedule'], [shared.scheduleArn]);
    allow(['iam:PassRole'], [shared.schedulerRoleArn]);
    allow(['secretsmanager:GetSecretValue'], [shared.secretArn]);
    allow(['sms-voice:SendTextMessage'], ['*']);
    allow(['bedrock:InvokeModel'], [
      `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.anthropic.claude-*`,
      'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
    ]);

    /* ——— Lex bot: speech in, Lambda decides every reply ——— */

    const lexRole = new iam.Role(this, 'LexRole', {
      assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      inlinePolicies: {
        speech: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({ actions: ['polly:SynthesizeSpeech'], resources: ['*'] })],
        }),
      },
    });
    const botLocales: lex.CfnBot.BotLocaleProperty[] = [{
      localeId: 'en_US',
      nluConfidenceThreshold: 0.6,
      voiceSettings: { voiceId: cfg.voice.voiceId, engine: 'neural' },
      intents: [
        {
          name: 'TalkToPerson',
          sampleUtterances: TALK_TO_PERSON_UTTERANCES.map((utterance) => ({ utterance })),
          fulfillmentCodeHook: { enabled: true },
        },
        // Everything else the caller says lands here and goes to Claude.
        { name: 'FallbackIntent', parentIntentSignature: 'AMAZON.FallbackIntent', fulfillmentCodeHook: { enabled: true } },
      ],
    }];
    const bot = new lex.CfnBot(this, 'Bot', {
      name: 'ArthurTRealtyAssistant',
      roleArn: lexRole.roleArn,
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      autoBuildBotLocales: true,
      botLocales,
    });
    // A new version is only cut when its properties change, so tie it to the bot definition.
    const definitionHash = createHash('sha256').update(JSON.stringify(botLocales)).digest('hex').slice(0, 12);
    const version = new lex.CfnBotVersion(this, 'BotVersion', {
      botId: bot.attrId,
      description: `definition ${definitionHash}`,
      botVersionLocaleSpecification: [{ localeId: 'en_US', botVersionLocaleDetails: { sourceBotVersion: 'DRAFT' } }],
    });
    const alias = new lex.CfnBotAlias(this, 'BotAlias', {
      botId: bot.attrId,
      botAliasName: 'live',
      botVersion: version.attrBotVersion,
      botAliasLocaleSettings: [{
        localeId: 'en_US',
        botAliasLocaleSetting: {
          enabled: true,
          codeHookSpecification: { lambdaCodeHook: { codeHookInterfaceVersion: '1.0', lambdaArn: botFn.functionArn } },
        },
      }],
    });
    botFn.addPermission('InvokeFromLex', {
      principal: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      sourceArn: alias.attrArn,
    });
    const lexAssociation = new connect.CfnIntegrationAssociation(this, 'LexAssociation', {
      instanceId: instance.attrArn,
      integrationType: 'LEX_BOT',
      integrationArn: alias.attrArn,
    });

    /* ——— Call flow: read the script, then talk with the assistant ——— */

    const flow = new connect.CfnContactFlow(this, 'AssistantFlow', {
      instanceArn: instance.attrArn,
      name: 'AI Homeownership Assistant',
      type: 'CONTACT_FLOW',
      description: 'Reads the step script, then hands the caller to the AI assistant',
      content: this.toJsonString({
        Version: '2019-10-30',
        StartAction: 'set-voice',
        Actions: [
          {
            Identifier: 'set-voice',
            Type: 'UpdateContactTextToSpeechVoice',
            Parameters: { TextToSpeechVoice: cfg.voice.voiceId, TextToSpeechEngine: 'Neural' },
            Transitions: { NextAction: 'converse' },
          },
          {
            Identifier: 'converse',
            Type: 'ConnectParticipantWithLexBot',
            Parameters: {
              Text: '$.Attributes.message',
              LexV2Bot: { AliasArn: alias.attrArn },
              LexSessionAttributes: { leadId: '$.Attributes.leadId', opening: '$.Attributes.message' },
            },
            Transitions: {
              NextAction: 'hangup',
              Errors: [
                { NextAction: 'hangup', ErrorType: 'NoMatchingError' },
                { NextAction: 'hangup', ErrorType: 'NoMatchingCondition' },
              ],
            },
          },
          { Identifier: 'hangup', Type: 'DisconnectParticipant', Parameters: {}, Transitions: {} },
        ],
      }),
    });
    flow.node.addDependency(lexAssociation);

    /* ——— Tell the main stack's functions how to place calls ——— */

    new ssm.StringParameter(this, 'VoiceSetup', {
      parameterName: VOICE_PARAMETER,
      description: 'Amazon Connect IDs used to place AI calls',
      stringValue: this.toJsonString({
        instanceId: instance.attrId,
        // ARN format: arn:aws:connect:region:account:instance/{instanceId}/contact-flow/{flowId}
        flowId: Fn.select(3, Fn.split('/', flow.attrContactFlowArn)),
        phoneNumber: phone.attrAddress,
      }),
    });

    /* ——— Maryland number watcher ——— */
    // AWS had no 410/443 numbers to claim. Every hour this claims one if it appears and makes it the caller ID.

    const watchFn = new NodejsFunction(this, 'NumberWatchFn', {
      entry: path.join(__dirname, '../src/handlers/number-watch.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(2),
      environment: {
        INSTANCE_ARN: instance.attrArn,
        INSTANCE_ID: instance.attrId,
        FLOW_ID: Fn.select(3, Fn.split('/', flow.attrContactFlowArn)),
      },
      logGroup: new logs.LogGroup(this, 'NumberWatchLogs', {
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: { minify: true, sourceMap: true, target: 'node22' },
      projectRoot: path.join(__dirname, '..'),
      depsLockFilePath: path.join(__dirname, '../package-lock.json'),
    });
    watchFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'connect:SearchAvailablePhoneNumbers', 'connect:ClaimPhoneNumber', 'connect:ListPhoneNumbersV2',
        'connect:DescribePhoneNumber', 'connect:AssociatePhoneNumberContactFlow',
      ],
      resources: [instance.attrArn, `${instance.attrArn}/*`, `arn:aws:connect:${this.region}:${this.account}:phone-number/*`],
    }));
    watchFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:PutParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${VOICE_NUMBER_PARAMETER}`],
    }));
    new events.Rule(this, 'NumberWatchSchedule', {
      schedule: events.Schedule.rate(Duration.hours(1)),
      targets: [new targets.LambdaFunction(watchFn)],
    });

    new CfnOutput(this, 'AssistantPhoneNumber', { value: phone.attrAddress });
    new CfnOutput(this, 'ConnectInstanceId', { value: instance.attrId });
  }
}
