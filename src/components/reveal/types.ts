import type { Side } from "../../lib/format";
import type { CountryRow } from "../../lib/insights";

/** The two-layer aggregate. Null in the payload until the reader has earned it. */
export type Aggregate = {
  freeLove: number;
  freeHate: number;
  paidLove: number;
  paidHate: number;
  stakedCents: number;
};

/** How a call on the room was graded. Null when no call was made. */
export type CallVerdict = {
  called: string;
  crowdWent: string;
  correct: boolean;
  crowdPct: number;
  streak: number;
  bestStreak: number;
} | null;

/** Everything the reveal is built from. */
export type Result = {
  stats: Aggregate;
  countries: CountryRow[];
  mine: Side | null;
  staked: boolean;
  verdict: CallVerdict;
};
