import { ImageResponse } from 'next/og';

// Generated app icon so no binary assets are needed. Sizes: 180 (iOS), 192, 512.
const ALLOWED = new Set([180, 192, 512]);

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!ALLOWED.has(n)) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0369a1',
          color: '#ffffff',
          fontSize: n * 0.6,
          fontWeight: 800,
        }}
      >
        D
      </div>
    ),
    { width: n, height: n },
  );
}
