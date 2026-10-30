import { describe, expect, it } from 'vitest';
import { toE164 } from '../src/lib/phone';
import { nextContactWindow } from '../src/lib/time';
import { parseAmount, parseYesNo } from '../src/services/conversation';
import { computeKpis } from '../src/services/kpis';
import { PHASES, phaseCompletedBy } from '../src/phases';
import type { Lead } from '../src/types';

describe('toE164', () => {
  it('normalizes US numbers', () => {
    expect(toE164('(410) 555-1234')).toBe('+14105551234');
    expect(toE164('1-410-555-1234')).toBe('+14105551234');
    expect(toE164('+1 410 555 1234')).toBe('+14105551234');
  });
  it('rejects anything else', () => {
    expect(toE164('555-1234')).toBeUndefined();
    expect(toE164('')).toBeUndefined();
    expect(toE164(undefined)).toBeUndefined();
  });
});

describe('contact hours', () => {
  const tz = 'America/New_York';
  it('allows sending inside the window', () => {
    expect(nextContactWindow(new Date('2026-10-29T15:00:00Z'), tz, 9, 20)).toBeUndefined(); // 11am EDT
  });
  it('defers late-night sends to 9am local the next morning', () => {
    const at = nextContactWindow(new Date('2026-10-30T02:30:00Z'), tz, 9, 20); // 10:30pm EDT
    expect(at?.toISOString()).toBe('2026-10-30T13:00:00.000Z'); // 9am EDT
  });
  it('defers early-morning sends to 9am the same day, across DST', () => {
    const at = nextContactWindow(new Date('2026-11-02T11:00:00Z'), tz, 9, 20); // 6am EST
    expect(at?.toISOString()).toBe('2026-11-02T14:00:00.000Z'); // 9am EST
  });
});

describe('SMS answer parsing', () => {
  it('reads yes/no', () => {
    expect(parseYesNo('Yes!')).toBe(true);
    expect(parseYesNo('yeah I have')).toBe(true);
    expect(parseYesNo('No')).toBe(false);
    expect(parseYesNo('not yet')).toBe(false);
    expect(parseYesNo('maybe')).toBeUndefined();
  });
  it('reads dollar amounts', () => {
    expect(parseAmount('$1,200')).toBe(1200);
    expect(parseAmount('about 800 dollars')).toBe(800);
    expect(parseAmount('1.5k')).toBe(1500);
    expect(parseAmount('nothing yet')).toBe(0);
    expect(parseAmount('not sure')).toBeUndefined();
  });
});

describe('phases', () => {
  it('every milestone completes at most one phase, in program order', () => {
    expect(PHASES.map((p) => p.key)).toEqual([
      'smart_credit', 'loan_application', 'land_trust', 'workshop_registration',
      'workshop_attendance', 'counseling_scheduling', 'counseling_completion', 'earnest_money',
    ]);
    expect(phaseCompletedBy('funds_ready')?.key).toBe('earnest_money');
    expect(phaseCompletedBy('purchased')).toBeUndefined();
  });
});

describe('computeKpis', () => {
  const base = {
    entity: 'lead', lastName: '', source: 'website', status: 'active',
    assignedTo: { name: 'A', email: '', phone: '' }, phaseAttempts: {}, funds: {}, tasks: [], nurtureIndex: 0,
  } as const;
  const leads = [
    { ...base, leadId: '1', firstName: 'A', createdAt: '2026-10-01T00:00:00Z', contactedAt: 'x', firstResponseAt: 'x',
      milestones: { smart_credit_activated: 'x', funds_ready: 'x' }, mortgageReadyAt: '2026-10-31T00:00:00Z' },
    { ...base, leadId: '2', firstName: 'B', createdAt: '2026-10-10T00:00:00Z', contactedAt: 'x', milestones: {} },
    { ...base, leadId: '3', firstName: 'C', createdAt: '2026-09-01T00:00:00Z', milestones: {}, source: 'facebook' },
    { ...base, leadId: '4', firstName: 'D', createdAt: '2026-10-20T00:00:00Z', milestones: { purchased: 'x' } },
  ] as unknown as Lead[];

  it('computes funnel rates over all leads', () => {
    const k = computeKpis(leads);
    expect(k.newLeads).toBe(4);
    expect(k.contactRate).toBe(0.5);
    expect(k.responseRate).toBe(0.25);
    expect(k.smartCreditCompletionRate).toBe(0.25);
    expect(k.mortgageReadyRate).toBe(0.25);
    expect(k.averageDaysToMortgageReady).toBe(30);
    expect(k.homePurchaseConversionRate).toBe(0.25);
    expect(k.bySource).toEqual({ website: 3, facebook: 1 });
  });

  it('filters by start date', () => {
    expect(computeKpis(leads, '2026-10-01T00:00:00Z').newLeads).toBe(3);
  });
});

describe('cleanName', () => {
  it('keeps real names and strips anything that could carry a link or message', async () => {
    const { cleanName } = await import('../src/services/journey');
    expect(cleanName("  Mary-Jane O'Neil ")).toBe("Mary-Jane O'Neil");
    expect(cleanName('José')).toBe('José');
    expect(cleanName('Win $500 at evil.com/x')).toBe('Win at evilcomx');
    expect(cleanName('https://bit.ly/abc')).toBe('httpsbitlyabc');
    expect(cleanName('a'.repeat(100))).toHaveLength(40);
  });
});
