import { getConfig } from '../config';
import { mortgageReady, phaseIntro, phaseReminder, welcome } from '../content/messages';
import { nowIso } from '../lib/time';
import { phaseFor, type PhaseKey } from '../phases';
import { sendOutreach } from '../services/channels';
import { startFundsConversation } from '../services/conversation';
import { claimOnce, getLead, logActivity, mustGetLead, updateLead } from '../services/db';
import { advance, failTask } from '../services/journey';
import { notifyManagers, notifyStaff } from '../services/notify';

export type JourneyEvent =
  | { action: 'welcome'; leadId: string }
  /** `stepKey` is when the state machine entered the step: the same across its retries, new for each reminder. */
  | { action: 'phase'; leadId: string; phase: PhaseKey; taskToken: string; stepKey?: string }
  | { action: 'mortgageReady'; leadId: string }
  /** A step failed after its retries; `error` is what the state machine caught. */
  | { action: 'failed'; leadId: string; error?: { Error?: string; Cause?: string } };

/** Invoked by the Home Buyer Journey state machine for each step. */
export async function handler(event: JourneyEvent): Promise<void> {
  const cfg = getConfig();

  switch (event.action) {
    case 'welcome': {
      const lead = await mustGetLead(event.leadId);
      // The state machine retries failed steps; the claim keeps a retry from sending the welcome twice.
      if (!(await claimOnce(`journey#${lead.leadId}#welcome`))) return;
      await sendOutreach(lead, welcome({ cfg, lead }), 'Welcome');
      return;
    }

    case 'phase':
      try {
        await runPhase(event.leadId, event.phase, event.taskToken, event.stepKey);
      } catch (err) {
        // The step waits on its task token, so report the failure through it (the state machine then retries).
        console.error(`Step ${event.phase} failed for ${event.leadId}`, err);
        await failTask(event.taskToken, err);
      }
      return;

    case 'mortgageReady': {
      const updated = await updateLead(event.leadId, {
        status: 'mortgage_ready', phase: 'mortgage_ready', mortgageReadyAt: nowIso(),
      }, { remove: ['taskToken'] });
      if (!(await claimOnce(`journey#${event.leadId}#mortgage_ready`))) return;
      await sendOutreach(updated, mortgageReady({ cfg, lead: updated }), 'Mortgage ready');
      await notifyStaff(updated, 'Client is mortgage-ready');
      return;
    }

    case 'failed':
      return journeyFailed(event.leadId, event.error);
  }
}

/**
 * Called when a step starts, and again each time its reminder timer runs out. The state machine waits
 * until recordMilestone() returns the task token, so this function only sends messages and saves the token.
 */
async function runPhase(leadId: string, phase: PhaseKey, taskToken: string, stepKey?: string): Promise<void> {
  const cfg = getConfig();
  const def = phaseFor(phase);
  const before = await mustGetLead(leadId);
  const attempt = before.phaseAttempts[phase] ?? 0;

  let lead;
  try {
    // The condition closes the race with a milestone recorded while this runs.
    lead = await updateLead(leadId, { phase, taskToken }, { condition: `attribute_not_exists(milestones.${def.completedBy})` });
  } catch (err) {
    if ((err as Error).name !== 'ConditionalCheckFailedException') throw err;
    // Already done (reported early): skip straight to the next step.
    await updateLead(leadId, { phase });
    await logActivity({ leadId, kind: 'note', summary: `Step ${phase} already complete, skipping` });
    await advance(taskToken);
    return;
  }

  // A retry of the same step entry keeps the new task token (saved above) but doesn't send again.
  if (!(await claimOnce(`journey#${leadId}#${phase}#${stepKey ?? attempt}`))) {
    await logActivity({ leadId, kind: 'note', summary: `Step ${phase} retried; outreach was already sent` });
    return;
  }
  lead = await updateLead(leadId, { [`phaseAttempts.${phase}`]: attempt + 1 });

  if (attempt === 0) {
    await logActivity({ leadId, kind: 'note', summary: `Started step: ${phase}` });
    const sent = await sendOutreach(lead, phaseIntro({ cfg, lead }, phase), `Step ${phase}`);
    // The call asks the planning questions out loud. Text them only if no call could be placed.
    if (phase === 'earnest_money' && (sent.call === 'skipped' || sent.call === 'failed')) {
      await startFundsConversation(lead, { immediate: false });
    }
  } else {
    await sendOutreach(lead, phaseReminder({ cfg, lead }, phase), `Reminder ${attempt} for ${phase}`);
  }
}

/** The journey can't continue: log it, tell staff, and let the state machine end. */
async function journeyFailed(leadId: string, error: { Error?: string; Cause?: string } | undefined): Promise<void> {
  const details = [
    `Error: ${error?.Error ?? 'unknown'}`,
    ...(error?.Cause ? [`Details: ${error.Cause.slice(0, 500)}`] : []),
    'Automated calls, texts, and emails have stopped for this client. Please follow up and check the logs.',
  ];
  const lead = await getLead(leadId);
  if (!lead) {
    await notifyManagers('Journey stopped with an error', [`Lead ID: ${leadId}`, ...details]);
    return;
  }
  await logActivity({ leadId, kind: 'note', summary: `Journey stopped with an error: ${error?.Error ?? 'unknown'}` });
  const updated = lead.taskToken ? await updateLead(leadId, {}, { remove: ['taskToken'] }) : lead;
  await notifyStaff(updated, 'Journey stopped with an error', details);
}
