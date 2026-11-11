import type Stripe from 'stripe';
import { convexServer, serverSecret, appUrl } from './convex-server';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { createProdigiOrder } from './prodigi';
import { sendEmail, receiptEmail } from './email';
import type { ShippingAddress } from './types';

/** Maps the address Stripe collected (location depends on API version) to our ShippingAddress. */
export function shippingFromSession(session: Stripe.Checkout.Session): ShippingAddress | null {
  const s = session as any;
  const details = s.collected_information?.shipping_details ?? s.shipping_details;
  const a = details?.address;
  if (!a?.line1 || !a?.postal_code || !a?.country) return null;
  return {
    line1: a.line1,
    line2: a.line2 || undefined,
    city: a.city || '',
    state: a.state || undefined,
    postcode: a.postal_code,
    country: a.country,
  };
}

/**
 * Idempotent post-payment handling: mark paid, submit print to Prodigi (once), send receipt (once).
 * Called from both the Stripe webhook and the checkout success page so whichever
 * arrives first does the work and the other is a no-op.
 *
 * Throws if the Prodigi submission fails, so the Stripe webhook returns 500 and Stripe retries.
 */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session) {
  const convex = convexServer();
  const secret = serverSecret();

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  const ctx = await convex.mutation(api.orders.serverMarkPaid, {
    secret,
    sessionId: session.id,
    paymentIntentId,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
  });

  const orderId = ctx.orderId as Id<'orders'>;

  // Print: save the address Stripe collected, then submit to Prodigi exactly once.
  if (ctx.type === 'print' && !ctx.prodigiOrderId && ctx.paymentStatus !== 'refunded') {
    try {
      if (!ctx.shippingAddress) {
        const address = shippingFromSession(session);
        if (address) {
          await convex.mutation(api.orders.serverSetShippingAddress, { secret, orderId, shippingAddress: address });
          ctx.shippingAddress = address;
        }
      }
      if (!ctx.originalUrl) throw new Error('Original artwork file is missing');
      if (!ctx.productSize || !ctx.shippingAddress) throw new Error('Print order missing size or address');
      const callbackSecret = process.env.PRODIGI_WEBHOOK_SECRET || '';
      const prodigi = await createProdigiOrder({
        orderId: ctx.orderId,
        artworkUrl: ctx.originalUrl,
        productSize: ctx.productSize,
        recipientName: ctx.customerName,
        recipientEmail: ctx.customerEmail ?? undefined,
        shippingAddress: ctx.shippingAddress as ShippingAddress,
        callbackUrl: callbackSecret
          ? `${appUrl()}/api/webhooks/prodigi?secret=${encodeURIComponent(callbackSecret)}`
          : undefined,
      });
      await convex.mutation(api.orders.serverSetFulfilment, {
        secret,
        orderId,
        fulfilmentStatus: 'submitted',
        prodigiOrderId: prodigi.id,
      });
      ctx.prodigiOrderId = prodigi.id;
    } catch (err: any) {
      await convex.mutation(api.orders.serverSetFulfilment, {
        secret,
        orderId,
        fulfilmentStatus: 'failed',
        failureMessage: String(err?.message || err).slice(0, 500),
      });
      throw err;
    }
  }

  // Receipt: once.
  if (!ctx.receiptSent && ctx.customerEmail) {
    const mail = receiptEmail({
      customerName: ctx.customerName,
      eventTitle: ctx.eventTitle,
      type: ctx.type,
      productSize: ctx.productSize,
      amount: ctx.amount,
      currency: ctx.currency,
      artworkUrl: `${appUrl()}/artwork/${ctx.claimToken}`,
    });
    const sent = await sendEmail({ to: ctx.customerEmail, ...mail });
    if (sent) await convex.mutation(api.orders.serverMarkReceiptSent, { secret, orderId });
  }

  return ctx;
}
