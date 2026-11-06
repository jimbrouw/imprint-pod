import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getStripe, calculatePlatformFee } from '@/lib/stripe';
import { convexServer, serverSecret, appUrl } from '@/lib/convex-server';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Shipping = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).optional(),
  postcode: z.string().trim().min(2).max(20),
  country: z.string().trim().length(2).toUpperCase().default('GB'),
});

const Body = z.discriminatedUnion('type', [
  z.object({ claimToken: z.string().min(32).max(128), type: z.literal('digital') }),
  z.object({
    claimToken: z.string().min(32).max(128),
    type: z.literal('print'),
    productSize: z.enum(['A5', 'A4', 'A3']),
    shipping: Shipping,
  }),
]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: 'Invalid checkout request. Check your address details.' } }, { status: 400 });
  }
  const body = parsed.data;

  const convex = convexServer();
  const secret = serverSecret();
  const idempotencyKey = crypto.randomUUID();

  let order;
  try {
    order = await convex.mutation(api.orders.serverCreateOrder, {
      secret,
      claimToken: body.claimToken,
      type: body.type,
      productSize: body.type === 'print' ? body.productSize : undefined,
      shippingAddress: body.type === 'print' ? body.shipping : undefined,
      idempotencyKey,
    });
  } catch (err: any) {
    // Convex wraps thrown Errors; surface the human-readable part.
    const msg = String(err?.data || err?.message || '').replace(/^[\s\S]*Uncaught Error:\s*/, '').split('\n')[0];
    return NextResponse.json({ error: { message: msg || 'Unable to start checkout' } }, { status: 400 });
  }

  try {
    const base = appUrl(new URL(req.url).origin);
    const size = body.type === 'print' ? body.productSize : null;
    const fee = calculatePlatformFee(order.amount, body.type, size);
    const productName =
      body.type === 'digital'
        ? `Digital portrait for ${order.customerName}`
        : `${size} archival print for ${order.customerName}`;

    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: order.orderId,
        customer_email: order.customerEmail ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: order.currency,
              unit_amount: order.amount,
              product_data: { name: productName, description: order.eventTitle },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: fee,
          transfer_data: { destination: order.stripeAccountId },
          metadata: { orderId: order.orderId },
        },
        metadata: { orderId: order.orderId },
        success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/artwork/${body.claimToken}`,
      },
      { idempotencyKey }
    );

    await convex.mutation(api.orders.serverAttachSession, {
      secret,
      orderId: order.orderId as Id<'orders'>,
      sessionId: session.id,
      platformFee: fee,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout]', err);
    await convex
      .mutation(api.orders.serverSetFulfilment, {
        secret,
        orderId: order.orderId as Id<'orders'>,
        fulfilmentStatus: 'not_applicable',
        failureMessage: `Checkout creation failed: ${String(err?.message || err).slice(0, 300)}`,
      })
      .catch(() => {});
    return NextResponse.json({ error: { message: 'Payment provider error. Please try again.' } }, { status: 502 });
  }
}
