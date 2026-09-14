import { useCallback, useSyncExternalStore } from "react";

/**
 * Light or dark.
 *
 * Dark is the default because the product was drawn on it; light is the same
 * hierarchy on an inverted ground. The choice lives on `<html>` as
 * `data-theme` so the tokens in index.css switch in one place, and in
 * localStorage so it survives a reload — index.html applies it before the
 * first paint, so a light-theme reader never sees a black flash.
 */

export type Theme = "dark" | "light";

const KEY = "bipolar:theme";
const listeners = new Set<() => void>();

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the choice lasts the session. */
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#fffffc" : "#000000");
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);
  const toggle = useCallback(() => applyTheme(readTheme() === "light" ? "dark" : "light"), []);
  return [theme, toggle];
}
