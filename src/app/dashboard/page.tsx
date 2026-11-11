'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, CreditCard, LogOut, ArrowRight, Image as ImageIcon, Banknote, Package } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const dashboard = useQuery(api.events.getDashboard);
  const events = dashboard?.events ?? [];
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter((e) => !e.eventDate || e.eventDate >= today);
  const past = events.filter((e) => e.eventDate && e.eventDate < today);

  const [stripeComplete, setStripeComplete] = useState<boolean | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const artistName = user?.fullName || user?.username || 'Artist';

  // Sync Stripe onboarding status (also runs when returning from Stripe's hosted onboarding).
  useEffect(() => {
    fetch('/api/connect/status')
      .then((r) => r.json())
      .then((d) => setStripeComplete(!!d.complete))
      .catch(() => setStripeComplete(false));
  }, []);

  const money = (minor: number) =>
    (minor / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  const handleSignOut = async () => {
    if (signOut) await signOut();
    router.push('/sign-in');
  };

  const handleConnectStripe = async () => {
    setConnecting(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setStripeError(data.error?.message || 'Could not start Stripe onboarding');
    } catch {
      setStripeError('Could not reach Stripe. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-12">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 font-bold">
              {artistName.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-stone-800 text-lg leading-tight">{artistName}</h1>
              <p className="text-sm text-stone-600">Artist Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        {stripeComplete === false && (
          <div className="border border-brand-100 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 text-lg">Connect Stripe payouts</h3>
                <p className="text-sm text-stone-800 mt-1">
                  Connect your bank account via Stripe to receive instant payouts for live digital sales and prints.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectStripe}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition-all shrink-0"
            >
              {connecting ? 'Opening Stripe...' : dashboard?.stripeConnected ? 'Finish Stripe setup' : 'Connect Stripe'}
            </button>
          </div>
        )}

        {stripeError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{stripeError}</div>
        )}

        {dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <p className="text-sm text-stone-600 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Portraits</p>
              <p className="text-3xl font-extrabold text-stone-900">{dashboard.totals.portraits}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <p className="text-sm text-stone-600 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Revenue (after fees)</p>
              <p className="text-3xl font-extrabold text-green-700">{money(dashboard.totals.revenue)}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <p className="text-sm text-stone-600 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Print orders</p>
              <p className="text-3xl font-extrabold text-brand-600">{dashboard.totals.printOrders}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Your Events</h2>
            <p className="text-sm text-stone-600">Manage live portrait events, customer claim codes, and sales</p>
          </div>
          <Link
            href="/events/new"
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-3 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600 mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-1">No events created yet</h3>
            <p className="text-sm text-stone-600 mb-6">
              Create an event to generate a stable QR code for your live iPad drawing booth.
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Create your first event <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...upcoming, ...past].map((event) => (
              <div
                key={event._id}
                className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-6 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    {past.includes(event) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-600 border border-stone-300">
                        Past
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Upcoming
                      </span>
                    )}
                    <span className="text-sm text-stone-600">
                      {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Today'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-stone-900 mb-2">{event.title}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-sm text-stone-600 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
                      <span>Digital price</span>
                      <span className="font-semibold text-stone-800">{(event.digitalPrice / 100).toLocaleString('en-GB', { style: 'currency', currency: event.currency || 'gbp' })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-stone-600 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
                      <span>Portraits / prints</span>
                      <span className="font-semibold text-stone-800">{event.portraits} / {event.prints}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-stone-600 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
                      <span>Revenue</span>
                      <span className="font-semibold text-green-700">{money(event.revenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
                  <Link
                    href={`/events/${event.slug}`}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    Control Room <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
