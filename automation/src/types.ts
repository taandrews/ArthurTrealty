export type LeadSource =
  | 'website'
  | 'facebook'
  | 'google_ads'
  | 'referral'
  | 'phone'
  | 'walk_in'
  | 'realtor_referral';

export const LEAD_SOURCES: LeadSource[] = [
  'website', 'facebook', 'google_ads', 'referral', 'phone', 'walk_in', 'realtor_referral',
];

export type LeadStatus = 'active' | 'mortgage_ready' | 'purchased' | 'exited';

/** Client milestones. Each one is reported by staff, an integration, or the client's own replies. */
export type MilestoneType =
  | 'smart_credit_activated'
  | 'loan_application_submitted'
  | 'land_trust_submitted'
  | 'workshop_registered'
  | 'workshop_attended'
  | 'counseling_scheduled'
  | 'counseling_completed'
  | 'funds_ready'
  | 'purchased'
  | 'exited';

export const MILESTONE_TYPES: MilestoneType[] = [
  'smart_credit_activated', 'loan_application_submitted', 'land_trust_submitted',
  'workshop_registered', 'workshop_attended', 'counseling_scheduled',
  'counseling_completed', 'funds_ready', 'purchased', 'exited',
];

export interface Workshop {
  at: string;
  location?: string;
  meetingLink?: string;
  whatToBring?: string;
  version: number;
}

/** CRM fields collected during the Earnest Money conversation. */
export interface Funds {
  hasSaved?: boolean;
  earnestMoneySavings?: number;
  appraisalBudget?: number;
  inspectionBudget?: number;
  totalFundsAvailable?: number;
  estimatedDateFundsAvailable?: string;
  savingsPlanRequested?: boolean;
  assistanceInfoRequested?: boolean;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  dueAt: string;
  assignedTo: string;
  doneAt?: string;
}

export interface Staff {
  name: string;
  email: string;
  phone: string;
}

/** An in-progress SMS question-and-answer conversation. */
export interface Conversation {
  kind: 'funds';
  step: number;
}

export interface Lead {
  entity: 'lead';
  leadId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  sourceDetail?: string;
  status: LeadStatus;
  phase?: string;
  createdAt: string;
  assignedTo: Staff;
  consent?: { text: string; at: string; ip?: string; userAgent?: string };
  quiz?: Record<string, string>;
  notes?: string;
  executionArn?: string;
  taskToken?: string;
  phaseAttempts: Record<string, number>;
  milestones: Partial<Record<MilestoneType, string>>;
  workshop?: Workshop;
  funds: Funds;
  tasks: Task[];
  conversation?: Conversation;
  contactedAt?: string;
  lastContactAt?: string;
  firstResponseAt?: string;
  lastResponseAt?: string;
  inactiveNotifiedAt?: string;
  nurtureIndex: number;
  nurtureLastSentAt?: string;
  mortgageReadyAt?: string;
  smsOptOut?: boolean;
  emailOptOut?: boolean;
}
