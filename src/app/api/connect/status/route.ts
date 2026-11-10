import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Re-checks the artist's Stripe account and syncs onboarding completion. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { message: 'Not signed in' } }, { status: 401 });

  try {
    const convex = convexServer();
    const secret = serverSecret();
    const artist = await convex.query(api.artists.serverGetArtist, { secret, userId });
    if (!artist?.stripeAccountId) return NextResponse.json({ connected: false, complete: false });

    const account = await getStripe().accounts.retrieve(artist.stripeAccountId);
    const complete = !!account.details_submitted && !!account.charges_enabled;
    if (complete !== artist.stripeOnboardingComplete) {
      await convex.mutation(api.artists.serverSetOnboardingStatus, {
        secret,
        stripeAccountId: artist.stripeAccountId,
        complete,
      });
    }
    return NextResponse.json({ connected: true, complete });
  } catch (err: any) {
    console.error('[connect/status]', err);
    return NextResponse.json({ error: { message: err?.message || 'Status check failed' } }, { status: 500 });
  }
}
