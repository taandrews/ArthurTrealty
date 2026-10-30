export interface Article {
  slug: string;
  category: 'Credit' | 'Buying' | 'Money' | 'Owning';
  title: string;
  summary: string;
  body: { heading?: string; text?: string; points?: string[] }[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'building-credit-habits',
    category: 'Credit',
    title: 'Building Credit: 5 Habits That Move Your Score',
    summary: 'Small, steady habits make the biggest difference to your credit score. Start with these five.',
    body: [
      { text: 'Your credit score affects whether you qualify for a mortgage and the interest rate you pay. The good news: the habits that raise it are simple, and they work.' },
      { heading: 'The five habits', points: [
        'Pay every bill on time. Payment history is the largest part of most credit scores.',
        'Keep credit card balances low, ideally below 30% of each card’s limit, and lower is better.',
        'Keep old accounts open. A longer credit history helps your score.',
        'Limit new credit applications while you prepare to buy a home.',
        'Check your credit report regularly and dispute anything inaccurate.',
      ] },
      { text: 'Progress takes time, so start now. Smart Credit Monitoring, the first step in our program, lets you track your progress.' },
    ],
  },
  {
    slug: 'mortgage-terms-explained',
    category: 'Buying',
    title: 'Mortgage Terms, Explained',
    summary: 'Pre-approval, APR, PITI, escrow: the words you will hear most, in plain English.',
    body: [
      { text: 'Mortgage paperwork is full of jargon. Here are the terms you will hear most, and what they mean for you.' },
      { points: [
        'Pre-approval: a lender’s written estimate of how much you can borrow, based on your credit, income, and assets.',
        'Interest rate vs. APR: the APR includes the interest rate plus certain fees, so it shows a fuller picture of the loan’s cost.',
        'PITI: principal, interest, taxes, and insurance. Together they make up most monthly mortgage payments.',
        'Escrow: an account your lender uses to pay your property taxes and homeowners insurance for you.',
        'Closing: the day you sign the final documents, the sale is completed, and you get your keys.',
      ] },
    ],
  },
  {
    slug: 'down-payment-assistance',
    category: 'Money',
    title: 'Down Payment Assistance: Money You May Not Know About',
    summary: 'Many Maryland buyers qualify for help with their down payment and closing costs.',
    body: [
      { text: 'Saving for a down payment is one of the biggest hurdles for first-time buyers. Down payment assistance can help close the gap.' },
      { heading: 'What to know', points: [
        'State and local programs may offer grants or deferred loans to eligible buyers.',
        'Eligibility often depends on income, purchase price, location, and first-time buyer status.',
        'Many programs require a homebuyer education course, which our workshop prepares you for.',
        'Assistance usually has to be arranged before you sign a purchase contract, so start early.',
      ] },
      { text: 'Ask your Arthur T Realty assistant which programs you may qualify for.' },
    ],
  },
  {
    slug: 'choosing-a-realtor',
    category: 'Buying',
    title: 'How to Choose the Right Realtor',
    summary: 'A good buyer’s agent saves you time, money, and stress. Here is what to look for.',
    body: [
      { text: 'Your real estate agent guides you through showings, offers, negotiations, and closing. Choosing the right one makes the whole process smoother, especially for a first-time buyer.' },
      { heading: 'What to look for', points: [
        'Experience with first-time buyers and assistance programs.',
        'Clear, fast communication. Ask how and when they will keep you updated.',
        'Knowledge of the neighborhoods you are considering.',
        'Transparency about how they are paid before you sign an agreement.',
      ] },
      { text: 'Interview two or three agents before you decide. Ask how many first-time buyers they have helped recently, and how they handle offers in a competitive market.' },
    ],
  },
  {
    slug: 'home-inspection-guide',
    category: 'Buying',
    title: 'What a Home Inspection Really Covers',
    summary: 'The inspection is your chance to learn about a home before you commit.',
    body: [
      { text: 'A home inspection typically costs a few hundred dollars and is one of the best investments you will make in the buying process.' },
      { heading: 'What to expect', points: [
        'Inspectors check the roof, foundation, plumbing, electrical, heating, and cooling systems.',
        'Attend the inspection if you can, and ask questions.',
        'Use the report to negotiate repairs or credits with the seller.',
        'Consider specialty inspections, such as radon, pests, or sewer line, when recommended.',
      ] },
      { text: 'No home is perfect, and nearly every report lists issues. Focus on safety problems and big-ticket items like the roof, foundation, and major systems, and ask your agent how to handle them in your offer.' },
    ],
  },
  {
    slug: 'closing-costs',
    category: 'Money',
    title: 'Closing Costs: What to Expect',
    summary: 'Closing costs are often 2% to 5% of the purchase price. Here is what they include.',
    body: [
      { text: 'Closing costs are the fees paid when your purchase is finalized, in addition to your down payment.' },
      { points: [
        'They include lender fees, title insurance, recording fees, and prepaid taxes and insurance.',
        'You will receive a Closing Disclosure at least three business days before closing. Review it carefully.',
        'Some costs can be negotiated, covered by seller credits, or paid with assistance programs.',
      ] },
      { heading: 'Upfront costs before closing', text: 'Before closing you will also pay for a few things out of pocket. An appraisal and a home inspection typically cost a few hundred dollars each. Earnest money, the deposit you make when your offer is accepted, varies widely; it is often 1% to 3% of the price, though some buyers put down less. It is usually credited toward your purchase at closing. Your coordinator can help you estimate these for your situation.' },
    ],
  },
  {
    slug: 'homeowners-insurance',
    category: 'Owning',
    title: 'Homeowners Insurance: A Buyer’s Guide',
    summary: 'Your lender will require homeowners insurance. Here is how to choose a policy.',
    body: [
      { text: 'Homeowners insurance protects your home and belongings, and your lender will require proof of coverage before closing. Start shopping a few weeks before your closing date.' },
      { heading: 'What a policy covers', points: [
        'Dwelling coverage pays to repair or rebuild your home after a covered loss.',
        'Liability coverage protects you if someone is injured on your property.',
        'Flood insurance is usually separate. Check whether the home is in a flood zone.',
        'Compare at least three quotes and ask about bundling discounts.',
      ] },
      { text: 'Your premium is often paid through your escrow account as part of your monthly mortgage payment, so it affects how much house you can comfortably afford.' },
    ],
  },
  {
    slug: 'budgeting-after-you-buy',
    category: 'Owning',
    title: 'Budgeting After You Buy',
    summary: 'Owning a home changes your monthly budget. Plan for these costs.',
    body: [
      { text: 'Your mortgage payment is only part of the cost of owning a home. Building these into your budget from day one keeps surprises from turning into stress.' },
      { heading: 'Plan for these', points: [
        'Keep an emergency fund of three to six months of expenses.',
        'Expect property taxes and insurance to change over time.',
        'Utilities are often higher than when renting.',
        'Set aside about 1% of your home’s value each year for maintenance and repairs.',
      ] },
      { text: 'Review your budget after your first few months in the home, once you know your real utility and maintenance costs, and adjust your savings to match.' },
    ],
  },
];
