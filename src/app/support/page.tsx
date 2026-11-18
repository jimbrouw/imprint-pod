import LegalPage, { Section, SUPPORT_EMAIL } from '@/components/LegalPage';

export const metadata = { title: 'Customer support | Drawn Checkout' };

export default function Page() {
  return (
    <LegalPage title="Customer support" updated="18 November 2026">
      <Section title="Get in touch">
        <p>
          Questions about a purchase, a download, a print order or a refund? Email{' '}
          <a className="underline text-brand-600" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We aim to reply
          within two working days.
        </p>
      </Section>
      <Section title="Please include">
        <p>The email address you used to pay, the artwork or event name, and roughly when you paid. Never send your card number.</p>
      </Section>
      <Section title="Who we are">
        <p>Drawn Checkout is run by James Brouwer, a sole trader based in the United Kingdom.</p>
      </Section>
    </LegalPage>
  );
}
