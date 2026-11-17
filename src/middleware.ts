import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Artist-only areas require sign-in. Public: /, /terms, /privacy, /refunds, /e/*, /artwork/*, /checkout/*, /api/public/*, /api/checkout*, /api/webhooks/*.
const isProtected = createRouteMatcher(['/dashboard(.*)', '/events(.*)', '/sell(.*)', '/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
