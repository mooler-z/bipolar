import {
  CaretRight,
  ChatCircle,
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

/**
 * One topic, as a row you scan rather than a card you read.
 *
 * The actions used to live here — five controls per row, eighty rows deep. That
 * makes every row a decision and the list impossible to read at a glance, which
 * is the opposite of what a moderator opens this for. A row's whole job now is
 * to be **scannable**: the status is a colour on the left edge before it is a
 * word, the counts are tabular so they line up down the column, and pressing
 * anywhere on it opens the topic in the aside, where there is room to act
 * deliberately.
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
  votes: number;
  comments: number;
  postedAt: number;
  mine: boolean;
};

/* Live is the product's own "go" violet; a draft is the yellow that means
   somebody has to decide; archived is the red that means it is off the site. */
export const STATUS: Record<
  string,
  { label: string; chip: string; edge: string }
> = {
  active: { label: "Live", chip: "bg-go-fill/15 text-go", edge: "border-l-go-fill" },
  draft: { label: "Draft", chip: "bg-coin-fill/15 text-coin", edge: "border-l-coin-fill" },
  archived: { label: "Archived", chip: "bg-love-fill/12 text-love", edge: "border-l-love-fill" },
};

export function TopicRow({
  topic,
  selected,
  index = 0,
  onSelect,
}: {
  topic: AdminTopic;
  selected: boolean;
  /** Position in the list, for the staggered entrance. */
  index?: number;
  onSelect: () => void;
}) {
  const status = STATUS[topic.status] ?? STATUS.draft!;

  return (
    <li>
      <Button
        bare
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        style={{ animationDelay: `${Math.min(index, 14) * 26}ms` }}
        className={cn(
          "stagger group flex w-full items-center gap-3 rounded-[var(--r-btn)] p-2",
          "border border-l-[3px] text-left transition-colors duration-150",
          status.edge,
          selected
            ? "border-y-line-2 border-r-line-2 bg-surface-3"
            : "border-y-transparent border-r-transparent hover:bg-surface-2",
        )}
      >
        <Thumb
          src={topic.imageUrl}
          alt=""
          rounded="rounded-[7px]"
          className="size-10 shrink-0 border border-line-2"
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-bold">{topic.question}</span>
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
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-mute">
            <span
              className={cn(
                "rounded-[5px] px-1.5 py-px font-extrabold tracking-[0.04em] uppercase",
                status.chip,
              )}
            >
              {status.label}
            </span>
            <span className="capitalize">{topic.categorySlug}</span>
            {topic.scopeCountry ? <Flag code={topic.scopeCountry} /> : null}
            <span className="num truncate opacity-70 max-sm:hidden">/{topic.slug}</span>
          </span>
        </span>

        {/* Tabular and fixed-width, so eighty rows read as two columns of
            numbers rather than eighty separate little clusters. */}
        <span className="num flex shrink-0 items-center gap-3 text-[12px] font-bold text-ink-3 max-sm:hidden">
          <span className="flex w-14 items-center justify-end gap-1" title="Votes">
            <Users className="size-3.5 text-mute" />
            {fmtInt(topic.votes)}
          </span>
          <span className="flex w-12 items-center justify-end gap-1" title="Comments">
            <ChatCircle className="size-3.5 text-mute" />
            {fmtInt(topic.comments)}
          </span>
        </span>

        <CaretRight
          weight="bold"
          className={cn(
            "size-3.5 shrink-0 transition-colors",
            selected ? "text-go" : "text-line-2 group-hover:text-mute",
          )}
        />
      </Button>
    </li>
  );
}
