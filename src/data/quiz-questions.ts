export interface QuizOption {
  label: string;
  value: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'radio' | 'dropdown';
  options: QuizOption[];
  /** Short reassurance shown under the question */
  helper?: string;
  /** Skip this question when the goal answer is one of these values */
  skipForGoals?: string[];
}

export type TierKey = 'strong' | 'building' | 'fresh' | 'unsure' | 'sell' | 'invest';

export interface ResultTier {
  key: TierKey;
  title: string;
  /** 'light' = white card, 'dark' = navy card */
  color: 'light' | 'dark';
  description: string;
  /** The single first step for this pathway */
  firstStep: string;
  firstStepDetail: string;
  /** The steps that come after the first one */
  features: string[];
  cta: string;
  ctaHref: string;
  timeline: string;
}

const MONEY_HELPER = 'No credit check, and there are no wrong answers.';

/** Goals that skip the credit, income, and savings questions */
const NON_BUYER_GOALS = ['sell', 'invest'];

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'goal',
    question: 'What\'s your homeownership goal?',
    type: 'radio',
    options: [
      { label: 'Buy my first home', value: 'first-home' },
      { label: 'Stop renting and start owning', value: 'stop-renting' },
      { label: 'Rent-to-own a home', value: 'rent-to-own' },
      { label: 'Buy a home using my VA benefits', value: 'va' },
      { label: 'Sell my home', value: 'sell' },
      { label: 'Invest in property', value: 'invest' },
      { label: 'Just exploring my options', value: 'exploring' },
    ],
  },
  {
    id: 'timeline',
    question: 'When would you like to make your move?',
    type: 'radio',
    options: [
      { label: 'Within 3 months', value: '3mo' },
      { label: '3–6 months', value: '3-6mo' },
      { label: '6–12 months', value: '6-12mo' },
      { label: '12+ months from now', value: '12mo+' },
    ],
  },
  {
    id: 'credit',
    question: 'What\'s your approximate credit score?',
    type: 'radio',
    helper: MONEY_HELPER,
    skipForGoals: NON_BUYER_GOALS,
    options: [
      { label: '720 or higher', value: '720+' },
      { label: '680–719', value: '680-719' },
      { label: '620–679', value: '620-679' },
      { label: '580–619', value: '580-619' },
      { label: 'Below 580', value: 'below-580' },
      { label: 'I don\'t have credit yet', value: 'no-credit' },
      { label: 'I\'m not sure', value: 'not-sure' },
    ],
  },
  {
    id: 'income',
    question: 'What\'s your household income?',
    type: 'radio',
    helper: MONEY_HELPER,
    skipForGoals: NON_BUYER_GOALS,
    options: [
      { label: 'Under $40,000', value: 'under-40k' },
      { label: '$40,000–$60,000', value: '40-60k' },
      { label: '$60,000–$80,000', value: '60-80k' },
      { label: '$80,000–$120,000', value: '80-120k' },
      { label: '$120,000+', value: '120k+' },
    ],
  },
  {
    id: 'savings',
    question: 'How much do you have saved for a down payment?',
    type: 'radio',
    helper: MONEY_HELPER,
    skipForGoals: NON_BUYER_GOALS,
    options: [
      { label: 'Nothing yet', value: 'nothing' },
      { label: 'Under $5,000', value: 'under-5k' },
      { label: '$5,000–$15,000', value: '5-15k' },
      { label: '$15,000–$30,000', value: '15-30k' },
      { label: '$30,000+', value: '30k+' },
    ],
  },
  {
    id: 'county',
    question: 'Which Maryland county do you live in?',
    type: 'dropdown',
    options: [], // populated from counties.ts at runtime
  },
  {
    id: 'situation',
    question: 'Which best describes your current situation?',
    type: 'radio',
    options: [
      { label: 'Renting an apartment or house', value: 'renting' },
      { label: 'Living with family or friends', value: 'family' },
      { label: 'Without stable housing right now', value: 'unstable-housing' },
      { label: 'Facing or recovering from foreclosure', value: 'foreclosure' },
      { label: 'I own my home', value: 'own' },
    ],
  },
];

/** The questions that apply to someone, based on their goal answer */
export function getVisibleQuestions(answers: Record<string, string>): QuizQuestion[] {
  return quizQuestions.filter((q) => !q.skipForGoals?.includes(answers.goal));
}

/** Intro line shown on question 1 */
export const quizIntro = `${quizQuestions.length} quick questions, about 2 minutes.`;

const BUYER_STEPS_AFTER_CREDIT = [
  'Online mortgage application',
  'Land Trust application',
  'Homeownership Workshop',
  'One-on-one session with a Certified Homeownership Counselor',
  'Earnest money planning',
];

const BUYER_NEXT = 'What happens next: your homeownership assistant will call you with your first step.';
const PLANS_NEXT = 'What happens next: your assistant will call you to learn about your plans.';

export const resultTiers: Record<TierKey, ResultTier> = {
  strong: {
    key: 'strong',
    title: 'Ready to Start',
    color: 'light',
    description:
      'Your answers suggest you can begin the homebuying steps now. Your assistant will guide you through each one.',
    firstStep: 'Smart Credit Monitoring',
    firstStepDetail: 'See your credit and track your progress, so you know where you stand from day one.',
    features: BUYER_STEPS_AFTER_CREDIT,
    cta: 'See How It Works',
    ctaHref: '/#how-it-works',
    timeline: BUYER_NEXT,
  },
  building: {
    key: 'building',
    title: 'Building Momentum',
    color: 'dark',
    description:
      'You may be closer than you think. Your assistant will guide you through the program one step at a time, including down payment assistance programs you can explore.',
    firstStep: 'Smart Credit Monitoring',
    firstStepDetail: 'See your credit and track your progress as it grows.',
    features: BUYER_STEPS_AFTER_CREDIT,
    cta: 'See How It Works',
    ctaHref: '/#how-it-works',
    timeline: BUYER_NEXT,
  },
  fresh: {
    key: 'fresh',
    title: 'Fresh Start',
    color: 'light',
    description:
      'Every homeowner started somewhere. Your assistant will guide you step by step, including credit help through independent licensed partners and rent-to-own options while you get ready.',
    firstStep: 'Smart Credit Monitoring',
    firstStepDetail: 'See your credit today and watch it improve as you take each step.',
    features: BUYER_STEPS_AFTER_CREDIT,
    cta: 'See How It Works',
    ctaHref: '/#how-it-works',
    timeline: BUYER_NEXT,
  },
  unsure: {
    key: 'unsure',
    title: 'Let\'s Find Out Together',
    color: 'light',
    description:
      'Not knowing your score, or not having credit yet, is completely normal. Your assistant will help you see where you stand and guide you from there.',
    firstStep: 'Check your credit with Smart Credit Monitoring',
    firstStepDetail: 'Find out where your credit stands today, so every next step fits you.',
    features: BUYER_STEPS_AFTER_CREDIT,
    cta: 'See How It Works',
    ctaHref: '/#how-it-works',
    timeline: BUYER_NEXT,
  },
  sell: {
    key: 'sell',
    title: 'Selling Your Home',
    color: 'dark',
    description:
      'Selling is a big move. Your assistant will learn about your home and your goals, then guide you through what comes next.',
    firstStep: 'Your assistant will call you to learn about your plans',
    firstStepDetail: 'Share a little about your home, your timeline, and where you\'d like to go next.',
    features: [
      'Learn how listing with Arthur T Realty works',
      'Plan your timeline and next move',
      'Get guidance on buying your next home, if you\'re planning to',
    ],
    cta: 'Learn About Selling',
    ctaHref: '/sell-your-home',
    timeline: PLANS_NEXT,
  },
  invest: {
    key: 'invest',
    title: 'Investing in Maryland Property',
    color: 'dark',
    description:
      'Investing in Maryland real estate can help you build long-term wealth. Your assistant will learn what you\'re looking for and guide you from there.',
    firstStep: 'Your assistant will call you to learn about your plans',
    firstStepDetail: 'Share the kind of property, area, and timeline you have in mind.',
    features: [
      'Talk through your investment goals and budget',
      'Explore Maryland areas that fit your plans',
      'Learn how buying with Arthur T Realty works',
    ],
    cta: 'Learn About Investing',
    ctaHref: '/investment-properties',
    timeline: PLANS_NEXT,
  },
};

/** Goal answers that lead straight to their own pathway */
const goalTierMap: Partial<Record<string, TierKey>> = {
  sell: 'sell',
  invest: 'invest',
};

/** Credit answers mapped to pathways. Anything missing maps to 'unsure'. */
const creditTierMap: Partial<Record<string, TierKey>> = {
  '720+': 'strong',
  '680-719': 'strong',
  '620-679': 'building',
  '580-619': 'building',
  'below-580': 'fresh',
  'no-credit': 'unsure',
  'not-sure': 'unsure',
};

export function getResultTier(answers: Record<string, string>): ResultTier {
  const key = goalTierMap[answers.goal] ?? creditTierMap[answers.credit] ?? 'unsure';
  return resultTiers[key];
}
