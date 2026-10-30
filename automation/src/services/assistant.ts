import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AppConfig } from '../config';
import type { PhaseKey } from '../phases';
import type { Lead } from '../types';

/** Claude on Amazon Bedrock. Haiku keeps phone replies fast. */
// Haiku 4.5 is the newest Claude model enabled for this account; it answers in about half a second.
const MODEL_ID = process.env.ASSISTANT_MODEL_ID ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const bedrock = new BedrockRuntimeClient({});

export type AssistantAction = 'continue' | 'text_link' | 'start_questions' | 'follow_up' | 'stop_calls' | 'human' | 'end';
export interface AssistantReply { action: AssistantAction; say: string }
export interface Turn { role: 'assistant' | 'caller'; text: string }
export type Channel = 'call' | 'sms';

/** What the client is being asked to do at each step, and the link for it. */
export function stepInfo(cfg: AppConfig, phase: string | undefined): { label: string; link?: string } {
  const { links } = cfg;
  const steps: Partial<Record<PhaseKey | 'welcome' | 'mortgage_ready', { label: string; link?: string }>> = {
    welcome: { label: 'getting started with the program' },
    smart_credit: { label: 'activating Smart Credit Monitoring (step 1 of 5)', link: links.smartCredit },
    loan_application: { label: 'completing the online mortgage application (step 2 of 5)', link: links.loanApplication },
    land_trust: { label: 'completing the Land Trust application (step 3 of 5)', link: links.landTrust },
    workshop_registration: { label: 'registering for the Homeownership Workshop (step 4 of 5)', link: links.workshop },
    workshop_attendance: { label: 'attending the Homeownership Workshop they registered for' },
    counseling_scheduling: { label: 'scheduling a one-on-one counseling session (step 5 of 5)', link: links.counselingCalendar },
    counseling_completion: { label: 'attending their counseling session' },
    earnest_money: { label: 'planning for upfront costs: earnest money, appraisal, and home inspection' },
    mortgage_ready: { label: 'getting ready to purchase a home' },
  };
  const step = steps[(phase ?? 'welcome') as keyof typeof steps] ?? { label: 'their homeownership plan' };
  // Placeholder links in config.json ("TODO: …") are treated as missing.
  return step.link && /^https?:\/\//.test(step.link) ? step : { label: step.label };
}

function systemPrompt(cfg: AppConfig, lead: Lead, channel: Channel, opening?: string): string {
  const step = stepInfo(cfg, lead.phase);
  const sms = channel === 'sms';
  return `You are the virtual homeownership assistant for ${cfg.brandName}, a Maryland real estate company, ${sms
    ? 'replying to a client by TEXT MESSAGE. Keep each reply under 300 characters. No emoji, no markdown.'
    : 'speaking with a client on a PHONE CALL. Your words are read aloud by text-to-speech.'}

The client:
- First name: ${lead.firstName}
- Current step: ${step.label}
- Their coordinator: ${lead.assignedTo.name}
- Link for the current step: ${step.link ? 'available to text' : 'not available yet (do not offer to text it; it will be texted to them as soon as it is ready)'}
${opening ? `
You opened this ${sms ? 'conversation' : 'call'} by saying: "${opening}"
The client's first reply answers that.
` : ''}
The program, in order: 1) activate Smart Credit Monitoring, 2) complete the online mortgage application, 3) complete the Land Trust application, 4) attend the Homeownership Workshop (required), 5) meet one-on-one with a Certified Homeownership Counselor. Then the client plans for upfront costs (earnest money deposit, home inspection, appraisal: generally around $${cfg.rules.upfrontCostsTarget.toLocaleString('en-US')} combined, though it varies by property, market, and lender) and becomes mortgage-ready.

How to speak:
- Warm, encouraging, plain English, like a personal homeownership coach. One to three short sentences.
${sms ? '- Do not type web addresses yourself; choose "text_link" and the link is added to your reply.' : '- Never read web addresses aloud. Offer to text links instead.'}
- Do not give legal, tax, or investment advice. Never promise or predict loan approval, rates, credit outcomes, or timelines (never say a client will be ready by a date). For those, use "follow_up".
- When something needs staff, say "our team" (not a name or pronoun) and never say when it will happen ("soon", "right away", "shortly").
- You ARE the client's guide through the program. Help them yourself; a call from a person is the absolute last resort.
- If you do not know a specific fact (costs, dates, addresses, details not given here), never guess and never invent a process: use "follow_up".

Respond with ONLY a JSON object: {"action": "...", "say": "..."}
- "continue": you answered or responded.${sms ? '' : ' End "say" by asking if there is anything else you can help with.'}
- "text_link": the client wants the link for their current step and it is available. "say" ${sms ? 'introduces the link (it is appended after your words)' : 'confirms you are sending it by text'}.
- "start_questions": ONLY when the current step is planning for upfront costs and the client agrees (even just "yes" or "go ahead") to answer a few planning questions. Choose this right away; do not explain the costs first. "say" is a brief thank-you (the questions are asked separately).
- "follow_up": the client asked something you cannot answer from what you know. "say" tells them the team will text them the answer${sms ? '' : ', then asks if there is anything else'}. Staff are asked to reply by text; this is not a phone call.
- "stop_calls": the client asks you to stop calling them (or to take them off the call list). "say" confirms you will not call again${sms ? '' : ' and says goodbye'}.
- "human": LAST RESORT ONLY. If the client asks for a person, first ask what they need and try to help with "continue". Use "human" only if they still insist after you offered to help, report a complaint or emergency, or need a decision only staff can make. "say" tells them ${lead.assignedTo.name} will reach out${sms ? '' : ' and says goodbye'}.
- "end": the client is finished, declines, or says goodbye. "say" is a warm goodbye.
${sms ? '' : '"human", "stop_calls", and "end" hang up after "say", so their "say" must never ask a question. '}If the client asks for a link that is not available yet, use "continue": say it will be texted to them as soon as it is ready${sms ? '' : ', then ask if there is anything else'}.`;
}

export function parseReply(text: string): AssistantReply | undefined {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return undefined;
  try {
    const obj = JSON.parse(match[0]) as Partial<AssistantReply>;
    const actions: AssistantAction[] = ['continue', 'text_link', 'start_questions', 'follow_up', 'stop_calls', 'human', 'end'];
    if (!obj.action || !actions.includes(obj.action) || typeof obj.say !== 'string' || !obj.say.trim()) return undefined;
    return { action: obj.action, say: obj.say.trim() };
  } catch {
    return undefined;
  }
}

/** Decide what to say next on a call or in a text conversation. Falls back to a safe reply if the model is unavailable. */
export async function respond(cfg: AppConfig, lead: Lead, history: Turn[], utterance: string, channel: Channel = 'call'): Promise<AssistantReply> {
  const messages = [
    ...history.map((t) => ({ role: t.role === 'caller' ? 'user' as const : 'assistant' as const, content: [{ text: t.text }] })),
    { role: 'user' as const, content: [{ text: utterance }] },
  ];
  // Bedrock requires the conversation to start with the user, so leading assistant turns (the call script) go in the system prompt.
  const opening: string[] = [];
  while (messages.length && messages[0].role !== 'user') opening.push(messages.shift()!.content[0].text);
  try {
    const res = await bedrock.send(new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: systemPrompt(cfg, lead, channel, opening.join(' ') || undefined) }],
      // Starting Claude's reply with "{" keeps it in the JSON format.
      messages: [...messages, { role: 'assistant' as const, content: [{ text: '{' }] }],
      inferenceConfig: { maxTokens: 300, temperature: 0.3 },
    }));
    const text = `{${res.output?.message?.content?.map((c) => c.text ?? '').join('') ?? ''}`;
    const reply = parseReply(text);
    if (reply) return reply;
    console.warn('Unparseable assistant reply', text);
  } catch (err) {
    console.error('Assistant call failed', err);
  }
  return {
    action: 'human',
    say: channel === 'sms'
      ? `Thanks, ${lead.firstName}. We want to make sure you get the right answer, so ${lead.assignedTo.name} will follow up.`
      : `I'm sorry, I want to make sure you get the right answer. ${lead.assignedTo.name} will reach out to you shortly. Thank you, and goodbye.`,
  };
}

/** Pull a structured answer out of a spoken reply when simple rules can't. */
export async function extractAnswer(kind: 'yes_no' | 'amount' | 'date', question: string, utterance: string): Promise<boolean | number | string | undefined> {
  const shape = kind === 'yes_no' ? 'true or false' : kind === 'amount' ? 'a number of US dollars' : 'a short description of when, e.g. "next month" or "June 15"';
  try {
    const res = await bedrock.send(new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: `Extract the answer to a question from a caller's spoken reply. Respond with ONLY JSON: {"value": <${shape}>} or {"value": null} if the reply does not answer the question.` }],
      messages: [{ role: 'user', content: [{ text: `Question: ${question}\nReply: ${utterance}` }] }],
      inferenceConfig: { maxTokens: 60, temperature: 0 },
    }));
    const text = res.output?.message?.content?.map((c) => c.text ?? '').join('') ?? '';
    const value = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}').value;
    if (kind === 'yes_no' && typeof value === 'boolean') return value;
    if (kind === 'amount' && typeof value === 'number' && value >= 0) return Math.round(value);
    if (kind === 'date' && typeof value === 'string' && value.trim()) return value.trim().slice(0, 100);
  } catch (err) {
    console.error('Answer extraction failed', err);
  }
  return undefined;
}
