'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Download, Package, Mail, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

import { Suspense } from 'react';

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
            fulfilmentStatus: String(data.fulfilmentStatus || '').replace(/_/g, ' '),
          });
          setLoading(false);
        } else if (++attempts < 8) {
          setTimeout(check, 1500);
        } else {
          setError('Your payment has not been confirmed yet. If you were charged, you will get an email shortly.');
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
        <p>Verifying payment with Stripe...</p>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Payment not confirmed</h2>
          <p className="text-sm text-slate-400">{error || 'We could not find your order.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Payment Confirmed!</h1>
          <p className="text-sm text-slate-400 mt-1">Thank you for supporting your live portrait artist.</p>
        </div>

        {/* Digital Download Action */}
        {orderDetails?.downloadUrl ? (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Download className="w-4 h-4" /> Ready for High-Res Download
            </div>

            <a
              href={orderDetails.downloadUrl}
              download
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-sky-500/20 text-base transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Download Full-Resolution Artwork
            </a>
          </div>
        ) : (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            <a href={orderDetails?.artworkPage} className="text-sky-400 underline">View your artwork page</a>
          </div>
        )}

        {/* Print Order Status if applicable */}
        {orderDetails?.orderType === 'print' && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Print Fulfillment</span>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full">
                {orderDetails.fulfilmentStatus || 'Submitted'}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Your <span className="font-bold text-white">{orderDetails.productSize}</span> print order has been submitted to our archival print laboratory (Prodigi). Tracking updates will be sent via email.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-4 border-t border-slate-800">
          <Mail className="w-4 h-4 text-slate-400" /> Receipt sent to your email address
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
        <p>Loading checkout session...</p>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
