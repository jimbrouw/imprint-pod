# Using Imprint at an event

A quick walkthrough of the whole flow, from setting up an event to handing
a customer their portrait.

## 1. Sign in

Go to your site's address (e.g. `imprint-pod-pi.vercel.app`) and sign in.
If you don't have an account yet, use "Create an account" on that same
screen.

## 2. Set up an event (once, before the event)

From your dashboard, click **"Create event"**. Fill in:

- **Event title** — whatever helps you recognise it later (e.g. "Halcyon
  Rooftop Summer Party")
- **Event date** and **currency**
- **Digital download price** — what a customer pays to download their
  portrait
- **Print prices** — A5 / A4 / A3, for customers who want a physical print
  posted to them

Save it. You'll land on that event's **control room**, and a QR code is
generated for you — this one QR code covers the whole event.

**Print or display that QR code at your stand.** Every customer scans the
same one all day.

## 3. On the day: drawing and handing off

For each customer:

1. Finish their portrait on your iPad.
2. Open the **upload screen** for the event (there's a shortcut button on
   the control room page, or from the customer queue if you pre-registered
   them).
3. Type in the customer's first name.
4. Tap to choose the finished picture (PNG or JPEG, under 25MB).
5. Tap **"Upload the picture"**. This takes under a minute.
6. You'll get a QR code and a 6-character code on screen — hand the QR (or
   read out the code) to the customer.

The customer scans that code (or types the 6 characters in on the site) to
see their portrait and pay for a download or a print.

## 4. Keeping track

The control room page for each event shows:

- How many portraits have been drawn
- How many are uploaded
- How many have been paid for
- A full list of customers with their claim codes and status

You can also **"Add a customer"** ahead of time if someone's queuing — that
gives them a claim code before you've even started drawing.

## 5. Getting paid

Click **"Connect Stripe"** on your dashboard to link a bank account —
you'll be taken to Stripe's own onboarding form. Once submitted, money
from every download and print sale is transferred to that account
automatically (with a platform fee taken off the top).

> Note: the "Connect Stripe payouts" banner on your dashboard won't
> disappear once you've finished onboarding — that status isn't synced
> back yet. As long as you completed Stripe's form, payouts work
> regardless of what the banner says.

## Signing out / switching devices

Use "Sign out" in the top-right of your dashboard. You can sign back in
from any device — your events are tied to your account, not the iPad.
