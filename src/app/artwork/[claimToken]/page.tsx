'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Download, ShoppingBag, Check, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { ProductSize, ShippingAddress } from '@/lib/types';

export default function ArtworkPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const claimToken = params.claimToken as string;

  const artworkData = useQuery(api.artworks.getArtworkByToken, { claimToken });
  const loading = artworkData === undefined;
  const fetchError = artworkData === null ? 'Artwork claim not found' : null;
  const [error, setError] = useState<string | null>(null);

  // Print Form State
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

  const handleCheckout = async (type: 'digital' | 'print') => {
    setSubmittingCheckout(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'digital'
            ? { claimToken, type }
            : { claimToken, type, productSize: selectedSize, shipping }
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error?.message || 'Unable to start checkout');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Unable to start checkout');
      setSubmittingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading artwork...
      </div>
    );
  }

  if (fetchError || !artworkData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Artwork</h2>
          <p className="text-sm text-slate-400">{fetchError || 'Invalid artwork claim token'}</p>
        </div>
      </div>
    );
  }

  const { customerName, previewUrl, eventTitle, currency, isPaid, originalReady, sellerReady, logoUrl } = artworkData;
  const canBuy = originalReady && sellerReady;
  const blockedReason = !sellerReady
    ? 'This artist has not finished payment setup yet.'
    : !originalReady
    ? 'Finishing your artwork upload… this page will update automatically.'
    : null;
  const digitalPrice = artworkData.digitalPrice ?? 1500;
  const printPrices = artworkData.printPrices ?? { A5: 1500, A4: 2200, A3: 3200 };
  const currSymbol = currency === 'gbp' ? '£' : currency === 'usd' ? '$' : '€';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Artwork Preview */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center p-2">
            <img
              src={previewUrl || ''}
              alt={`${customerName}'s Live Portrait`}
              className="w-full h-full object-contain rounded-xl"
            />
            <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-xl py-2 px-3 text-center">
              <p className="text-xs text-slate-400">{eventTitle}</p>
              <p className="text-sm font-bold text-white">{customerName}'s Portrait</p>
            </div>
          </div>
        </div>

        {/* Right: Purchase Options */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            {logoUrl && <img src={logoUrl} alt="" className="h-10 mb-3 object-contain" />}
            <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Live Artwork Delivery
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Get Your Personal Portrait
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Download your high-resolution digital artwork immediately or get an archival print delivered to your home.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {blockedReason && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
              {blockedReason}
            </div>
          )}

          {isPaid && (
            <a
              href={`/api/artworks/${claimToken}/download`}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 text-base transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Download Your Full-Resolution Portrait
            </a>
          )}

          {/* Option Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSelectedTab('digital')}
              className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'digital'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-4 h-4" /> Digital Copy ({currSymbol}{(digitalPrice / 100).toFixed(2)})
            </button>
            <button
              onClick={() => setSelectedTab('print')}
              className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'print'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Order Print
            </button>
          </div>

          {/* Tab Content */}
          {selectedTab === 'digital' ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400" /> High-resolution digital PNG file
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400" /> Immediate download link after payment
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400" /> Apple Pay & Google Pay supported
                </div>
              </div>

              <button
                onClick={() => handleCheckout('digital')}
                disabled={submittingCheckout || !canBuy || isPaid}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-sky-500/20 text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingCheckout ? 'Redirecting...' : isPaid ? 'Purchased' : `Pay ${currSymbol}${(digitalPrice / 100).toFixed(2)} & Download`}
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Print Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A5', 'A4', 'A3'] as ProductSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedSize === size
                          ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs uppercase font-bold">{size}</p>
                      <p className="text-sm text-indigo-400 font-extrabold mt-0.5">
                        {currSymbol}{((printPrices?.[size] || 2200) / 100).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Shipping Address
                </label>
                <input
                  type="text"
                  placeholder="Address Line 1"
                  required
                  value={shipping.line1}
                  onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    required
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Postcode / Zip"
                    required
                    value={shipping.postcode}
                    onChange={(e) => setShipping({ ...shipping, postcode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() => handleCheckout('print')}
                disabled={submittingCheckout || !canBuy || !shipping.line1 || !shipping.city || !shipping.postcode}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/20 text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingCheckout
                  ? 'Redirecting...'
                  : `Buy ${selectedSize} Print (${currSymbol}${((printPrices?.[selectedSize] || 2200) / 100).toFixed(2)})`}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Direct artist payment via Stripe Connect
          </div>
        </div>

      </div>
    </div>
  );
}
