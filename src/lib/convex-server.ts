import { ConvexHttpClient } from 'convex/browser';

/** Server-side Convex client. Only use from API routes / server code. */
export function convexServer() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  return new ConvexHttpClient(url);
}

export function serverSecret(): string {
  const s = process.env.SERVER_SECRET;
  if (!s) throw new Error('SERVER_SECRET is not set');
  return s;
}

export function appUrl(fallbackOrigin?: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || 'http://localhost:3000').replace(/\/$/, '');
}
