import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import {
  requireUserId,
  requireServerSecret,
  ALLOWED_MIME,
  MAX_ORIGINAL_BYTES,
  MAX_PREVIEW_BYTES,
} from './helpers';
import { insertCustomer } from './customers';

/**
 * Artist starts an upload. Creates (or reuses) the customer + artwork records and
 * returns two upload URLs: a small watermarked preview (fast) and the full original.
 */
export const presignArtworkUpload = mutation({
  args: {
    eventId: v.id('events'),
    customerId: v.optional(v.id('customers')),
    customerName: v.optional(v.string()),
    price: v.optional(v.number()), // per-artwork digital price in minor units
    mimeType: v.string(), // mime type of the ORIGINAL
    originalByteSize: v.number(),
    previewByteSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.artistId !== userId) throw new Error('Event not found');

    if (!ALLOWED_MIME.includes(args.mimeType)) throw new Error('Only PNG or JPEG images are supported');
    if (args.originalByteSize < 1 || args.originalByteSize > MAX_ORIGINAL_BYTES) {
      throw new Error('File size must be under 25 MB');
    }
    if (args.previewByteSize < 1 || args.previewByteSize > MAX_PREVIEW_BYTES) {
      throw new Error('Preview too large');
    }

    if (args.price !== undefined && (!Number.isInteger(args.price) || args.price < 100 || args.price > 100000)) {
      throw new Error('Price must be between 1.00 and 1000.00');
    }

    let customerId = args.customerId;
    let claimCode: string;
    let claimToken: string;

    if (customerId) {
      const customer = await ctx.db.get(customerId);
      if (!customer || customer.eventId !== args.eventId) throw new Error('Customer not found');
      claimCode = customer.claimCode;
      claimToken = customer.claimToken;
    } else {
      const name = args.customerName?.trim();
      if (!name || name.length > 120) throw new Error('Customer name required');
      const created = await insertCustomer(ctx, args.eventId, name);
      customerId = created.customerId;
      claimCode = created.claimCode;
      claimToken = created.claimToken;
    }

    const existing = await ctx.db
      .query('artworks')
      .withIndex('by_customer', (q) => q.eq('customerId', customerId!))
      .first();

    let artworkId;
    if (existing) {
      if (existing.status === 'paid') throw new Error('This portrait has already been purchased');
      // Re-upload: drop the old files and reset.
      if (existing.previewStorageId) await ctx.storage.delete(existing.previewStorageId);
      if (existing.originalStorageId) await ctx.storage.delete(existing.originalStorageId);
      await ctx.db.patch(existing._id, {
        previewStorageId: undefined,
        originalStorageId: undefined,
        originalReady: false,
        status: 'pending',
        mimeType: args.mimeType,
        byteSize: args.originalByteSize,
        price: args.price ?? existing.price,
        uploadedAt: undefined,
      });
      artworkId = existing._id;
    } else {
      artworkId = await ctx.db.insert('artworks', {
        customerId,
        artistId: userId,
        mimeType: args.mimeType,
        byteSize: args.originalByteSize,
        originalReady: false,
        status: 'pending',
        price: args.price,
        createdAt: Date.now(),
      });
    }

    return {
      artworkId,
      customerId,
      claimCode,
      claimToken,
      previewUploadUrl: await ctx.storage.generateUploadUrl(),
      originalUploadUrl: await ctx.storage.generateUploadUrl(),
    };
  },
});

export const completePreview = mutation({
  args: { artworkId: v.id('artworks'), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const artwork = await ctx.db.get(args.artworkId);
    if (!artwork || artwork.artistId !== userId) throw new Error('Artwork not found');
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta || !ALLOWED_MIME.includes(meta.contentType ?? '') || meta.size > MAX_PREVIEW_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error('Invalid preview upload');
    }
    await ctx.db.patch(args.artworkId, {
      previewStorageId: args.storageId,
      status: artwork.status === 'paid' ? 'paid' : 'uploaded',
      uploadedAt: Date.now(),
    });
  },
});

export const completeOriginal = mutation({
  args: { artworkId: v.id('artworks'), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const artwork = await ctx.db.get(args.artworkId);
    if (!artwork || artwork.artistId !== userId) throw new Error('Artwork not found');
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta || !ALLOWED_MIME.includes(meta.contentType ?? '') || meta.size > MAX_ORIGINAL_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error('Invalid original upload');
    }
    await ctx.db.patch(args.artworkId, {
      originalStorageId: args.storageId,
      originalReady: true,
      mimeType: meta.contentType ?? artwork.mimeType,
      byteSize: meta.size,
    });
  },
});

/** Public (token-gated): everything the customer purchase page needs. */
export const getArtworkByToken = query({
  args: { claimToken: v.string() },
  handler: async (ctx, args) => {
    if (args.claimToken.length < 32) return null;
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
    if (!event || !artwork) return null;

    const artist = await ctx.db
      .query('artists')
      .withIndex('by_user_id', (q) => q.eq('userId', event.artistId))
      .first();

    const previewUrl = artwork.previewStorageId ? await ctx.storage.getUrl(artwork.previewStorageId) : null;
    const logoUrl = event.logoStorageId ? await ctx.storage.getUrl(event.logoStorageId) : null;

    return {
      customerName: customer.name,
      eventTitle: event.title,
      logoUrl,
      digitalPrice: artwork.price ?? event.digitalPrice,
      printPrices: event.printPrices,
      currency: event.currency,
      previewUrl,
      originalReady: artwork.originalReady,
      isPaid: artwork.status === 'paid',
      sellerReady: !!artist?.stripeOnboardingComplete && event.isActive,
    };
  },
});

// ---- Server-only ----

/** Returns the original file URL only if the digital copy has been paid for. */
export const serverGetDownload = query({
  args: { secret: v.string(), claimToken: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const customer = await ctx.db
      .query('customers')
      .withIndex('by_claim_token', (q) => q.eq('claimToken', args.claimToken))
      .first();
    if (!customer) return null;
    const artwork = await ctx.db
      .query('artworks')
      .withIndex('by_customer', (q) => q.eq('customerId', customer._id))
      .first();
    if (!artwork || artwork.status !== 'paid' || !artwork.originalStorageId) return null;
    const url = await ctx.storage.getUrl(artwork.originalStorageId);
    if (!url) return null;
    return { url, mimeType: artwork.mimeType, customerName: customer.name };
  },
});
