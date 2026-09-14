import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { Comments } from "../comments/Comments";
import { Boards } from "./Boards";
import { Live } from "./Live";
import { Tabs, type RoomTab } from "./Tabs";

/**
 * The right column: the room, while you are in it.
 *
 * Three faces over one rail, because a rail that scrolls three panels is a
 * rail nobody reads. `Live` is every vote and comment as it lands; `Talk` is
 * this topic's argument, in place, so arguing never costs the question its
 * screen; `Boards` is who is winning. All three are live Convex queries.
 *
 * `Talk` and `Live` own their own scrolling — each follows its newest line
 * from the bottom, the way a room fills — so they sit outside the rail's
 * scroller; `Boards` sits inside it.
 */

export type { RoomTab };

export function RoomRail({
  slug,
  topicId,
  quills,
  signedIn,
  commentCount,
  question,
  onTopic,
  tab,
  onTab,
  onOpen,
  onComposing,
  className,
}: {
  slug: string;
  topicId: Id<"topics">;
  quills: number;
  signedIn: boolean;
  commentCount: number;
  /** The question the rail is following, shown at the head of `Talk`. */
  question?: string;
  /** Where that question is, when the layout is a deck. */
  onTopic?: () => void;
  tab: RoomTab;
  onTab: (t: RoomTab) => void;
  onOpen: (slug: string) => void;
  /** Raised while a comment is being written, so the console never advances over it. */
  onComposing?: (composing: boolean) => void;
  className?: string;
}) {
  return (
    <aside
      className={cn("rail flex h-full min-h-0 flex-col xl:border-l xl:border-line", className)}
    >
      <Tabs tab={tab} onTab={onTab} commentCount={commentCount} />

      {tab === "talk" ? (
        <Comments
          slug={slug}
          topicId={topicId}
          quills={quills}
          signedIn={signedIn}
          question={question}
          onTopic={onTopic}
          onComposing={onComposing}
          className="min-h-0 flex-1"
        />
      ) : tab === "live" ? (
        <Live slug={slug} onOpen={onOpen} className="min-h-0 flex-1" />
      ) : (
        <div className="col-scroll flex-1">
          <Boards onOpen={onOpen} />
        </div>
      )}
    </aside>
  );
}
