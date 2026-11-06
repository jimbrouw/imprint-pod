'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

import { generateQRCodeDataUrl } from '@/lib/qr';
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

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Only PNG or JPEG images are supported.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be under 25 MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewSrc(objectUrl);
  };

  // Client-side image resize helper to create ~200KB preview image for lightning upload
  const createPreviewBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Diagonal tiled watermark so the free preview isn't a substitute for the paid original.
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(width / 16)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.rotate(-Math.PI / 6);
        const step = Math.round(width / 3.2);
        for (let y = -width; y < height + width; y += step) {
          for (let x = -width; x < width * 2; x += step * 1.6) ctx.fillText('PREVIEW', x, y);
        }
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas blob generation failed'));
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Image loading error'));
      img.src = URL.createObjectURL(file);
    });
  };


  const handleFastUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !customerName.trim()) {
      setError('Please provide a customer name and select an artwork image.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(10);
    setUploadStep('Generating fast preview...');

    try {
      if (!event) throw new Error('Event not loaded');

      // 1. Small watermarked preview (fast) ...
      const previewBlob = await createPreviewBlob(selectedFile);
      setUploadProgress(25);
      setUploadStep('Preparing upload...');

      const preset = await presignArtworkUpload({
        eventId: event._id,
        customerId: initialCustomerId ? (initialCustomerId as Id<'customers'>) : undefined,
        customerName: customerName.trim(),
        mimeType: selectedFile.type,
        originalByteSize: selectedFile.size,
        previewByteSize: previewBlob.size,
      });

      setUploadProgress(45);
      setUploadStep('Uploading preview...');

      const previewRes = await fetch(preset.previewUploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: previewBlob,
      });
      if (!previewRes.ok) throw new Error('Preview upload failed. Check your connection and retry.');
      const { storageId: previewStorageId } = await previewRes.json();
      await completePreview({ artworkId: preset.artworkId, storageId: previewStorageId });

      setUploadProgress(80);
      setUploadStep('Finalizing claim QR code...');

      const artworkClaimUrl = `${window.location.origin}/artwork/${preset.claimToken}`;
      const qrDataUrl = await generateQRCodeDataUrl(artworkClaimUrl);

      setCompletedClaimCode(preset.claimCode);
      setCompletedQrUrl(qrDataUrl);
      setUploadProgress(100);
      setUploadStep('Done! Artwork claimable now.');

      // 2. ... then the full-resolution original in the background. Customers can't pay until it lands.
      const file = selectedFile;
      const syncOriginal = async () => {
        setOriginalSync('uploading');
        try {
          const res = await fetch(preset.originalUploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (!res.ok) throw new Error('Original upload failed');
          const { storageId } = await res.json();
          await completeOriginal({ artworkId: preset.artworkId, storageId });
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Terminal
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" /> &lt;30s Speed Handoff
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Handoff Screen */}
        {completedClaimCode && completedQrUrl ? (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Portrait Ready for Handoff!</h2>
              <p className="text-sm text-slate-400 mt-1">Customer can scan artwork QR or enter 6-character code</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
                <img src={completedQrUrl} alt="Per-artwork QR" className="w-40 h-40" />
              </div>

              <div className="text-left space-y-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Customer</p>
                  <p className="text-lg font-bold text-white">{customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Fallback Claim Code</p>
                  <p className="text-3xl font-mono font-extrabold text-sky-400 tracking-wider">
                    {completedClaimCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs">
              {originalSync === 'uploading' && (
                <p className="text-amber-400">Syncing full-resolution original… keep this screen open before starting the next customer.</p>
              )}
              {originalSync === 'done' && <p className="text-emerald-400">Full-resolution original saved. Customer can pay now.</p>}
              {originalSync === 'failed' && (
                <p className="text-rose-400">
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
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" /> Draw & Upload Next Customer
            </button>
          </div>
        ) : (
          /* Upload Form */
          <form onSubmit={handleFastUpload} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                1. Customer First Name
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px]"
              >
                {previewSrc ? (
                  <div className="relative group">
                    <img
                      src={previewSrc}
                      alt="Portrait preview"
                      className="max-h-48 rounded-xl object-contain shadow-md"
                    />
                    <div className="mt-3 text-xs text-sky-400 font-medium">Tap to change image</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">Tap to select Procreate portrait export</p>
                    <p className="text-xs text-slate-500">PNG or JPEG up to 25MB</p>
                  </div>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{uploadStep}</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile || !customerName.trim()}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-sky-500/20 text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
