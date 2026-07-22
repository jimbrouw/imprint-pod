'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { DownloadSimple, ShoppingBag, Check, ShieldCheck, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { ProductSize, ShippingAddress } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ArtworkPurchasePage() {
  const params = useParams();
  const claimToken = params.claimToken as string;

  const artworkData = useQuery(api.artworks.getArtworkByToken, { claimToken });
  const loading = artworkData === undefined;
  const fetchError = artworkData === null ? 'Artwork claim not found' : null;
  const [error, setError] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<'digital' | 'print'>('digital');
  const [selectedSize, setSelectedSize] = useState<ProductSize>('A4');
  const [shipping, setShipping] = useState<ShippingAddress>({
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    country: 'GB',
  });
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const handleCheckout = async (_type: 'digital' | 'print') => {
    setSubmittingCheckout(true);
    setError(null);

    setTimeout(() => {
      const baseUrl = window.location.origin;
      window.location.href = `${baseUrl}/checkout/success?session_id=mock_session_from_convex`;
    }, 800);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 flex items-center justify-center">
          <Skeleton className="w-full max-w-sm aspect-[3/4] rounded-2xl" />
        </div>
        <div className="p-8 space-y-4 flex flex-col justify-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (fetchError || !artworkData) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4">
        <div className="border border-zinc-800 rounded-3xl p-8 max-w-md text-center">
          <WarningCircle size={40} weight="bold" className="text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-50 mb-2">Unable to load artwork</h2>
          <p className="text-sm text-zinc-500">{fetchError || 'Invalid artwork claim token'}</p>
        </div>
      </div>
    );
  }

  const { customerName, previewUrl, eventTitle, currency, isPaid } = artworkData;
  const digitalPrice = artworkData.digitalPrice ?? 1500;
  const printPrices = artworkData.printPrices ?? { A5: 1500, A4: 2200, A3: 3200 };
  const currSymbol = currency === 'gbp' ? '£' : currency === 'usd' ? '$' : '€';

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 grid grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      {/* Left: artwork preview */}
      <div className="relative flex items-center justify-center p-8 sm:p-16 bg-zinc-900/40 border-b lg:border-b-0 lg:border-r border-zinc-800/80">
        <div className="w-full max-w-sm aspect-[3/4] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 relative">
          <img
            src={previewUrl || 'https://picsum.photos/seed/imprint-portrait/800/1000'}
            alt={`${customerName}'s live portrait`}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-xl py-2.5 px-3.5 text-center">
            <p className="text-xs text-zinc-500">{eventTitle}</p>
            <p className="text-sm font-medium text-zinc-50">{customerName}&rsquo;s portrait</p>
          </div>
        </div>
      </div>

      {/* Right: purchase panel */}
      <div className="flex flex-col justify-center p-6 sm:p-16 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-ember-400 font-medium uppercase tracking-wider mb-2">
            <Sparkle size={16} weight="fill" /> Your portrait is ready
          </div>
          <h1 className="text-3xl sm:text-4xl tracking-tighter font-semibold text-zinc-50">
            Get your portrait
          </h1>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-[46ch]">
            Download a copy straight away, or order a print delivered to your door.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-rose-300 text-sm flex items-center gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setSelectedTab('digital')}
            className={`py-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              selectedTab === 'digital' ? 'bg-ember-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DownloadSimple size={16} weight="bold" /> Digital ({currSymbol}{(digitalPrice / 100).toFixed(2)})
          </button>
          <button
            onClick={() => setSelectedTab('print')}
            className={`py-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              selectedTab === 'print' ? 'bg-zinc-50 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag size={16} weight="bold" /> Order print
          </button>
        </div>

        {selectedTab === 'digital' ? (
          <div className="border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="space-y-2">
              {['A high-quality copy of your picture', 'Download it the moment you pay', 'Pay with Apple Pay, Google Pay, or card'].map(
                (line) => (
                  <div key={line} className="flex items-center gap-2 text-xs text-zinc-400">
                    <Check size={14} weight="bold" className="text-emerald-400 shrink-0" /> {line}
                  </div>
                )
              )}
            </div>

            <Button onClick={() => handleCheckout('digital')} disabled={submittingCheckout} className="w-full !py-4 text-base">
              {submittingCheckout ? 'Redirecting…' : `Pay ${currSymbol}${(digitalPrice / 100).toFixed(2)} & download`}
            </Button>
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Select print size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['A5', 'A4', 'A3'] as ProductSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`p-3 rounded-xl border text-center transition-colors ${
                      selectedSize === size
                        ? 'border-ember-600 bg-ember-500/10 text-zinc-50 font-semibold'
                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <p className="text-xs uppercase font-semibold">{size}</p>
                    <p className="text-sm font-mono text-ember-400 mt-0.5">
                      {currSymbol}{((printPrices?.[size] || 2200) / 100).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Shipping address</label>
              <input
                type="text"
                placeholder="Address line 1"
                required
                value={shipping.line1}
                onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-ember-600/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-ember-600/50"
                />
                <input
                  type="text"
                  placeholder="Postcode / ZIP"
                  required
                  value={shipping.postcode}
                  onChange={(e) => setShipping({ ...shipping, postcode: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-ember-600/50"
                />
              </div>
            </div>

            <Button
              onClick={() => handleCheckout('print')}
              disabled={submittingCheckout || !shipping.line1 || !shipping.city || !shipping.postcode}
              className="w-full !py-4 text-base"
            >
              {submittingCheckout
                ? 'Redirecting…'
                : `Buy ${selectedSize} print (${currSymbol}${((printPrices?.[selectedSize] || 2200) / 100).toFixed(2)})`}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 pt-2 border-t border-zinc-800/80">
          <ShieldCheck size={16} weight="bold" className="text-emerald-500" /> Paid securely, straight to the artist
        </div>
      </div>
    </div>
  );
}
