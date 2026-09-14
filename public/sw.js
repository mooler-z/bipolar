/*
 * The service worker.
 *
 * It exists for two reasons and no others: a browser will not offer to install
 * an app without one, and somebody who loses signal mid-run should get the
 * shell back rather than the dinosaur.
 *
 * What it deliberately does NOT do is cache the product's data. Topics, votes,
 * comments, the boards and every reactive query travel to a different origin
 * over a websocket, which this never sees; sign-in goes to that origin too. A
 * cache that answered an auth request would be a security bug, not a speed-up,
 * and a cache that answered a *vote* would be a correctness one — the whole
 * product turns on one vote per person per topic, decided by the server.
 *
 * Three rules, in the order they are checked:
 *
 *   1. Build assets are content-hashed, so a given URL's bytes can never
 *      change. Cache first, forever.
 *   2. Pages are network first. A topic's address is written by the server per
 *      request, and a deploy must be visible immediately, so the network
 *      always wins when it is there and the cache is only a fallback.
 *   3. Same-origin images and fonts, cache first. Everything else — every API
 *      call, every auth call, anything cross-origin — is not touched at all.
 */

const VERSION = "v1";
const PAGES = `bipolar-pages-${VERSION}`;
const ASSETS = `bipolar-assets-${VERSION}`;
const KEEP = new Set([PAGES, ASSETS]);

self.addEventListener("install", () => {
  // Nothing is precached: the shell's URL is content-hashed and unknown here,
  // and guessing it would mean shipping a list that goes stale every build.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !KEEP.has(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Only ever store a real, complete, same-origin answer. */
function storable(response) {
  return response && response.status === 200 && response.type === "basic";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (storable(response)) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (storable(response)) cache.put(request, response.clone());
    return response;
  } catch (offline) {
    // This exact page if it has been seen before; failing that, the front
    // page, which is the one address every visit passes through.
    const hit = (await cache.match(request)) || (await cache.match("/"));
    if (hit) return hit;
    throw offline;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // The backend, auth, the fonts — none of this worker's business.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === "image" || request.destination === "font") {
    event.respondWith(cacheFirst(request, ASSETS));
  }
});
