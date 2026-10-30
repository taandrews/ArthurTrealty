import type { SNSEvent } from 'aws-lambda';
import { getConfig } from '../config';
import { toE164 } from '../lib/phone';
import { nowIso } from '../lib/time';
import { sendSms } from '../services/channels';
import { respond, stepInfo, type Turn } from '../services/assistant';
import { answerFundsQuestion, startFundsConversation } from '../services/conversation';
import { findLeadByPhone, listActivity, logActivity, updateLead } from '../services/db';
import { notifyStaff } from '../services/notify';
import type { Lead } from '../types';

/** Shape of a two-way SMS message that AWS End User Messaging publishes to SNS. */
interface InboundSms {
  originationNumber: string;
  destinationNumber: string;
  messageBody: string;
}

const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'];
const START_WORDS = ['START', 'UNSTOP'];

export async function handler(event: SNSEvent): Promise<void> {
  for (const record of event.Records) {
    const msg = JSON.parse(record.Sns.Message) as InboundSms;
    await handleText(msg);
  }
}

async function handleText(msg: InboundSms): Promise<void> {
  const phone = toE164(msg.originationNumber);
  const lead = phone ? await findLeadByPhone(phone) : undefined;
  if (!lead) {
    console.warn('Text from unknown number', msg.originationNumber);
    return;
  }

  const body = msg.messageBody.trim();
  const keyword = body.split(/\s+/)[0]?.toUpperCase() ?? '';
  const now = nowIso();
  await logActivity({ leadId: lead.leadId, kind: 'received', channel: 'sms', summary: body });

  // Carriers and AWS handle STOP/START replies and the opt-out list; we mirror it on the lead.
  if (STOP_WORDS.includes(keyword)) {
    await updateLead(lead.leadId, { smsOptOut: true }, { remove: ['conversation'] });
    return;
  }
  if (lead.smsOptOut && START_WORDS.includes(keyword)) {
    await updateLead(lead.leadId, { smsOptOut: false });
    return;
  }

  const updated = await updateLead(lead.leadId, {
    lastResponseAt: now,
    ...(lead.firstResponseAt ? {} : { firstResponseAt: now }),
  });

  if (keyword === 'HELP') {
    const { brandName } = getConfig();
    await sendSms(updated, `${brandName}: your homeownership assistant. Text your question anytime and we'll help. Msg & data rates may apply. Reply STOP to opt out.`, 'HELP reply', { immediate: true });
    return;
  }
  if (keyword === 'UPDATE') {
    await startFundsConversation(updated, { immediate: true });
    return;
  }
  if (updated.conversation?.kind === 'funds') {
    await answerFundsQuestion(updated, body);
    return;
  }

  await replyWithAssistant(updated, body);
}

/** The AI assistant answers free-form texts. Staff are alerted only when it hands off as a last resort. */
async function replyWithAssistant(lead: Lead, body: string): Promise<void> {
  const cfg = getConfig();
  const history = await recentTexts(lead.leadId);
  const reply = await respond(cfg, lead, history, body, 'sms');

  if (reply.action === 'start_questions') {
    await sendSms(lead, reply.say, 'Assistant reply', { immediate: true });
    await startFundsConversation(lead, { immediate: true });
    return;
  }
  const { link } = stepInfo(cfg, lead.phase);
  const text = reply.action === 'text_link' && link ? `${reply.say} ${link}` : reply.say;
  await sendSms(lead, text, 'Assistant reply', { immediate: true });
  if (reply.action === 'follow_up') await notifyStaff(lead, 'Question to answer by text', [`Client texted: "${body}"`, 'Please text them the answer. No call needed.']);
  if (reply.action === 'human') await notifyStaff(lead, 'Requests assistance (by text, after the assistant tried to help)', [`Client texted: "${body}"`]);
}

/** The last few texts in this conversation, oldest first, without the message being answered. */
async function recentTexts(leadId: string): Promise<Turn[]> {
  const events = (await listActivity(leadId)).filter((e) => e.channel === 'sms').slice(1, 9).reverse();
  return events.map((e) => e.kind === 'received'
    ? { role: 'caller' as const, text: e.summary }
    : { role: 'assistant' as const, text: e.summary.replace(/^[^:]*: /, '') });
}
