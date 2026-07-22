// @ts-nocheck
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const createCustomer = mutation({
  args: {
    eventId: v.id('events'),
    name: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let claimCode = '';
    for (let i = 0; i < 6; i++) {
      claimCode += chars[Math.floor(Math.random() * chars.length)];
    }
    const claimToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const customerId = await ctx.db.insert('customers', {
      eventId: args.eventId,
      name: args.name,
      email: args.email,
      claimCode,
      claimToken,
      consentMarketing: false,
      createdAt: Date.now(),
    });

    return { customerId, claimCode, claimToken };
  },
});
