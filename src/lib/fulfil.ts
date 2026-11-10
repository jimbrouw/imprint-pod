import type Stripe from 'stripe';
import { convexServer, serverSecret, appUrl } from './convex-server';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { createProdigiOrder } from './prodigi';
import { sendEmail, receiptEmail } from './email';
import type { ShippingAddress } from './types';

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

  // Print: submit to Prodigi exactly once.
  if (ctx.type === 'print' && !ctx.prodigiOrderId && ctx.paymentStatus !== 'refunded') {
    try {
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
