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

## Consent and safeguards

Calls, texts, and emails only go to leads with a consent record (`lead.consent`); without one, every send is skipped
and logged as "no consent on record", and the new-lead staff alert says so. Where consent comes from:

| Intake | Consent recorded from |
|---|---|
| Website forms (`POST /public/leads`) | Required: `consent: true` + `consentText`, with time, IP, and browser |
| Staff dashboard (`POST /staff/leads`) | Required: the consent checkbox, recorded as "Verbal or written consent recorded by <staff>" |
| Integrations (`POST /integrations/leads`) | Optional `consent: { text, at }` (or the older `consentText`, recorded as now) |
| Facebook lead ads | A custom disclaimer on the form with every checkbox checked (`custom_disclaimer_responses`) |
| Google Ads lead forms | Only a custom question whose name mentions consent/agree/disclaimer, answered yes. Google has no standard consent field, so most Google leads arrive without consent and get staff follow-up only |

Other safeguards:

- **Phone numbers**: only US numbers (incl. Puerto Rico, USVI, Guam, CNMI, American Samoa). Premium (900, 976),
  N11, 5XX/600/700/710, Canadian, and Caribbean area codes are never called or texted (`src/lib/phone.ts`).
- **Public form**: a repeat submission with the same phone or email doesn't create a lead or restart the journey
  (it's noted on the existing lead). API Gateway throttles `POST /public/leads` to 2/s (burst 5), and a WAF rule blocks
  any IP that sends more than 20 requests to `/public/*` in 5 minutes.
- **Opt-outs**: STOP-type keywords stop texts *and* calls; START restores both. Clear phrases like "stop calling",
  "don't text me", or "remove me" (by text or on a call) are honored directly, without the AI.
- **Costs**: the AI answers at most 20 texts per client per day (Eastern); staff are told once when the limit is hit.
- **No double sends**: retried journey steps, scheduled sends, and redelivered texts/webhooks are deduplicated with
  send-once markers in the Leads table (`once#…` items, removed automatically by DynamoDB TTL on `expiresAt`).
- **Failures**: if a journey step keeps failing after retries, staff get "Journey stopped with an error" and that
  client's journey ends. If a journey can't start, the lead is still saved and staff are alerted.

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
