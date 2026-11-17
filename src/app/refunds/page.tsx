import Link from 'next/link';
import { page, card, h1, muted } from '@/components/ui';

export const metadata = { title: 'Refunds and chargebacks | Drawn Checkout' };

export default function Page() {
  return (
    <div className={page}>
      <main className="w-full max-w-2xl mx-auto px-4 py-10 space-y-6">
        <Link href="/" className="text-base underline text-brand-600">
          Back to Drawn Checkout
        </Link>
        <h1 className={h1}>Refunds and chargebacks</h1>
        <div className={`${card} space-y-2`}>
          <p className="font-semibold">Draft — owner to supply text</p>
          <p className={muted}>This page is a placeholder and does not yet contain our legal text.</p>
        </div>
      </main>
    </div>
  );
}
