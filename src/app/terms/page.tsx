import LegalPage, { Section, SUPPORT_EMAIL } from '@/components/LegalPage';

export const metadata = { title: 'Terms of service | Drawn Checkout' };

export default function Page() {
  return (
    <LegalPage title="Terms of service" updated="18 November 2026">
      <Section title="Who we are">
        <p>
          Drawn Checkout is operated by James Brouwer, a sole trader in the United Kingdom. It lets artists sell drawings
          (digital downloads and prints) through a link or QR code. Contact:{' '}
          <a className="underline text-brand-600" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
      <Section title="Buying">
        <p>
          Prices are shown in pounds sterling and are the full price you pay. Payment is taken securely by Stripe. Your
          order is confirmed once payment succeeds, and we email you a link to your drawing if you gave us an email
          address.
        </p>
        <p>Digital drawings are for your personal use. You may not resell or redistribute them without the artist&apos;s permission.</p>
      </Section>
      <Section title="Selling">
        <p>
          Artists receive payment through Stripe Connect and must complete Stripe&apos;s identity checks. We take a
          platform fee from each sale, shown before you start selling. You must own, or have the right to sell, everything
          you upload, and must not upload anything unlawful.
        </p>
      </Section>
      <Section title="Refunds">
        <p>See our refunds page for how refunds, returns and chargebacks work.</p>
      </Section>
      <Section title="Our responsibility">
        <p>
          We do our best to keep the service running but cannot promise it will always be available. Nothing in these terms
          limits your legal rights as a consumer or any liability that cannot be limited by law.
        </p>
      </Section>
      <Section title="Changes and law">
        <p>We may update these terms and will change the date above when we do. They are governed by the laws of England and Wales.</p>
      </Section>
    </LegalPage>
  );
}
