'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, CreditCard, LogOut, ArrowRight } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const artistId = user?.id || 'demo-artist';

  const events = useQuery(api.events.getArtistEvents, { artistId }) || [];

  const [stripeConnected, setStripeConnected] = useState(false);
  const artistName = user?.fullName || 'Demo Artist';

  const handleSignOut = async () => {
    if (signOut) await signOut();
    router.push('/login');
  };

  const handleConnectStripe = async () => {
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Stripe connect failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-center text-sky-400 font-bold">
              {artistName.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-lg leading-tight">{artistName}</h1>
              <p className="text-xs text-slate-400">Artist Dashboard (Clerk + Convex)</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        {!stripeConnected && (
          <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Connect Stripe payouts</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Connect your bank account via Stripe to receive instant payouts for live digital sales and prints.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectStripe}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all shrink-0"
            >
              Connect Stripe
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Events</h2>
            <p className="text-sm text-slate-400">Manage live portrait events, customer claim codes, and sales</p>
          </div>
          <Link
            href="/events/new"
            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No events created yet</h3>
            <p className="text-sm text-slate-400 mb-6">
              Create an event to generate a stable QR code for your live iPad drawing booth.
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              Create your first event <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => (
              <div
                key={event._id || event.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active
                    </span>
                    <span className="text-xs text-slate-500">
                      {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Today'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
                      <span>Digital price</span>
                      <span className="font-semibold text-slate-200">{(event.digitalPrice / 100).toLocaleString('en-GB', { style: 'currency', currency: event.currency || 'gbp' })}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
                      <span>Print sizes</span>
                      <span className="font-semibold text-slate-200">A5 / A4 / A3</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <Link
                    href={`/events/${event._id || event.id}`}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
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
