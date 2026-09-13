import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

/**
 * How Convex validates the JWTs Better Auth issues. The deployment is its own
 * issuer, so no third-party identity provider sits in the path.
 */
export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
