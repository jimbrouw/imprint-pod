'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { ProductSize } from '@/lib/types';
import { page, card, h1, h2, muted, btnPrimary, btnSecondary, alertError, alertWarn } from '@/components/ui';

const PRINTS_ENABLED = process.env.NEXT_PUBLIC_PRINTS_ENABLED === 'true';

export default function ArtworkPurchasePage() {
  const params = useParams();
  const claimToken = params.claimToken as string;

  const artworkData = useQuery(api.artworks.getArtworkByToken, { claimToken });
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize>('A4');
  const [submitting, setSubmitting] = useState(false);

  const handleCheckout = async (type: 'digital' | 'print') => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'digital' ? { claimToken, type } : { claimToken, type, productSize: selectedSize }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error?.message || 'Unable to start checkout');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Unable to start checkout');
      setSubmitting(false);
    }
  };

  if (artworkData === undefined) {
    return <div className={`${page} flex items-center justify-center ${muted}`}>Loading your drawing…</div>;
  }

  if (artworkData === null) {
    return (
      <div className={`${page} flex items-center justify-center p-4`}>
        <div className={`${card} max-w-md text-center space-y-2`}>
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className={h2}>We couldn&apos;t find this drawing</h1>
          <p className={muted}>Check the link or code you were given and try again.</p>
        </div>
      </div>
    );
  }

  const { customerName, previewUrl, eventTitle, currency, isPaid, originalReady, sellerReady, logoUrl } = artworkData;
  const digitalPrice = artworkData.digitalPrice;
  const hasPrice = typeof digitalPrice === 'number' && digitalPrice > 0;
  const fmt = (minor: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100);

  const blockedReason = !sellerReady
    ? 'This artist has not finished payment setup yet.'
    : !originalReady
    ? 'Finishing your upload… this page will update automatically.'
    : !hasPrice
    ? 'This drawing does not have a price yet. Please ask the artist.'
    : null;
  const canBuy = !blockedReason;
  const printPrices = artworkData.printPrices;

  return (
    <div className={page}>
      <main className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        <header className="text-center space-y-2">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 mx-auto object-contain" />}
          <h1 className={h1}>Your drawing from {eventTitle}</h1>
        </header>

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt={`Drawing for ${customerName}`} className="w-full h-auto block" />
          ) : (
            <div className={`aspect-[3/4] flex items-center justify-center ${muted}`}>Preview not ready yet</div>
          )}
        </div>

        {error && (
          <div className={alertError}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> {error}
          </div>
        )}
        {!isPaid && blockedReason && <div className={alertWarn}>{blockedReason}</div>}

        {isPaid ? (
          <a href={`/api/artworks/${claimToken}/download`} className={`${btnPrimary} w-full`}>
            <Download className="w-5 h-5" /> Download your drawing
          </a>
        ) : (
          <>
            <button
              onClick={() => handleCheckout('digital')}
              disabled={submitting || !canBuy}
              className={`${btnPrimary} w-full`}
            >
              {submitting ? 'Opening secure payment…' : hasPrice ? `Pay ${fmt(digitalPrice!)} and download` : 'Not available'}
            </button>
            <p className="flex items-center justify-center gap-2 text-base text-stone-600 text-center">
              <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
              Secure payment by Stripe. Apple Pay and Google Pay accepted.
            </p>
          </>
        )}

        {PRINTS_ENABLED && !isPaid && printPrices && (
          <section className={`${card} space-y-4`}>
            <h2 className={h2}>Order a print</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['A5', 'A4', 'A3'] as ProductSize[]).map((size) => {
                const price = printPrices[size];
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!price}
                    onClick={() => setSelectedSize(size)}
                    className={`min-h-12 p-3 rounded-xl border text-center text-base ${
                      selectedSize === size
                        ? 'border-brand-600 bg-brand-50 font-semibold text-stone-900'
                        : 'border-stone-300 bg-white text-stone-700'
                    }`}
                  >
                    <span className="block">{size}</span>
                    <span className="block font-semibold">{price ? fmt(price) : '—'}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handleCheckout('print')}
              disabled={submitting || !canBuy || !printPrices[selectedSize]}
              className={`${btnSecondary} w-full`}
            >
              Buy print
            </button>
            <p className="text-base text-stone-600">We&apos;ll ask for your delivery address at payment.</p>
          </section>
        )}
      </main>
    </div>
  );
}
