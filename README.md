# bipolar

Vote LOVE or HATE on polarizing topics, and see what the people who paid to be
counted actually think.

Everyone votes for free — that is **the Crowd**. Some put 50¢ behind a vote, one
per person per topic, and those are counted separately as **the Committed**. The
gap between the two numbers is the product.

A topic's two-layer result is hidden until you have earned it, by voting or by
paying to peek. What is always public is the shareable half: which countries
lean which way, the boards, and the running totals.

Nobody writes the questions. Every six hours a crawler finds what the web is
arguing about and a model turns one story into a question a stranger can answer
with two buttons.

## Running it

```bash
npm install
npm run dev          # Vite on :5173 and the Convex dev deployment together
```

`npm run dev:backend` alone provisions the deployment and writes the two
frontend variables into `.env.local`. Backend keys live in the Convex
deployment rather than in a file — `convex/env.d.ts` is the inventory, and an
unset key makes one feature quiet rather than taking the app down.

## The gate

```bash
npm test              # vitest
npx tsc --noEmit      # app code and tests
npx convex dev --once # deployed functions
npm run build
```

## Where things are

| Path | What is in it |
|---|---|
| `convex/` | Schema, queries, mutations, actions, crons — the whole backend |
| `convex/votes.ts`, `convex/retract.ts` | The vote transaction, and the one window it can be taken back in |
| `convex/stats.ts` | The gate: a reader who has not earned the aggregate gets `null` in the payload |
| `src/views/Home.tsx` | The console — the run, the decision, the room |
| `src/ui/` | `Button`, `Field`, `TextArea`: the only files that write an interactive element |
| `hackathon.md` | The build log, in order, with dates |

Built for the Convex All Gas Hackathon. `hackathon.md` is the log.
