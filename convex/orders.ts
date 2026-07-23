// @ts-nocheck
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createOrder = mutation({
  args: {
    artistId: v.string(),
    artworkId: v.id('artworks'),
    customerId: v.id('customers'),
    type: v.union(v.literal('digital'), v.literal('print')),
    productSize: v.optional(v.union(v.literal('A5'), v.literal('A4'), v.literal('A3'))),
    amount: v.number(),
    currency: v.string(),
    stripeCheckoutSessionId: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.stripeCheckoutSessionId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert('orders', {
      artistId: args.artistId,
      artworkId: args.artworkId,
      customerId: args.customerId,
      type: args.type,
      productSize: args.productSize,
      amount: args.amount,
      currency: args.currency,
      paymentStatus: 'unpaid',
      fulfilmentStatus: args.type === 'print' ? 'pending' : 'not_applicable',
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });
  },
});

// Called only from the Stripe webhook route. Not auth-gated because the
// caller is our own server, not a signed-in user — the webhook route is
// what verifies the Stripe signature before ever calling this.
export const markOrderPaid = mutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    shippingAddress: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.stripeCheckoutSessionId))
      .first();
    if (!order) throw new Error(`No order found for session ${args.stripeCheckoutSessionId}`);

    if (order.paymentStatus === 'paid') return order; // already processed, webhook retry

    await ctx.db.patch(order._id, {
      paymentStatus: 'paid',
      paidAt: Date.now(),
      shippingAddress: args.shippingAddress ?? order.shippingAddress,
    });
    await ctx.db.patch(order.artworkId, { status: 'paid' });

    return order;
  },
});

export const setProdigiOrder = mutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    prodigiOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.stripeCheckoutSessionId))
      .first();
    if (!order) throw new Error(`No order found for session ${args.stripeCheckoutSessionId}`);

    await ctx.db.patch(order._id, {
      prodigiOrderId: args.prodigiOrderId,
      fulfilmentStatus: 'submitted',
    });
  },
});

// Has this externalEventId from this provider already been processed?
// Stripe retries webhook deliveries, so this is the real idempotency guard —
// markOrderPaid alone only protects against double-processing, not against
// re-running side effects like the Prodigi order submission below it.
export const recordWebhookEvent = mutation({
  args: {
    provider: v.union(v.literal('stripe'), v.literal('prodigi')),
    externalEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('webhookEvents')
      .withIndex('by_external_id', (q) => q.eq('provider', args.provider).eq('externalEventId', args.externalEventId))
      .first();
    if (existing) return { alreadyProcessed: true };

    await ctx.db.insert('webhookEvents', {
      provider: args.provider,
      externalEventId: args.externalEventId,
      payload: {},
      processedAt: Date.now(),
    });
    return { alreadyProcessed: false };
  },
});

export const getOrderBySessionId = query({
  args: { stripeCheckoutSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_session', (q) => q.eq('stripeCheckoutSessionId', args.stripeCheckoutSessionId))
      .first();
    if (!order) return null;

    const artwork = await ctx.db.get(order.artworkId);
    let downloadUrl = null;
    if (artwork?.originalStorageId) {
      downloadUrl = await ctx.storage.getUrl(artwork.originalStorageId);
    } else if (artwork?.previewStorageId) {
      downloadUrl = await ctx.storage.getUrl(artwork.previewStorageId);
    }

    return {
      type: order.type,
      productSize: order.productSize,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      downloadUrl,
    };
  },
});
