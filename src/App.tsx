import { useEffect, useState } from "react";
import { useMutation } from "convex/react";

import { TopBar } from "./components/TopBar";
import { useQuery } from "convex/react";

import { api } from "../convex/_generated/api";
import { Admin } from "./views/Admin";
import { Account } from "./views/Account";
import { LinkTelegram } from "./views/LinkTelegram";
import { Suspended } from "./views/Suspended";
import { TopicWorld } from "./views/TopicWorld";
import { World } from "./views/World";
import { Home } from "./views/Home";
import { Welcome } from "./views/Welcome";
import { useSession } from "./lib/auth-client";
import { nextAfterSignIn, toSignIn } from "./lib/nav";

/**
 * Routing, such as it is: `/t/<slug>`, `/account`, or the feed.
 *
 * `/t/<slug>` is the same address the Convex HTTP route answers for a crawler,
 * so a pasted link renders real markup for a machine and this for a person.
 *
 * It is **not a page of its own**. A link out of the daily mail used to open a
 * different three columns — a world rail nobody asked for on the left, and no
 * way into the run — which made the most-shared address in the product the one
 * place the product was not. It opens the console now, on that question.
 */
export function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const session = useSession();
  const onboarding = useQuery(api.interests.mine);
  const me = useQuery(api.users.me);
  const ensure = useMutation(api.users.ensure);

  /*
   * Reconcile the session with the product's own row, once, wherever the
   * reader happens to land.
   *
   * Better Auth owns the credential; this app owns everything else about an
   * account. The two can come apart — a fresh sign-up, or a deployment whose
   * data was cleared while a session stayed live — and when they do, every
   * write fails with "sign in to do that" at somebody who plainly is.
   */
  useEffect(() => {
    if (session.data && me === null) void ensure({});
  }, [session.data, me, ensure]);

  /*
   * Back to the doorstep.
   *
   * A gated action sends a signed-out reader to `/account?next=…`. The moment
   * the session lands, that is redeemed — they arrive where they were pressing
   * rather than on whatever the feed happens to be showing.
   */
  useEffect(() => {
    if (!session.data || path !== "/account") return;
    const next = nextAfterSignIn(window.location.search);
    if (!next) return;
    // Replace, never push. The door is not a place to come back to, and a
    // pushed entry would catch the back button and bounce it forward again.
    window.history.replaceState({}, "", next);
    // The pathname only. `next` carries its query string — the bot's connect
    // link is `/link/telegram?code=…` — and holding that in `path` meant every
    // `path === "/somewhere"` below quietly stopped matching, which landed a
    // reader on the feed at the end of the one journey they had committed to.
    setPath(new URL(next, window.location.origin).pathname);
    window.scrollTo(0, 0);
  }, [session.data, path]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: string) {
    window.history.pushState({}, "", next);
    setPath(new URL(next, window.location.origin).pathname);
    window.scrollTo(0, 0);
  }

  /*
   * One button, two destinations. Signed in, `/account` is the wallet. Signed
   * out, it is the door — and the door has to remember where they were, or
   * "sign in to be counted" costs them the topic they were counted on.
   */
  const toAccount = () => (session.data ? go("/account") : toSignIn());

  /* `/t/<slug>` opens the console on that question; `/t/<slug>/world` opens
     the page about it, which is where a search result goes. */
  const inTopic = path.startsWith("/t/") ? path.slice(3).split("/") : null;
  const slug = inTopic ? decodeURIComponent(inTopic[0] ?? "") : null;
  const topicWorld = inTopic?.[1] === "world" ? slug : null;
  /* The bot's connect link. The code rides in the query string because the bot
     has to bake it into a URL before anybody has signed in. */
  const linkCode =
    path === "/link/telegram"
      ? new URLSearchParams(window.location.search).get("code")
      : null;
  /** The staff console owns the whole window and carries its own chrome. */
  const admin = path === "/admin" || path.startsWith("/admin/");

  // Onboarding is a gate rather than a page: a signed-in account that has never
  // answered the two questions sees them before anything else, because the feed
  // is markedly worse without them and a reader only gets one first impression.
  const needsWelcome =
    !!session.data && onboarding !== undefined && !onboarding.onboarded;

  // The console is a different product with a different frame; it never sits
  // under the public header.
  if (admin) return <Admin path={path} onGo={go} />;

  /*
   * A suspended account is shown the lock, not the app.
   *
   * The server refuses every write on its own — this changes nothing about
   * what is possible. It changes what it feels like: without it the app looks
   * entirely normal and each tap fails separately with a sentence that scrolls
   * away, which reads as a broken product rather than a closed door.
   */
  const suspended = !!session.data && me?.isBanned === true;

  return (
    <>
      <TopBar
        signedIn={!!session.data}
        atAccount={path === "/account"}
        atWorld={path === "/world"}
        onHome={() => go("/")}
        onAccount={toAccount}
        onWorld={() => go("/world")}
      />
      {suspended ? (
        <Suspended />
      ) : needsWelcome ? (
        <Welcome onDone={() => go("/")} />
      ) : linkCode ? (
        <LinkTelegram code={linkCode} onDone={() => go("/")} />
      ) : topicWorld ? (
        <TopicWorld key={topicWorld} slug={topicWorld} />
      ) : path === "/world" ? (
        <World onDone={() => go("/")} />
      ) : path === "/account" ? (
        <Account onDone={() => go("/")} />
      ) : (
        <Home key={slug ?? "run"} slug={slug ?? undefined} onAccount={toAccount} />
      )}
    </>
  );
}
