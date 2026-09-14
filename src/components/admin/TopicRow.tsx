import { useState } from "react";
import {
  ArrowSquareOut,
  ChatCircle,
  CheckCircle,
  Lock,
  LockOpen,
  Star,
  Users,
  Warning,
  X,
} from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Thumb } from "../../ui/Thumb";

/**
 * One topic, and everything a moderator can do to it without leaving the list.
 *
 * The actions are inline on purpose. The job this console exists for is *"that
 * one is bad, take it down"*, and any design that makes that a two-page journey
 * has failed at the only thing it had to do.
 */

export type AdminTopic = {
  _id: string;
  slug: string;
  question: string;
  categorySlug: string;
  status: string;
  isFeatured: boolean;
  isLocked: boolean;
  isSensitive: boolean;
  scopeCountry?: string;
  imageUrl?: string;
  votes: number;
  comments: number;
  mine: boolean;
};

export type Can = {
  archive: boolean;
  feature: boolean;
  lock: boolean;
  publish: boolean;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Live", tone: "bg-go/15 text-go" },
  draft: { label: "Draft", tone: "bg-surface-3 text-mute" },
  archived: { label: "Archived", tone: "bg-love/12 text-love" },
};

export function TopicRow({
  topic,
  can,
  busy,
  onStatus,
  onFeature,
  onLock,
  onOpen,
}: {
  topic: AdminTopic;
  can: Can;
  busy: boolean;
  onStatus: (status: "draft" | "active" | "archived") => void;
  onFeature: (featured: boolean) => void;
  onLock: (locked: boolean) => void;
  onOpen: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const status = STATUS[topic.status] ?? STATUS.draft!;
  /* Ownership is enforced on the server; hiding the controls here only spares
     someone a refusal they were always going to get. */
  const editable = topic.mine;

  return (
    <li className="card flex items-center gap-3 p-3">
      <Thumb src={topic.imageUrl} alt="" rounded="rounded-[7px]" className="size-11" />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Button
            bare
            onClick={onOpen}
            className="min-w-0 truncate text-left text-[13.5px] font-bold hover:underline"
          >
            {topic.question}
          </Button>
          {topic.isFeatured ? (
            <Star weight="fill" className="size-3.5 shrink-0 text-coin" />
          ) : null}
          {topic.isLocked ? (
            <Lock weight="fill" className="size-3.5 shrink-0 text-mute" />
          ) : null}
          {topic.isSensitive ? (
            <Warning className="size-3.5 shrink-0 text-coin" />
          ) : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-mute">
          <span className={cn("rounded-[5px] px-1.5 py-0.5 font-bold", status.tone)}>
            {status.label}
          </span>
          <span className="capitalize">{topic.categorySlug}</span>
          {topic.scopeCountry ? <Flag code={topic.scopeCountry} /> : null}
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            <span className="num">{fmtInt(topic.votes)}</span>
          </span>
          <span className="flex items-center gap-1">
            <ChatCircle className="size-3" />
            <span className="num">{fmtInt(topic.comments)}</span>
          </span>
          <span className="num truncate opacity-60">/{topic.slug}</span>
        </span>
      </span>

      {/* Archiving is the one action here that changes what the public sees, so
          it is the one that asks. */}
      {confirming ? (
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11.5px] font-bold text-love">Take it down?</span>
          <Button
            variant="love"
            size="sm"
            disabled={busy}
            onClick={() => {
              onStatus("archived");
              setConfirming(false);
            }}
          >
            Archive
          </Button>
          <Button
            bare
            aria-label="Cancel"
            onClick={() => setConfirming(false)}
            className="grid size-8 place-items-center rounded-[var(--r-btn)] text-mute hover:text-ink"
          >
            <X className="size-4" />
          </Button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1">
          {can.feature && topic.status === "active" && editable ? (
            <Button
              bare
              disabled={busy}
              aria-label={topic.isFeatured ? "Un-feature" : "Feature"}
              title={topic.isFeatured ? "Un-feature" : "Feature — only one topic at a time"}
              onClick={() => onFeature(!topic.isFeatured)}
              className={cn(
                "grid size-9 place-items-center rounded-[var(--r-btn)] transition-colors",
                topic.isFeatured
                  ? "text-coin hover:bg-surface-3"
                  : "text-mute hover:bg-surface-3 hover:text-coin",
              )}
            >
              <Star weight={topic.isFeatured ? "fill" : "regular"} className="size-4" />
            </Button>
          ) : null}

          {can.lock && editable ? (
            <Button
              bare
              disabled={busy}
              aria-label={topic.isLocked ? "Unlock voting" : "Freeze voting"}
              title={topic.isLocked ? "Unlock voting" : "Freeze voting"}
              onClick={() => onLock(!topic.isLocked)}
              className="grid size-9 place-items-center rounded-[var(--r-btn)] text-mute transition-colors hover:bg-surface-3 hover:text-ink"
            >
              {topic.isLocked ? (
                <LockOpen className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
            </Button>
          ) : null}

          {/* The queue's whole purpose, one click, no confirm: approving is
              reversible and the alternative is a moderator who does not bother. */}
          {can.publish && topic.status === "draft" ? (
            <Button
              variant="go"
              size="sm"
              disabled={busy}
              onClick={() => onStatus("active")}
            >
              <CheckCircle className="size-4" /> Approve
            </Button>
          ) : null}

          <Button
            bare
            aria-label="Open on the site"
            title="Open on the site"
            onClick={onOpen}
            className="grid size-9 place-items-center rounded-[var(--r-btn)] text-mute transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <ArrowSquareOut className="size-4" />
          </Button>

          {can.archive && editable ? (
            topic.status === "archived" ? (
              <Button
                variant="steel"
                size="sm"
                disabled={busy}
                onClick={() => onStatus("active")}
              >
                Restore
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                Archive
              </Button>
            )
          ) : null}
        </span>
      )}
    </li>
  );
}
