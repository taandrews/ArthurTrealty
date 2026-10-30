import { getConfig } from '../config';
import { workshopReminder } from '../content/messages';
import { nurtureEmail } from '../content/nurture';
import { daysBetween, nowIso } from '../lib/time';
import { placeCall, sendEmail, sendOutreach, sendSms } from '../services/channels';
import { getLead, scanLeads, updateLead } from '../services/db';
import { notifyStaff } from '../services/notify';
import type { JobPayload } from '../services/scheduler';
import type { Lead } from '../types';

const inProgram = (l: Lead) => l.status === 'active' || l.status === 'mortgage_ready';

/** Scheduled work: deferred calls/texts, workshop reminders, the weekly nurture emails, and inactivity alerts. */
export async function handler(event: JobPayload): Promise<void> {
  switch (event.action) {
    case 'deferredSend': {
      const lead = await getLead(event.leadId);
      if (!lead || !inProgram(lead)) return;
      if (event.channel === 'sms') await sendSms(lead, event.message, 'Deferred text');
      else await placeCall(lead, event.message, 'Deferred call');
      return;
    }

    case 'workshopReminder': {
      const lead = await getLead(event.leadId);
      // A newer registration supersedes reminders for the old date.
      if (!lead || lead.status !== 'active' || lead.milestones.workshop_attended) return;
      if (lead.workshop?.version !== event.version) return;
      await sendOutreach(lead, workshopReminder({ cfg: getConfig(), lead }, event.label), `Workshop reminder (${event.label})`);
      return;
    }

    case 'nurture':
      return sendNurture();

    case 'inactivity':
      return flagInactive();
  }
}

async function sendNurture(): Promise<void> {
  const { rules } = getConfig();
  for (const lead of await scanLeads()) {
    if (!inProgram(lead) || !lead.email || lead.emailOptOut) continue;
    if (daysBetween(lead.nurtureLastSentAt ?? lead.createdAt) < rules.nurtureEveryDays) continue;
    const result = await sendEmail(lead, nurtureEmail(lead.nurtureIndex, lead.firstName), 'Weekly education');
    if (result === 'sent') {
      await updateLead(lead.leadId, { nurtureIndex: lead.nurtureIndex + 1, nurtureLastSentAt: nowIso() });
    }
  }
}

async function flagInactive(): Promise<void> {
  const { rules } = getConfig();
  for (const lead of await scanLeads()) {
    if (!inProgram(lead)) continue;
    const lastActivity = lead.lastResponseAt ?? lead.createdAt;
    if (daysBetween(lastActivity) < rules.inactivityAlertDays) continue;
    // One alert per quiet spell: re-alert only after the client responds and goes quiet again.
    if (lead.inactiveNotifiedAt && lead.inactiveNotifiedAt > lastActivity) continue;
    await notifyStaff(lead, `No response in ${rules.inactivityAlertDays} days`, [
      `Last response: ${lead.lastResponseAt ?? 'never'}`,
    ]);
    await updateLead(lead.leadId, { inactiveNotifiedAt: nowIso() });
  }
}
