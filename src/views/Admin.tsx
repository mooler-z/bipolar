import { useQuery } from "convex/react";
import { Prohibit, ShieldCheck } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { Dashboard } from "../components/admin/Dashboard";
import { Topics } from "../components/admin/Topics";
import { Shell } from "../components/admin/Shell";
import { NAV, sectionOf } from "../lib/admin-nav";
import { signOut } from "../lib/auth-client";
import { Button } from "../ui/Button";

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

  const section = sectionOf(path);
  const title = NAV.find((n) => n.id === section)?.label ?? "Dashboard";

  return (
    <Shell
      identity={identity}
      section={section}
      title={title}
      onGo={onGo}
      onSignOut={() => void signOut()}
    >
      {section === "" ? <Dashboard onGo={onGo} /> : null}
      {section === "topics" ? (
        <Topics
          permissions={identity.permissions}
          onOpen={(slug) => onGo(`/t/${slug}`)}
        />
      ) : null}
    </Shell>
  );
}

function Door({ onGo }: { onGo: (path: string) => void }) {
  return (
    <div className="grid h-[100dvh] place-items-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-2 text-mute">
          <Prohibit className="size-6" />
        </span>
        <h1 className="display mt-5 text-[clamp(1.5rem,3vw,2rem)]">
          Staff only.
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-mute">
          This console is for the people who run bi-polar. If that should be
          you, someone with the keys has to say so.
        </p>
        <p className="mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-mute" />
          <span className="text-[11.5px] tracking-wide text-mute uppercase">
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
