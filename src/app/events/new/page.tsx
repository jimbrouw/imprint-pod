'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CurrencyDollar, Tag, Check, WarningCircle } from '@phosphor-icons/react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

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

  const currencySymbol = currency === 'gbp' ? '£' : currency === 'usd' ? '$' : '€';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const digitalPriceMinor = Math.round(parseFloat(digitalPrice) * 100);
      const printPricesMinor = {
        A5: Math.round(parseFloat(priceA5) * 100),
        A4: Math.round(parseFloat(priceA4) * 100),
        A3: Math.round(parseFloat(priceA3) * 100),
      };

      const result = await createEvent({
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
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Left: context panel */}
      <div className="hidden lg:flex flex-col justify-between p-16 border-r border-zinc-800/80">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
        >
          <ArrowLeft size={16} weight="bold" /> Dashboard
        </Link>

        <div className="space-y-4">
          <p className="text-xs font-mono text-ember-400 uppercase tracking-wider">New event</p>
          <h1 className="text-5xl tracking-tighter leading-none font-semibold max-w-xs">
            Set your prices once.
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-[36ch]">
            As soon as you save, you'll get one QR code for the whole event. Print it, stick it up at your stand, and every customer scans the same one.
          </p>
        </div>

        <p className="text-xs text-zinc-600">Prints are made and posted for you, in every size</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-16">
        <div className="w-full max-w-lg animate-fade-up">
          <Link
            href="/dashboard"
            className="lg:hidden inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
          >
            <ArrowLeft size={16} weight="bold" /> Dashboard
          </Link>

          {error && (
            <div className="mb-6 p-4 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-sm flex items-center gap-2">
              <WarningCircle size={16} weight="bold" className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-8">
            <Field
              label="Event title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Halcyon Rooftop Summer Party"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Event date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-ember-600/50"
                >
                  <option value="gbp">GBP (£)</option>
                  <option value="usd">USD ($)</option>
                  <option value="eur">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-6 space-y-4">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <CurrencyDollar size={16} weight="bold" className="text-ember-400" /> Digital download price
              </h3>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-zinc-500 font-mono text-sm">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={digitalPrice}
                  onChange={(e) => setDigitalPrice(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-sm font-mono text-zinc-50 focus:outline-none focus:ring-2 focus:ring-ember-600/50"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-6 space-y-4">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Tag size={16} weight="bold" className="text-ember-400" /> Print upgrade prices
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'A5', value: priceA5, set: setPriceA5 },
                  { label: 'A4', value: priceA4, set: setPriceA4 },
                  { label: 'A3', value: priceA3, set: setPriceA3 },
                ].map((p) => (
                  <div key={p.label}>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">{p.label}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={p.value}
                      onChange={(e) => p.set(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-sm font-mono text-zinc-50 focus:outline-none focus:ring-2 focus:ring-ember-600/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full !py-4">
              {loading ? 'Creating…' : 'Create event & generate QR'}
              <Check size={16} weight="bold" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
