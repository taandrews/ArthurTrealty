import type { EmailContent } from './messages';

/** Weekly educational emails, sent in order and repeated until the client buys or exits. */
export const NURTURE_TOPICS: { subject: string; body: string[]; points: string[] }[] = [
  {
    subject: 'Building Credit: 5 Habits That Move Your Score',
    body: ['Small, steady habits make the biggest difference to your credit score.'],
    points: [
      'Pay every bill on time. Payment history is the largest part of your score.',
      'Keep credit card balances below 30% of the limit, and lower is better.',
      "Don't close old accounts. A longer credit history helps.",
      'Limit new credit applications while you prepare to buy.',
      'Check your Smart Credit report regularly and dispute any errors.',
    ],
  },
  {
    subject: 'Mortgage Terms, Explained',
    body: ['Mortgage paperwork is full of jargon. Here are the terms you will hear most:'],
    points: [
      'Pre-approval: a lender’s written estimate of how much you can borrow.',
      'Interest rate vs. APR: APR includes the rate plus certain fees, so it shows the fuller cost.',
      'PITI: principal, interest, taxes, and insurance. Together these make up your monthly payment.',
      'Escrow: an account your lender uses to pay your taxes and insurance for you.',
      'Closing: the day you sign the final papers and get your keys.',
    ],
  },
  {
    subject: 'Down Payment Assistance: Money You May Not Know About',
    body: ['Many buyers qualify for help with their down payment and closing costs.'],
    points: [
      'State and county programs may offer grants or deferred loans for first-time buyers.',
      'Some programs are based on income, location, or profession.',
      'Assistance often must be approved before you sign a purchase contract.',
      'Ask your coordinator which programs fit your situation.',
    ],
  },
  {
    subject: 'How to Choose the Right Realtor',
    body: ['A good buyer’s agent saves you time, money, and stress.'],
    points: [
      'Look for experience with first-time buyers and assistance programs.',
      'Ask how they communicate and how quickly they respond.',
      'Make sure they know the neighborhoods you are considering.',
      'Understand how they are paid before you sign an agreement.',
    ],
  },
  {
    subject: 'What a Home Inspection Really Covers',
    body: ['The inspection is your chance to learn about a home before you commit.'],
    points: [
      'Inspectors check the roof, foundation, plumbing, electrical, heating, and cooling.',
      'Attend the inspection if you can, and ask questions.',
      'The report helps you negotiate repairs or credits with the seller.',
      'Specialty inspections (radon, pests, sewer line) may be worth adding.',
    ],
  },
  {
    subject: "Homeowners Insurance: A Buyer's Guide",
    body: ['Your lender will require homeowners insurance before closing.'],
    points: [
      'Dwelling coverage pays to repair or rebuild your home.',
      'Liability coverage protects you if someone is hurt on your property.',
      'Flood insurance is separate. Check whether the home is in a flood zone.',
      'Compare at least three quotes and ask about bundling discounts.',
    ],
  },
  {
    subject: 'Closing Costs: What to Expect',
    body: ['Closing costs are fees paid when your purchase is finalized, typically 2% to 5% of the price.'],
    points: [
      'They include lender fees, title insurance, recording fees, and prepaid taxes and insurance.',
      'You will receive a Closing Disclosure at least three business days before closing.',
      'Some costs can be negotiated or covered by seller credits or assistance programs.',
    ],
  },
  {
    subject: 'Moving Into Your New Home: A Checklist',
    body: ['Plan ahead so moving day goes smoothly.'],
    points: [
      'Book movers or a truck two to four weeks out.',
      'Set up utilities, internet, and trash service to start on closing day.',
      'Change the locks and test smoke and carbon monoxide detectors.',
      'Update your address with the post office, your bank, and your employer.',
    ],
  },
  {
    subject: 'Home Maintenance Basics for New Owners',
    body: ['A little regular maintenance prevents big, expensive repairs.'],
    points: [
      'Change HVAC filters every one to three months.',
      'Clean gutters in spring and fall.',
      'Know where your water shut-off valve and electrical panel are.',
      'Set aside about 1% of your home’s value each year for repairs.',
    ],
  },
  {
    subject: 'Budgeting After You Buy',
    body: ['Owning a home changes your monthly budget. Plan for it.'],
    points: [
      'Keep an emergency fund of three to six months of expenses.',
      'Remember that taxes and insurance can rise over time.',
      'Budget for utilities, which are often higher than when renting.',
      'Keep saving for maintenance and future upgrades.',
    ],
  },
];

export function nurtureEmail(index: number, firstName: string): EmailContent {
  const topic = NURTURE_TOPICS[index % NURTURE_TOPICS.length];
  return {
    subject: topic.subject,
    paragraphs: [`Hi ${firstName},`, ...topic.body],
    bullets: topic.points,
    bulletsAfter: ['Questions? Just reply to this email. We are here to help.'],
  };
}
