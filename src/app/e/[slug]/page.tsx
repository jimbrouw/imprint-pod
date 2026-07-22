'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, WarningCircle } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function PublicEventClaimPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [eventData, setEventData] = useState<{ title: string; logoUrl?: string } | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/public/events/${slug}`);
        const data = await res.json();
        if (res.ok && data.event) {
          setEventData(data.event);
        } else {
          setError('Event not found or inactive');
        }
      } catch {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [slug]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const cleanCode = claimCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-character claim code.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/public/events/${slug}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid claim code');

      if (data.claimToken) {
        router.push(`/artwork/${data.claimToken}`);
      }
    } catch (err: any) {
      setError(err.message || 'Claim failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Loading event page…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md animate-fade-up text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mx-auto w-fit">
          <h1 className="text-3xl tracking-tighter font-semibold text-zinc-50 mt-6 mb-2">
            {eventData?.title || 'Live Artist Portrait'}
          </h1>
          <p className="text-sm text-zinc-500 mb-10 leading-relaxed max-w-[36ch]">
            Enter your 6-character claim code from the artist to view and download your portrait.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-rose-300 text-sm flex items-center justify-center gap-2">
            <WarningCircle size={16} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleClaim} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 text-center">
              6-character claim code
            </label>
            <input
              type="text"
              maxLength={6}
              required
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="4K7M2Q"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 text-center font-mono text-2xl font-semibold tracking-widest text-ember-400 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-ember-600/50 uppercase"
            />
          </div>

          <Button type="submit" disabled={submitting || claimCode.length !== 6} className="w-full !py-4 text-base">
            {submitting ? 'Finding portrait…' : 'Find my portrait'}
            <ArrowRight size={18} weight="bold" />
          </Button>
        </form>

        <p className="text-xs text-zinc-600 mt-8">
          Or just scan the QR code shown on the artist's screen.
        </p>
      </div>
    </div>
  );
}
