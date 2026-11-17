import type { Id } from '../../convex/_generated/dataModel';

export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

export interface PresignResult {
  artworkId: Id<'artworks'>;
  customerId: Id<'customers'>;
  claimCode: string;
  claimToken: string;
  previewUploadUrl: string;
  originalUploadUrl: string;
}

/** Returns an error message if the file can't be sold, else null. */
export function validateImageFile(file: File): string | null {
  if (!['image/png', 'image/jpeg'].includes(file.type)) return 'Only PNG or JPEG images are supported.';
  if (file.size > MAX_ORIGINAL_BYTES) return 'File size must be under 25 MB.';
  return null;
}

/** Resizes to ~1200px wide and tiles a "PREVIEW" watermark so the free preview can't replace the paid original. */
export function createPreviewBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas blob generation failed'))),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image loading error'));
    };
    img.src = objectUrl;
  });
}

/**
 * Two-stage upload shared by the event upload terminal and /sell:
 * 1. small watermarked preview (fast) → the link is shareable straight away;
 * 2. the full original, which the caller runs in the background via the returned `syncOriginal`
 *    (retryable). Customers can't pay until it has landed.
 */
export async function uploadArtwork(opts: {
  file: File;
  presign: (args: { mimeType: string; originalByteSize: number; previewByteSize: number }) => Promise<PresignResult>;
  completePreview: (args: { artworkId: Id<'artworks'>; storageId: Id<'_storage'> }) => Promise<unknown>;
  completeOriginal: (args: { artworkId: Id<'artworks'>; storageId: Id<'_storage'> }) => Promise<unknown>;
  onProgress?: (percent: number, step: string) => void;
}) {
  const { file, onProgress } = opts;
  onProgress?.(10, 'Preparing preview…');
  const previewBlob = await createPreviewBlob(file);

  onProgress?.(25, 'Preparing upload…');
  const preset = await opts.presign({
    mimeType: file.type,
    originalByteSize: file.size,
    previewByteSize: previewBlob.size,
  });

  onProgress?.(45, 'Uploading preview…');
  const previewRes = await fetch(preset.previewUploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: previewBlob,
  });
  if (!previewRes.ok) throw new Error('Preview upload failed. Check your connection and retry.');
  const { storageId: previewStorageId } = await previewRes.json();
  await opts.completePreview({ artworkId: preset.artworkId, storageId: previewStorageId });
  onProgress?.(100, 'Done');

  /** Uploads the original. Throws on failure so callers can show a retry. */
  const syncOriginal = async () => {
    const res = await fetch(preset.originalUploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error('Original upload failed');
    const { storageId } = await res.json();
    await opts.completeOriginal({ artworkId: preset.artworkId, storageId });
  };

  return { preset, syncOriginal };
}
