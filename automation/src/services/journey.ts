import { SFNClient, SendTaskFailureCommand, SendTaskSuccessCommand, StartExecutionCommand, StopExecutionCommand } from '@aws-sdk/client-sfn';
import { randomUUID } from 'node:crypto';
import { env, getConfig } from '../config';
import { WORKSHOP_REMINDERS } from '../content/messages';
import { toE164, toUsPhone } from '../lib/phone';
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
  // Numbers outside the US service area (other +1 countries, premium codes) are treated as no number.
  const phone = toUsPhone(input.phone);
  if (!email && !phone) {
    throw new BadRequestError(toE164(input.phone)
      ? 'Please enter a US mobile number'
      : 'An email address or a valid US phone number is required');
  }

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

  // The lead is saved either way; if the journey can't start, staff are told instead of losing the lead.
  const executionArn = await startJourney(leadId);
  const saved = executionArn ? await updateLead(leadId, { executionArn }) : lead;
  if (!executionArn) {
    await logActivity({ leadId, kind: 'note', summary: 'Journey could not be started (automated outreach is not running)' });
    await notifyStaff(saved, 'Journey did not start', ['The lead was saved, but automated calls, texts, and emails are not running for them.']);
  }

  await notifyStaff(saved, 'New lead assigned to you', [
    `Source: ${input.source}${input.sourceDetail ? ` (${input.sourceDetail})` : ''}`,
    'Tasks: personal introduction call within 24 hours; review progress in one week.',
    ...(input.notes ? [`Notes: ${input.notes}`] : []),
    ...(input.consent ? [] : ['No consent on record: automated calls, texts, and emails will not go out to this client.']),
  ]);
  return saved;
}

/** Start the journey, retrying briefly. Same name + input is idempotent, so a retry can't start it twice. */
async function startJourney(leadId: string): Promise<string | undefined> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const exec = await sfn.send(new StartExecutionCommand({
        stateMachineArn: env.stateMachineArn,
        name: leadId,
        input: JSON.stringify({ leadId }),
      }));
      return exec.executionArn;
    } catch (err) {
      console.error(`Starting the journey for ${leadId} failed (attempt ${attempt})`, err);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    }
  }
  return undefined;
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

/** Fail the current step so the state machine's retry (and, after that, its error alert) takes over. */
export async function failTask(taskToken: string, err: unknown): Promise<void> {
  try {
    await sfn.send(new SendTaskFailureCommand({
      taskToken,
      error: 'PhaseFailed',
      cause: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
    }));
  } catch (e) {
    const name = (e as Error).name;
    if (!['TaskDoesNotExist', 'TaskTimedOut', 'InvalidToken'].includes(name)) throw e;
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
