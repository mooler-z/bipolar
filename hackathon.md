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
- **Last updated:** 14 September 2026

## Log

### 14 September 2026 — a hundred arguments with faces on them

Discovery mints a trickle from the live web, which is the right long-run source and a poor
way to fill a feed for a demo. So a written batch went in through exactly the same door: a
hundred and four named subjects — Vegemite, the offside replay, compulsory voting, the
Grand Ethiopian Renaissance Dam, Bhutan's tourist levy — across every category the product
has and fifty countries. Each one names a Wikipedia article, and a lookup turns that into
the picture the topic arrives with.

**No shortcut for arriving from a file.** The batch runs through `importTopics.batch`, so
every rule the model is held to runs against it too: length, ends in a question mark, never
opens with a word that promises a list, never restates the buttons, and a known category.
Nothing was rejected, and ten were skipped as slugs discovery had already minted.

**Some subjects have no photograph.** A policy, a doctrine or a legal test has an article
and no lead image, and retrying cannot conjure one. `images.retitle` points those at
something concrete the subject is *about* — the bank rather than the rate, the singer rather
than the genre, the court rather than the ruling. That took the illustrated share of the
batch from three quarters to all but one.

`convex/seedWorldTopics.ts`, `convex/importTopics.ts`, `convex/images.ts`.

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

### 14 September 2026 — the face, redrawn

Every user-facing screen was redesigned. The shape stayed — three columns that fill the
window, a live rail, the argument, the boards — and everything inside it was redrawn.

**The arena is two cards.** LOVE and HATE side by side, alive at rest: the icons beat and
twitch every few seconds, and the card under the cursor tilts toward it in 3D while the
other shrinks out of the way. Pressing punches the card and its colour takes the whole
board in a third of a second; the result opens in the same frame. The keyboard plays the
same motion — `L`/`H` answer, `space` arms, `S` skips, `N` moves on, `esc` puts a pulled
topic back. `src/components/Arena.tsx`, `src/lib/keys.ts`.

**Money goes on the record visibly.** The stake is a physical switch whose knob nudges
toward "on" as the cursor arrives; arming it puts a gold rim and a price sticker on both
cards, so a vote that spends never looks like one that does not.
`src/components/SparkSwitch.tsx`.

**The result detonates.** The winning colour floods a panel the width of the column, the
percentage rolls up past its value and settles, and the verdict stamps down a beat later.
The two layers — the Crowd and the Committed — grow from zero as two bars that are never
merged, then the world: the headline sentence, the map, the board. A countdown carries the
run to the next question; it pauses on hover, while a comment is being written and when the
tab is hidden, and it can be stopped. `src/components/reveal/`, `src/components/Reveal.tsx`,
`src/components/AutoAdvance.tsx`.

**The run has a record.** The left rail carries four tiles — streak, accuracy, sparks,
rank — and the queue, whose rows can be pulled ahead of their turn. When the queue empties
the run ends on a wrap-up: answered, love, hate, backed, calls read right, streak, and a
sentence to share. `src/components/run/`, `src/views/home/CaughtUp.tsx`.

**The room, redrawn.** Live votes as tickets that fill from the top down, the newest at the
foot and lit for five seconds as it lands before the light dissolves, under a pulse strip —
how many votes and comments landed in the last ten minutes — with the current topic marked;
the argument as a chat with the composer at the foot; the boards as podiums, with a flag
beside every reader and backer. `src/components/room/`, `src/components/comments/`.

**A topic's own page is the same console.** The public country lean and the sources on the
left, the decision or the result in the middle, the room on the right — a pasted link opens
into the product rather than into a flatter page of it. `src/views/TopicPage.tsx`,
`src/views/topic/WorldRail.tsx`.

**Every control answers the hand.** The canonical `Button` lifts on hover with a band of
light across it, cocks on press and springs back past centre with a ring of its own colour.
`src/ui/Button.tsx`, `src/motion.css`.

**Light and dark.** A theme toggle in the top bar and in Settings; the choice is remembered
and applied before the first paint. `src/lib/theme.ts`, `src/index.css`.

**The mark.** The logo — a heart, half love-red and half hate-blue — is the wordmark on every
page and the browser-tab icon, in five sizes. `public/`, `src/ui/Wordmark.tsx`, `index.html`.

**A phone gets a deck, not a stack.** Below 1280px the same three panels become one screen
each, snapped: the question owns the viewport, a swipe lands squarely on the room, another on
the run, and a swipe down comes back. The picture becomes a full-bleed band above the
headline, the bar is cut to the mark, the wallet and you, and the thread says which question
it belongs to. `src/components/mobile/Deck.tsx`, `src/components/Decide.tsx`.

**Installable.** A manifest, six icons and a service worker that caches the shell and the
build assets and touches nothing else — every query, every sign-in and every vote goes to the
backend over its own origin, and a cached answer to any of them would be a bug rather than a
speed-up. `public/manifest.webmanifest`, `public/sw.js`, `src/main.tsx`.

**The palette is six colours at full chroma** on the black ground, and every accent carries
three tokens: the block, the ink, and what is written across the block. The block is the same
on both themes; only the ink darkens for the light one, because dimming a slab of colour for
paper is what makes an interface look switched off. `src/index.css`.

**A vote can be taken back, and the countdown is the window.** Pressing an answer opens the
call, which carries an Undo that costs nothing because nothing has been sent yet. Once the
vote is cast, the reveal's countdown to the next question doubles as the last chance to pull
it: `convex/retract.ts` takes the vote, both sets of counters, the call and the spark back
out in one transaction, and the moment the countdown ends the vote is final. It pauses on a
hover and while a comment is being written, so the window lasts exactly as long as the
reader is still thinking about it, with a five-minute server-side backstop behind it.

Two things deliberately do not reverse. The ledger stays append-only — the spend row is
never touched and a refund row is written beside it — and every retraction lands an audit
row naming the voter, the topic and the side, in the same transaction. A vote that could
vanish without trace would be worse than one that could not vanish at all.

**Undoing is the vote, played backwards.** Casting expands the chosen card until its colour
is the whole board. So a retracted card comes back *still holding it* and gives the width up
while the other grows in beside it, with the undo arrow spinning counter-clockwise where its
icon was. It takes 670ms against the takeover's 340, because going forward should feel
decisive and coming back should feel like letting go — and should last long enough to watch. Nothing else announces it — the
reversal is the announcement. `src/components/Arena.tsx`.

Because a call is graded against a snapshot, `calls` now records the streak it overwrote: a
streak cannot be derived backwards, since a wrong call sets it to zero and zero remembers
nothing. `U` or the left arrow takes a vote back at either stage.

**The run goes backwards as well as forwards.** The left arrow steps to whatever you last
left: a skipped question returns to be answered, an answered one returns as its result,
which costs nothing to re-read because its aggregate is already unlocked. On the result it
is an orange button beside the violet Next. Neither rewrites anything — the skip stays
recorded and the vote stays cast, because the server wrote both and the ranker has already
learned from them. What comes back is the screen, not the history.

**The keyboard split in two.** Letters answer — `L` loves, `H` hates, `space` stakes a
spark, `U` undoes — and arrows move: right goes forward, skipping the question or taking
the next one, left goes back. They used to vote, which put "forward" and "love" on the same
key. `src/lib/keys.ts`.

**Weather behind the question.** Five soft fields of red and paper drift under the question on
long loops, blurred to nothing, with a grain plate over them and one field easing toward the
cursor. It is the only gradient in the product and it never carries type or a hit area.
`src/components/Backdrop.tsx`.

**Sign-in, account and onboarding fill the window.** The sign-in page carries the real
arena with nothing under it; the profile is a grid of the identity card, the packs, settings
and the ledger; onboarding is two panels rather than a column. `src/views/account/`,
`src/views/Welcome.tsx`, `src/views/welcome/`.

**A gated press opens the door instead of refusing.** Voting, staking a spark, paying to
peek and writing a comment all used to answer a signed-out reader with a sentence telling
them to sign in — a dead end reached after they had already said what they wanted. Each one
now carries them to the sign-in page with the address they were on remembered, and the
moment the session lands they are put back on it, mid-question. The return replaces the
door in history rather than stacking on it, so the back button still leads out; the
remembered address must begin with a single slash, so the page cannot be used to bounce
anyone off-site. Google survives the round trip because the callback is this page's own
absolute address rather than the one origin the deployment was configured with.
`src/lib/nav.ts`.

**Sparks come back when they run out.** A pack was one per account, which meant an account
that spent its last spark had no way back into the paid layer — a dead end dressed up as a
rule. A pack now returns once the balance it carries has run dry: spend every spark and the
catalogue opens again, up to three times a day. The two currencies are asked about
separately, so being out of quills does not refill the sparks and being out of sparks does
not hand over free quills. Every reclaim is a `grant` beside the last one, never a purchase,
and the ledger keeps all of them. What stops it being an unlimited wallet is the pair of
guards: the emptiness test, read before the write the way the vote rule is, and the daily
ceiling. `convex/wallet.ts`, `convex/reclaim.test.ts`.

**The question stops changing under the reader.** The feed is a live ranked subscription and
every move rewrites its own inputs — a skip writes a row the ranker reads, a vote writes
taste and the counters — so the list re-ordered about a round trip after the run moved on,
and the card that had just appeared was silently replaced by a different question. The next
question is now chosen at the moment of the press and pinned: the re-rank still decides what
comes after, but it can no longer reach the card already on screen. A row clicked in a rail
registers on the press rather than waiting for the reveal to finish, and the column holds
the question it was showing, under a loader, until the pulled card lands.
`src/views/home/useRun.ts`.

**The staff console is three columns too.** It was a rail and a page; it is now the public
console's own shape turned to a different job — where you are, the work, and what one row of
it actually is. Opening a topic no longer leaves the console: it fills the third column,
where every action on it lives with room to say what it does, and a moderator who was eighty
rows into a filtered list is still eighty rows into it afterwards. The rows gave up their
five buttons each and became scannable instead — the status is a colour on the left edge
before it is a word, and the counts are tabular so a long list reads as two columns of
numbers. Arrow keys walk the list, escape closes the panel. `src/components/admin/`.

**The record.** Rule 8 has always made every privileged write land in an append-only table
inside the same transaction as the thing it describes. It is now a screen, in plain words
rather than event names: who did it, what they did, and when. It is its own section for
admins and it is also what the console's third column shows whenever nothing is selected, so
"every action here is recorded" is something a person can check rather than something they
are told. Reading it is the one capability a moderator does not inherit — the record is what
a moderator is accountable to. `convex/auditLog.ts`.

**The review queue is real.** Discovery's drafts had a dimmed nav entry and no screen. The
queue is the topic list with its status pinned, so there are not two lists and two sets of
actions drifting apart, and the rail carries the count of what is waiting — the only badge in
the console, because a console that badges everything teaches people to ignore badges.

**The picture stands beside the question on a phone.** A full-bleed band above the headline
cost a third of the screen and pushed the question down into the arena. It now sits to the
left of the words at both sizes, and the headline steps down a size on a phone rather than
wrapping every second word. `src/components/Decide.tsx`.

**122 tests.** Six cover the retraction: the spark returned and the counters left exactly as they were found, the country counters with them, a retracted vote recast the other way, the streak restored from its snapshot, the window closing, and one voter unable to take back another's vote. Five more cover reclaiming: an emptied wallet taking another pack with both grants left in the ledger, a wallet one spark above empty refused, the two currencies emptying independently, the daily ceiling, and the ceiling lifting the next day. Three more cover the record: a moderator refused, an admin served, and the rows bounded and newest-first.
