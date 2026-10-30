'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, PhoneCall, MapPin, Check, ChevronDown } from 'lucide-react';
import { countyRegions } from '@/data/counties';
import { serviceGroups, QUIZ_LABEL } from '@/data/serviceGroups';

const gutter = { maxWidth: '1300px', margin: '0 auto', paddingLeft: 'clamp(24px, 5vw, 96px)', paddingRight: 'clamp(24px, 5vw, 96px)' };
const sectionTitle = { fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '16px' };

/* ——— How it works: the Home Buyer Journey in plain words ——— */
const inlineLink = { color: '#0A1F44', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: '#D4A017' } as const;

const steps: { title: string; desc: React.ReactNode }[] = [
  { title: 'Take the 2-minute quiz', desc: 'Tell us where you are today. The quiz does not check your credit.' },
  { title: 'Get your next step', desc: 'Our AI assistant calls you with one clear step at a time, between 9am and 8pm.' },
  {
    title: 'Complete your training',
    desc: <>A <Link href="/workshops" style={inlineLink}>homeownership workshop</Link> and a one-on-one session with a Certified Homeownership Counselor.</>,
  },
  { title: 'Become mortgage-ready', desc: 'Credit, application, and savings plan in place, so you can start looking for your home.' },
];

const goldButton = {
  display: 'inline-flex', alignItems: 'center', gap: '12px',
  padding: '16px 32px', background: '#D4A017', color: '#0A1F44',
  fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px',
  borderRadius: '8px', textDecoration: 'none',
} as const;

// The homepage shows one or two links per goal; workshops and credit help are linked where they come up.
const HOME_HIDDEN = new Set(['/renters-to-homeowners', '/workshops', '/credit-repair']);
const doors = serviceGroups.map((g) => ({ ...g, links: g.links.filter((l) => !HOME_HIDDEN.has(l.href)) }));

export default function HomePage() {
  return (
    <>
      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1920&q=80"
            alt="Beautiful Maryland home"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(6,15,34,0.92) 0%, rgba(10,31,68,0.8) 50%, rgba(6,15,34,0.65) 100%)' }} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20" style={{ height: '3px', background: 'linear-gradient(to right, transparent, #D4A017, transparent)' }} />

        <div className="relative z-10 w-full" style={{ ...gutter, paddingTop: '140px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '720px' }}>
            <h1
              className="rise font-heading font-extrabold text-white leading-[1.08]"
              style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.25rem)', marginBottom: '24px', animationDelay: '0.1s' }}
            >
              One clear step at a time, from{' '}
              <span className="text-gold">renting to owning</span>
            </h1>

            <p
              className="rise text-white/85 font-body leading-relaxed"
              style={{ fontSize: 'clamp(16px, 2vw, 20px)', marginBottom: '40px', maxWidth: '580px', animationDelay: '0.2s' }}
            >
              Arthur T Realty&rsquo;s AI homeownership assistant calls you with your next step and guides you to Maryland homeownership programs and down payment assistance, no matter your credit situation.
            </p>

            <div className="rise flex flex-wrap" style={{ gap: '16px', animationDelay: '0.3s' }}>
              <Link href="/quiz" style={goldButton}>
                {QUIZ_LABEL}
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <a
                href="#how-it-works"
                style={{
                  ...goldButton, fontWeight: 600, background: 'rgba(255,255,255,0.1)', color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                See How It Works
                <ChevronDown style={{ width: '16px', height: '16px' }} />
              </a>
            </div>

            <ul
              className="rise flex flex-wrap font-body text-white/85"
              style={{ gap: '8px 24px', marginTop: '24px', fontSize: '14px', listStyle: 'none', animationDelay: '0.4s' }}
            >
              {['Free', 'About 2 minutes', 'No credit check'].map((t) => (
                <li key={t} className="flex items-center" style={{ gap: '8px' }}>
                  <Check aria-hidden style={{ width: '16px', height: '16px', color: '#D4A017' }} /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" style={{ paddingTop: '96px', paddingBottom: '96px', background: '#F5F6FA', scrollMarginTop: '96px' }}>
        <div style={gutter}>
          <div style={{ maxWidth: '640px', marginBottom: '56px' }}>
            <h2 className="font-heading font-extrabold text-navy" style={sectionTitle}>How It Works</h2>
            <p className="text-gray-text font-body" style={{ fontSize: '17px', lineHeight: '1.6' }}>
              Your AI assistant calls you with one clear step at a time, so you always know what to do next.
            </p>
          </div>

          <ol className="steps" style={{ listStyle: 'none', display: 'grid', gap: '32px' }}>
            {steps.map((step, i) => (
              <li key={step.title} className="step" style={{ position: 'relative' }}>
                <span
                  aria-hidden
                  className="font-heading"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: i === steps.length - 1 ? '#D4A017' : '#0A1F44',
                    color: i === steps.length - 1 ? '#0A1F44' : '#ffffff',
                    fontWeight: 700, fontSize: '16px', marginBottom: '20px', position: 'relative', zIndex: 1,
                  }}
                >
                  {i + 1}
                </span>
                <h3 className="font-heading text-navy" style={{ fontSize: '19px', marginBottom: '8px' }}>{step.title}</h3>
                <p className="text-gray-text font-body" style={{ fontSize: '15px', lineHeight: '1.6', maxWidth: '34ch' }}>{step.desc}</p>
              </li>
            ))}
          </ol>

          {/* The AI assistant is the service */}
          <div
            className="arthur-panel"
            style={{
              marginTop: '56px', background: '#0A1F44', borderRadius: '16px',
              padding: 'clamp(24px, 4vw, 40px)', display: 'flex', alignItems: 'center', gap: '24px 32px',
            }}
          >
            <div
              aria-hidden
              style={{
                width: '88px', height: '88px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(212,160,23,0.15)', border: '2px solid #D4A017',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <PhoneCall style={{ width: '36px', height: '36px', color: '#D4A017' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="font-heading text-white" style={{ fontSize: '22px', marginBottom: '8px' }}>Your homeownership assistant, on call</h3>
              <p className="font-body" style={{ fontSize: '16px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', maxWidth: '60ch' }}>
                It calls you with your next step, answers your questions about the program, and keeps you on track. It always tells you it&rsquo;s an AI assistant, and you can tell it to stop calling anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ WHAT WOULD YOU LIKE TO DO ═══════ */}
      <section style={{ paddingTop: '96px', paddingBottom: '96px', background: '#ffffff' }}>
        <div style={gutter}>
          <h2 className="font-heading font-extrabold text-navy" style={{ ...sectionTitle, marginBottom: '40px' }}>
            What Would You Like to Do?
          </h2>

          <ul style={{ listStyle: 'none', borderTop: '1px solid #E2E4EA' }}>
            {doors.map((group) => (
              <li key={group.goal} className="door" style={{ borderBottom: '1px solid #E2E4EA', padding: '32px 0', display: 'grid', gap: '16px 48px' }}>
                <div>
                  <h3 className="font-heading text-navy" style={{ fontSize: 'clamp(22px, 2.4vw, 28px)', marginBottom: '8px' }}>
                    {group.links.length === 1 ? (
                      <Link href={group.links[0].href} className="door-title" style={{ textDecoration: 'none', color: 'inherit' }}>
                        {group.goal} <ArrowRight aria-hidden style={{ width: '22px', height: '22px', color: '#D4A017', display: 'inline', verticalAlign: '-3px' }} />
                      </Link>
                    ) : group.goal}
                  </h3>
                  <p className="text-gray-text font-body" style={{ fontSize: '16px', lineHeight: '1.6', maxWidth: '52ch' }}>{group.desc}</p>
                </div>
                {group.links.length > 1 && (
                  <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '10px', alignContent: 'start' }}>
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="door-link font-body"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px',
                            padding: '0 16px', borderRadius: '999px', border: '1px solid #E2E4EA',
                            color: '#0A1F44', fontSize: '15px', fontWeight: 500, textDecoration: 'none',
                          }}
                        >
                          <link.icon aria-hidden style={{ width: '16px', height: '16px', color: '#D4A017' }} />
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══════ CREDIT ═══════ */}
      <section style={{ paddingTop: '96px', paddingBottom: '96px', background: '#F5F6FA' }}>
        <div className="credit" style={{ ...gutter, display: 'grid', gap: '24px 64px', alignItems: 'center' }}>
          <h2 className="font-heading font-extrabold text-navy" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15 }}>
            Good, bad, or no credit, there’s a first step.
          </h2>
          <div>
            <p className="text-gray-text font-body" style={{ fontSize: '17px', lineHeight: '1.65', maxWidth: '60ch' }}>
              You don’t need to know your score. The quiz asks a few simple questions, and we’ll suggest where to start: a homebuying program, <Link href="/credit-repair" style={inlineLink}>credit help through licensed partners</Link>, or <Link href="/rent-to-own" style={inlineLink}>rent-to-own</Link> while you get ready.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ COUNTY COVERAGE ═══════ */}
      <section style={{ paddingTop: '96px', paddingBottom: '96px', background: '#ffffff' }}>
        <div style={gutter}>
          <h2 className="font-heading font-extrabold text-navy leading-tight" style={sectionTitle}>
            Serving All of Maryland
          </h2>
          <p className="text-gray-text font-body flex items-center" style={{ fontSize: '17px', lineHeight: '1.6', gap: '10px' }}>
            <MapPin aria-hidden style={{ width: '20px', height: '20px', color: '#D4A017', flexShrink: 0 }} />
            All 23 counties and Baltimore City, from Western Maryland to the Eastern Shore.
          </p>

          <details className="counties" style={{ marginTop: '20px' }}>
            <summary
              className="font-heading text-navy"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', listStyle: 'none' }}
            >
              See every county <ChevronDown aria-hidden className="chev" style={{ width: '16px', height: '16px', color: '#D4A017' }} />
            </summary>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '28px', marginTop: '20px' }}>
              {Object.entries(countyRegions).map(([region, counties]) => (
                <div key={region}>
                  <h3 className="font-heading text-navy" style={{ fontSize: '14px', marginBottom: '8px' }}>{region}</h3>
                  <p className="text-gray-text font-body" style={{ fontSize: '15px', lineHeight: '1.6' }}>{counties.join(' · ')}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="relative overflow-hidden" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=75"
            alt="House keys on a key ring beside a small model house"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(6,15,34,0.9), rgba(10,31,68,0.82), rgba(6,15,34,0.9))' }} />
        </div>

        <div className="absolute top-0 left-0 right-0" style={{ height: '3px', background: 'linear-gradient(to right, transparent, #D4A017, transparent)', zIndex: 10 }} />

        <div className="relative" style={{ zIndex: 10, maxWidth: '680px', margin: '0 auto', paddingLeft: 'clamp(24px, 5vw, 96px)', paddingRight: 'clamp(24px, 5vw, 96px)', textAlign: 'center' }}>
          <h2
            className="font-heading font-extrabold text-white"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: '1.1', marginBottom: '20px' }}
          >
            Ready to Stop Renting?
          </h2>
          <p className="text-white/85 font-body" style={{ fontSize: '17px', lineHeight: '1.6', marginBottom: '40px' }}>
            Take the first step. Our free quiz takes about 2 minutes and matches you with Maryland programs.
          </p>
          <Link href="/quiz" style={{ ...goldButton, padding: '18px 40px', fontSize: '16px', borderRadius: '10px' }}>
            {QUIZ_LABEL}
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </Link>
        </div>
      </section>

      <style>{`
        .steps { grid-template-columns: 1fr; }
        .arthur-panel { flex-direction: column; align-items: flex-start !important; }
        .door { grid-template-columns: 1fr; }
        .credit { grid-template-columns: 1fr; }
        .door-link { transition: border-color .2s, background-color .2s; }
        .door-link:hover { border-color: #D4A017 !important; background: #FDF8EE; }
        .door-title:hover { color: #B8870E !important; }
        .counties summary::-webkit-details-marker { display: none; }
        .counties[open] .chev { transform: rotate(180deg); }
        @media (min-width: 768px) {
          .steps { grid-template-columns: repeat(2, 1fr); }
          .arthur-panel { flex-direction: row; align-items: center !important; }
          .credit { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .steps { grid-template-columns: repeat(4, 1fr); }
          .step:not(:last-child)::after {
            content: ''; position: absolute; top: 22px; left: 56px; right: -20px;
            height: 2px; background: #E2E4EA;
          }
          .door { grid-template-columns: 1fr 1.1fr; }
        }
      `}</style>
    </>
  );
}
