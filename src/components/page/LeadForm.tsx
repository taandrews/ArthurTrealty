'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { CONSENT_TEXT } from '@/lib/consent';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: '10px', border: '2px solid #e5e7eb',
  background: '#ffffff', fontFamily: 'var(--font-body)', fontSize: '15px', color: '#0A1F44', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px',
  color: '#0A1F44', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em',
};

/**
 * Lead form used on every service page and the contact page. Submissions go to the same
 * automation as the quiz, tagged with `interest` so staff can see which page they came from.
 */
export function LeadForm({
  interest, title = 'Get Your Next Step', subtitle, options, submitLabel = 'Get Started',
}: { interest: string; title?: string; subtitle?: string; options?: { value: string; label: string }[]; submitLabel?: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: options?.[0]?.value ?? '', message: '', company: '' });
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const problem = !form.name.trim() ? 'Please enter your name.'
    : !form.email.trim() && !form.phone.trim() ? 'Please enter an email address or phone number so we can reach you.'
      : !consent ? 'Please check the box to agree to be contacted.'
        : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    if (problem) { setError(problem); return; }
    setState('sending');
    setError('');
    try {
      const { apiUrl } = await getRuntimeConfig();
      const res = await fetch(`${apiUrl}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone, company: form.company,
          interest: options ? form.topic : interest, message: form.message,
          consent, consentText: CONSENT_TEXT,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: '' }));
        throw new Error(msg || 'Submission failed');
      }
      setState('sent');
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch'
        ? err.message
        : "We couldn't send your information. Please check your connection and try again.");
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E4EA', padding: '40px', textAlign: 'center' }}>
        <CheckCircle2 style={{ width: '44px', height: '44px', color: '#10b981', margin: '0 auto 16px' }} />
        <h3 className="font-heading font-800 text-navy" style={{ fontSize: '22px', marginBottom: '8px' }}>Thank you!</h3>
        <p className="font-body" style={{ color: '#5A6376', fontSize: '15px', lineHeight: 1.6 }}>
          We received your information. Check your email and phone. Your homeownership assistant will reach out shortly with your first step.
        </p>
      </div>
    );
  }

  return (
    <form id="get-started" onSubmit={submit} noValidate style={{ scrollMarginTop: '120px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E4EA', padding: 'clamp(24px, 4vw, 40px)' }}>
      <h3 className="font-heading font-800 text-navy" style={{ fontSize: '22px', marginBottom: subtitle ? '6px' : '24px' }}>{title}</h3>
      {subtitle && <p className="font-body" style={{ color: '#5A6376', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>{subtitle}</p>}
      <div className="lead-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle} htmlFor={`${interest}-name`}>Full name</label>
          <input id={`${interest}-name`} style={inputStyle} value={form.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div>
          <label style={labelStyle} htmlFor={`${interest}-email`}>Email</label>
          <input id={`${interest}-email`} type="email" style={inputStyle} value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div>
          <label style={labelStyle} htmlFor={`${interest}-phone`}>Mobile phone</label>
          <input id={`${interest}-phone`} type="tel" style={inputStyle} value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="(555) 123-4567" />
        </div>
        {options && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor={`${interest}-topic`}>How can we help?</label>
            <select id={`${interest}-topic`} style={inputStyle} value={form.topic} onChange={set('topic')}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle} htmlFor={`${interest}-message`}>Message (optional)</label>
          <textarea id={`${interest}-message`} rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.message} onChange={set('message')} />
        </div>
      </div>

      {/* Hidden from people; bots that fill it in are ignored */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={set('company')}
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }} />

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '20px', cursor: 'pointer' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#D4A017', flexShrink: 0 }} />
        <span className="font-body" style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.55 }}>{CONSENT_TEXT}</span>
      </label>

      {error && <p role="alert" className="font-body" style={{ color: '#b91c1c', fontSize: '14px', marginTop: '16px' }}>{error}</p>}

      <button type="submit" disabled={state === 'sending'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px', marginTop: '24px', padding: '15px 30px',
          border: 'none', borderRadius: '10px', cursor: 'pointer', background: '#D4A017', color: '#0A1F44',
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', opacity: state === 'sending' ? 0.7 : 1,
        }}>
        {state === 'sending' ? 'Sending…' : submitLabel}
        <ArrowRight style={{ width: '16px', height: '16px' }} />
      </button>
      <style>{`@media (max-width: 560px) { .lead-form-grid { grid-template-columns: 1fr !important; } }`}</style>
    </form>
  );
}
