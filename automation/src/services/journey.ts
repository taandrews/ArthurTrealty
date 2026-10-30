import { SFNClient, SendTaskSuccessCommand, StartExecutionCommand, StopExecutionCommand } from '@aws-sdk/client-sfn';
import { randomUUID } from 'node:crypto';
import { env, getConfig } from '../config';
import { WORKSHOP_REMINDERS } from '../content/messages';
import { toE164 } from '../lib/phone';
import { DAY_MS, nowIso } from '../lib/time';
import { phaseFor } from '../phases';
import type { Funds, Lead, LeadSource, MilestoneType, Staff, Workshop } from '../types';
import { BadRequestError, logActivity, mustGetLead, nextAssignmentIndex, putNewLead, updateLead } from './db';
import { notifyStaff } from './notify';
import { scheduleJob } from './scheduler';

const sfn = new SFNClient({ region: env.dataRegion });

/* ——— New leads ——— */

export interface NewLeadInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  sourceDetail?: string;
  consent?: Lead['consent'];
  quiz?: Record<string, string>;
  notes?: string;
}

function newLeadId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `ATR-${date}-${rand}`;
}

/**
 * Names are read aloud and texted to the number given, so anyone filling in the public form controls
 * that text. Keep only letters, spaces, apostrophes and hyphens so a "name" can't carry a link or message.
 */
export function cleanName(name: string | undefined): string {
  return (name ?? '').replace(/[^\p{L}\p{M}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** Create the client profile, assign a coordinator, create follow-up tasks, and start the journey. */
export async function createLead(input: NewLeadInput): Promise<Lead> {
  const cfg = getConfig();
  const firstName = cleanName(input.firstName);
  if (!firstName) throw new BadRequestError('First name is required');
  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = toE164(input.phone);
  if (!email && !phone) throw new BadRequestError('An email address or a valid US phone number is required');

  const staff = cfg.staff as Staff[];
  const assignedTo = staff[(await nextAssignmentIndex()) % staff.length];
  const now = new Date();
  const leadId = newLeadId();

  const lead: Lead = {
    entity: 'lead',
    leadId,
    firstName,
    lastName: cleanName(input.lastName),
    email,
    phone,
    source: input.source,
    sourceDetail: input.sourceDetail,
    status: 'active',
    createdAt: now.toISOString(),
    assignedTo,
    consent: input.consent,
    quiz: input.quiz,
    notes: input.notes,
    phaseAttempts: {},
    milestones: {},
    funds: {},
    tasks: [
      {
        id: 'intro-call',
        title: 'Personal introduction call',
        dueAt: new Date(now.getTime() + DAY_MS).toISOString(),
        assignedTo: assignedTo.name,
      },
      {
        id: 'review-progress',
        title: 'Review first-week progress',
        dueAt: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
        assignedTo: assignedTo.name,
      },
    ],
    nurtureIndex: 0,
  };
  await putNewLead(lead);
  await logActivity({ leadId, kind: 'note', summary: `Lead created from ${input.source}, assigned to ${assignedTo.name}` });

  const exec = await sfn.send(new StartExecutionCommand({
    stateMachineArn: env.stateMachineArn,
    name: leadId,
    input: JSON.stringify({ leadId }),
  }));
  const saved = await updateLead(leadId, { executionArn: exec.executionArn });

  await notifyStaff(saved, 'New lead assigned to you', [
    `Source: ${input.source}${input.sourceDetail ? ` (${input.sourceDetail})` : ''}`,
    'Tasks: personal introduction call within 24 hours; review progress in one week.',
    ...(input.notes ? [`Notes: ${input.notes}`] : []),
  ]);
  return saved;
}

/* ——— Milestones ——— */

const MILESTONE_ALERTS: Record<MilestoneType, string> = {
  smart_credit_activated: 'Activated Smart Credit',
  loan_application_submitted: 'Completed the loan application',
  land_trust_submitted: 'Completed the Land Trust application',
  workshop_registered: 'Registered for the workshop',
  workshop_attended: 'Attended the workshop',
  counseling_scheduled: 'Scheduled counseling',
  counseling_completed: 'Completed counseling',
  funds_ready: 'Has saved enough for upfront costs',
  purchased: 'Purchased a home',
  exited: 'Exited the program',
};

export interface MilestoneData {
  workshop?: Omit<Workshop, 'version'>;
}

/**
 * Record that a client reached a milestone. If it completes the step the client is on, the journey
 * moves to the next step. Milestones reported early are remembered, and that step is skipped later.
 */
export async function recordMilestone(leadId: string, type: MilestoneType, data: MilestoneData = {}, by = 'staff'): Promise<Lead> {
  const lead = await mustGetLead(leadId);
  // Re-registering for a different workshop date is allowed; other milestones only count once.
  if (lead.milestones[type] && type !== 'workshop_registered') return lead;

  const now = nowIso();
  const fields: Record<string, unknown> = {
    [`milestones.${type}`]: now,
    lastResponseAt: now,
    ...(lead.firstResponseAt ? {} : { firstResponseAt: now }),
  };

  let workshop: Workshop | undefined;
  if (type === 'workshop_registered') {
    const at = data.workshop?.at;
    if (!at || Number.isNaN(Date.parse(at))) throw new BadRequestError('Workshop date and time are required');
    workshop = { ...data.workshop!, at: new Date(at).toISOString(), version: (lead.workshop?.version ?? 0) + 1 };
    fields.workshop = workshop;
  }
  if (type === 'purchased') fields.status = 'purchased';
  if (type === 'exited') fields.status = 'exited';

  let updated = await updateLead(leadId, fields);
  await logActivity({ leadId, kind: 'milestone', summary: `${MILESTONE_ALERTS[type]} (reported by ${by})` });

  if (workshop) await scheduleWorkshopReminders(leadId, workshop);

  if (type === 'purchased' || type === 'exited') {
    await stopJourney(updated);
  } else if (updated.phase && updated.taskToken && phaseFor(updated.phase).completedBy === type) {
    await advance(updated.taskToken);
    updated = await updateLead(leadId, {}, { remove: ['taskToken'] });
  }

  const details = workshop ? [`Workshop: ${workshop.at}${workshop.location ? `, ${workshop.location}` : ''}`] : [];
  await notifyStaff(updated, MILESTONE_ALERTS[type], details);
  return updated;
}

/** Tell the state machine the current step is done. Stale tokens (journey already moved on or stopped) are ignored. */
export async function advance(taskToken: string): Promise<void> {
  try {
    await sfn.send(new SendTaskSuccessCommand({ taskToken, output: '{}' }));
  } catch (err) {
    const name = (err as Error).name;
    if (!['TaskDoesNotExist', 'TaskTimedOut', 'InvalidToken'].includes(name)) throw err;
  }
}

async function stopJourney(lead: Lead): Promise<void> {
  if (!lead.executionArn) return;
  try {
    await sfn.send(new StopExecutionCommand({ executionArn: lead.executionArn, cause: `Lead ${lead.status}` }));
  } catch (err) {
    if ((err as Error).name !== 'ExecutionDoesNotExist') throw err;
  }
}

async function scheduleWorkshopReminders(leadId: string, workshop: Workshop): Promise<void> {
  const start = new Date(workshop.at).getTime();
  for (const r of WORKSHOP_REMINDERS) {
    const at = new Date(start - r.minutesBefore * 60_000);
    if (at.getTime() <= Date.now() + 60_000) continue;
    await scheduleJob(at, { action: 'workshopReminder', leadId, label: r.label, version: workshop.version }, 'workshop');
  }
}

/* ——— Earnest money / funds ——— */

/** Update the funds CRM fields, flag requests for help, and complete the step once the client has enough saved. */
export async function updateFunds(leadId: string, changes: Funds, by: string): Promise<Lead> {
  const cfg = getConfig();
  const before = await mustGetLead(leadId);
  const funds: Funds = { ...before.funds, ...changes, updatedAt: nowIso() };
  const parts = [funds.earnestMoneySavings, funds.appraisalBudget, funds.inspectionBudget].filter((n) => n !== undefined);
  if (changes.totalFundsAvailable === undefined && parts.length) {
    funds.totalFundsAvailable = parts.reduce((a, b) => a + (b ?? 0), 0);
  }
  let lead = await updateLead(leadId, { funds });
  await logActivity({ leadId, kind: 'note', summary: `Funds updated by ${by}: total ${funds.totalFundsAvailable ?? 'unknown'}` });

  const askedForHelp =
    (changes.savingsPlanRequested && !before.funds.savingsPlanRequested) ||
    (changes.assistanceInfoRequested && !before.funds.assistanceInfoRequested);
  if (askedForHelp) {
    await notifyStaff(lead, 'Requests assistance', [
      funds.savingsPlanRequested ? '- Wants help creating a savings plan' : '',
      funds.assistanceInfoRequested ? '- Wants information on down payment / closing cost assistance' : '',
    ].filter(Boolean));
  }

  if ((funds.totalFundsAvailable ?? 0) >= cfg.rules.upfrontCostsTarget) {
    lead = await recordMilestone(leadId, 'funds_ready', {}, by);
  }
  return lead;
}
