import type { SNSEvent } from 'aws-lambda';
import { env, getConfig } from '../config';
import { detectOptOut, type OptOut } from '../lib/opt-out';
import { toE164 } from '../lib/phone';
import { localDate, nowIso } from '../lib/time';
import { sendSms } from '../services/channels';
import { respond, stepInfo, type Turn } from '../services/assistant';
import { answerFundsQuestion, startFundsConversation } from '../services/conversation';
import {
  claimOnce, findLeadByPhone, incrementCounter, listActivity, logActivity, releaseOnce, updateLead,
} from '../services/db';
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
/** AI replies per client per day (Eastern). Past this, texts are logged and staff are told once. */
export const MAX_ASSISTANT_REPLIES_PER_DAY = 20;

export async function handler(event: SNSEvent): Promise<void> {
  for (const record of event.Records) {
    // SNS can deliver a message more than once; handle each one once. If handling fails, release it so the retry can.
    const key = `sms#${record.Sns.MessageId}`;
    if (!(await claimOnce(key))) continue;
    try {
      await handleText(JSON.parse(record.Sns.Message) as InboundSms);
    } catch (err) {
      await releaseOnce(key).catch((e) => console.error('Releasing marker failed', e));
      throw err;
    }
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
  // Revoking consent one way revokes it for calls too (FCC 2024 rule, read conservatively); START restores both.
  if (STOP_WORDS.includes(keyword)) {
    await updateLead(lead.leadId, { smsOptOut: true, callOptOut: true }, { remove: ['conversation'] });
    await logActivity({ leadId: lead.leadId, kind: 'note', summary: `Opted out of texts and calls (${keyword})` });
    return;
  }
  if ((lead.smsOptOut || lead.callOptOut) && START_WORDS.includes(keyword)) {
    await updateLead(lead.leadId, { smsOptOut: false, callOptOut: false });
    await logActivity({ leadId: lead.leadId, kind: 'note', summary: `Opted back in to texts and calls (${keyword})` });
    return;
  }
  // "Please stop calling me" and the like are honored directly, never left to the AI.
  const optOut = detectOptOut(body);
  if (optOut) {
    await honorOptOut(lead, optOut);
    return;
  }

  const updated = await updateLead(lead.leadId, {
    lastResponseAt: now,
    ...(lead.firstResponseAt ? {} : { firstResponseAt: now }),
  });

  if (keyword === 'HELP') {
    const { brandName } = getConfig();
    await sendSms(updated, `${brandName}: your homeownership assistant. Text your question anytime and we'll help${env.siteUrl ? `, or message us at ${env.siteUrl}/contact/` : ''}. Msg & data rates may apply. Reply STOP to opt out.`, 'HELP reply', { immediate: true });
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

/** Free-text opt-outs aren't carrier keywords, so the lead flags are what stop us. One short confirmation goes out. */
async function honorOptOut(lead: Lead, optOut: OptOut): Promise<void> {
  const { brandName } = getConfig();
  const calls = optOut !== 'texts';
  const texts = optOut !== 'calls';
  const confirmation = optOut === 'calls'
    ? `${brandName}: Got it, we won't call you anymore. You'll still get texts; reply STOP to end those too.`
    : `${brandName}: You're unsubscribed${calls ? ' from texts and calls' : ' from texts'}. Reply START to resubscribe.`;
  // Sent before the flags are saved, so the text opt-out doesn't block its own confirmation.
  await sendSms(lead, confirmation, 'Opt-out confirmation', { immediate: true });
  await updateLead(lead.leadId, {
    ...(calls ? { callOptOut: true } : {}),
    ...(texts ? { smsOptOut: true } : {}),
    ...(optOut === 'all' ? { emailOptOut: true } : {}),
  }, { remove: ['conversation'] });
  const what = optOut === 'all' ? 'all contact' : optOut;
  await logActivity({ leadId: lead.leadId, kind: 'note', summary: `Asked to stop ${what} by text` });
}

/** The AI assistant answers free-form texts. Staff are alerted only when it hands off as a last resort. */
async function replyWithAssistant(lead: Lead, body: string): Promise<void> {
  const cfg = getConfig();
  // A cap on AI replies keeps a runaway conversation (or an auto-responder) from running up Bedrock and SMS costs.
  const today = localDate(new Date(), cfg.timeZone);
  const count = await incrementCounter(`sms-replies#${lead.leadId}#${today}`);
  if (count > MAX_ASSISTANT_REPLIES_PER_DAY) {
    if (count === MAX_ASSISTANT_REPLIES_PER_DAY + 1) {
      await notifyStaff(lead, 'Daily text reply limit reached', [
        `The assistant has replied ${MAX_ASSISTANT_REPLIES_PER_DAY} times today and will not reply again until tomorrow.`,
        `Latest text: "${body}"`,
      ]);
    }
    await logActivity({ leadId: lead.leadId, kind: 'skipped', summary: 'Assistant text reply: daily limit reached' });
    return;
  }
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
  if (reply.action === 'stop_calls') await updateLead(lead.leadId, { callOptOut: true });
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
