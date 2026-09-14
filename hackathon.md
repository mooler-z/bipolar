# Hackathon log

- **Project:** bi-polar
- **Event:** Convex All Gas Hackathon
- **What it does:** Vote LOVE or HATE on polarizing topics, and see what the people who paid to be counted actually think.
- **Live app:** not deployed
- **Repo:** none
- **Frontend:** Vite + React 19, served from this deployment in development
- **Convex deployment:** `vivid-greyhound-473` (dev)
- **Sponsor tools:** OpenAI, Firecrawl, AgentMail
- **Other integrations:** none
- **Components:** `@convex-dev/rate-limiter`, `@convex-dev/better-auth`, `@convex-dev/static-hosting`, `@convex-dev/workpool`
- **Convex features:** schema + indexes, reactive queries, mutations, actions, HTTP actions, crons, scheduled functions, components
- **Auth:** Better Auth (Google, plus password for demo accounts) — deployed, not yet exercised through a UI
- **AI models:** OpenAI `gpt-5-mini`
- **Installable:** no
- **Started:** 13 September 2026
- **Last updated:** 13 September 2026

## Log

### 13 September 2026 — the backend, and topics that write themselves

The whole product except its face. A Convex deployment, a schema of 22 tables, and the
loop that fills the feed without anybody typing a question into it.

**Topics are discovered, not authored.** Every six hours a cron asks Firecrawl what the
web is arguing about this week, and hands one story to OpenAI, which drafts a question a
stranger can answer with LOVE or HATE. A draft scoring under 55 out of 100 for how evenly
a room would split is dropped — a story everyone agrees about is news, not a topic — and
so is any question opening with *which*, *top* or *best*, because those promise an answer
the two buttons cannot give. Every URL is remembered whether or not it became a topic, so
the same story is never minted twice and a rejected one is never paid for again. Two live
runs so far: 8 found / 2 minted, then 8 found / 3 minted.
`convex/ingest.ts`, `convex/ingestStore.ts`, `convex/lib/firecrawl.ts`,
`convex/lib/openai.ts`, `convex/crons.ts`.

**The vote is one transaction.** The rule of the product — one free and one paid vote per
person per topic — was a Postgres unique constraint and is now an index read inside a
mutation, because Convex has no unique index. The vote, the wallet decrement, the ledger
row and both sets of counters commit together or not at all. `convex/votes.ts`.

**The result stays hidden until you have earned it.** A reader who has neither voted nor
paid 50¢ to peek gets `stats: null` in the payload, not a field hidden in the markup. The
per-country data ships as a lean — the combined love share and a coarse sample size —
because the four raw counters per country would sum to exactly the number the gate is
protecting. `convex/stats.ts`, `convex/topics.ts`.

**Mail that arrives on its own.** AgentMail carries the welcome, which tells a new account
about the credit it starts with, and a daily note naming the three topics with the most
money staked. Both claim a row under a dedupe key before sending, so a cron that fires
twice mails once. `convex/notify.ts`, `convex/lib/agentmail.ts`.

**Addresses a machine can read.** HTTP routes are registered ahead of the static site, so
`/t/<slug>`, `/robots.txt` and `/sitemap.xml` answer with real markup built from live
counters rather than an empty shell. The same routing is how a voter's country is stamped
from `cf-ipcountry` — the only path that sets it, because a country in a mutation argument
is a country the client chose. `convex/http.ts`, `convex/seo.ts`.

**Every knob in one file.** Prices, pack catalogue, model, endpoints, prompts, cadence and
limits are all in `convex/config.ts`; no secret is in the repository, and an unset key
makes one feature quiet rather than taking the app down.

**23 tests**, in `convex/votes.test.ts`, `convex/gate.test.ts` and
`convex/pipeline.test.ts`: the uniqueness rule under concurrent casts, a paid vote writing
nothing at all when the wallet is a cent short, counters matching a recount after a burst,
the aggregate absent from the payload for a reader who has not earned it, discovery
refusing to mint a story twice, and the digest refusing to mail the same person twice in a
day. The uniqueness check and the gate were each removed and watched going red — 3 and 5
failures respectively — before being restored.

### 13 September 2026 — a face, and an argument

The backend got a front end.

**One topic at a time, not a list.** The question fills the screen and under it sits the
arena: a single slanted block split by a diagonal, LOVE crimson on the left, HATE indigo
on the right, each with a ghosted watermark behind it. Hovering a side slides the seam
towards it, so the block argues back before a vote is cast; choosing floods the winning
colour across the whole thing and the result opens underneath. A spark switch beside it
turns the frame gold and the icons glow, because a control that spends money must never
look like the one that does not. `src/components/Arena.tsx`, `Ballot.tsx`, `Result.tsx`,
`src/views/Home.tsx`.

**Live comments, one quill each.** A Convex query is a subscription, so a comment posted
in one browser is on every other open screen the moment the mutation commits — no socket,
no polling, no cache to invalidate, and nothing in the React component aware that any of
it is happening. The quill is spent in the same mutation as the insert, so a comment
cannot exist that nobody paid for. Removal is soft: the words go, the row stays, the quill
is not refunded and the count does not move — the count is of what was said here, and a
removal does not unsay it. A moderator removing somebody else's words lands an audit row
in the same transaction. `convex/comments.ts`, `src/components/Comments.tsx`.

**Boards, and a live rail that does not leak.** Hottest topics by money staked; top
backers by the *number of topics backed* rather than by spend, so the board rewards being
a regular instead of being rich. The live rail shows votes as they land — the topic, the
country, whether money was behind it — and withholds which way each one went from any
reader who has not already earned that topic's result. A feed that announced the side
would hand over the gated aggregate one row at a time to somebody who had paid nothing.
`convex/leaderboards.ts`, `src/components/Rails.tsx`.

**The theme is the original's:** OKLCH tokens in light and dark, every corner flattened to
zero app-wide, Inter and Source Serif 4, questions set in heavy serif italic. Three columns
above `lg`; below it the boards and the argument stack under the arena rather than
disappearing, because a feature that only exists on a desktop is one half the audience
never gets. Every interactive element in the application comes from three files in
`src/ui/` — `Button`, `Field`, `TextArea` — and nothing else writes one.

**Two schema fields were added to tables that already held rows** — a per-user count of
topics backed, and a per-topic comment count — each landed the only way that works on a
live table: optional, backfilled from the rows themselves, then made required.
`convex/migrate.ts`.

**32 tests**, up from 23. The new ones cover the quill spend, the soft delete surviving a
removal, a moderator's removal being audited, the top-backers counter matching a recount,
and the live rail withholding the side. Each was watched failing first — the spend removed,
the soft delete turned into a real delete, the withholding taken out — and then restored.

### 13 September 2026 — packs, free and honest about it

Wallets can be topped up. `wallet.claimPack` credits a pack from the server-side
catalogue, and **no card is charged** — there is no payment processor behind this build
and the screen says so before anything is claimed.

What that changes is one step and nothing else. The catalogue, its prices in cents, the
wallet, the 50&cent; spark, the peek, the ledger and every refusal are real: drain a wallet
and the next paid vote is refused exactly as it would be for somebody who had paid. The
prices shown are what a pack will cost when payments are real and what the wallet is
credited now, so the arithmetic stays true either way.

Three things it gets right while it is still free, because each of them has to survive the
day it is not:

- **The client names a pack, never a price.** The catalogue is a server-side constant and
  the only source of prices. A client that can send a price can send zero.
- **A claim is a `grant`, never a `purchase`.** `purchase` is reserved for cents that
  actually arrived through a processor, and nothing writes one — the ledger never claims
  money that did not exist. Which pack funded a wallet is recorded on the ledger row
  beside it.
- **One claim per account**, enforced the way the vote rule is: the marker is read before
  the write and set in the same transaction as the credit, so two simultaneous claims
  cannot both pay out. Without it the catalogue is an unlimited wallet and the paid vote
  stops meaning anything.

`convex/wallet.ts`, `src/components/PackShelf.tsx`.

**39 tests**, up from 32. The seven new ones cover the credit matching the catalogue, the
ledger recording a grant and never a purchase, the second claim being refused and crediting
nothing, two simultaneous claims racing to one payout, an invented pack id being refused
without leaving a marker, and claimed credit running out like any other. The one-claim rule
and the grant-not-purchase rule were each removed and watched going red — three failures
and one — before being restored.

