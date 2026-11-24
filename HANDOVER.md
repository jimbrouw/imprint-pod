# Drawn Checkout: system handover

Last updated 2026-11-24. This is the single document a new person or model should read first. It reflects `main` after PRs 1-7. For the launch steps see `GO-LIVE.md`. For commands and the manual test see `README.md`.

> The repo and folder are still called `Imprint-pod`; the product is **Drawn Checkout** (drawncheckout.com). Do not rename the repo, the Convex deployment or env var names.

## 1. What it is

"Draw it. Share a link. Get paid." An artist (caricature, sketch, illustration, any image seller) uploads an image, shows the buyer a QR code or link, and the buyer sees a watermarked preview, pays, and downloads the original on their phone. Money goes straight to the artist through Stripe Connect; the platform keeps an application fee.

- **The platform's customer is the artist.** The buyer has no account.
- Product decisions already made: **digital only at launch** (prints exist but are hidden behind a flag), light theme, UK / GBP first.
- Artist surfaces: `/sell` (quick sale, the main flow), `/dashboard`, and optional events (`/events/*`) for event work. `/admin` is for the platform owner.

## 2. Stack

| Part | Use |
|---|---|
| Next.js 15.5.29 (App Router), React 19, Tailwind 3 | App and API routes, hosted on Vercel |
| Convex | Database, file storage, server functions (dev deployment `accurate-mole-754`, eu-west-1; also backs drawncheckout.com) |
| Clerk | Sign-in. JWT template named `convex`. Still a **dev instance** |
| Stripe Connect Express, destination charges | `application_fee_amount` kept by platform. Connected accounts use the **Accounts v2 API** |
| Resend | Receipt and resend-link email (REST). Skipped silently without a key |
| Prodigi | Print on demand. Off by default |
| Vercel + Cloudflare | Hosting; domain DNS (CNAME must be "DNS only") |

## 3. Main flows

1. **Artist signs up** (Clerk), opens the dashboard, connects Stripe (`POST /api/connect/onboard`, status via `GET /api/connect/status`).
2. **Quick sale** at `/sell`: choose or photograph an image, set a price (remembered in `localStorage`, minimum £2), optional customer name. A watermarked preview uploads first, the original uploads in the background (`src/lib/upload.ts`). Result: QR code, 6-character code, Copy link, Share. A default hidden event per artist is created by `events.getOrCreateDefault`. Per-artwork `price` overrides the event price.
3. **Buyer** opens `/artwork/[claimToken]` (or enters the code at `/e/[slug]`, which calls the claim route). Single mobile column: preview, "Pay £X and download", Stripe trust line. Prints only if `NEXT_PUBLIC_PRINTS_ENABLED=true`.
4. **`POST /api/checkout`** validates, calls `orders.serverCreateOrder` (price from the database, never the client), creates a Stripe Checkout Session with `transfer_data.destination` and `application_fee_amount`. Print sessions add Stripe `shipping_address_collection` (GB).
5. **Payment completes.** Two paths run the same idempotent `fulfilCheckoutSession` (`src/lib/fulfil.ts`): the Stripe webhook and the success page (`GET /api/checkout/session`). It marks the order paid, sends the receipt, and for prints saves the Stripe address then submits to Prodigi.
6. **Download:** `GET /api/artworks/[claimToken]/download` streams the original only if the order is paid.
7. **Refund or dispute** (`charge.refunded`, `charge.dispute.created`) calls `orders.serverMarkRefunded`, which revokes the download. Disputes record `failureMessage: 'Disputed'`.
8. **Lost link:** the claim page has "Already paid? Email me my link" (`POST /api/public/resend-link`), which never reveals whether an email exists.

## 4. Code map

**Convex (`convex/`)** : `schema.ts`; `artists`, `events`, `customers`, `artworks`, `orders`, `admin`; `helpers.ts` (`requireServerSecret`, admin check, claim-code generator); `pricing.ts` (min £2, max £1000, print margin guard, pure and unit-tested); `rateLimit.ts` (fixed-window limiter, `claimAttempts` table); `auth.config.ts`. `_generated/` is generated; never hand-edit, regenerate with `npx convex dev --once`.

**The `SERVER_SECRET` pattern:** every `server*` Convex function takes a shared secret and is only called from Next API routes via `ConvexHttpClient`. The same value must be in **Convex env and Vercel env**.

**Next.js (`src/`)** : pages and API routes as in section 3; `lib/stripe.ts` (lazy client, `computePlatformFee`, v2 helpers `stripeV2` and `isV2AccountReady`), `lib/fulfil.ts`, `lib/upload.ts`, `lib/useStripeConnect.ts`, `lib/email.ts`, `lib/prodigi.ts`; `components/ui.tsx` (shared class strings), `components/LegalPage.tsx`; `middleware.ts` (protects `/dashboard`, `/events`, `/sell`, `/admin`); `app/manifest.ts` and `app/pwa-icon/[size]` (installable on iPad).

**Money rules**
- Digital fee = `min(amount, max(percent, STRIPE_MIN_FEE))`; percent from `STRIPE_PLATFORM_FEE_BPS` (default 1000 = 10%), minimum fee default 50p. Stripe's processing fee is paid by the platform, so tiny sales would otherwise lose money.
- Print fee = print cost (`PRINT_COST_*`, including postage) + percent of the remainder, capped at the amount.
- Print submission is claimed atomically (`orders.serverClaimPrintSubmission`) so a webhook and the success page cannot both order the same print. The order id is Prodigi's idempotency key.
- Claim route is rate limited in Convex (10/min per IP and event slug). Resend-link: 10/min per IP, 3/hour per email.

## 5. Environment variables

See `.env.example` for the full annotated list. Vercel holds Next env; Convex holds its own (`npx convex env set`). Convex needs `SERVER_SECRET`, `CLERK_JWT_ISSUER_DOMAIN`, `ADMIN_USER_IDS` / `ADMIN_EMAILS`, and for prints `PRINTS_ENABLED=true` plus `PRINT_COST_*`. Vercel marks secrets as sensitive, so they cannot be pulled back out with the CLI.

## 6. Verified status (be precise)

**Tested** (PR 6 records this; run locally against a Stripe **sandbox**): Connect onboarding to payouts "Ready", test payment with card 4242, success page, download, sale shows Paid, `checkout.session.completed` webhook 200, refund then `charge.refunded` webhook 200 then download blocked (403). Also: `tsc`, `next build`, 13 Vitest unit tests (fee maths and price validation).

**Not tested:** live mode of any kind; the deployed site with a live key; disputes; the resend-link email; prints and Prodigi; rate limits beyond unit level; the iPad install (Add to Home Screen) and the `/sell` layout on a real iPad; receipt email delivery (needs Resend).

**Known risks**
- Connect now uses Accounts v2. The webhook still handles the v1 event `account.updated`; v2 accounts may emit different events. Readiness is also polled by `/api/connect/status` on dashboard load, so the artist-facing state should be right, but check this in test mode.
- Legal pages are a template for a UK sole trader, not legal advice.
- Original upload runs in the background and stops if the artist leaves the screen. The UI warns, and buyers cannot pay until the original is saved.
- Old artworks from before the rewrite have no originals.
- `package-lock.json` was removed (Vercel OS mismatch fix), so installs are not locked.

## 7. Current blockers (see `GO-LIVE.md`)

- Stripe **live** identity verification failed and then hit the retry lockout. Test mode needs none of this.
- Live webhooks and live key are not confirmed in Vercel.
- Resend, `ADMIN_EMAILS`, and Clerk production are not set up.

## 8. Practical notes

- Commands: `npm run dev`, `npm run build`, `npx tsc --noEmit`, `npm test`, `npx convex dev --once` (needs `.env.local` with `CONVEX_DEPLOYMENT`; it is git-ignored).
- Test card `4242 4242 4242 4242`, any future expiry, any CVC. Test mode only.
- Branches: work happens on feature branches into `main`; Vercel deploys `main` to production and builds a preview per branch.
- The owner is not deeply technical in infrastructure: give step-by-step instructions, and do not enter the owner's credentials, ID documents or payment details for them.
- Never touch Stripe, Clerk, Vercel, Cloudflare or Convex dashboards or env values without the owner asking.
