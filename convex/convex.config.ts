import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workpool from "@convex-dev/workpool/convex.config";

/**
 * App-owned root routing: our own HTTP routes keep stable URLs at the root and
 * the static site is registered as a catch-all behind them in `convex/http.ts`.
 *
 * That ordering is the whole reason a pasted topic link can show the live
 * split. The component-owned alternative puts the site at "/" and the SPA
 * fallback swallows every address a machine would read.
 */
const app = defineApp();
app.use(betterAuth);
app.use(staticHosting);
app.use(rateLimiter);

// Two pools, because the two kinds of background work have different urgency.
// Somebody is waiting on a notification; nobody is waiting on a rollup.
app.use(workpool, { name: "hotPool" });
app.use(workpool, { name: "bulkPool" });

export default app;
