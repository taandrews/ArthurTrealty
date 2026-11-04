import Link from 'next/link';
import { Mail } from 'lucide-react';

// Short labels keep the footer compact; the navbar uses the full service names.
const serviceLinks = [
  { name: 'First-Time Buyers', href: '/first-time-buyer' },
  { name: 'Workshops', href: '/workshops' },
  { name: 'Renters to Homeowners', href: '/renters-to-homeowners' },
  { name: 'Rooms for Rent', href: '/rooms-for-rent' },
  { name: 'Credit Restoration', href: '/credit-repair' },
  { name: 'Veterans', href: '/veterans' },
  { name: 'Rent to Own', href: '/rent-to-own' },
  { name: 'Homeless to Homeowners', href: '/homeless-to-homeowners' },
  { name: 'Sell Your Home', href: '/sell-your-home' },
  { name: 'Investment Properties', href: '/investment-properties' },
];

const companyLinks = [
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
  { name: 'Find My First Step', href: '/quiz' },
];

const legalLinks = [
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'SMS Terms', href: '/sms-terms' },
];

const gutter = { maxWidth: '1300px', margin: '0 auto', paddingLeft: 'clamp(20px, 5vw, 96px)', paddingRight: 'clamp(20px, 5vw, 96px)' };
const heading = 'text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-gold';
const linkClass = 'inline-flex items-center min-h-6 text-white/70 text-[13px] font-body hover:text-white transition-colors';

function LinkList({ title, links, twoColumns = false }: { title: string; links: { name: string; href: string }[]; twoColumns?: boolean }) {
  return (
    <div>
      <h3 className={heading} style={{ marginBottom: '10px' }}>{title}</h3>
      <ul className={twoColumns ? 'columns-2' : ''} style={{ columnGap: '24px' }}>
        {links.map((link) => (
          <li key={link.href} style={{ breakInside: 'avoid', marginBottom: '2px', lineHeight: 1.35 }}>
            <Link href={link.href} className={linkClass}>{link.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-navy-dark text-white">
      <div style={{ ...gutter, paddingTop: '28px', paddingBottom: '22px' }}>
        <div className="footer-grid" style={{ display: 'grid', gap: '24px 40px' }}>
          {/* Brand + contact */}
          <div>
            <Link href="/" className="inline-block" style={{ marginBottom: '10px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-arthur-t-realty-white.png" alt="Arthur T Realty" style={{ height: '46px', width: 'auto', opacity: 0.9 }} />
            </Link>
            <div className="flex flex-col" style={{ rowGap: '2px', lineHeight: 1.35 }}>
              <Link href="/contact/" className={`flex items-center ${linkClass}`} style={{ gap: '8px' }}>
                <Mail className="w-3.5 h-3.5 text-gold" /> Send us a message
              </Link>
            </div>
          </div>

          <LinkList title="Services" links={serviceLinks} twoColumns />

          {/* Company and Legal sit side by side on small screens */}
          <div className="footer-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 40px' }}>
            <LinkList title="Company" links={companyLinks} />
            <LinkList title="Legal" links={legalLinks} />
          </div>
        </div>
      </div>

      {/* Disclaimer + copyright in one slim bar */}
      <div className="border-t border-white/[0.08]">
        <div className="footer-bottom" style={{ ...gutter, paddingTop: '14px', paddingBottom: '14px', display: 'flex', gap: '10px 32px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <p className="text-white/55 text-[11px] font-body" style={{ lineHeight: 1.55, maxWidth: '900px' }}>
            Real estate services are provided by a Maryland-licensed real estate professional. Arthur T Realty is not a mortgage lender or a credit repair organization. Credit repair services are provided by independent licensed partners. Individual results may vary. No specific outcomes are guaranteed. Arthur T Realty is not affiliated with the Maryland Mortgage Program or any government agency.
          </p>
          <p className="text-white/60 text-[11px] font-body" style={{ whiteSpace: 'nowrap' }}>
            &copy; {new Date().getFullYear()} Arthur T Realty · Powered by <a href="https://init1s.com" target="_blank" rel="noopener" className="text-gold underline underline-offset-2 hover:text-gold-light transition-colors">1is</a>
          </p>
        </div>
      </div>

      <style>{`
        .footer-grid { grid-template-columns: 1fr; }
        .footer-bottom { flex-direction: column; align-items: flex-start !important; }
        @media (min-width: 768px) {
          .footer-grid { grid-template-columns: auto 1fr; }
          .footer-grid > .footer-pair { grid-column: 1 / -1; grid-template-columns: repeat(2, max-content) !important; }
        }
        @media (min-width: 1024px) {
          .footer-grid { grid-template-columns: auto 1.6fr 1fr; }
          .footer-grid > .footer-pair { grid-column: auto; grid-template-columns: 1fr 1fr !important; }
          .footer-bottom { flex-direction: row; align-items: flex-end !important; }
        }
      `}</style>
    </footer>
  );
}
