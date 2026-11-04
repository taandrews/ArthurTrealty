import { describe, expect, it } from 'vitest';
import config from '../config.json';
import { renderEmail } from '../src/content/email-template';
import {
  FUNDS_QUESTIONS, mortgageReady, phaseIntro, phaseReminder, welcome, workshopReminder, type Outreach,
} from '../src/content/messages';
import { NURTURE_TOPICS, nurtureEmail } from '../src/content/nurture';
import { PHASES } from '../src/phases';
import type { Lead } from '../src/types';

const lead: Lead = {
  entity: 'lead', leadId: 'ATR-1', firstName: 'Dana', lastName: 'Smith', email: 'd@example.com', phone: '+14105551234',
  source: 'website', status: 'active', createdAt: '2026-10-01T12:00:00Z',
  assignedTo: { name: 'Arthur', email: 'a@example.com', phone: '' },
  phaseAttempts: {}, milestones: {}, funds: {}, tasks: [], nurtureIndex: 0,
  workshop: { at: '2026-11-05T23:00:00Z', location: '123 Main St, Baltimore', version: 1 },
};
const ctx = { cfg: config, lead };

function allText(o: Outreach): string {
  return [o.call, o.sms, o.email?.subject, ...(o.email?.paragraphs ?? []), ...(o.email?.bullets ?? []), ...(o.email?.bulletsAfter ?? [])]
    .filter(Boolean).join(' ');
}

describe('message content', () => {
  const all: Outreach[] = [
    welcome(ctx), mortgageReady(ctx), workshopReminder(ctx, '24 hours'),
    ...PHASES.map((p) => phaseIntro(ctx, p.key)), ...PHASES.map((p) => phaseReminder(ctx, p.key)),
  ];

  it('never leaves template placeholders or undefined values', () => {
    for (const o of all) {
      const text = allText(o);
      expect(text).not.toMatch(/\{\{|undefined|null|NaN/);
    }
  });

  it('personalizes with the client name and brand', () => {
    expect(welcome(ctx).sms).toContain('Dana');
    expect(welcome(ctx).call).toContain('Arthur T Realty');
  });

  it('numbers the five program steps in the texts', () => {
    const steps = ['smart_credit', 'loan_application', 'land_trust', 'workshop_registration', 'counseling_scheduling'] as const;
    steps.forEach((s, i) => expect(phaseIntro(ctx, s).sms).toContain(`Step ${i + 1} of 5`));
  });

  it('includes the links from config', () => {
    const links = { smartCredit: 'https://example.com/a', loanApplication: 'https://example.com/b', landTrust: 'https://example.com/c', workshop: 'https://example.com/d', counselingCalendar: 'https://example.com/e' };
    const real = { ...ctx, cfg: { ...config, links } };
    expect(phaseIntro(real, 'smart_credit').sms).toContain(links.smartCredit);
    expect(phaseIntro(real, 'counseling_scheduling').email?.cta?.url).toBe(links.counselingCalendar);
  });

  it('states the upfront cost target in the earnest money follow-up', () => {
    expect(phaseReminder(ctx, 'earnest_money').sms).toContain('$1,500');
    expect(phaseReminder(ctx, 'earnest_money').sms).toContain('Reply UPDATE');
  });

  it('shows workshop time in Eastern time', () => {
    const sms = workshopReminder(ctx, '24 hours').sms!;
    expect(sms).toContain('Thursday, November 5');
    expect(sms).toMatch(/6:00 PM EST/);
    expect(sms).toContain('123 Main St');
  });

  it('keeps texts reasonably short', () => {
    for (const o of all) if (o.sms) expect(o.sms.length).toBeLessThan(480);
    for (const q of FUNDS_QUESTIONS) expect(q.length).toBeLessThan(160);
  });
});

describe('nurture emails', () => {
  it('has ten topics and cycles through them', () => {
    expect(NURTURE_TOPICS).toHaveLength(10);
    expect(nurtureEmail(10, 'Dana').subject).toBe(nurtureEmail(0, 'Dana').subject);
  });
});

describe('email rendering', () => {
  it('escapes HTML and includes footer and unsubscribe', () => {
    const { html, text } = renderEmail(
      { subject: 'Hi', paragraphs: ['<b>x</b> & y'], cta: { label: 'Go', url: 'https://e.com/?a=1&b=2' } },
      { brandName: 'Arthur T Realty', mailingAddress: '1 Main St', unsubscribeUrl: 'https://e.com/u' },
    );
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y');
    expect(html).toContain('href="https://e.com/?a=1&amp;b=2"');
    expect(html).toContain('Unsubscribe');
    expect(text).toContain('Go: https://e.com/?a=1&b=2');
    expect(text).toContain('1 Main St');
  });
});

describe('program link placeholders', () => {
  const linkPhases = ['smart_credit', 'loan_application', 'land_trust', 'workshop_registration', 'counseling_scheduling'] as const;

  it('never sends a "TODO" placeholder link, and says the link is coming', () => {
    for (const phase of linkPhases) {
      for (const o of [phaseIntro(ctx, phase), phaseReminder(ctx, phase)]) {
        expect(allText(o)).not.toMatch(/TODO/);
        expect(o.sms).toContain("We'll text you the link as soon as it's ready.");
        expect(o.sms).not.toMatch(/\.\./);
        expect(o.email?.cta).toBeUndefined();
        if (o.call) expect(o.call).not.toContain("I've texted you");
      }
    }
  });

  it('sends real links unchanged', () => {
    const real = { ...ctx, cfg: { ...config, links: { ...config.links, smartCredit: 'https://example.com/credit' } } };
    const o = phaseIntro(real, 'smart_credit');
    expect(o.sms).toContain('here: https://example.com/credit');
    expect(o.email?.cta?.url).toBe('https://example.com/credit');
    expect(o.call).toContain("I've texted you");
  });
});
