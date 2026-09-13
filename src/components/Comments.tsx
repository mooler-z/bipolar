import { useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "../lib/cn";
import { Button } from "../ui/Button";
import { ChatCircle } from "@phosphor-icons/react";
import { Chip, Label } from "../ui/Label";
import { Panel } from "../ui/Panel";
import { TextArea } from "../ui/TextArea";

/**
 * Trash talk, live.
 *
 * `useQuery` is a subscription, so a line somebody types appears on every open
 * cabinet the moment their mutation commits — no socket, no polling, nothing in
 * this file aware it is happening. That is the backend being Convex, not this
 * component being clever.
 *
 * A line costs a quill, so the composer says what it will cost before it is
 * spent. It is not behind the stats gate: talk is opinion, not the score, and
 * reading the room is most of what makes somebody want to fight.
 */

function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}

export function Comments({
  slug,
  topicId,
  quills,
  signedIn,
  className,
  onComposing,
}: {
  slug: string;
  topicId: Id<"topics">;
  quills: number;
  signedIn: boolean;
  className?: string;
  /** Raised while there is unsent text, so the feed does not advance over it. */
  onComposing?: (composing: boolean) => void;
}) {
  const rows = useQuery(api.comments.list, { slug, limit: 50 });
  const post = useMutation(api.comments.post);
  const remove = useMutation(api.comments.remove);

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const now = Date.now();

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await post({ topicId, body });
      setBody("");
      onComposing?.(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="The argument"
      icon={<ChatCircle className="size-4 text-mute" />}
      right={<Chip>{rows?.length ?? 0}</Chip>}
      className={className}
    >
      {signedIn ? (
        <div className="mb-3">
          <TextArea
            label="Say something"
            rows={3}
            maxLength={600}
            placeholder={quills > 0 ? "Say why." : "Out of quills."}
            value={body}
            disabled={quills < 1}
            onChange={(e) => {
              setBody(e.target.value);
              onComposing?.(e.target.value.trim().length > 0);
            }}
            onFocus={() => onComposing?.(true)}
            onBlur={() => onComposing?.(body.trim().length > 0)}
            onKeyDown={(e) => {
              // Enter sends, shift-enter breaks the line. The lines are short
              // and reaching for a button between them is friction.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Label>
              1 quill · <span className="num">{quills}</span> left
            </Label>
            <Button
              size="sm"
              variant={body.trim() ? "go" : "steel"}
              disabled={!body.trim() || quills < 1 || busy}
              onClick={() => void send()}
              className="transition-colors"
            >
              {busy ? "Sending…" : "Send"}
            </Button>
          </div>
          {error ? (
            <p className="mt-2 rounded-[var(--r-btn)] bg-love/15 px-2.5 py-1.5 text-xs font-semibold text-love">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mb-3 text-[13px] text-mute">
          Sign in to join. One quill buys one comment.
        </p>
      )}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {rows?.length === 0 ? (
          <li className="px-1 py-2 text-[13px] text-mute">
            Nobody has said anything yet.
          </li>
        ) : null}
        {rows?.map((row) => (
          <li
            key={row._id}
            className={cn(
              "roll rounded-[var(--r-btn)] px-3 py-2",
              "transition-[background-color,transform] duration-150 hover:translate-x-0.5",
              row.mine ? "bg-love/12" : "bg-surface-2",
            )}
          >
            <div className="min-w-0 flex-1">
              {row.body === null ? (
                <p className="text-[14px] text-mute italic">Removed.</p>
              ) : (
                <p className="text-[14px] leading-snug break-words">{row.body}</p>
              )}
              <div className="flex items-baseline gap-2">
                <Label className="truncate">
                  {row.author} · <span className="num">{ago(row.at, now)}</span>
                </Label>
                <span className="flex-1" />
                {row.canRemove ? (
                  <Button
                    bare
                    aria-label="Remove comment"
                    onClick={() => void remove({ commentId: row._id })}
                    className="min-h-11 shrink-0 px-2 text-[11px] font-semibold text-mute hover:text-love"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
