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
      appInfo: { name: 'Drawn Checkout', version: '1.0.0' },
    });
  }
  return _stripe;
}

function feeBps(): number {
  const n = parseInt(process.env.STRIPE_PLATFORM_FEE_BPS || '1000', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 10000) : 1000;
}

/** Minimum fee on digital sales (minor units). Stripe's processing fee is charged to the platform. */
function minFee(): number {
  const n = parseInt(process.env.STRIPE_MIN_FEE || '50', 10);
  return Number.isFinite(n) ? Math.max(n, 0) : 50;
}

/**
 * Pure fee maths (minor units). The fee never exceeds the amount.
 * Digital: max(bps of price, minFee).
 * Print: print lab cost (recovered here) + bps of the remainder.
 */
export function computePlatformFee(
  amount: number,
  type: 'digital' | 'print',
  opts: { bps: number; minFee: number; printCost: number }
): number {
  if (type === 'digital') {
    return Math.min(amount, Math.max(Math.round((amount * opts.bps) / 10000), opts.minFee));
  }
  const remainder = Math.max(amount - opts.printCost, 0);
  return Math.min(amount, opts.printCost + Math.round((remainder * opts.bps) / 10000));
}

export function calculatePlatformFee(amount: number, type: 'digital' | 'print', size?: ProductSize | null): number {
  const cost = size ? parseInt(process.env[`PRINT_COST_${size}`] || '', 10) : NaN;
  const defaultCost = { A5: 600, A4: 900, A3: 1500 }[size ?? 'A4'];
  return computePlatformFee(amount, type, {
    bps: feeBps(),
    minFee: minFee(),
    printCost: Number.isFinite(cost) ? cost : defaultCost,
  });
}

const V2_VERSION = '2026-10-28.endive';

/** Minimal client for Stripe's v2 API (Accounts v2). Uses fetch so the pinned SDK version doesn't matter. */
export async function stripeV2<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Stripe-Version': V2_VERSION,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe v2 request failed (${res.status})`);
  return data as T;
}

/** An Accounts v2 connected account can take card payments and receive transfers. */
export function isV2AccountReady(account: any): boolean {
  const cfg = account?.configuration;
  const card = cfg?.merchant?.capabilities?.card_payments?.status;
  const transfers = cfg?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  return card === 'active' && transfers === 'active';
}
