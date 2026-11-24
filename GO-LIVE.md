# Go-live checklist

Written 2026-11-24. Do the stages in order. Tick each box only when you have seen it work. Read `HANDOVER.md` first for how the system fits together.

Who does what: **Owner** = Jim, in the Stripe, Vercel, Clerk, Convex, Resend and Cloudflare dashboards. **Claude** can drive the browser for non-sensitive checks and fix code, but never enters the owner's ID, bank, password or card details.

## Stage 0: Where things stand

- [x] Code for all features is on `main` (rebrand, `/sell`, safety fixes, iPad install, Accounts v2, legal pages).
- [x] Full sandbox test passed locally (PR 6): Connect, payment, download, refund then blocked.
- [ ] Not yet run against the deployed site, and nothing in live mode.
- [ ] Stripe live identity verification is **failed / locked out**.

## Stage 1: Unblock Stripe live verification (Owner)

1. Wait for the retry lockout to clear (usually about a day).
2. Check the details match the driving licence **exactly**: full legal name including middle name, date of birth, home address.
3. Retry from the **Setup guide** (bottom right) under "Set up your live account", then "Verify your identity". Do not use the "Identity" product in the left menu; that is a different paid add-on.
4. Photos: daylight, licence flat on a dark surface, all four edges visible, no glare. Use a passport if Stripe offers it.
5. If it fails again: Dashboard, Help, Contact support. Say identity verification keeps failing with a driving licence, now locked out, please review manually.
6. Also accept the platform-profile acknowledgements (refunds and chargebacks liability) on the Connect platform profile page.
7. Provide the public URLs Stripe asks for: terms `/terms`, privacy `/privacy`, refunds `/refunds`, support `/support` on drawncheckout.com.

Done when: the setup guide shows "Verify your identity" as complete.

## Stage 2: Test on the deployed site in test mode first (Owner + Claude)

Do this before any live money. It proves the deployed build, not just a local one.

1. In Vercel, confirm `STRIPE_SECRET_KEY` starts with `sk_test_` (temporarily, for this stage), and that both webhook secrets came from **test-mode** webhook destinations pointing at `https://drawncheckout.com/api/webhooks/stripe`.
2. Redeploy if you changed env.
3. Run the manual test in `README.md`: sign up, Connect Stripe (use Stripe's test data), `/sell`, open the link in a private window, pay with `4242 4242 4242 4242`, download, refund in Stripe, confirm the download is blocked.
4. Confirm the dashboard shows the sale under today.
5. Check Connect status updates for a **new v2 account**: payouts show "Ready" after onboarding (known risk in `HANDOVER.md` section 6).

Done when: every step passes on drawncheckout.com.

## Stage 3: Production services (Owner)

- [ ] **Clerk:** create a production instance on drawncheckout.com, copy its keys into Vercel (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), set the sign-in and sign-up URLs, and set `CLERK_JWT_ISSUER_DOMAIN` in the Convex env to the production issuer. Keep the JWT template named `convex`.
- [ ] **Convex:** confirm `SERVER_SECRET` equals the Vercel value; set `ADMIN_EMAILS` (your email) so `/admin` works. Decide whether production gets its own Convex deployment (`npx convex deploy`) instead of the current dev one; the dev deployment currently backs the live domain.
- [ ] **Resend:** verify the drawncheckout.com domain (DNS records in Cloudflare, "DNS only"), then set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. Send yourself a test receipt.
- [ ] **DNS:** add the `www` record; keep Cloudflare records on "DNS only" (grey cloud).
- [ ] **Legal:** read the privacy, terms and refunds pages. They are a template for a UK sole trader, not legal advice. Check the support email on `/support` is monitored.
- [ ] **Platform terms:** check Stripe's requirements for a Connect platform that carries refunds and chargebacks.

## Stage 4: Switch Stripe to live (Owner)

1. In Stripe **live mode**, create two webhook destinations, both at `https://drawncheckout.com/api/webhooks/stripe`:
   - "Your account" events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`. Secret goes in `STRIPE_WEBHOOK_SECRET`.
   - "Connected accounts" events: `account.updated`. Secret goes in `STRIPE_CONNECT_WEBHOOK_SECRET`.
   - Delete the duplicate destination left over from earlier (adventurous-breeze vs playful-euphoria) so events are not processed twice or sent to a dead URL.
2. Put the live `STRIPE_SECRET_KEY` (`sk_live_…`) in Vercel. Check `STRIPE_PLATFORM_FEE_BPS` (1000 = 10%) and `STRIPE_MIN_FEE` (50) are what you want to charge.
3. Redeploy production.
4. Confirm `NEXT_PUBLIC_PRINTS_ENABLED` is **not** set to `true` (digital only at launch).

Done when: a webhook delivery from Stripe shows HTTP 200 in the live dashboard.

## Stage 5: One real transaction (Owner)

1. Create a real artist account and complete live Connect onboarding with your real details (you enter these, not Claude).
2. From `/sell`, create a £2 sale (the minimum price).
3. Pay it from your own phone with a real card.
4. Confirm: success page, download works, receipt email arrives, sale shows Paid, the platform fee and artist payout look right in Stripe.
5. Refund it in Stripe, confirm the download is blocked.

Done when: a real £2 sale and refund both behave correctly.

## Stage 6: Launch hygiene

- [ ] Merge or close any leftover open PRs. PRs 4 and 5 are already contained in `main` and can be closed.
- [ ] `/admin` loads for your account and lists artists, sales and fees.
- [ ] iPad: open the site in Safari, Share, Add to Home Screen, check it opens full screen at `/sell`, and take a photo.
- [ ] Re-run `npx tsc --noEmit`, `npm run build` and `npm test` on `main`.
- [ ] Save the Stripe, Clerk and Convex recovery info somewhere safe.

## Later (not needed to launch)

- Prints: real Prodigi SKUs and costs including postage, `PRINT_COST_*` and `PRINTS_ENABLED=true` in Convex, then `NEXT_PUBLIC_PRINTS_ENABLED=true`, and a sandbox then live Prodigi test.
- A Playwright end-to-end test in Stripe test mode.
- Regenerate `package-lock.json` if you want locked installs and the OS mismatch is fixed.
- Marketing: first audience is UK caricature and event artists.
