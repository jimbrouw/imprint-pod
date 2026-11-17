import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Upload, QrCode, Banknote } from 'lucide-react';
import { page, card, h2, muted, btnPrimary, btnSecondary } from '@/components/ui';

export const dynamic = 'force-dynamic';

function feePercent(): string {
  const n = parseInt(process.env.STRIPE_PLATFORM_FEE_BPS || '1000', 10);
  const bps = Number.isFinite(n) ? Math.min(Math.max(n, 0), 10000) : 1000;
  return String(Number((bps / 100).toFixed(2)));
}

const steps = [
  { icon: Upload, title: 'Upload', text: 'Take a photo of your artwork.' },
  { icon: QrCode, title: 'Share QR or link', text: 'Your customer scans it on their phone.' },
  { icon: Banknote, title: 'Get paid', text: 'They pay and download. You get the money.' },
];

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className={page}>
      <main className="w-full max-w-3xl mx-auto px-4 py-12 sm:py-20 space-y-14">
        <section className="text-center space-y-5">
          <p className="text-lg font-semibold text-brand-600">Drawn Checkout</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Draw it. Share a link. Get paid.</h1>
          <p className="text-lg text-stone-600 max-w-xl mx-auto">
            Take a photo of your artwork, show a QR code, and your customer pays and downloads on their phone. Money goes
            straight to your bank.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {userId ? (
              <Link href="/dashboard" className={btnPrimary}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className={btnPrimary}>
                  Start free
                </Link>
                <Link href="/sign-in" className={btnSecondary}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className={`${card} space-y-2`}>
              <Icon className="w-8 h-8 text-brand-600" />
              <h2 className={h2}>
                {i + 1}. {title}
              </h2>
              <p className={muted}>{text}</p>
            </div>
          ))}
        </section>

        <section className="text-center space-y-2">
          <h2 className={h2}>Who it&apos;s for</h2>
          <p className={muted}>Caricature and sketch artists, illustrators, and anyone selling an image.</p>
        </section>

        <section className="text-center">
          <p className="text-xl font-semibold">No monthly fee. {feePercent()}% per sale.</p>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-6">
        <nav className="max-w-3xl mx-auto px-4 flex flex-wrap gap-x-6 gap-y-2 justify-center text-base text-stone-600">
          <Link href="/terms" className="underline">
            Terms
          </Link>
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/refunds" className="underline">
            Refunds
          </Link>
        </nav>
      </footer>
    </div>
  );
}
