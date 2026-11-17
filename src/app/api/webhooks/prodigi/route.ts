import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Prodigi status callbacks (CloudEvents). Prodigi doesn't sign callbacks, so the callback URL we
 * give it at order time carries ?secret=PRODIGI_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const expected = process.env.PRODIGI_WEBHOOK_SECRET;
  const given = new URL(req.url).searchParams.get('secret') || '';
  if (!expected || !safeEqual(given, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: any = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad payload' }, { status: 400 });

  const type: string = body.type || '';
  const order = body.data?.order;
  const orderId: string | undefined = order?.merchantReference;
  const stage: string | undefined = order?.status?.stage;
  const eventId: string = body.id || `${orderId}:${type}:${stage}`;
  if (!orderId) return NextResponse.json({ received: true });

  const convex = convexServer();
  const s = serverSecret();

  if (await convex.query(api.orders.serverWebhookSeen, { secret: s, provider: 'prodigi', externalEventId: eventId })) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    let status: 'in_production' | 'shipped' | 'cancelled' | 'failed' | null = null;
    if (type.includes('stage.changed') || stage) {
      if (stage === 'InProgress') status = 'in_production';
      else if (stage === 'Complete') status = 'shipped';
      else if (stage === 'Cancelled') status = 'cancelled';
    }
    if (type.includes('failed')) status = 'failed';

    if (status) {
      await convex.mutation(api.orders.serverSetFulfilment, {
        secret: s,
        orderId: orderId as Id<'orders'>,
        fulfilmentStatus: status,
        failureMessage: status === 'failed' ? `Prodigi reported: ${type}` : undefined,
      });
    }
    await convex.mutation(api.orders.serverWebhookDone, {
      secret: s,
      provider: 'prodigi',
      externalEventId: eventId,
      type,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhooks/prodigi]', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}
