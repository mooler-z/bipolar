import { useState } from "react";
import { useMutation } from "convex/react";
import { Envelope, FastForward, Moon, Sun } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { useTheme } from "../../lib/theme";
import { Button } from "../../ui/Button";
import { CountryPicker } from "../../ui/CountryPicker";
import { Label } from "../../ui/Label";

/**
 * What an account can change about itself: where it votes from, whether the
 * daily mail arrives, whether the result is shown, and the theme. Rows down a
 * rule, not four bordered boxes — the section label above them is the frame.
 * Everything but the theme is recorded server-side; this is the switchboard.
 */
export function Settings({
  countryCode,
  digestOptIn,
  skipReveal,
}: {
  countryCode?: string;
  digestOptIn: boolean;
  skipReveal: boolean;
}) {
  const setCountry = useMutation(api.users.setCountry);
  const setDigest = useMutation(api.users.setDigestOptIn);
  const setSkip = useMutation(api.users.setSkipReveal);
  const [error, setError] = useState("");
  const [theme, toggleTheme] = useTheme();

  async function attempt(run: () => Promise<unknown>) {
    setError("");
    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="divide-y divide-line">
      <div className="pb-4">
        <CountryPicker
          label="Voting from"
          value={countryCode}
          onPick={(code) => attempt(() => setCountry({ countryCode: code }))}
        />
        <Label className="mt-1.5 block">Twice a month · every change is recorded</Label>
      </div>

      <Row
        icon={<Envelope className="size-5" />}
        title="Daily hot topics"
        hint="One email, the sharpest questions of the day"
        on={digestOptIn}
        onToggle={() => attempt(() => setDigest({ optIn: !digestOptIn }))}
      />

      <Row
        icon={<FastForward weight="fill" className="size-5" />}
        title="Skip the result"
        hint="Straight to the next question. Undo moves to the foot of it."
        on={skipReveal}
        onToggle={() => attempt(() => setSkip({ skip: !skipReveal }))}
      />

      <div className="flex items-center gap-3 py-3.5">
        {theme === "light" ? (
          <Sun weight="fill" className="size-5 shrink-0 text-coin" />
        ) : (
          <Moon weight="fill" className="size-5 shrink-0 text-mute" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">Theme</span>
          <Label>Remembered on this browser</Label>
        </span>
        <Button variant="steel" size="sm" className="min-w-16" onClick={toggleTheme}>
          {theme === "light" ? "Light" : "Dark"}
        </Button>
      </div>

      {error ? (
        <p className="pt-3 text-[13px] font-semibold text-love">{error}</p>
      ) : null}
    </div>
  );
}

/** A switch row: what it is, what it does, on or off. */
function Row({
  icon,
  title,
  hint,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className={cn("shrink-0", on ? "text-go" : "text-mute")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">{title}</span>
        <Label>{hint}</Label>
      </span>
      <Button
        role="switch"
        aria-checked={on}
        variant={on ? "go" : "steel"}
        size="sm"
        className={cn("min-w-16", !on && "text-mute")}
        onClick={onToggle}
      >
        {on ? "On" : "Off"}
      </Button>
    </div>
  );
}
