import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { PaperPlaneRight, Trash } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { toSignIn } from "../../lib/nav";
import { Button } from "../../ui/Button";
import { TextArea } from "../../ui/TextArea";
import { OpenAI } from "../../ui/OpenAI";
import { Blocks, type Block } from "./blocks";
import { ConvexLoader } from "./ConvexMark";

/**
 * Asking the boards a question, in the rail.
 *
 * It reads as a conversation because it is one: the reader's own history
 * scrolls above and the box is pinned under it, the same shape as `Talk`.
 * That is deliberate — the rail already teaches that the thing at the bottom
 * is where you type, and a second, different arrangement in the same column
 * would be a second thing to learn.
 *
 * The answers are charts rather than paragraphs. The model chose which chart;
 * every number in it was read from the board afterwards, which is why the
 * panel is willing to draw them as confidently as it does.
 *
 * The openers are not decoration. An empty box with a blinking cursor is the
 * hardest possible thing to answer, and "who hates China" is both the question
 * people actually have and a demonstration of what the thing can do.
 */

const OPENERS = [
  "Who hates China?",
  "Who loves America most?",
  "India vs Pakistan",
  "What does the world hate most?",
  "Surprise me",
];

export function AskPanel({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const history = useQuery(api.insightChat.history, signedIn ? { limit: 20 } : "skip");
  const ask = useAction(api.insightChat.ask);
  const forget = useMutation(api.insightChat.forget);

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const rows = history ?? [];

  /* The box grows with what is in it. Reset to `auto` first — measuring
     `scrollHeight` against a height already set to the last measurement only
     ever grows, so a field that has been emptied would stay tall. */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [q]);

  /* Follow the newest answer, the way the thread does. A reply that lands
     below the fold is a reply nobody knows arrived. */
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [rows.length, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setWhy("");
    setQ("");
    try {
      const out = await ask({ question: text });
      if (out.why) setWhy(out.why);
    } catch (e) {
      setWhy(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <div className={cn("flex min-h-0 flex-col justify-center p-5 text-center", className)}>
        <OpenAI className="mx-auto size-6 text-go" />
        <p className="mt-3 text-[13.5px] font-bold text-ink">Ask the boards anything.</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-mute">
          Who hates China, what the world can't stand, which two countries never agree — answered
          in charts, from the live numbers.
        </p>
        <Button variant="go" size="sm" className="mt-4" onClick={toSignIn}>
          Sign in to ask
        </Button>
      </div>
    );
  }

  return (
    <section className={cn("relative flex min-h-0 flex-col", className)}>
      {/* The conversation goes behind tinted glass while the boards are being
          read. The marks turning over a sharp wall of text read as a thing
          stuck on top of the panel; over a blur they read as the panel
          working. What is under it is the reader's own history, so it stays on
          screen rather than being swapped out for a spinner.

          The glass is a sibling of the list inside this box rather than an
          overlay measured off the panel, so it covers the conversation exactly
          — the composer under it changes height with what is typed, and a veil
          guessing at where that ends shows its own edge. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={list}
          className={cn(
            "col-scroll flex-1 space-y-5 p-3 transition-[filter,opacity] duration-300",
            busy && "pointer-events-none blur-[7px] opacity-70",
          )}
        >
          {rows.length === 0 && !busy ? (
            <div className="px-1 py-4">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                <OpenAI className="size-4 text-go" />
                Ask the boards anything.
              </p>
              <p className="mt-1.5 text-[12.5px] leading-snug text-mute">
                Answers come back as charts, flags and maps, built from the live numbers — never
                from the model's memory.
              </p>
            </div>
          ) : null}

          {rows.map((row) => (
            <article key={row._id} className="space-y-2">
              {/* What was asked, as the reader's own line. */}
              <p className="ml-auto w-fit max-w-[85%] rounded-[var(--r-btn)] rounded-br-[4px] bg-surface-3 px-3 py-1.5 text-[12.5px] font-bold text-ink">
                {row.question}
              </p>
              <p className="flex items-center gap-1.5">
                <OpenAI className="size-3.5 shrink-0 text-go" />
                <span className="text-[12.5px] font-extrabold text-ink">{row.title}</span>
              </p>
              <Blocks blocks={row.blocks as Block[]} />
            </article>
          ))}

          {why ? (
            <p className="rounded-[var(--r-btn)] bg-love-fill/15 px-3 py-2 text-[12px] font-semibold text-love">
              {why}
            </p>
          ) : null}
        </div>

        {/* The wait. Not a skeleton: a skeleton promises a shape, and what comes
            back here is charts the model has not chosen yet. Three turning marks
            and a line say the boards are being read, which is the honest version
            of the same thing.

            Over the column rather than under the last answer, and centred in it.
            At the foot of a long conversation it sat below the fold, which is
            the one place a "working on it" can't do its job. */}
        {busy ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface-2/55 backdrop-blur-[3px]">
            <ConvexLoader size="size-16" />
            {/* The animation is decorative; this line is what a reader using a
                screen reader gets. */}
            <p role="status" className="text-center text-[12.5px] font-semibold text-mute">
              Reading the boards…
            </p>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-line bg-surface-2 p-2.5">
        {/* An empty box with a blinking cursor is the hardest thing to answer. */}
        {rows.length === 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {OPENERS.map((o) => (
              <Button
                key={o}
                size="sm"
                variant="steel"
                disabled={busy}
                onClick={() => void send(o)}
                className="!min-h-7 !px-2 !text-[11px]"
              >
                {o}
              </Button>
            ))}
          </div>
        ) : null}

        {/* A real text field, not a one-line box. Questions worth asking here
            run longer than a search — "which two countries never agree about
            anything" is four words past what a single line shows — so the box
            grows with what is typed and stops at five lines, after which it
            scrolls rather than eating the conversation above it. */}
        <div className="flex items-end gap-1.5 rounded-[var(--r-btn)] border-2 border-line bg-surface px-2.5 py-1.5 focus-within:border-go-fill">
          <OpenAI className="mb-2 size-4 shrink-0 text-go" />
          {/* The field wraps its own `<label>`, so that label is what this row
              lays out — and a bare block label takes its width from the
              textarea's `cols`, which is twenty characters and nothing to do
              with the column it is sitting in. The box below is what claims
              the width; everything inside it is already full-width. */}
          <div className="min-w-0 flex-1">
            <TextArea
              ref={box}
              label="Ask the boards"
              rows={1}
              value={q}
              disabled={busy}
              placeholder="Who hates China?"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, shift-enter breaks the line. The other way
                // round would make the common case the two-key one.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(q);
                }
              }}
              className="max-h-[7.5rem] !rounded-none !border-0 !bg-transparent !px-0 !py-1.5 !text-[13px] leading-snug"
            />
          </div>
          <Button
            bare
            aria-label="Ask"
            disabled={busy || q.trim().length === 0}
            onClick={() => void send(q)}
            className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-[6px] text-go disabled:opacity-30"
          >
            <PaperPlaneRight weight="fill" className="size-4" />
          </Button>
        </div>

        <p className="mt-2 flex items-center gap-2 text-[10.5px] text-mute">
          <span className="min-w-0 flex-1">
            Charts are built from the live boards. It can read them; it cannot change anything.
          </span>
          {rows.length > 0 ? (
            <Button
              bare
              aria-label="Clear this conversation"
              title="Clear this conversation"
              onClick={() => void forget({})}
              className="grid size-6 shrink-0 place-items-center rounded-[6px] text-mute hover:bg-surface-3 hover:text-ink"
            >
              <Trash className="size-3.5" />
            </Button>
          ) : null}
        </p>
      </div>
    </section>
  );
}
