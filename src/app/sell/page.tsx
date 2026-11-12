'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Camera, Check, Copy, Share2, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { generateQRCodeDataUrl } from '@/lib/qr';
import { uploadArtwork, validateImageFile } from '@/lib/upload';
import { useStripeConnect } from '@/lib/useStripeConnect';
import { page, card, h1, h2, muted, label, input, btnPrimary, btnSecondary, alertError, alertWarn } from '@/components/ui';

const MIN_PRICE = 200; // minor units
const MAX_PRICE = 100000;
const PRICE_KEY = 'drawn:lastPrice';

type Sale = { claimToken: string; claimCode: string; name: string };
type Sync = 'uploading' | 'done' | 'failed';

function SellContent() {
  const router = useRouter();
  const search = useSearchParams();

  const getOrCreateDefault = useMutation(api.events.getOrCreateDefault);
  const presignArtworkUpload = useMutation(api.artworks.presignArtworkUpload);
  const completePreview = useMutation(api.artworks.completePreview);
  const completeOriginal = useMutation(api.artworks.completeOriginal);
  const stripe = useStripeConnect();

  const [event, setEvent] = useState<{ eventId: Id<'events'>; currency: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [price, setPrice] = useState('15.00');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [sync, setSync] = useState<Sync | null>(null);
  const [copied, setCopied] = useState(false);
  const retry = useRef<(() => Promise<void>) | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Remember the last price used.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRICE_KEY);
      if (saved) setPrice(saved);
    } catch {}
  }, []);

  useEffect(() => {
    getOrCreateDefault({})
      .then((e) => setEvent({ eventId: e.eventId, currency: e.currency }))
      .catch(() => setError('Could not load your account. Please refresh.'));
  }, [getOrCreateDefault]);

  // Re-show an existing sale (linked from the dashboard).
  useEffect(() => {
    const t = search.get('t');
    const c = search.get('c');
    if (t && c) setSale({ claimToken: t, claimCode: c, name: search.get('n') || 'Your drawing' });
  }, [search]);

  useEffect(() => {
    if (!sale) return setQr(null);
    generateQRCodeDataUrl(`${window.location.origin}/artwork/${sale.claimToken}`)
      .then(setQr)
      .catch(() => setQr(null));
  }, [sale]);

  const link = sale ? `${typeof window === 'undefined' ? '' : window.location.origin}/artwork/${sale.claimToken}` : '';
  const symbol = event?.currency === 'usd' ? '$' : event?.currency === 'eur' ? '€' : '£';

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const problem = validateImageFile(f);
    if (problem) return setError(problem);
    setError(null);
    setFile(f);
    setPreviewSrc(URL.createObjectURL(f));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !event) return;
    const minor = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(minor) || minor < MIN_PRICE || minor > MAX_PRICE) {
      return setError(`Enter a price between ${symbol}${MIN_PRICE / 100} and ${symbol}${MAX_PRICE / 100}.`);
    }
    setBusy(true);
    setError(null);
    const customerName = name.trim() || 'Your drawing';
    try {
      const { preset, syncOriginal } = await uploadArtwork({
        file,
        presign: (a) => presignArtworkUpload({ eventId: event.eventId, customerName, price: minor, ...a }),
        completePreview,
        completeOriginal,
        onProgress: (_p, s) => setStep(s),
      });
      try {
        localStorage.setItem(PRICE_KEY, (minor / 100).toFixed(2));
      } catch {}
      const run = async () => {
        setSync('uploading');
        try {
          await syncOriginal();
          setSync('done');
          retry.current = null;
        } catch {
          setSync('failed');
        }
      };
      retry.current = run;
      setSale({ claimToken: preset.claimToken, claimCode: preset.claimCode, name: customerName });
      void run();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      setStep(null);
    }
  };

  const reset = () => {
    setSale(null);
    setFile(null);
    setPreviewSrc(null);
    setName('');
    setSync(null);
    setCopied(false);
    retry.current = null;
    if (fileInput.current) fileInput.current.value = '';
    if (search.get('t')) router.replace('/sell');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Long-press the link to copy it.');
    }
  };

  const share = () => navigator.share?.({ title: 'Your drawing', url: link }).catch(() => {});
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const header = (
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-base text-stone-600 underline mb-4">
      <ArrowLeft className="w-4 h-4" /> Dashboard
    </Link>
  );

  // Stripe not finished: block the form.
  if (!sale && stripe.state !== 'ready') {
    return (
      <div className={page}>
        <main className="w-full max-w-md md:max-w-xl mx-auto px-4 py-6">
          {header}
          <div className={`${card} space-y-4`}>
            <h1 className={h2}>{stripe.state === 'loading' ? 'Checking your payment setup…' : 'Set up payouts first'}</h1>
            {stripe.state !== 'loading' && (
              <>
                <p className={muted}>Connect Stripe so your sales can be paid straight to your bank.</p>
                {stripe.error && <div className={alertError}>{stripe.error}</div>}
                <button onClick={stripe.connect} disabled={stripe.connecting} className={`${btnPrimary} w-full`}>
                  {stripe.connecting ? 'Opening Stripe…' : stripe.state === 'finish_setup' ? 'Finish Stripe setup' : 'Connect Stripe'}
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (sale) {
    return (
      <div className={page}>
        <main className="w-full max-w-md md:max-w-xl mx-auto px-4 py-6 space-y-5 text-center">
          {header}
          <h1 className={h1}>
            <Check className="inline w-7 h-7 text-green-700 mr-1" />
            Ready to sell
          </h1>
          <div className={`${card} space-y-4`}>
            {qr ? (
              <img src={qr} alt="QR code for the buyer" className="w-full max-w-xs md:max-w-sm mx-auto" />
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-600">Making QR code…</div>
            )}
            <div>
              <p className={muted}>Or enter this code</p>
              <p className="text-4xl font-mono font-bold tracking-widest text-brand-600">{sale.claimCode}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={copy} className={btnSecondary}>
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />} {copied ? 'Copied' : 'Copy link'}
              </button>
              {canShare && (
                <button onClick={share} className={btnSecondary}>
                  <Share2 className="w-5 h-5" /> Share
                </button>
              )}
            </div>
          </div>
          {sync === 'uploading' && <div className={alertWarn}>Saving the full-size image. The buyer can pay once this finishes.</div>}
          {sync === 'done' && <p className="text-green-700 text-base">Full-size image saved. The buyer can pay now.</p>}
          {sync === 'failed' && (
            <div className={alertError}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                Full-size upload failed.{' '}
                <button type="button" onClick={() => retry.current?.()} className="underline font-semibold">
                  Try again
                </button>
              </span>
            </div>
          )}
          {error && <div className={alertError}>{error}</div>}
          <button onClick={reset} disabled={sync === 'uploading'} className={`${btnPrimary} w-full`}>
            <RefreshCw className="w-5 h-5" /> New sale
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className={page}>
      <main className="w-full max-w-md md:max-w-xl mx-auto px-4 py-6 space-y-5">
        {header}
        <h1 className={h1}>New sale</h1>
        {error && (
          <div className={alertError}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> {error}
          </div>
        )}
        <form onSubmit={create} className="space-y-5">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg" onChange={onFile} className="hidden" />
          <button type="button" onClick={() => fileInput.current?.click()} className={`${btnPrimary} w-full min-h-16`}>
            <Camera className="w-6 h-6" /> {file ? 'Change image' : 'Take photo or choose image'}
          </button>
          {previewSrc && <img src={previewSrc} alt="Selected artwork" className="w-full rounded-2xl border border-stone-200" />}

          <div>
            <label htmlFor="price" className={label}>
              Price ({symbol})
            </label>
            <input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={MIN_PRICE / 100}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={input}
            />
          </div>

          <div>
            <label htmlFor="name" className={label}>
              Customer name (optional)
            </label>
            <input
              id="name"
              type="text"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your drawing"
              className={input}
            />
          </div>

          <button type="submit" disabled={busy || !file || !event} className={`${btnPrimary} w-full`}>
            {busy ? step || 'Creating…' : 'Create link'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<div className={`${page} flex items-center justify-center ${muted}`}>Loading…</div>}>
      <SellContent />
    </Suspense>
  );
}
