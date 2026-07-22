// @ts-nocheck
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const presignArtworkUpload = mutation({
  args: {
    eventId: v.id('events'),
    customerName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let claimCode = '';
    for (let i = 0; i < 6; i++) {
      claimCode += chars[Math.floor(Math.random() * chars.length)];
    }
    const claimToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const customerId = await ctx.db.insert('customers', {
      eventId: args.eventId,
      name: args.customerName,
      claimCode,
      claimToken,
      consentMarketing: false,
      createdAt: Date.now(),
    });

    const artworkId = await ctx.db.insert('artworks', {
      customerId,
      artistId: event.artistId,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      originalReady: false,
      status: 'pending',
      createdAt: Date.now(),
    });

    const uploadUrl = await ctx.storage.generateUploadUrl();

    return {
      artworkId,
      customerId,
      claimCode,
      claimToken,
      uploadUrl,
    };
  },
});

export const completePreview = mutation({
  args: {
    artworkId: v.id('artworks'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.artworkId, {
      previewStorageId: args.storageId,
      status: 'uploaded',
      uploadedAt: Date.now(),
    });

    const artwork = await ctx.db.get(args.artworkId);
    const customer = artwork ? await ctx.db.get(artwork.customerId) : null;

    return {
      artworkId: args.artworkId,
      claimToken: customer?.claimToken,
    };
  },
});

export const completeOriginal = mutation({
  args: {
    artworkId: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.artworkId, {
      originalStorageId: args.storageId,
      originalReady: true,
    });
  },
});

export const getArtworkByToken = query({
  args: { claimToken: v.string() },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query('customers')
      .withIndex('by_claim_token', (q) => q.eq('claimToken', args.claimToken))
      .first();

    if (!customer) return null;

    const event = await ctx.db.get(customer.eventId);
    const artwork = await ctx.db
      .query('artworks')
      .withIndex('by_customer', (q) => q.eq('customerId', customer._id))
      .first();

    let previewUrl = null;
    if (artwork?.previewStorageId) {
      previewUrl = await ctx.storage.getUrl(artwork.previewStorageId);
    }

    return {
      customerName: customer.name,
      eventTitle: event?.title,
      digitalPrice: event?.digitalPrice,
      printPrices: event?.printPrices,
      currency: event?.currency,
      previewUrl,
      artworkId: artwork?._id,
      isPaid: artwork?.status === 'paid',
    };
  },
});
