import type { AppConfig } from '../config';
import type { PhaseKey } from '../phases';
import type { Lead } from '../types';
import { formatWorkshopTime } from '../lib/time';

export interface EmailContent {
  subject: string;
  paragraphs: string[];
  bullets?: string[];
  bulletsAfter?: string[];
  cta?: { label: string; url: string };
}

/** One touchpoint across channels. Any channel may be absent. */
export interface Outreach {
  call?: string;
  sms?: string;
  email?: EmailContent;
}

interface Ctx {
  cfg: AppConfig;
  lead: Lead;
}

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/* ——— Phase 1: welcome ——— */

export function welcome({ cfg, lead }: Ctx): Outreach {
  const name = lead.firstName;
  return {
    call:
      `Hello, ${name}. Thank you for contacting ${cfg.brandName}. ` +
      `I'm ${cfg.assistantName}, and I'll guide you through every step of becoming a homeowner. ` +
      `Over the next several weeks we'll help you improve and monitor your credit, ` +
      `complete your mortgage application, complete your Land Trust application, ` +
      `register for a Homeownership Workshop, meet one-on-one with a certified Homeownership Counselor, ` +
      `and prepare for purchasing your new home. ` +
      `If you have questions at any time, just ask me on any call. ` +
      `Let's begin with your first step. Do you have any questions before we get started?`,
    sms:
      `Hi ${name}! Welcome to ${cfg.brandName}. We're excited to help you become a homeowner. ` +
      `Your homeownership assistant will guide you through each step until you're ready to purchase your home. ` +
      `Text us any question anytime. Reply STOP to opt out.`,
    email: {
      subject: `Welcome to ${cfg.brandName}, ${name}`,
      paragraphs: [
        `Hi ${name},`,
        `Thank you for contacting ${cfg.brandName}. We're excited to help you become a homeowner, and we'll guide you through each step until you're ready to purchase your home.`,
        `Here's the path ahead:`,
      ],
      bullets: [
        'Step 1: Activate Smart Credit Monitoring',
        'Step 2: Complete your online mortgage application',
        'Step 3: Complete your Land Trust application',
        'Step 4: Attend a Homeownership Workshop',
        'Step 5: Meet one-on-one with a certified Homeownership Counselor',
      ],
      bulletsAfter: [
        `If you have questions at any point, just text us and your assistant will help.`,
        'Your first step is on its way in a separate message.',
      ],
    },
  };
}

/* ——— Phases 2–7: first contact when a phase begins ——— */

export function phaseIntro({ cfg, lead }: Ctx, phase: PhaseKey): Outreach {
  const name = lead.firstName;
  const { links, rules } = cfg;
  switch (phase) {
    case 'smart_credit':
      return {
        call:
          `Hi ${name}, congratulations on taking your first step. ` +
          `Your next task is activating your Smart Credit account. ` +
          `This allows us to monitor your progress and help prepare you for mortgage approval. ` +
          `I've texted you the registration link. Do you have any questions about this step?`,
        sms: `Step 1 of 5: Please activate your Smart Credit Monitoring account here: ${links.smartCredit}`,
        email: {
          subject: 'Activate Your Smart Credit Account',
          paragraphs: [
            `Hi ${name},`,
            'Your first step is activating Smart Credit Monitoring. Here is why it matters:',
          ],
          bullets: [
            'Why credit matters: your credit score affects whether you qualify for a mortgage and the interest rate you pay. Even a small improvement can save thousands over the life of a loan.',
            'How Smart Credit helps: it lets you and our team see your credit report and score, spot errors, and track your progress toward mortgage approval.',
            'How often to monitor: check in at least once a week, and any time you get an alert about a change.',
            'Next steps: once your account is active, we will send you your secure mortgage application.',
          ],
          cta: { label: 'Activate Smart Credit', url: links.smartCredit },
        },
      };

    case 'loan_application':
      return {
        call:
          `Congratulations, ${name}! Now it's time to complete your secure mortgage application. ` +
          `This application helps determine the best financing options available for you. ` +
          `I've texted you the link. Do you have any questions about this step?`,
        sms: `Step 2 of 5: Complete your online mortgage application here: ${links.loanApplication}`,
        email: {
          subject: 'Complete Your Mortgage Application',
          paragraphs: [
            `Hi ${name},`,
            'Great work activating Smart Credit. Your next step is your secure online mortgage application.',
          ],
          bullets: [
            'Estimated completion time: about 20 to 30 minutes.',
            'Have these ready: photo ID, your last two pay stubs, your last two years of W-2s or tax returns, and your last two months of bank statements.',
            'Security: the application is submitted through a secure, encrypted portal. Never send your Social Security number or documents by text or regular email.',
            'What happens next: our team reviews your application and you move on to your Land Trust application.',
          ],
          cta: { label: 'Start My Application', url: links.loanApplication },
        },
      };

    case 'land_trust':
      return {
        call:
          `${name}, you're making excellent progress. ` +
          `Your next step is completing your Land Trust application. ` +
          `This helps protect your future property and prepares you for closing. ` +
          `I've texted you the link. Do you have any questions about this step?`,
        sms: `Step 3 of 5: Complete your Land Trust application here: ${links.landTrust}`,
        email: {
          subject: 'Next Step: Your Land Trust Application',
          paragraphs: [
            `Hi ${name},`,
            'Your mortgage application is in. Your next step is the Land Trust application.',
          ],
          bullets: [
            'Benefits of a Land Trust: it helps protect your future property and prepares you for closing.',
            'Timeline: the application takes about 15 minutes. Our team reviews it within a few business days.',
            'What to expect: once it is complete, you will be invited to register for a Homeownership Workshop.',
          ],
          cta: { label: 'Complete Land Trust Application', url: links.landTrust },
        },
      };

    case 'workshop_registration':
      return {
        call:
          `Congratulations, ${name}! You're now ready to register for our Homeownership Workshop. ` +
          `This workshop is required before moving forward in the program and will prepare you for every step of purchasing your home. ` +
          `I've texted you the registration link. Do you have any questions about this step?`,
        sms: `Step 4 of 5: Reserve your seat at the Homeownership Workshop today: ${links.workshop}`,
      };

    case 'counseling_scheduling':
      return {
        call:
          `Congratulations on completing your Homeownership Workshop, ${name}. ` +
          `Your next step is meeting with one of our Certified Homeownership Counselors. ` +
          `During this meeting we'll review your progress, answer questions, and prepare you for mortgage approval. ` +
          `I've texted you a link to schedule. Do you have any questions about this step?`,
        sms: `Step 5 of 5: Schedule your one-on-one counseling session: ${links.counselingCalendar}`,
        email: {
          subject: 'Schedule Your Homeownership Counseling Session',
          paragraphs: [
            `Hi ${name},`,
            'Congratulations on completing the Homeownership Workshop! Your final step is a one-on-one session with a Certified Homeownership Counselor.',
          ],
          bullets: [
            'What to expect: we will review your progress, answer your questions, and build your plan for mortgage approval.',
            'Please bring: photo ID, recent pay stubs, recent bank statements, and any questions about your credit report.',
            'Estimated meeting time: about 60 minutes.',
          ],
          cta: { label: 'Pick a Time', url: links.counselingCalendar },
        },
      };

    case 'earnest_money':
      return {
        call:
          `Congratulations on completing your counseling session, ${name}. ` +
          `As we prepare you to purchase a home, we'd like to discuss some of the upfront costs you'll need during the buying process. ` +
          `These typically include an earnest money deposit, a home inspection fee, and an appraisal fee. ` +
          `The combined total is generally around ${money(rules.upfrontCostsTarget)}, although actual costs can vary depending on the property, market, and lender. ` +
          `May I ask a few questions to help us plan?`,
        email: fundsEmail({ cfg, lead }),
      };

    // These phases wait for an appointment; their reminders are handled separately.
    case 'workshop_attendance':
    case 'counseling_completion':
      return {};
  }
}

/* ——— Reminders while a phase is waiting ——— */

export function phaseReminder({ cfg, lead }: Ctx, phase: PhaseKey): Outreach {
  const name = lead.firstName;
  const { links, rules } = cfg;
  const nudge = (step: string, what: string, url: string, subject: string): Outreach => ({
    sms: `Hi ${name}, a quick reminder. ${step}: ${what}: ${url} Text us any question.`,
    email: {
      subject: `Reminder: ${subject}`,
      paragraphs: [
        `Hi ${name},`,
        `Just a reminder that your next step is still waiting: ${what.toLowerCase()}.`,
        'If something is getting in the way, reply to this email and we will help.',
      ],
      cta: { label: subject, url },
    },
  });

  switch (phase) {
    case 'smart_credit':
      return nudge('Step 1 of 5', 'Activate your Smart Credit Monitoring account', links.smartCredit, 'Activate Smart Credit');
    case 'loan_application':
      return nudge('Step 2 of 5', 'Complete your online mortgage application', links.loanApplication, 'Complete Your Mortgage Application');
    case 'land_trust':
      return nudge('Step 3 of 5', 'Complete your Land Trust application', links.landTrust, 'Complete Your Land Trust Application');
    case 'workshop_registration':
      return nudge('Step 4 of 5', 'Reserve your seat at the Homeownership Workshop', links.workshop, 'Register for the Workshop');
    case 'counseling_scheduling':
      return nudge('Step 5 of 5', 'Schedule your counseling session', links.counselingCalendar, 'Schedule Your Counseling Session');
    case 'earnest_money':
      return {
        sms:
          `Just checking in, ${name}. Have you made progress toward your home buying funds? ` +
          `Remember, you'll generally want about ${money(rules.upfrontCostsTarget)} available for your earnest money deposit, appraisal, and home inspection (actual amounts vary). ` +
          `Reply UPDATE if anything has changed.`,
        email: fundsEmail({ cfg, lead }),
      };
    case 'workshop_attendance':
    case 'counseling_completion':
      return {};
  }
}

function fundsEmail({ cfg, lead }: Ctx): EmailContent {
  return {
    subject: 'Preparing Financially for Your Home Purchase',
    paragraphs: [
      `Hi ${lead.firstName},`,
      `Before you buy, you'll need some money available for upfront costs. Together these are generally around ${money(cfg.rules.upfrontCostsTarget)}, although actual amounts vary by property, market, and lender.`,
    ],
    bullets: [
      'Earnest money: a good-faith deposit you make when your offer is accepted. It shows the seller you are serious and is usually credited toward your purchase at closing.',
      'Appraisal: your lender requires an independent appraiser to confirm the home is worth what you are paying for it.',
      'Home inspection: a licensed inspector checks the roof, foundation, plumbing, electrical, and more, so you know about problems before you commit.',
      'Savings tips: set up an automatic transfer on payday, put tax refunds or bonuses toward this goal, and keep the money in a separate savings account.',
      'Assistance: down payment and closing cost assistance programs may be available. Ask your coordinator whether you qualify.',
    ],
    bulletsAfter: ['If your savings have changed, reply UPDATE to our text messages or reply to this email.'],
  };
}

/* ——— Workshop reminders ——— */

export const WORKSHOP_REMINDERS = [
  { label: '7 days', minutesBefore: 7 * 24 * 60 },
  { label: '3 days', minutesBefore: 3 * 24 * 60 },
  { label: '24 hours', minutesBefore: 24 * 60 },
  { label: '3 hours', minutesBefore: 3 * 60 },
  { label: '1 hour', minutesBefore: 60 },
];

export function workshopReminder({ cfg, lead }: Ctx, label: string): Outreach {
  const w = lead.workshop;
  if (!w) return {};
  const { date, time } = formatWorkshopTime(w.at, cfg.timeZone);
  const where = w.meetingLink ?? w.location ?? 'details from your coordinator';
  const bring = w.whatToBring ?? 'a notebook, a pen, and your questions';
  return {
    sms:
      `Reminder: your Homeownership Workshop is in ${label}. ` +
      `${date} at ${time}. Where: ${where}. Bring: ${bring}. Text us any question.`,
    email: {
      subject: `Your Homeownership Workshop is in ${label}`,
      paragraphs: [`Hi ${lead.firstName},`, 'Here are the details for your upcoming Homeownership Workshop:'],
      bullets: [`Date: ${date}`, `Time: ${time}`, `Where: ${where}`, `What to bring: ${bring}`],
      bulletsAfter: ['This workshop is required before moving forward in the program. We look forward to seeing you!'],
    },
  };
}

/* ——— Mortgage ready ——— */

export function mortgageReady({ cfg, lead }: Ctx): Outreach {
  return {
    sms:
      `Congratulations, ${lead.firstName}! You've completed every step of the ${cfg.brandName} program. ` +
      `${lead.assignedTo.name} will be in touch about next steps toward purchasing your home.`,
    email: {
      subject: "Congratulations! You've Completed the Program",
      paragraphs: [
        `Hi ${lead.firstName},`,
        "You've completed every step of the program: credit monitoring, your mortgage application, your Land Trust application, the Homeownership Workshop, counseling, and planning for upfront costs.",
        `${lead.assignedTo.name} will be in touch about next steps toward purchasing your home.`,
      ],
    },
  };
}

/* ——— Earnest money SMS conversation ——— */

export const FUNDS_QUESTIONS = [
  'Have you already saved money for these upfront costs? Reply YES or NO.',
  'Approximately how much do you currently have available? Reply with a dollar amount, for example 800.',
  'When do you expect to have the remaining funds available? For example: next month, or June 15.',
  'Would you like assistance creating a savings plan? Reply YES or NO.',
  'Would information about down payment or closing cost assistance programs be helpful? Reply YES or NO.',
];

export function fundsConversationDone(cfg: AppConfig, ready: boolean): string {
  return ready
    ? `Thank you! It looks like you're ready for your upfront costs. Your coordinator will be in touch about next steps with ${cfg.brandName}.`
    : 'Thank you! We have updated your file. We will check in every couple of weeks. Reply UPDATE anytime your savings change.';
}
