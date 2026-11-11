import { NextResponse } from 'next/server';
import { z } from 'zod';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { api } from '../../../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ claimCode: z.string().trim().regex(/^[A-Za-z0-9]{6}$/) });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  try {
    // 10 attempts per minute per IP+event, enforced in Convex so it holds across serverless instances.
    const allowed = await convexServer().mutation(api.rateLimit.serverCheckRateLimit, {
      secret: serverSecret(),
      key: `claim:${ip}:${slug}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!allowed) {
      return NextResponse.json({ error: { message: 'Too many attempts. Wait a minute and try again.' } }, { status: 429 });
    }
  } catch (err) {
    console.error('[claim] rate limit', err);
    return NextResponse.json({ error: { message: 'Claim failed' } }, { status: 500 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: 'Enter your 6-character claim code' } }, { status: 400 });
  }

  try {
    const result = await convexServer().query(api.customers.serverClaim, {
      secret: serverSecret(),
      slug,
      claimCode: parsed.data.claimCode,
    });
    if (!result) return NextResponse.json({ error: { message: 'Claim code not found for this event' } }, { status: 404 });
    if (!result.ready) {
      return NextResponse.json(
        { error: { message: "Your portrait isn't uploaded yet. Check back in a moment!" } },
        { status: 409 }
      );
    }
    return NextResponse.json({ claimToken: result.claimToken });
  } catch (err) {
    console.error('[claim]', err);
    return NextResponse.json({ error: { message: 'Claim failed' } }, { status: 500 });
  }
}
