import { useState } from "react";
import { Feather, PaperPlaneRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";
import { TextArea } from "../../ui/TextArea";

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
 */
export function Composer({
  signedIn,
  quills,
  error,
  onSend,
  onComposing,
}: {
  signedIn: boolean;
  quills: number;
  error: string;
  /** Resolves true once the line has landed. */
  onSend: (body: string) => Promise<boolean>;
  onComposing?: (composing: boolean) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const can = quills > 0;
  const ready = body.trim().length > 0 && can && !busy;

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
      <p className="shrink-0 border-t border-line px-4 py-3 text-[13px] text-mute">
        Sign in to join. One quill buys one comment.
      </p>
    );
  }

  return (
    <div className="shrink-0 border-t border-line bg-surface-2 p-3">
      <div
        className={cn(
          "rounded-[var(--r-btn)] border-2 bg-surface transition-colors duration-150",
          can ? "border-line focus-within:border-hate-fill" : "border-line opacity-60",
        )}
      >
        <TextArea
          label="Say something"
          rows={2}
          maxLength={600}
          value={body}
          disabled={!can}
          placeholder={can ? "Say why." : "Out of quills."}
          className="!border-0 !bg-transparent !px-3 !pt-2.5 !pb-1"
          onChange={(e) => {
            setBody(e.target.value);
            onComposing?.(e.target.value.trim().length > 0);
          }}
          onFocus={() => onComposing?.(true)}
          onBlur={() => onComposing?.(body.trim().length > 0)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
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
          <Button
            size="sm"
            variant={ready ? "go" : "steel"}
            disabled={!ready}
            onClick={() => void send()}
            className="!min-h-9 shrink-0 !px-3"
          >
            {busy ? "Sending…" : "Send"}
            <PaperPlaneRight weight="bold" className="size-3.5" />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-2 rounded-[var(--r-btn)] bg-love-fill/15 px-2.5 py-1.5 text-xs font-semibold text-love">
          {error}
        </p>
      ) : null}

      <p className="mt-2 flex items-center gap-1 text-[10.5px] text-mute">
        <span className="key">enter</span> sends
        <span className="mx-1">&middot;</span>
        <span className="key">shift</span>+<span className="key">enter</span> for a new line
      </p>
    </div>
  );
}
