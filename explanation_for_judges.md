# How bipolar uses Convex, OpenAI, Firecrawl, Wikipedia and AgentMail

bipolar lets you vote LOVE or HATE on polarizing topics, and see what the
people who paid to be counted actually think.

This document explains, in sequence, what each tool actually does in the
running product — with the file that proves it. Everything described here is
deployed and was exercised before this was written; nothing is planned work.

---

## At a glance

| Tool | What it does here | Files |
|---|---|---|
| **Convex** | The whole backend: data, live queries, the transactions the product's rules live in, scheduling, crons, HTTP routes, auth, rate limits, and the site itself | all of `convex/`, `convex/convex.config.ts` |
| **OpenAI** | Turns a story the crawler found into one LOVE-or-HATE question — with a category, tags, a polarizing score, a sensitivity flag, the country it is about, and the Wikipedia article to take a picture from | `convex/lib/openai.ts`, `convex/ingestSession.ts` |
| **Firecrawl** | Searches the last week of the web for arguments, and reads a page when the headline is too thin to write from | `convex/lib/firecrawl.ts`, `convex/ingestSession.ts` |
| **Wikipedia** | Turns the article the model named into a picture, fifty at a time | `convex/lib/wikipedia.ts`, `convex/images.ts` |
| **AgentMail** | Carries the welcome note and the daily hot-topics mail to people who are not on the page | `convex/notify.ts` |

---

## 1. Convex — the whole backend, not a database

Convex is the runtime the product is built out of. Nothing here polls, and
nothing that matters is enforced only on a screen.

**Reactive queries as the spine.** The live vote rail on the right of the
console, the run on the left, the review queue, the crawler's own progress
feed and the audit record are all subscriptions. When a background action
mints a topic or a session writes a line about what it is doing, every screen
watching it updates. The crawler can be watched happening from the console
because the session writes its story into a table from inside its loop and the
console subscribes to it (`convex/ingestRuns.ts`, `convex/adminQueue.ts`).

**Transactions are where the rules live.** Postgres used to enforce one free
and one paid vote per person per topic with a unique constraint. Convex has no
unique constraint, so the guarantee moved into a mutation that reads the index
before it writes — and into a test that hammers it. The vote write is one
mutation: the vote row, the wallet decrement, the ledger row, the topic
counters and the country counters land together or not at all. The retraction
that undoes a vote reverses every one of them in one transaction, leaves the
spend row alone and writes a refund beside it, because a ledger that deletes is
a ledger nobody can audit (`convex/votes.ts`, `convex/retract.ts`,
`convex/votes.test.ts`).

**The stats gate is enforced in the payload.** A topic's two-layer aggregate —
the crowd's split and the committed's split — is `null` in what leaves the
server until the reader has voted or paid to peek. A number hidden with CSS
has already been delivered to anyone with a network tab, so the gate is in
one function that every query goes through, and a test asserts the *absence*
of the field (`convex/stats.ts`, `convex/gate.test.ts`).

**Scheduled functions and crons, used to keep a schedule editable.** A cron
interval is fixed when the code is deployed, so the crawler's cron ticks
hourly and the session asks whether it is due from a setting an administrator
can change on a page. Pressing the console's button opens the run row first
and *then* schedules the session, so the console has something to watch from
the first millisecond. The daily mail is a cron whose dedupe key carries the
date, so a cron that fires twice mails once (`convex/crons.ts`,
`convex/ingest.ts`, `convex/adminQueue.ts`, `convex/notify.ts`).

**Components.** `@convex-dev/better-auth` for identity, with its cross-domain
plugin so one deployment serves both the development origin and the public
site; `@convex-dev/rate-limiter` for every allowance in the product — votes a
minute, comments an hour, checkouts, and how many times a day an emptied wallet
may take a pack back — consumed inside the same mutation as the write they
guard, so a vote that fails for any other reason hands its token back;
`@convex-dev/static-hosting`, which serves the app at `convex.site`
(`convex/auth.ts`, `convex/limits.ts`, `convex/http.ts`).

**HTTP routes registered ahead of the site.** `/t/<slug>` answers with the
app's own deployed shell — fetched from the hosting component — with the live
Open Graph tags spliced into its head and a readable summary inside the root
element, where React replaces it the moment the bundle boots. One page: a
crawler reads the tags, a person gets the app. `/api/country` is the one path
that sets a voter's country, because only an HTTP action can see the edge's
`cf-ipcountry` header, and a country arriving as a client argument would be a
country the client chose (`convex/seo.ts`, `convex/http.ts`).

**A settings table as overrides.** Eight numbers that used to need a deploy —
crawling sessions a day, questions a session, the polarizing floor, the
sameness threshold, and so on — are stored as overrides and read back through
the code value when nothing is stored. Resetting one forgets it rather than
writing the old number back, every change is clamped on the server and lands
an audit row, and prices are deliberately not among them
(`convex/tunables.ts`, `convex/lib/tunables.ts`).

**One vote, in sequence:**

```
press LOVE or HATE
   → the call: which way will the room go?           [the pending window; nothing sent]
   → api.votes.cast                                   [one Convex mutation]
        ├─ rate limit consumed, transactionally
        ├─ index read: has this person already cast this vote type here?
        ├─ vote row · wallet · ledger · topic counters · country counters
        └─ the call is graded and the streak snapshotted, so it can be undone
   → the reveal, in the same frame the question was in
        └─ api.topics.bySlug now returns the aggregate  [the gate opens for this reader]
   → the countdown is the undo window
        └─ api.retract.vote reverses all of it in one transaction, refund row beside the spend
```

---

## 2. OpenAI — the thing that turns a story into an argument

Firecrawl brings back a headline and a paragraph. Neither is a question, and
neither can be voted on. `gpt-5-mini` is given one tool (`record_topic`) with a
forced tool choice, so it cannot answer in prose — its only possible output is
a topic in the shape the schema wants (`convex/lib/openai.ts`).

```
"Senate passes spending bill after 14-hour session…"
   → chat.completions, tool_choice forced
   → { question, description, category, tags, polarizing, sensitive, country, wikipediaTitle }
   → checked, field by field, before anything is stored
```

**Nothing it returns is stored on trust.** A question under eight characters or
over a hundred is dropped. A question that opens with *which*, *what*, *top*,
*best* or *rank* is dropped — it cannot be answered with LOVE or HATE, and one
on the feed teaches everybody that the buttons sometimes mean nothing. A
question that restates the app's own framing ("do you love or hate…") is
dropped. A category outside the vocabulary becomes *culture*; a country that is
not two letters becomes none; tags are lowercased and capped at three. The
Wikipedia title is asked for **in the same call** that writes the question,
because the model has the story in front of it then, and it is validated the
way the picture pipeline would validate it before being kept.

The model's own `polarizing` score, 0 to 100, is the floor the feed is built
on: a story everybody agrees about is news, not a topic, and it is dropped
below the threshold an administrator sets.

---

## 3. Firecrawl — where topics come from

Nobody writes them. Several times a day a session runs, and it can also be
fired from the console and watched (`convex/ingestSession.ts`).

```
session opens (numbered — "session 47" is a sentence; a document id is not)
 │
 ├─ for each of up to eight queries, rotating by the clock:
 │     → Firecrawl /search, last week only                      [convex/lib/firecrawl.ts]
 │     → every URL checked against the seen ledger; nothing is paid for twice
 │     → for each unseen result:
 │           → headline + snippet under 120 chars?  Firecrawl reads the page
 │           → OpenAI drafts the question
 │           → too dull?          dropped, remembered, counted
 │           → already asked?     dropped, remembered, counted     [convex/lib/dedupe.ts]
 │           → minted:            topic · counters · source · tags · audit row, one mutation
 │     → every step writes a line the console shows as it happens
 │
 ├─ stops at the target, when the queries run dry, or when its clock budget is spent
 └─ then resolves pictures for everything it minted                 [convex/images.ts]
```

**Never the same argument twice.** The URL ledger only ever stopped the same
*page* being minted twice, and the open web writes one story twenty times in a
morning. Every question carries a key — the subject with the punctuation,
casing, function words and word order thrown away — and a session checks each
draft against every recent key by word overlap before it spends anything on
minting. The mint then re-checks the exact key against an index inside its own
transaction, so two sessions racing cannot both get through. The threshold is
a setting; the rule is a pure function with its own tests, and the guard was
proven by removing it and watching the test go red
(`convex/lib/dedupe.ts`, `convex/dedupe.test.ts`, `convex/pipeline.test.ts`).

---

## 4. Wikipedia — the picture

The model names the article; a separate action turns names into pictures,
because a mutation cannot fetch (`convex/lib/wikipedia.ts`, `convex/images.ts`).

Fifty titles go in one request, since the quota is counted in requests rather
than titles. Wikipedia rewrites titles through redirects and normalisation on
the way back, so "Elon musk" answers as "Elon Musk" and has to be mapped home.
Disambiguation pages are refused — one would attach a photograph of the planet
Mercury to a topic about the element. Every topic asked about is stamped,
image or no image, because an article that correctly has no photograph would
otherwise be retried on every run and starve the ones never tried. The queue
reads newest first, so a question minted this hour gets its picture today
rather than waiting behind six hundred older rows. Abstract subjects — a
policy, a doctrine — can be re-pointed at something concrete they are about,
the bank rather than the rate, the singer rather than the genre.

---

## 5. AgentMail — reaching someone who is not on the page

Two moments happen while the person they concern is somewhere else
(`convex/notify.ts`).

| Moment | Who is told | Where they land |
|---|---|---|
| A new account is created | the new member | `/` |
| The daily hot topics | everyone who opted in, up to a ceiling | `/t/{slug}` for each of three questions |

```
the act is written first, and committed                    [convex/users.ts]
   → scheduler.runAfter(0, internal.notify.welcome)         ← scheduled, never awaited
        │
        ├─ claim: a row with a dedupe key, inserted before the send
        │     · the welcome key is the user; the digest key carries the date
        │     · a cron that fires twice, or a deployment restored from a backup,
        │       finds the row already there and sends nothing
        ├─ AgentMail send  → subject, the questions, one link each
        └─ markDelivered
```

Two rules hold. **Sending never blocks what it describes** — a mail service
having a bad day cannot fail somebody's sign-up. And **a link read somewhere
else must be the public address**: emails are built from `PUBLIC_SITE_URL`,
never from the auth origin, and the address they point at now opens the app
with that question in the middle of the console rather than a page about it.

---

## 6. What it costs, by design

Every metered thing is spent as late as possible and remembered afterwards:

- A story is never paid for twice. The URL ledger is read before every search
  result is considered, whether or not it became a topic last time.
- The model is not asked about a page until the page has passed the ledger,
  and the duplicate check runs on the draft *before* the mint — a repeat costs
  one model call, never a topic.
- A page is read only when the headline and snippet are too thin to write
  from, which is the exception.
- Pictures are fetched fifty to a request, and an article with no picture is
  never asked about again.
- One crawling session runs at a time, each with a budget of questions,
  searches and clock, all editable from the console without a deploy.
- Every outbound integration is configuration-gated: remove a key and that
  feature stops quietly while the rest of the product carries on.

---

## 7. Why the award would matter

bipolar is built around one mechanic: results stay hidden until you decide,
and the people who paid to be counted are shown apart from the crowd. That
mechanic only works if the feed never runs dry and never repeats itself, which
is exactly the part that meters per use — the searches, the model call behind
every question, the pictures, the mail.

The work is verifiable rather than asserted: 145 tests across 14 files, the
one-free-and-one-paid-vote rule and the all-or-nothing vote write hammered
directly, the stats gate asserted on the payload rather than the screen, the
ledger append-only and every privileged write recorded in the same transaction
as the thing it describes, and guards that were each proven by breaking them
and watching the test go red. A scanner runs on every commit so that nothing
about sources or method can reach the public repository by accident.
