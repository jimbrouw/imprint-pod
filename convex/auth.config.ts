export default {
  providers: [
    {
      // Set CLERK_JWT_ISSUER_DOMAIN in the Convex dashboard (npx convex env set) to your Clerk Frontend API URL.
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || 'https://sweeping-dog-89.clerk.accounts.dev',
      applicationID: 'convex',
    },
  ],
};
