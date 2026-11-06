import Stripe from 'stripe';
import type { ProductSize } from './types';

let _stripe: Stripe | null = null;

/** Lazily constructed so builds don't fail when STRIPE_SECRET_KEY isn't set. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, {
      apiVersion: '2025-01-27.acacia' as any,
      appInfo: { name: 'Live Artist Checkout', version: '1.0.0' },
    });
  }
  return _stripe;
}

function feeBps(): number {
  const n = parseInt(process.env.STRIPE_PLATFORM_FEE_BPS || '1000', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 10000) : 1000;
}

/**
 * Platform fee in minor units.
 * Digital: bps of the price.
 * Print: the print lab cost (paid by the platform to Prodigi, recovered here) + bps of the remainder.
 */
export function calculatePlatformFee(amount: number, type: 'digital' | 'print', size?: ProductSize | null): number {
  if (type === 'digital') return Math.min(amount, Math.round((amount * feeBps()) / 10000));
  const cost = size ? parseInt(process.env[`PRINT_COST_${size}`] || '', 10) : NaN;
  const defaultCost = { A5: 600, A4: 900, A3: 1500 }[size ?? 'A4'];
  const printCost = Number.isFinite(cost) ? cost : defaultCost;
  const remainder = Math.max(amount - printCost, 0);
  return Math.min(amount, printCost + Math.round((remainder * feeBps()) / 10000));
}
