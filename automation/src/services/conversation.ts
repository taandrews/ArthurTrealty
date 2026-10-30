import { getConfig } from '../config';
import { FUNDS_QUESTIONS, fundsConversationDone } from '../content/messages';
import type { Funds, Lead } from '../types';
import { sendSms } from './channels';
import { updateLead } from './db';
import { updateFunds } from './journey';

export function parseYesNo(text: string): boolean | undefined {
  const t = text.trim().toLowerCase();
  if (/^(y|yes|yeah|yep|yup|sure|ok|okay|i have|i did)\b/.test(t)) return true;
  if (/^(n|no|nope|not yet|not really|i haven'?t|none)\b/.test(t)) return false;
  return undefined;
}

/** "$1,200", "1200", "about 1.5k", "nothing" → dollars. */
export function parseAmount(text: string): number | undefined {
  const t = text.trim().toLowerCase();
  if (/^(none|nothing|zero|no)\b/.test(t)) return 0;
  const m = t.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|thousand)?/);
  if (!m) return undefined;
  const n = parseFloat(m[1]) * (m[2] ? 1000 : 1);
  return Math.round(n);
}

/**
 * Start the earnest-money questions by text. `immediate` is for replies to the client's own text;
 * otherwise the first question waits for contact hours like any other text.
 */
export async function startFundsConversation(lead: Lead, opts: { immediate: boolean }): Promise<void> {
  await updateLead(lead.leadId, { conversation: { kind: 'funds', step: 0 } });
  await sendSms(lead, FUNDS_QUESTIONS[0], 'Funds question 1', opts);
}

/** Handle a reply to the current funds question. A reply that can't be understood gets the question re-asked. */
export async function answerFundsQuestion(lead: Lead, text: string): Promise<void> {
  const step = lead.conversation?.step ?? 0;
  const changes: Funds = {};
  let understood = true;

  switch (step) {
    case 0: {
      const v = parseYesNo(text);
      if (v === undefined) understood = false;
      else changes.hasSaved = v;
      break;
    }
    case 1: {
      const v = parseAmount(text);
      if (v === undefined) understood = false;
      else changes.totalFundsAvailable = v;
      break;
    }
    case 2:
      changes.estimatedDateFundsAvailable = text.trim().slice(0, 100);
      break;
    case 3: {
      const v = parseYesNo(text);
      if (v === undefined) understood = false;
      else changes.savingsPlanRequested = v;
      break;
    }
    case 4: {
      const v = parseYesNo(text);
      if (v === undefined) understood = false;
      else changes.assistanceInfoRequested = v;
      break;
    }
  }

  if (!understood) {
    await sendSms(lead, `Sorry, I didn't catch that. ${FUNDS_QUESTIONS[step]}`, `Funds question ${step + 1} (repeat)`, { immediate: true });
    return;
  }

  // Someone who hasn't saved anything yet can skip the amount question.
  let next = step + 1;
  if (step === 0 && changes.hasSaved === false) {
    changes.totalFundsAvailable = 0;
    next = 2;
  }
  // Someone who already has enough doesn't need to say when the rest is coming.
  if (step === 1 && (changes.totalFundsAvailable ?? 0) >= getConfig().rules.upfrontCostsTarget) next = 3;

  const updated = await updateFunds(lead.leadId, changes, 'client by text');

  if (next < FUNDS_QUESTIONS.length) {
    await updateLead(lead.leadId, { conversation: { kind: 'funds', step: next } });
    await sendSms(updated, FUNDS_QUESTIONS[next], `Funds question ${next + 1}`, { immediate: true });
  } else {
    await updateLead(lead.leadId, {}, { remove: ['conversation'] });
    const ready = (updated.funds.totalFundsAvailable ?? 0) >= getConfig().rules.upfrontCostsTarget;
    await sendSms(updated, fundsConversationDone(getConfig(), ready), 'Funds questions complete', { immediate: true });
  }
}
