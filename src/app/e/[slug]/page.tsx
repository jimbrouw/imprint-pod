'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { page, card, h1, muted, label, input, btnPrimary, alertError } from '@/components/ui';

export default function PublicEventClaimPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [eventData, setEventData] = useState<{ title: string; logoUrl?: string | null } | null>(null);
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
      setError('Please enter the 6-character code.');
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
    return <div className={`${page} flex items-center justify-center ${muted}`}>Loading…</div>;
  }

  return (
    <div className={`${page} p-4 flex items-center justify-center`}>
      <div className={`${card} w-full max-w-md text-center`}>
        {eventData?.logoUrl && <img src={eventData.logoUrl} alt="" className="h-16 mx-auto mb-4 object-contain" />}

        <h1 className={`${h1} mb-2`}>{eventData?.title || 'Your drawing'}</h1>
        <p className={`${muted} mb-6`}>Enter the 6-character code the artist gave you.</p>

        {error && (
          <div className={`${alertError} mb-6 text-left`}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleClaim} className="space-y-4 text-left">
          <div>
            <label htmlFor="claim-code" className={label}>
              Your code
            </label>
            <input
              id="claim-code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              required
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="e.g. 4K7M2Q"
              className={`${input} text-center font-mono text-2xl font-bold tracking-widest uppercase min-h-14`}
            />
          </div>

          <button type="submit" disabled={submitting || claimCode.length !== 6} className={`${btnPrimary} w-full`}>
            {submitting ? 'Finding your drawing…' : 'Find my drawing'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <p className={`${muted} mt-6`}>You can also scan the QR code on the artist&apos;s screen.</p>
      </div>
    </div>
  );
}
