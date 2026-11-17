import type { QueryCtx, MutationCtx } from './_generated/server';

type Ctx = QueryCtx | MutationCtx;

/**
 * Functions prefixed `server*` are only meant to be called from our Next.js API
 * routes (Stripe/Prodigi webhooks, checkout, downloads). They are public Convex
 * functions, so they are guarded by a shared secret set with:
 *   npx convex env set SERVER_SECRET <random string>
 * and the same value in the Next.js env as SERVER_SECRET.
 */
export function requireServerSecret(secret: string) {
  const expected = process.env.SERVER_SECRET;
  if (!expected || expected.length < 16 || secret !== expected) {
    throw new Error('Unauthorized');
  }
}

export async function requireUserId(ctx: Ctx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

export async function isAdminIdentity(ctx: Ctx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const ids = (process.env.ADMIN_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (ids.includes(identity.subject)) return true;
  return !!identity.email && emails.includes(identity.email.toLowerCase());
}

// 32-character alphabet (no I, O, 0, 1) -> 256 % 32 === 0 so no modulo bias.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomClaimCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const MAX_PREVIEW_BYTES = 6 * 1024 * 1024;
export const ALLOWED_MIME = ['image/png', 'image/jpeg'];
