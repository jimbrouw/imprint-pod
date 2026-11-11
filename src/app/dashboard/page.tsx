'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, LogOut, ArrowRight, QrCode } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useStripeConnect } from '@/lib/useStripeConnect';
import { page, card, h2, muted, btnPrimary, btnSecondary, alertError } from '@/components/ui';

const fmt = (minor: number, currency = 'gbp') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100);

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const stripe = useStripeConnect();

  // Local midnight, fixed for the life of the page so the query doesn't re-subscribe.
  const sinceMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const dashboard = useQuery(api.events.getDashboard, { sinceMs });
  const events = dashboard?.events ?? [];
  const artistName = user?.fullName || user?.username || 'Artist';

  const handleSignOut = async () => {
    if (signOut) await signOut();
    router.push('/sign-in');
  };

  const stripeLabel = {
    loading: 'Checking…',
    not_connected: 'Not connected',
    finish_setup: 'Finish setup',
    ready: 'Ready',
  }[stripe.state];

  return (
    <div className={`${page} pb-12`}>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg">{artistName}</h1>
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 min-h-12 px-3 text-base text-stone-600">
            <LogOut className="w-5 h-5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-8">
        <Link href="/sell" className={`${btnPrimary} w-full min-h-16 text-lg`}>
          <Plus className="w-6 h-6" /> New sale
        </Link>

        {/* Stripe status: one clear state */}
        <section className={`${card} flex items-center justify-between gap-4`}>
          <div>
            <p className={muted}>Payouts</p>
            <p
              className={`text-lg font-semibold ${
                stripe.state === 'ready' ? 'text-green-700' : stripe.state === 'loading' ? 'text-stone-600' : 'text-amber-800'
              }`}
            >
              {stripeLabel}
            </p>
          </div>
          {(stripe.state === 'not_connected' || stripe.state === 'finish_setup') && (
            <button onClick={stripe.connect} disabled={stripe.connecting} className={btnPrimary}>
              {stripe.connecting ? 'Opening Stripe…' : stripe.state === 'finish_setup' ? 'Finish Stripe setup' : 'Connect Stripe'}
            </button>
          )}
        </section>
        {stripe.error && <div className={alertError}>{stripe.error}</div>}

        {dashboard && (
          <section className="grid grid-cols-2 gap-4">
            <div className={card}>
              <p className={muted}>Sales today</p>
              <p className="text-3xl font-bold">{dashboard.today.sales}</p>
            </div>
            <div className={card}>
              <p className={muted}>Earned today</p>
              <p className="text-3xl font-bold text-green-700">{fmt(dashboard.today.earned)}</p>
            </div>
            <div className={`${card} col-span-2`}>
              <p className={muted}>Total earned (after fees)</p>
              <p className="text-2xl font-bold">{fmt(dashboard.totals.revenue)}</p>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className={h2}>Recent sales</h2>
          {dashboard && dashboard.recentSales.length === 0 ? (
            <p className={muted}>No sales yet. Tap New sale to make your first one.</p>
          ) : (
            <ul className="space-y-3">
              {dashboard?.recentSales.map((s) => (
                <li key={s.artworkId} className={`${card} !p-4 flex items-center justify-between gap-3`}>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className={muted}>
                      {fmt(s.price, s.currency)} ·{' '}
                      <span className={s.paid ? 'text-green-700 font-medium' : 'text-amber-800 font-medium'}>
                        {s.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </p>
                  </div>
                  {!s.paid && (
                    <Link
                      href={`/sell?t=${encodeURIComponent(s.claimToken)}&c=${encodeURIComponent(s.claimCode)}&n=${encodeURIComponent(s.name)}`}
                      className={`${btnSecondary} shrink-0`}
                    >
                      <QrCode className="w-5 h-5" /> Show QR
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className={h2}>Events</h2>
            <Link href="/events/new" className={btnSecondary}>
              Create event
            </Link>
          </div>
          {events.length === 0 ? (
            <p className={muted}>Selling at a wedding or market? Create an event to group your sales.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event._id} className={`${card} !p-4 flex items-center justify-between gap-3`}>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{event.title}</p>
                    <p className={muted}>
                      {event.portraits} drawings · {fmt(event.revenue, event.currency)}
                    </p>
                  </div>
                  <Link href={`/events/${event.slug}`} className={`${btnSecondary} shrink-0`}>
                    Open <ArrowRight className="w-4 h-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
