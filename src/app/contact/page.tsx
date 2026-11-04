import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { PageHero, Section } from '@/components/page/PageParts';
import { LeadForm } from '@/components/page/LeadForm';
import { SERVICE_OPTIONS } from '@/data/services';

export const metadata: Metadata = {
  title: 'Contact Arthur T Realty',
  description: 'Contact Arthur T Realty about buying, renting, or selling a home in Maryland.',
};

const contactItems = [
  { icon: MapPin, label: 'Service area', value: 'All of Maryland: 23 counties and Baltimore City', href: undefined as string | undefined },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's Talk About Your Home Goals"
        subtitle="Send us a message and our assistant will follow up with your next step."
        cta={false}
      />
      <Section tone="gray">
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '40px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {contactItems.map(({ icon: Icon, label, value, href }) => (
              <div key={label} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: '#FFFFFF', border: '1px solid #E2E4EA', borderRadius: '14px', padding: '22px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(212,160,23,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '20px', height: '20px', color: '#D4A017' }} />
                </div>
                <div>
                  <p className="font-heading font-bold" style={{ fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A6376', marginBottom: '4px' }}>{label}</p>
                  {href
                    ? <a href={href} className="font-body text-navy" style={{ fontSize: '16px', textDecoration: 'none', fontWeight: 600 }}>{value}</a>
                    : <p className="font-body text-navy" style={{ fontSize: '16px', fontWeight: 600 }}>{value}</p>}
                </div>
              </div>
            ))}
          </div>
          <LeadForm interest="contact" title="Send Us a Message" submitLabel="Send Message" options={[{ value: 'contact', label: 'General question' }, ...SERVICE_OPTIONS]} />
        </div>
        <style>{`@media (max-width: 900px) { .contact-grid { grid-template-columns: 1fr !important; } }`}</style>
      </Section>
    </>
  );
}
