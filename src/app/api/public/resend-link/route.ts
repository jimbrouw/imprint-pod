import { NextResponse } from 'next/server';
import { z } from 'zod';
import { convexServer, serverSecret, appUrl } from '@/lib/convex-server';
import { sendEmail, resendLinkEmail } from '@/lib/email';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

// Same answer whether or not a purchase exists, so this can't be used to probe for emails.
const REPLY = { message: "If we found a purchase, we've emailed you." };

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: 'Enter a valid email address.' } }, { status: 400 });
  }
  const { email } = parsed.data;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const convex = convexServer();
    const secret = serverSecret();

    // Throttle per IP and per email (so one inbox can't be spammed).
    const okIp = await convex.mutation(api.rateLimit.serverCheckRateLimit, {
      secret,
      key: `resend:ip:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });
    const okEmail = await convex.mutation(api.rateLimit.serverCheckRateLimit, {
      secret,
      key: `resend:email:${email}`,
      limit: 3,
      windowMs: 60 * 60_000,
    });
    if (!okIp || !okEmail) {
      return NextResponse.json({ error: { message: 'Too many requests. Please try again later.' } }, { status: 429 });
    }

    const links = await convex.query(api.orders.serverFindPaidLinksByEmail, { secret, email });
    if (links.length > 0) {
      const base = appUrl(new URL(req.url).origin);
      const mail = resendLinkEmail(links.map((l) => ({ eventTitle: l.eventTitle, url: `${base}/artwork/${l.claimToken}` })));
      await sendEmail({ to: email, ...mail });
    }
    return NextResponse.json(REPLY);
  } catch (err) {
    console.error('[resend-link]', err);
    return NextResponse.json({ error: { message: 'Something went wrong. Please try again.' } }, { status: 500 });
  }
}
