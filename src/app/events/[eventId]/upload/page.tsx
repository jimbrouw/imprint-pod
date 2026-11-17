'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

import { generateQRCodeDataUrl } from '@/lib/qr';
import { uploadArtwork, validateImageFile } from '@/lib/upload';
import { ArrowLeft, Upload, Check, Zap, QrCode, Copy, RefreshCw, AlertCircle } from 'lucide-react';

export default function iPadUploadTerminalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = params.eventId as string;
  const initialCustomerId = searchParams.get('customerId');

  const [customerName, setCustomerName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  
  const [completedClaimCode, setCompletedClaimCode] = useState<string | null>(null);
  const [completedQrUrl, setCompletedQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [originalSync, setOriginalSync] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');
  const pendingOriginal = useRef<(() => Promise<void>) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const presignArtworkUpload = useMutation(api.artworks.presignArtworkUpload);
  const completePreview = useMutation(api.artworks.completePreview);
  const completeOriginal = useMutation(api.artworks.completeOriginal);
  
  const event = useQuery(api.events.getEventForArtist, { slug: eventId });
  const queue = useQuery(api.events.getCustomerQueue, event ? { eventId: event._id } : 'skip');

  // Pre-fill the name when arriving from a pre-registered customer row.
  useEffect(() => {
    if (initialCustomerId && queue) {
      const match = queue.find((c) => c._id === initialCustomerId);
      if (match) setCustomerName((prev) => prev || match.name);
    }
  }, [initialCustomerId, queue]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewSrc(objectUrl);
  };

  const handleFastUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !customerName.trim()) {
      setError('Please provide a customer name and select an artwork image.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(5);
    setUploadStep('Starting…');

    try {
      if (!event) throw new Error('Event not loaded');

      const { preset, syncOriginal: runSync } = await uploadArtwork({
        file: selectedFile,
        presign: (a) =>
          presignArtworkUpload({
            eventId: event._id,
            customerId: initialCustomerId ? (initialCustomerId as Id<'customers'>) : undefined,
            customerName: customerName.trim(),
            ...a,
          }),
        completePreview,
        completeOriginal,
        onProgress: (pct, step) => {
          setUploadProgress(pct);
          setUploadStep(step);
        },
      });

      const qrDataUrl = await generateQRCodeDataUrl(`${window.location.origin}/artwork/${preset.claimToken}`);
      setCompletedClaimCode(preset.claimCode);
      setCompletedQrUrl(qrDataUrl);

      // The original uploads in the background; customers can't pay until it lands.
      const syncOriginal = async () => {
        setOriginalSync('uploading');
        try {
          await runSync();
          setOriginalSync('done');
          pendingOriginal.current = null;
        } catch {
          setOriginalSync('failed');
        }
      };
      pendingOriginal.current = syncOriginal;
      void syncOriginal();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleResetForNext = () => {
    setSelectedFile(null);
    setPreviewSrc(null);
    setCustomerName('');
    setCompletedClaimCode(null);
    setCompletedQrUrl(null);
    setUploadProgress(0);
    setUploadStep(null);
    setOriginalSync('idle');
    pendingOriginal.current = null;
    if (initialCustomerId) router.replace(`/events/${eventId}/upload`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl p-6 sm:p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Terminal
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-100 text-brand-600 rounded-full text-sm font-semibold">
            <Zap className="w-3.5 h-3.5" /> &lt;30s Speed Handoff
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Handoff Screen */}
        {completedClaimCode && completedQrUrl ? (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="w-14 h-14 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-stone-900">Portrait Ready for Handoff!</h2>
              <p className="text-sm text-stone-600 mt-1">Customer can scan artwork QR or enter 6-character code</p>
            </div>

            <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="bg-white p-3 rounded-2xl shrink-0">
                <img src={completedQrUrl} alt="Per-artwork QR" className="w-40 h-40" />
              </div>

              <div className="text-left space-y-3">
                <div>
                  <p className="text-sm text-stone-600 font-medium">Customer</p>
                  <p className="text-lg font-bold text-stone-900">{customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-600 font-medium">Fallback Claim Code</p>
                  <p className="text-3xl font-mono font-extrabold text-brand-600 tracking-wider">
                    {completedClaimCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm">
              {originalSync === 'uploading' && (
                <p className="text-amber-800">Syncing full-resolution original… keep this screen open before starting the next customer.</p>
              )}
              {originalSync === 'done' && <p className="text-green-700">Full-resolution original saved. Customer can pay now.</p>}
              {originalSync === 'failed' && (
                <p className="text-red-700">
                  Original upload failed.{' '}
                  <button type="button" onClick={() => pendingOriginal.current?.()} className="underline font-semibold">
                    Retry
                  </button>
                </p>
              )}
            </div>

            <button
              disabled={originalSync === 'uploading'}
              onClick={handleResetForNext}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" /> Draw & Upload Next Customer
            </button>
          </div>
        ) : (
          /* Upload Form */
          <form onSubmit={handleFastUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
                1. Customer First Name
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3.5 px-4 text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 uppercase tracking-wider mb-2">
                2. Select Artwork (Exported PNG/JPEG)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-200 hover:border-brand-600 bg-stone-50 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px]"
              >
                {previewSrc ? (
                  <div className="relative group">
                    <img
                      src={previewSrc}
                      alt="Portrait preview"
                      className="max-h-48 rounded-xl object-contain"
                    />
                    <div className="mt-3 text-sm text-brand-600 font-medium">Tap to change image</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-stone-800">Tap to select Procreate portrait export</p>
                    <p className="text-sm text-stone-600">PNG or JPEG up to 25MB</p>
                  </div>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>{uploadStep}</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-stone-50 rounded-full h-2 overflow-hidden border border-stone-200">
                  <div
                    className="bg-brand-600 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile || !customerName.trim()}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? 'Uploading (<30s)...' : 'Upload & Finish'}
              <Zap className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
