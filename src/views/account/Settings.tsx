import { useState } from "react";
import { useMutation } from "convex/react";
import { Envelope, GlobeHemisphereWest, Moon, PencilSimple, Sun } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { useTheme } from "../../lib/theme";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Flag } from "../../ui/Flag";
import { Label } from "../../ui/Label";
import { Panel } from "../../ui/Panel";

/**
 * The two things an account can change about itself: where it votes from,
 * and whether the daily mail arrives. Both are recorded server-side; this is
 * only the switchboard.
 */
export function Settings({
  countryCode,
  digestOptIn,
}: {
  countryCode?: string;
  digestOptIn: boolean;
}) {
  const setCountry = useMutation(api.users.setCountry);
  const setDigest = useMutation(api.users.setDigestOptIn);
  const [country, setCountryText] = useState("");
  const [error, setError] = useState("");
  const [theme, toggleTheme] = useTheme();

  async function attempt(run: () => Promise<unknown>) {
    setError("");
    try {
      await run();
      setCountryText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Panel title="Settings" icon={<PencilSimple className="size-4 text-mute" />}>
      <div className="flex items-center gap-2.5">
        <GlobeHemisphereWest className="size-5 shrink-0 text-mute" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">Voting from</span>
          <Label>Twice a month · every change is recorded</Label>
        </span>
        {countryCode ? <Flag code={countryCode} withCode /> : null}
      </div>
      <div className="mt-3 flex items-end gap-2.5">
        <span className="flex-1">
          <Field
            label="ISO country code"
            value={country}
            maxLength={2}
            placeholder={countryCode ?? "US"}
            onChange={(e) => setCountryText(e.target.value.toUpperCase())}
            className="num uppercase"
          />
        </span>
        <Button
          variant={country.length === 2 ? "go" : "steel"}
          disabled={country.length !== 2}
          onClick={() => attempt(() => setCountry({ countryCode: country }))}
        >
          Set
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[var(--r-btn)] border border-line bg-surface-2 p-3">
        <Envelope className="size-5 shrink-0 text-mute" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">Daily hot topics</span>
          <Label>One email, the sharpest questions of the day</Label>
        </span>
        <Button
          role="switch"
          aria-checked={digestOptIn}
          variant={digestOptIn ? "go" : "steel"}
          size="sm"
          className={cn("min-w-16", !digestOptIn && "text-mute")}
          onClick={() => attempt(() => setDigest({ optIn: !digestOptIn }))}
        >
          {digestOptIn ? "On" : "Off"}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-[var(--r-btn)] border border-line bg-surface-2 p-3">
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
        <p className="mt-4 rounded-[var(--r-btn)] border border-love-fill/40 bg-love-fill/12 px-3.5 py-2.5 text-sm font-semibold text-love">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
