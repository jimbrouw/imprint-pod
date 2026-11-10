import { NextResponse } from 'next/server';
import { z } from 'zod';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { api } from '../../../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ claimCode: z.string().trim().regex(/^[A-Za-z0-9]{6}$/) });

// Best-effort brute-force throttle (per server instance): 10 attempts / minute / IP+event.
const attempts = new Map<string, number[]>();
function throttled(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > 10;
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (throttled(`${ip}:${slug}`)) {
    return NextResponse.json({ error: { message: 'Too many attempts. Wait a minute and try again.' } }, { status: 429 });
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
