/** Which outreach a client asked to stop, in their own words. */
export type OptOut = 'calls' | 'texts' | 'all';

const CALLS = /\b(stop|quit) calling\b|\bdon'?t call me\b|\bdo not call\b/i;
const TEXTS = /\b(stop|quit) texting\b|\bdon'?t text me\b|\bdo not text\b/i;
const ALL = /\b(stop|quit) contacting\b|\bdon'?t contact me\b|\bdo not contact\b|\bremove me\b|\btake me off\b|\bunsubscribe\b/i;

/**
 * Clear opt-out requests are honored without asking the AI, so a model outage or a misread can't
 * keep calling or texting someone who said stop. "Stop calling and texting" is both.
 */
export function detectOptOut(text: string): OptOut | undefined {
  const t = text.replace(/[‘’]/g, "'");
  if (ALL.test(t)) return 'all';
  const calls = CALLS.test(t);
  const texts = TEXTS.test(t) || /\b(stop|quit) calling (and|or) texting\b/i.test(t);
  if (calls && texts) return 'all';
  if (calls) return 'calls';
  if (texts) return 'texts';
  return undefined;
}
