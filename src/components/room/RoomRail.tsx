import { useEffect, useState } from "react";

import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { AskPanel } from "../ai/AskPanel";
import { Comments } from "../comments/Comments";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { Boards } from "./Boards";
import { Live } from "./Live";
import { Tabs, type RoomTab } from "./Tabs";

/** How long the rail rests on each face before moving on. Long enough to read
    a board, short enough that the boards are seen at all. */
const DWELL_MS = 12_000;

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
 *
 * **It rotates between Live and Boards on its own.** Nobody was pressing
 * Boards, so the leaderboards were a screen almost nobody saw — and they are
 * the reason to come back. So the rail alternates between the two every few
 * seconds until somebody presses a tab themselves, at which point it stops
 * for good: a panel that keeps moving under a reader who has chosen one is
 * worse than a panel they never found. Talk never rotates, because a thread
 * somebody is reading is not a carousel.
 *
 * Answering somebody from `Live` crosses two of the three faces, so the rail
 * is where it is held: open their topic, turn to `Talk`, and hand the composer
 * their name. The seed carries the slug it was meant for, because opening a
 * topic is a round trip and a name delivered to the wrong thread would name
 * somebody who is not in it.
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
  onHide,
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
  /** Put this rail away. Absent where there is nothing to dock. */
  onHide?: () => void;
  className?: string;
}) {
  const [seed, setSeed] = useState<{ slug: string; text: string } | null>(null);
  /* Stops the moment somebody chooses a face for themselves. */
  const [rotating, setRotating] = useState(true);
  const canAsk = useQuery(api.insightChat.available) ?? false;

  useEffect(() => {
    if (!rotating || tab === "talk" || tab === "ask") return;
    const swap = window.setInterval(() => {
      // Only between Live and Boards. A panel somebody is typing in is not a
      // carousel, and neither is a thread they are reading.
      onTab(tab === "boards" ? "live" : "boards");
    }, DWELL_MS);
    return () => window.clearInterval(swap);
  }, [rotating, tab, onTab]);

  /** A tab pressed by hand is a decision; the rail stops moving after it. */
  function choose(next: RoomTab) {
    setRotating(false);
    onTab(next);
  }

  function answer(at: string, author: string) {
    if (at !== slug) onOpen(at);
    setSeed({ slug: at, text: `@${author} ` });
    // Answering somebody is a decision too — the rail must not rotate away
    // from the composer it just handed them.
    choose("talk");
  }

  return (
    <aside
      className={cn("rail flex h-full min-h-0 flex-col xl:border-l xl:border-line", className)}
    >
      <Tabs
        tab={tab}
        onTab={choose}
        commentCount={commentCount}
        onHide={onHide}
        rotating={rotating}
        canAsk={canAsk}
      />

      {tab === "talk" ? (
        <Comments
          slug={slug}
          topicId={topicId}
          quills={quills}
          signedIn={signedIn}
          question={question}
          seed={seed?.slug === slug ? seed.text : null}
          onSeeded={() => setSeed(null)}
          onTopic={onTopic}
          onComposing={onComposing}
          className="min-h-0 flex-1"
        />
      ) : tab === "ask" ? (
        <AskPanel signedIn={signedIn} className="min-h-0 flex-1" />
      ) : tab === "live" ? (
        <Live slug={slug} onOpen={onOpen} onAnswer={answer} className="min-h-0 flex-1" />
      ) : (
        <div className="col-scroll flex-1">
          <Boards onOpen={onOpen} />
        </div>
      )}
    </aside>
  );
}
