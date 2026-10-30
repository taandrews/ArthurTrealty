import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GoldButton, PageHero, Section } from '@/components/page/PageParts';
import { ARTICLES } from '@/data/articles';

export const metadata: Metadata = {
  title: 'Homeownership Resources & Blog | Arthur T Realty',
  description: 'Guides on credit, mortgages, down payment assistance, and owning a home in Maryland.',
};

export default function BlogPage() {
  return (
    <>
      <PageHero eyebrow="Resources" title="Homeownership Resources" subtitle="Plain-English guides to credit, mortgages, and owning your home." cta={false} />
      <Section tone="gray">
        <div className="blog-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', alignItems: 'start' }}>
          <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {ARTICLES.map((a) => (
              <Link key={a.slug} href={`/blog/${a.slug}`} style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #E2E4EA', borderRadius: '16px', padding: '26px', textDecoration: 'none' }}>
                <span className="font-heading font-bold" style={{ color: '#B8890F', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{a.category}</span>
                <h2 className="font-heading font-bold text-navy" style={{ fontSize: '18px', lineHeight: 1.3, marginBottom: '10px' }}>{a.title}</h2>
                <p className="font-body" style={{ color: '#5A6376', fontSize: '14.5px', lineHeight: 1.6, marginBottom: '16px', flexGrow: 1 }}>{a.summary}</p>
                <span className="font-heading font-bold text-navy" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Read more <ArrowRight style={{ width: '14px', height: '14px' }} />
                </span>
              </Link>
            ))}
          </div>
          <aside style={{ background: '#0A1F44', borderRadius: '16px', padding: '28px', position: 'sticky', top: '120px' }}>
            <h2 className="font-heading font-800" style={{ color: '#FFFFFF', fontSize: '20px', lineHeight: 1.3, marginBottom: '10px' }}>Not sure where to start?</h2>
            <p className="font-body" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14.5px', lineHeight: 1.6, marginBottom: '22px' }}>
              Take our free two-minute quiz to see which homeownership path fits you.
            </p>
            <GoldButton href="/quiz">Take the Quiz</GoldButton>
          </aside>
        </div>
        <style>{`
          @media (max-width: 980px) { .blog-layout { grid-template-columns: 1fr !important; } .blog-layout aside { position: static !important; } }
          @media (max-width: 640px) { .blog-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>
    </>
  );
}
