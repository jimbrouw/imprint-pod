import { NextResponse } from 'next/server';
import { convexServer } from '@/lib/convex-server';
import { api } from '../../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const event = await convexServer().query(api.events.getPublicEvent, { slug });
    if (!event) return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    console.error('[public/events]', err);
    return NextResponse.json({ error: { message: 'Failed to load event' } }, { status: 500 });
  }
}
