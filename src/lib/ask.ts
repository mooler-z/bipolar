/**
 * The header's AI button, and the rail that answers it.
 *
 * They are in different trees — the bar belongs to `App`, the rail to `Home` —
 * so a press travels as a window event rather than as a prop threaded through
 * four components that have no other reason to know about it. The same shape
 * `nav.ts` uses for `popstate`, and for the same reason.
 */

const OPEN = "bipolar:ask";

/** Open the rail on the AI panel. */
export function openAsk(): void {
  window.dispatchEvent(new CustomEvent(OPEN));
}

export function onAsk(listen: () => void): () => void {
  window.addEventListener(OPEN, listen);
  return () => window.removeEventListener(OPEN, listen);
}
