import { cronJobs } from "convex/server";

import { CADENCE } from "./config";
import { internal } from "./_generated/api";

/**
 * The two things that happen without anybody asking.
 *
 * Cadence lives in `config.ts` with the rest of the knobs, so changing how
 * often the feed refills is a one-line edit there and not a change here.
 */
const crons = cronJobs();

// Firecrawl goes looking for an argument; OpenAI turns one into a question.
crons.interval(
  "discover topics",
  { hours: CADENCE.discoverHours },
  internal.ingest.discover,
  {},
);

// The daily note. One per person per day, enforced by the dedupe key rather
// than by this schedule — a cron that fires twice still mails once.
crons.cron(
  "daily hot topics",
  `0 ${CADENCE.digestHourUtc} * * *`,
  internal.notify.digest,
  {},
);

export default crons;
