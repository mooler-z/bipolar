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
import type * as adminQueue from "../adminQueue.js";
import type * as adminTopics from "../adminTopics.js";
import type * as adminUsers from "../adminUsers.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as backfill from "../backfill.js";
import type * as boards from "../boards.js";
import type * as calls from "../calls.js";
import type * as commentThread from "../commentThread.js";
import type * as comments from "../comments.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as feedContext from "../feedContext.js";
import type * as feedRank from "../feedRank.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as importTopics from "../importTopics.js";
import type * as ingest from "../ingest.js";
import type * as ingestRuns from "../ingestRuns.js";
import type * as ingestSession from "../ingestSession.js";
import type * as ingestStore from "../ingestStore.js";
import type * as insightChat from "../insightChat.js";
import type * as insightViews from "../insightViews.js";
import type * as interactions from "../interactions.js";
import type * as interests from "../interests.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_affinity from "../lib/affinity.js";
import type * as lib_agentmail from "../lib/agentmail.js";
import type * as lib_dedupe from "../lib/dedupe.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_ink from "../lib/ink.js";
import type * as lib_insight from "../lib/insight.js";
import type * as lib_mentions from "../lib/mentions.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_page from "../lib/page.js";
import type * as lib_png from "../lib/png.js";
import type * as lib_rank from "../lib/rank.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_seedOpinions from "../lib/seedOpinions.js";
import type * as lib_serve from "../lib/serve.js";
import type * as lib_slug from "../lib/slug.js";
import type * as lib_tgApi from "../lib/tgApi.js";
import type * as lib_tgFormat from "../lib/tgFormat.js";
import type * as lib_tgProfile from "../lib/tgProfile.js";
import type * as lib_tgTypes from "../lib/tgTypes.js";
import type * as lib_tunables from "../lib/tunables.js";
import type * as lib_voteCard from "../lib/voteCard.js";
import type * as lib_wikipedia from "../lib/wikipedia.js";
import type * as lib_worldCuts from "../lib/worldCuts.js";
import type * as limits from "../limits.js";
import type * as maintenance from "../maintenance.js";
import type * as migrate from "../migrate.js";
import type * as notifications from "../notifications.js";
import type * as notify from "../notify.js";
import type * as recommend from "../recommend.js";
import type * as retract from "../retract.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as seedBatches from "../seedBatches.js";
import type * as seedPeopleTopics from "../seedPeopleTopics.js";
import type * as seedTopics from "../seedTopics.js";
import type * as seedWipe from "../seedWipe.js";
import type * as seedWorld from "../seedWorld.js";
import type * as seedWorldTopics from "../seedWorldTopics.js";
import type * as seo from "../seo.js";
import type * as settings from "../settings.js";
import type * as shareImage from "../shareImage.js";
import type * as simulate from "../simulate.js";
import type * as simulateActs from "../simulateActs.js";
import type * as stats from "../stats.js";
import type * as telegram from "../telegram.js";
import type * as telegramBot from "../telegramBot.js";
import type * as telegramData from "../telegramData.js";
import type * as telegramLink from "../telegramLink.js";
import type * as topics from "../topics.js";
import type * as tunables from "../tunables.js";
import type * as users from "../users.js";
import type * as voteWrite from "../voteWrite.js";
import type * as votes from "../votes.js";
import type * as wallet from "../wallet.js";
import type * as world from "../world.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminQueue: typeof adminQueue;
  adminTopics: typeof adminTopics;
  adminUsers: typeof adminUsers;
  auditLog: typeof auditLog;
  auth: typeof auth;
  backfill: typeof backfill;
  boards: typeof boards;
  calls: typeof calls;
  commentThread: typeof commentThread;
  comments: typeof comments;
  config: typeof config;
  crons: typeof crons;
  feedContext: typeof feedContext;
  feedRank: typeof feedRank;
  http: typeof http;
  images: typeof images;
  importTopics: typeof importTopics;
  ingest: typeof ingest;
  ingestRuns: typeof ingestRuns;
  ingestSession: typeof ingestSession;
  ingestStore: typeof ingestStore;
  insightChat: typeof insightChat;
  insightViews: typeof insightViews;
  interactions: typeof interactions;
  interests: typeof interests;
  leaderboards: typeof leaderboards;
  "lib/affinity": typeof lib_affinity;
  "lib/agentmail": typeof lib_agentmail;
  "lib/dedupe": typeof lib_dedupe;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/ink": typeof lib_ink;
  "lib/insight": typeof lib_insight;
  "lib/mentions": typeof lib_mentions;
  "lib/openai": typeof lib_openai;
  "lib/page": typeof lib_page;
  "lib/png": typeof lib_png;
  "lib/rank": typeof lib_rank;
  "lib/rbac": typeof lib_rbac;
  "lib/seedOpinions": typeof lib_seedOpinions;
  "lib/serve": typeof lib_serve;
  "lib/slug": typeof lib_slug;
  "lib/tgApi": typeof lib_tgApi;
  "lib/tgFormat": typeof lib_tgFormat;
  "lib/tgProfile": typeof lib_tgProfile;
  "lib/tgTypes": typeof lib_tgTypes;
  "lib/tunables": typeof lib_tunables;
  "lib/voteCard": typeof lib_voteCard;
  "lib/wikipedia": typeof lib_wikipedia;
  "lib/worldCuts": typeof lib_worldCuts;
  limits: typeof limits;
  maintenance: typeof maintenance;
  migrate: typeof migrate;
  notifications: typeof notifications;
  notify: typeof notify;
  recommend: typeof recommend;
  retract: typeof retract;
  search: typeof search;
  seed: typeof seed;
  seedBatches: typeof seedBatches;
  seedPeopleTopics: typeof seedPeopleTopics;
  seedTopics: typeof seedTopics;
  seedWipe: typeof seedWipe;
  seedWorld: typeof seedWorld;
  seedWorldTopics: typeof seedWorldTopics;
  seo: typeof seo;
  settings: typeof settings;
  shareImage: typeof shareImage;
  simulate: typeof simulate;
  simulateActs: typeof simulateActs;
  stats: typeof stats;
  telegram: typeof telegram;
  telegramBot: typeof telegramBot;
  telegramData: typeof telegramData;
  telegramLink: typeof telegramLink;
  topics: typeof topics;
  tunables: typeof tunables;
  users: typeof users;
  voteWrite: typeof voteWrite;
  votes: typeof votes;
  wallet: typeof wallet;
  world: typeof world;
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
