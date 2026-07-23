import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { getAuthedConvexClient } from '@/lib/convexServer';
import { api } from '../../../../../convex/_generated/api';

export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const convex = await getAuthedConvexClient(getToken);
    const artist = await convex.query(api.artists.getMyArtist, {});
    if (!artist) {
      return NextResponse.json({ error: 'Artist record not found' }, { status: 404 });
    }

    let stripeAccountId = artist.stripeAccountId;
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: artist.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await convex.mutation(api.artists.setStripeAccount, {
        stripeAccountId,
        stripeOnboardingComplete: false,
      });
    }

    const origin = request.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/dashboard`,
      return_url: `${origin}/dashboard`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Stripe Connect onboarding failed:', err);
    return NextResponse.json({ error: err.message || 'Onboarding failed' }, { status: 500 });
  }
}
