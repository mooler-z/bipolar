import { ArrowCounterClockwise, Check } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";

/**
 * One setting: what it is, what it is set to, and where that sits.
 *
 * The value is the biggest thing on the row, in the product's display type,
 * because it is the thing being decided. Under it a track shows where the
 * number sits between its bounds, with a notch at the repository's value — so
 * "twice the default" is a glance rather than a mental division.
 *
 * Saving is explicit. A field that writes on every keystroke would put "1"
 * into the crawler's budget on the way to typing "12".
 */

export type Row = {
  key: string;
  label: string;
  help: string;
  unit: string | null;
  min: number;
  max: number;
  fallback: number;
  value: number;
  isDefault: boolean;
};

export function Setting({
  row,
  index,
  draft,
  busy,
  saved,
  onDraft,
  onCancel,
  onSave,
  onReset,
}: {
  row: Row;
  index: number;
  draft?: string;
  busy: boolean;
  saved: boolean;
  onDraft: (text: string) => void;
  onCancel: () => void;
  onSave: (value: number) => void;
  onReset: () => void;
}) {
  const text = draft ?? String(row.value);
  const parsed = Number(text);
  const valid = Number.isFinite(parsed) && text.trim() !== "";
  const dirty = valid && parsed !== row.value;
  const shown = valid ? parsed : row.value;

  const span = Math.max(1, row.max - row.min);
  const at = (n: number) => `${Math.round(((n - row.min) / span) * 100)}%`;
  /* The one derived line worth showing: a rate is easier to judge as a gap. */
  const gap =
    row.key === "discovery.runsPerDay" && shown > 0
      ? `about every ${Math.round((24 / shown) * 10) / 10} hours`
      : null;

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={cn(
        "stagger grid gap-x-6 gap-y-3 border-b border-line py-4 md:grid-cols-[minmax(0,1fr)_16rem]",
        busy && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-extrabold tracking-[-0.01em]">{row.label}</p>
        <p className="mt-1 max-w-[52ch] text-[12.5px] leading-relaxed text-mute">{row.help}</p>
        {gap ? (
          <p className="num mt-1.5 text-[12px] font-bold text-ink-3">{gap}</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-end gap-2.5">
          <span
            className={cn(
              "display num text-[2rem] leading-none",
              dirty ? "text-coin" : row.isDefault ? "text-ink" : "text-go",
            )}
          >
            {fmtInt(shown)}
          </span>
          {row.unit ? (
            <span className="pb-1 text-[12px] font-bold text-mute">{row.unit}</span>
          ) : null}
          <span className="flex-1" />
          <span className="w-20">
            <Field
              bare
              label={row.label}
              type="number"
              inputMode="numeric"
              min={row.min}
              max={row.max}
              value={text}
              disabled={busy}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dirty) onSave(parsed);
                if (e.key === "Escape") onCancel();
              }}
              className="num h-9 rounded-[var(--r-sm)] border border-line-2 !bg-surface-2 px-2 text-center text-[13px] font-bold focus-visible:border-hate-fill"
            />
          </span>
        </div>

        {/* Where the number sits. The notch is the repository's value. */}
        <div className="relative mt-2.5">
          <span className="bar block h-1.5">
            <span
              className={cn("bar-fill", dirty ? "!bg-coin-fill" : row.isDefault ? "!bg-surface-4" : "")}
              style={{ width: at(Math.min(row.max, Math.max(row.min, shown))) }}
            />
          </span>
          <span
            aria-hidden
            title={`Default ${row.fallback}`}
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-ink-3"
            style={{ left: at(row.fallback) }}
          />
        </div>
        <div className="num mt-1 flex justify-between text-[10.5px] font-bold text-mute">
          <span>{fmtInt(row.min)}</span>
          <span>default {fmtInt(row.fallback)}</span>
          <span>{fmtInt(row.max)}</span>
        </div>

        <div className="mt-2 flex min-h-8 items-center justify-end gap-2">
          {saved ? (
            <span className="pop-in flex items-center gap-1 text-[11.5px] font-extrabold text-go">
              <Check weight="bold" className="size-3.5" /> Saved
            </span>
          ) : null}
          {!row.isDefault && !dirty ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onReset}
              title={`Back to ${row.fallback}, the value in the repository`}
            >
              <ArrowCounterClockwise className="size-3.5" /> Reset
            </Button>
          ) : null}
          {dirty ? (
            <>
              <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="go" size="sm" disabled={busy} onClick={() => onSave(parsed)}>
                Save
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
