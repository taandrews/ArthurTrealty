import type { Metadata } from 'next';
import { CONTACT_EMAIL, CONTACT_PHONE, LEGAL_UPDATED, LegalPage } from '@/components/page/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy | Arthur T Realty' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={LEGAL_UPDATED}
      intro="This Privacy Policy explains how Arthur T Realty (“we,” “us”) collects, uses, and protects your information when you use our website, forms, and communications."
      sections={[
        { heading: 'Information We Collect', points: [
          'Contact information you provide, such as your name, email address, and phone number.',
          'Answers you give in our quiz and forms, such as your homeownership goals, timeline, credit range, income range, savings, and county.',
          'Information about your progress in our program, such as completed steps, appointment details, and savings information you share with us.',
          'Your communications with us, including text message replies and emails.',
          'Basic technical information, such as your IP address and browser type, when you submit a form.',
        ] },
        { heading: 'How We Use Your Information', points: [
          'To contact you about homeownership programs and services you asked about, by phone (including automated and AI-generated voice calls), text message, and email.',
          'To guide you through our program, send reminders, and schedule workshops and counseling sessions.',
          'To connect you with partners you request help from, such as lenders or licensed credit restoration providers.',
          'To keep records of your consent and to comply with the law.',
          'To improve our services.',
        ] },
        { heading: 'Text Messaging', paragraphs: [
          'We do not sell or share your mobile phone number or text messaging opt-in information with third parties or affiliates for their marketing purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.',
        ] },
        { heading: 'How We Share Information', paragraphs: [
          'We do not sell your personal information. We share it only with service providers who help us operate (for example, hosting, email, text messaging, and calling services), with partners you ask us to connect you with, or when required by law.',
        ] },
        { heading: 'How We Protect Information', paragraphs: [
          'We use industry-standard safeguards, including encryption in transit and access controls, to protect your information. No method of transmission or storage is completely secure.',
        ] },
        { heading: 'Your Choices', points: [
          'Reply STOP to any text message to stop texts.',
          'Use the unsubscribe link in any email to stop emails.',
          `Contact us at ${CONTACT_EMAIL} to ask what information we have about you, or to request that we correct or delete it.`,
        ] },
        { heading: 'Contact Us', paragraphs: [`Questions about this policy? Email ${CONTACT_EMAIL} or call ${CONTACT_PHONE}.`] },
      ]}
    />
  );
}
