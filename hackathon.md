# Hackathon log

- **Project:** bipolar
- **Event:** Convex All Gas Hackathon
- **What it does:** Vote LOVE or HATE on polarizing topics, and see what the people who paid to be counted actually think.
- **Live app:** https://vivid-greyhound-473.convex.site
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
- **Last updated:** 15 September 2026

## Log

### 15 September 2026 — ask the boards, and put a rail away

**The model picks the chart. It never picks the number.** "Who hates China" is a question
people actually have and a sentence no database answers, so there is now a panel that takes
it. What the model is given is the question and the list of country codes that have votes;
what it returns is a *plan* — which of six lenses to draw, whose name to put on it, and a
line of prose. It cannot emit a figure, because nothing in its contract has a number in it.
Every value on screen is read off the public board afterwards by `convex/insightViews.ts`,
which turns a lens into blocks: a headline, a ranking, a map, a head-to-head, bars, a dial, a
note. The worst a wrong answer can be is the right numbers in the wrong chart.
`convex/lib/insight.ts` routes, `convex/insightChat.ts` spends the rate limit before it
spends anybody's money on a model call, and the reply is stored as the *rendered* answer
rather than as a question to re-run — the boards move, and re-deriving yesterday's answer
from today's numbers would quietly rewrite what somebody was told.

**A board trimmed by the field you then filter on is a board that lies.** Asked who hates
China, the panel said nobody had answered enough questions about it — while thirteen votes
sat there. `world.board` was returning the sixty verdict rows with the *lowest* lean, so
filtering that by subject found whatever happened to be extreme rather than whatever was
true. The same trim was quietly wrong twice more: a country page showed only the verdicts
harsh enough to make the cut, and the "warmest" reading was the least-harsh row of a list
holding nothing but harsh ones. It returns the whole board now, bounded naturally at one row
per voter-and-subject pair over the floor, with a test that fills a board with sixty-five
harsh verdicts and one warm one and insists the warm one survives.

**A rail can be put away, and the question does not move.** Readers said there was too much
going on, and the first answer — collapse the track — was worse than the problem: the biggest
type in the app jumped sideways the moment somebody tidied a column they were not even
reading. So a docked rail keeps its width and goes behind glass instead, still mounted and
still live, so bringing it back shows what happened rather than an empty panel that has to
load. What shows through the glass is the question's own ground, which now reaches under
whichever column has been docked. The field inside that reach extends by the *other* side's
bleed, which sounds like an accounting detail and is not: sized to the lopsided box, the red
and the blue slid sideways with it, and docking one rail handed the reader a screen where one
answer was winning before anybody had voted.

**The map answers the cursor without twitching.** A chosen country used to arrive with a pop —
half size, past full, settle. That is the right arrival for something that just happened and
the wrong one for something merely under a pointer that crosses a dozen countries on its way
anywhere. Nothing moves now: the land lights up in its own fill colour, a tight halo that
reads as an edge and a wide one that reads as light, and the chosen ring fades on. Every map
in the app is the same component, so the reveal's atlas, the world page, the topic pages and
the AI's own blocks all changed at once.

**The queue is a player.** Thirteen rows was the same complaint one column over. It shows the
next question at the weight that deserves, with the rest one press away; the count in the
heading stays honest about how much is really left either way.

**The yellow is gone.** It was the one accent that read as somebody else's product — an
advert, or a cheap betting site — which is a bad thing for the colour that marks money to
say. Mint carries the same "this costs something" weight in the register this product
actually wants, and it is far enough from both the rose and the cyan never to be mistaken for
a side. Undo went violet with it, hollow against the solid Next: same hue, so the two belong
to the same step of the run, and an outline against a block so they are never confused.

**The boards say what is actually happening.** "Hottest" ranked on money staked and showed
nothing else, so it listed whichever four questions happened to have taken a fifty-cent spark
— four food arguments — while eleven thousand votes sat on questions the board would not
name. It ranks on the crowd now, with the money kept on the row as the detail it always was,
and it reads the whole feed rather than the first three hundred rows of it, which was ranking
an arbitrary third. Two boards joined it in `convex/boards.ts`: the loudest countries, by
votes cast, each with its lean said in words; and the most argued questions, by replies. Both
are aggregates over many questions, which is what keeps them public — a country's lean across
two hundred topics gives away none of them. And a board with nobody on it is no longer drawn
at all: three headings over three lines of "nobody on this board yet" reads as broken rather
than as early.

**The reading says how thin it is.** Asked who loves China most, the honest answer on this
board is a country that still dislikes it — and "Thinks most of it / ET dislikes it / 71%"
is three statements disagreeing with each other, because the 71% is the strength of the
*hate*. When the board answers against the question the label says so now, and a note spells
it out. A second note fires whenever fewer than four countries clear the floor: nobody can
tell a thin board from a settled one by looking at a bar chart, so it says which it is.

**The door stands on the same ground as the question.** It was a flat black page with a hard
grey rule down the middle — a form, and the first thing a stranger sees of a product whose
whole look is two colours drifting behind an argument. It carries the weather now, under
grain, and the demo arena on it *drives* that ground: hover the love card and the red swells
across the page and pushes the blue back, exactly as it does behind a real question. That is
the demonstration, and a stranger finds it by moving a mouse before reading a single topic.
The three promises stopped being three identical bars with three violet ticks and became
three cards side by side, each in the colour it belongs to — red for the free vote, blue for
the paid layer, violet for the call. `ui/Grain.tsx` is the noise plate the bar, the docked
rails and the ground now share; there were three copies of the same turbulence filter in
three files.

**The feed asks a question to find something out.** The ranker already gave about one slot in
ten to a "discovery pick", and that pick reached into the bottom half of the score order —
which sounds like exploring and is not: the bottom half of a board that has learned one taste
is the same taste, scored worse. A reader who answered a few questions about famous people
was served famous people, then duller famous people, and nothing in the loop was ever asked
to learn anything. The slot now takes whatever the reader has told us *least* about — the
candidate whose category and tags carry the least evidence, chosen at random among the
joint-least-known so the stranger is not the same stranger every time. Tags count double,
because a category is coarse and the tags are what somebody has actually been answering. One
slot in six, since the slot is now doing real work.

**And then it did nothing, because the pool was one thing.** The candidate pool was the newest
hundred and eighty active questions, and the hundred-odd imported most recently were all the
same kind: a hundred and sixty-three of those hundred and eighty were a name and a question
mark. A pool that is one thing makes every correction downstream cosmetic — the ranker could
not have served anything else if it wanted to. It reads the catalogue now: the newest slice,
which is what a feed should mostly be, plus a seeded sample of everything behind it, so the
back catalogue is reachable and the sample moves between visits.

The discovery pick needed the same lesson twice. Measuring how little the *reader* has said
about something is right and is not enough: on a first visit nobody has said anything about
anything, every candidate ties, and a coin toss over a catalogue that is three-quarters one
kind of question serves thirteen famous people. Strangeness is measured against **this serve**
as well — least-served category, least-served tags, tags counting double — with the reader's
own evidence as the tie-break. Serving one question tagged `leader` drops every other
`leader` to a third of its strangeness, so the next discovery slot goes elsewhere. That works
on the first visit and on the thousandth.

**A hundred things people own.** Three quarters of the catalogue was a name and a question
mark, and a feed cannot be interesting about anything it does not have — so `seedProductTopics.ts`
adds phones, laptops, cars, headphones, consoles, cameras, kitchens, shoes, aircraft and the
rest, through `ingest` like every other batch. Objects rather than their makers: "Cybertruck"
is a thing somebody can picture and has an opinion about, where "Tesla" is a share price and
an argument about one man. Each row carries a country where it has one — a room that loves
the Corolla and hates the Cybertruck is a room saying something about Japan and America — and
every Wikipedia title was checked against the live API for a lead image before the file was
committed. Ninety-eight landed; two were already here under the same slug, and the importer's
eight-character floor caught seven questions that were a noun somebody forgot to finish.

**A question about a person is not a question about a country.** "Which country hates Donald
Trump" was being routed to the board that answers what the world makes of American *subjects*,
summed across every such question — a real board that never mentioned the man. There was no
lens for a named thing at all. There is now: `topic_world` takes the name as the reader typed
it, finds the question through the search index, and shows what each country made of that one
question. It draws the line the topic page has always drawn — a country's lean on one question
is public, and the counts behind it are what a vote or a peek buys — so its rows carry "few",
"some" or "many" where the world board carries a count, and a test asserts the absence of the
count rather than the presence of the lean.

The router's instructions moved into `lib/insightPrompt.ts`, because they are now longer than
the code that sends them, and they carry a hundred and seven worked examples in the form
`question -> lens subject`, grouped by the mistake each group prevents. Building it turned up
a second fault: walking the search results for one with votes on it answered a *different*
question — "pineapple on pizza" came back as "Marmite on toast?", which shares the word "on"
and had votes where pineapple had none. A candidate now has to share a real word with what was
asked, and where nothing does, the honest answer is that nobody has voted on it.

An answer about a named thing now opens with the thing: its own picture, the question, and the
flag of the country it belongs to. A chart of countries answers "who", and without this the
reader had to hold "what" in their head while reading it — the product already had a picture
for most questions and was not using it.

**"Who is the most hated person in the world" came back as a board about Russia and Brazil.**
Every lens ranked *countries*; nothing ranked the questions themselves, so the most obvious
thing anybody types at a product like this had no right answer to route to. `topic_ranking` is
the league table of the subjects — which named things the world thinks worst or best of, with
the winner's own face at the top of it and a category to narrow by. It is built from the
country boards rather than from each topic's stored aggregate: a country's lean on one
question is already public, the aggregate is what a vote or a peek buys, and this reads only
the first. Three countries minimum per row, because one room at a hundred percent is not the
most hated anything.

**And then it crowned "Buying fame?".** The league table ranked every question in the
catalogue, which is a fine answer to a question nobody asked — because the database did not
know what a question *was*. The two hand-written files knew they held people and products; the
rows knew only that Mohammed bin Salman is tagged `saudi, leader` and an iPhone `phones,
apple`, with nothing in common to filter on. `backfill.markKinds` moves the fact onto the row
as a `person` or `product` tag, where it can be indexed and where the crawler can set it too.
The board now answers with people when it is asked about people, and the router takes `person`
and `product` as narrowings beside the categories — a person can be in any category, and the
question is about the kind.

**Twenty-two things a question now knows about itself.** The boards could say who loved a
thing and never what kind of thing it was, so every reading had to be about one name at a
time. Topics carry facets now — kind, region, nationality, era, year, origin, gender, birth
year, age band, role, living, political lean, office, years in public, price band, brand,
maker, form, platform, what the argument is about, how far it reaches, who it is for — every
one optional and most of them a closed vocabulary, because a free-text facet is a facet nobody
can group by. Written by hand where nothing can derive it (a person's birth year, a product's
price band), computed where it follows (an age band from a birth year, a region from a
country), and read from the votes where only the votes can say it (how far the argument
actually reached). All eight hundred and one topics stamped.

Race and ethnicity are deliberately absent, and the reasoning is written at the top of
`lib/facets.ts` rather than left as a gap: a catalogue of named people tagged by race, with a
board ranking how hated each group is, is a machine for ranking hatred of ethnic groups, and
it would be the most shareable page on the site. Nationality is there, because a question
about Netanyahu genuinely is a question about Israel and the atlas is built on that. Gender is
there, because "are women judged more harshly" is a real question asked about people who are
public figures by choice.

**A ninth lens for the cut those make possible.** `facet_split` compares the groups against
each other rather than naming a winner: head of state is the worst-thought-of job on the site
at thirty-five percent over eighteen questions and athlete the best at sixty-one; right sits
at forty and left at fifty; the middle east at thirty-four and south america at fifty-one.
Every bar carries how many questions are behind it, a group of fewer than three is never
published, and the note says to read the gaps rather than the digits — these are averages of
averages. The league table takes the same attributes as a narrowing, so "the most hated woman"
and "the most hated luxury thing" are questions now, and an answer about one named thing wears
its own facets as chips above the charts.

**And then the other six hundred.** The facets landed on two hundred and ten topics written by
hand and four derived fields on the rest, which is not what "every topic" means. The crawled
questions — "Cream in carbonara?", "Syria's fuel price protests?" — say nothing about whether
they are an event, an idea or a thing, and writing six hundred of those by hand does not
scale past one afternoon. So the model reads each question and names the attributes, and
**every value is checked against the closed vocabulary before it is stored**: the same
arrangement as the router, where the model picks from a list it is shown and the server
decides whether the pick is on the list. What was written by hand outranks it, and the
arithmetic — an era from a year, an age band from a birth year — runs last and wins, because
a model's opinion about arithmetic is worth nothing. All seven hundred and ninety-four active
topics carry a reading now: two hundred and seven ideas, a hundred and eighty-seven people, a
hundred and twenty-six products, a hundred and one events, and the rest orgs, media and
places.

**A subject nobody answered is not a subject the room dislikes.** The subject board was
topping out at "travel, a hundred percent" off a handful of votes and printing it in the same
type as a category with a thousand behind it, which is a chart lying about its own confidence.
Twenty-five votes is the floor now, and it says so when nothing clears it. Sixteen more
routing examples cover the plural professions — footballers, musicians, chief executives — each
of which is a narrowing of people and never a subject of its own.

**"The model did not answer" was a thirty-second stopwatch.** The router's fetch carried the
shared default timeout, and the instructions had grown long enough that the call sometimes ran
past it and was aborted — which reached the reader as a flat refusal indistinguishable from a
missing key or a rate limit, because the failure was caught and thrown away with no signal at
all. It says why now, in the logs, for each of the four ways it can fail; it gets sixty seconds
and a second attempt; and `insightChat:probe` asks the router the same question the panel asks
with no session in the way, which is how the cause was found in one command rather than
guessed at.

**And what the question plainly said is no longer left to the model.** Asked "who is the most
loved person in the US" four times, it answered three different ways: correctly; once dropping
the word "person", which ranks the whole catalogue and crowns a pop song; and once reaching for
the country profile, which describes how America votes and names nobody. More rules in the
prompt took it to two in four. So the words decide instead — a superlative about a person is a
ranking and never a profile, the kind the question said out loud is put back, and so is the
country it named after "in". Narrow on purpose: it only ever adds what was already said, never
overwrites a narrowing the model made, and leaves every other lens as chosen.

**The link preview names itself twice now.** A pasted topic link came back on X as bare blue
text, and the page turned out to be right all along: the crawler is served the app's own shell
with the live tags spliced into its head, and a fetch as Twitterbot returns the question, the
description, the canonical address and an eight-hundred-pixel card at
`/card/<slug>.png` — two hundred, `image/png`, three tenths of a second. What was missing was
the other half of the vocabulary. X reads its own `twitter:*` tags first and only falls back to
Open Graph, so the title, the description and the alt text are stated in both, which costs four
lines and removes a whole class of "the card is blank on one network and fine on the others".

**The card is eighteen kilobytes now, and was three hundred and thirty-five.** `lib/png.ts`
wrote its zlib stream as stored blocks — legal, needs no compressor, and costs a byte a pixel
for a picture that is two rectangles and a sentence. It has one move now: fixed Huffman codes
and matches only ever at distance one, which is all a row of eight hundred identical pixels
needs and turns the file into a twentieth of itself. The card tests already inflated the stream
with the platform's own zlib and compared it pixel for pixel, so the proof that every decoder
in the world still reads it came for free.

**And a shared post carries its tags.** X has three fields — text, url, hashtags — and the
share was jamming all of it into the first one, which makes the link text rather than a card.
Each goes in its own field now, with up to three of the topic's own tags and the two house
ones. A hashtag ends at the first character that is not a letter or a digit, so `far-right`
becomes `#FarRight` rather than `#far` with five characters of litter after it.

**335 tests.** Three are new: one guards the verdict board against being trimmed by
the very field it is filtered on, three hold the discovery pick — that novelty is one for a
stranger and falls away as evidence arrives, that an exploring slot takes the least known
question rather than the worst-scored one, and that a reader with no history at all still
gets a mixed serve, and ten hold the reading of one named thing — what a plan is
allowed to contain, which end of a board leads, that a single question publishes leans and
never counts, that a near miss is not an answer, that the thing itself leads whether or not it has a picture, and that
the league table crowns somebody, publishes leans rather than counts, says what it averaged over, knows a kind of thing from a category of one, and — fourteen more —
that the derivations are arithmetic, that the hand-written facets never say a word the
vocabulary lacks, that a group of one is not a comparison, and that the router names an
attribute rather than a value of one. The rest are unchanged and still green.

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

**The crawler goes out six times a day and comes back with fifteen.** It used to run every
six hours and mint three, from one search. A firing is now a **session**: it sweeps up to
eight searches, rotating through the query list by the clock so consecutive sessions read
different ground, and keeps going until it has fifteen new questions, runs out of material,
or runs out of its clock budget. One number in `convex/config.ts` sets the cadence —
`DISCOVERY.runsPerDay` — and the cron, the console and every screen that quotes a rate all
derive from it, in minutes rather than hours so any number of sessions a day divides cleanly.

**Never the same argument twice.** The URL ledger only ever stopped the same *page* being
minted twice, and the open web writes one story twenty times in a morning. Every question now
carries a key: the subject with the punctuation, the casing, the function words and the word
order thrown away. A session reads every recent key once, holds them in memory, and checks
each draft against them by word overlap before it spends anything on minting — and the mint
re-checks against an index inside its own transaction, so two sessions racing cannot both get
through. Anything already asked is recorded as a duplicate rather than silently dropped, and
the count is on the overview. `convex/lib/dedupe.ts`.

**The picture comes with the question.** The model names the Wikipedia article in the same
call that writes the question, while it has the story in front of it, and the session resolves
those names into images before it finishes. A wave of new questions no longer sits pictureless
until somebody runs a backfill by hand.

**The queue is organised by the wave it arrived in.** A session has a number that counts up —
a document id is unique and unsayable, and "everything from 47" is a sentence. Drafts are
grouped under their session with what it found, what it minted and what it dropped, rows can
be picked in batches, and a whole wave can be published or archived in one press. One
mutation, so twelve either move or none do, with each decision still checked and recorded on
its own. `convex/adminQueue.ts`.

**A settings page, and the cadence stopped being a schedule.** Eight numbers that used to
need a deploy are now editable from the console: sessions a day, questions a session,
searches a session, results a search, the polarizing floor, the sameness threshold, and the
two that bound the daily mail. A cron interval is fixed when the code is deployed, so the
crawler now ticks hourly and asks whether a session is due from the setting — turning six a
day into twelve is felt within the hour rather than on the next build.

What is stored is an **override**, never a copy: clearing one forgets it and the deployment
goes back to what the repository says, so an untouched settings table behaves exactly like
the code. Every row shows its default and its range beside the value, because a console that
changes a number without telling you what it was is a console you cannot undo. Bounds are
enforced on the server, not by the field — a crawler set to run two thousand times a day
would spend the search quota before breakfast, and the page that asked for it is not what
should stop it. Each change writes a line in the record naming the setting, what it was and
what it became.

**Prices are deliberately not on it.** The pack catalogue and the cost of a spark stay
server-side constants: a wallet that can be repriced from a web page is a wallet with two
sources of truth. `convex/lib/tunables.ts`, `convex/tunables.ts`.

**The console's pages, redrawn without the boxes.** The first version of every admin page was
a grid of bordered tiles, which is what every dashboard is made of and reads as a dashboard
before it reads as anything about this product. The frame stayed; the pages were rebuilt as
sheets. The overview is figures on the canvas in the product's own display type and colours,
and its one chart is the crawler's heartbeat — a bar per session, violet for what it minted,
yellow for what it dropped as already asked, grey for what nobody would argue about. Topic
rows lead with the picture at a size a face is recognised at, and carry their status as a
solid block of colour on the edge so a long list sorts itself by colour before a word is
read. Each session in the queue is a violet-numbered bar with its tally as chips and a
progress bar of how much of the wave has been decided. The record became a day-by-day
timeline with the actor's avatar and, instead of a document id, the question the line was
about, resolved on the server and linked to the site. Settings rows put the value in display
type over a track that shows where it sits between its bounds, with a notch at the
repository's default. `src/components/admin/`.

**Flags are drawn, not typed.** The emoji flag was the one exception to the no-emoji rule and
a poor one: Windows renders the pair of letters it is built from, every platform draws a
different flag, and none at the size the row asked for. Every flag is now the `flag-icons`
SVG, the same on every machine, at 4:3, at whatever size the row needs. The 271 files are
shipped as assets fetched only when a flag is on screen — kept out of Vite's inline limit on
purpose, since two hundred small SVGs pasted into the bundle as base64 would be a megabyte
downloaded to show one of them. `src/ui/Flag.tsx`.

**A shared link opens the product, not a page about it.** `/t/<slug>` is registered ahead of
the static site so a crawler gets real markup — and for a while that meant *everybody* got it.
A link out of the daily mail opened four lines of Times New Roman with a blue "Open bipolar"
underneath that led back to the page you were already on. The route now fetches the app's own
deployed shell from the hosting component, splices the live tags into its head, and puts the
readable summary inside the root element where React replaces it the moment the bundle boots.
One page: a crawler reads the tags, a person gets the app. And it is no longer a separate
screen — the link opens the console with that question in the middle column, the same three
columns and the same run underneath, so the most-shared address in the product is the product.
`convex/seo.ts`, `src/App.tsx`.

**The crawler has a button and a window.** A Crawl tab on the topics screen fires a session on
demand and watches it happen: the run row is opened before the action is scheduled, so a
session appears the instant it is pressed, and every step writes a line from inside the loop —
which search, which page, what the model said, why a story was dropped. A bar tracks the
session against its own target, the stage says what it is doing right now, a clock runs while
it runs, and every question it mints is a link that opens on the site. One at a time: a second
press while a session is out is refused, because it would spend the same searches twice.
`convex/ingestSession.ts`, `src/components/admin/Crawl.tsx`.

**Flags are drawn, and they lead.** Every flag is now the `flag-icons` SVG rather than an
emoji — the same flag on every machine, at the size the row asks for. And in every list a flag
is the first thing on its line, with a globe standing in for "everywhere", because anything of
variable length in front of it puts it somewhere different on every row. Admin rows reserve
the picture slot whether or not there is a picture, for the same reason.

**Answer forty, or study one.** An account can now skip the result and go straight to the next
question. The vote is identical either way — cast, counted, and still retractable — so the
undo simply moves to the foot of the next question, orange beside the skip, on the same `U`.
The size of the room moved with it: how many people have already voted was a 12px chip between
a hashtag and a source link, and it is the whole reason to have an opinion, so it is now its
own band under the question at a size that says so.

**The feed learns from everything you do, and proves it.** The ranker used to learn one
number per category, from votes and skips. It now sees every act a reader takes on a topic —
a vote, a paid vote, a skip, an undo, a comment, a peek, and pulling a topic out of the room
by hand — each written to an append-only log with what the topic was made of stamped on the
row, and each moving one weight per tag, category and country by a strength that matches how
deliberate the act was. Going and getting a topic moves more than tapping through one; an undo
takes most of a vote back; two skips in a category in half an hour sink that category for the
next card without touching long-run taste. `convex/interactions.ts`, `convex/lib/affinity.ts`.

The proof is a replay, not a claim. Every reader's real acts are replayed in the order they
happened, and at each act taken towards a topic the ranker is asked, knowing only what came
before, where it would have placed that topic among everything the reader could have been
shown. Two rankers answer on the same readers and the same acts: the one that shipped before
the log existed, and the one that reads it. On the development deployment, over 81 acts by two
readers, every yardstick improves: mean reciprocal rank 0.087 against 0.149, the topic they
went on to choose landing on the first screen 27% of the time instead of 20%, and a median
place of 38 against 39. A topic a reader later engaged with scores 0.21 higher than one they
later skipped. The replay runs nightly, its report card is on the console's
overview beside a button that re-runs it, and the test that holds it was proven by switching
the learned term off and watching it fail. `convex/recommend.ts`, `convex/recommend.test.ts`.

**The argument answers itself, and agrees with itself.** A line can now be replied to and
liked. A reply costs a quill like any other line and is filed one level deep — reply to a
reply and you are filed under the same parent, because a thread that nests without limit is a
thread nobody can read on a phone. A like is free, because the point of it is that everybody
can afford to agree, and it is one row per person per comment read before every write, so a
second tap takes the like back rather than adding another. The thread order is the server's:
parents oldest first, each followed by its own replies, since a client cannot work that out
from a page of a flat list without knowing where the page ends.

**Two hundred characters.** Six hundred was an essay, and an essay under a one-tap question is
somebody talking past the room. The counter appears in the last fifty, because a limit that
only announces itself at the moment you hit it eats a sentence somebody had finished writing.

**Both new acts feed the recommender.** A reply is the strongest signal in the product —
it costs a quill and takes a side — so it moves the weights further than a comment. A like is
free and one tap, so it counts for less than anything that was paid for, and taking a like
back pulls the weight back, because a weight that can rise but never fall ends up saying
nothing. All three land in the interaction log with the topic's tags on them, and the first
two are engagement the replay scores against.

**The undo stops following you, and stops lying.** A reader who skips the result has no
countdown to measure the window against, so the offer used to ride along for the whole run —
an Undo on the twelfth question that would have retracted the first. It now closes after nine
seconds, which is about as long as "wait, no" takes. And it is tied to the topic actually on
screen: stepping back to an old result, or pulling one out of the room, shows nothing to
undo, because those votes are final and the button over them would have retracted something
else entirely.

**The keyboard is a walkthrough.** The decision's foot used to carry a fixed row of key caps,
which is furniture everybody stops seeing by the third question. It is a five-step tour now:
one key on screen at a time, naming what pressing it does, with the control it is about lit
at the same moment so the instruction is never in a different place from the thing. A step
advances **only when the key is actually pressed** — clicking the same control with the mouse
teaches nothing, because the step is the practice.

While the tour runs the product is a **rehearsal**: the cards still move under a mouse press
and nothing is cast, so nobody votes on a question they have not read yet while finding out
what the buttons do. The pill says "practice" for exactly as long as that is true. It can be
walked out of at any point, and finishing and skipping end the same way. Afterwards the foot
goes back to the quiet line of caps it always had — somebody who learned the keys last week
still wants reminding which is which; it is the tour that should not outstay its welcome.

**A bell, for the three things worth being told.** Somebody answered your line, somebody
agreed with it, and the room found something worth arguing about. Nothing else rings: a bell
that rings for everything is a bell nobody looks at. Each notice is written in the same
mutation as the thing it announces, so one cannot exist for a reply that was not posted — the
same arrangement Rule 8 uses for the audit log — and never for your own act, because being
told what you just did is the fastest way to teach somebody to ignore the bell. Opening the
panel is reading it, since a list of things you have plainly just looked at, still marked
unread, is an argument with the reader. Nothing is ever deleted; only the read stamp changes.
The daily hot topic now lands here as well as in the inbox, because the mail only reaches the
people who asked for mail and somebody who comes back to nothing stops coming back.
`convex/notifications.ts`.

**173 tests.** Six cover the retraction: the spark returned and the counters left exactly as they were found, the country counters with them, a retracted vote recast the other way, the streak restored from its snapshot, the window closing, and one voter unable to take back another's vote. Five more cover reclaiming: an emptied wallet taking another pack with both grants left in the ledger, a wallet one spark above empty refused, the two currencies emptying independently, the daily ceiling, and the ceiling lifting the next day. Three more cover the record: a moderator refused, an admin served, and the rows bounded and newest-first. Nine more cover discovery's promise that a question is new: rewordings, reorderings and repunctuations collapsing to one key, genuinely different arguments staying apart, the threshold behaving as a threshold, the mint refusing a repeat inside its transaction, and sessions counting up and stamping what they mint. Four more cover the button: a moderator refused, the row open and attributed before the session wakes, one session at a time, and a session with no API keys saying so in a line rather than never returning. Sixteen more cover the recommender: what each act is worth and which way, that tags count double against their category, fatigue being about right now, the yardsticks, every act landing in the log with the topic's tags on it and moving the weights, the very next feed changing because of a pull, and the replay ranking a reader with a known taste better under the ranker that learned it. Eight more cover the argument: two hundred characters landing and two hundred and one refused before any quill moves, a reply filed under the line it answers, a reply to a reply filed under the same parent, the thread coming back in thread order, a line on another topic refused, a second tap taking a like back rather than adding one, a removed line that cannot be liked, both new acts reaching the ranker with the reply outweighing the like, and taking a like back pulling the weight back down. Ten more cover the settings: every default inside its own range, an out-of-range value clamped on arrival rather than at the field, an untouched table reading as the code, an unknown key refused, a moderator refused and an admin recorded, a reset forgetting rather than rewriting, and the cadence deciding that a three-hour-old session is due at twelve a day but not at six.
