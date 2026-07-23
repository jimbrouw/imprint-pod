import { ConvexHttpClient } from 'convex/browser';

function convexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  return url;
}

/** Plain client for public Convex functions — no user identity attached. */
export function getConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(convexUrl());
}

/** Client authenticated as the current Clerk user, for calling auth-gated Convex functions from a route handler. */
export async function getAuthedConvexClient(getToken: (opts: { template: string }) => Promise<string | null>): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(convexUrl());
  const token = await getToken({ template: 'convex' });
  if (!token) throw new Error('No Convex-compatible auth token available for the current user');
  client.setAuth(token);
  return client;
}
