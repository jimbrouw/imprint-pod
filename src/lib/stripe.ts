import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
  appInfo: {
    name: 'Live Artist Checkout',
    version: '1.0.0',
  },
});

export function calculatePlatformFee(amount: number): number {
  const feeBps = parseInt(process.env.STRIPE_PLATFORM_FEE_BPS || '1000', 10); // 10% default
  return Math.round((amount * feeBps) / 10000);
}
