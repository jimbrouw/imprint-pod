import { NextResponse } from 'next/server';
import { convexServer, serverSecret } from '@/lib/convex-server';
import { api } from '../../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ claimToken: string }> }) {
  const { claimToken } = await params;
  if (claimToken.length < 32) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });

  const file = await convexServer().query(api.artworks.serverGetDownload, { secret: serverSecret(), claimToken });
  if (!file) {
    return NextResponse.json({ error: { message: 'Download not available. Has this portrait been paid for?' } }, { status: 403 });
  }

  const upstream = await fetch(file.url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: { message: 'File unavailable' } }, { status: 502 });
  }

  const ext = file.mimeType === 'image/png' ? 'png' : 'jpg';
  const safeName = file.customerName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'portrait';
  return new Response(upstream.body, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${safeName}-portrait.${ext}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
