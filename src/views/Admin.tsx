import { useQuery } from "convex/react";
import { Prohibit, ShieldCheck } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { RecordSection } from "../components/admin/AuditRecord";
import { Console } from "../components/admin/Console";
import { Overview } from "../components/admin/Overview";
import { Settings } from "../components/admin/Settings";
import { TopicList } from "../components/admin/TopicList";
import { sectionOf } from "../lib/admin-nav";
import { signOut } from "../lib/auth-client";
import { Button } from "../ui/Button";
import { Wordmark } from "../ui/Wordmark";

/**
 * The staff console.
 *
 * `admin.me` answers `null` for a signed-out reader, a plain account, and a
 * suspended one alike — a refusal is a normal answer here, not a fault, so this
 * route renders a door rather than an error. The door deliberately says nothing
 * about *why*: an account that is not staff learns only that it is not staff.
 *
 * The real gate is on the server. Every query behind this screen re-checks for
 * itself; hiding a section is manners, not a control.
 *
 * Sections render a `Work` and an `Aside` — the console frame supplies
 * everything around them. Two of them are the same component: the review queue
 * is the topic list with the status pinned to drafts.
 */
export function Admin({
  path,
  onGo,
}: {
  path: string;
  onGo: (path: string) => void;
}) {
  const identity = useQuery(api.admin.me);

  if (identity === undefined) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-canvas">
        <span className="shimmer h-12 w-64 rounded-[var(--r-card)]" />
      </div>
    );
  }

  if (identity === null) return <Door onGo={onGo} />;

  const permissions = identity.permissions;
  const section = sectionOf(path, permissions);

  return (
    <Console
      identity={identity}
      section={section}
      onGo={onGo}
      onSignOut={() => void signOut()}
    >
      {section === "" ? <Overview permissions={permissions} onGo={onGo} /> : null}
      {section === "topics" ? <TopicList permissions={permissions} /> : null}
      {section === "queue" ? (
        <TopicList permissions={permissions} fixedStatus="draft" />
      ) : null}
      {section === "record" ? <RecordSection /> : null}
      {section === "settings" ? <Settings permissions={permissions} /> : null}
    </Console>
  );
}

function Door({ onGo }: { onGo: (path: string) => void }) {
  return (
    <div className="grid h-[100dvh] place-items-center bg-canvas px-6 text-center">
      <div className="rise max-w-sm">
        <Wordmark className="mx-auto mb-6" />
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-3 text-mute">
          <Prohibit weight="fill" className="size-6" />
        </span>
        <h1 className="display mt-5 text-[clamp(1.5rem,3vw,2rem)]">Staff only.</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-mute">
          This console is for the people who run bi-polar. If that should be
          you, someone with the keys has to say so.
        </p>
        <p className="mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck weight="fill" className="size-3.5 text-go" />
          <span className="text-[11px] font-extrabold tracking-[0.08em] text-mute uppercase">
            Every action here is recorded
          </span>
        </p>
        <div className="mt-7 flex justify-center">
          <Button variant="go" onClick={() => onGo("/")}>
            Back to bi-polar
          </Button>
        </div>
      </div>
    </div>
  );
}
