'use client';

import { useState, useCallback, useRef, type KeyboardEvent, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, CheckCircle2, ChevronDown, Home,
} from 'lucide-react';
import {
  quizIntro, getVisibleQuestions, getResultTier, type ResultTier,
} from '@/data/quiz-questions';
import { marylandCounties } from '@/data/counties';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { CONSENT_TEXT } from '@/lib/consent';

/* ——— Brand palette ——— */
const NAVY = '#0A1F44';
const GOLD = '#D4A017';
const GRAY_TEXT = '#5A6376';
const BORDER = '#E2E4EA';
/* Input outlines need 3:1 against white */
const FIELD_BORDER = '#8A93A6';
const ERROR = '#B91C1C';

/* ——— Slide animation variants ——— */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ——— Color map for result cards ——— */
const tierStyles: Record<ResultTier['color'], {
  checkColor: string; cardBg: string; cardText: string;
  featureText: string; descText: string; eyebrowText: string;
  badgeBg: string; badgeText: string; dotColor: string;
  stepBg: string;
  ctaBg: string; ctaText: string;
  timelineText: string; bandGradient: string;
}> = {
  light: {
    checkColor: NAVY, cardBg: '#ffffff', cardText: NAVY,
    featureText: GRAY_TEXT, descText: GRAY_TEXT, eyebrowText: GRAY_TEXT,
    badgeBg: '#F5F6FA', badgeText: NAVY, dotColor: GOLD,
    stepBg: '#F5F6FA',
    ctaBg: NAVY, ctaText: '#ffffff',
    timelineText: NAVY,
    bandGradient: `linear-gradient(to right, ${NAVY}, ${GOLD})`,
  },
  dark: {
    checkColor: GOLD, cardBg: NAVY, cardText: '#ffffff',
    featureText: 'rgba(255,255,255,0.85)', descText: 'rgba(255,255,255,0.85)', eyebrowText: 'rgba(255,255,255,0.8)',
    badgeBg: 'rgba(212,160,23,0.15)', badgeText: GOLD, dotColor: GOLD,
    stepBg: 'rgba(255,255,255,0.06)',
    ctaBg: GOLD, ctaText: NAVY,
    timelineText: '#ffffff',
    bandGradient: `linear-gradient(to right, ${GOLD}, #e6b422)`,
  },
};

/* ——— Contact validation ——— */
function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
}
const isValidPhone = (raw: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(phoneDigits(raw));
const isValidEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());

/* Shared styles */
const labelStyle = {
  display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600,
  fontSize: '14px', color: NAVY, marginBottom: '6px',
} as const;
const errorStyle = {
  fontFamily: 'var(--font-body)', fontSize: '14px', color: ERROR, margin: '6px 0 0 0',
} as const;
const fieldStyle = (invalid: boolean) => ({
  width: '100%', padding: '14px 18px', minHeight: '52px', borderRadius: '12px',
  border: `2px solid ${invalid ? ERROR : FIELD_BORDER}`, background: '#ffffff',
  fontFamily: 'var(--font-body)', fontSize: '16px', color: NAVY,
  boxSizing: 'border-box' as const,
});
const backButtonStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  minHeight: '44px', padding: '12px 20px', borderRadius: '10px',
  border: `1px solid ${FIELD_BORDER}`, background: '#ffffff',
  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px',
  color: GRAY_TEXT, cursor: 'pointer', transition: 'all 0.2s ease',
} as const;
const primaryButtonStyle = (enabled: boolean) => ({
  display: 'flex', alignItems: 'center', gap: '8px',
  minHeight: '48px', padding: '14px 28px', borderRadius: '10px',
  border: 'none',
  background: enabled ? GOLD : BORDER,
  fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px',
  color: enabled ? NAVY : GRAY_TEXT,
  cursor: enabled ? 'pointer' : 'default',
  transition: 'all 0.2s ease',
  boxShadow: enabled ? '0 8px 30px -6px rgba(212,160,23,0.35)' : 'none',
});
/* Visible navy focus ring (inline styles can't express :focus, and the
   unlayered global gold ring would beat Tailwind utilities) */
const FOCUS_RING = 'quiz-focus';
const FIELD_FOCUS = 'quiz-field';
const QUIZ_CSS = `
.quiz-root .quiz-focus:focus-visible { outline: 3px solid ${NAVY}; outline-offset: 3px; }
.quiz-root .quiz-field:focus { outline: 3px solid ${NAVY}; outline-offset: 1px; }
.quiz-root .quiz-heading:focus, .quiz-root .quiz-heading:focus-visible { outline: none; }
`;

const EMPTY_LEAD = { name: '', email: '', phone: '', company: '' };

type Field = 'name' | 'email' | 'phone' | 'consent';

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [tcpaChecked, setTcpaChecked] = useState(false);
  const [result, setResult] = useState<ResultTier | null>(null);
  const [phase, setPhase] = useState<'quiz' | 'lead' | 'result'>('quiz');

  const focusPending = useRef(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  /* Questions that apply to this person (sellers and investors skip the money questions) */
  const questions = getVisibleQuestions(answers).map((q) =>
    q.id === 'county'
      ? { ...q, options: marylandCounties.map((c) => ({ label: c, value: c })) }
      : q,
  );
  const totalSteps = questions.length;

  const currentQuestion = questions[step];
  const isAnswered = !!answers[currentQuestion?.id];
  const headingId = `quiz-heading-${phase}-${step}`;

  /* Move focus to each new heading after the slide animation mounts it */
  const headingRef = useCallback((el: HTMLHeadingElement | null) => {
    if (el && focusPending.current) {
      focusPending.current = false;
      el.focus();
    }
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    focusPending.current = true;
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      setPhase('lead');
    }
  }, [step, totalSteps]);

  const goBack = useCallback(() => {
    setDirection(-1);
    focusPending.current = true;
    if (phase === 'lead') {
      setPhase('quiz');
    } else if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step, phase]);

  const selectAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  /* Radio group keyboard support: arrows move and select, Home/End jump */
  const onOptionKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!currentQuestion) return;
    const count = currentQuestion.options.length;
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % count;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      selectAnswer(currentQuestion.id, currentQuestion.options[index].value);
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    selectAnswer(currentQuestion.id, currentQuestion.options[next].value);
    optionRefs.current[next]?.focus();
  }, [currentQuestion, selectAnswer]);

  /* ——— Contact step validation ——— */
  const phoneOk = isValidPhone(leadForm.phone);
  const emailOk = !leadForm.email.trim() || isValidEmail(leadForm.email);
  const fieldErrors: Record<Field, string> = {
    name: leadForm.name.trim() ? '' : 'Please add your name.',
    phone: !leadForm.phone.trim()
      ? 'Please add your mobile number.'
      : phoneOk ? '' : 'Please enter a 10-digit US mobile number.',
    email: emailOk ? '' : 'Please check your email address, or leave it blank.',
    consent: tcpaChecked ? '' : 'Please check the box so your assistant can call you.',
  };
  const showError = (f: Field) => (touched[f] || submitAttempted) && !!fieldErrors[f];
  const isLeadValid = !fieldErrors.name && !fieldErrors.phone && !fieldErrors.email && !fieldErrors.consent;

  /* Short line under the button saying what's still needed,
     e.g. "Add your mobile number and check the consent box." */
  const joinAnd = (items: string[]) =>
    items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];
  const toAdd: string[] = [];
  const toCheck: string[] = [];
  if (fieldErrors.name) toAdd.push('your name');
  if (fieldErrors.phone) (leadForm.phone.trim() ? toCheck : toAdd).push('your mobile number');
  if (fieldErrors.email) toCheck.push('your email');
  if (fieldErrors.consent) toCheck.push('the consent box');
  const missingParts = [
    toAdd.length ? `add ${joinAnd(toAdd)}` : '',
    toCheck.length ? `check ${joinAnd(toCheck)}` : '',
  ].filter(Boolean).join(', and ');
  const missingText = missingParts ? `${missingParts.charAt(0).toUpperCase()}${missingParts.slice(1)}.` : '';

  const submitLead = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);
    if (!isLeadValid) {
      const firstInvalid = (['name', 'phone', 'email', 'consent'] as Field[]).find((f) => fieldErrors[f]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    /* Only send answers to questions this person actually saw */
    const visibleIds = new Set(getVisibleQuestions(answers).map((q) => q.id));
    const sentAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => visibleIds.has(k)));
    try {
      const { apiUrl } = await getRuntimeConfig();
      const res = await fetch(`${apiUrl}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name.trim(),
          email: leadForm.email.trim(),
          phone: `+1${phoneDigits(leadForm.phone)}`,
          company: leadForm.company,
          answers: sentAnswers,
          consent: tcpaChecked,
          consentText: CONSENT_TEXT,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: '' }));
        throw new Error(error || 'Submission failed');
      }
    } catch (err) {
      setSubmitError(err instanceof Error && err.message !== 'Failed to fetch'
        ? err.message
        : "We couldn't send your information. Please check your connection and try again.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setResult(getResultTier(sentAnswers));
    setDirection(1);
    focusPending.current = true;
    setPhase('result');
  };

  /* Retake resets local state only; nothing is sent */
  const retake = useCallback(() => {
    setStep(0);
    setAnswers({});
    setLeadForm(EMPTY_LEAD);
    setTouched({});
    setSubmitAttempted(false);
    setSubmitError('');
    setTcpaChecked(false);
    setResult(null);
    setDirection(-1);
    focusPending.current = true;
    setPhase('quiz');
  }, []);

  /* ——— Progress (Q1 starts above 0%; the contact step comes before 100%) ——— */
  const progressPct =
    phase === 'result' ? 100
      : phase === 'lead' ? ((totalSteps + 1) / (totalSteps + 2)) * 100
        : ((step + 1) / (totalSteps + 2)) * 100;
  const progressLabel = phase === 'lead' ? 'Almost done' : `Question ${step + 1} of ${totalSteps}`;
  const liveMessage = phase === 'result'
    ? 'Your results'
    : phase === 'lead' ? 'Almost done: contact details' : progressLabel;

  const firstName = leadForm.name.trim().split(/\s+/)[0] || '';

  return (
    <section className="quiz-root" style={{ minHeight: '100svh', background: '#F5F6FA', overflowX: 'clip', paddingTop: '120px', paddingBottom: '80px' }}>
      <style>{QUIZ_CSS}</style>
      <div style={{ maxWidth: '640px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>

        {/* Announces each step change to screen readers */}
        <div aria-live="polite" className="sr-only">{liveMessage}</div>

        {/* ── Progress Bar ── */}
        {phase !== 'result' && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: NAVY, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                {progressLabel}
              </span>
              <span aria-hidden="true" style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: GRAY_TEXT }}>
                {Math.round(progressPct)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPct)}
              aria-valuetext={`${progressLabel}, ${Math.round(progressPct)}%`}
              style={{ height: '6px', borderRadius: '999px', background: BORDER, overflow: 'hidden' }}
            >
              <motion.div
                style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(to right, ${GOLD}, #e6b422)` }}
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        )}

        {/* ── Quiz Questions ── */}
        <AnimatePresence mode="wait" custom={direction}>
          {phase === 'quiz' && currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 0 && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px', color: GRAY_TEXT,
                  margin: '0 0 10px 0',
                }}>
                  {quizIntro}
                </p>
              )}
              <h1
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                className="quiz-heading"
                style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                  color: NAVY, marginBottom: currentQuestion.helper ? '10px' : '32px', lineHeight: 1.2,
                }}
              >
                {currentQuestion.question}
              </h1>
              {currentQuestion.helper && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px', color: GRAY_TEXT,
                  lineHeight: 1.6, margin: '0 0 28px 0',
                }}>
                  {currentQuestion.helper}
                </p>
              )}

              {/* Radio options */}
              {currentQuestion.type === 'radio' && (() => {
                const selectedIndex = currentQuestion.options.findIndex((o) => o.value === answers[currentQuestion.id]);
                return (
                  <div role="radiogroup" aria-labelledby={headingId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentQuestion.options.map((opt, i) => {
                      const selected = i === selectedIndex;
                      const tabbable = selectedIndex < 0 ? i === 0 : selected;
                      return (
                        <button
                          key={opt.value}
                          ref={(el) => { optionRefs.current[i] = el; }}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={tabbable ? 0 : -1}
                          onClick={() => selectAnswer(currentQuestion.id, opt.value)}
                          onKeyDown={(e) => onOptionKeyDown(e, i)}
                          className={FOCUS_RING}
                          style={{
                            width: '100%', textAlign: 'left', cursor: 'pointer',
                            minHeight: '56px', padding: '16px 24px', borderRadius: '14px',
                            border: selected ? `2px solid ${GOLD}` : `2px solid ${BORDER}`,
                            background: selected ? 'rgba(212,160,23,0.06)' : '#ffffff',
                            fontFamily: 'var(--font-body)', fontSize: '15px', color: NAVY,
                            fontWeight: selected ? 600 : 400,
                            transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                            boxShadow: selected ? '0 4px 20px -4px rgba(212,160,23,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                          }}
                        >
                          <span>{opt.label}</span>
                          {selected && (
                            <CheckCircle2 aria-hidden="true" style={{ width: '20px', height: '20px', color: NAVY, flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Dropdown */}
              {currentQuestion.type === 'dropdown' && (
                <div>
                  <label htmlFor={`quiz-${currentQuestion.id}`} style={labelStyle}>
                    County or Baltimore City
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id={`quiz-${currentQuestion.id}`}
                      name={currentQuestion.id}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => selectAnswer(currentQuestion.id, e.target.value)}
                      className={FIELD_FOCUS}
                      style={{
                        width: '100%', minHeight: '56px', padding: '16px 48px 16px 24px', borderRadius: '14px',
                        border: answers[currentQuestion.id] ? `2px solid ${GOLD}` : `2px solid ${FIELD_BORDER}`,
                        background: answers[currentQuestion.id] ? 'rgba(212,160,23,0.06)' : '#ffffff',
                        fontFamily: 'var(--font-body)', fontSize: '16px', color: NAVY,
                        appearance: 'none', cursor: 'pointer',
                        boxShadow: answers[currentQuestion.id] ? '0 4px 20px -4px rgba(212,160,23,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <option value="">Select your county...</option>
                      {currentQuestion.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" style={{
                      position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)',
                      width: '20px', height: '20px', color: GRAY_TEXT, pointerEvents: 'none',
                    }} />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
                {step > 0 ? (
                  <button type="button" onClick={goBack} className={FOCUS_RING} style={backButtonStyle}>
                    <ArrowLeft aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                    Back
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!isAnswered}
                  className={FOCUS_RING}
                  style={primaryButtonStyle(isAnswered)}
                >
                  {step === totalSteps - 1 ? 'Continue' : 'Next'}
                  <ArrowRight aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Lead Capture Form ── */}
          {phase === 'lead' && (
            <motion.div
              key="lead-capture"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h1
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                className="quiz-heading"
                style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                  color: NAVY, marginBottom: '8px', lineHeight: 1.2,
                }}
              >
                Where should your assistant call you?
              </h1>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '15px', color: GRAY_TEXT,
                lineHeight: 1.6, marginBottom: '8px',
              }}>
                Your assistant will call you with your first step, between 9am and 8pm Eastern.
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: GRAY_TEXT, marginBottom: '28px' }}>
                <span aria-hidden="true" style={{ color: ERROR }}>*</span> Required
              </p>

              <form onSubmit={submitLead} noValidate aria-labelledby={headingId}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label htmlFor="quiz-name" style={labelStyle}>
                      Full name <span aria-hidden="true" style={{ color: ERROR }}>*</span>
                    </label>
                    <input
                      ref={(el) => { fieldRefs.current.name = el; }}
                      id="quiz-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      aria-required="true"
                      aria-invalid={showError('name')}
                      aria-describedby={showError('name') ? 'quiz-name-error' : undefined}
                      placeholder="Your full name"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      className={FIELD_FOCUS}
                      style={fieldStyle(showError('name'))}
                    />
                    {showError('name') && <p id="quiz-name-error" style={errorStyle}>{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="quiz-phone" style={labelStyle}>
                      Mobile phone (your assistant will call here) <span aria-hidden="true" style={{ color: ERROR }}>*</span>
                    </label>
                    <input
                      ref={(el) => { fieldRefs.current.phone = el; }}
                      id="quiz-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      aria-required="true"
                      aria-invalid={showError('phone')}
                      aria-describedby={showError('phone') ? 'quiz-phone-error' : undefined}
                      placeholder="(410) 555-0123"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                      className={FIELD_FOCUS}
                      style={fieldStyle(showError('phone'))}
                    />
                    {showError('phone') && <p id="quiz-phone-error" style={errorStyle}>{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="quiz-email" style={labelStyle}>
                      Email <span style={{ fontWeight: 400, color: GRAY_TEXT }}>(optional)</span>
                    </label>
                    <input
                      ref={(el) => { fieldRefs.current.email = el; }}
                      id="quiz-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      aria-invalid={showError('email')}
                      aria-describedby={showError('email') ? 'quiz-email-error' : undefined}
                      placeholder="you@email.com"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      className={FIELD_FOCUS}
                      style={fieldStyle(showError('email'))}
                    />
                    {showError('email') && <p id="quiz-email-error" style={errorStyle}>{fieldErrors.email}</p>}
                  </div>

                  {/* TCPA Checkbox */}
                  <div>
                    <label htmlFor="quiz-consent" style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      marginTop: '4px', cursor: 'pointer',
                    }}>
                      <input
                        ref={(el) => { fieldRefs.current.consent = el; }}
                        id="quiz-consent"
                        name="consent"
                        type="checkbox"
                        required
                        aria-required="true"
                        aria-invalid={showError('consent')}
                        aria-describedby={showError('consent') ? 'quiz-consent-error' : undefined}
                        checked={tcpaChecked}
                        onChange={(e) => setTcpaChecked(e.target.checked)}
                        onBlur={() => setTouched((t) => ({ ...t, consent: true }))}
                        className={FIELD_FOCUS}
                        style={{
                          width: '22px', height: '22px', marginTop: '1px',
                          accentColor: NAVY, flexShrink: 0, cursor: 'pointer',
                        }}
                      />
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: '13.5px', color: GRAY_TEXT,
                        lineHeight: 1.55,
                      }}>
                        {CONSENT_TEXT} <span aria-hidden="true" style={{ color: ERROR }}>*</span>
                      </span>
                    </label>
                    {showError('consent') && <p id="quiz-consent-error" style={errorStyle}>{fieldErrors.consent}</p>}
                  </div>

                  {/* Hidden from people; bots that fill it in are ignored */}
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={leadForm.company}
                    onChange={(e) => setLeadForm((f) => ({ ...f, company: e.target.value }))}
                    style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                  />

                  {submitError && (
                    <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: ERROR, margin: 0 }}>
                      {submitError}
                    </p>
                  )}
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '36px' }}>
                  <button type="button" onClick={goBack} className={FOCUS_RING} style={backButtonStyle}>
                    <ArrowLeft aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                    Back
                  </button>
                  <button
                    type="submit"
                    aria-disabled={!isLeadValid || submitting}
                    aria-describedby={missingText ? 'quiz-missing' : undefined}
                    className={FOCUS_RING}
                    style={primaryButtonStyle(isLeadValid && !submitting)}
                  >
                    {submitting ? 'Sending…' : 'See My Results'}
                    <ArrowRight aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                {missingText && (
                  <p
                    id="quiz-missing"
                    aria-live="polite"
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.5,
                      color: submitAttempted ? ERROR : GRAY_TEXT, margin: '12px 0 0 0',
                    }}
                  >
                    {missingText}
                  </p>
                )}
              </form>
            </motion.div>
          )}

          {/* ── Results ── */}
          {phase === 'result' && result && (
            <motion.div
              key="result"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Congrats header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(212,160,23,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px auto',
                }}>
                  <Home aria-hidden="true" style={{ width: '28px', height: '28px', color: GOLD }} />
                </div>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="quiz-heading"
                  style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 800,
                    fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: NAVY,
                    marginBottom: '8px', lineHeight: 1.2,
                  }}
                >
                  {firstName ? `Thanks, ${firstName}. Here's where you start.` : 'Here\'s where you start.'}
                </h1>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px',
                  color: GRAY_TEXT, lineHeight: 1.6,
                }}>
                  Based on your answers, this is your pathway.
                </p>
              </div>

              {/* Result Card */}
              {(() => {
                const s = tierStyles[result.color];
                return (
                  <div style={{
                    borderRadius: '20px', overflow: 'hidden',
                    background: s.cardBg,
                    boxShadow: '0 20px 60px -15px rgba(0,0,0,0.12)',
                    border: result.color === 'light' ? `1px solid ${BORDER}` : 'none',
                  }}>
                    {/* Top color band */}
                    <div style={{ height: '6px', background: s.bandGradient }} />

                    <div style={{ padding: 'clamp(24px, 6vw, 40px)' }}>
                      {/* Pathway name */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: s.badgeBg, color: s.badgeText,
                        fontSize: '12px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                        padding: '6px 14px', borderRadius: '999px', marginBottom: '20px',
                      }}>
                        <span aria-hidden="true" style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: s.dotColor,
                        }} />
                        Your pathway: {result.title}
                      </div>

                      {/* First step */}
                      <div style={{
                        background: s.stepBg,
                        borderRadius: '12px', padding: '20px 22px', marginBottom: '24px',
                      }}>
                        <h2 style={{
                          fontFamily: 'var(--font-heading)', fontWeight: 700,
                          fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)', color: s.cardText,
                          lineHeight: 1.25, margin: '0 0 8px 0',
                        }}>
                          <span style={{ color: s.eyebrowText }}>Your first step:</span> {result.firstStep}
                        </h2>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '15px',
                          color: s.descText, lineHeight: 1.6, margin: 0,
                        }}>
                          {result.firstStepDetail}
                        </p>
                      </div>

                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '15px',
                        color: s.descText, lineHeight: 1.7, marginBottom: '24px',
                      }}>
                        {result.description}
                      </p>

                      {/* Remaining steps */}
                      <h3 style={{
                        fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px',
                        color: s.cardText, margin: '0 0 12px 0',
                      }}>
                        After that:
                      </h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {result.features.map((f) => (
                          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <CheckCircle2 aria-hidden="true" style={{ width: '16px', height: '16px', marginTop: '2px', color: s.checkColor, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: s.featureText, lineHeight: 1.5 }}>
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* What happens next */}
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600,
                        color: s.timelineText, lineHeight: 1.6, marginBottom: '28px',
                      }}>
                        {result.timeline}
                      </p>

                      {/* CTA */}
                      <Link
                        href={result.ctaHref}
                        className={FOCUS_RING}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '10px',
                          minHeight: '48px', padding: '14px 28px', borderRadius: '12px',
                          background: s.ctaBg, color: s.ctaText,
                          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px',
                          textDecoration: 'none',
                          boxShadow: '0 8px 30px -6px rgba(0,0,0,0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {result.cta}
                        <ArrowRight aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Retake (resets this page only; nothing is sent again) */}
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={retake}
                  className={FOCUS_RING}
                  style={{
                    minHeight: '44px', padding: '10px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px',
                    color: GRAY_TEXT, textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Retake Quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
