# Imprint

An iPad checkout tool for artists who draw live portraits at events: finish
a drawing, upload it, hand the customer a claim code, get paid — all before
they walk away.

Next.js (App Router) + Convex (backend/data) + Clerk (auth) + Stripe Connect
(payouts) + Prodigi (print fulfilment).

## Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend/data**: [Convex](https://convex.dev) — see `convex/`
- **Auth**: [Clerk](https://clerk.com)
- **Payments**: Stripe Connect (helpers in `src/lib/stripe.ts`)
- **Print fulfilment**: Prodigi (helpers in `src/lib/prodigi.ts`)

## Local setup

```bash
npm install
```

Copy the environment variables below into `.env.local` (never commit this
file — it's gitignored):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_SITE_URL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_FEE_BPS=1000

PRODIGI_API_KEY=
```

`STRIPE_PLATFORM_FEE_BPS` is basis points taken as your platform fee on
every sale (1000 = 10%). `PRODIGI_API_KEY` is optional locally — without
it, print order submission is mocked and just logs to the console instead
of calling Prodigi's API.

Get the Clerk values from [dashboard.clerk.com](https://dashboard.clerk.com)
(API Keys page). Get the Convex values by running `npx convex dev` once —
it creates a dev deployment and prints/writes the URL values for you.

Then, in two terminals:

```bash
npx convex dev   # syncs convex/ to your Convex deployment, watches for changes
npm run dev      # starts the Next.js app on localhost:3000
```

### Required Clerk dashboard setup

Convex needs a JWT Template from Clerk to verify who's signed in. In the
Clerk dashboard: **Configure → JWT Templates → New template**, name it
exactly `convex`, and make sure the Issuer matches your Clerk instance
domain (e.g. `https://your-instance.clerk.accounts.dev`). This must match
the `domain` in `convex/auth.config.ts`. Without this, every authenticated
Convex call fails with "Unauthenticated call to ...".

## Deploying

The app deploys to Vercel from this GitHub repo (push a branch → Vercel
builds a preview → promote to production from the Vercel dashboard when
ready).

Vercel needs the same environment variables listed above set in **Project
→ Settings → Environment Variables** (Production and Preview). They're
baked in at build time, so adding/changing them requires a fresh deploy to
take effect.

Convex functions (`convex/`) deploy independently via `npx convex dev` (or
`npx convex deploy` for a production Convex deployment) — pushing to GitHub
does not push Convex functions on its own.

### Stripe webhook setup

Payments only complete correctly once Stripe can call
`/api/webhooks/stripe` on your deployed site:

1. [Stripe dashboard](https://dashboard.stripe.com) → **Developers →
   Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/webhooks/stripe`.
3. Listen for: `checkout.session.completed`.
4. Copy the **Signing secret** it gives you into `STRIPE_WEBHOOK_SECRET` in
   Vercel's env vars, then redeploy (it's read at request time, not build
   time, but Vercel functions can cache — a redeploy guarantees it's picked
   up).

There's no local webhook testing set up in this repo (would need the
[Stripe CLI](https://stripe.com/docs/stripe-cli) forwarding to your dev
server) — verify by running an actual test-mode purchase against the
deployed site and checking Stripe's webhook delivery logs.

## How the app fits together

- `/login` → `/dashboard` — artist signs in, sees their events
- `/events/new` — create an event (prices, currency) → generates a stable
  per-event QR code
- `/events/[eventId]` — the "control room": QR code, live stats, customer
  queue, pre-register customers
- `/events/[eventId]/upload` — the iPad terminal: pick a customer, upload
  the finished portrait, get a claim code + QR to hand over
- `/e/[slug]` — public page where a customer enters their claim code
- `/artwork/[claimToken]` — customer's portrait, digital download or print
  purchase
- `/checkout/success` — post-payment confirmation

## Known gaps (MVP)

Real, working now: Stripe Connect onboarding (`/api/connect/onboard`),
real checkout sessions with platform fees (`/api/checkout/create-session`),
and a webhook (`/api/webhooks/stripe`) that marks orders paid and submits
print orders to Prodigi.

Still missing:

- **`/e/[slug]`'s public claim endpoints don't exist.** That page calls
  `/api/public/events/[slug]` and `/api/public/events/[slug]/claim`, which
  currently 404. The claim-code lookup logic would mirror
  `convex/customers.ts` / `convex/artworks.getArtworkByToken`.
- **Stripe Connect onboarding status never updates after the fact.**
  `artists.stripeOnboardingComplete` is set to `false` at account creation
  and nothing flips it to `true` — that needs a listener for Stripe's
  `account.updated` webhook event, checking `charges_enabled` /
  `details_submitted` on the account.
- No refund handling, and no automated tests for the checkout flow.
