import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireServerSecret } from './helpers';

/**
 * Fixed-window rate limit. Returns true if the attempt is allowed, false if the limit is exceeded.
 * Runs as a mutation so concurrent serverless instances all see the same counter.
 */
export const serverCheckRateLimit = mutation({
  args: { secret: v.string(), key: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const now = Date.now();
    const row = await ctx.db
      .query('claimAttempts')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first();
    if (!row || now - row.windowStart >= args.windowMs) {
      if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
      else await ctx.db.insert('claimAttempts', { key: args.key, windowStart: now, count: 1 });
      return true;
    }
    if (row.count >= args.limit) return false;
    await ctx.db.patch(row._id, { count: row.count + 1 });
    return true;
  },
});
