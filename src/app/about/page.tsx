import type { Metadata } from 'next';
import { CardGrid, CheckList, GoldButton, PageHero, Prose, Section, SectionHeading } from '@/components/page/PageParts';

export const metadata: Metadata = {
  title: 'About Arthur T Realty | Maryland Homeownership Programs',
  description: 'Arthur T Realty helps Maryland renters become homeowners with programs, education, and step-by-step guidance.',
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Helping Maryland Renters Become Homeowners"
        subtitle="Arthur T Realty exists for one reason: to help more Maryland families own a home of their own."
      />

      <Section>
        <SectionHeading title="Our Mission" />
        <Prose paragraphs={[
          'Too many hardworking Maryland renters believe homeownership is out of reach because of their credit, their savings, or simply not knowing where to start. We believe there is a path for almost everyone, and that no one should have to walk it alone.',
          'We combine homeownership programs, education, and credit guidance into one clear journey, and our AI homeownership assistant guides you through it by phone, from your first question to the day you are ready to buy.',
        ]} />
      </Section>

      <Section tone="gray">
        <SectionHeading title="Who We Serve" />
        <CardGrid columns={3} items={[
          { title: 'First-Time Buyers', text: 'Renters ready to buy their first home and looking for programs and guidance.' },
          { title: 'Credit Rebuilders', text: 'People with bad, limited, or no credit who need a realistic plan.' },
          { title: 'Veterans & Families', text: 'Service members, veterans, and families looking for stable homes.' },
          { title: 'People Starting Over', text: 'Anyone facing housing instability who wants a fresh start.' },
          { title: 'Sellers', text: 'Homeowners ready to sell and move on to their next chapter.' },
          { title: 'Investors', text: 'Buyers building rental income and long-term wealth through real estate.' },
        ]} />
      </Section>

      <Section>
        <SectionHeading title="How We Work" />
        <CheckList items={[
          'A clear five-step program: credit monitoring, mortgage application, Land Trust application, homeownership workshop, and one-on-one counseling',
          'An AI homeownership assistant that calls you with one clear next step at a time',
          'Shame-free guidance, whatever your credit or financial history',
          'Service across all 23 Maryland counties and Baltimore City',
        ]} />
      </Section>

      <Section tone="navy">
        <div style={{ textAlign: 'center' }}>
          <SectionHeading center light title="Ready to Start?" intro="Take our free two-minute quiz to see which path fits you." />
          <GoldButton href="/quiz">Find My First Step</GoldButton>
        </div>
      </Section>
    </>
  );
}
