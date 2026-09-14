import { DIGEST, DISCOVERY, MIN_POLARIZING_SCORE } from "../config";

/**
 * The settings an operator can change without a deploy.
 *
 * `config.ts` is still the one file to edit, and every number here still has
 * its value there — what this adds is a way to move one at three in the morning
 * without a build. The code value is the **fallback**, not the old value: clear
 * a setting and it goes back to what the repository says, which means a
 * deployment whose settings table is empty behaves exactly like this one.
 *
 * **Money is deliberately absent.** Rule 3: the pack catalogue and the price of
 * a spark are server-side constants and the only source of prices. A wallet
 * that can be repriced from a web page is a wallet with a second source of
 * truth, and the first thing a stolen admin session would reach for.
 *
 * Shared by the Convex functions that enforce the bounds *and* by the React
 * page that renders them, so a field can never offer a value the server will
 * refuse — the same arrangement as `rbac.ts`.
 */

export type Tunable = {
  key: string;
  label: string;
  help: string;
  group: string;
  min: number;
  max: number;
  /** Shown after the number. */
  unit?: string;
  /** What `config.ts` says. Used whenever nothing has been stored. */
  fallback: number;
};

export const TUNABLES: Tunable[] = [
  {
    key: "discovery.runsPerDay",
    label: "Crawling sessions a day",
    help: "Spaced evenly across the day. Six is one every four hours. The cron ticks hourly and each tick asks whether a session is due, so this takes effect on the next tick rather than on the next deploy.",
    group: "Discovery",
    min: 1,
    max: 24,
    unit: "a day",
    fallback: DISCOVERY.runsPerDay,
  },
  {
    key: "discovery.topicsPerRun",
    label: "New questions a session",
    help: "What one session sets out to mint. It stops early when the searches run dry or the session runs out of its clock.",
    group: "Discovery",
    min: 1,
    max: 40,
    fallback: DISCOVERY.topicsPerRun,
  },
  {
    key: "discovery.queriesPerRun",
    label: "Searches a session may spend",
    help: "Most findings never become a topic — already seen, already asked, or something nobody argues about — so the questions cost far more searches than you might expect.",
    group: "Discovery",
    min: 1,
    max: 20,
    fallback: DISCOVERY.queriesPerRun,
  },
  {
    key: "discovery.resultsPerQuery",
    label: "Results asked of each search",
    help: "How wide each search casts. Higher finds more and costs more.",
    group: "Discovery",
    min: 1,
    max: 30,
    fallback: DISCOVERY.resultsPerQuery,
  },
  {
    key: "discovery.minPolarizing",
    label: "Polarizing floor",
    help: "The model scores 0-100 for how evenly a room would actually split. Below this the story is dropped. Raise it for a sharper feed and fewer topics; lower it for the reverse.",
    group: "Quality",
    min: 0,
    max: 100,
    unit: "/ 100",
    fallback: MIN_POLARIZING_SCORE,
  },
  {
    key: "discovery.sameness",
    label: "Sameness threshold",
    help: "Word overlap above which two questions count as the same argument and the second is dropped. Lower is stricter about repeats. Too high and one story written up twenty times becomes twenty questions.",
    group: "Quality",
    min: 30,
    max: 100,
    unit: "%",
    fallback: Math.round(DISCOVERY.sameness * 100),
  },
  {
    key: "digest.topics",
    label: "Topics in the daily mail",
    help: "How many arguments the daily note names.",
    group: "Mail",
    min: 1,
    max: 10,
    fallback: DIGEST.topics,
  },
  {
    key: "digest.maxRecipients",
    label: "Recipients a mailing",
    help: "A ceiling, so one cron firing cannot mail the world.",
    group: "Mail",
    min: 1,
    max: 5000,
    fallback: DIGEST.maxRecipients,
  },
];

export function tunableOf(key: string): Tunable | undefined {
  return TUNABLES.find((t) => t.key === key);
}

/** The groups in the order they should be shown. */
export function groupsOf(): string[] {
  return [...new Set(TUNABLES.map((t) => t.group))];
}

/**
 * A value this setting will actually accept.
 *
 * Whole numbers only, inside the stated bounds. The bounds are not decoration:
 * a crawling session set to run two thousand times a day is a deployment that
 * spends its Firecrawl quota before breakfast.
 */
export function clampTo(tunable: Tunable, value: number): number {
  if (!Number.isFinite(value)) return tunable.fallback;
  return Math.max(tunable.min, Math.min(tunable.max, Math.round(value)));
}

/** Everything at its code value. What an untouched deployment runs on. */
export function fallbacks(): Record<string, number> {
  return Object.fromEntries(TUNABLES.map((t) => [t.key, t.fallback]));
}

/**
 * Is a crawling session due?
 *
 * The cron cannot read a setting — a cron interval is fixed when the code is
 * deployed — so it ticks hourly and this decides. The nine tenths is for drift:
 * a tick that lands a few seconds before the gap is up would otherwise skip the
 * slot and wait a whole extra hour.
 */
export function sessionDue(
  lastStartedAt: number | null,
  runsPerDay: number,
  now: number,
): boolean {
  if (!lastStartedAt) return true;
  const gapMs = (24 / Math.max(1, runsPerDay)) * 3_600_000;
  return now - lastStartedAt >= gapMs * 0.9;
}
