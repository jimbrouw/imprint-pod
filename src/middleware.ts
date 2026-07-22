import { clerkMiddleware } from '@clerk/nextjs/server';

// Middleware runs but does NOT force-protect any routes.
// Individual pages use useUser() / auth() to gate content.
// Public routes (e/*, artwork/*, sign-in/*, sign-up/*) are open by design.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
