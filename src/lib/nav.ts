/**
 * Going somewhere, in an app with no router.
 *
 * `App` owns the current path and listens for `popstate`, so a push followed by
 * a synthetic `popstate` is how anything outside the view tree moves the app.
 * It was already the pattern in one place; this is that pattern, named.
 */
export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

/**
 * Send somebody to the door, and remember the doorstep.
 *
 * **Every gated action ends here rather than in a refusal.** A message saying
 * "sign in to vote" leaves the reader to find the way themselves, having
 * already told you what they wanted; a message plus a journey they did not ask
 * for is worse. So the press takes them to the door, and `App` puts them back
 * where they were once the session lands.
 *
 * `next` is the path they were on. It survives the OAuth round trip because
 * the door returns to its own address, search string and all.
 */
export function toSignIn(): void {
  const here = window.location.pathname + window.location.search;
  navigate(`/account?next=${encodeURIComponent(here)}`);
}

/**
 * The remembered doorstep, if it is one of ours.
 *
 * Only a path on this origin is honoured — a `next` that is absolute, or
 * protocol-relative, is somebody trying to use the sign-in page as a redirector
 * and is dropped on the floor.
 */
export function nextAfterSignIn(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next === "/account" ? null : next;
}
