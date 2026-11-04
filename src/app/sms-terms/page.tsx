import type { Metadata } from 'next';
import { LEGAL_UPDATED, LegalPage } from '@/components/page/LegalPage';

export const metadata: Metadata = { title: 'SMS Terms | Arthur T Realty' };

export default function SmsTermsPage() {
  return (
    <LegalPage
      title="SMS Terms & Conditions"
      updated={LEGAL_UPDATED}
      intro="These terms apply to text messages from the Arthur T Realty Homeownership Program."
      sections={[
        { heading: 'Program Description', paragraphs: [
          'When you opt in, Arthur T Realty sends text messages to guide you through our homeownership program: welcome messages, next-step links (credit monitoring, applications, workshop registration, and counseling scheduling), appointment reminders, check-ins, and replies to your questions.',
        ] },
        { heading: 'How to Opt In', paragraphs: [
          'You opt in by entering your mobile number and checking the consent box on a form on our website, or by giving consent to a member of our staff.',
        ] },
        { heading: 'Message Frequency', paragraphs: [
          'Message frequency varies based on your progress in the program, typically a few messages per week while you are completing a step.',
        ] },
        { heading: 'Cost', paragraphs: ['Message and data rates may apply. Check with your mobile carrier for details.'] },
        { heading: 'How to Opt Out', paragraphs: [
          'Reply STOP to any message at any time to stop receiving texts. You will receive one final message confirming you have been unsubscribed. Reply START to opt back in.',
        ] },
        { heading: 'Help', paragraphs: [
          'Reply HELP to any message for assistance, text us your question, or send us a message on our Contact page.',
        ] },
        { heading: 'Carriers', paragraphs: ['Mobile carriers are not liable for delayed or undelivered messages.'] },
        { heading: 'Privacy', paragraphs: [
          'We do not sell or share your mobile number or opt-in information with third parties for their marketing purposes. See our Privacy Policy for details.',
        ] },
      ]}
    />
  );
}
