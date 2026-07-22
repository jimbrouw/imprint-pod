// @ts-nocheck
import { mutation } from './_generated/server';

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
