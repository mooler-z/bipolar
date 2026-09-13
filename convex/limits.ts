import { MINUTE, HOUR, RateLimiter } from "@convex-dev/rate-limiter";

import { LIMITS } from "./config";
import { components } from "./_generated/api";

/**
 * Every rate limit in the product, in one place.
 *
 * These are transactional: the limit is consumed inside the same mutation as
 * the write it guards, so a vote that throws for any other reason gives its
 * token back. A counter in our own table could not promise that.
 *
 * The numbers themselves are in `config.ts` with the rest of the knobs.
 */
export const limiter = new RateLimiter(components.rateLimiter, {
  /** A burst of votes is normal — a person swiping a feed. A flood is not. */
  vote: {
    kind: "token bucket",
    rate: LIMITS.votesPerMinute,
    period: MINUTE,
    capacity: LIMITS.votesPerMinute,
  },
  /** A quill is spent either way; this is about flooding a topic, not cost. */
  comment: { kind: "token bucket", rate: LIMITS.commentsPerHour, period: HOUR },
  /** Checkout attempts, so a stolen session cannot hammer Stripe. */
  checkout: { kind: "fixed window", rate: 10, period: HOUR },
});
