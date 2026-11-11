# Drawn Checkout — Handover for Review & Upgrade

Written 2026-11-11 for a fresh reviewer (human or model). Everything here is grounded in the code on branch `claude/returning-after-time-away-cf1749` (PR #2 into `main`). **Nothing has been tested end to end.** The MVP was built "yolo, no testing" at the owner's request, so treat every flow as unverified until you run it.

> Naming: the repo/folder is `Imprint-pod` and much of the UI/copy still says "Imprint-POD". The product is being rebranded **Drawn Checkout** (domain **drawncheckout.com**, bought on Cloudflare, served by Vercel). The rename in code/UI has NOT been done yet.

---

## 1. What the product is

A checkout for **live portrait artists** (caricature, silhouette, sketch artists working at events: weddings, markets, parties).

- **The paying customer of the platform is the artist**, not the sitter. The artist uses the app; the person being drawn is the artist's customer.
- The artist draws someone at an event, photographs/scans the drawing, and uploads it. The sitter gets a **claim code / link** (scan or type it), sees a **watermarked preview**, and can buy:
  - a **digital** copy (instant download of the full-resolution original), or
  - a **physical print** (A5 / A4 / A3) printed and posted by a print-on-demand partner (Prodigi).
- Money goes **directly to the artist** via Stripe Connect (destination charges). The platform keeps an **application fee**.
- Digital delivery, UK-first (currency default GBP, shipping default country GB). No one has to be physically present to "collect" anything.

### Roles
| Role | What they do |
|---|---|
| Artist | Signs in (Clerk), connects Stripe, creates events, uploads drawings per sitter, sees dashboard/earnings |
| Sitter / customer | No account. Uses claim code/link, previews, pays via Stripe Checkout, downloads |
| Platform admin | Sees all artists/events/orders/revenue/fees at `/admin` |

---

## 2. Stack

- **Next.js 15.5.29** (App Router), React 19, Tailwind
- **Convex** (DB, file storage, server functions). Dev deployment: `accurate-mole-754` (eu-west-1)
- **Clerk** (auth). Still a **dev instance** (`sweeping-dog-89.clerk.accounts.dev`); JWT template named `convex`
- **Stripe** Connect Express, destination charges + `application_fee_amount`, Stripe Checkout, API version 2026-05-27.dahlia
- **Prodigi** (print on demand), **Resend** (receipt email, REST)
- **Vercel** hosting; **Cloudflare** domain/DNS (CNAME must be "DNS only", grey cloud)

---

## 3. End-to-end flow

1. **Artist signs in** (Clerk). Middleware (`src/middleware.ts`) protects `/dashboard`, `/events`, `/admin`.
2. **Dashboard** (`src/app/dashboard/page.tsx`): stats, upcoming/past events, **Connect Stripe** button → `POST /api/connect/onboard` creates an Express account and returns the onboarding link; `/api/connect/status` syncs completion status.
3. **Create event** (`src/app/events/new/page.tsx`): title, optional logo (uploaded to Convex storage), digital price (100–100000 minor units) and print prices. Random slug. Public page at `/e/[slug]`.
4. **Upload per sitter** (`src/app/events/[eventId]/upload/page.tsx`): client generates a **watermarked preview** (fast, ≤6 MB) and uploads the **original** (≤25 MB, PNG/JPEG) in the background with retry. Convex `presignArtworkUpload` returns two upload URLs; `completePreview` / `completeOriginal` finalise. A customer gets a 32-char-alphabet **claim code** and a long **claim token**.
5. **Sitter claims**: `/e/[slug]` takes the claim code → `POST /api/public/events/[slug]/claim` (simple throttle) → returns the claim token → `/artwork/[claimToken]`.
6. **Purchase page** (`src/app/artwork/[claimToken]/page.tsx`): shows watermarked preview, prices, digital vs print (size + shipping address). Calls `POST /api/checkout`.
7. **`/api/checkout`**: validates with zod, `orders.serverCreateOrder` (prices come from the DB, never the client; checks artist is Stripe-ready and original is uploaded), creates a Stripe Checkout Session with `payment_intent_data.transfer_data.destination` = artist account and `application_fee_amount` from `calculatePlatformFee`, then `serverAttachSession`.
8. **Payment completes** → two paths into the same idempotent function `fulfilCheckoutSession` (`src/lib/fulfil.ts`):
   - Stripe webhook `POST /api/webhooks/stripe`
   - Success page polling `GET /api/checkout/session` (`src/app/checkout/success/page.tsx`)
   It marks the order paid, flips digital artwork to `paid`, sends a Resend receipt, and for prints submits a Prodigi order.
9. **Download**: `GET /api/artworks/[claimToken]/download` streams the original **only if paid**.
10. **Prodigi callback**: `POST /api/webhooks/prodigi?secret=PRODIGI_WEBHOOK_SECRET` updates fulfilment status.
11. **Refunds**: `charge.refunded`-type handling → `serverMarkRefunded` revokes digital access.

---

## 4. Code map

**Convex (`convex/`)**
- `schema.ts` — tables: artists, events, customers, artworks, orders, webhookEvents (+ indexes incl. `by_stripe_account`, `by_payment_intent`, `by_artist`, `by_session`, `by_claim_token`, `by_claim_code`, `by_slug`)
- `helpers.ts` — `requireServerSecret`, `requireUserId`, `isAdminIdentity`, `randomClaimCode` (crypto), `randomHex`, upload limits/MIME allowlist
- `artists.ts`, `events.ts`, `customers.ts`, `artworks.ts`, `orders.ts`, `admin.ts`
- `auth.config.ts` — Clerk issuer from `CLERK_JWT_ISSUER_DOMAIN` (falls back to the dev domain), `applicationID: 'convex'`
- `_generated/api.d.ts` — **hand-edited** to register new modules; regenerate with `npx convex dev` if it drifts
- All `server*` functions require a shared `SERVER_SECRET` arg. Only Next API routes (using `ConvexHttpClient`) call them. This secret must be identical in **Convex env and Vercel env**.

**Next.js (`src/`)**
- `app/api/**` — connect, public/events, checkout, artworks download, webhooks (stripe, prodigi)
- `app/dashboard`, `app/events/**`, `app/e/[slug]`, `app/artwork/[claimToken]`, `app/checkout/success`, `app/admin`, `app/error.tsx` (shows real error message — debugging aid)
- `lib/` — `stripe.ts` (lazy `getStripe()`, `calculatePlatformFee(amount,type,size)`, default print costs 600/900/1500 pence), `fulfil.ts`, `prodigi.ts` (mock only when not production), `email.ts`, `convex-server.ts`
- `components/ConvexClientProvider.tsx` — always builds a client using a placeholder URL when env is missing (so prerender doesn't fail)

**Env vars**: see `.env.example` (Vercel + Convex lists). Do not commit real values.

---

## 5. Current state / known blockers

**Live now**: drawncheckout.com serves the PR branch build. Sign-in works, dashboard loads, Convex functions deployed, `SERVER_SECRET` matches on both sides. Probes pass on the new domain (public event 200, claim 404 for bad code, checkout 400 "Artwork not found", Stripe webhook 400 "Invalid signature").

**Blocker: Stripe Connect.** Clicking Connect Stripe returns: *"You must complete your platform profile to use Connect and create live connected accounts."* Diagnosis:
- That error is about **live mode**. In Stripe's Setup guide, "Verify your identity" shows **Retry** (not accepted), so live Connect isn't unlocked.
- Platform profile page also shows an unaccepted "Refunds and chargebacks liability acknowledgement" (required for testmode connected accounts). Owner must accept it (legal acknowledgement; I did not click it).
- **Recommended path:** switch Vercel `STRIPE_SECRET_KEY` to the **test** key (`sk_test_…`), recreate both webhook destinations in test mode, update `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`, redeploy. Unknown whether the current key is live or test: check its prefix.

**Stripe webhooks**: two signing secrets are needed (one destination for "Your account" events → `STRIPE_WEBHOOK_SECRET`; one for "Connected accounts" events → `STRIPE_CONNECT_WEBHOOK_SECRET`). There is a duplicate destination (adventurous-breeze vs playful-euphoria) and it's unknown which secret is in Vercel. The old `imprint-pod-pi.vercel.app` URL is dead (DEPLOYMENT_NOT_FOUND); destinations were moved to the new domain.

**Not configured / not done**
- `ADMIN_USER_IDS` / `ADMIN_EMAILS` (Convex env) → `/admin` is inaccessible until set
- Resend (`RESEND_API_KEY`, `EMAIL_FROM`, domain verification): receipts won't send
- Prodigi (`PRODIGI_API_KEY`, real SKUs, `PRINT_COST_*`): SKUs and print costs are **placeholders**; platform fee on prints depends on these
- `www.drawncheckout.com` record not set up
- Clerk is a dev instance; needs a production instance on the new domain
- PR #2 not merged; production serves the branch
- Old artworks from before the rewrite have no originals (customer "11" must be re-uploaded)
- Old Supabase files remain in the repo (dead code)
- UI/copy rebrand from Imprint-POD to Drawn Checkout not done (Clerk heading, titles, metadata)

**Untested end to end**: create event, upload (preview + original), claim, Stripe Checkout with test card `4242 4242 4242 4242`, download, webhooks, receipt email, Prodigi submission, refunds, admin.

---

## 6. Review asks for the next model

Please review and upgrade, in roughly this order:

1. **Correctness & money safety.** Read `convex/orders.ts`, `src/app/api/checkout/route.ts`, `src/lib/fulfil.ts`, `src/app/api/webhooks/stripe/route.ts`. Check idempotency, webhook dedupe (`webhookEvents`), race between webhook and success page, application fee maths (fee must never exceed amount; check print cost handling), refund/dispute handling, currency handling, and the server-secret pattern.
2. **Security.** Claim-token and claim-code guessability, throttle in the claim route (in-memory throttles don't work across serverless instances), upload validation (MIME is checked via storage metadata, but is content actually an image?), download gating, admin gating, error messages leaking internals, CSRF/abuse on public routes.
3. **Customer UX (the sitter).** Mobile-first. Scan/enter code → preview → pay → download should take seconds. Questions: Is the watermark good enough? Is the print flow (address form, size choice) clear? What happens on failed/cancelled payment, expired session, "still being prepared" state, wrong code? Add order confirmation, resend-download-link, accessibility.
4. **Artist UX.** Faster upload at an event (batch/camera capture, offline tolerance, poor signal), QR code generation per sitter, big-touch UI, clear Stripe onboarding states, earnings/payout view, event editing, unpublish.
5. **Front-end UI/brand.** Rebrand to Drawn Checkout; design system; landing page; empty/loading/error states; replace the error boundary's raw messages with friendly ones for production.
6. **Product questions to challenge.** Fee structure, whether prints are worth the operational complexity at MVP, whether sitters should be able to enter an email upfront, tipping, bundles, multiple artworks per sitter, group portraits, refunds policy, GDPR/consent (`consentMarketing` exists but isn't surfaced), VAT.
7. **Engineering hygiene.** There are essentially no tests. Add at least unit tests for fee/price logic and idempotent fulfilment, plus a Playwright happy path using Stripe test mode. Remove Supabase leftovers, fix the hand-edited `_generated/api.d.ts`, and tidy `.env.example`.

## 7. Practical notes
- Git: branch `claude/returning-after-time-away-cf1749`, PR #2; main branch is `main`.
- Deploying Convex: `npx convex dev --once` (needs `.env.local` with the Convex config; it's gitignored). `npx convex deploy` fails without `CONVEX_DEPLOYMENT`.
- Vercel env changes need a redeploy. Vercel sometimes asks for an authenticator code on env edits (the owner enters it).
- Set Convex env with `npx convex env set NAME value` (real values, not placeholders).
- Stripe test card: 4242 4242 4242 4242, any future expiry, any CVC.
- The owner is not deeply technical in infra: give step-by-step instructions and prefer doing browser configuration via Claude in Chrome when logged in.
