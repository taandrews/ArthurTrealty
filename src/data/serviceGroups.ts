import {
  Home, Key, Users, CreditCard, GraduationCap, BedDouble, Shield, Heart, Building, TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface ServiceLink {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface ServiceGroup {
  /** Finishes the sentence "I want to…". */
  goal: string;
  desc: string;
  links: ServiceLink[];
}

/** The ten services, grouped by what the visitor wants to do. Shared by the homepage and the navbar. */
export const serviceGroups: ServiceGroup[] = [
  {
    goal: 'Buy my first home',
    desc: 'Good, bad, or no credit. State homebuying programs, help with your down payment, and a plan for every step.',
    links: [
      { name: 'First-Time Buyers', href: '/first-time-buyer', icon: Home },
      { name: 'Renters to Homeowners', href: '/renters-to-homeowners', icon: Users },
      { name: 'Veterans', href: '/veterans', icon: Shield },
      { name: 'Workshops', href: '/workshops', icon: GraduationCap },
      { name: 'Credit Restoration', href: '/credit-repair', icon: CreditCard },
    ],
  },
  {
    goal: 'Find a place now',
    desc: 'Affordable rooms, rent-to-own homes, and stable housing first if you are between homes.',
    links: [
      { name: 'Rooms for Rent', href: '/rooms-for-rent', icon: BedDouble },
      { name: 'Rent to Own', href: '/rent-to-own', icon: Key },
      { name: 'Homeless to Homeowners', href: '/homeless-to-homeowners', icon: Heart },
    ],
  },
  {
    goal: 'Sell my home',
    desc: 'List your Maryland home with Arthur and get guidance from pricing to closing.',
    links: [{ name: 'Sell Your Home', href: '/sell-your-home', icon: Building }],
  },
  {
    goal: 'Invest in property',
    desc: 'Find rental and investment properties anywhere in Maryland.',
    links: [{ name: 'Investment Properties', href: '/investment-properties', icon: TrendingUp }],
  },
];

export const QUIZ_LABEL = 'See What You Qualify For';
