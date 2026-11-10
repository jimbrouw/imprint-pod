import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { fulfilCheckoutSession } from '@/lib/fulfil';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verify(raw: string, sig: string): Stripe.Event | null {
  const stripe = getStripe();
  // Platform events and Connect ("events on connected accounts") use different signing secrets.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    Boolean
  ) as string[];
  for (const s of secrets) {
    try {
      return stripe.webhooks.constructEvent(raw, sig, s);
    } catch {
      /* try next secret */
    }
  }
  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const raw = await req.text();
  const event = verify(raw, sig);
  if (!event) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  const convex = convexServer();
  const secret = serverSecret();

  if (await convex.query(api.orders.serverWebhookSeen, { secret, provider: 'stripe', externalEventId: event.id })) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') await fulfilCheckoutSession(session);
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await convex.mutation(api.orders.serverMarkSessionFailed, { secret, sessionId: session.id });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (pi && charge.refunded) {
          await convex.mutation(api.orders.serverMarkRefunded, { secret, paymentIntentId: pi });
        }
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await convex.mutation(api.artists.serverSetOnboardingStatus, {
          secret,
          stripeAccountId: account.id,
          complete: !!account.details_submitted && !!account.charges_enabled,
        });
        break;
      }
      default:
        break;
    }

    await convex.mutation(api.orders.serverWebhookDone, {
      secret,
      provider: 'stripe',
      externalEventId: event.id,
      type: event.type,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    // 500 => Stripe retries with backoff; all handlers above are idempotent.
    console.error('[webhooks/stripe]', event.type, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}
