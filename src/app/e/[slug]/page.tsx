'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QrCode, Search, ArrowRight, Palette, AlertCircle } from 'lucide-react';

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
      } catch (err) {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading event page...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 mx-auto mb-4">
          <Palette className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          {eventData?.title || 'Live Artist Portrait'}
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Enter your 6-character claim code from the artist to view and download your portrait.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              6-Character Claim Code
            </label>
            <input
              type="text"
              maxLength={6}
              required
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="e.g. 4K7M2Q"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 text-center font-mono text-2xl font-extrabold tracking-widest text-sky-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || claimCode.length !== 6}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-sky-500/20 text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? 'Finding Portrait...' : 'Find My Portrait'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-6">
          Alternatively, scan the per-artwork QR code directly from the artist's screen.
        </p>
      </div>
    </div>
  );
}
