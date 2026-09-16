import { useEffect, useState } from "react";
import {
  Check,
  ImageSquare,
  LinkSimple,
  RedditLogo,
  ShareNetwork,
  TelegramLogo,
  WhatsappLogo,
  X,
  XLogo,
} from "@phosphor-icons/react";

import { canShareFile, copyLink, intentUrl, shareFile, shareText, type Channel } from "../../lib/share";
import { drawCard, type Card } from "../../lib/shareCard";
import { Button } from "../../ui/Button";

/**
 * Where a topic goes next.
 *
 * The growth mechanic is somebody pasting a result, so the card comes first
 * and the channels come second. On a phone "Share the card" hands the actual
 * picture to the OS sheet, which is what puts it in a story or a group chat
 * rather than a link nobody opens; on a desktop, where Web Share almost never
 * takes files, that button is not drawn at all and the channels are the path.
 *
 * **Nothing here dead-ends.** Every route that can come back `unsupported`
 * falls through to copying the link, because a share button that does nothing
 * visible is worse than one that was never offered.
 *
 * Brand marks are Phosphor's, not hand-cut SVG: this product has one icon set
 * and a second one smuggled in for four buttons is how a design system starts
 * being optional.
 */

const CHANNELS: { id: Channel; label: string; Mark: typeof XLogo }[] = [
  { id: "x", label: "X", Mark: XLogo },
  { id: "whatsapp", label: "WhatsApp", Mark: WhatsappLogo },
  { id: "reddit", label: "Reddit", Mark: RedditLogo },
  { id: "telegram", label: "Telegram", Mark: TelegramLogo },
];

export function ShareSheet({
  url,
  text,
  tags,
  card,
  onShared,
  onClose,
}: {
  url: string;
  text: string;
  /** The topic's own tags. They become the hashtags on the post. */
  tags?: string[];
  /** The picture to attach, when there is a result worth drawing. */
  card?: Card | null;
  /** Fired once, on whichever route actually sent it. */
  onShared?: (how: Channel | "card" | "native" | "copy") => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState(false);
  const [native, setNative] = useState(false);

  // Client-only APIs, so they are probed after mount rather than at render.
  useEffect(() => {
    setFiles(canShareFile());
    setNative(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    if (!(await copyLink(url))) return;
    onShared?.("copy");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function sendCard() {
    if (!card) return;
    setBusy(true);
    const file = await drawCard(card);
    const sent = file ? await shareFile(file, { url, text }) : "unsupported";
    setBusy(false);
    if (sent === "shared") {
      onShared?.("card");
      onClose();
    } else if (sent === "unsupported") {
      void copy();
    }
  }

  async function sendText() {
    const sent = await shareText({ url, text });
    if (sent === "shared") {
      onShared?.("native");
      onClose();
    } else if (sent === "unsupported") {
      void copy();
    }
  }

  function sendTo(id: Channel) {
    window.open(intentUrl(id, { url, text, tags }), "_blank", "noopener,noreferrer");
    onShared?.(id);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-canvas/75 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this topic"
        onClick={(e) => e.stopPropagation()}
        className="rise w-full max-w-sm overflow-hidden rounded-[var(--r-card)] border-2 border-line-2 bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-extrabold text-ink">Share this take</h2>
          <Button
            bare
            aria-label="Close"
            onClick={onClose}
            className="grid size-7 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X weight="bold" className="size-3.5" />
          </Button>
        </div>

        <div className="space-y-2.5 p-4">
          {/* The picture, where a picture can actually be handed over. */}
          {card && files ? (
            <Button variant="go" size="lg" block disabled={busy} onClick={() => void sendCard()}>
              <ImageSquare weight="fill" className="size-4" />
              {busy ? "Drawing…" : "Share the card"}
            </Button>
          ) : null}
          {(!card || !files) && native ? (
            <Button variant="go" size="lg" block onClick={() => void sendText()}>
              <ShareNetwork weight="fill" className="size-4" /> Share…
            </Button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map(({ id, label, Mark }) => (
              <Button
                key={id}
                variant="steel"
                size="sm"
                onClick={() => sendTo(id)}
                className="!justify-start"
              >
                <Mark weight="fill" className="size-4 shrink-0" /> {label}
              </Button>
            ))}
          </div>

          <Button variant="steel" size="sm" block onClick={() => void copy()}>
            {copied ? (
              <Check weight="bold" className="size-4 text-go" />
            ) : (
              <LinkSimple weight="bold" className="size-4" />
            )}
            {copied ? "Link copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
