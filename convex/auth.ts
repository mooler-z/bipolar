import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

import authConfig from "./auth.config";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const authComponent = createClient<DataModel>(components.betterAuth);

/**
 * Auth runs inside Convex HTTP actions, so there is no separate auth server.
 * The SPA is served from a different origin than the deployment during
 * development — localhost against `.convex.site` — which is what the
 * cross-domain plugin exists for.
 *
 * Google is how people actually sign in. Password exists only so the two
 * seeded demo accounts work for a judge with no Google account, and
 * self-registration with a password is closed unless ALLOW_DEMO_SIGNUP is
 * deliberately flipped on while seeding.
 */
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL ?? "";
  const publicSiteUrl = process.env.PUBLIC_SITE_URL;

  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl, ...(publicSiteUrl ? [publicSiteUrl] : [])].filter(
      Boolean,
    ),
    database: authComponent.adapter(ctx),

    emailAndPassword: {
      enabled: true,
      disableSignUp: process.env.ALLOW_DEMO_SIGNUP !== "true",
      requireEmailVerification: false,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },

    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
};
