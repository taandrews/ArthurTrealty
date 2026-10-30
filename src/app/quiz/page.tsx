'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, CheckCircle2, ChevronDown, Home,
} from 'lucide-react';
import { quizQuestions, getTierFromCredit, type ResultTier } from '@/data/quiz-questions';
import { marylandCounties } from '@/data/counties';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { CONSENT_TEXT } from '@/lib/consent';

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

/* ——— Color map for tier results ——— */
const tierStyles: Record<string, {
  gradient: string; badgeBg: string; badgeText: string;
  dotColor: string; checkColor: string; cardBg: string;
  cardText: string; featureText: string; descText: string;
  ctaBg: string; ctaHoverBg: string; ctaText: string;
  timelineText: string; bandGradient: string;
}> = {
  emerald: {
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    badgeBg: '#ecfdf5', badgeText: '#047857',
    dotColor: '#10b981', checkColor: '#10b981',
    cardBg: '#ffffff', cardText: '#0A1F44',
    featureText: 'rgba(10,31,68,0.7)', descText: '#6b7280',
    ctaBg: '#059669', ctaHoverBg: '#047857', ctaText: '#ffffff',
    timelineText: '#6b7280',
    bandGradient: 'linear-gradient(to right, #34d399, #059669)',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #D4A017, #e6b422)',
    badgeBg: 'rgba(212,160,23,0.1)', badgeText: '#D4A017',
    dotColor: '#D4A017', checkColor: '#D4A017',
    cardBg: '#0A1F44', cardText: '#ffffff',
    featureText: 'rgba(255,255,255,0.7)', descText: 'rgba(255,255,255,0.5)',
    ctaBg: '#D4A017', ctaHoverBg: '#e6b422', ctaText: '#0A1F44',
    timelineText: 'rgba(255,255,255,0.4)',
    bandGradient: 'linear-gradient(to right, #D4A017, #e6b422)',
  },
  navy: {
    gradient: 'linear-gradient(135deg, #64748b, #0A1F44)',
    badgeBg: '#f1f5f9', badgeText: '#475569',
    dotColor: '#0A1F44', checkColor: '#0A1F44',
    cardBg: '#ffffff', cardText: '#0A1F44',
    featureText: 'rgba(10,31,68,0.7)', descText: '#6b7280',
    ctaBg: '#0A1F44', ctaHoverBg: '#132d56', ctaText: '#ffffff',
    timelineText: '#6b7280',
    bandGradient: 'linear-gradient(to right, #94a3b8, #0A1F44)',
  },
};

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [tcpaChecked, setTcpaChecked] = useState(false);
  const [result, setResult] = useState<ResultTier | null>(null);
  const [phase, setPhase] = useState<'quiz' | 'lead' | 'result'>('quiz');

  const totalSteps = quizQuestions.length;

  /* Build county options for the dropdown question */
  const questions = quizQuestions.map((q) =>
    q.id === 'county'
      ? { ...q, options: marylandCounties.map((c) => ({ label: c, value: c })) }
      : q,
  );

  const currentQuestion = questions[step];
  const isAnswered = !!answers[currentQuestion?.id];

  const goNext = useCallback(() => {
    setDirection(1);
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      setPhase('lead');
    }
  }, [step, totalSteps]);

  const goBack = useCallback(() => {
    setDirection(-1);
    if (phase === 'lead') {
      setPhase('quiz');
    } else if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step, phase]);

  const selectAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const submitLead = useCallback(async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const { apiUrl } = await getRuntimeConfig();
      const res = await fetch(`${apiUrl}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone,
          company: leadForm.company,
          answers,
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
    const tier = getTierFromCredit(answers.credit || '');
    setResult(tier);
    setDirection(1);
    setPhase('result');
  }, [answers, leadForm, tcpaChecked]);

  const isLeadValid = leadForm.name.trim() && leadForm.email.trim() && tcpaChecked && !submitting;

  /* ——— Progress bar width ——— */
  const progressPct =
    phase === 'result' ? 100
      : phase === 'lead' ? ((totalSteps) / (totalSteps + 1)) * 100
        : ((step) / (totalSteps + 1)) * 100;

  return (
    <section style={{ minHeight: '100svh', background: '#F5F6FA', paddingTop: '120px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>

        {/* ── Progress Bar ── */}
        {phase !== 'result' && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#0A1F44', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                {phase === 'lead' ? 'Almost done' : `Question ${step + 1} of ${totalSteps}`}
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: '#9ca3af' }}>
                {Math.round(progressPct)}%
              </span>
            </div>
            <div style={{ height: '4px', borderRadius: '999px', background: '#e5e7eb', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(to right, #D4A017, #e6b422)' }}
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        )}

        {/* ── Quiz Questions ── */}
        <AnimatePresence mode="wait" custom={direction}>
          {phase === 'quiz' && (
            <motion.div
              key={`question-${step}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                color: '#0A1F44', marginBottom: '32px', lineHeight: 1.2,
              }}>
                {currentQuestion.question}
              </h1>

              {/* Radio options */}
              {currentQuestion.type === 'radio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQuestion.options.map((opt) => {
                    const selected = answers[currentQuestion.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => selectAnswer(currentQuestion.id, opt.value)}
                        style={{
                          width: '100%', textAlign: 'left', cursor: 'pointer',
                          padding: '18px 24px', borderRadius: '14px',
                          border: selected ? '2px solid #D4A017' : '2px solid #e5e7eb',
                          background: selected ? 'rgba(212,160,23,0.06)' : '#ffffff',
                          fontFamily: 'var(--font-body)', fontSize: '15px', color: '#0A1F44',
                          fontWeight: selected ? 600 : 400,
                          transition: 'all 0.2s ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          boxShadow: selected ? '0 4px 20px -4px rgba(212,160,23,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <span>{opt.label}</span>
                        {selected && (
                          <CheckCircle2 style={{ width: '20px', height: '20px', color: '#D4A017', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Dropdown */}
              {currentQuestion.type === 'dropdown' && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => selectAnswer(currentQuestion.id, e.target.value)}
                    style={{
                      width: '100%', padding: '18px 48px 18px 24px', borderRadius: '14px',
                      border: answers[currentQuestion.id] ? '2px solid #D4A017' : '2px solid #e5e7eb',
                      background: answers[currentQuestion.id] ? 'rgba(212,160,23,0.06)' : '#ffffff',
                      fontFamily: 'var(--font-body)', fontSize: '15px', color: '#0A1F44',
                      appearance: 'none', cursor: 'pointer',
                      boxShadow: answers[currentQuestion.id] ? '0 4px 20px -4px rgba(212,160,23,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <option value="">Select your county...</option>
                    {currentQuestion.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown style={{
                    position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)',
                    width: '20px', height: '20px', color: '#9ca3af', pointerEvents: 'none',
                  }} />
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
                {step > 0 ? (
                  <button
                    onClick={goBack}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '12px 20px', borderRadius: '10px',
                      border: '1px solid #e5e7eb', background: '#ffffff',
                      fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px',
                      color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                  >
                    <ArrowLeft style={{ width: '16px', height: '16px' }} />
                    Back
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={goNext}
                  disabled={!isAnswered}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '14px 28px', borderRadius: '10px',
                    border: 'none',
                    background: isAnswered ? '#D4A017' : '#e5e7eb',
                    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px',
                    color: isAnswered ? '#0A1F44' : '#9ca3af',
                    cursor: isAnswered ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: isAnswered ? '0 8px 30px -6px rgba(212,160,23,0.35)' : 'none',
                  }}
                >
                  {step === totalSteps - 1 ? 'Continue' : 'Next'}
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
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
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                color: '#0A1F44', marginBottom: '8px', lineHeight: 1.2,
              }}>
                Your results are ready!
              </h1>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '15px', color: '#6b7280',
                lineHeight: 1.6, marginBottom: '32px',
              }}>
                Enter your info below so we can send your personalized homeownership plan.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600,
                    fontSize: '13px', color: '#0A1F44', marginBottom: '6px', textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '12px',
                      border: '2px solid #e5e7eb', background: '#ffffff',
                      fontFamily: 'var(--font-body)', fontSize: '15px', color: '#0A1F44',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600,
                    fontSize: '13px', color: '#0A1F44', marginBottom: '6px', textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '12px',
                      border: '2px solid #e5e7eb', background: '#ffffff',
                      fontFamily: 'var(--font-body)', fontSize: '15px', color: '#0A1F44',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600,
                    fontSize: '13px', color: '#0A1F44', marginBottom: '6px', textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                  }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '12px',
                      border: '2px solid #e5e7eb', background: '#ffffff',
                      fontFamily: 'var(--font-body)', fontSize: '15px', color: '#0A1F44',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* TCPA Checkbox */}
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  marginTop: '8px', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={tcpaChecked}
                    onChange={(e) => setTcpaChecked(e.target.checked)}
                    style={{
                      width: '20px', height: '20px', marginTop: '2px',
                      accentColor: '#D4A017', flexShrink: 0, cursor: 'pointer',
                    }}
                  />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '12px', color: '#9ca3af',
                    lineHeight: 1.5,
                  }}>
                    {CONSENT_TEXT}
                  </span>
                </label>

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
                  <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#b91c1c', margin: 0 }}>
                    {submitError}
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '36px' }}>
                <button
                  onClick={goBack}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 20px', borderRadius: '10px',
                    border: '1px solid #e5e7eb', background: '#ffffff',
                    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px',
                    color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  <ArrowLeft style={{ width: '16px', height: '16px' }} />
                  Back
                </button>
                <button
                  onClick={submitLead}
                  disabled={!isLeadValid}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '14px 28px', borderRadius: '10px',
                    border: 'none',
                    background: isLeadValid ? '#D4A017' : '#e5e7eb',
                    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px',
                    color: isLeadValid ? '#0A1F44' : '#9ca3af',
                    cursor: isLeadValid ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: isLeadValid ? '0 8px 30px -6px rgba(212,160,23,0.35)' : 'none',
                  }}
                >
                  {submitting ? 'Sending…' : 'See My Results'}
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
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
                  <Home style={{ width: '28px', height: '28px', color: '#D4A017' }} />
                </div>
                <h1 style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800,
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0A1F44',
                  marginBottom: '8px', lineHeight: 1.2,
                }}>
                  Your Pathway: {result.title}
                </h1>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px',
                  color: '#6b7280', lineHeight: 1.6,
                }}>
                  Based on your answers, here&rsquo;s your personalized homeownership plan.
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
                    border: result.color !== 'gold' ? '1px solid #e5e7eb' : 'none',
                  }}>
                    {/* Top color band */}
                    <div style={{ height: '6px', background: s.bandGradient }} />

                    <div style={{ padding: '40px' }}>
                      {/* Badge */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: s.badgeBg, color: s.badgeText,
                        fontSize: '12px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                        padding: '6px 14px', borderRadius: '999px', marginBottom: '20px',
                      }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: s.dotColor,
                        }} />
                        Credit: {result.badge}
                      </div>

                      <h2 style={{
                        fontFamily: 'var(--font-heading)', fontWeight: 700,
                        fontSize: '24px', color: s.cardText, marginBottom: '12px',
                      }}>
                        {result.title}
                      </h2>

                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '15px',
                        color: s.descText, lineHeight: 1.7, marginBottom: '28px',
                      }}>
                        {result.description}
                      </p>

                      {/* Features */}
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {result.features.map((f) => (
                          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 style={{ width: '18px', height: '18px', color: s.checkColor, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: s.featureText }}>
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* What happens next */}
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600,
                        color: s.timelineText, marginBottom: '28px',
                      }}>
                        {result.timeline}
                      </p>

                      {/* CTA */}
                      <Link
                        href={result.ctaHref}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '10px',
                          padding: '16px 32px', borderRadius: '12px',
                          background: s.ctaBg, color: s.ctaText,
                          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px',
                          textDecoration: 'none',
                          boxShadow: '0 8px 30px -6px rgba(0,0,0,0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {result.cta}
                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Retake */}
              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <button
                  onClick={() => {
                    setStep(0);
                    setAnswers({});
                    setLeadForm({ name: '', email: '', phone: '', company: '' });
                    setTcpaChecked(false);
                    setResult(null);
                    setDirection(-1);
                    setPhase('quiz');
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px',
                    color: '#9ca3af', textDecoration: 'underline',
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
