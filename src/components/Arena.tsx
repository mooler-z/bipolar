import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { ArrowUUpLeft, Heart, HeartBreak, Lightning } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Button } from "../ui/Button";

import "./arena.css";

/**
 * The arena. The signature control, and the entire product.
 *
 * Two cards — a heart and a broken heart — side by side and alive: at rest
 * the icons beat and twitch every few seconds; the card under the cursor tilts toward the
 * hand in real 3D, lifts, lights its rim, and the other one shrinks out of
 * the way. Pressing punches the card and **the winner takes the board**: the
 * chosen colour spreads across the whole arena in a third of a second while
 * the other card collapses, and the result opens in the same frame. Nothing
 * is said — it is obvious what was pressed.
 *
 * **Undoing is this run backwards.** A card that comes back from a retraction
 * mounts still holding the whole board and gives the width up over 670ms while
 * the other grows in beside it, with the undo arrow spinning counter-clockwise
 * where its icon was. Nothing else announces it: the takeover reversed *is* the
 * announcement. At twice the takeover's 340ms, going forward stays decisive and
 * coming back reads as letting go — and lasts long enough to be watched.
 *
 * **The word is the watermark, and only the watermark.** LOVE and HATE are
 * already set across each card at nine times the size; printing them a second
 * time in the middle left the icon as the smallest thing on the loudest
 * control in the product, so the icon now owns the face and the word stays
 * behind it. A broken heart rather than a thumb, because the pair is then one
 * object in two states rather than two unrelated gestures.
 *
 * **Armed is a different object, not a tinted one.** Money on the line puts a
 * gold rim on both cards and a price sticker on each corner. A vote that
 * spends must never be one hover state away from a vote that does not.
 *
 * Exposes `press(side)` so the keyboard path plays the same takeover the
 * mouse does. A key that skips the animation feels like a shortcut rather than the
 * same act.
 */

export type ArenaHandle = { press: (side: Side) => void };

const TILT = 10;
const PICK_MS = 360;

export const Arena = forwardRef<
  ArenaHandle,
  {
    armed: boolean;
    busy: boolean;
    onPick: (side: Side) => void;
    /** Which answer the cursor is over, and whether it has been pressed, so
        the ground can take a side too — and then flood with it. */
    onLean?: (side: Side | null, pressed?: boolean) => void;
    /** A side just retracted. The board comes back held, then lets go. */
    restoring?: Side | null;
    className?: string;
  }
>(function Arena({ armed, busy, onPick, onLean, restoring = null, className }, ref) {
  const [hover, setHover] = useState<Side | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  /* Mounting already held, when this is a card coming back from a retraction.
     The board then lets go on the next frame and the transition does the rest. */
  const [slam, setSlam] = useState<Side | null>(restoring);
  const [rewinding, setRewinding] = useState(restoring !== null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /* The same, for an arena that is **already on screen** when the retraction
     lands. With the result skipped, the next question is up by the time undo
     is pressed, so this arena never mounted held — it just learned, mid-life,
     that it should be. A layout effect puts it into the held state before the
     browser paints, and the release below then runs exactly as it does after a
     mount. Without this there was nothing to let go of, and undo was a jump
     cut where every other undo in the product is a rewind. */
  useLayoutEffect(() => {
    if (restoring === null) return;
    setSlam(restoring);
    setRewinding(true);
  }, [restoring]);

  useEffect(() => {
    if (restoring === null) return;
    // Two frames: one to paint the held state, one to leave it. A single frame
    // lands in the same style recalculation and the transition never runs.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setSlam(null);
        timers.current.push(window.setTimeout(() => setRewinding(false), 755));
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [restoring]);

  function press(side: Side) {
    if (busy || slam) return;
    setSlam(side);
    onLean?.(side, true);
    timers.current.push(window.setTimeout(() => onPick(side), PICK_MS));
    // If nothing replaced the cards — a refused vote, a sign-in prompt, or a
    // pending vote the reader took back — the board resets so the next press
    // is possible, and the ground stops flooding with a colour nobody chose.
    timers.current.push(
      window.setTimeout(() => {
        setSlam(null);
        onLean?.(null);
      }, 1800),
    );
  }

  useImperativeHandle(ref, () => ({ press }));

  function follow(e: PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * TILT * 2, y: px * TILT * 2 });
  }

  return (
    <div
      className={cn("grid gap-3", className)}
      // The takeover: the chosen card's track grows to the whole width and
      // the other's shrinks to nothing. Only the columns animate.
      style={{
        perspective: "1400px",
        gridTemplateColumns:
          slam === "love" ? "1fr 0fr" : slam === "hate" ? "0fr 1fr" : "1fr 1fr",
        transition: `grid-template-columns ${rewinding ? 670 : 340}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {(["love", "hate"] as const).map((side) => (
        <Card
          key={side}
          side={side}
          lit={hover === side && !slam && !rewinding}
          chosen={slam === side && !rewinding}
          rewinding={rewinding && restoring === side}
          dim={(hover !== null && hover !== side && !slam) || (slam !== null && slam !== side)}
          tilt={tilt}
          armed={armed}
          onEnter={() => {
            setHover(side);
            if (!slam) onLean?.(side);
          }}
          onMove={follow}
          onLeave={() => {
            setHover(null);
            setTilt({ x: 0, y: 0 });
            if (!slam) onLean?.(null);
          }}
          onPress={() => press(side)}
        />
      ))}
    </div>
  );
});

function Card({
  side, lit, chosen, rewinding, dim, tilt, armed, onEnter, onMove, onLeave, onPress,
}: {
  side: Side;
  lit: boolean;
  chosen: boolean;
  /** This card is giving the board back. */
  rewinding: boolean;
  dim: boolean;
  tilt: { x: number; y: number };
  armed: boolean;
  onEnter: () => void;
  onMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onLeave: () => void;
  onPress: () => void;
}) {
  const love = side === "love";
  const Icon = rewinding ? ArrowUUpLeft : love ? Heart : HeartBreak;
  return (
    <Button
      bare
      aria-label={armed ? `Vote ${side}, backed with 50 cents` : `Vote ${side}`}
      onPointerEnter={onEnter}
      onPointerMove={lit ? onMove : undefined}
      onPointerLeave={onLeave}
      onClick={onPress}
      className={cn(
        "card-3d relative h-full w-full min-w-0 overflow-hidden rounded-[20px]",
        love ? "bg-love-fill text-on-love" : "bg-hate-fill text-on-hate",
        chosen && "punch",
        dim && "card-dim",
      )}
      style={
        lit ? { transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.04)` } : undefined
      }
    >
      <span className="absolute inset-0 overflow-hidden rounded-[inherit] [transform-style:preserve-3d]">
        <span className="watermark bottom-[-0.14em] left-[-0.04em] text-[clamp(5rem,9vw,9rem)]">
          {love ? "LOVE" : "HATE"}
        </span>

        {armed ? (
          <span className="pop-in absolute top-3 right-3 flex -rotate-6 items-center gap-1 rounded-full bg-coin-fill px-2.5 py-1 text-[11px] font-extrabold text-on-coin">
            <Lightning weight="fill" className="size-3" /> 50¢
          </span>
        ) : null}

        {/* Lifted off the face, so the tilt gives it real depth. */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ transform: "translateZ(34px)" }}
        >
          <Icon
            weight={rewinding || lit || armed || chosen ? "fill" : "bold"}
            className={cn(
              "size-[clamp(4.5rem,8vw,7.5rem)] transition-transform duration-200",
              rewinding
                ? "rewind-spin"
                : chosen
                  ? "pop-in"
                  : lit
                    ? love
                      ? "heartbeat"
                      : "wiggle"
                    : love
                      ? "idle-beat"
                      : "idle-wiggle",
            )}
          />
          <span
            className={cn(
              "key !bg-current/15 !text-current !shadow-none transition-opacity duration-200",
              chosen || rewinding ? "opacity-0" : lit ? "opacity-90" : "opacity-45",
            )}
          >
            {love ? "L" : "H"}
          </span>
        </span>

        {/* The rim: lights white on hover, holds gold while staked. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] transition-[box-shadow] duration-200",
            armed
              ? "shadow-[inset_0_0_0_4px_var(--coin-fill)]"
              : lit
                ? "shadow-[inset_0_0_0_4px_rgba(255,255,255,0.35)]"
                : "shadow-[inset_0_0_0_0_rgba(255,255,255,0)]",
          )}
        />

        {/* The press: a flash across the face and a ring out from the edge. */}
        {chosen ? (
          <>
            <span
              aria-hidden
              className={cn(
                "slam-flash absolute inset-0",
                armed ? "bg-coin-deep" : love ? "bg-love-deep" : "bg-hate-deep",
              )}
            />
            <span
              aria-hidden
              className="ping-ring pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{ color: love ? "var(--love-fill)" : "var(--hate-fill)" }}
            />
          </>
        ) : null}
      </span>
    </Button>
  );
}
