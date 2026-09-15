import { useMemo, useState, type KeyboardEvent, type RefObject } from "react";

import { typing } from "../../../convex/lib/mentions";

/**
 * Naming somebody, from the keyboard.
 *
 * The rule the whole feature rests on lives on the server — you can only name
 * somebody already in this thread — and this is the half that makes it
 * pleasant: type `@`, see the room, arrow to a name, press enter or tab.
 *
 * The picker matches on a **prefix**, not anywhere in the name, because
 * "@sa" meaning Sam is obvious and "@am" meaning Sam is a lottery. It is
 * capped at five: a list longer than the composer it hangs over is a list that
 * covers the thing being written about.
 *
 * `typing()` is shared with the server rather than reimplemented here, so the
 * two can never disagree about where a mention starts.
 */

const MOST = 5;

export function useMentions(
  names: string[],
  field: RefObject<HTMLTextAreaElement | null>,
) {
  const [at, setAt] = useState<{ query: string; from: number } | null>(null);
  const [index, setIndex] = useState(0);

  const options = useMemo(() => {
    if (!at) return [];
    const q = at.query.toLowerCase();
    return names.filter((n) => n.toLowerCase().startsWith(q)).slice(0, MOST);
  }, [at, names]);

  const open = at !== null && options.length > 0;

  /** Re-read the caret after every edit. The picker follows it, not the text. */
  function sync(body: string) {
    const caret = field.current?.selectionStart ?? body.length;
    setAt(typing(body, caret));
    setIndex(0);
  }

  function close() {
    setAt(null);
    setIndex(0);
  }

  /** Put a name in, and leave the cursor after the space so typing continues. */
  function choose(name: string, body: string): string {
    if (!at) return body;
    const caret = field.current?.selectionStart ?? body.length;
    const next = `${body.slice(0, at.from)}@${name} ${body.slice(caret)}`;
    const to = at.from + name.length + 2;
    close();
    // After React has written the value, or the caret lands in the old text.
    requestAnimationFrame(() => {
      const el = field.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(to, to);
    });
    return next;
  }

  /**
   * Returns the new body when the key was the picker's, `null` when it was
   * not — so the composer can send on enter exactly as it did before, unless
   * a name is waiting to be chosen.
   */
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, body: string): string | null {
    if (!open) return null;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % options.length);
      return null;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + options.length) % options.length);
      return null;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return null;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      return choose(options[index] ?? options[0]!, body);
    }
    return null;
  }

  return { open, options, index, setIndex, sync, close, choose, onKeyDown };
}
