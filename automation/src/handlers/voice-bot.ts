import type { LexV2Event, LexV2Result } from 'aws-lambda';
import { getConfig } from '../config';
import { detectOptOut } from '../lib/opt-out';
import { nowIso } from '../lib/time';
import { extractAnswer, respond, stepInfo, type Turn } from '../services/assistant';
import { sendSms } from '../services/channels';
import { parseAmount, parseYesNo, startFundsConversation } from '../services/conversation';
import { getLead, logActivity, updateLead } from '../services/db';
import { updateFunds } from '../services/journey';
import { notifyStaff } from '../services/notify';
import type { Funds, Lead } from '../types';

/** The five upfront-cost planning questions, worded for speech. */
export const VOICE_FUNDS_QUESTIONS: { ask: string; kind: 'yes_no' | 'amount' | 'date' }[] = [
  { ask: 'Have you already saved money for these upfront costs?', kind: 'yes_no' },
  { ask: 'Approximately how much do you currently have available?', kind: 'amount' },
  { ask: 'When do you expect to have the remaining funds available?', kind: 'date' },
  { ask: 'Would you like assistance creating a savings plan?', kind: 'yes_no' },
  { ask: 'Would information about down payment or closing cost assistance programs be helpful?', kind: 'yes_no' },
];

interface Session {
  leadId?: string;
  /** Index of the funds question being asked, while the questions are in progress. */
  fundsStep?: string;
  history?: string;
  /** The script Connect read when the call connected. */
  opening?: string;
}

const MAX_HISTORY = 8;

/**
 * Lex V2 code hook for the AI phone assistant. Connect reads the call script, then every caller
 * utterance arrives here. Claude decides the reply, including when to bring in a person.
 */
export async function handler(event: LexV2Event): Promise<LexV2Result> {
  const session = (event.sessionState.sessionAttributes ?? {}) as Session;
  const utterance = (event.inputTranscript ?? '').trim();
  const lead = session.leadId ? await getLead(session.leadId) : undefined;
  if (!lead) {
    return close(event, session, `Thank you for calling ${getConfig().brandName}. A member of our team will follow up with you. Goodbye.`);
  }
  await noteCallerSpoke(lead, utterance);

  // A clear "stop calling me" is honored right away, without the AI. "Don't text me" or "remove me" also stops texts.
  const optOut = detectOptOut(utterance);
  if (optOut) {
    await updateLead(lead.leadId, {
      callOptOut: true,
      ...(optOut !== 'calls' ? { smsOptOut: true } : {}),
      ...(optOut === 'all' ? { emailOptOut: true } : {}),
    }, { remove: ['conversation'] });
    await logActivity({ leadId: lead.leadId, kind: 'note', channel: 'call', summary: `Asked to stop ${{ calls: 'calls', texts: 'calls and texts', all: 'all contact' }[optOut]} on a call` });
    delete session.fundsStep;
    return close(event, session, `Understood, ${lead.firstName}. We won't ${optOut === 'calls' ? 'call you again' : 'call or text you again'}. Thank you, and goodbye.`, lead);
  }

  // Lex's TalkToPerson intent is only a hint: "text me the link" can match it, so Claude makes the call.
  if (session.fundsStep !== undefined) return answerFundsQuestion(event, session, lead, utterance);

  // Start from the call script so Claude knows what the client is answering (e.g. "May I ask a few questions?").
  const history: Turn[] = session.history ? JSON.parse(session.history) : session.opening ? [{ role: 'assistant', text: session.opening }] : [];
  const cfg = getConfig();
  const reply = await respond(cfg, lead, history, utterance || '(silence)');
  const nextHistory = [...history, { role: 'caller' as const, text: utterance }, { role: 'assistant' as const, text: reply.say }].slice(-MAX_HISTORY);
  session.history = JSON.stringify(nextHistory);
  delete session.opening;

  switch (reply.action) {
    case 'text_link': {
      const { label, link } = stepInfo(cfg, lead.phase);
      if (link) await sendSms(lead, `Here is your link for ${label.replace(/ \(step \d of 5\)/, '')}: ${link}`, 'Link requested on call', { immediate: true });
      return elicit(event, session, link ? reply.say : `That link isn't ready yet. We'll text it to you as soon as it is. Is there anything else I can help with?`, lead);
    }
    case 'start_questions':
      session.fundsStep = '0';
      return elicit(event, session, `${reply.say} ${VOICE_FUNDS_QUESTIONS[0].ask}`, lead);
    case 'follow_up':
      await notifyStaff(lead, 'Question to answer by text', [`Caller asked: "${utterance}"`, 'Please text them the answer. No call needed.']);
      return elicit(event, session, reply.say, lead);
    case 'stop_calls':
      await updateLead(lead.leadId, { callOptOut: true });
      await logActivity({ leadId: lead.leadId, kind: 'note', channel: 'call', summary: 'Asked not to be called again' });
      return close(event, session, reply.say, lead);
    case 'human':
      return handOff(event, session, lead, utterance, reply.say);
    case 'end':
      // Someone who declines the planning questions by voice gets them by text instead.
      if (lead.phase === 'earnest_money' && !lead.funds.updatedAt) await startFundsConversation(lead, { immediate: true });
      return close(event, session, reply.say, lead);
    default:
      return elicit(event, session, reply.say, lead);
  }
}

async function answerFundsQuestion(event: LexV2Event, session: Session, lead: Lead, utterance: string): Promise<LexV2Result> {
  const cfg = getConfig();
  const step = Number(session.fundsStep);
  const q = VOICE_FUNDS_QUESTIONS[step];

  let value: boolean | number | string | undefined =
    q.kind === 'yes_no' ? parseYesNo(utterance) : q.kind === 'amount' ? parseAmount(utterance) : utterance || undefined;
  if (value === undefined || q.kind === 'date') value = (await extractAnswer(q.kind, q.ask, utterance)) ?? value;
  if (value === undefined) return elicit(event, session, `Sorry, I didn't catch that. ${q.ask}`, lead);

  const changes: Funds = {};
  let next = step + 1;
  if (step === 0) {
    changes.hasSaved = value as boolean;
    // Nothing saved yet: skip "how much".
    if (value === false) { changes.totalFundsAvailable = 0; next = 2; }
  } else if (step === 1) {
    changes.totalFundsAvailable = value as number;
    // Already has enough: skip "when will you have the rest".
    if ((value as number) >= cfg.rules.upfrontCostsTarget) next = 3;
  } else if (step === 2) changes.estimatedDateFundsAvailable = String(value);
  else if (step === 3) changes.savingsPlanRequested = value as boolean;
  else changes.assistanceInfoRequested = value as boolean;

  const updated = await updateFunds(lead.leadId, changes, 'client by phone');

  if (next < VOICE_FUNDS_QUESTIONS.length) {
    session.fundsStep = String(next);
    return elicit(event, session, `Thank you. ${VOICE_FUNDS_QUESTIONS[next].ask}`, updated);
  }
  delete session.fundsStep;
  const ready = (updated.funds.totalFundsAvailable ?? 0) >= cfg.rules.upfrontCostsTarget;
  const wrap = ready
    ? `Thank you, ${lead.firstName}. It sounds like you're ready for these upfront costs. ${lead.assignedTo.name} will be in touch about next steps.`
    : `Thank you, ${lead.firstName}. I've noted everything, and we'll check in every couple of weeks. You can text UPDATE anytime your savings change.`;
  return elicit(event, session, `${wrap} Is there anything else I can help with?`, updated);
}

async function handOff(event: LexV2Event, session: Session, lead: Lead, utterance: string, say?: string): Promise<LexV2Result> {
  await notifyStaff(lead, 'Requests assistance (on an AI call)', [`Caller said: "${utterance}"`, 'Please call them back.']);
  return close(event, session, say ?? `Of course. ${lead.assignedTo.name} will reach out to you shortly. Thank you, and goodbye.`, lead);
}

async function noteCallerSpoke(lead: Lead, utterance: string): Promise<void> {
  const now = nowIso();
  await updateLead(lead.leadId, { lastResponseAt: now, ...(lead.firstResponseAt ? {} : { firstResponseAt: now }) });
  if (utterance) await logActivity({ leadId: lead.leadId, kind: 'received', channel: 'call', summary: `Caller: ${utterance}` });
}

function elicit(event: LexV2Event, session: Session, message: string, lead?: Lead): Promise<LexV2Result> {
  return respondWith(event, session, message, 'ElicitIntent', lead);
}

function close(event: LexV2Event, session: Session, message: string, lead?: Lead): Promise<LexV2Result> {
  return respondWith(event, session, message, 'Close', lead);
}

async function respondWith(event: LexV2Event, session: Session, message: string, type: 'ElicitIntent' | 'Close', lead?: Lead): Promise<LexV2Result> {
  if (lead) await logActivity({ leadId: lead.leadId, kind: 'sent', channel: 'call', summary: `Assistant: ${message}` });
  return {
    sessionState: {
      sessionAttributes: session as Record<string, string>,
      dialogAction: { type },
      ...(type === 'Close' ? { intent: { ...event.sessionState.intent, state: 'Fulfilled' as const } } : {}),
    },
    messages: [{ contentType: 'PlainText', content: message }],
  };
}
