import { cn } from "../lib/cn";
import { Button } from "./Button";
import { OpenAI } from "./OpenAI";

import "./askButton.css";

/**
 * "Ask AI", in the header.
 *
 * The only control up there that advertises itself: a lit dot runs the rim on
 * a two-second loop whether or not anybody is looking at it, and the whole
 * plinth washes mint and rings out under the cursor. That is the point — the
 * panel behind it is new, and a new thing that looks like every other thing in
 * a toolbar is a new thing nobody presses.
 *
 * The mark is OpenAI's, not a sparkle, because the answer really does come
 * from a model and readers already know what the knot means.
 */
export function AskButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      bare
      aria-label="Ask the boards"
      title="Ask the boards"
      onClick={onClick}
      className={cn("ask-spark", className)}
    >
      <span aria-hidden className="ask-rim" />
      <OpenAI className="ask-mark" />
      <span className="ask-label hidden lg:inline">Ask AI</span>
    </Button>
  );
}
