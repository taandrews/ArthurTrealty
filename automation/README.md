# Home Buyer Automation (AWS)

Nurtures each lead from first inquiry to mortgage-ready with AI voice calls, texts, and emails, and hosts the website.

## How it works

| Piece | AWS service | Code |
|---|---|---|
| Website + staff dashboard | Amplify Hosting (uploaded by `scripts/deploy-site.ts`) | `../src/app` |
| Lead intake (website, Facebook, Google Ads, staff entry, integrations) | API Gateway + Lambda | `src/handlers/api.ts` |
| Home Buyer Journey (welcome → 7 phases → mortgage ready) | Step Functions | `infra/journey-definition.ts`, `src/handlers/journey.ts` |
| AI voice calls | Amazon Connect (neural text-to-speech) | `infra/voice.ts` |
| Texts, incl. replies (HELP, UPDATE, STOP, earnest-money Q&A) | AWS End User Messaging + SNS | `src/handlers/inbound-sms.ts` |
| Emails | Amazon SES | `src/services/channels.ts` |
| Workshop reminders, deferred sends, weekly nurture, 14-day inactivity alerts | EventBridge Scheduler | `src/handlers/jobs.ts` |
| Client records (CRM) + activity log | DynamoDB | `src/services/db.ts` |
| Staff login | Cognito | `infra/stack.ts` |
| KPIs | computed from client records | `src/services/kpis.ts` |

Everything deploys to account 811926871675 in **us-east-2** (the account's AWS-managed policy blocks most services in us-east-1). Amazon Connect is not offered in us-east-2, so AI voice calls stay off unless that changes.

All message wording is in `src/content/`. Business settings (links, staff, timing rules) are in `config.json`.

Each step sends its call, text, and email, then waits until the milestone is reported, sending a reminder every 3 days
(every 14 days for earnest money). Milestones are reported by staff in the dashboard, by the client's text replies,
or by other systems calling `POST /integrations/milestones` with the API key. Calls and texts only go out between
9am and 8pm Eastern; anything outside that window is held until the next morning.

## Before going live

1. **Fill in `config.json`**: the five program links, mailing address, staff list, and sender email.
2. **Email (SES)**: verify the sending domain in SES and request production access (new accounts can only email verified addresses).
3. **Texting**: in AWS End User Messaging, buy a number and complete 10DLC or toll-free registration (takes 1–3 weeks).
   Put the number's ARN in `config.json` → `sms.originationIdentity`, and turn on two-way SMS pointing to the
   `InboundSmsTopicArn` stack output.
4. **AI voice calls**: set `voice.enabled` to `true`. This creates an Amazon Connect instance, claims a phone number, and adds the call flow.
5. **Staff logins**: create each staff member in the Cognito user pool (`StaffUserPoolId` output).
6. **Facebook / Google Ads** (optional): put the keys in the `IntegrationSecretName` secret, then point the
   ad platform's webhook at `<ApiUrl>webhooks/facebook` or `<ApiUrl>webhooks/google-ads`.

Channels that aren't set up yet are skipped and logged in the client's activity, so you can deploy first and add them later.

## Commands

```bash
npm install
npm test          # unit + infrastructure tests
npm run synth     # build the CloudFormation template without deploying
npm run deploy    # build the website and deploy everything (needs AWS credentials)
```

For local development of the site against a deployed API, copy the deployed `/config.json` into `../public/config.json`.
