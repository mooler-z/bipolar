import {
  CaretRight,
  ChatCircle,
  GlobeHemisphereWest,
  ImageSquare,
  Lock,
  Star,
  Users,
  Warning,
} from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Thumb } from "../../ui/Thumb";
import { Box } from "./queue";

/**
 * One topic, as a row you scan rather than a card you read.
 *
 * The picture leads. Two thirds of this feed is abstract and has no picture,
 * which is exactly why the third that does should show it at a size that reads
 * across the room — a moderator recognises a face faster than a headline. The
 * status is a solid block on the left edge in the product's own colours, so a
 * long list sorts itself by colour before a single word is read; the counts
 * are tabular so they line up down the column.
 *
 * Pressing the row opens it in the aside. Pressing the box picks it for a
 * batch. Two hit areas side by side rather than nested — a button inside a
 * button is invalid, and a row that means two things depending on where you
 * hit it needs them to be two real targets.
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
  wikipediaTitle?: string;
  runSeq?: number | null;
  votes: number;
  comments: number;
  postedAt: number;
  mine: boolean;
};

/* Live is the product's own "go" violet; a draft is the yellow that means
   somebody has to decide; archived is the red that means it is off the site. */
export const STATUS: Record<
  string,
  { label: string; chip: string; block: string; ring: string }
> = {
  active: {
    label: "Live",
    chip: "bg-go-fill/15 text-go",
    block: "bg-go-fill",
    ring: "ring-go-fill",
  },
  draft: {
    label: "Draft",
    chip: "bg-coin-fill/15 text-coin",
    block: "bg-coin-fill",
    ring: "ring-coin-fill",
  },
  archived: {
    label: "Archived",
    chip: "bg-love-fill/12 text-love",
    block: "bg-love-fill",
    ring: "ring-love-fill",
  },
};

export function TopicRow({
  topic,
  selected,
  checked = false,
  index = 0,
  onSelect,
  onCheck,
}: {
  topic: AdminTopic;
  selected: boolean;
  /** Picked for a batch. Separate from `selected`, which opens the aside. */
  checked?: boolean;
  index?: number;
  onSelect: () => void;
  /** Absent where batching makes no sense, or the role cannot act on it. */
  onCheck?: () => void;
}) {
  const status = STATUS[topic.status] ?? STATUS.draft!;

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 14) * 26}ms` }}
      className={cn(
        "stagger group relative flex items-stretch overflow-hidden rounded-[var(--r-btn)]",
        "bg-surface transition-[background-color,box-shadow] duration-150",
        selected
          ? `ring-2 ${status.ring} bg-surface-2`
          : checked
            ? "bg-go-fill/[0.08] ring-1 ring-go-fill/50"
            : "hover:bg-surface-2",
      )}
    >
      {/* The status, as a block rather than a border: a colour the eye can
          sort by from across the room. */}
      <span aria-hidden className={cn("w-1.5 shrink-0", status.block)} />

      {onCheck ? (
        <Button
          bare
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? "Unpick this topic" : "Pick this topic"}
          onClick={onCheck}
          className="grid w-10 shrink-0 place-items-center transition-colors hover:bg-surface-3"
        >
          <Box checked={checked} />
        </Button>
      ) : null}

      <Button
        bare
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        className={cn("flex min-w-0 flex-1 items-center gap-3.5 py-2 pr-3 text-left", !onCheck && "pl-3")}
      >
        {/* The slot is reserved whether or not there is a picture. In the
            feed a missing picture gives its room back to the question; in a
            list, a column that moves from row to row cannot be scanned. */}
        {topic.imageUrl ? (
          <Thumb
            src={topic.imageUrl}
            alt=""
            rounded="rounded-[8px]"
            className="size-14 shrink-0 border border-line-2"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-[8px] border border-dashed border-line-2 text-line-2"
          >
            <ImageSquare className="size-5" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14.5px] font-extrabold tracking-[-0.01em]">
              {topic.question}
            </span>
            {topic.isFeatured ? (
              <Star weight="fill" className="size-3.5 shrink-0 text-coin" />
            ) : null}
            {topic.isLocked ? (
              <Lock weight="fill" className="size-3.5 shrink-0 text-mute" />
            ) : null}
            {topic.isSensitive ? (
              <Warning weight="fill" className="size-3.5 shrink-0 text-streak" />
            ) : null}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11.5px] text-mute">
            {/* The flag leads, always, with a globe standing in for "everywhere":
                anything of variable length before it would push it to a
                different place on every row. */}
            {topic.scopeCountry ? (
              <Flag code={topic.scopeCountry} />
            ) : (
              <GlobeHemisphereWest
                weight="fill"
                className="size-[15px] w-5 shrink-0 text-line-2"
                aria-label="Everywhere"
              />
            )}
            <span
              className={cn(
                "rounded-[5px] px-1.5 py-px text-[10px] font-extrabold tracking-[0.06em] uppercase",
                status.chip,
              )}
            >
              {status.label}
            </span>
            <span className="font-semibold capitalize">{topic.categorySlug}</span>
            {topic.runSeq ? (
              <span className="num max-sm:hidden">session {topic.runSeq}</span>
            ) : null}
            <span className="num truncate opacity-60 max-md:hidden">/{topic.slug}</span>
          </span>
        </span>

        {/* Tabular and fixed-width, so eighty rows read as two columns of
            numbers rather than eighty separate little clusters. */}
        <span className="num flex shrink-0 items-center gap-4 text-[13px] font-extrabold text-ink-2 max-sm:hidden">
          <span className="flex w-16 flex-col items-end leading-tight" title="Votes">
            {fmtInt(topic.votes)}
            <span className="flex items-center gap-1 text-[10px] font-bold text-mute">
              <Users className="size-3" /> votes
            </span>
          </span>
          <span className="flex w-14 flex-col items-end leading-tight" title="Comments">
            {fmtInt(topic.comments)}
            <span className="flex items-center gap-1 text-[10px] font-bold text-mute">
              <ChatCircle className="size-3" /> said
            </span>
          </span>
        </span>

        <CaretRight
          weight="bold"
          className={cn(
            "size-4 shrink-0 transition-[color,transform]",
            selected ? "translate-x-0.5 text-go" : "text-line-2 group-hover:text-mute",
          )}
        />
      </Button>
    </li>
  );
}
