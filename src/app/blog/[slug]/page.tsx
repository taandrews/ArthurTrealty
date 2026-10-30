import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CheckList, GoldButton, PageHero, Section } from '@/components/page/PageParts';
import { ARTICLES } from '@/data/articles';

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  return a ? { title: `${a.title} | Arthur T Realty`, description: a.summary } : {};
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = ARTICLES.find((x) => x.slug === slug);
  if (!article) notFound();

  return (
    <>
      <PageHero eyebrow={article.category} title={article.title} subtitle={article.summary} cta={false} />
      <Section>
        <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {article.body.map((block, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {block.heading && <h2 className="font-heading font-800 text-navy" style={{ fontSize: '22px' }}>{block.heading}</h2>}
              {block.text && <p className="font-body" style={{ color: '#3F4759', fontSize: '17px', lineHeight: 1.75 }}>{block.text}</p>}
              {block.points && <CheckList items={block.points} />}
            </div>
          ))}
          <div style={{ marginTop: '16px', paddingTop: '28px', borderTop: '1px solid #E2E4EA', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/blog" className="font-heading font-bold text-navy" style={{ fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <ArrowLeft style={{ width: '16px', height: '16px' }} /> All resources
            </Link>
            <GoldButton href="/quiz">Find My First Step</GoldButton>
          </div>
        </div>
      </Section>
    </>
  );
}
