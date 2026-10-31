import { describe, expect, it } from 'vitest';
import { detectOptOut } from '../src/lib/opt-out';
import { isBlockedPhone, toE164, toUsPhone } from '../src/lib/phone';
import { localDate, nextContactWindow } from '../src/lib/time';
import { markerItem } from '../src/services/db';
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

describe('service-area phone numbers', () => {
  it('allows US numbers, including Maryland and US territories', () => {
    expect(toUsPhone('(410) 555-1234')).toBe('+14105551234');
    expect(toUsPhone('443-555-0102')).toBe('+14435550102');
    expect(toUsPhone('787 555 1234')).toBe('+17875551234'); // Puerto Rico
    expect(toUsPhone('671 555 1234')).toBe('+16715551234'); // Guam
  });
  it('blocks premium, non-geographic, and N11 codes', () => {
    for (const area of ['900', '976', '500', '521', '533', '588', '600', '700', '710', '211', '411', '911']) {
      expect(isBlockedPhone(`+1${area}5551234`), area).toBe(true);
    }
  });
  it('blocks Canada and the Caribbean', () => {
    for (const area of ['416', '604', '905', '876', '809', '242', '441']) {
      expect(toUsPhone(`${area}-555-1234`), area).toBeUndefined();
    }
  });
  it('blocks malformed NANP numbers', () => {
    expect(isBlockedPhone('+11105551234')).toBe(true); // area code starts with 1
    expect(isBlockedPhone('+14100551234')).toBe(true); // exchange starts with 0
    expect(isBlockedPhone('+4420555512')).toBe(true);
    expect(toUsPhone(undefined)).toBeUndefined();
  });
});

describe('opt-out phrases', () => {
  it('recognizes requests to stop calls', () => {
    expect(detectOptOut('Please stop calling me')).toBe('calls');
    expect(detectOptOut("don't call me anymore")).toBe('calls');
    expect(detectOptOut('Do not call this number')).toBe('calls');
  });
  it('recognizes requests to stop texts', () => {
    expect(detectOptOut('stop texting me')).toBe('texts');
    expect(detectOptOut('Don’t text me')).toBe('texts');
  });
  it('treats remove/unsubscribe/stop contacting, or both channels, as all contact', () => {
    expect(detectOptOut('remove me from your list')).toBe('all');
    expect(detectOptOut('take me off this')).toBe('all');
    expect(detectOptOut('unsubscribe')).toBe('all');
    expect(detectOptOut('stop contacting me')).toBe('all');
    expect(detectOptOut('stop calling and texting')).toBe('all');
  });
  it('ignores ordinary messages', () => {
    expect(detectOptOut('Can you call me tomorrow?')).toBeUndefined();
    expect(detectOptOut('I will text you the documents')).toBeUndefined();
    expect(detectOptOut('yes')).toBeUndefined();
  });
});

describe('send-once markers', () => {
  it('are keyed apart from leads, are not lead entities, and expire', () => {
    const now = Date.parse('2026-10-30T12:00:00Z');
    const m = markerItem('once', 'journey#ATR-1#smart_credit#2026-10-30T12:00:00Z', 7, now);
    expect(m.leadId).toBe('once#journey#ATR-1#smart_credit#2026-10-30T12:00:00Z');
    expect(m.entity).not.toBe('lead');
    expect(m.expiresAt).toBe(now / 1000 + 7 * 86400);
    expect(markerItem('count', 'sms-replies#ATR-1#2026-10-30', 2, now).leadId).toBe('count#sms-replies#ATR-1#2026-10-30');
  });
  it('uses the Eastern calendar date for daily counters', () => {
    expect(localDate(new Date('2026-10-31T03:30:00Z'), 'America/New_York')).toBe('2026-10-30'); // 11:30pm EDT
    expect(localDate(new Date('2026-10-31T04:30:00Z'), 'America/New_York')).toBe('2026-10-31');
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
