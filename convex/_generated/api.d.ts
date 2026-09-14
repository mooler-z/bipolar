/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminTopics from "../adminTopics.js";
import type * as auth from "../auth.js";
import type * as calls from "../calls.js";
import type * as comments from "../comments.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as importTopics from "../importTopics.js";
import type * as ingest from "../ingest.js";
import type * as ingestStore from "../ingestStore.js";
import type * as interests from "../interests.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_agentmail from "../lib/agentmail.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_rank from "../lib/rank.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_slug from "../lib/slug.js";
import type * as lib_wikipedia from "../lib/wikipedia.js";
import type * as limits from "../limits.js";
import type * as maintenance from "../maintenance.js";
import type * as migrate from "../migrate.js";
import type * as notify from "../notify.js";
import type * as retract from "../retract.js";
import type * as seed from "../seed.js";
import type * as seedTopics from "../seedTopics.js";
import type * as seedWorldTopics from "../seedWorldTopics.js";
import type * as seo from "../seo.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";
import type * as topics from "../topics.js";
import type * as users from "../users.js";
import type * as votes from "../votes.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminTopics: typeof adminTopics;
  auth: typeof auth;
  calls: typeof calls;
  comments: typeof comments;
  config: typeof config;
  crons: typeof crons;
  http: typeof http;
  images: typeof images;
  importTopics: typeof importTopics;
  ingest: typeof ingest;
  ingestStore: typeof ingestStore;
  interests: typeof interests;
  leaderboards: typeof leaderboards;
  "lib/agentmail": typeof lib_agentmail;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/openai": typeof lib_openai;
  "lib/rank": typeof lib_rank;
  "lib/rbac": typeof lib_rbac;
  "lib/slug": typeof lib_slug;
  "lib/wikipedia": typeof lib_wikipedia;
  limits: typeof limits;
  maintenance: typeof maintenance;
  migrate: typeof migrate;
  notify: typeof notify;
  retract: typeof retract;
  seed: typeof seed;
  seedTopics: typeof seedTopics;
  seedWorldTopics: typeof seedWorldTopics;
  seo: typeof seo;
  settings: typeof settings;
  stats: typeof stats;
  topics: typeof topics;
  users: typeof users;
  votes: typeof votes;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  hotPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"hotPool">;
  bulkPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"bulkPool">;
};
