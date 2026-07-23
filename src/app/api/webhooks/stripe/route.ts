import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createProdigiOrder } from '@/lib/prodigi';
import { getConvexClient } from '@/lib/convexServer';
import { api } from '../../../../../convex/_generated/api';
import type { ShippingAddress } from '@/lib/types';

function shippingAddressFromSession(session: Stripe.Checkout.Session): ShippingAddress | undefined {
  const details = session.shipping_details ?? session.customer_details;
  const address = details?.address;
  if (!address?.line1 || !address.city || !address.postal_code || !address.country) return undefined;

  return {
    line1: address.line1,
    line2: address.line2 ?? undefined,
    city: address.city,
    state: address.state ?? undefined,
    postcode: address.postal_code,
    country: address.country,
  };
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const convex = getConvexClient();

  // Stripe retries webhook deliveries until it gets a 2xx — this is the
  // idempotency guard against reprocessing (double-crediting an order,
  // double-submitting a Prodigi print) on a retried delivery.
  const { alreadyProcessed } = await convex.mutation(api.orders.recordWebhookEvent, {
    provider: 'stripe',
    externalEventId: event.id,
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, deduped: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const order = await convex.mutation(api.orders.markOrderPaid, {
        stripeCheckoutSessionId: session.id,
        shippingAddress: shippingAddressFromSession(session),
      });

      if (order.type === 'print') {
        const shipping = shippingAddressFromSession(session);
        const details = await convex.query(api.orders.getOrderBySessionId, {
          stripeCheckoutSessionId: session.id,
        });

        if (shipping && details?.downloadUrl) {
          const prodigiOrder = await createProdigiOrder({
            orderId: session.id,
            artworkUrl: details.downloadUrl,
            productSize: order.productSize!,
            recipientName: session.customer_details?.name || 'Customer',
            recipientEmail: session.customer_details?.email || undefined,
            shippingAddress: shipping,
          });
          await convex.mutation(api.orders.setProdigiOrder, {
            stripeCheckoutSessionId: session.id,
            prodigiOrderId: prodigiOrder.id,
          });
        } else {
          console.error(`Print order ${session.id} paid but missing shipping address or artwork URL`);
        }
      }
    } catch (err) {
      console.error('Failed to process checkout.session.completed:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
