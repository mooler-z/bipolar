import { useEffect, useState } from "react";
import { useMutation } from "convex/react";

import { TopBar } from "./components/TopBar";
import { useQuery } from "convex/react";

import { api } from "../convex/_generated/api";
import { Admin } from "./views/Admin";
import { Account } from "./views/Account";
import { Home } from "./views/Home";
import { TopicPage } from "./views/TopicPage";
import { Welcome } from "./views/Welcome";
import { useSession } from "./lib/auth-client";

/**
 * Routing, such as it is: `/t/<slug>`, `/account`, or the feed.
 *
 * `/t/<slug>` is the same address the Convex HTTP route answers for a crawler,
 * so a pasted link renders real markup for a machine and this for a person. A
 * router library can take over later without either address moving.
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

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: string) {
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo(0, 0);
  }

  const slug = path.startsWith("/t/") ? decodeURIComponent(path.slice(3)) : null;
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

  return (
    <>
      <TopBar
        signedIn={!!session.data}
        onHome={() => go("/")}
        onAccount={() => go("/account")}
      />
      {needsWelcome ? (
        <Welcome onDone={() => go("/")} />
      ) : slug ? (
        <TopicPage slug={slug} onBack={() => go("/")} />
      ) : path === "/account" ? (
        <Account onDone={() => go("/")} />
      ) : (
        <Home onAccount={() => go("/account")} />
      )}
    </>
  );
}
