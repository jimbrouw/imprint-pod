'use client';

import { ReactNode } from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';

// Falls back to a placeholder URL so builds/prerender don't crash when the env var is missing
// (e.g. a preview deploy without env configured). Real data requires NEXT_PUBLIC_CONVEX_URL.
const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.convex.cloud';

const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
