import crypto from 'crypto';

/**
 * Generate a 6-character uppercase alphanumeric claim code (e.g. "4K7M2Q")
 */
export function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous I, O, 0, 1
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate a random 32-byte claim token
 */
export function generateClaimToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 hash of claim token for database storage
 */
export function hashClaimToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate URL slug from title and random suffix
 */
export function generateSlug(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${cleanTitle || 'event'}-${suffix}`;
}
