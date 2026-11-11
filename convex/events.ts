import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireUserId, randomHex } from './helpers';

async function getOwnedEventBySlug(ctx: QueryCtx | MutationCtx, slug: string, userId: string) {
  const event = await ctx.db
    .query('events')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .first();
  if (!event || event.artistId !== userId) return null;
  return event;
}

export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    eventDate: v.optional(v.string()),
    digitalPrice: v.number(),
    printPrices: v.object({ A5: v.number(), A4: v.number(), A3: v.number() }),
    currency: v.union(v.literal('gbp'), v.literal('usd'), v.literal('eur')),
    logoStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const userId = identity.subject;

    const title = args.title.trim();
    if (title.length < 1 || title.length > 160) throw new Error('Event name must be 1-160 characters');
    const prices = [args.digitalPrice, args.printPrices.A5, args.printPrices.A4, args.printPrices.A3];
    if (prices.some((p) => !Number.isInteger(p) || p < 100 || p > 100000)) {
      throw new Error('Prices must be between 1.00 and 1000.00');
    }

    // Make sure there is an artist profile for this user.
    const artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .first();
    if (!artist) {
      await ctx.db.insert('artists', {
        userId,
        name: identity.name || identity.email || 'Artist',
        email: identity.email || '',
        stripeOnboardingComplete: false,
        defaultCurrency: 'gbp',
        createdAt: Date.now(),
      });
    }

    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'event';
    let slug = `${base}-${randomHex(3)}`;
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('events')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .first();
      if (!clash) break;
      slug = `${base}-${randomHex(4)}`;
    }

    const eventId = await ctx.db.insert('events', {
      artistId: userId,
      title,
      eventDate: args.eventDate,
      slug,
      isActive: true,
      logoStorageId: args.logoStorageId,
      digitalPrice: args.digitalPrice,
      printPrices: args.printPrices,
      currency: args.currency,
      createdAt: Date.now(),
    });
    return { eventId, slug };
  },
});

function slugFor(title: string) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'event';
  return `${base}-${randomHex(4)}`;
}

/** Returns the artist's hidden "quick sale" event, creating it (and the artist row) if missing. */
export const getOrCreateDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const userId = identity.subject;

    const existing = (
      await ctx.db
        .query('events')
        .withIndex('by_artist', (q) => q.eq('artistId', userId))
        .collect()
    ).find((e) => e.isDefault);
    if (existing) return { eventId: existing._id, slug: existing.slug, currency: existing.currency };

    let artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .first();
    if (!artist) {
      const id = await ctx.db.insert('artists', {
        userId,
        name: identity.name || identity.email || 'Artist',
        email: identity.email || '',
        stripeOnboardingComplete: false,
        defaultCurrency: 'gbp',
        createdAt: Date.now(),
      });
      artist = (await ctx.db.get(id))!;
    }

    const title = (artist.name || 'Artist').slice(0, 160);
    const eventId = await ctx.db.insert('events', {
      artistId: userId,
      title,
      slug: slugFor(title),
      isActive: true,
      digitalPrice: 1500,
      printPrices: { A5: 1500, A4: 2200, A3: 3200 },
      currency: artist.defaultCurrency,
      isDefault: true,
      createdAt: Date.now(),
    });
    const event = (await ctx.db.get(eventId))!;
    return { eventId, slug: event.slug, currency: event.currency };
  },
});

export const setEventActive = mutation({
  args: { slug: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await getOwnedEventBySlug(ctx, args.slug, userId);
    if (!event) throw new Error('Event not found');
    await ctx.db.patch(event._id, { isActive: args.isActive });
  },
});

// Dashboard: events, sales and simple stats for the signed-in artist.
export const getDashboard = query({
  args: { sinceMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_artist', (q) => q.eq('artistId', userId))
      .order('desc')
      .collect();
    const events = allEvents.filter((e) => !e.isDefault);

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_artist', (q) => q.eq('artistId', userId))
      .collect();
    const paid = orders.filter((o) => o.paymentStatus === 'paid');
    const net = (o: { amount: number; platformFee?: number }) => o.amount - (o.platformFee ?? 0);

    const artworks = await ctx.db
      .query('artworks')
      .withIndex('by_artist_status', (q) => q.eq('artistId', userId))
      .collect();

    const customerEvent = new Map<string, string>();
    const perEvent = new Map<string, { portraits: number; revenue: number; prints: number }>();
    for (const e of events) perEvent.set(e._id, { portraits: 0, revenue: 0, prints: 0 });

    for (const a of artworks) {
      if (a.status === 'pending') continue;
      let eventId = customerEvent.get(a.customerId);
      if (!eventId) {
        const c = await ctx.db.get(a.customerId);
        if (!c) continue;
        eventId = c.eventId;
        customerEvent.set(a.customerId, eventId);
      }
      const stat = perEvent.get(eventId);
      if (stat) stat.portraits += 1;
    }
    for (const o of paid) {
      const stat = o.eventId ? perEvent.get(o.eventId) : undefined;
      if (stat) {
        stat.revenue += net(o);
        if (o.type === 'print') stat.prints += 1;
      }
    }

    // Recent sales: the 15 newest artworks across all events (including quick sales).
    const newest = [...artworks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);
    const recentSales = [];
    for (const a of newest) {
      const customer = await ctx.db.get(a.customerId);
      if (!customer) continue;
      const event = await ctx.db.get(customer.eventId);
      recentSales.push({
        artworkId: a._id,
        name: customer.name,
        claimToken: customer.claimToken,
        claimCode: customer.claimCode,
        price: a.price ?? event?.digitalPrice ?? 0,
        currency: event?.currency ?? 'gbp',
        paid: a.status === 'paid',
        createdAt: a.createdAt,
      });
    }

    const since = args.sinceMs ?? 0;
    const todayPaid = paid.filter((o) => (o.paidAt ?? 0) >= since);

    const artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .first();

    return {
      stripeConnected: !!artist?.stripeAccountId,
      stripeOnboardingComplete: !!artist?.stripeOnboardingComplete,
      events: events.map((e) => ({ ...e, ...perEvent.get(e._id)! })),
      recentSales,
      today: { sales: todayPaid.length, earned: todayPaid.reduce((s, o) => s + net(o), 0) },
      totals: {
        portraits: artworks.filter((a) => a.status !== 'pending').length,
        revenue: paid.reduce((s, o) => s + net(o), 0),
        printOrders: paid.filter((o) => o.type === 'print').length,
      },
    };
  },
});

// Artist-only: full event for the control room / upload terminal.
export const getEventForArtist = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return undefined; // still loading auth
    return await getOwnedEventBySlug(ctx, args.slug, identity.subject);
  },
});

export const getCustomerQueue = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.artistId !== userId) return [];

    const customers = await ctx.db
      .query('customers')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .order('desc')
      .collect();

    const result = [];
    for (const c of customers) {
      const artworks = await ctx.db
        .query('artworks')
        .withIndex('by_customer', (q) => q.eq('customerId', c._id))
        .collect();
      result.push({ ...c, artworks });
    }
    return result;
  },
});

// Public: only what the customer claim page needs.
export const getPublicEvent = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (!event || !event.isActive) return null;
    const logoUrl = event.logoStorageId ? await ctx.storage.getUrl(event.logoStorageId) : null;
    return { title: event.title, eventDate: event.eventDate ?? null, logoUrl };
  },
});
