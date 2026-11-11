'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Download, Package, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { page, card, h1, h2, muted, btnPrimary, btnSecondary } from '@/components/ui';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout session.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    // The server verifies with Stripe; poll briefly in case the payment is still settling.
    const check = async () => {
      try {
        const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error?.message || 'Could not verify payment');
        if (data.paid) {
          setOrderDetails({
            downloadUrl: data.type === 'digital' ? `/api/artworks/${data.claimToken}/download` : null,
            artworkPage: `/artwork/${data.claimToken}`,
            orderType: data.type,
            productSize: data.productSize,
            emailSent: !!data.receiptSent,
          });
          setLoading(false);
        } else if (++attempts < 8) {
          setTimeout(check, 1500);
        } else {
          setError('Your payment has not been confirmed yet. If you were charged, please wait a minute and refresh this page.');
          setLoading(false);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Could not verify payment');
        setLoading(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className={`${page} flex flex-col items-center justify-center gap-3 ${muted}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
        <p>Confirming your payment…</p>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className={`${page} flex items-center justify-center p-4`}>
        <div className={`${card} max-w-md text-center space-y-3`}>
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h1 className={h2}>Payment not confirmed</h1>
          <p className={muted}>{error || 'We could not find your order.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${page} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md space-y-5 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
        <h1 className={h1}>Thank you, payment received</h1>

        {orderDetails.downloadUrl ? (
          <a href={orderDetails.downloadUrl} download className={`${btnPrimary} w-full`}>
            <Download className="w-5 h-5" /> Download your drawing
          </a>
        ) : (
          <a href={orderDetails.artworkPage} className={`${btnSecondary} w-full`}>
            View your drawing
          </a>
        )}

        {orderDetails.orderType === 'print' && (
          <div className={`${card} text-left space-y-2`}>
            <p className="flex items-center gap-2 font-semibold">
              <Package className="w-5 h-5" /> Your {orderDetails.productSize} print is on its way to the printer
            </p>
            <p className={muted}>We&apos;ll email you when it ships.</p>
          </div>
        )}

        {orderDetails.emailSent && (
          <p className={`flex items-center justify-center gap-2 ${muted}`}>
            <Mail className="w-5 h-5" /> We&apos;ve emailed you a link
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className={`${page} flex items-center justify-center ${muted}`}>
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
