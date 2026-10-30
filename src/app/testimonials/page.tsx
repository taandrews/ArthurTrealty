import type { Metadata } from 'next';
import { GoldButton, PageHero, Section, SectionHeading } from '@/components/page/PageParts';

export const metadata: Metadata = {
  title: 'Client Stories | Arthur T Realty',
  description: 'Stories from Maryland renters who became homeowners with Arthur T Realty.',
};

// Only real, permission-granted client stories belong here; add them as they come in.
export default function TestimonialsPage() {
  return (
    <>
      <PageHero
        eyebrow="Client Stories"
        title="Real Stories From Real Maryland Families"
        subtitle="Every client's path is different. We're gathering stories from the families we've helped, with their permission."
      />
      <Section>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
          <SectionHeading center title="Your Story Could Be Next" intro="Find out which homeownership path fits you in about two minutes. It's free and there's no obligation." />
          <GoldButton href="/quiz">Take the Free Quiz</GoldButton>
        </div>
      </Section>
    </>
  );
}
