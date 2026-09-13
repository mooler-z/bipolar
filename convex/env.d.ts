/**
 * Every environment variable the backend reads, in one declaration.
 *
 * Narrow on purpose: pulling in `@types/node` would also advertise `fs` and
 * friends, which do not exist in the Convex runtime outside a `"use node"`
 * action. Add a key here the moment you `npx convex env set` it, so this stays
 * a truthful inventory rather than a stale one.
 *
 * Values are read through `config.ts`, never directly from a feature file.
 */
declare const process: {
  env: {
    /** Set by Convex. The deployment's HTTP host, e.g. https://x.convex.site */
    CONVEX_SITE_URL: string;
    /** Set by Convex. The deployment's API host, e.g. https://x.convex.cloud */
    CONVEX_CLOUD_URL: string;

    /** Origin the browser loads the app from. Differs from the deployment. */
    SITE_URL?: string;
    /** Where an emailed or pasted link must land: the deployed, public address. */
    PUBLIC_SITE_URL?: string;

    /** Signing secret for Better Auth sessions. */
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;

    /** Comma-separated addresses that hold the admin role on sign-in. */
    ADMIN_EMAILS?: string;

    /** Opens password sign-up long enough to create the demo accounts. */
    ALLOW_DEMO_SIGNUP?: string;
    DEMO_USER_PASSWORD?: string;
    DEMO_ADMIN_PASSWORD?: string;

    /** Writes the questions, and scores how two-sided a subject really is. */
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;

    /** Finds what the web is arguing about this week. */
    FIRECRAWL_API_KEY?: string;

    /** Carries the welcome and the daily note out to people not on the page. */
    AGENTMAIL_API_KEY?: string;
    /** The address those notices are sent from. */
    AGENTMAIL_INBOX?: string;

    /** Not yet wired: credit-pack checkout and its verified webhook. */
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;

    /** "true" keeps crawlers off a deployment that is not the real one. */
    NOINDEX?: string;
  };
};
