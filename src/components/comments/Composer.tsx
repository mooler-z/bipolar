import { useEffect, useRef, useState } from "react";
import { ArrowBendUpLeft, Feather, PaperPlaneRight, X } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { toSignIn } from "../../lib/nav";
import { Button } from "../../ui/Button";
import { TextArea } from "../../ui/TextArea";
import { MentionPicker } from "./MentionPicker";
import { useMentions } from "./useMentions";

/**
 * Where a line is written, pinned under the thread.
 *
 * It says what a line costs before the line is spent, and it says so in
 * quills rather than money because that is what it costs. Enter sends and
 * shift-enter breaks, because the lines are short and reaching for a button
 * between them is friction.
 *
 * `onComposing` stays raised while there is unsent text, even after the
 * field loses focus — advancing the console out from under a half-typed
 * sentence would be the rudest thing this app could do.
 *
 * **Two hundred characters.** The counter appears in the last fifty, because
 * a limit that only announces itself at the moment you hit it is a limit that
 * eats a sentence somebody had finished writing.
 *
 * Pointing it at a comment puts one line above the field naming who is being
 * answered, with a way out. The comment itself is highlighted in the thread,
 * so quoting its words here as well was the same fact said twice.
 *
 * **`@` names somebody in the thread**, and only somebody in the thread. The
 * picker opens above the field because the composer is already at the foot of
 * the rail; it takes over enter while it is open, which is why `send` is
 * reached through the mention handler rather than around it.
 */

export const MAX_LENGTH = 200;
export function Composer({
  signedIn,
  quills,
  error,
  answering,
  people = [],
  seed,
  onSeeded,
  onCancelReply,
  onSend,
  onComposing,
}: {
  signedIn: boolean;
  quills: number;
  error: string;
  /** The line being answered, when the composer is pointed at one. */
  answering?: { author: string; body: string | null } | null;
  /** Who this thread lets you name. Server-decided; this only offers them. */
  people?: string[];
  /** Text to start from — a name, when a row in the live rail was answered. */
  seed?: string | null;
  onSeeded?: () => void;
  onCancelReply?: () => void;
  /** Resolves true once the line has landed. */
  onSend: (body: string) => Promise<boolean>;
  onComposing?: (composing: boolean) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const at = useMentions(people, field);
  const can = quills > 0;
  const ready = body.trim().length > 0 && can && !busy;
  const left = MAX_LENGTH - body.length;

  // Pointing the composer at a line should put the cursor in it. Being asked
  // to reply and then having to click the box is two acts for one intent.
  useEffect(() => {
    if (answering) field.current?.focus();
  }, [answering]);

  /* Answering somebody from the live rail arrives as a name to start from.
     It is prepended rather than assigned: a half-written sentence is somebody
     else's work and this feature does not get to throw it away. */
  useEffect(() => {
    if (!seed) return;
    setBody((was) => (was.includes(seed.trim()) ? was : seed + was));
    onComposing?.(true);
    field.current?.focus();
    onSeeded?.();
    // The seed is a one-shot instruction; everything else here is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  async function send() {
    if (!ready) return;
    setBusy(true);
    const ok = await onSend(body.trim());
    setBusy(false);
    if (ok) {
      setBody("");
      onComposing?.(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="shrink-0 border-t border-line px-4 py-3">
        <p className="text-[13px] leading-snug text-mute">
          One quill buys one comment, and a new account starts with three.
        </p>
        <Button variant="go" size="sm" block className="mt-2.5" onClick={toSignIn}>
          Sign in to join
        </Button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-line bg-surface-2 p-3">
      {answering ? (
        /* One line, no box. The comment it points at is already highlighted
           in the thread above, so repeating its words here was the same fact
           said twice in a panel that shouted. */
        <div className="slide-up mb-1.5 flex items-center gap-1.5 px-1">
          <ArrowBendUpLeft weight="bold" className="size-3 shrink-0 text-mute" />
          <span className="min-w-0 truncate text-[12px] text-mute">
            Replying to{" "}
            <span className="font-bold text-ink-2">{answering.author}</span>
          </span>
          <Button
            bare
            aria-label="Reply to the question instead"
            onClick={onCancelReply}
            className="grid size-5 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X weight="bold" className="size-3" />
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          "relative rounded-[var(--r-btn)] border-2 bg-surface transition-colors duration-150",
          can ? "border-line focus-within:border-hate-fill" : "border-line opacity-60",
        )}
      >
        {at.open ? (
          <MentionPicker
            options={at.options}
            index={at.index}
            onHover={at.setIndex}
            onPick={(name) => setBody(at.choose(name, body))}
          />
        ) : null}
        <TextArea
          ref={field}
          label={answering ? `Reply to ${answering.author}` : "Say something"}
          rows={2}
          maxLength={MAX_LENGTH}
          value={body}
          disabled={!can}
          placeholder={
            can ? (answering ? `Answer ${answering.author}…` : "Say why.") : "Out of quills."
          }
          className="!border-0 !bg-transparent !px-3 !pt-2.5 !pb-1"
          onChange={(e) => {
            setBody(e.target.value);
            at.sync(e.target.value);
            onComposing?.(e.target.value.trim().length > 0);
          }}
          onFocus={() => onComposing?.(true)}
          onBlur={() => {
            onComposing?.(body.trim().length > 0);
            // Let a click on the picker land before it disappears.
            window.setTimeout(at.close, 120);
          }}
          onKeyDown={(e) => {
            /* The picker owns the arrows, enter, tab and escape while it is
               open — otherwise enter would send a line mid-name. */
            const picked = at.onKeyDown(e, body);
            if (picked !== null) {
              setBody(picked);
              return;
            }
            if (e.defaultPrevented) return;

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
            // Escape steps back to answering the question itself.
            if (e.key === "Escape" && answering) onCancelReply?.();
          }}
          onClick={() => at.sync(body)}
          onKeyUp={(e) => {
            // Moving the caret with the arrows changes what is being named.
            if (e.key.startsWith("Arrow")) at.sync(body);
          }}
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <span
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold",
              can ? "text-mute" : "text-coin",
            )}
          >
            <Feather className="size-3.5 shrink-0" />
            {can ? (
              <span className="truncate">
                1 quill · <span className="num">{quills}</span> left
              </span>
            ) : (
              <span className="truncate">No quills left — packs are in your account</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {/* Only in the last fifty. A limit that announces itself at the
                moment you hit it eats a sentence somebody had finished. */}
            {left <= 50 ? (
              <span
                className={cn(
                  "num text-[11.5px] font-bold tabular-nums",
                  left <= 0 ? "text-love" : left <= 20 ? "text-coin" : "text-mute",
                )}
              >
                {left}
              </span>
            ) : null}
            <Button
              size="sm"
              variant={ready ? "go" : "steel"}
              disabled={!ready}
              onClick={() => void send()}
              className="!min-h-9 !px-3"
            >
              {busy ? "Sending…" : answering ? "Reply" : "Send"}
              <PaperPlaneRight weight="bold" className="size-3.5" />
            </Button>
          </span>
        </div>
      </div>

      {error ? (
        <p className="mt-2 rounded-[var(--r-btn)] bg-love-fill/15 px-2.5 py-1.5 text-xs font-semibold text-love">
          {error}
        </p>
      ) : null}

      <p className="mt-2 flex flex-wrap items-center gap-1 text-[10.5px] text-mute">
        <span className="key">enter</span> sends
        <span className="mx-1">&middot;</span>
        <span className="key">shift</span>+<span className="key">enter</span> for a new line
        {people.length > 0 ? (
          <>
            <span className="mx-1">&middot;</span>
            <span className="key">@</span> names somebody here
          </>
        ) : null}
      </p>
    </div>
  );
}
