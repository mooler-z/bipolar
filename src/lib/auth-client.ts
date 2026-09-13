import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * The app is served from a different origin than the Convex deployment —
 * localhost in development, `convex.site` once deployed — so auth calls go to
 * the deployment's own HTTP routes rather than a relative path.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL as string,
  plugins: [crossDomainClient(), convexClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
