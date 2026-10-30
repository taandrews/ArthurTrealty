import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MotionProvider } from '@/components/layout/MotionProvider';

export const metadata: Metadata = {
  title: 'Arthur T Realty | Maryland Homeownership Programs for Renters',
  description: 'Arthur T Realty connects Maryland renters with homeownership programs, down payment assistance, rent-to-own opportunities, and credit repair services. Start your path from renting to owning today.',
  openGraph: {
    title: 'Arthur T Realty | Maryland Homeownership Programs for Renters',
    description: 'Your path from renting to owning starts here. Programs for all credit types across all 23 Maryland counties and Baltimore City.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <MotionProvider>
          <Navbar />
          <main id="main" tabIndex={-1}>{children}</main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
