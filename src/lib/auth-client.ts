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

/**
 * Where an OAuth round trip should come back to: wherever it started.
 *
 * One deployment serves two origins — `localhost:5173` while developing and
 * `convex.site` once hosted — and the cross-domain plugin takes a single
 * `siteUrl`. Left to itself it sends **every** sign-in back to that one value,
 * so signing in on the hosted site landed on localhost.
 *
 * The plugin rewrites a *relative* callback against its own `siteUrl` and
 * passes an **absolute** one through untouched, which is the seam: hand it the
 * current origin and the round trip returns to the origin it left from. Both
 * are in `trustedOrigins` server-side, so neither is a redirect anyone else
 * can aim.
 *
 * Nothing about Google's console changes — the provider always calls back to
 * the deployment. Only the last hop, back to the app, was wrong.
 */
export function returnTo(path = "/"): string {
  return new URL(path, window.location.origin).toString();
}
