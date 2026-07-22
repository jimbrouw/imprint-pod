import { z } from 'zod';

export type ArtworkStatus = 'pending' | 'uploaded' | 'paid' | 'archived';
export type OrderType = 'digital' | 'print';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfilmentStatus = 'not_applicable' | 'pending' | 'submitted' | 'in_production' | 'shipped' | 'delivered' | 'failed' | 'cancelled';
export type ProductSize = 'A5' | 'A4' | 'A3';
export type Currency = 'gbp' | 'usd' | 'eur';

export interface Artist {
  id: string;
  name: string;
  email: string;
  stripe_account_id?: string | null;
  stripe_onboarding_complete: boolean;
  default_currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  artist_id: string;
  title: string;
  event_date?: string | null;
  logo_path?: string | null;
  slug: string;
  is_active: boolean;
  digital_price: number; // in minor units e.g. 1500 for £15.00
  print_prices: Record<ProductSize, number>;
  currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  event_id: string;
  name: string;
  email?: string | null;
  claim_code: string;
  claim_token_hash: string;
  consent_marketing: boolean;
  created_at: string;
}

export interface Artwork {
  id: string;
  customer_id: string;
  artist_id: string;
  original_path: string;
  preview_path?: string | null;
  mime_type: 'image/png' | 'image/jpeg';
  byte_size: number;
  width?: number | null;
  height?: number | null;
  original_ready: boolean;
  status: ArtworkStatus;
  uploaded_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string; // ISO 2-letter code e.g. GB
}

export interface Order {
  id: string;
  artist_id: string;
  artwork_id: string;
  customer_id: string;
  type: OrderType;
  product_size?: ProductSize | null;
  amount: number;
  currency: Currency;
  payment_status: PaymentStatus;
  fulfilment_status: FulfilmentStatus;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  prodigi_order_id?: string | null;
  shipping_address?: ShippingAddress | null;
  failure_code?: string | null;
  failure_message?: string | null;
  idempotency_key: string;
  created_at: string;
  paid_at?: string | null;
  updated_at: string;
}

// Zod Schemas for API requests
export const CreateEventSchema = z.object({
  title: z.string().min(1).max(160),
  eventDate: z.string().optional(),
  currency: z.enum(['gbp', 'usd', 'eur']).default('gbp'),
  digitalPrice: z.number().int().min(0).default(1500),
  printPrices: z.object({
    A5: z.number().int().min(0).default(1500),
    A4: z.number().int().min(0).default(2200),
    A3: z.number().int().min(0).default(3200),
  }).default({ A5: 1500, A4: 2200, A3: 3200 }),
});

export const PresignArtworkSchema = z.object({
  eventId: z.string().uuid(),
  customerName: z.string().min(1).max(120),
  filename: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  byteSize: z.number().int().min(1).max(25000000),
});

export const CreateOrderSchema = z.object({
  claimToken: z.string().min(1),
  type: z.enum(['digital', 'print']),
  productSize: z.enum(['A5', 'A4', 'A3']).optional(),
  shippingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postcode: z.string().min(1),
    country: z.string().length(2),
  }).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const ClaimCodeSchema = z.object({
  claimCode: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
});
