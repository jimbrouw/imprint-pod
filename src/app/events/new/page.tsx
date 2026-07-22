'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, DollarSign, Tag, Check } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';


export default function NewEventPage() {
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [digitalPrice, setDigitalPrice] = useState('15');
  const [priceA5, setPriceA5] = useState('15');
  const [priceA4, setPriceA4] = useState('22');
  const [priceA3, setPriceA3] = useState('32');
  const [currency, setCurrency] = useState('gbp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const createEvent = useMutation(api.events.createEvent);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const artistId = user?.id || 'demo-artist';
      const digitalPriceMinor = Math.round(parseFloat(digitalPrice) * 100);
      const printPricesMinor = {
        A5: Math.round(parseFloat(priceA5) * 100),
        A4: Math.round(parseFloat(priceA4) * 100),
        A3: Math.round(parseFloat(priceA3) * 100),
      };

      const result = await createEvent({
        artistId,
        title,
        eventDate: eventDate || new Date().toISOString().split('T')[0],
        digitalPrice: digitalPriceMinor,
        printPrices: printPricesMinor as { A5: number; A4: number; A3: number },
        currency: currency as 'gbp' | 'usd' | 'eur',
      });

      router.push(`/events/${result.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Create New Event</h1>
        <p className="text-sm text-slate-400 mb-8">
          Configure pricing for digital artwork downloads and print upgrades for your upcoming event.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme Corp Summer Party"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="gbp">GBP (£)</option>
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-sky-400" /> Digital Download Price
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Base price per digital portrait download
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-500 font-medium text-sm">
                  {currency === 'gbp' ? '£' : currency === 'usd' ? '$' : '€'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={digitalPrice}
                  onChange={(e) => setDigitalPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-400" /> Print Upgrade Prices (Prodigi Fulfilled)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">A5 Print</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceA5}
                  onChange={(e) => setPriceA5(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">A4 Print</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceA4}
                  onChange={(e) => setPriceA4(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">A3 Print</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceA3}
                  onChange={(e) => setPriceA3(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Event & Generate QR'}
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
