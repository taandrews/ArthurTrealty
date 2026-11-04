import type { Metadata } from 'next';
import { LEGAL_UPDATED, LegalPage } from '@/components/page/LegalPage';

export const metadata: Metadata = { title: 'Terms of Service | Arthur T Realty' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={LEGAL_UPDATED}
      intro="By using the Arthur T Realty website and services, you agree to these Terms of Service. Please read them carefully."
      sections={[
        { heading: 'Our Services', paragraphs: [
          'Arthur T Realty provides real estate services through a Maryland-licensed real estate professional, along with homeownership education, guidance, and referrals to help Maryland residents prepare to buy, rent, or sell a home. We are not a mortgage lender, and we do not make loans or credit decisions. We are not a credit repair organization; credit restoration services are provided by independent licensed partners. We do not provide legal, tax, or financial advice.',
        ] },
        { heading: 'No Guarantees', paragraphs: [
          'Information on this website, including quiz results, is general and for educational purposes. Program eligibility, loan approval, interest rates, and credit outcomes are determined by third parties and depend on your individual situation. Individual results vary, and no specific outcome is guaranteed.',
        ] },
        { heading: 'Your Information', paragraphs: [
          'You agree to provide accurate information. Our use of your information is described in our Privacy Policy.',
        ] },
        { heading: 'Communications', paragraphs: [
          'By submitting a form and checking the consent box, you agree to receive calls (including automated and AI-generated voice calls), text messages, and emails from Arthur T Realty at the contact information you provide. Consent is not a condition of purchase. See our SMS Terms for details on text messaging.',
        ] },
        { heading: 'Third-Party Links and Services', paragraphs: [
          'Our website and messages may link to third-party services, such as credit monitoring, loan applications, and scheduling tools. Those services are governed by their own terms and privacy policies.',
        ] },
        { heading: 'Limitation of Liability', paragraphs: [
          'To the fullest extent permitted by law, Arthur T Realty is not liable for indirect, incidental, or consequential damages arising from your use of the website or services.',
        ] },
        { heading: 'Governing Law', paragraphs: ['These terms are governed by the laws of the State of Maryland.'] },
        { heading: 'Changes', paragraphs: ['We may update these terms from time to time. The “Last updated” date shows when they last changed.'] },
        { heading: 'Contact', paragraphs: ['Questions? Send us a message on our Contact page.'] },
      ]}
    />
  );
}
