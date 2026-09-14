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

/*
 * Firecrawl goes looking for arguments; OpenAI turns them into questions.
 *
 * **The tick is not the cadence.** A cron interval is fixed when the code is
 * deployed, and how often the feed refills is a setting an operator changes on
 * a page. So this ticks every hour and `discover` decides whether a session is
 * actually due from `discovery.runsPerDay`. A tick that is not due costs two
 * reads and does nothing.
 */
crons.interval("discover topics", { hours: 1 }, internal.ingest.discover, {});

// The daily note. One per person per day, enforced by the dedupe key rather
// than by this schedule — a cron that fires twice still mails once.
crons.cron(
  "daily hot topics",
  `0 ${CADENCE.digestHourUtc} * * *`,
  internal.notify.digest,
  {},
);

export default crons;
