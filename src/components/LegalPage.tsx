import Link from 'next/link';
import type { ReactNode } from 'react';
import { page, card, h1, h2, muted } from '@/components/ui';

export const SUPPORT_EMAIL = 'jimbrouwer@icloud.com';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className={h2}>{title}</h2>
      <div className={`${muted} space-y-2`}>{children}</div>
    </section>
  );
}

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className={page}>
      <main className="w-full max-w-2xl mx-auto px-4 py-10 space-y-6">
        <Link href="/" className="text-base underline text-brand-600">
          Back to Drawn Checkout
        </Link>
        <h1 className={h1}>{title}</h1>
        <p className="text-sm text-stone-500">Last updated {updated}</p>
        <div className={`${card} space-y-6`}>{children}</div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-base">
          <Link href="/terms" className="underline text-brand-600">Terms</Link>
          <Link href="/privacy" className="underline text-brand-600">Privacy</Link>
          <Link href="/refunds" className="underline text-brand-600">Refunds</Link>
          <Link href="/support" className="underline text-brand-600">Support</Link>
        </nav>
      </main>
    </div>
  );
}
