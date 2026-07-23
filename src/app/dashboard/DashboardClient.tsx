'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, CreditCard, SignOut, ArrowRight } from '@phosphor-icons/react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardClient() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  // Clerk reporting isSignedIn doesn't mean Convex has finished verifying the
  // token yet — gate Convex calls on Convex's own auth state, not Clerk's, or
  // queries fire during that gap and throw "Unauthenticated".
  const { isAuthenticated: convexReady } = useConvexAuth();

  const storeUser = useMutation(api.artists.storeUser);
  useEffect(() => {
    if (!convexReady) return;
    storeUser().catch((err) => console.error('Failed to sync artist record:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexReady]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/login');
  }, [isLoaded, isSignedIn, router]);

  const events = useQuery(api.events.getArtistEvents, convexReady ? undefined : 'skip');
  const loading = events === undefined;

  const artist = useQuery(api.artists.getMyArtist, convexReady ? undefined : 'skip');
  // Only reflects onboarding status as of account creation — flips to true
  // once there's a listener for Stripe's `account.updated` webhook, which
  // isn't built yet.
  const stripeConnected = artist?.stripeOnboardingComplete ?? false;
  const artistName = user?.fullName || 'your studio';
  const initial = (user?.fullName || 'I').charAt(0);

  const handleSignOut = async () => {
    if (signOut) await signOut();
    router.push('/login');
  };

  const handleConnectStripe = async () => {
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Stripe connect failed:', err);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 pb-16">
      <header className="border-b border-zinc-800/80 sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ember-500/15 border border-ember-500/25 rounded-xl flex items-center justify-center text-ember-400 font-semibold">
              {initial}
            </div>
            <div>
              <h1 className="font-semibold text-zinc-50 text-base leading-tight">{artistName}</h1>
              <p className="text-xs text-zinc-500">Your events</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="!px-3">
            <SignOut size={16} weight="bold" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        {!stripeConnected && (
          <div className="relative overflow-hidden bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-11 h-11 bg-ember-500/15 border border-ember-500/25 rounded-xl flex items-center justify-center text-ember-400 shrink-0">
                <CreditCard size={20} weight="bold" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-50 text-lg tracking-tight">Get paid straight to your bank</h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-[52ch] leading-relaxed">
                  Add your bank details once, and money from every download and print comes straight to you.
                </p>
              </div>
            </div>
            <Button onClick={handleConnectStripe} className="shrink-0 relative z-10">
              Connect Stripe
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl tracking-tighter font-semibold text-zinc-50">Your events</h2>
            <p className="text-sm text-zinc-500 mt-1">Everywhere you've set up to draw and sell portraits</p>
          </div>
          <Link href="/events/new">
            <Button>
              <Plus size={16} weight="bold" />
              Create event
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-zinc-800 rounded-2xl p-6 space-y-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-3xl p-16 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-600 mx-auto mb-4">
              <Calendar size={24} weight="bold" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-50 mb-1">Nothing set up yet</h3>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Set up your first event and you'll get a QR code to print out and stick up at your stand.
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 text-sm font-medium text-ember-400 hover:text-ember-300"
            >
              Create your first event <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any, idx: number) => (
              <div
                key={event._id || event.id}
                style={{ animationDelay: `${idx * 60}ms` }}
                className="animate-fade-up bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-breathe" />
                      Active
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Today'}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold tracking-tight text-zinc-50 mb-4">{event.title}</h3>

                  <div className="space-y-2 mb-6 divide-y divide-zinc-800/60">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-2">
                      <span>Digital price</span>
                      <span className="font-mono font-medium text-zinc-200">
                        {(event.digitalPrice / 100).toLocaleString('en-GB', { style: 'currency', currency: event.currency || 'gbp' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
                      <span>Print sizes</span>
                      <span className="font-mono font-medium text-zinc-200">A5 / A4 / A3</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/events/${event._id || event.id}`}
                  className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-sm font-medium text-zinc-200 hover:text-ember-400 transition-colors"
                >
                  Open event <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
