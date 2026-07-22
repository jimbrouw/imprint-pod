'use client';

import { ReactNode } from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const isConvexConfigured = rawUrl && !rawUrl.includes('placeholder') && rawUrl.startsWith('http');

const convex = isConvexConfigured ? new ConvexReactClient(rawUrl!) : null;

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // If Convex URL is not configured yet in .env.local, render standard layout without throwing fatal error
    return (
      <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
