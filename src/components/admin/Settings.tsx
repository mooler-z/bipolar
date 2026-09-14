import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { SlidersHorizontal, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { ModeSwitch } from "./ModeSwitch";
import { Setting } from "./SettingRow";

/* The groups in the product's colours: the crawler is blue, quality is
   violet, mail is yellow. The same three the overview uses. */
const TONE: Record<string, string> = {
  Discovery: "text-hate",
  Quality: "text-go",
  Mail: "text-coin",
};
import { Aside, Empty, Work } from "./panes";

/**
 * The settings page: what the crawler is allowed to do, without a deploy.
 *
 * Every number here also exists in `config.ts`, and that value is the
 * **fallback** rather than the old value — clearing a setting puts it back to
 * what the repository says, so a deployment nobody has touched behaves exactly
 * like the code. The page says what the default is on every row, because a
 * console that lets you change a number without telling you what it was is a
 * console you cannot undo.
 *
 * **Money is not here, and that is deliberate.** Pack prices and the cost of a
 * spark are server-side constants. A wallet that can be repriced from a web
 * page is a wallet with a second source of truth.
 */
export function Settings({ permissions }: { permissions: string[] }) {
  const rows = useQuery(api.tunables.list);
  const save = useMutation(api.tunables.set);
  const reset = useMutation(api.tunables.reset);

  /** Only the rows somebody has actually typed into. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  async function commit(key: string, value: number) {
    setBusy(key);
    setError("");
    try {
      await save({ key, value });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      setSaved(key);
      window.setTimeout(() => setSaved((k) => (k === key ? null : k)), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function restore(key: string) {
    setBusy(key);
    setError("");
    try {
      await reset({ key });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const groups = [...new Set((rows ?? []).map((r) => r.group))];

  return (
    <>
      <Work>
        {error ? (
          <p className="slide-up mb-3 flex items-center gap-2 rounded-[var(--r-sm)] border border-love-fill/40 bg-love-fill/12 px-3.5 py-2.5 text-[13px] font-semibold text-love">
            <Warning weight="fill" className="size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        {rows === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="shimmer block h-20 rounded-[var(--r-card)]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty title="Nothing to configure." />
        ) : (
          groups.map((group, g) => (
            <section key={group} className={cn("rise mb-8", g > 0 && "")}>
              <div className="mb-1 flex items-center gap-3 border-b-2 border-line-2 pb-2">
                <h2
                  className={cn(
                    "text-[11px] font-extrabold tracking-[0.12em] uppercase",
                    TONE[group] ?? "text-ink-3",
                  )}
                >
                  {group}
                </h2>
                <span className="flex-1" />
                {group === "Discovery" ? (
                  <ModeSwitch permissions={permissions} compact />
                ) : null}
              </div>

              {group === "Discovery" ? (
                <p className="border-b border-line py-3 text-[12.5px] leading-relaxed text-mute">
                  <strong className="text-ink-2">Auto</strong> puts new questions
                  straight into the feed. <strong className="text-ink-2">Review</strong>{" "}
                  holds them as drafts until somebody says yes.
                </p>
              ) : null}

              <div>
                {rows
                  .filter((r) => r.group === group)
                  .map((row, i) => (
                    <Setting
                      key={row.key}
                      row={row}
                      index={i}
                      draft={drafts[row.key]}
                      busy={busy === row.key}
                      saved={saved === row.key}
                      onDraft={(text) =>
                        setDrafts((d) => ({ ...d, [row.key]: text }))
                      }
                      onCancel={() =>
                        setDrafts((d) => {
                          const next = { ...d };
                          delete next[row.key];
                          return next;
                        })
                      }
                      onSave={(value) => void commit(row.key, value)}
                      onReset={() => void restore(row.key)}
                    />
                  ))}
              </div>
            </section>
          ))
        )}
      </Work>

      <Aside
        title="How this works"
        icon={<SlidersHorizontal weight="fill" className="size-4 text-mute" />}
      >
        <div className="space-y-3 p-4 text-[13px] leading-relaxed text-ink-3">
          <p>
            Every setting here also exists in the repository. What is stored is
            an <strong className="text-ink">override</strong>, so resetting one
            forgets it rather than writing the old number back.
          </p>
          <p>
            <strong className="text-ink">The cadence takes effect on the next
            tick.</strong> A cron cannot read a setting, so the crawler wakes
            hourly and asks whether a session is due. Changing sessions a day
            from six to twelve is felt within the hour, not on the next deploy.
          </p>
          <p>
            Each change writes a line in the record naming the setting, what it
            was and what it became. A crawler budget that could change silently
            is one nobody can account for afterwards.
          </p>
          <p className="!mt-4 border-t border-line pt-3 text-[12px] text-mute">
            Prices are not here. The pack catalogue and the cost of a spark are
            server-side constants, and a wallet that can be repriced from a web
            page is a wallet with two sources of truth.
          </p>
        </div>
      </Aside>
    </>
  );
}
