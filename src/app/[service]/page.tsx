import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CardGrid, CheckList, Disclaimer, Faq, PageHero, Prose, Section, SectionHeading, Steps,
} from '@/components/page/PageParts';
import { LeadForm } from '@/components/page/LeadForm';
import { SERVICES } from '@/data/services';

// Only the service pages listed in data/services.ts exist; any other path is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ service: s.slug }));
}

type Props = { params: Promise<{ service: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { service } = await params;
  const page = SERVICES.find((s) => s.slug === service);
  if (!page) return {};
  return { title: `${page.metaTitle} | Arthur T Realty`, description: page.metaDescription };
}

export default async function ServicePage({ params }: Props) {
  const { service } = await params;
  const page = SERVICES.find((s) => s.slug === service);
  if (!page) notFound();

  return (
    <>
      <PageHero eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} image={page.image} cta={page.heroCta} />

      <Section>
        <Prose paragraphs={page.intro} />
      </Section>

      <Section tone="gray">
        <SectionHeading title={page.cardsTitle} intro={page.cardsIntro} />
        <CardGrid items={page.cards} columns={page.cards.length === 4 ? 4 : 3} />
      </Section>

      <Section tone="navy">
        <SectionHeading title="How It Works" light />
        <Steps steps={page.steps} />
      </Section>

      <Section>
        <SectionHeading title="Who This Is For" />
        <CheckList items={page.forWho} />
      </Section>

      <Section tone="gray">
        <SectionHeading title="Frequently Asked Questions" />
        <Faq items={page.faqs} />
        {page.disclaimer && (
          <div style={{ marginTop: '32px' }}>
            <Disclaimer title={page.disclaimer.title} text={page.disclaimer.text} />
          </div>
        )}
      </Section>

      <Section>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <LeadForm
            interest={page.slug}
            title={page.formTitle}
            submitLabel={page.submitLabel}
            subtitle="Tell us a little about yourself and your homeownership assistant will call or text you with your next step."
          />
        </div>
      </Section>
    </>
  );
}
