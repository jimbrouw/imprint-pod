'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { CheckCircle, DownloadSimple, Package, EnvelopeSimple, ArrowsClockwise } from '@phosphor-icons/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const order = useQuery(api.orders.getOrderBySessionId, sessionId ? { stripeCheckoutSessionId: sessionId } : 'skip');

  if (!sessionId || order === null) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 gap-3 text-sm">
        <p>We couldn't find that order.</p>
      </div>
    );
  }

  if (order === undefined || order.paymentStatus !== 'paid') {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 gap-3 text-sm">
        <ArrowsClockwise size={28} weight="bold" className="text-ember-400 animate-spin" />
        <p>Verifying payment with Stripe…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg animate-fade-up text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto">
          <CheckCircle size={36} weight="bold" />
        </div>

        <div>
          <h1 className="text-3xl tracking-tighter font-semibold text-zinc-50">Payment confirmed</h1>
          <p className="text-sm text-zinc-500 mt-1">Thank you for supporting your live portrait artist.</p>
        </div>

        {order.type === 'digital' ? (
          order.downloadUrl ? (
            <div className="border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-400 uppercase tracking-wider">
                <DownloadSimple size={16} weight="bold" /> Ready to download
              </div>

              <a href={order.downloadUrl} download>
                <Button className="w-full !py-4 text-base">
                  <DownloadSimple size={18} weight="bold" /> Download your picture
                </Button>
              </a>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-2xl p-6 text-zinc-500 text-sm">
              Getting your download ready…
            </div>
          )
        ) : (
          <div className="border border-zinc-800 rounded-2xl p-6 text-left space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Package size={16} weight="bold" /> Your print
              </span>
              <span className="px-2.5 py-0.5 bg-ember-500/10 border border-ember-500/25 text-ember-400 rounded-full">
                {order.fulfilmentStatus}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Your <span className="font-semibold text-zinc-50">{order.productSize}</span> print is being made and
              posted to you. We'll email you when it's on its way.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 pt-4 border-t border-zinc-800/80">
          <EnvelopeSimple size={16} weight="bold" /> Receipt sent to your email address
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 gap-3 text-sm">
          <ArrowsClockwise size={28} weight="bold" className="text-ember-400 animate-spin" />
          <p>Loading checkout session…</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
