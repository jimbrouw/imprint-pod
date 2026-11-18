import LegalPage, { Section, SUPPORT_EMAIL } from '@/components/LegalPage';

export const metadata = { title: 'Refunds and chargebacks | Drawn Checkout' };

export default function Page() {
  return (
    <LegalPage title="Refunds and chargebacks" updated="18 November 2026">
      <Section title="Digital downloads">
        <p>
          A digital drawing is delivered instantly. By buying it you ask us to start the download straight away, so the
          14 day right to cancel for digital content ends once you have downloaded it.
        </p>
        <p>
          If the file is broken, will not open, or is not what was described, email us and we will fix it or refund you in
          full.
        </p>
      </Section>
      <Section title="Prints">
        <p>
          Prints are made to order, so we cannot take them back if you simply change your mind. If your print arrives
          damaged, faulty or is not the item you ordered, email us within 30 days of delivery with a photo and we will
          reprint it or refund you.
        </p>
      </Section>
      <Section title="How refunds are paid">
        <p>
          Refunds go back to the card you paid with and usually appear within 5 to 10 working days. When an order is
          refunded, the download link stops working.
        </p>
      </Section>
      <Section title="Chargebacks">
        <p>
          If something is wrong, please contact us first at{' '}
          <a className="underline text-brand-600" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. It is quicker than
          a card dispute and we will always try to put it right. Your statutory rights are not affected.
        </p>
      </Section>
    </LegalPage>
  );
}
