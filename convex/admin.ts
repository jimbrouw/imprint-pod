import { query } from './_generated/server';
import { isAdminIdentity } from './helpers';

export const isAdmin = query({
  args: {},
  handler: async (ctx) => await isAdminIdentity(ctx),
});

/** Platform admin: artists, events, orders, revenue, platform fees. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminIdentity(ctx))) return null;

    const artists = await ctx.db.query('artists').collect();
    const events = await ctx.db.query('events').collect();
    const orders = await ctx.db.query('orders').order('desc').collect();

    const paid = orders.filter((o) => o.paymentStatus === 'paid');
    const gross = paid.reduce((s, o) => s + o.amount, 0);
    const fees = paid.reduce((s, o) => s + (o.platformFee ?? 0), 0);

    const artistRows = artists.map((a) => {
      const aPaid = paid.filter((o) => o.artistId === a.userId);
      return {
        id: a._id,
        name: a.name,
        email: a.email,
        stripeConnected: !!a.stripeAccountId,
        onboardingComplete: a.stripeOnboardingComplete,
        events: events.filter((e) => e.artistId === a.userId).length,
        orders: aPaid.length,
        revenue: aPaid.reduce((s, o) => s + o.amount, 0),
      };
    });

    const eventTitle = new Map(events.map((e) => [e._id as string, e.title]));
    return {
      totals: {
        artists: artists.length,
        events: events.length,
        paidOrders: paid.length,
        prints: paid.filter((o) => o.type === 'print').length,
        gross,
        fees,
        failedFulfilments: orders.filter((o) => o.fulfilmentStatus === 'failed').length,
      },
      artists: artistRows,
      orders: orders.slice(0, 200).map((o) => ({
        id: o._id,
        createdAt: o.createdAt,
        event: o.eventId ? eventTitle.get(o.eventId) ?? '' : '',
        type: o.type,
        productSize: o.productSize ?? null,
        amount: o.amount,
        platformFee: o.platformFee ?? 0,
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        fulfilmentStatus: o.fulfilmentStatus,
        failureMessage: o.failureMessage ?? null,
      })),
    };
  },
});
