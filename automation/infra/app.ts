import { App } from 'aws-cdk-lib';
import config from '../config.json';
import { ArthurTRealtyStack, VOICE_REGION } from './stack';
import { VoiceStack } from './voice-stack';

const todos = JSON.stringify(config).match(/"[^"]*TODO[^"]*"/g);
if (todos) console.warn(`\n⚠  config.json still has placeholders:\n   ${todos.join('\n   ')}\n`);

// Pinned: CDK refuses to deploy if the credentials belong to any other account.
const ACCOUNT = '811926871675';

const app = new App();
const main = new ArthurTRealtyStack(app, 'ArthurTRealty', {
  config,
  env: { account: ACCOUNT, region: 'us-east-2' },
  crossRegionReferences: true,
  description: 'Arthur T Realty website and AI home buyer automation',
});
// Amazon Connect isn't offered in us-east-2, so AI calls run in us-east-1 against the same data.
new VoiceStack(app, 'ArthurTRealtyVoice', {
  config,
  shared: main.shared,
  env: { account: ACCOUNT, region: VOICE_REGION },
  crossRegionReferences: true,
  description: 'Arthur T Realty AI phone calls (Amazon Connect + Lex + Claude on Bedrock)',
});
