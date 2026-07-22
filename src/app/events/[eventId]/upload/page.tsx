'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

import { generateQRCodeDataUrl } from '@/lib/qr';
import { ArrowLeft, UploadSimple, Check, Lightning, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';

export default function iPadUploadTerminalPage() {
  const params = useParams();
  const searchParams = useSearchParams();

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
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const presignArtworkUpload = useMutation(api.artworks.presignArtworkUpload);
  const completePreview = useMutation(api.artworks.completePreview);

  const event = useQuery(api.events.getEventBySlug, { slug: eventId });

  useEffect(() => {
    if (initialCustomerId) {
      try {
        const raw = localStorage.getItem(`demo_customers_${eventId}`);
        if (raw) {
          const customersList = JSON.parse(raw) as { id: string; name: string }[];
          const match = customersList.find((c) => c.id === initialCustomerId);
          if (match) setCustomerName(match.name);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [initialCustomerId, eventId]);

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
        ctx.drawImage(img, 0, 0, width, height);

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
    setUploadStep('Generating fast preview…');

    try {
      const previewBlob = await createPreviewBlob(selectedFile);
      setUploadProgress(25);
      setUploadStep('Requesting presigned upload token…');

      if (!event) throw new Error('Event not loaded');

      const { uploadUrl, artworkId, claimCode, claimToken } = await presignArtworkUpload({
        eventId: event._id,
        customerName: customerName.trim(),
        mimeType: previewBlob.type,
        byteSize: previewBlob.size,
      });

      setUploadProgress(50);
      setUploadStep('Uploading image…');

      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': previewBlob.type },
        body: previewBlob,
      });
      const { storageId } = await result.json();

      await completePreview({ artworkId, storageId });

      setUploadProgress(75);
      setUploadStep('Finalizing claim QR code…');

      const artworkClaimUrl = `${window.location.origin}/artwork/${claimToken}`;
      const qrDataUrl = await generateQRCodeDataUrl(artworkClaimUrl);

      setCompletedClaimCode(claimCode);
      setCompletedQrUrl(qrDataUrl);
      setUploadProgress(100);
      setUploadStep('Done — artwork claimable now.');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={16} weight="bold" /> Back to event
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-ember-500/10 border border-ember-500/25 text-ember-400 rounded-full text-xs font-medium">
            <Lightning size={14} weight="fill" /> Ready in under a minute
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {completedClaimCode && completedQrUrl ? (
          <div className="text-center space-y-6 animate-fade-up">
            <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Check size={28} weight="bold" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">All done — it's ready for them</h2>
              <p className="text-sm text-zinc-500 mt-1">Have them scan this code, or just read out the 6 characters below</p>
            </div>

            <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="bg-zinc-50 p-3 rounded-2xl shrink-0">
                <img src={completedQrUrl} alt="Per-artwork QR" className="w-40 h-40" />
              </div>

              <div className="text-left space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Customer</p>
                  <p className="text-lg font-semibold text-zinc-50">{customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Or give them this code</p>
                  <p className="text-3xl font-mono font-semibold text-ember-400 tracking-wider">
                    {completedClaimCode}
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleResetForNext} className="w-full !py-4 text-base">
              <ArrowsClockwise size={20} weight="bold" /> Start the next one
            </Button>
          </div>
        ) : (
          <form onSubmit={handleFastUpload} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                1. Customer first name
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 px-4 text-base text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-ember-600/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                2. Choose the finished picture
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
                className="border-2 border-dashed border-zinc-800 hover:border-ember-600/50 bg-zinc-950/60 rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[180px]"
              >
                {previewSrc ? (
                  <div className="relative group">
                    <img
                      src={previewSrc}
                      alt="Portrait preview"
                      className="max-h-48 rounded-xl object-contain"
                    />
                    <div className="mt-3 text-xs text-ember-400 font-medium">Tap to change image</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-ember-500/10 text-ember-400 rounded-xl flex items-center justify-center mx-auto">
                      <UploadSimple size={24} weight="bold" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">Tap to choose your finished drawing</p>
                    <p className="text-xs text-zinc-600">PNG or JPEG up to 25MB</p>
                  </div>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{uploadStep}</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div
                    className="bg-ember-500 h-full transition-all duration-300 ease-spring"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading || !selectedFile || !customerName.trim()}
              className="w-full !py-4 text-base"
            >
              {uploading ? 'Uploading…' : 'Upload the picture'}
              <Lightning size={20} weight="fill" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
