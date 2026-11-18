import LegalPage, { Section, SUPPORT_EMAIL } from '@/components/LegalPage';

export const metadata = { title: 'Privacy policy | Drawn Checkout' };

export default function Page() {
  return (
    <LegalPage title="Privacy policy" updated="18 November 2026">
      <Section title="Who is responsible">
        <p>
          James Brouwer, a sole trader in the United Kingdom, runs Drawn Checkout and is the data controller. Contact:{' '}
          <a className="underline text-brand-600" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
      <Section title="What we collect">
        <p>Customers: the email address, name and postcode you give at checkout, and, for prints, your delivery address.</p>
        <p>Artists: your name, email address, sign-in details and the information Stripe collects to verify you and pay you.</p>
        <p>We never see or store your full card number. Stripe handles it.</p>
      </Section>
      <Section title="Why we use it">
        <p>To take payment, deliver your drawing or print, send receipts and download links, prevent fraud, pay artists and handle refunds. We do not sell your data or use it for advertising.</p>
      </Section>
      <Section title="Who we share it with">
        <p>
          Stripe (payments), Clerk (artist sign-in), Convex (database), Vercel (hosting), our email provider, and the print
          lab that makes and posts print orders. They only get what they need to do their job.
        </p>
      </Section>
      <Section title="How long we keep it">
        <p>Order records are kept for as long as the law requires for accounting, normally six years. You can ask us to delete other data at any time.</p>
      </Section>
      <Section title="Your rights">
        <p>
          You can ask to see, correct or delete your data by emailing us. You can also complain to the Information
          Commissioner&apos;s Office at ico.org.uk.
        </p>
      </Section>
    </LegalPage>
  );
}
