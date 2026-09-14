import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { CallVerdict } from "../../components/reveal/types";
import { toResult } from "./result";
import { useHistory } from "./useHistory";
import { useUndo } from "./useUndo";
import { useTally } from "./useTally";
import { MIN_ROOM, type Side } from "../../lib/format";
import { toSignIn } from "../../lib/nav";

/**
 * A run: which question is in front of you, and what happened to the last one.
 *
 * Lives outside the view because it is a small state machine, and a view that
 * both owns one and lays out three columns is a view nobody can change safely.
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
  const history = useHistory();
  /* A topic pulled back out of that stack. It jumps the queue rather than
     being re-ranked to wherever the feed would now put it. */
  const [front, setFront] = useState<Card | null>(null);
  const run = useTally();
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

  /* One lookup, two jobs. `bySlug` is the only query carrying an aggregate and
     the one place the gate is enforced; it answers both for the topic just
     voted on and for one pulled out of a rail. */
  const lookup = answer?.topic.slug ?? picked;
  const page = useQuery(api.topics.bySlug, lookup ? { slug: lookup } : "skip");

  /* A topic clicked in a rail replaces the question rather than navigating
     away — leaving the console to look at one row of it ends the run. */
  const pulling = picked !== null && !answer;
  const pulled = pulling ? (page?.topic ?? null) : null;

  /*
   * The answered card is **held**, not re-derived. `feed` is a live
   * subscription and the server drops a topic the moment it is voted on, so
   * `open[0]` becomes the *next* question one render later. Reading the result
   * off that is a dead end: the gate correctly returns no aggregate for a
   * topic this reader has not voted on, and the reveal waits forever.
   */
  const topic = answer?.topic ?? pulled ?? front ?? open[0];

  /** Still ahead. Whatever is in front is not, wherever it came from. */
  const upNext = open.filter((t) => t._id !== topic?._id);

  /* The aggregate a vote just unlocked, or the one a pulled topic already
     carried because this reader answered it some time ago. */
  const result = toResult(page, answer, !!pulled);

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

  /**
   * The next question, chosen **now** rather than read off the list later.
   *
   * `feed` is a live ranked subscription and every move rewrites its own
   * inputs: a skip writes a row the ranker reads, a vote writes taste, the
   * counters and the velocity window. So the list re-orders about a round trip
   * after the run moves on — and a front card read off it at that moment is
   * shown for a beat and then silently replaced by a different question. The
   * reader watches the thing they were about to answer turn into something
   * else. Pinning the successor at the moment of the press ends that: the
   * re-rank still happens and still decides what comes *after*, but it can no
   * longer reach the card already on screen.
   */
  function advance() {
    setFront(upNext[0] ?? null);
  }

  /** Done with this one — bank it and move to the next in the run. */
  function next() {
    const left = answer?.topic ?? pulled;
    if (left) {
      setDone((s) => new Set(s).add(left._id));
      history.push(left, true);
    }
    advance();
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
    history.push(topic, false);
    run.skipped(1);
    advance();
    clear();
  }

  /**
   * Step back through the run. A skipped question returns to be answered,
   * jumping the queue; an answered one returns as its result, which costs
   * nothing to re-read because its aggregate is already unlocked.
   *
   * **Neither rewrites what happened.** The skip row stays written and the
   * vote stays cast — the server recorded both and the ranker has learned
   * from them. What comes back is the screen, not the history.
   */
  function back() {
    if (busy) return;
    const last = history.newest;
    if (!last) return;
    history.drop();
    setFront(null);
    clear();

    if (last.answered) {
      setPicked(last.card.slug);
      return;
    }
    setDone((d) => {
      const next = new Set(d);
      next.delete(last.card._id);
      return next;
    });
    run.skipped(-1);
    setFront(last.card);
  }

  /**
   * A row in a rail takes the middle column, whatever is currently in it.
   *
   * It used to only set `picked`, which does nothing while a result is still
   * on screen — `pulling` is false until the answer clears. The click looked
   * ignored, and then the topic arrived a second or two later on the heels of
   * the auto-advance. Banking the answer here means the pull registers on the
   * press, and the column shows the loader until that topic's own card lands.
   */
  function pull(slug: string) {
    if (busy) return;
    const left = answer?.topic;
    if (left) {
      setDone((s) => new Set(s).add(left._id));
      history.push(left, true);
      advance();
    } else if (topic) {
      // Nothing else moves while the pulled card loads: the column holds the
      // question it was already showing, under the loader, rather than letting
      // the run's next one flash through and be replaced a beat later.
      setFront(topic);
    }
    setAnswer(null);
    setAsking(null);
    setError("");
    setPicked(slug);
  }

  async function commit(side: Side, call?: Side) {
    if (!topic) return;
    // Not a refusal: the door, and `App` brings them back to this question.
    if (!me) return toSignIn();
    setBusy(true);
    try {
      const out = await cast({
        topicId: topic._id as Id<"topics">,
        choice: side,
        voteType: armed ? "paid" : "free",
        call,
      });
      setAnswer({ topic, side, staked: armed, verdict: out.verdict });
      run.voted(side, armed, out.verdict ? out.verdict.correct : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAsking(null);
      setBusy(false);
    }
  }

  /**
   * Pressing an answer opens the call, and the call is the pending window.
   *
   * Nothing reaches the server until `commit` runs, which is the whole reason
   * `undo` can exist: a pending vote is free to take back and a cast one is
   * final, exactly as Rule 8 requires. A room too small to read is never asked
   * to be called and never graded, so it casts on the press — an extra
   * confirmation there is ceremony for its own sake.
   */
  function pick(side: Side) {
    if (!topic || busy) return;
    if (topic.crowdSize >= MIN_ROOM) setAsking(side);
    else void commit(side);
  }

  const { undone, undo } = useUndo({
    answer,
    asking,
    busy,
    setAnswer,
    setAsking,
    setBusy,
    setError,
    setFront,
  });

  return {
    feed,
    me,
    topic,
    upNext,
    answeredCount: done.size + (answer ? 1 : 0),
    tally: run.tally,
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
    /** Whether there is anything behind you in the run. */
    canGoBack: history.any,
    /** A vote cast this sitting, still inside its window. */
    canUndo: !!answer,
    /** The side a retraction just pulled back. Drives the rewind. */
    undone,
    restart: () => {
      setDone(new Set());
      history.clear();
      setFront(null);
      run.reset();
      clear();
    },
    pull,
    next,
    release,
    pass,
    commit,
    pick,
    undo,
    back,
  };
}
