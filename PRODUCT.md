# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

All audiences carry equal weight (confirmed):

- **Renters becoming first-time buyers** in Maryland, including people with good, bad, or no credit who need a step-by-step path to mortgage readiness.
- **Sellers** who want to list a Maryland home.
- **Investors** buying rental or investment property in Maryland.
- **Veterans and service members** using VA benefits.
- **People facing homelessness or housing instability** who need stable housing first, then a path to owning.
- **Room renters** looking for affordable housing while they save.

Internal users: Arthur and the staff (coordinators and managers), who use the staff dashboard to track clients, record milestones, and act on alerts.

## Product Purpose

Arthur T Realty is a Maryland real estate business that turns inquiries into homeowners (and serves sellers and investors). The website captures leads (homeownership quiz and service-page forms); an automated Home Buyer Journey then coaches each client from first contact until they are mortgage-ready. Success: clients complete each step, become mortgage-ready, and purchase a home.

## Positioning

**The AI assistant is the service** (confirmed, corrected 2026-10-29): AI phone calls and text messages guide every client through every step of the program. A phone call from Arthur or staff is the absolute last resort, never a selling point. Do not advertise talking to a person, and do not design flows that route clients to a human when the assistant can help.

## Operating Context

- **Lead sources:** website quiz and forms, Facebook Lead Ads, Google Ads, referrals, phone inquiries, walk-ins, realtor referrals (staff enter the last four in the dashboard).
- **Home Buyer Journey:** welcome → (1) Smart Credit Monitoring → (2) online mortgage application → (3) Land Trust application → (4) Homeownership Workshop (required) → (5) one-on-one counseling with a Certified Homeownership Counselor → earnest-money planning (earnest money, appraisal, inspection; generally around $1,500, varies) → mortgage-ready.
- **Calls are the core channel** of the business model: two-way AI calls (Amazon Connect + Lex + Claude on Bedrock). Texts carry links and reminders. Client email is currently off.
- **Staff alerts** go by email (SNS) for each milestone, requests for help, and 14 days without a response.
- **Service area:** all 23 Maryland counties and Baltimore City.

## Capabilities and Constraints

- Hosted on AWS: website on Amplify Hosting; automation in us-east-2; AI calling in us-east-1 (Connect is not offered in us-east-2).
- Calls and texts only between 9am and 8pm Eastern; anything outside that window waits until morning.
- Every lead form requires consent to automated and AI-generated calls, texts, and emails (TCPA). Consent wording lives in `src/lib/consent.ts`.
- Real estate services are provided by a Maryland-licensed real estate professional. Arthur T Realty is not a mortgage lender or credit repair organization; credit restoration is through independent licensed partners. Rent-to-own and credit pages carry required disclaimers.
- **Open decisions / placeholders (do not present as final):**
  - Phone number on the site is a placeholder: (443) 555-1234.
  - Calling number must be a Maryland 410/443 number (currently a temporary Texas test number; AWS request pending).
  - Arthur's license number: not yet provided.
  - Business address: never advertised. Do not put the business's street address on the site, in messages, or in emails. If a published mailing address is ever legally required (e.g. marketing email), use a P.O. box the owner provides.
  - The five program links (Smart Credit, loan application, Land Trust, workshop, counseling calendar): not yet provided.
  - Staff names and emails: not yet provided.

## Brand Commitments

- Name: **Arthur T Realty** everywhere (replaced the former "Arthur Jordan Realtor" and "Zion Enterprises" names; neither may reappear).
- Logo assets: `public/logo-arthur-t-realty.png` (light backgrounds) and `public/logo-arthur-t-realty-white.png` (dark backgrounds), derived from the original crown-and-script artwork. Tagline: "Your Home Buying Specialist."
- Voice (confirmed): **empowering, hopeful, shame-free**. A warm coach in plain English, never judgmental about credit or money.
- Footer credit: "Powered by 1is".

## Evidence on Hand

- No client testimonials yet. The `/testimonials` page intentionally shows none; never fabricate testimonials, reviews, client counts, or success statistics. Real, permission-granted stories will be added later.
- No license number, awards, press, or third-party ratings on hand.
- Educational content: eight resource articles (`src/data/articles.ts`) and ten weekly nurture topics.

## Product Principles

1. Every client always knows their single next step.
2. The AI assistant handles the client relationship. Hand off to Arthur or staff only as a last resort: the client still insists after the assistant has tried to help, raises a complaint or emergency, or needs a decision only staff can make.
3. No shame and no promises: never judge credit or finances, and never guarantee approval, rates, or outcomes.
4. Honest claims only: placeholders stay marked until real facts arrive; nothing is invented.
5. Respect consent and time: contact only opted-in clients, within contact hours, and make opting out easy.
