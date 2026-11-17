'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Tag, Check } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';


export default function NewEventPage() {
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
  const generateLogoUploadUrl = useMutation(api.events.generateLogoUploadUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let logoStorageId: any = undefined;
      if (logoFile) {
        const uploadUrl = await generateLogoUploadUrl();
        const up = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': logoFile.type }, body: logoFile });
        if (!up.ok) throw new Error('Logo upload failed');
        logoStorageId = (await up.json()).storageId;
      }
      const digitalPriceMinor = Math.round(parseFloat(digitalPrice) * 100);
      const printPricesMinor = {
        A5: Math.round(parseFloat(priceA5) * 100),
        A4: Math.round(parseFloat(priceA4) * 100),
        A3: Math.round(parseFloat(priceA3) * 100),
      };

      const result = await createEvent({
        title,
        logoStorageId,
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
    <div className="min-h-screen bg-stone-50 text-stone-800 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white border border-stone-200 rounded-3xl p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-1">Create New Event</h1>
        <p className="text-sm text-stone-600 mb-8">
          Configure pricing for digital artwork downloads and print upgrades for your upcoming event.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme Corp Summer Party"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="gbp">GBP (£)</option>
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-6">
            <h3 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-600" /> Digital Download Price
            </h3>
            <div>
              <label className="block text-sm text-stone-600 mb-2">
                Base price per digital portrait download
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-stone-600 font-medium text-sm">
                  {currency === 'gbp' ? '£' : currency === 'usd' ? '$' : '€'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={digitalPrice}
                  onChange={(e) => setDigitalPrice(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-8 pr-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-6">
            <h3 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600" /> Print Upgrade Prices (Prodigi Fulfilled)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-1">A5 Print</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceA5}
                  onChange={(e) => setPriceA5(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-1">A4 Print</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceA4}
                  onChange={(e) => setPriceA4(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-1">A3 Print</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceA3}
                  onChange={(e) => setPriceA3(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
              Event Logo (optional)
            </label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png, image/jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f && f.size > 4 * 1024 * 1024) {
                  setError('Logo must be under 4 MB');
                  e.target.value = '';
                  return;
                }
                setLogoFile(f);
              }}
              className="w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold min-h-12 py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Event & Generate QR'}
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
