import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import {
  ArrowSquareOut,
  CheckCircle,
  Copy,
  Lock,
  LockOpen,
  Star,
  Warning,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Thumb } from "../../ui/Thumb";
import { STATUS, type AdminTopic } from "./TopicRow";

/**
 * One topic, opened.
 *
 * This is where the console's consequential actions live, and they live here
 * rather than on the row for two reasons. There is room to say what each one
 * does, which matters when one of them takes a topic off the public site. And
 * there is somewhere to put a confirmation that is not a modal over a list.
 *
 * Ownership and capability are both enforced on the server; hiding a control
 * here only spares somebody a refusal they were always going to get.
 */
export function Inspector({
  topic,
  permissions,
}: {
  topic: AdminTopic;
  permissions: string[];
}) {
  const setStatus = useMutation(api.adminTopics.setStatus);
  const setFeatured = useMutation(api.adminTopics.setFeatured);
  const setLocked = useMutation(api.adminTopics.setLocked);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  /* A new selection is a new subject: a half-finished confirmation must never
     carry across to a different topic. */
  useEffect(() => {
    setConfirming(false);
    setError("");
    setCopied(false);
  }, [topic._id]);

  const status = STATUS[topic.status] ?? STATUS.draft!;
  const can = {
    archive: permissions.includes("topics:archive") && topic.mine,
    feature: permissions.includes("topics:feature") && topic.mine,
    lock: permissions.includes("topics:lock") && topic.mine,
    publish: permissions.includes("topics:publish") && topic.mine,
  };
  const id = topic._id as Id<"topics">;
  const link = `${window.location.origin}/t/${topic.slug}`;

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("rise p-4", busy && "pointer-events-none opacity-60")}>
      <Thumb
        src={topic.imageUrl}
        alt=""
        rounded="rounded-[var(--r-card)]"
        fit="object-contain"
        fill
        className="aspect-[16/10] w-full border-2 border-line-2"
      />

      <p className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-[5px] px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.06em] uppercase",
            status.chip,
          )}
        >
          {status.label}
        </span>
        {topic.isFeatured ? (
          <span className="chip !bg-coin-fill/15 !text-coin">
            <Star weight="fill" className="size-3" /> Featured
          </span>
        ) : null}
        {topic.isLocked ? (
          <span className="chip">
            <Lock weight="fill" className="size-3" /> Frozen
          </span>
        ) : null}
        {topic.isSensitive ? (
          <span className="chip !bg-streak-fill/15 !text-streak">
            <Warning weight="fill" className="size-3" /> Sensitive
          </span>
        ) : null}
      </p>

      <h3 className="display mt-2.5 text-[clamp(1.05rem,1.3vw,1.35rem)] text-balance">
        {topic.question}
      </h3>

      <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
        <Fact label="Category">
          <span className="capitalize">{topic.categorySlug}</span>
        </Fact>
        {topic.scopeCountry ? (
          <Fact label="Country">
            <Flag code={topic.scopeCountry} withCode />
          </Fact>
        ) : null}
        <Fact label="Posted">
          <span className="num">
            {new Date(topic.postedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </Fact>
        {topic.wikipediaTitle ? (
          <Fact label="Picture">
            <span className="truncate">{topic.wikipediaTitle}</span>
          </Fact>
        ) : null}
        <Fact label="Slug">
          <span className="num truncate">/{topic.slug}</span>
        </Fact>
      </dl>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <Figure label="Votes" value={topic.votes} />
        <Figure label="Comments" value={topic.comments} />
      </div>

      {error ? (
        <p className="slide-up mt-3.5 flex items-start gap-2 rounded-[var(--r-sm)] border border-love-fill/40 bg-love-fill/12 px-3 py-2 text-[12.5px] font-semibold text-love">
          <Warning weight="fill" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-line pt-4">
        {/* The queue's whole purpose, one press, no confirmation: publishing is
            reversible and the alternative is a moderator who does not bother. */}
        {can.publish && topic.status === "draft" ? (
          <Button variant="go" block onClick={() => void run(() => setStatus({ topicId: id, status: "active" }))}>
            <CheckCircle weight="fill" className="size-4" /> Publish to the feed
          </Button>
        ) : null}

        {can.archive && topic.status === "archived" ? (
          <Button variant="steel" block onClick={() => void run(() => setStatus({ topicId: id, status: "active" }))}>
            Put it back in the feed
          </Button>
        ) : null}

        {/* Archiving is the one action here that changes what the public sees,
            so it is the one that asks. */}
        {can.archive && topic.status !== "archived" ? (
          confirming ? (
            <div className="slide-up rounded-[var(--r-btn)] border-2 border-love-fill/50 bg-love-fill/[0.07] p-3">
              <p className="text-[12.5px] leading-snug font-semibold text-love">
                Take it down? It leaves every feed and every board at once. The
                votes, the comments and the record all survive.
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button
                  variant="love"
                  size="sm"
                  onClick={() => {
                    setConfirming(false);
                    void run(() => setStatus({ topicId: id, status: "archived" }));
                  }}
                >
                  Archive it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="steel" block onClick={() => setConfirming(true)}>
              Archive
            </Button>
          )
        ) : null}

        <div className="flex gap-2">
          {can.feature && topic.status === "active" ? (
            <Button
              variant={topic.isFeatured ? "coin" : "steel"}
              size="sm"
              className="flex-1"
              title="Only one topic is featured at a time"
              onClick={() => void run(() => setFeatured({ topicId: id, featured: !topic.isFeatured }))}
            >
              <Star weight={topic.isFeatured ? "fill" : "regular"} className="size-4" />
              {topic.isFeatured ? "Featured" : "Feature"}
            </Button>
          ) : null}
          {can.lock ? (
            <Button
              variant="steel"
              size="sm"
              className="flex-1"
              title={topic.isLocked ? "Let people vote again" : "Freeze voting and commenting"}
              onClick={() => void run(() => setLocked({ topicId: id, locked: !topic.isLocked }))}
            >
              {topic.isLocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
              {topic.isLocked ? "Unfreeze" : "Freeze"}
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" size="sm" asChild className="flex-1">
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ArrowSquareOut className="size-4" /> Open on the site
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => {
              void navigator.clipboard?.writeText(link);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
          >
            <Copy className="size-4" /> {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        {!topic.mine ? (
          <p className="pt-1 text-[11.5px] leading-snug text-mute">
            You can read this one but not change it — creators act only on what
            they wrote.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[11px] font-extrabold tracking-[0.06em] text-mute uppercase">
        {label}
      </dt>
      <dd className="min-w-0 font-semibold text-ink-2">{children}</dd>
    </>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-[var(--r-btn)] bg-surface-2 px-3 py-2">
      <span className="display num block text-[20px]">{fmtInt(value)}</span>
      <span className="label text-[11px]">{label}</span>
    </span>
  );
}
