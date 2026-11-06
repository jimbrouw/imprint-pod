import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUserId, requireServerSecret, randomClaimCode, randomHex } from './helpers';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

export async function insertCustomer(
  ctx: MutationCtx,
  eventId: Id<'events'>,
  name: string,
  email?: string
) {
  // Claim codes are unique per event; retry on the (unlikely) collision.
  let claimCode = randomClaimCode();
  for (let i = 0; i < 10; i++) {
    const clash = await ctx.db
      .query('customers')
      .withIndex('by_claim_code', (q) => q.eq('eventId', eventId).eq('claimCode', claimCode))
      .first();
    if (!clash) break;
    claimCode = randomClaimCode();
  }
  const claimToken = randomHex(32);
  const customerId = await ctx.db.insert('customers', {
    eventId,
    name,
    email,
    claimCode,
    claimToken,
    consentMarketing: false,
    createdAt: Date.now(),
  });
  return { customerId, claimCode, claimToken };
}

export const createCustomer = mutation({
  args: {
    eventId: v.id('events'),
    name: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.artistId !== userId) throw new Error('Event not found');
    const name = args.name.trim();
    if (name.length < 1 || name.length > 120) throw new Error('Name must be 1-120 characters');
    const email = args.email?.trim() || undefined;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
    return await insertCustomer(ctx, args.eventId, name, email);
  },
});

// ---- Server-only ----

export const serverClaim = query({
  args: { secret: v.string(), slug: v.string(), claimCode: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (!event || !event.isActive) return null;
    const customer = await ctx.db
      .query('customers')
      .withIndex('by_claim_code', (q) =>
        q.eq('eventId', event._id).eq('claimCode', args.claimCode.toUpperCase())
      )
      .first();
    if (!customer) return null;
    const artwork = await ctx.db
      .query('artworks')
      .withIndex('by_customer', (q) => q.eq('customerId', customer._id))
      .first();
    if (!artwork || artwork.status === 'pending') return { ready: false as const };
    return { ready: true as const, claimToken: customer.claimToken };
  },
});
