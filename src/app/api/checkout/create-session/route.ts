import { NextRequest, NextResponse } from 'next/server';
import { stripe, calculatePlatformFee } from '@/lib/stripe';
import { getConvexClient } from '@/lib/convexServer';
import { api } from '../../../../../convex/_generated/api';
import type { ProductSize } from '@/lib/types';

const PRINT_SHIP_COUNTRIES: Array<'GB' | 'US' | 'CA' | 'AU' | 'IE' | 'DE' | 'FR' | 'ES' | 'IT' | 'NL'> = [
  'GB', 'US', 'CA', 'AU', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimToken, type, productSize } = body as {
      claimToken: string;
      type: 'digital' | 'print';
      productSize?: ProductSize;
    };

    if (!claimToken || (type !== 'digital' && type !== 'print')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (type === 'print' && !productSize) {
      return NextResponse.json({ error: 'productSize is required for print orders' }, { status: 400 });
    }

    const convex = getConvexClient();
    const ctx = await convex.query(api.artworks.getCheckoutContext, { claimToken });
    if (!ctx) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }
    if (!ctx.stripeAccountId) {
      return NextResponse.json(
        { error: "This artist hasn't connected Stripe yet, so purchases aren't available." },
        { status: 409 }
      );
    }

    const amount = type === 'digital' ? ctx.digitalPrice : ctx.printPrices[productSize!];
    const platformFee = calculatePlatformFee(amount);
    const origin = request.nextUrl.origin;
    const idempotencyKey = crypto.randomUUID();

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: ctx.customerEmail || undefined,
        line_items: [
          {
            price_data: {
              currency: ctx.currency,
              unit_amount: amount,
              product_data: {
                name: `${ctx.eventTitle} — ${type === 'digital' ? 'Digital download' : `${productSize} print`}`,
              },
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: { destination: ctx.stripeAccountId },
        },
        shipping_address_collection:
          type === 'print' ? { allowed_countries: PRINT_SHIP_COUNTRIES } : undefined,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/artwork/${claimToken}`,
      },
      { idempotencyKey }
    );

    await convex.mutation(api.orders.createOrder, {
      artistId: ctx.artistId,
      artworkId: ctx.artworkId,
      customerId: ctx.customerId,
      type,
      productSize,
      amount,
      currency: ctx.currency,
      stripeCheckoutSessionId: session.id,
      idempotencyKey,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout session creation failed:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
