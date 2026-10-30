import { getConfig } from '../config';
import { mortgageReady, phaseIntro, phaseReminder, welcome } from '../content/messages';
import { nowIso } from '../lib/time';
import { phaseFor, type PhaseKey } from '../phases';
import { sendOutreach } from '../services/channels';
import { startFundsConversation } from '../services/conversation';
import { logActivity, mustGetLead, updateLead } from '../services/db';
import { advance } from '../services/journey';
import { notifyStaff } from '../services/notify';

export type JourneyEvent =
  | { action: 'welcome'; leadId: string }
  | { action: 'phase'; leadId: string; phase: PhaseKey; taskToken: string }
  | { action: 'mortgageReady'; leadId: string };

/** Invoked by the Home Buyer Journey state machine for each step. */
export async function handler(event: JourneyEvent): Promise<void> {
  const cfg = getConfig();
  const lead = await mustGetLead(event.leadId);

  switch (event.action) {
    case 'welcome':
      await sendOutreach(lead, welcome({ cfg, lead }), 'Welcome');
      return;

    case 'phase':
      return runPhase(event.leadId, event.phase, event.taskToken);

    case 'mortgageReady': {
      const updated = await updateLead(lead.leadId, {
        status: 'mortgage_ready', phase: 'mortgage_ready', mortgageReadyAt: nowIso(),
      }, { remove: ['taskToken'] });
      await sendOutreach(updated, mortgageReady({ cfg, lead: updated }), 'Mortgage ready');
      await notifyStaff(updated, 'Client is mortgage-ready');
      return;
    }
  }
}

/**
 * Called when a step starts, and again each time its reminder timer runs out. The state machine waits
 * until recordMilestone() returns the task token, so this function only sends messages and saves the token.
 */
async function runPhase(leadId: string, phase: PhaseKey, taskToken: string): Promise<void> {
  const cfg = getConfig();
  const def = phaseFor(phase);
  const before = await mustGetLead(leadId);
  const attempt = before.phaseAttempts[phase] ?? 0;

  let lead;
  try {
    // The condition closes the race with a milestone recorded while this runs.
    lead = await updateLead(leadId, {
      phase, taskToken, [`phaseAttempts.${phase}`]: attempt + 1,
    }, { condition: `attribute_not_exists(milestones.${def.completedBy})` });
  } catch (err) {
    if ((err as Error).name !== 'ConditionalCheckFailedException') throw err;
    // Already done (reported early): skip straight to the next step.
    await updateLead(leadId, { phase });
    await logActivity({ leadId, kind: 'note', summary: `Step ${phase} already complete, skipping` });
    await advance(taskToken);
    return;
  }

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
