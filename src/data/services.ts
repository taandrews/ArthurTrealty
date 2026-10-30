import { HERO_IMAGES } from '@/components/page/PageParts';

export interface ServicePage {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  intro: string[];
  cardsTitle: string;
  cardsIntro?: string;
  cards: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  forWho: string[];
  faqs: { q: string; a: string }[];
  disclaimer?: { title: string; text: string };
  formTitle: string;
  /** Hero button; defaults to the quiz, which fits buyers. Non-buyer pages jump to their own form. */
  heroCta?: { label: string; href: string };
  submitLabel?: string;
}

const CROA =
  'You have a right to dispute inaccurate information in your credit report by contacting the credit bureau directly. ' +
  'However, neither you nor any credit repair company or credit repair organization has the right to have accurate, current, ' +
  'and verifiable information removed from your credit report. You have a right to obtain a copy of your credit report from a ' +
  'credit bureau. You have a right to cancel a credit repair contract without penalty within 3 business days. Arthur T Realty is ' +
  'not a credit repair organization; credit restoration services are provided by independent licensed partners. Results vary and are not guaranteed.';

export const SERVICES: ServicePage[] = [
  {
    slug: 'first-time-buyer',
    name: 'First Time Home Buyers',
    metaTitle: 'Maryland First Time Home Buyer Programs & Down Payment Assistance',
    metaDescription: 'Find Maryland first-time home buyer programs, down payment assistance, and step-by-step guidance from Arthur T Realty.',
    eyebrow: 'First Time Home Buyers',
    title: 'Buy Your First Home in Maryland',
    subtitle: 'We match first-time buyers with Maryland programs, down payment assistance, and the guidance to go from renting to owning with confidence.',
    image: HERO_IMAGES.keys,
    intro: [
      'Buying your first home is one of the biggest decisions you will make, and it is easier with a guide. Your Arthur T Realty homeownership assistant walks you through every step by call and text, from checking your credit to getting your keys.',
      'Maryland offers programs designed for first-time buyers, including the Maryland Mortgage Program (MMP) and county-level down payment assistance. Eligibility depends on factors like income, purchase price, and location. We help you find out which options fit you.',
    ],
    cardsTitle: 'Programs We Help You Explore',
    cards: [
      { title: 'Maryland Mortgage Program (MMP)', text: 'State-sponsored home loans for eligible buyers, often paired with down payment assistance.' },
      { title: 'Down Payment Assistance', text: 'Grants and deferred loans that can cover part of your down payment or closing costs.' },
      { title: 'FHA Loans', text: 'Government-backed loans with lower down payment requirements and flexible credit guidelines.' },
      { title: 'County & City Programs', text: 'Many Maryland counties and Baltimore City offer their own assistance for local buyers.' },
    ],
    steps: [
      { title: 'Take the quiz', text: 'Answer a few questions so we understand your goals, credit, and timeline.' },
      { title: 'Get your plan', text: 'We match you with programs and walk you through credit, savings, and paperwork.' },
      { title: 'Buy with confidence', text: 'Finish your workshop and counseling, get mortgage-ready, and start shopping for your home.' },
    ],
    forWho: [
      'You have never owned a home, or have not owned one in the last three years',
      'You are tired of paying rent and want to build equity',
      'You are not sure what programs or loans you qualify for',
      'You want a clear, step-by-step path instead of guesswork',
    ],
    faqs: [
      { q: 'Who counts as a first-time home buyer?', a: 'Many programs define a first-time buyer as someone who has not owned a home in the past three years. Rules vary by program, so we check each one for you.' },
      { q: 'How much do I need for a down payment?', a: 'It depends on the loan. Some loans require as little as 3% to 3.5% down, and down payment assistance may cover part of it. We help you see the real numbers for your situation.' },
      { q: 'What credit score do I need?', a: 'Requirements vary by loan type. FHA loans are often available with lower scores than conventional loans. If your score needs work, we connect you with credit restoration help.' },
      { q: 'Do I have to take a homebuyer class?', a: 'Many assistance programs require a homebuyer education course. Our Homeownership Workshop prepares you for every step of buying.' },
      { q: 'How long does the process take?', a: 'Some buyers are ready in a few months; others need longer to build credit or savings. We set a plan based on where you are today.' },
      { q: 'Does it cost anything to get started?', a: 'Taking the quiz and talking with us is free. You will have normal buying costs later, like earnest money, an appraisal, and a home inspection.' },
    ],
    formTitle: 'Start Your First Home Plan',
  },
  {
    slug: 'workshops',
    name: 'Home Ownership Workshop Classes',
    metaTitle: 'Homeownership Workshop Classes in Maryland',
    metaDescription: 'Homeownership workshop classes that prepare Maryland renters for every step of buying a home.',
    eyebrow: 'Workshop Classes',
    title: 'Homeownership Workshop Classes',
    subtitle: 'Learn how buying a home really works, from credit and budgeting to closing day, in a friendly, judgment-free class.',
    image: HERO_IMAGES.porch,
    intro: [
      'Our Homeownership Workshop is a required step in the Arthur T Realty program, and it is open to anyone who wants to understand the home buying process.',
      'You will leave with a clear picture of what lenders look for, what buying a home costs, and what to expect at each stage.',
    ],
    cardsTitle: 'What You Will Learn',
    cards: [
      { title: 'Credit & Your Mortgage', text: 'How credit scores affect approval and rates, and practical ways to improve yours.' },
      { title: 'Budgeting & Savings', text: 'How much home you can afford and how to plan for upfront costs.' },
      { title: 'The Buying Process', text: 'Pre-approval, house hunting, offers, inspections, appraisals, and closing.' },
      { title: 'Assistance Programs', text: 'Down payment and closing cost assistance and how to apply.' },
      { title: 'Working With Professionals', text: 'What lenders, agents, inspectors, and title companies each do for you.' },
      { title: 'Life After Closing', text: 'Insurance, taxes, maintenance, and protecting your investment.' },
    ],
    steps: [
      { title: 'Reserve your seat', text: 'Sign up below and we will send you upcoming class dates.' },
      { title: 'Attend the workshop', text: 'Join in person or online. Bring your questions.' },
      { title: 'Meet your counselor', text: 'After the workshop, schedule a one-on-one session to build your plan.' },
    ],
    forWho: [
      'First-time buyers who want to understand the process',
      'Renters who are not sure if they are ready to buy',
      'Anyone whose assistance program requires homebuyer education',
      'Families planning to buy in the next year or two',
    ],
    faqs: [
      { q: 'Is it online or in person?', a: 'Class format depends on the session. Your registration confirmation includes the location or meeting link.' },
      { q: 'What should I bring?', a: 'A notebook, a pen, and your questions. Your reminders will list anything else for your session.' },
      { q: 'Will I get reminders?', a: 'Yes. Registered attendees get reminders by text and email before the class.' },
    ],
    formTitle: 'Reserve Your Workshop Seat',
    heroCta: { label: 'Reserve Your Seat', href: '#get-started' },
    submitLabel: 'Reserve My Seat',
  },
  {
    slug: 'renters-to-homeowners',
    name: 'Turning Renters into Home Owners',
    metaTitle: 'Buy a Home in Maryland With Good, Bad or No Credit',
    metaDescription: 'Arthur T Realty helps Maryland renters with good, bad, or no credit build a real path to homeownership.',
    eyebrow: 'Renters to Homeowners',
    title: 'From Renting to Owning, Whatever Your Credit',
    subtitle: 'Good credit, bad credit, or no credit, there is a path. We help you find yours and walk it with you.',
    image: HERO_IMAGES.porch,
    intro: [
      'Many renters assume homeownership is out of reach. Often it is closer than they think. Your credit score shapes your options, but it does not close the door.',
      'We look at your full situation, including credit, income, savings, and goals, and build a step-by-step plan to get you mortgage-ready.',
    ],
    cardsTitle: 'Which Path Fits You?',
    cards: [
      { title: '680 and above', text: 'Conventional loans may be an option. Your assistant guides you through each step.' },
      { title: '580 to 679', text: 'FHA loans and down payment assistance are often within reach, with some credit coaching along the way.' },
      { title: 'Below 580 or no credit', text: 'We start with credit help through independent licensed partners and a savings plan, and can explore rent-to-own as a bridge.' },
    ],
    steps: [
      { title: 'Take the quiz', text: 'Two minutes to see which path fits your situation.' },
      { title: 'Build your plan', text: 'Credit monitoring, applications, workshop, and counseling, one step at a time.' },
      { title: 'Get mortgage-ready', text: 'We help you prepare financially so you are ready when the right home comes along.' },
    ],
    forWho: [
      'Renters who want to stop paying someone else’s mortgage',
      'People rebuilding after credit problems',
      'Young adults with little or no credit history',
      'Families who want stability and equity',
    ],
    faqs: [
      { q: 'Can I buy a home with bad credit?', a: 'Sometimes, depending on the loan. If not right away, we help you improve your credit and set a realistic timeline.' },
      { q: 'What if I have no credit history?', a: 'Some lenders can consider alternative credit, like rent and utility payments. We also help you start building credit.' },
      { q: 'Is rent-to-own a good option?', a: 'For some buyers it is a useful bridge. We explain the pros, cons, and contract terms so you can decide.' },
      { q: 'How long until I can buy?', a: 'It depends on where you start. Some clients are ready in months, others take a year or more. You will always know your next step.' },
    ],
    formTitle: 'Find Your Path to Owning',
  },
  {
    slug: 'rooms-for-rent',
    name: 'Rooms For Rent',
    metaTitle: 'Affordable Rooms for Rent in Maryland',
    metaDescription: 'Affordable room rental options across Maryland from Arthur T Realty.',
    eyebrow: 'Rooms For Rent',
    title: 'Affordable Rooms for Rent in Maryland',
    subtitle: 'A safe, affordable place to live while you save and prepare to own a home of your own.',
    image: HERO_IMAGES.brick,
    intro: [
      'Sometimes the best first step toward owning a home is a lower monthly housing cost. Renting a room can free up money to save for a down payment and build your credit.',
      'Tell us what you are looking for, including area, budget, and move-in date, and we will let you know about available rooms.',
    ],
    cardsTitle: 'Why Rent a Room',
    cards: [
      { title: 'Lower Monthly Costs', text: 'Spend less on housing and put more toward your savings goals.' },
      { title: 'Flexible Options', text: 'Room rentals can offer more flexibility than a traditional apartment lease.' },
      { title: 'A Step Toward Owning', text: 'Pair your rental with our homeownership program to build a path to buying.' },
    ],
    steps: [
      { title: 'Tell us your needs', text: 'Share your preferred area, budget, and move-in timing.' },
      { title: 'See available rooms', text: 'We follow up with options that match what you are looking for.' },
      { title: 'Plan your next step', text: 'If you want to buy someday, we can start your homeownership plan too.' },
    ],
    forWho: [
      'People who need affordable housing quickly',
      'Renters saving for a down payment',
      'Anyone relocating to Maryland',
      'People getting back on their feet',
    ],
    faqs: [
      { q: 'Where are rooms available?', a: 'Availability changes. Fill out the form with your preferred area and we will tell you what is open.' },
      { q: 'What does it cost?', a: 'Rent depends on the room and location. We share pricing with each available option.' },
      { q: 'Can renting a room help me buy a home later?', a: 'Yes. Lower housing costs can help you save, and you can join our homeownership program at any time.' },
    ],
    formTitle: 'Ask About Available Rooms',
    heroCta: { label: 'Ask About Rooms', href: '#get-started' },
    submitLabel: 'Send Request',
  },
  {
    slug: 'credit-repair',
    name: 'Credit Restoration',
    metaTitle: 'Credit Restoration for Home Buyers in Maryland',
    metaDescription: 'Get mortgage-ready with credit monitoring, coaching, and credit restoration help for Maryland home buyers.',
    eyebrow: 'Credit Restoration',
    title: 'Get Your Credit Mortgage-Ready',
    subtitle: 'A better credit score can mean more loan options and a lower monthly payment. We help you get there.',
    image: HERO_IMAGES.house,
    intro: [
      'Your credit score is one of the biggest factors in whether you qualify for a mortgage and what interest rate you pay. Even a modest improvement can make a real difference over the life of a loan.',
      'Every client in our program starts with Smart Credit Monitoring, so you can see your report, spot errors, and track progress. When you need more help, we connect you with independent licensed credit restoration partners.',
    ],
    cardsTitle: 'How We Help',
    cards: [
      { title: 'Credit Monitoring', text: 'See your credit report and score and get alerts when something changes.' },
      { title: 'Error Review', text: 'Identify inaccurate or outdated items you have the right to dispute.' },
      { title: 'Coaching', text: 'Practical habits that raise your score: on-time payments, lower balances, and smart use of credit.' },
      { title: 'Licensed Partners', text: 'Referral to independent licensed credit restoration professionals when you need them.' },
    ],
    steps: [
      { title: 'Activate monitoring', text: 'Start Smart Credit Monitoring so we can see where you stand.' },
      { title: 'Make a plan', text: 'We identify what is holding your score back and what to tackle first.' },
      { title: 'Track progress', text: 'Watch your score improve and move on to your mortgage application when you are ready.' },
    ],
    forWho: [
      'Buyers whose score is keeping them from the loan they want',
      'People with errors or old items on their credit report',
      'Anyone rebuilding after medical bills, job loss, or divorce',
      'People with thin or no credit history',
    ],
    faqs: [
      { q: 'How long does it take to improve my credit?', a: 'It depends on what is on your report. Some changes show up within a few months; others take longer. Results vary and are not guaranteed.' },
      { q: 'Can accurate negative items be removed?', a: 'No. Accurate, current, and verifiable information cannot legally be removed. Inaccurate information can be disputed.' },
      { q: 'Does checking my own credit hurt my score?', a: 'No. Checking your own credit through monitoring is a soft inquiry and does not affect your score.' },
      { q: 'Is Arthur T Realty a credit repair company?', a: 'No. We provide monitoring and coaching as part of our program and refer clients to independent licensed partners for credit restoration services.' },
    ],
    disclaimer: { title: 'Your rights under the Credit Repair Organizations Act', text: CROA },
    formTitle: 'Start Improving Your Credit',
  },
  {
    slug: 'veterans',
    name: 'Helping Our Veterans Become Home Owners',
    metaTitle: 'Home Buying Help for Maryland Veterans',
    metaDescription: 'Arthur T Realty helps Maryland veterans and service members understand VA home loans and become homeowners.',
    eyebrow: 'Veterans',
    title: 'Helping Our Veterans Become Home Owners',
    subtitle: 'You served our country. We are honored to help you and your family find a home.',
    image: HERO_IMAGES.brick,
    intro: [
      'Veterans, active-duty service members, and some surviving spouses may be eligible for VA-backed home loans, which often require no down payment and no private mortgage insurance.',
      'We help you understand your benefits, get your Certificate of Eligibility, and work through each step of buying, with the same support every client in our program receives.',
    ],
    cardsTitle: 'Benefits Worth Knowing',
    cards: [
      { title: 'VA Home Loans', text: 'Backed by the U.S. Department of Veterans Affairs, often with no down payment required for eligible buyers.' },
      { title: 'No Private Mortgage Insurance', text: 'VA loans generally do not require PMI, which can lower your monthly payment.' },
      { title: 'State Programs', text: 'Maryland programs may offer additional assistance for veterans and service members.' },
    ],
    steps: [
      { title: 'Confirm eligibility', text: 'We help you request your VA Certificate of Eligibility.' },
      { title: 'Prepare to buy', text: 'Credit, budgeting, workshop, and counseling, tailored to VA buyers.' },
      { title: 'Find your home', text: 'Shop with confidence knowing your financing options.' },
    ],
    forWho: [
      'Veterans and active-duty service members',
      'National Guard and Reserve members who meet service requirements',
      'Eligible surviving spouses',
      'Military families relocating to Maryland',
    ],
    faqs: [
      { q: 'Do VA loans really require no down payment?', a: 'Many eligible buyers can purchase with no down payment, subject to lender requirements and the home’s appraised value.' },
      { q: 'Is there a VA funding fee?', a: 'Most VA loans include a funding fee, which can often be financed. Some veterans, such as those with service-connected disabilities, may be exempt.' },
      { q: 'Can I use my VA benefit more than once?', a: 'Often, yes. Entitlement can be restored or used again in many cases. We help you check your situation.' },
    ],
    formTitle: 'Get Started With Your VA Benefits',
  },
  {
    slug: 'rent-to-own',
    name: 'Rent To Own',
    metaTitle: 'Rent to Own Homes in Maryland',
    metaDescription: 'Explore rent-to-own homes in Maryland, a path to owning for buyers with good, bad, or no credit.',
    eyebrow: 'Rent To Own',
    title: 'Rent to Own: Move In Now, Buy Later',
    subtitle: 'Live in the home you want to buy while you build your credit and savings.',
    image: HERO_IMAGES.keys,
    intro: [
      'With rent-to-own, you rent a home with the option to buy it later, usually at a price agreed on up front. It gives you time to improve your credit and save while living in the home.',
      'Rent-to-own is a real contract with real obligations. We explain how it works, what to look for in the agreement, and whether it fits your plan.',
    ],
    cardsTitle: 'The Three Parts of a Rent-to-Own Deal',
    cards: [
      { title: 'Option Agreement', text: 'You pay an option fee for the right to buy the home later, often credited toward the purchase.' },
      { title: 'Lease Period', text: 'You rent the home for a set period, commonly one to three years.' },
      { title: 'Purchase', text: 'When you are ready, and if you choose to, you buy the home with a mortgage.' },
    ],
    steps: [
      { title: 'Tell us your goals', text: 'Share your budget, preferred area, and timeline.' },
      { title: 'Review your options', text: 'We walk through available homes and the terms of each agreement.' },
      { title: 'Build toward buying', text: 'Use the lease period to strengthen your credit and savings.' },
    ],
    forWho: [
      'Buyers who need time to improve their credit',
      'People saving for a down payment',
      'Families who want to settle into a neighborhood now',
      'Self-employed buyers building income history',
    ],
    faqs: [
      { q: 'Is the option fee refundable?', a: 'Usually not. If you decide not to buy, you may lose the option fee and any rent credits. Read the agreement carefully.' },
      { q: 'Am I required to buy the home?', a: 'It depends on the contract. Lease-option agreements usually give you the choice; lease-purchase agreements may obligate you to buy.' },
      { q: 'Who handles repairs?', a: 'Responsibility for maintenance and repairs varies by agreement. Make sure it is spelled out in writing.' },
      { q: 'Should I have a lawyer review the contract?', a: 'Yes. We strongly recommend having a real estate attorney review any rent-to-own agreement before you sign.' },
    ],
    disclaimer: {
      title: 'Important',
      text: 'Rent-to-own agreements are legally binding contracts, and terms vary. Option fees and rent credits may be non-refundable if you do not complete the purchase. Arthur T Realty is not a law firm and does not provide legal advice. Have a licensed Maryland real estate attorney review any agreement before signing.',
    },
    formTitle: 'Explore Rent-to-Own Homes',
  },
  {
    slug: 'homeless-to-homeowners',
    name: 'Helping the Homeless Become Home Owners',
    metaTitle: 'From Homelessness to Homeownership in Maryland',
    metaDescription: 'A fresh start and a real, step-by-step path from homelessness to stable housing and homeownership in Maryland.',
    eyebrow: 'A Fresh Start',
    title: 'Helping the Homeless Become Home Owners',
    subtitle: 'Everyone deserves a place to call home. We walk with you, one step at a time, from where you are today.',
    image: HERO_IMAGES.porch,
    intro: [
      'If you are experiencing homelessness or housing instability, owning a home may feel impossible. It is not. It starts with stable housing and a plan, and we help with both.',
      'We connect you with affordable housing options and resources, then guide you through credit, savings, and education until you are ready to buy. There is no judgment here, only next steps.',
    ],
    cardsTitle: 'How We Help',
    cards: [
      { title: 'Stable Housing First', text: 'Help finding affordable rooms and rentals so you have a secure place to live.' },
      { title: 'Building Credit & Savings', text: 'Credit monitoring, coaching, and a savings plan that fits your income.' },
      { title: 'Education & Counseling', text: 'Our workshop and one-on-one counseling prepare you for every step of buying.' },
    ],
    steps: [
      { title: 'Tell us your situation', text: 'Everything you share is kept private.' },
      { title: 'Stabilize', text: 'We help you find housing and connect you with resources.' },
      { title: 'Build your path', text: 'Credit, savings, and education, at your pace, until you are ready to own.' },
    ],
    forWho: [
      'People experiencing homelessness or housing instability',
      'Families in temporary or shared housing',
      'People leaving shelters or transitional programs',
      'Anyone ready for a fresh start',
    ],
    faqs: [
      { q: 'Can I really buy a home starting from homelessness?', a: 'It takes time and a plan, but yes, people do. We focus on stable housing first, then build toward ownership.' },
      { q: 'Does it cost anything to get started?', a: 'No. Getting started and getting a plan is free.' },
      { q: 'What if I do not have a phone or email?', a: 'The form only needs one way to reach you, either a phone number or an email address. A free email account works, and your assistant can reach you there.' },
    ],
    formTitle: 'Start Your Fresh Start',
    heroCta: { label: 'Get Started Today', href: '#get-started' },
    submitLabel: 'Get Started',
  },
  {
    slug: 'sell-your-home',
    name: 'Want to Sell Your Home',
    metaTitle: 'Sell Your Home in Maryland',
    metaDescription: 'Thinking of selling your Maryland home? Learn how Arthur T Realty helps with pricing, preparation, and listing your home.',
    eyebrow: 'Sell Your Home',
    title: 'Sell Your Home With Arthur T Realty',
    subtitle: 'Get a clear plan for pricing, preparing, and marketing your home, and support all the way to closing.',
    image: HERO_IMAGES.keys,
    intro: [
      'Selling a home involves a lot of decisions: when to list, how to price, what to fix, and how to negotiate. We help you make each one with confidence.',
      'Tell us about your home and your timeline, and we will follow up to talk through your options.',
    ],
    cardsTitle: 'What You Can Expect',
    cards: [
      { title: 'Pricing Guidance', text: 'A pricing strategy based on recent comparable sales in your area.' },
      { title: 'Preparation', text: 'Advice on repairs, staging, and photos that help your home stand out.' },
      { title: 'Marketing & Showings', text: 'Getting your home in front of qualified buyers.' },
      { title: 'Negotiation to Closing', text: 'Help reviewing offers, negotiating terms, and staying on track to closing.' },
    ],
    steps: [
      { title: 'Tell us about your home', text: 'Share the address, condition, and when you want to sell.' },
      { title: 'Get your plan', text: 'We talk through pricing, preparation, and timing.' },
      { title: 'List and sell', text: 'Go to market with a strategy and support through closing.' },
    ],
    forWho: [
      'Homeowners ready to sell in the next few months',
      'Owners upsizing, downsizing, or relocating',
      'Heirs handling an inherited property',
      'Investors selling a rental property',
    ],
    faqs: [
      { q: 'How do you decide on a listing price?', a: 'We look at recent sales of similar homes nearby, current market conditions, and your home’s condition and features.' },
      { q: 'Do I need to make repairs before selling?', a: 'Not always. We help you decide which updates are worth it and which are not.' },
      { q: 'How long will it take to sell?', a: 'It depends on price, location, condition, and the market. We give you a realistic estimate for your home.' },
    ],
    formTitle: 'Tell Us About Your Home',
    heroCta: { label: 'Talk About Selling', href: '#get-started' },
    submitLabel: 'Request a Call',
  },
  {
    slug: 'investment-properties',
    name: 'Looking to Buy Investment Properties',
    metaTitle: 'Buy Investment Properties in Maryland',
    metaDescription: 'Build your Maryland real estate portfolio with help finding and evaluating investment properties.',
    eyebrow: 'Investment Properties',
    title: 'Build Your Real Estate Portfolio',
    subtitle: 'Find and evaluate Maryland investment properties with someone who knows the local market.',
    image: HERO_IMAGES.house,
    intro: [
      'Whether you are buying your first rental or adding to a portfolio, the numbers have to work. We help you find properties and think through costs, rents, and financing before you commit.',
      'Tell us your goals, budget, and preferred areas, and we will follow up with next steps.',
    ],
    cardsTitle: 'How We Help Investors',
    cards: [
      { title: 'Property Search', text: 'Finding single-family homes and small multifamily properties that fit your criteria.' },
      { title: 'Deal Evaluation', text: 'Thinking through purchase price, repairs, expected rent, and operating costs.' },
      { title: 'Financing Options', text: 'Understanding investment loan options and what lenders look for.' },
    ],
    steps: [
      { title: 'Share your goals', text: 'Budget, property type, areas, and how hands-on you want to be.' },
      { title: 'Review opportunities', text: 'We find and walk through properties that match.' },
      { title: 'Make your move', text: 'Offer, inspection, financing, and closing with support at each step.' },
    ],
    forWho: [
      'First-time real estate investors',
      'Homeowners who want to keep their current home as a rental',
      'Investors growing a rental portfolio',
      'Buyers interested in house-hacking a multifamily home',
    ],
    faqs: [
      { q: 'How much do I need to buy an investment property?', a: 'Investment loans often require a larger down payment than owner-occupied loans. We help you understand the options.' },
      { q: 'Can I live in one unit and rent the others?', a: 'Yes. Buying a 2–4 unit home and living in one unit can let you use owner-occupied financing.' },
      { q: 'Do you help with property management?', a: 'Tell us what you need and we will point you in the right direction.' },
    ],
    formTitle: 'Start Your Investment Search',
    heroCta: { label: 'Start Your Search', href: '#get-started' },
    submitLabel: 'Start My Search',
  },
];

export const SERVICE_OPTIONS = SERVICES.map((s) => ({ value: s.slug, label: s.name }));
