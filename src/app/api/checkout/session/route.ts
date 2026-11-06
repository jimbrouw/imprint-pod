import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { fulfilCheckoutSession } from '@/lib/fulfil';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called by the success page. Asks Stripe for the truth (never trusts the URL), runs the same
 * idempotent fulfilment as the webhook so the customer never waits on webhook latency.
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: { message: 'Missing session' } }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const convex = convexServer();
    const secret = serverSecret();

    if (session.payment_status === 'paid') {
      try {
        await fulfilCheckoutSession(session);
      } catch (err) {
        // Prodigi hiccup: payment is still valid; the webhook retry will resubmit.
        console.error('[checkout/session] fulfilment error', err);
      }
    }

    const order = await convex.query(api.orders.serverGetOrderBySession, { secret, sessionId });
    if (!order) return NextResponse.json({ error: { message: 'Order not found' } }, { status: 404 });

    return NextResponse.json({
      paid: order.paymentStatus === 'paid',
      paymentStatus: order.paymentStatus,
      type: order.type,
      productSize: order.productSize,
      fulfilmentStatus: order.fulfilmentStatus,
      claimToken: order.claimToken,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error('[checkout/session]', err);
    return NextResponse.json({ error: { message: 'Could not verify payment' } }, { status: 500 });
  }
}
