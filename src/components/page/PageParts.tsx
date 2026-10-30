import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

/* Shared building blocks for inner pages. Spacing is inline (like the homepage) because the
   global reset in globals.css overrides Tailwind padding and margin classes. */

export const HERO_IMAGES = {
  house: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1920&q=80',
  keys: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=75',
  porch: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1920&q=75',
  brick: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1920&q=75',
};

const gutter = { paddingLeft: 'clamp(24px, 5vw, 96px)', paddingRight: 'clamp(24px, 5vw, 96px)' };

export function Container({ children, width = 1300 }: { children: React.ReactNode; width?: number }) {
  return <div style={{ maxWidth: `${width}px`, margin: '0 auto', ...gutter }}>{children}</div>;
}

export function PageHero({
  eyebrow, title, subtitle, image = HERO_IMAGES.house, cta = { label: 'Find My First Step', href: '/quiz' },
}: { eyebrow?: string; title: string; subtitle?: string; image?: string; cta?: { label: string; href: string } | false }) {
  return (
    <section className="relative overflow-hidden" style={{ paddingTop: '180px', paddingBottom: '96px' }}>
      <div className="absolute inset-0">
        <Image src={image} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(6,15,34,0.94) 0%, rgba(10,31,68,0.82) 55%, rgba(6,15,34,0.7) 100%)' }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '3px', background: 'linear-gradient(to right, transparent, #D4A017, transparent)', zIndex: 10 }} />
      <div className="relative" style={{ zIndex: 10 }}>
        <Container>
          <div style={{ maxWidth: '760px' }}>
            {eyebrow && (
              <p className="font-heading font-bold text-gold" style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px' }}>
                {eyebrow}
              </p>
            )}
            <h1 className="font-heading font-800 text-white" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', lineHeight: 1.1, marginBottom: subtitle ? '20px' : 0 }}>
              {title}
            </h1>
            {subtitle && (
              <p className="font-body" style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(16px, 1.8vw, 19px)', lineHeight: 1.6, maxWidth: '620px' }}>
                {subtitle}
              </p>
            )}
            {cta && (
              <div style={{ marginTop: '36px' }}>
                <GoldButton href={cta.href}>{cta.label}</GoldButton>
              </div>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}

export function GoldButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '16px 32px',
        background: '#D4A017', color: '#0A1F44', fontFamily: 'var(--font-heading)', fontWeight: 700,
        fontSize: '15px', borderRadius: '8px', textDecoration: 'none',
      }}
    >
      {children}
      <ArrowRight style={{ width: '16px', height: '16px' }} />
    </Link>
  );
}

export function Section({ children, tone = 'white', id }: { children: React.ReactNode; tone?: 'white' | 'gray' | 'navy'; id?: string }) {
  const background = tone === 'gray' ? '#F5F6FA' : tone === 'navy' ? '#0A1F44' : '#FFFFFF';
  return (
    <section id={id} style={{ background, paddingTop: '88px', paddingBottom: '88px' }}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({ title, intro, center = false, light = false }: { title: string; intro?: string; center?: boolean; light?: boolean }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: '40px', maxWidth: center ? '680px' : '760px', marginLeft: center ? 'auto' : 0, marginRight: center ? 'auto' : 0 }}>
      <h2 className="font-heading font-800" style={{ color: light ? '#FFFFFF' : '#0A1F44', fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', lineHeight: 1.15, marginBottom: intro ? '14px' : 0 }}>
        {title}
      </h2>
      {intro && (
        <p className="font-body" style={{ color: light ? 'rgba(255,255,255,0.7)' : '#5A6376', fontSize: '16px', lineHeight: 1.7 }}>
          {intro}
        </p>
      )}
    </div>
  );
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {paragraphs.map((p) => (
        <p key={p} className="font-body" style={{ color: '#3F4759', fontSize: '16px', lineHeight: 1.75 }}>{p}</p>
      ))}
    </div>
  );
}

export function CardGrid({ items, columns = 3 }: { items: { title: string; text: string }[]; columns?: 2 | 3 | 4 }) {
  return (
    <div className={`card-grid-${columns}`} style={{ display: 'grid', gap: '20px' }}>
      {items.map((item) => (
        <div key={item.title} style={{ background: '#FFFFFF', border: '1px solid #E2E4EA', borderRadius: '16px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(to right, #D4A017, #E8BF4A)' }} />
          <h3 className="font-heading font-bold text-navy" style={{ fontSize: '17px', lineHeight: 1.3, marginBottom: '10px' }}>{item.title}</h3>
          <p className="font-body" style={{ color: '#5A6376', fontSize: '14.5px', lineHeight: 1.65 }}>{item.text}</p>
        </div>
      ))}
      <style>{`
        .card-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .card-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .card-grid-4 { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 1024px) { .card-grid-3, .card-grid-4 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .card-grid-2, .card-grid-3, .card-grid-4 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <div className="steps-grid" style={{ display: 'grid', gap: '24px', gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
      {steps.map((s, i) => (
        <div key={s.title}>
          <div className="font-heading font-800" style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#D4A017', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginBottom: '16px' }}>
            {i + 1}
          </div>
          <h3 className="font-heading font-bold" style={{ color: '#FFFFFF', fontSize: '18px', marginBottom: '8px' }}>{s.title}</h3>
          <p className="font-body" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: 1.65 }}>{s.text}</p>
        </div>
      ))}
      <style>{`@media (max-width: 860px) { .steps-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
      {items.map((item) => (
        <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <CheckCircle2 style={{ width: '20px', height: '20px', color: '#D4A017', flexShrink: 0, marginTop: '2px' }} />
          <span className="font-body" style={{ color: '#3F4759', fontSize: '16px', lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <details key={item.q} style={{ background: '#FFFFFF', border: '1px solid #E2E4EA', borderRadius: '12px', padding: '18px 22px' }}>
          <summary className="font-heading font-bold text-navy" style={{ fontSize: '16px', cursor: 'pointer', lineHeight: 1.4 }}>{item.q}</summary>
          <p className="font-body" style={{ color: '#5A6376', fontSize: '15px', lineHeight: 1.7, marginTop: '12px' }}>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function Disclaimer({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ maxWidth: '860px', background: '#F5F6FA', borderLeft: '4px solid #D4A017', borderRadius: '8px', padding: '20px 24px' }}>
      <p className="font-heading font-bold text-navy" style={{ fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{title}</p>
      <p className="font-body" style={{ color: '#5A6376', fontSize: '13.5px', lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}
