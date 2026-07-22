// @ts-nocheck
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const createEvent = mutation({
  args: {
    artistId: v.string(),
    title: v.string(),
    eventDate: v.optional(v.string()),
    digitalPrice: v.number(),
    printPrices: v.object({ A5: v.number(), A4: v.number(), A3: v.number() }),
    currency: v.union(v.literal('gbp'), v.literal('usd'), v.literal('eur')),
  },
  handler: async (ctx, args) => {
    const slug = `${args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
    const eventId = await ctx.db.insert('events', {
      artistId: args.artistId,
      title: args.title,
      eventDate: args.eventDate,
      slug,
      isActive: true,
      digitalPrice: args.digitalPrice,
      printPrices: args.printPrices,
      currency: args.currency,
      createdAt: Date.now(),
    });
    return { eventId, slug };
  },
});

export const getArtistEvents = query({
  args: { artistId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .withIndex('by_artist', (q) => q.eq('artistId', args.artistId))
      .order('desc')
      .collect();
  },
});

export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
  },
});

export const getCustomerQueue = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
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

export const getEvent = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});
