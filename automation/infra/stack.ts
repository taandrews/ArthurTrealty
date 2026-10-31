import { ArnFormat, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';
import * as path from 'node:path';
import type { AppConfig } from '../src/config';
import { VOICE_NUMBER_PARAMETER, VOICE_PARAMETER } from '../src/services/channels';
import { buildJourneyDefinition } from './journey-definition';

export interface ArthurTRealtyStackProps extends StackProps {
  config: AppConfig;
}

/** What the voice stack (in Connect's region) needs from this stack. */
export interface SharedData {
  environment: Record<string, string>;
  tableArns: string[];
  staffAlertsTopicArn: string;
  stateMachineArn: string;
  executionsArn: string;
  schedulerRoleArn: string;
  scheduleArn: string;
  secretArn: string;
}

const PREFIX = 'arthur-t-realty';
/** Amazon Connect isn't offered in us-east-2, so calls run in us-east-1. */
export const VOICE_REGION = 'us-east-1';

export class ArthurTRealtyStack extends Stack {
  readonly shared: SharedData;

  constructor(scope: Construct, id: string, props: ArthurTRealtyStackProps) {
    super(scope, id, props);
    const cfg = props.config;

    /* ——— Website: Amplify Hosting ——— */

    // Static Next.js export, uploaded by scripts/deploy-site.ts (no Git connection, no Amplify build).
    const siteApp = new amplify.CfnApp(this, 'SiteApp', {
      name: PREFIX,
      platform: 'WEB',
      description: 'Arthur T Realty website',
      customRules: [{ source: '/<*>', target: '/404.html', status: '404' }],
    });
    const siteBranch = new amplify.CfnBranch(this, 'SiteMain', {
      appId: siteApp.attrAppId,
      branchName: 'main',
      stage: 'PRODUCTION',
      enableAutoBuild: false,
    });
    const siteUrl = `https://${siteBranch.branchName}.${siteApp.attrDefaultDomain}`;

    /* ——— Data ——— */

    const leads = new dynamodb.TableV2(this, 'Leads', {
      partitionKey: { name: 'leadId', type: dynamodb.AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
      // Only send-once markers and daily counters set this; lead records never expire.
      timeToLiveAttribute: 'expiresAt',
      globalSecondaryIndexes: [
        { indexName: 'byPhone', partitionKey: { name: 'phone', type: dynamodb.AttributeType.STRING } },
        { indexName: 'byEmail', partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING } },
      ],
    });
    const events = new dynamodb.TableV2(this, 'LeadActivity', {
      partitionKey: { name: 'leadId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const secret = new secretsmanager.Secret(this, 'IntegrationSecrets', {
      description: 'Arthur T Realty automation: Facebook / Google Ads webhook keys and the unsubscribe signing key',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          googleAdsKey: '', facebookAppSecret: '', facebookVerifyToken: '', facebookPageAccessToken: '',
        }),
        generateStringKey: 'unsubscribeSecret',
        excludePunctuation: true,
        passwordLength: 48,
      },
    });

    /* ——— Lambda functions ——— */

    // Fixed names let functions reference each other (and the state machine) without circular dependencies.
    const jobsName = `${PREFIX}-jobs`;
    const stateMachineName = `${PREFIX}-home-buyer-journey`;
    const arn = (service: string, resource: string, resourceName: string) =>
      this.formatArn({ service, resource, resourceName, arnFormat: ArnFormat.COLON_RESOURCE_NAME });
    const jobsArn = arn('lambda', 'function', jobsName);
    const stateMachineArn = arn('states', 'stateMachine', stateMachineName);
    const executionsArn = arn('states', 'execution', `${stateMachineName}:*`);

    const schedulerGroup = new scheduler.CfnScheduleGroup(this, 'ScheduleGroup', { name: PREFIX });
    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      inlinePolicies: {
        invokeJobs: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({ actions: ['lambda:InvokeFunction'], resources: [jobsArn] })],
        }),
      },
    });

    /* ——— Staff alerts (SNS email, no SES or DNS needed) ——— */

    // Each address gets one AWS confirmation email to click. Managers get every alert;
    // coordinators only get alerts for clients assigned to them.
    const staffAlerts = new sns.Topic(this, 'StaffAlerts', { displayName: cfg.brandName });
    const managers = new Set((cfg.managerEmails as string[]).map((e) => e.toLowerCase()));
    for (const email of managers) staffAlerts.addSubscription(new subs.EmailSubscription(email));
    for (const email of new Set(cfg.staff.map((s) => s.email.toLowerCase()).filter(Boolean))) {
      if (managers.has(email)) continue;
      staffAlerts.addSubscription(new subs.EmailSubscription(email, {
        filterPolicy: { coordinator: sns.SubscriptionFilter.stringFilter({ allowlist: [email] }) },
      }));
    }

    const environment: Record<string, string> = {
      CONFIG: JSON.stringify(cfg),
      LEADS_TABLE: leads.tableName,
      EVENTS_TABLE: events.tableName,
      STATE_MACHINE_ARN: stateMachineArn,
      STAFF_ALERTS_TOPIC_ARN: staffAlerts.topicArn,
      JOBS_FUNCTION_ARN: jobsArn,
      SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
      SCHEDULER_GROUP: PREFIX,
      SECRET_ARN: secret.secretArn,
      SITE_URL: siteUrl,
      VOICE_REGION: VOICE_REGION,
      ALLOWED_ORIGINS: [siteUrl, 'http://localhost:3100'].join(','),
    };

    const fn = (id: string, file: string, opts: { timeout: number; functionName?: string }) => {
      const f = new NodejsFunction(this, id, {
        functionName: opts.functionName,
        entry: path.join(__dirname, '../src/handlers', file),
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        timeout: Duration.seconds(opts.timeout),
        environment,
        logGroup: new logs.LogGroup(this, `${id}Logs`, {
          retention: logs.RetentionDays.THREE_MONTHS,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        bundling: { minify: true, sourceMap: true, target: 'node22' },
        projectRoot: path.join(__dirname, '..'),
        depsLockFilePath: path.join(__dirname, '../package-lock.json'),
      });
      leads.grantReadWriteData(f);
      events.grantReadWriteData(f);
      secret.grantRead(f);
      staffAlerts.grantPublish(f);
      if (cfg.email.enabled) f.addToRolePolicy(new iam.PolicyStatement({ actions: ['ses:SendEmail'], resources: ['*'] }));
      f.addToRolePolicy(new iam.PolicyStatement({ actions: ['sms-voice:SendTextMessage'], resources: ['*'] }));
      f.addToRolePolicy(new iam.PolicyStatement({
        actions: ['scheduler:CreateSchedule'],
        resources: [this.formatArn({ service: 'scheduler', resource: 'schedule', resourceName: `${PREFIX}/*` })],
      }));
      f.addToRolePolicy(new iam.PolicyStatement({ actions: ['iam:PassRole'], resources: [schedulerRole.roleArn] }));
      f.addToRolePolicy(new iam.PolicyStatement({
        actions: ['states:StartExecution', 'states:SendTaskSuccess', 'states:SendTaskFailure', 'states:StopExecution'],
        resources: [stateMachineArn, executionsArn],
      }));
      // AI calls go through Amazon Connect in the voice region; its IDs are read from an SSM parameter there.
      f.addToRolePolicy(new iam.PolicyStatement({
        actions: ['connect:StartOutboundVoiceContact'],
        resources: [`arn:aws:connect:${VOICE_REGION}:${this.account}:instance/*/contact/*`],
      }));
      f.addToRolePolicy(new iam.PolicyStatement({
        actions: ['ssm:GetParameters'],
        resources: [VOICE_PARAMETER, VOICE_NUMBER_PARAMETER].map((name) => `arn:aws:ssm:${VOICE_REGION}:${this.account}:parameter${name}`),
      }));
      return f;
    };

    const jobsFn = fn('JobsFn', 'jobs.ts', { timeout: 300, functionName: jobsName });
    const journeyFn = fn('JourneyFn', 'journey.ts', { timeout: 60 });
    const apiFn = fn('ApiFn', 'api.ts', { timeout: 29 });
    const inboundSmsFn = fn('InboundSmsFn', 'inbound-sms.ts', { timeout: 60 });
    // The AI assistant answers client texts.
    inboundSmsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.anthropic.claude-*`,
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
      ],
    }));

    this.shared = {
      environment: { ...environment, DATA_REGION: this.region },
      tableArns: [leads.tableArn, `${leads.tableArn}/index/*`, events.tableArn],
      staffAlertsTopicArn: staffAlerts.topicArn,
      stateMachineArn,
      executionsArn,
      schedulerRoleArn: schedulerRole.roleArn,
      scheduleArn: this.formatArn({ service: 'scheduler', resource: 'schedule', resourceName: `${PREFIX}/*` }),
      secretArn: secret.secretArn,
    };

    /* ——— Home Buyer Journey state machine ——— */

    const journey = new sfn.StateMachine(this, 'HomeBuyerJourney', {
      stateMachineName,
      definitionBody: sfn.DefinitionBody.fromChainable(buildJourneyDefinition(this, journeyFn, cfg)),
      logs: {
        destination: new logs.LogGroup(this, 'StateMachineLogs', {
          retention: logs.RetentionDays.THREE_MONTHS,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        level: sfn.LogLevel.ERROR,
      },
    });

    /* ——— Scheduled jobs ——— */

    const daily = (id: string, cron: string, action: string) =>
      new scheduler.CfnSchedule(this, id, {
        groupName: schedulerGroup.ref,
        scheduleExpression: cron,
        scheduleExpressionTimezone: cfg.timeZone,
        flexibleTimeWindow: { mode: 'OFF' },
        target: { arn: jobsFn.functionArn, roleArn: schedulerRole.roleArn, input: JSON.stringify({ action }) },
      });
    daily('NurtureDaily', 'cron(0 10 * * ? *)', 'nurture');
    daily('InactivityDaily', 'cron(0 9 * * ? *)', 'inactivity');

    /* ——— Inbound texts (two-way SMS → SNS → Lambda) ——— */

    const inboundSms = new sns.Topic(this, 'InboundSms', { displayName: 'Arthur T Realty inbound SMS' });
    inboundSms.addToResourcePolicy(new iam.PolicyStatement({
      principals: [new iam.ServicePrincipal('sms-voice.amazonaws.com')],
      actions: ['sns:Publish'],
      resources: [inboundSms.topicArn],
      conditions: { StringEquals: { 'aws:SourceAccount': this.account } },
    }));
    inboundSmsFn.addEventSource(new SnsEventSource(inboundSms));

    /* ——— Staff login (Cognito) ——— */

    const users = new cognito.UserPool(this, 'StaffUsers', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 12 },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const domain = users.addDomain('Login', { cognitoDomain: { domainPrefix: `${PREFIX}-${this.account}` } });
    const staffCallbacks = [`${siteUrl}/staff/`, 'http://localhost:3100/staff/'];
    const client = users.addClient('StaffDashboard', {
      generateSecret: false,
      oAuth: {
        flows: { implicitCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: staffCallbacks,
        logoutUrls: staffCallbacks,
      },
      idTokenValidity: Duration.hours(8),
    });

    /* ——— API ——— */

    const api = new apigw.RestApi(this, 'Api', {
      restApiName: `${PREFIX}-api`,
      deployOptions: {
        throttlingRateLimit: 20,
        throttlingBurstLimit: 40,
        // The public lead form starts calls and texts, so it gets a much tighter limit than the rest of the API.
        methodOptions: { '/public/leads/POST': { throttlingRateLimit: 2, throttlingBurstLimit: 5 } },
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [siteUrl, 'http://localhost:3100'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
      },
    });
    for (const type of [apigw.ResponseType.DEFAULT_4XX, apigw.ResponseType.DEFAULT_5XX]) {
      api.addGatewayResponse(`Cors${type.responseType}`, {
        type,
        responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      });
    }
    const integration = new apigw.LambdaIntegration(apiFn);
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'StaffAuthorizer', { cognitoUserPools: [users] });

    const publicApi = api.root.addResource('public');
    publicApi.addProxy({ defaultIntegration: integration, anyMethod: true });
    // Its own method (same Lambda) so the stage can throttle it separately.
    publicApi.addResource('leads').addMethod('POST', integration);
    api.root.addResource('webhooks').addProxy({ defaultIntegration: integration, anyMethod: true });
    api.root.addResource('integrations').addProxy({ anyMethod: false }).addMethod('ANY', integration, { apiKeyRequired: true });
    api.root.addResource('staff').addProxy({ anyMethod: false }).addMethod('ANY', integration, {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    const apiKey = api.addApiKey('IntegrationKey', { apiKeyName: `${PREFIX}-integrations` });
    api.addUsagePlan('IntegrationPlan', {
      throttle: { rateLimit: 10, burstLimit: 20 },
      apiStages: [{ api, stage: api.deploymentStage }],
    }).addApiKey(apiKey);

    // Per-visitor limit on the public routes: an IP sending more than 20 requests in 5 minutes is blocked for a while.
    const firewall = new wafv2.CfnWebACL(this, 'ApiFirewall', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: `${PREFIX}-api`, sampledRequestsEnabled: true },
      rules: [{
        name: 'PublicRateLimit',
        priority: 0,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: 20,
            evaluationWindowSec: 300,
            aggregateKeyType: 'IP',
            // The path WAF sees includes the stage name (/prod/public/...), so match anywhere in it.
            scopeDownStatement: {
              byteMatchStatement: {
                fieldToMatch: { uriPath: {} },
                positionalConstraint: 'CONTAINS',
                searchString: '/public/',
                textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
              },
            },
          },
        },
        visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: `${PREFIX}-public-rate-limit`, sampledRequestsEnabled: true },
      }],
    });
    new wafv2.CfnWebACLAssociation(this, 'ApiFirewallAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: firewall.attrArn,
    });

    /* ——— Outputs ——— */

    new CfnOutput(this, 'SiteUrl', { value: siteUrl });
    new CfnOutput(this, 'AmplifyAppId', { value: siteApp.attrAppId });
    // Read by scripts/deploy-site.ts to write the site's /config.json
    new CfnOutput(this, 'StaffLoginDomain', { value: domain.baseUrl() });
    new CfnOutput(this, 'StaffLoginClientId', { value: client.userPoolClientId });
    new CfnOutput(this, 'StaffDashboardUrl', { value: `${siteUrl}/staff/` });
    new CfnOutput(this, 'ApiUrl', { value: api.url });
    new CfnOutput(this, 'IntegrationApiKeyId', {
      value: apiKey.keyId,
      description: 'aws apigateway get-api-key --include-value --api-key <id>',
    });
    new CfnOutput(this, 'StaffUserPoolId', { value: users.userPoolId });
    new CfnOutput(this, 'InboundSmsTopicArn', { value: inboundSms.topicArn });
    new CfnOutput(this, 'StaffAlertsTopicArn', { value: staffAlerts.topicArn });
    new CfnOutput(this, 'IntegrationSecretName', { value: secret.secretName });
    new CfnOutput(this, 'JourneyStateMachine', { value: journey.stateMachineArn });
  }
}
