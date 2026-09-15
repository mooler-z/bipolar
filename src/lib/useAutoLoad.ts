import { useEffect, useRef } from "react";

/**
 * Load the next page when the end of the list comes into view.
 *
 * A sentinel element and an `IntersectionObserver`, rather than a scroll
 * handler doing arithmetic on `scrollHeight`. Two reasons, and the second is
 * the one that matters: the observer fires once per crossing instead of on
 * every pixel of a wheel, and it works inside a scroll container without the
 * caller having to know which element is doing the scrolling — this console
 * has three of them side by side and the public app has three more.
 *
 * `rootMargin` starts the fetch a screenful early, so a page is usually there
 * by the time the reader reaches where it goes. A spinner that appears every
 * time somebody scrolls is a list that feels slower than a numbered one.
 */
export function useAutoLoad(
  /** Convex's own status: "CanLoadMore" is the only one that should fetch. */
  status: string,
  loadMore: (n: number) => void,
  pageSize: number,
) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  /* The callback is re-read every fire rather than captured, because
     `loadMore` is a new function on each render and a captured one would go on
     asking for the page it was created for. */
  const latest = useRef({ status, loadMore, pageSize });
  latest.current = { status, loadMore, pageSize };

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const watch = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        const now = latest.current;
        if (now.status === "CanLoadMore") now.loadMore(now.pageSize);
      },
      { rootMargin: "600px 0px" },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return sentinel;
}
