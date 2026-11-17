# Drawn Checkout

Draw it. Share a link. Get paid. Artists upload an image, the buyer scans a QR code or opens a link, sees a watermarked preview, pays with Stripe and downloads the original.

Stack: Next.js (App Router), Convex, Clerk, Stripe Connect, Resend, Prodigi (prints, off by default). See `.env.example` for configuration and `HANDOVER.md` for background.

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build
npm test        # unit tests (fee maths and price validation)
npx convex dev --once   # regenerate convex/_generated after changing convex/*.ts
```

## Manual end-to-end test (Stripe test mode)

Needs a test-mode `STRIPE_SECRET_KEY`, both webhook secrets for test mode, and `SERVER_SECRET` set in both Vercel and Convex.

1. Sign up as a new artist at `/sign-up`.
2. On the dashboard, connect Stripe (test mode) and finish the onboarding with Stripe's test details. Payouts should show "Ready".
3. Go to `/sell`, choose an image, set a price (for example £5.00) and tap **Create link**. Wait for "Full-size image saved".
4. Open the link in a private window (not signed in). You should see the watermarked preview and "Pay £5.00 and download".
5. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.
6. On the success page, tap **Download your drawing**. The full-size image should download.
7. In the Stripe dashboard (test mode), refund the payment.
8. Reload the buyer link and try the download again. The download should now be blocked.

Also check: the same link cannot be paid twice while paid; a wrong claim code on `/e/<slug>` fails; 11 wrong attempts in a minute return "Too many attempts".

## Prints

Prints are hidden unless `NEXT_PUBLIC_PRINTS_ENABLED=true`. Before enabling, set real Prodigi SKUs and `PRINT_COST_*` values (including postage), and set `PRINTS_ENABLED=true` and the same `PRINT_COST_*` in the Convex env so print prices are checked against cost.
