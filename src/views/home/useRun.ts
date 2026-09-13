import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Result } from "../../components/Centre";
import type { CallVerdict } from "../../components/result/Parts";
import { MIN_ROOM, type Side } from "../../lib/format";

/**
 * A run: which question is in front of you, and what happened to the last one.
 *
 * Lives outside the view because it is a small state machine — run, answered,
 * pulled — and a view that both owns a state machine and lays out three
 * columns is a view nobody can change safely.
 */

export type Card = NonNullable<
  ReturnType<typeof useQuery<typeof api.topics.feed>>
>[number];

export function useRun() {
  // One seed per visit: a reload is a different run, not the same list again.
  const [session] = useState(() => ({
    now: Date.now(),
    seed: Math.random().toString(36).slice(2),
  }));
  const feed = useQuery(api.topics.feed, { limit: 40, ...session });
  const me = useQuery(api.users.me);
  const cast = useMutation(api.votes.cast);
  const skip = useMutation(api.votes.skip);

  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [armed, setArmed] = useState(false);
  const [asking, setAsking] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<{
    /** The card as it was answered — held, not re-derived. See below. */
    topic: Card;
    side: Side;
    staked: boolean;
    verdict: CallVerdict;
  } | null>(null);

  const open = feed?.filter((t) => !done.has(t._id)) ?? [];
  const canSpark = (me?.walletBalanceCents ?? 0) >= 50;

  useEffect(() => {
    if (!canSpark) setArmed(false);
  }, [canSpark]);

  /*
   * One lookup, two jobs.
   *
   * `bySlug` is the only query that carries an aggregate, and the one place the
   * gate is enforced — the feed never carries one. It answers both for the
   * topic just voted on and for a topic pulled out of a rail.
   */
  const lookup = answer?.topic.slug ?? picked;
  const page = useQuery(api.topics.bySlug, lookup ? { slug: lookup } : "skip");

  /*
   * A topic clicked in `Live` or `Boards` replaces the question in the middle
   * rather than navigating away. The rails are a live room; leaving the console
   * to look at one row of it ends the run.
   */
  const pulling = picked !== null && !answer;
  const pulled = pulling ? (page?.topic ?? null) : null;

  /*
   * The answered card is **held**, not re-derived.
   *
   * `feed` is a live subscription and the server drops a topic the moment it is
   * voted on, so `open[0]` becomes the *next* question one render after the
   * vote lands. Reading the result off that is a dead end: the query asks about
   * a topic this reader has not voted on, the gate correctly returns no
   * aggregate, and the reveal waits on stats that never arrive.
   */
  const topic = answer?.topic ?? pulled ?? open[0];

  /** Still ahead. The run's current question is in `open` until it is asked. */
  const upNext = answer || picked ? open : open.slice(1);

  /* Either the aggregate a vote just unlocked, or the one a pulled topic was
     already carrying because this reader answered it some time ago. */
  const stats = page?.topic.stats ?? null;
  const result: Result | null =
    answer && stats
      ? {
          stats,
          countries: page?.countriesFull ?? [],
          mine: answer.side,
          staked: answer.staked,
          verdict: answer.verdict,
        }
      : pulled && stats
        ? {
            stats,
            countries: page?.countriesFull ?? [],
            mine: (page?.viewer.votedPaid ??
              page?.viewer.votedFree ??
              null) as Side | null,
            staked: page?.viewer.votedPaid != null,
            verdict: null,
          }
        : null;

  useEffect(() => {
    if (picked !== null && page === null) {
      setPicked(null);
      setError("That topic is no longer open.");
    }
  }, [picked, page]);

  function clear() {
    setAnswer(null);
    setPicked(null);
    setAsking(null);
    setError("");
  }

  /** Done with this one — bank it and move to the next in the run. */
  function next() {
    if (answer) setDone((s) => new Set(s).add(answer.topic._id));
    clear();
  }

  /** Put a pulled topic back without answering it. */
  function release() {
    setPicked(null);
    setAsking(null);
    setError("");
  }

  function pass() {
    if (pulled) return release();
    if (!topic) return;
    if (me) void skip({ topicId: topic._id as Id<"topics"> });
    setDone((s) => new Set(s).add(topic._id));
    clear();
  }

  async function commit(side: Side, call?: Side) {
    if (!topic) return;
    if (!me) {
      setError("Sign in to vote — your first sparks are free.");
      setAsking(null);
      return;
    }
    setBusy(true);
    try {
      const out = await cast({
        topicId: topic._id as Id<"topics">,
        choice: side,
        voteType: armed ? "paid" : "free",
        call,
      });
      setAnswer({ topic, side, staked: armed, verdict: out.verdict });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAsking(null);
      setBusy(false);
    }
  }

  /** A room too small to read is never asked to be called. */
  function pick(side: Side) {
    if (!topic || busy) return;
    if (topic.crowdSize >= MIN_ROOM) setAsking(side);
    else void commit(side);
  }

  return {
    feed,
    me,
    topic,
    upNext,
    answeredCount: done.size + (answer ? 1 : 0),
    result,
    /** Answered, but the aggregate has not arrived yet. */
    loading: !!answer && !result,
    /* True from the click, not from the card landing — the banner has to
       appear immediately or the pull looks like nothing happened. */
    pulled: pulling,
    /** A pick is in flight. Only the middle column waits on it. */
    resolving: pulling && page === undefined,
    armed,
    setArmed,
    canSpark,
    asking,
    busy,
    error,
    setError,
    restart: () => {
      setDone(new Set());
      clear();
    },
    setPicked,
    next,
    release,
    pass,
    commit,
    pick,
  };
}
