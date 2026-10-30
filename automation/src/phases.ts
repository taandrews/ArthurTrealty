import type { MilestoneType } from './types';

export type PhaseKey =
  | 'smart_credit'
  | 'loan_application'
  | 'land_trust'
  | 'workshop_registration'
  | 'workshop_attendance'
  | 'counseling_scheduling'
  | 'counseling_completion'
  | 'earnest_money';

export interface PhaseDef {
  key: PhaseKey;
  /** Milestone that completes this phase and moves the client on. */
  completedBy: MilestoneType;
  /** How often to re-send reminders while waiting, from config.rules. Undefined = wait quietly. */
  remind?: 'reminderEveryDays' | 'fundsFollowUpEveryDays';
}

/** The Home Buyer Journey, in order. The state machine is generated from this list. */
export const PHASES: PhaseDef[] = [
  { key: 'smart_credit', completedBy: 'smart_credit_activated', remind: 'reminderEveryDays' },
  { key: 'loan_application', completedBy: 'loan_application_submitted', remind: 'reminderEveryDays' },
  { key: 'land_trust', completedBy: 'land_trust_submitted', remind: 'reminderEveryDays' },
  { key: 'workshop_registration', completedBy: 'workshop_registered', remind: 'reminderEveryDays' },
  // Reminders for the workshop itself are scheduled against its date (7d, 3d, 24h, 3h, 1h).
  { key: 'workshop_attendance', completedBy: 'workshop_attended' },
  { key: 'counseling_scheduling', completedBy: 'counseling_scheduled', remind: 'reminderEveryDays' },
  { key: 'counseling_completion', completedBy: 'counseling_completed' },
  { key: 'earnest_money', completedBy: 'funds_ready', remind: 'fundsFollowUpEveryDays' },
];

export function phaseFor(key: string): PhaseDef {
  const phase = PHASES.find((p) => p.key === key);
  if (!phase) throw new Error(`Unknown phase: ${key}`);
  return phase;
}

/** The phase a milestone completes, if any. */
export function phaseCompletedBy(milestone: MilestoneType): PhaseDef | undefined {
  return PHASES.find((p) => p.completedBy === milestone);
}
