# Live Artist Checkout — MVP Technical Architecture Specification

**Status:** Implementation-ready handover  
**Audience:** Product engineer, Codex, Claude Code  
**Version:** 1.0  
**Scope:** iPad-based live portrait and caricature artists at paid events

## 1. Executive brief

Build a mobile-first web application that turns a finished live portrait into a paid, recoverable customer handover:

`artist exports image → uploads in <30s → customer claims → Stripe Checkout → digital download → optional A5/A4/A3 print`.

This is not a storefront, marketplace, general CRM, or merchandise catalogue. The MVP has one artist account, one fixed event QR URL plus a per-artwork QR handoff, one fallback claim code per portrait, Stripe Connect for payments, Supabase for data/storage, and one Prodigi integration for prints.

### Non-goals

No native apps, Shopify/Etsy integrations, multiple POD providers, galleries, messaging, coupons, tax-management UI, inventory, subscriptions, AI editing, or offline-first operation.

### Operating assumptions

- An artist or assistant creates the customer record before/while drawing.
- The customer pays for the digital artwork at checkout. Price is configured per event.
- Print checkout is a second purchase against the same artwork.
- The platform does not hold customer funds; Stripe Connect transfers to the artist’s connected account.
- Print fulfilment is asynchronous and can fail; status is always visible to artist/admin.

## 2. System overview and architecture

```text
iPad Safari (artist) ───────┐
                            │ HTTPS / Supabase JS
Customer phone (QR) ────────┼── Next.js App Router on Vercel
                            │   - server actions/API routes
                            │   - signed upload/download URLs
                            │   - Stripe + Prodigi secrets
                            ├── Supabase Auth (artists)
                            ├── Supabase Postgres + RLS
                            ├── Supabase Storage (private artwork originals)
                            ├── Stripe Connect + Checkout + webhooks
                            ├── Prodigi API + webhooks
                            └── Resend (transactional email)
```

The browser never receives Stripe secret keys, Prodigi keys, service-role keys, or unsanitised provider payloads. All provider calls run in Vercel server routes. Webhooks are verified before database writes. Use UTC timestamps and ISO 8601 at API boundaries.

### Recommended repository shape

```text
app/
  (auth)/login/page.tsx
  dashboard/page.tsx
  events/[eventId]/page.tsx
  events/[eventId]/upload/page.tsx
  e/[slug]/page.tsx                 # public claim page
  artwork/[claimToken]/page.tsx
  checkout/success/page.tsx
  api/events/route.ts
  api/events/[eventId]/claim/route.ts
  api/artworks/route.ts
  api/artworks/[id]/download/route.ts
  api/orders/route.ts
  api/connect/onboard/route.ts
  api/webhooks/stripe/route.ts
  api/webhooks/prodigi/route.ts
lib/
  supabase/{browser,server,admin}.ts
  stripe.ts prodigi.ts email.ts idempotency.ts
supabase/migrations/001_initial.sql
```

## 3. Stack and conventions

- **Next.js 15, App Router, TypeScript, React, Tailwind.** Server components for dashboards and public pages; client components only for forms/upload/payment status.
- **Vercel.** Node.js runtime for provider routes; set function max duration to 30s. Never use Edge runtime for Stripe/Prodigi SDK routes.
- **Supabase.** Auth (email/password), Postgres, Storage. `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- **Stripe.** Connect Express accounts, Checkout Sessions, PaymentIntents, Connect webhooks. Use application fee in smallest currency unit.
- **Prodigi.** REST API, one configured print SKU per size, order after payment; status callbacks plus polling fallback.
- **Resend.** Email receipt/download link; email failure must not block paid status.
- **Validation.** Zod at every route boundary; `snake_case` in SQL, camelCase in JSON.
- **Identifiers.** UUID primary keys; random 32-byte claim token, encoded into a per-artwork QR URL and displayed as a six-character uppercase fallback claim code.

## 4. Postgres schema

Run the following migration. Enable `pgcrypto` for UUIDs and `citext` for case-insensitive email.

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.artwork_status as enum ('pending','uploaded','paid','archived');
create type public.order_type as enum ('digital','print');
create type public.payment_status as enum ('unpaid','pending','paid','failed','refunded','partially_refunded');
create type public.fulfilment_status as enum ('not_applicable','pending','submitted','in_production','shipped','delivered','failed','cancelled');

create table public.artists (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email citext not null,
  stripe_account_id text unique,
  stripe_onboarding_complete boolean not null default false,
  default_currency text not null default 'gbp' check (default_currency in ('gbp','usd','eur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  event_date date,
  logo_path text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{4,80}$'),
  is_active boolean not null default true,
  digital_price integer not null default 1500 check (digital_price >= 0),
  print_prices jsonb not null default '{"A5":1500,"A4":2200,"A3":3200}',
  currency text not null default 'gbp' check (currency in ('gbp','usd','eur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email citext,
  claim_code text not null check (claim_code ~ '^[A-Z0-9]{6}$'),
  claim_token_hash text not null unique,
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now(),
  unique(event_id, claim_code)
);

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  original_path text not null,
  preview_path text,
  mime_type text not null check (mime_type in ('image/png','image/jpeg')),
  byte_size integer not null check (byte_size between 1 and 25000000),
  width integer,
  height integer,
  original_ready boolean not null default false,
  status public.artwork_status not null default 'pending',
  uploaded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete restrict,
  artwork_id uuid not null references public.artworks(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  type public.order_type not null,
  product_size text check (product_size in ('A5','A4','A3')),
  amount integer not null check (amount >= 0),
  currency text not null,
  payment_status public.payment_status not null default 'unpaid',
  fulfilment_status public.fulfilment_status not null default 'not_applicable',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  prodigi_order_id text unique,
  shipping_address jsonb,
  failure_code text,
  failure_message text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((type = 'digital' and product_size is null) or (type = 'print' and product_size is not null))
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe','prodigi')),
  external_event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique(provider, external_event_id)
);

create index events_artist_idx on public.events(artist_id, created_at desc);
create index customers_event_idx on public.customers(event_id, created_at desc);
create index artworks_artist_status_idx on public.artworks(artist_id, status);
create index orders_artist_idx on public.orders(artist_id, created_at desc);
create index orders_prodigi_idx on public.orders(prodigi_order_id) where prodigi_order_id is not null;
create unique index one_order_per_product on public.orders(artwork_id, type, product_size)
  where payment_status in ('pending','paid','partially_refunded');
```

Create an `updated_at` trigger for artists/events/orders. Never expose `claim_token_hash`; the raw token is only sent in a signed link or converted from the artist-entered claim code by a server route.

## 5. Supabase RLS and storage

Enable RLS on every application table. Public users must not query tables directly; public routes use a server client with narrowly scoped SQL functions or service role after validating slug/token.

```sql
alter table public.artists enable row level security;
alter table public.events enable row level security;
alter table public.customers enable row level security;
alter table public.artworks enable row level security;
alter table public.orders enable row level security;
alter table public.webhook_events enable row level security;

create policy artists_self on public.artists for select using (id = auth.uid());
create policy artists_update_self on public.artists for update using (id = auth.uid());
create policy events_owner_all on public.events for all using (artist_id = auth.uid()) with check (artist_id = auth.uid());
create policy customers_owner_all on public.customers for all using (
  exists (select 1 from public.events e where e.id = event_id and e.artist_id = auth.uid())
) with check (
  exists (select 1 from public.events e where e.id = event_id and e.artist_id = auth.uid())
);
create policy artworks_owner_all on public.artworks for all using (artist_id = auth.uid()) with check (artist_id = auth.uid());
create policy orders_owner_select on public.orders for select using (artist_id = auth.uid());
```

Provider webhook writes use the service-role client and are not available to browser users. Do not create an `anon` policy that reveals artwork URLs or customer email.

### Storage buckets

- `artwork-originals` (private): path `{artist_id}/{event_id}/{artwork_id}/original.{ext}`; 25 MB limit; PNG/JPEG only.
- `artwork-previews` (private): same path with a resized ~200 KB JPEG preview; generated client-side on the iPad.
- `event-assets` (private): logos, max 2 MB.

Upload flow: the iPad creates a ~200 KB JPEG preview client-side and asks `POST /api/artworks/presign`; server verifies event ownership, creates artwork row, and returns separate 5-minute signed upload URLs for preview and original. Preview uploads first and marks the artwork claimable immediately; the original uploads in the background using Supabase resumable/TUS upload and is required before a print order or full-resolution download. Server verifies MIME, byte size, image dimensions and object existence for both objects.

Download flow: only a paid artwork gets a one-minute signed download URL. URL is never persisted in Postgres.

## 6. API contract

All JSON errors use `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`. The server derives idempotency keys from the local order ID; clients do not need to generate an idempotency header. Return `requestId` from `x-request-id`.

### `POST /api/events` (artist auth)

Request:

```json
{"title":"Acme Summer Party","eventDate":"2026-08-10","currency":"gbp","digitalPrice":1500,"printPrices":{"A5":1500,"A4":2200,"A3":3200}}
```

Response `201`:

```json
{"event":{"id":"uuid","title":"Acme Summer Party","slug":"acme-summer-party-7f2a","publicUrl":"https://app.example.com/e/acme-summer-party-7f2a","qrData":"https://app.example.com/e/acme-summer-party-7f2a"}}
```

### `POST /api/events/:eventId/customers`

Creates a claim record. Request `{ "name":"Sam" }`; response `201` `{ "customerId":"uuid", "claimCode":"4K7M2Q" }`. Claim codes are generated with cryptographic randomness and are unique per event.

The upload screen may combine this call with presigning: if no customer exists, the artist enters a first name and taps one action; the server creates the customer and returns the upload URLs in the same response. The separate customer-create route remains available for queue-based workflows.

### `POST /api/artworks/presign` (artist auth)

Request `{ "eventId":"uuid", "customerId":"uuid", "filename":"portrait.png", "mimeType":"image/png", "byteSize":4200000 }`.

Response `{ "artworkId":"uuid", "previewUploadUrl":"signed-url", "originalUploadUrl":"signed-url", "expiresIn":300 }`.

### `POST /api/artworks/:id/preview-complete` (artist auth)

Verifies the preview object, marks artwork `uploaded`, sets `uploadedAt`, and returns `{ "artworkId":"uuid", "status":"uploaded", "claimUrl":"/artwork/<opaque-token>", "claimQrData":"https://app.example.com/artwork/<opaque-token>" }`. The preview claim URL is usable while the original continues uploading.

### `POST /api/artworks/:id/original-complete` (artist auth)

Verifies the original object and sets `original_ready=true`. Print orders and full-resolution downloads return `ORIGINAL_NOT_READY` until this succeeds; the customer can still view the preview and complete digital payment.

### `GET /api/public/events/:slug`

Returns branding and active state only: `{ "event":{"title":"...","logoUrl":"...","isActive":true} }`.

### `POST /api/public/events/:slug/claim`

Request `{ "claimCode":"4K7M2Q" }`; response returns artwork metadata and a short-lived opaque `claimToken`. The primary path is scanning the per-artwork QR URL, which skips code entry. Do not return email, internal IDs, storage paths, or unpaid original URLs.

### `POST /api/orders`

Request:

```json
{"claimToken":"opaque-token","type":"digital","successUrl":"https://app.example.com/checkout/success","cancelUrl":"https://app.example.com/artwork/opaque-token"}
```

For print: add `{ "productSize":"A4", "shippingAddress":{...} }`. Server resolves artwork/customer, requires `original_ready=true`, calculates amount from the event (never trusts client amount), creates an order and Stripe Checkout Session, then returns `{ "orderId":"uuid","checkoutUrl":"https://checkout.stripe.com/..." }`.

### `GET /api/orders/:id`

Artist-authenticated order status only. Customer success page polls a token-scoped endpoint returning `{ "paymentStatus":"paid", "fulfilmentStatus":"submitted", "downloadUrl":"signed-url-or-null" }`.

When `session_id` is present, the token-scoped success endpoint retrieves the Checkout Session from Stripe, verifies `payment_status=paid`, and performs the same idempotent finalisation as the webhook if the webhook has not arrived yet. On `checkout.session.completed`, persist `session.customer_details.email` to `customers.email` when the artist did not already provide an email.

### `POST /api/connect/onboard`

Creates/reuses a Stripe Express account, persists `stripe_account_id`, returns a one-time Account Link URL. On return, query Stripe account status server-side and set `stripe_onboarding_complete` only when charges and payouts are enabled.

### Webhooks

- `POST /api/webhooks/stripe`: raw body, verify `Stripe-Signature`; insert into `webhook_events` with unique event ID; process in a transaction; return 200 even for already-processed events.
- `POST /api/webhooks/prodigi`: accept callbacks only when Prodigi documents a verifiable signature; otherwise treat the callback as an advisory signal, persist it, map status, and rely on polling for correctness. Return 200 quickly.

## 7. Stripe Connect and payments

### Onboarding

Use Express connected accounts with `controller[losses][payments]=application`, `capabilities[card_payments]=requested`, and `capabilities[transfers]=requested`. Create an Account Link with refresh and return URLs. Never mark onboarding complete based on redirect alone.

### Checkout creation

1. Validate claim token and active event.
2. Resolve amount/currency from server-side event configuration.
3. Reject duplicate paid order of same type/size for artwork unless explicitly allowed.
4. Create Checkout Session with `mode=payment`, `payment_method_types=['card']`, automatic tax off for MVP, and `payment_intent_data[application_fee_amount]` (for example 10% capped by config).
5. Create a destination charge on the platform account using `application_fee_amount` and `transfer_data[destination][account]` for the artist’s connected account.
6. Save session ID and server-derived idempotency key before redirect.

Use Stripe idempotency key `lac:checkout:{orderId}`. A repeated request returns the original session/order. The success URL includes `session_id`; the success-page polling route may retrieve the Checkout Session server-side and finalise a still-unprocessed paid order for faster feedback. The verified webhook remains the backstop and source of truth.

### Required Stripe events

- `checkout.session.completed`: set order `payment_status=paid`, `paid_at`, PaymentIntent ID; digital artwork → `status=paid`; print → enqueue Prodigi order.
- `checkout.session.async_payment_succeeded`: same finalisation.
- `checkout.session.async_payment_failed` and `payment_intent.payment_failed`: set `failed`, retain safe failure code.
- `charge.refunded`: set `refunded` or `partially_refunded`; cancel Prodigi order where possible; flag manual review if already shipped.
- `account.updated`: refresh `stripe_onboarding_complete` from `charges_enabled && payouts_enabled`.

Webhook processing must be idempotent: insert event first, lock order row (`FOR UPDATE`), ignore if state is already equal or later, and record errors for retry/admin review.

### Refunds

Artist/admin calls `POST /api/orders/:id/refund` with optional `{amount}`. Verify ownership/admin role, create Stripe Refund with idempotency key, and let webhook update local status. For print orders, attempt provider cancellation before refund; if cancellation fails, require manual review and do not claim automatic recovery.

## 8. Prodigi integration

Configure exactly three mappings in environment/config, not user-editable in MVP:

```json
{
  "A5": "GLOBAL-PRODIGI-SKU-A5",
  "A4": "GLOBAL-PRODIGI-SKU-A4",
  "A3": "GLOBAL-PRODIGI-SKU-A3"
}
```

### Order creation

1. Validate shipping address (country, postcode, line1, city).
2. On successful Stripe payment, call Prodigi `POST /orders` with an idempotency key equal to the local order ID, artwork URL, SKU, recipient and shipping.
3. Persist the provider cost returned by Prodigi in a redacted operations record or log for margin reconciliation; customer price remains the fixed event price.
4. Persist `prodigi_order_id`, set `fulfilment_status=submitted`.

Never send the original private URL directly unless it is a time-limited signed URL accepted by Prodigi; otherwise proxy to a signed provider upload URL. Keep provider payloads in logs redacted of address/email.

### Status mapping

`created/processing → submitted`, `in_production → in_production`, `shipped → shipped`, `delivered → delivered`, `cancelled → cancelled`, `error/failed → failed`.

If Prodigi order fails after payment: set `fulfilment_status=failed`, alert admin, retain digital delivery, and offer refund/manual retry. Retry 3 times with exponential backoff; never create a second provider order without checking the idempotency key. Provider callbacks are an optimisation, not the only source of status: a Vercel Cron route polls all open Prodigi orders every 15 minutes and reconciles status.

## 9. User journeys and state machines

### Artist journey

`sign up → connect Stripe → create event → display fixed QR → create customer → upload → complete → continue drawing`.

### Customer journey

`scan per-artwork QR → view preview → choose digital/print → Checkout → success → download/track print`; fallback is `scan event QR → enter claim code`.

### Artwork state

```text
pending → uploaded → paid
                         └→ archived (retention expiry)
```

### Order state

```text
unpaid → pending → paid → (digital: complete)
                         (print: submitted → in_production → shipped → delivered)
unpaid/pending → failed
paid → partially_refunded → refunded
```

Transitions are server-only and audited through structured logs/webhook_events.

## 10. Screen-by-screen wireframes (text)

### Login

```text
[Live Artist Checkout]
Email [             ]
Password [          ]  [Sign in]
                     [Create account]
```

### Dashboard

```text
Header: Artist name                         [Sign out]
[Create event]
Upcoming events
┌ Event title ┬ Date ┬ Portraits ┬ Print sales ┬ [Open] ┐
```

### Create event

```text
Event name [                         ]  Date [   ]
Digital price [£15.00]  Currency [GBP]
Print prices: A5 [£15] A4 [£22] A3 [£32]
[Create event]
```

### Event control room

```text
Acme Summer Party   [Download QR] [Copy URL]
QR PREVIEW          Portraits today: 12   Paid: 11
[New customer]
Customer queue
┌ Name ┬ Claim code ┬ Artwork ┬ Payment ┬ [Upload/View] ┐
```

### New customer

```text
Name [                ]
Email (optional) [    ]  [ ] marketing consent
                       [Create customer]
Result: Show claim code 4K7M2Q and per-artwork QR to customer
```

### Upload

```text
Customer first name [Sam          ]  (creates customer if new)
[Choose image]  PNG/JPEG, max 25MB
Preview [image]
[Upload preview and finish]
Success: scan this artwork QR now  [QR]  Code: 4K7M2Q
Original upload: [background progress]  [Next customer]
```

### Public claim

```text
[Event logo] Acme Summer Party
Enter claim code [______] [Find my portrait]
or scan the artwork QR shown by the artist.
No account or app required.
```

### Artwork and purchase

```text
Sam's portrait [large preview]
Digital copy — £15                [Get digital copy]
Print: ( ) A5 £15 ( ) A4 £22 ( ) A3 £32
Shipping address [fields]         [Buy print]
```

### Checkout success

```text
Payment confirmed
[Download artwork]
Print status: Preparing your order
Receipt sent to [email]
```

### Orders/admin

Filter by event/status; show order ID, amount, payment status, fulfilment status, provider ID, last error, and `[Refund]` with confirmation.

## 11. Security, privacy and reliability

- Supabase Auth sessions use secure, HTTP-only cookies through the server client.
- Validate ownership on every artist route; never trust route IDs alone.
- Claim codes are rate-limited (10 attempts/IP/15 minutes/event), generic error messages prevent enumeration, and successful claim issues a short-lived token.
- Use signed URLs with one-minute download expiry and no public storage buckets.
- Enforce MIME sniffing, byte limits and image dimension limits. Malware scanning is deferred from MVP; keep the storage bucket private and accept only PNG/JPEG uploads from authenticated artists.
- Verify Stripe and Prodigi signatures against raw request bodies.
- Redact email, address, tokens and provider secrets from logs. Encrypt backups and use least-privilege service keys.
- Add a Supabase `pg_cron` job or Vercel Cron route to archive/delete originals after 90 days configurable; retain financial/order records per legal policy.
- Payment and fulfilment operations are retry-safe and recoverable; show failure state to artist/admin.

## 12. Observability and operations

Emit JSON logs with `requestId`, `artistId`, `eventId`, `artworkId`, `orderId`, provider, latency, status and error code. Never log image bytes or payment details.

Track metrics: preview upload latency, original upload completion, QR scan/claim success, Checkout conversion, webhook lag, print order failure, fulfilment age, refund rate, email failure. Alert on Stripe webhook failures, Prodigi failure rate >5%/15m, and orders stuck in `submitted` >24h.

Provide an admin replay action for failed webhook events and a safe “retry Prodigi order” action that reuses the local idempotency key.

## 13. Testing strategy

- Unit: claim-code generation, price calculation, state transitions, idempotency, signature verification.
- Integration: Supabase RLS tests for artist isolation; storage signed URL expiry; Stripe test clocks; Prodigi sandbox fixtures.
- Contract: validate Stripe/Prodigi webhook fixtures and status mapping.
- E2E (Playwright): sign-up → event → customer → upload → claim → Stripe test checkout → download; print order fixture → fulfilment update.
- Failure tests: duplicate POST, refresh after Checkout, invalid code brute force, oversized/wrong MIME image, webhook replay/out-of-order, refund after shipment, provider timeout.
- Real-event pilot: measure upload <30s, claim >70%, digital download >90%, print conversion 10–20%, and support incidents.

## 14. Environment variables

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_CLIENT_ID
STRIPE_PLATFORM_FEE_BPS=1000
PRODIGI_API_KEY
PRODIGI_BASE_URL
PRODIGI_SKU_A5
PRODIGI_SKU_A4
PRODIGI_SKU_A3
RESEND_API_KEY
EMAIL_FROM
ARTWORK_RETENTION_DAYS=90
```

Set secrets in Vercel project environments and local `.env.local` only; never commit them. Use separate Stripe/Prodigi test credentials in preview and production credentials only in production.

## 15. Deployment and runbook

1. Create Supabase project, run migration, create private buckets, configure Auth email templates.
2. Create Stripe platform, enable Connect Express, register webhook endpoint, configure test/live modes.
3. Create Prodigi account and verify three SKUs, shipping countries, order sandbox, and callback/polling behaviour.
4. Configure Vercel environment variables and deploy preview.
5. Run migrations and E2E test suite against preview.
6. Perform a £0/low-value live-mode smoke test with one internal artist and one print order.
7. Promote to production only after webhook replay, refund, and provider-failure checks pass.

## 16. Acceptance criteria

The MVP is accepted when all are true:

1. An artist can sign up and connect Stripe in under 10 minutes.
2. An event creates one stable public URL and downloadable QR code.
3. An artist can create a customer and obtain a six-character fallback claim code plus a per-artwork QR URL after upload.
4. A client-generated preview from iPad is claimable in under 5 seconds; the full PNG/JPEG uploads resumably in the background and completes in under 30 seconds on normal 4G/Wi-Fi.
5. Customer claim requires no account or app and reveals only their artwork.
6. Digital Checkout supports Apple Pay/Google Pay where Stripe/browser supports them.
7. Payment is confirmed only by verified webhook; duplicate webhooks do not duplicate orders.
8. Paid customers receive a signed download link and email receipt.
9. A5/A4/A3 print purchase creates exactly one Prodigi order with the mapped SKU.
10. Prodigi status updates are reflected in the artist dashboard.
11. Refunds update local status and do not expose secrets or stale download access.
12. RLS tests prove one artist cannot read another artist’s events, artwork or orders.
13. All provider failures are visible, retryable, and recorded with a request/order ID.

## 17. Phased build plan

### Phase 1 — Foundation

Next.js scaffold, Supabase Auth/schema/RLS, private storage, artist dashboard, event creation, QR generation, customer/claim-code creation.

### Phase 2 — Artwork handover

Presigned upload, validation/preview, public claim page, signed download, Resend receipt, artwork/order state transitions.

### Phase 3 — Payments

Stripe Connect onboarding, digital Checkout, verified webhooks, idempotency, refunds, payment status UI.

### Phase 4 — Print fulfilment

Prodigi order, three SKU mappings, callback plus polling status reconciliation, failure/retry/admin views.

### Phase 5 — Pilot and hardening

Playwright E2E, RLS/security review, metrics/alerts, retention job, real paid-event pilot, measure success metrics, then decide whether to expand.

**Build rule:** ship Phase 2 and manually fulfil prints before expanding provider logic. The first proof is whether artists can reliably collect payment and hand over digital portraits under event pressure.
