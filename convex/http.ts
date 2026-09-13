import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { httpRouter } from "convex/server";

import { components, internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { robots, sitemap, topicPage } from "./seo";

/**
 * Route order is the whole point. Exact and prefixed routes are matched first,
 * so auth, the machine-readable topic pages and the country stamp keep stable
 * addresses; the static site is registered last and catches everything else.
 * Registered the other way round, the SPA's fallback would swallow every
 * address a crawler reads.
 */
const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({ path: "/robots.txt", method: "GET", handler: robots });
http.route({ path: "/sitemap.xml", method: "GET", handler: sitemap });
http.route({ pathPrefix: "/t/", method: "GET", handler: topicPage });

/**
 * Where a voter's country comes from.
 *
 * `cf-ipcountry` is on the request at the edge, and only an HTTP action can see
 * a request — a mutation is handed arguments, and a country in an argument is a
 * country the caller chose. The whole per-country breakdown rests on this being
 * the one path that sets it.
 */
const stampCountry = httpAction(async (ctx, request) => {
  const identity = await ctx.auth.getUserIdentity();
  const code = request.headers.get("cf-ipcountry") ?? "";
  if (identity && /^[A-Za-z]{2}$/.test(code) && code.toUpperCase() !== "XX") {
    await ctx.runMutation(internal.users.stampCountry, {
      authId: identity.subject,
      countryCode: code,
    });
  }
  return new Response(JSON.stringify({ country: code.toUpperCase() || null }), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": process.env.SITE_URL ?? "*",
      "access-control-allow-credentials": "true",
    },
  });
});

http.route({ path: "/api/country", method: "POST", handler: stampCountry });

registerStaticRoutes(http, components.staticHosting);

export default http;
