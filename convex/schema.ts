import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  artists: defineTable({
    userId: v.string(), // Clerk User ID
    name: v.string(),
    email: v.string(),
    stripeAccountId: v.optional(v.string()),
    stripeOnboardingComplete: v.boolean(),
    defaultCurrency: v.union(v.literal('gbp'), v.literal('usd'), v.literal('eur')),
    createdAt: v.number(),
  }).index('by_user_id', ['userId']),

  events: defineTable({
    artistId: v.string(),
    title: v.string(),
    eventDate: v.optional(v.string()),
    slug: v.string(),
    isActive: v.boolean(),
    digitalPrice: v.number(), // minor units e.g. 1500
    printPrices: v.object({
      A5: v.number(),
      A4: v.number(),
      A3: v.number(),
    }),
    currency: v.union(v.literal('gbp'), v.literal('usd'), v.literal('eur')),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_artist', ['artistId']),

  customers: defineTable({
    eventId: v.id('events'),
    name: v.string(),
    email: v.optional(v.string()),
    claimCode: v.string(), // 6-character uppercase e.g. "4K7M2Q"
    claimToken: v.string(),
    consentMarketing: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_claim_code', ['eventId', 'claimCode'])
    .index('by_claim_token', ['claimToken'])
    .index('by_event', ['eventId']),

  artworks: defineTable({
    customerId: v.id('customers'),
    artistId: v.string(),
    previewStorageId: v.optional(v.id('_storage')),
    originalStorageId: v.optional(v.id('_storage')),
    mimeType: v.string(),
    byteSize: v.number(),
    originalReady: v.boolean(),
    status: v.union(v.literal('pending'), v.literal('uploaded'), v.literal('paid'), v.literal('archived')),
    uploadedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_customer', ['customerId'])
    .index('by_artist_status', ['artistId', 'status']),

  orders: defineTable({
    artistId: v.string(),
    artworkId: v.id('artworks'),
    customerId: v.id('customers'),
    type: v.union(v.literal('digital'), v.literal('print')),
    productSize: v.optional(v.union(v.literal('A5'), v.literal('A4'), v.literal('A3'))),
    amount: v.number(),
    currency: v.string(),
    paymentStatus: v.union(v.literal('unpaid'), v.literal('pending'), v.literal('paid'), v.literal('failed'), v.literal('refunded')),
    fulfilmentStatus: v.union(v.literal('not_applicable'), v.literal('pending'), v.literal('submitted'), v.literal('in_production'), v.literal('shipped'), v.literal('delivered'), v.literal('failed')),
    stripeCheckoutSessionId: v.optional(v.string()),
    prodigiOrderId: v.optional(v.string()),
    shippingAddress: v.optional(v.any()),
    idempotencyKey: v.string(),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index('by_session', ['stripeCheckoutSessionId'])
    .index('by_artwork', ['artworkId']),

  webhookEvents: defineTable({
    provider: v.union(v.literal('stripe'), v.literal('prodigi')),
    externalEventId: v.string(),
    payload: v.any(),
    processedAt: v.number(),
  }).index('by_external_id', ['provider', 'externalEventId']),
});
