import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireServerSecret } from './helpers';

const sizeValidator = v.union(v.literal('A5'), v.literal('A4'), v.literal('A3'));

const fulfilmentValidator = v.union(
  v.literal('not_applicable'),
  v.literal('pending'),
  v.literal('submitted'),
  v.literal('in_production'),
  v.literal('shipped'),
  v.literal('delivered'),
  v.literal('failed'),
  v.literal('cancelled')
);

/** Validates a purchase request and creates an unpaid order. Prices come from the DB, never the client. */
export const serverCreateOrder = mutation({
  args: {
    secret: v.string(),
    claimToken: v.string(),
    type: v.union(v.literal('digital'), v.literal('print')),
    productSize: v.optional(sizeValidator),
    shippingAddress: v.optional(v.any()),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const customer = await ctx.db
      .query('customers')
      .withIndex('by_claim_token', (q) => q.eq('claimToken', args.claimToken))
      .first();
    if (!customer) throw new Error('Artwork not found');

    const artwork = await ctx.db
      .query('artworks')
      .withIndex('by_customer', (q) => q.eq('customerId', customer._id))
      .first();
    if (!artwork || artwork.status === 'pending' || !artwork.originalReady) {
      throw new Error('This artwork is still being prepared. Please try again in a moment.');
    }

    const event = await ctx.db.get(customer.eventId);
    if (!event || !event.isActive) throw new Error('This event is no longer active');

    const artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', event.artistId))
      .first();
    if (!artist?.stripeAccountId || !artist.stripeOnboardingComplete) {
      throw new Error('The artist has not finished payment setup yet');
    }

    let amount: number;
    if (args.type === 'digital') {
      if (artwork.status === 'paid') throw new Error('You have already purchased this artwork');
      amount = event.digitalPrice;
    } else {
      if (!args.productSize) throw new Error('Choose a print size');
      if (!args.shippingAddress) throw new Error('Shipping address required');
      amount = event.printPrices[args.productSize];
    }

    const orderId = await ctx.db.insert('orders', {
      artistId: event.artistId,
      eventId: event._id,
      artworkId: artwork._id,
      customerId: customer._id,
      type: args.type,
      productSize: args.type === 'print' ? args.productSize : undefined,
      amount,
      currency: event.currency,
      paymentStatus: 'unpaid',
      fulfilmentStatus: 'not_applicable',
      shippingAddress: args.type === 'print' ? args.shippingAddress : undefined,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });

    return {
      orderId,
      amount,
      currency: event.currency,
      stripeAccountId: artist.stripeAccountId,
      eventTitle: event.title,
      customerName: customer.name,
      customerEmail: customer.email ?? null,
    };
  },
});

export const serverAttachSession = mutation({
  args: {
    secret: v.string(),
    orderId: v.id('orders'),
    sessionId: v.string(),
    platformFee: v.number(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    await ctx.db.patch(args.orderId, {
      stripeCheckoutSessionId: args.sessionId,
      platformFee: args.platformFee,
      paymentStatus: 'pending',
    });
  },
});

async function buildContext(ctx: any, order: any, includeOriginal: boolean) {
  const customer = await ctx.db.get(order.customerId);
  const event = order.eventId ? await ctx.db.get(order.eventId) : null;
  const artwork = await ctx.db.get(order.artworkId);
  const artist = await ctx.db
    .query('artists')
    .withIndex('by_user_id', (q: any) => q.eq('userId', order.artistId))
    .first();
  const originalUrl =
    includeOriginal && artwork?.originalStorageId ? await ctx.storage.getUrl(artwork.originalStorageId) : null;
  return {
    orderId: order._id as string,
    type: order.type as 'digital' | 'print',
    productSize: (order.productSize ?? null) as 'A5' | 'A4' | 'A3' | null,
    amount: order.amount as number,
    currency: order.currency as string,
    paymentStatus: order.paymentStatus as string,
    fulfilmentStatus: order.fulfilmentStatus as string,
    prodigiOrderId: (order.prodigiOrderId ?? null) as string | null,
    receiptSent: !!order.receiptSentAt,
    shippingAddress: order.shippingAddress ?? null,
    customerName: (customer?.name ?? '') as string,
    customerEmail: (customer?.email ?? null) as string | null,
    claimToken: (customer?.claimToken ?? '') as string,
    eventTitle: (event?.title ?? '') as string,
    artistName: (artist?.name ?? '') as string,
    originalUrl: originalUrl as string | null,
  };
}

/**
 * Idempotent: marks the order behind a Checkout Session as paid (safe to call from the
 * webhook AND the success page). Returns context for fulfilment + emails.
 */
export const serverMarkPaid = mutation({
  args: {
    secret: v.string(),
    sessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const order = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.sessionId))
      .first();
    if (!order) throw new Error('Order not found for session');

    if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded') {
      await ctx.db.patch(order._id, {
        paymentStatus: 'paid',
        paidAt: Date.now(),
        stripePaymentIntentId: args.paymentIntentId ?? order.stripePaymentIntentId,
        fulfilmentStatus: order.type === 'print' ? 'pending' : 'not_applicable',
      });
      if (order.type === 'digital') {
        await ctx.db.patch(order.artworkId, { status: 'paid' });
      }
    }

    const customer = await ctx.db.get(order.customerId);
    if (customer && !customer.email && args.customerEmail) {
      await ctx.db.patch(customer._id, { email: args.customerEmail });
    }

    const fresh = (await ctx.db.get(order._id))!;
    const result = await buildContext(ctx, fresh, fresh.type === 'print');
    if (!result.customerEmail && args.customerEmail) result.customerEmail = args.customerEmail;
    return result;
  },
});

export const serverMarkReceiptSent = mutation({
  args: { secret: v.string(), orderId: v.id('orders') },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    await ctx.db.patch(args.orderId, { receiptSentAt: Date.now() });
  },
});

export const serverSetFulfilment = mutation({
  args: {
    secret: v.string(),
    orderId: v.id('orders'),
    fulfilmentStatus: fulfilmentValidator,
    prodigiOrderId: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const order = await ctx.db.get(args.orderId);
    if (!order) return false;
    await ctx.db.patch(args.orderId, {
      fulfilmentStatus: args.fulfilmentStatus,
      prodigiOrderId: args.prodigiOrderId ?? order.prodigiOrderId,
      failureMessage: args.failureMessage,
    });
    return true;
  },
});

export const serverMarkSessionFailed = mutation({
  args: { secret: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const order = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.sessionId))
      .first();
    if (order && (order.paymentStatus === 'unpaid' || order.paymentStatus === 'pending')) {
      await ctx.db.patch(order._id, { paymentStatus: 'failed' });
    }
  },
});

/** Refund: revoke digital access and flag print orders. */
export const serverMarkRefunded = mutation({
  args: { secret: v.string(), paymentIntentId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const order = await ctx.db
      .query('orders')
      .withIndex('by_payment_intent', (q) => q.eq('stripePaymentIntentId', args.paymentIntentId))
      .first();
    if (!order || order.paymentStatus === 'refunded') return false;
    await ctx.db.patch(order._id, { paymentStatus: 'refunded' });
    if (order.type === 'digital') {
      const artwork = await ctx.db.get(order.artworkId);
      if (artwork && artwork.status === 'paid') await ctx.db.patch(artwork._id, { status: 'uploaded' });
    }
    return true;
  },
});

export const serverGetOrderBySession = query({
  args: { secret: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const order = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.sessionId))
      .first();
    if (!order) return null;
    return await buildContext(ctx, order, false);
  },
});

export const serverWebhookSeen = query({
  args: { secret: v.string(), provider: v.union(v.literal('stripe'), v.literal('prodigi')), externalEventId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const row = await ctx.db
      .query('webhookEvents')
      .withIndex('by_external_id', (q) => q.eq('provider', args.provider).eq('externalEventId', args.externalEventId))
      .first();
    return !!row;
  },
});

export const serverWebhookDone = mutation({
  args: {
    secret: v.string(),
    provider: v.union(v.literal('stripe'), v.literal('prodigi')),
    externalEventId: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const row = await ctx.db
      .query('webhookEvents')
      .withIndex('by_external_id', (q) => q.eq('provider', args.provider).eq('externalEventId', args.externalEventId))
      .first();
    if (row) return;
    await ctx.db.insert('webhookEvents', {
      provider: args.provider,
      externalEventId: args.externalEventId,
      payload: { type: args.type },
      processedAt: Date.now(),
    });
  },
});
