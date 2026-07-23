// @ts-nocheck
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthenticated call to storeUser');
    }

    const existing = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
      });
      return existing._id;
    }

    return await ctx.db.insert('artists', {
      userId: identity.subject,
      name: identity.name ?? 'Unnamed Artist',
      email: identity.email ?? '',
      stripeOnboardingComplete: false,
      defaultCurrency: 'gbp',
      createdAt: Date.now(),
    });
  },
});

export const getMyArtist = query({
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

// Called by the /api/connect/onboard route (server-to-server), not the
// browser directly, but still Clerk-auth-gated so one artist can't set
// another artist's Stripe account.
export const setStripeAccount = mutation({
  args: {
    stripeAccountId: v.string(),
    stripeOnboardingComplete: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated call to setStripeAccount');

    const artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', identity.subject))
      .first();
    if (!artist) throw new Error('Artist record not found');

    await ctx.db.patch(artist._id, {
      stripeAccountId: args.stripeAccountId,
      stripeOnboardingComplete: args.stripeOnboardingComplete,
    });
  },
});
