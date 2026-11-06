import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireServerSecret } from './helpers';

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', identity.subject))
      .first();
  },
});

// ---- Server-only (Next.js API routes) ----

export const serverEnsureArtist = mutation({
  args: { secret: v.string(), userId: v.string(), name: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const existing = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first();
    if (existing) return existing;
    const id = await ctx.db.insert('artists', {
      userId: args.userId,
      name: args.name || 'Artist',
      email: args.email,
      stripeOnboardingComplete: false,
      defaultCurrency: 'gbp',
      createdAt: Date.now(),
    });
    return (await ctx.db.get(id))!;
  },
});

export const serverGetArtist = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    return await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first();
  },
});

export const serverSetStripeAccount = mutation({
  args: { secret: v.string(), userId: v.string(), stripeAccountId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first();
    if (!artist) throw new Error('Artist not found');
    await ctx.db.patch(artist._id, { stripeAccountId: args.stripeAccountId });
  },
});

export const serverSetOnboardingStatus = mutation({
  args: { secret: v.string(), stripeAccountId: v.string(), complete: v.boolean() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const artist = await ctx.db
      .query('artists')
      .withIndex('by_stripe_account', (q) => q.eq('stripeAccountId', args.stripeAccountId))
      .first();
    if (!artist) return false;
    if (artist.stripeOnboardingComplete !== args.complete) {
      await ctx.db.patch(artist._id, { stripeOnboardingComplete: args.complete });
    }
    return true;
  },
});
