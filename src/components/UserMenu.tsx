import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Globe,
  Lightning,
  Moon,
  ShieldCheck,
  Sun,
  UserCircle,
} from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { fmtInt } from "../lib/format";
import { navigate } from "../lib/nav";
import { useTheme } from "../lib/theme";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

/**
 * You, and everything that belongs to you, behind one face.
 *
 * The bar used to carry the wallet, the theme, the bell and the avatar as four
 * separate targets, and a phone could not hold them — so the phone dropped
 * three of them and the things they led to became unreachable rather than
 * quiet. They are all here now, on both sizes: one press opens the list, and
 * the list is the same list everywhere, which is the only way somebody learns
 * where anything is.
 *
 * The sparks row is first and drawn as a figure rather than as a link, because
 * it is the one item that is an *amount* — what you have, and the way to more
 * of it in the same row.
 */

function Item({
  icon,
  label,
  hint,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <Button
      bare
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-surface-3"
    >
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-[7px] bg-surface-3", tone)}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-ink">{label}</span>
        {hint ? <span className="block text-[11px] text-mute">{hint}</span> : null}
      </span>
    </Button>
  );
}

export function UserMenu({
  name,
  sparks,
  role,
  unread,
  onAccount,
  onWorld,
}: {
  name: string;
  sparks: number;
  /** Anything but `user` gets the staff console in the list. */
  role: string;
  unread: number;
  onAccount: () => void;
  onWorld: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const box = useRef<HTMLDivElement>(null);

  // Pressing anywhere else is a decision to close it.
  useEffect(() => {
    if (!open) return;
    function away(e: PointerEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  function go(run: () => void) {
    setOpen(false);
    run();
  }

  return (
    <div ref={box} className="relative">
      <Button
        bare
        aria-label="You"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className={cn(
          "lift relative flex min-h-9 items-center gap-2 rounded-[var(--r-pill)] pr-0 pl-0",
          "hover:bg-surface-2 sm:min-h-10 sm:pr-3 sm:pl-1",
          open && "bg-surface-2",
        )}
      >
        <Avatar name={name} />
        {/* The badge the bell used to carry, only where the bell is not. Two
            of the same count in one bar is one of them lying about being new. */}
        {unread > 0 ? (
          <span
            className="num absolute -top-0.5 -right-0.5 grid min-w-[1.05rem] place-items-center rounded-full bg-love-fill px-1 text-[10px] font-extrabold text-on-love sm:hidden"
            aria-label={`${unread} unread`}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
        <span className="hidden text-[13px] font-bold sm:block">
          {(name.split(" ")[0] || "You").slice(0, 12)}
        </span>
      </Button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "slide-up absolute top-[calc(100%+0.4rem)] right-0 z-50 w-[15.5rem]",
            "rounded-[var(--r-card)] border border-line-2 bg-surface-2 p-1.5 shadow-2xl",
          )}
        >
          {/* What you have, and the way to more of it, in one row. */}
          <Button
            bare
            role="menuitem"
            onClick={() => go(onAccount)}
            className="flex w-full items-center gap-3 rounded-[9px] border border-coin-fill/35 bg-coin-fill/10 px-2.5 py-2 text-left transition-colors hover:bg-coin-fill/20"
          >
            <Lightning weight="fill" className="size-5 shrink-0 text-coin" />
            <span className="num display text-[1.35rem] leading-none text-coin">
              {fmtInt(sparks)}
            </span>
            <span className="text-[10.5px] font-extrabold tracking-[0.1em] text-coin/80 uppercase">
              {sparks === 1 ? "spark" : "sparks"}
            </span>
            <span className="flex-1" />
            <span className="flex items-center gap-1 text-[11.5px] font-bold text-mute">
              get more <ArrowRight weight="bold" className="size-3.5" />
            </span>
          </Button>

          <div className="mt-1.5 space-y-0.5">
            <Item
              icon={<Globe weight="fill" className="size-4 text-hate" />}
              label="The world"
              hint="Every country, every board"
              onClick={() => go(onWorld)}
            />
            <Item
              icon={<UserCircle weight="fill" className="size-4 text-ink-3" />}
              label="Your account"
              hint="Wallet, packs and settings"
              onClick={() => go(onAccount)}
            />
            {role !== "user" ? (
              <Item
                icon={<ShieldCheck weight="fill" className="size-4 text-go" />}
                label="Staff console"
                hint={role}
                onClick={() => go(() => navigate("/admin"))}
              />
            ) : null}
            <Item
              icon={
                theme === "light" ? (
                  <Moon weight="fill" className="size-4 text-ink-3" />
                ) : (
                  <Sun weight="fill" className="size-4 text-ink-3" />
                )
              }
              label={theme === "light" ? "Dark theme" : "Light theme"}
              onClick={toggleTheme}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
