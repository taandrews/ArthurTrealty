import { describe, expect, it } from 'vitest';
import config from '../config.json';
import { parseReply, stepInfo } from '../src/services/assistant';
import { VOICE_FUNDS_QUESTIONS } from '../src/handlers/voice-bot';
import { phaseIntro, welcome } from '../src/content/messages';
import { PHASES } from '../src/phases';
import type { Lead } from '../src/types';

const lead = {
  entity: 'lead', leadId: 'ATR-1', firstName: 'Dana', lastName: 'Smith', phone: '+14105551234', source: 'website',
  status: 'active', createdAt: '2026-10-01T12:00:00Z', assignedTo: { name: 'Arthur', email: '', phone: '' },
  phaseAttempts: {}, milestones: {}, funds: {}, tasks: [], nurtureIndex: 0,
} as Lead;

describe('assistant reply parsing', () => {
  it('accepts a valid action and line to say, even with extra text around the JSON', () => {
    expect(parseReply('Sure! {"action":"text_link","say":"Sending it now."}')).toEqual({ action: 'text_link', say: 'Sending it now.' });
  });
  it('rejects unknown actions, empty speech, and non-JSON', () => {
    expect(parseReply('{"action":"transfer","say":"ok"}')).toBeUndefined();
    expect(parseReply('{"action":"continue","say":"  "}')).toBeUndefined();
    expect(parseReply('I think you should apply.')).toBeUndefined();
  });
});

describe('step info for calls', () => {
  const withLinks = {
    ...config,
    links: { ...config.links, smartCredit: 'https://example.com/credit', counselingCalendar: 'https://example.com/book' },
  };
  it('gives the link for steps that have one, and none for waiting steps', () => {
    expect(stepInfo(withLinks, 'smart_credit').link).toBe('https://example.com/credit');
    expect(stepInfo(withLinks, 'counseling_scheduling').link).toBe('https://example.com/book');
    expect(stepInfo(withLinks, 'earnest_money').link).toBeUndefined();
    expect(stepInfo(withLinks, undefined).label).toContain('getting started');
  });
  it('treats placeholder links as missing', () => {
    expect(stepInfo({ ...config, links: { ...config.links, smartCredit: 'TODO: Smart Credit registration link' } }, 'smart_credit').link).toBeUndefined();
  });
});

describe('call scripts', () => {
  it('every call ends with a question so the caller can respond', () => {
    const calls = [welcome({ cfg: config, lead }).call, ...PHASES.map((p) => phaseIntro({ cfg: config, lead }, p.key).call)].filter(Boolean) as string[];
    expect(calls.length).toBeGreaterThan(5);
    for (const c of calls) expect(c.trim().endsWith('?')).toBe(true);
  });
  it('earnest money call asks permission exactly as the spec says', () => {
    expect(phaseIntro({ cfg: config, lead }, 'earnest_money').call).toContain('May I ask a few questions to help us plan?');
  });
  it('asks the five planning questions by voice, without texting instructions', () => {
    expect(VOICE_FUNDS_QUESTIONS).toHaveLength(5);
    for (const q of VOICE_FUNDS_QUESTIONS) expect(q.ask).not.toMatch(/reply|text/i);
  });
});
