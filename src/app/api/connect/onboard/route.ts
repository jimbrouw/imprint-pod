import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { convexServer, serverSecret, appUrl } from '@/lib/convex-server';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { message: 'Not signed in' } }, { status: 401 });

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || email || 'Artist';

    const convex = convexServer();
    const secret = serverSecret();
    const artist = await convex.mutation(api.artists.serverEnsureArtist, { secret, userId, name, email });

    const stripe = getStripe();
    let accountId = artist.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        country: process.env.STRIPE_CONNECT_COUNTRY || undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { clerkUserId: userId },
      });
      accountId = account.id;
      await convex.mutation(api.artists.serverSetStripeAccount, { secret, userId, stripeAccountId: accountId });
    }

    const base = appUrl(new URL(req.url).origin);
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${base}/dashboard?stripe=refresh`,
      return_url: `${base}/dashboard?stripe=return`,
    });
    return NextResponse.json({ url: link.url });
  } catch (err: any) {
    console.error('[connect/onboard]', err);
    return NextResponse.json({ error: { message: err?.message || 'Stripe onboarding failed' } }, { status: 500 });
  }
}
