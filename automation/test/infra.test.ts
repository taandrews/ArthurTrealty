import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import config from '../config.json';
import { ArthurTRealtyStack } from '../infra/stack';
import { VoiceStack } from '../infra/voice-stack';

const app = new App();
const main = new ArthurTRealtyStack(app, 'Test', {
  config, env: { account: '111111111111', region: 'us-east-2' }, crossRegionReferences: true,
});
const voice = new VoiceStack(app, 'TestVoice', {
  config, shared: main.shared, env: { account: '111111111111', region: 'us-east-1' }, crossRegionReferences: true,
});

describe('infrastructure', () => {
  const template = Template.fromStack(main);
  const voiceTemplate = Template.fromStack(voice);

  it('builds the journey in program order with reminder timeouts', () => {
    const [sm] = Object.values(template.findResources('AWS::StepFunctions::StateMachine')) as any[];
    const def = JSON.stringify(sm.Properties.DefinitionString);
    const order = [...def.matchAll(/\\"(Welcome|Step [a-z_]+|Mortgage Ready)\\":\{/g)].map((m) => m[1]);
    expect(order).toEqual([
      'Welcome', 'Step smart_credit', 'Step loan_application', 'Step land_trust', 'Step workshop_registration',
      'Step workshop_attendance', 'Step counseling_scheduling', 'Step counseling_completion', 'Step earnest_money',
      'Mortgage Ready',
    ]);
    const days = [...def.matchAll(/TimeoutSeconds\\":(\d+)/g)].map((m) => Number(m[1]) / 86400);
    expect(days).toEqual([3, 3, 3, 3, 3, 14]);
  });

  it('requires a login for staff routes and an API key for integrations', () => {
    const methods = Object.values(template.findResources('AWS::ApiGateway::Method')) as any[];
    const any = methods.filter((m) => m.Properties.HttpMethod === 'ANY');
    expect(any.filter((m) => m.Properties.AuthorizationType === 'COGNITO_USER_POOLS')).toHaveLength(1);
    expect(any.filter((m) => m.Properties.ApiKeyRequired === true)).toHaveLength(1);
  });

  it('hosts the website on Amplify, not S3/CloudFront', () => {
    template.resourceCountIs('AWS::Amplify::App', 1);
    template.resourceCountIs('AWS::Amplify::Branch', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 0);
    template.resourceCountIs('AWS::S3::Bucket', 0);
  });

  it('sends staff alerts through SNS email and does not use SES while email is off', () => {
    const staffEmails = new Set([...(config.managerEmails as string[]), ...config.staff.map((s) => s.email)].filter(Boolean));
    template.resourceCountIs('AWS::SNS::Subscription', 1 + staffEmails.size); // inbound SMS -> Lambda, plus one per staff email
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).not.toContain('ses:SendEmail');
    expect(policies).toContain('sns:Publish');
  });

  it('runs the nurture and inactivity jobs daily', () => {
    template.resourceCountIs('AWS::Scheduler::Schedule', 2);
  });

  it('puts AI calling in the voice region: Connect, a number, the Lex bot and the call flow', () => {
    expect(Object.keys(template.findResources('AWS::Connect::Instance'))).toHaveLength(0);
    voiceTemplate.resourceCountIs('AWS::Connect::Instance', 1);
    voiceTemplate.resourceCountIs('AWS::Connect::PhoneNumber', 1);
    voiceTemplate.resourceCountIs('AWS::Connect::ContactFlow', 1);
    voiceTemplate.resourceCountIs('AWS::Lex::Bot', 1);
    voiceTemplate.resourceCountIs('AWS::Lex::BotAlias', 1);
    voiceTemplate.resourceCountIs('AWS::Connect::IntegrationAssociation', 1);
    voiceTemplate.hasResourceProperties('AWS::SSM::Parameter', { Name: '/arthur-t-realty/voice' });
  });

  it('call flow reads the script, then hands the caller to the Lex bot', () => {
    const [flow] = Object.values(voiceTemplate.findResources('AWS::Connect::ContactFlow')) as any[];
    const content = JSON.stringify(flow.Properties.Content);
    expect(content).toContain('ConnectParticipantWithLexBot');
    expect(content).toContain('$.Attributes.message');
    expect(content).toContain('$.Attributes.leadId');
  });

  it('lets the main functions place calls in the voice region', () => {
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toContain('connect:StartOutboundVoiceContact');
    expect(policies).toContain('arn:aws:connect:us-east-1:');
  });
}, 120_000);
