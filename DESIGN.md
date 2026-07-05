# FinSim — Design Specification

**Status:** Founding document for the ground-up rebuild on the `cleanSlate` branch. Nothing from the previous prototype carries over except the core insight.
**One-liner:** A serious financial simulator where every instrument is a card and every card is a curve f(t) — with a workshop for authoring your own cards and packs, and a deliberately boring multiplayer card game built on top of it.

---

## 0. Decision log (all confirmed)

| Decision | Choice |
|---|---|
| Product focus | **Simulator first.** The sandbox planner is v1; the game is layered on top of the same engine and card system. |
| Workshop | **First-class.** Users author their own cards (ISK, 401k, …) and bundle them into packs — this is what enables locale remixes like *"the 1990s scenario from an Argentinian point of view."* |
| Multiplayer form | **Same room, own devices.** One player hosts; friends join with a room code. Host screen is the shared table; phones hold hidden hands. |
| Player interaction | **Race + shared world.** Same passed hands, same market, same events. You compete on outcomes and by denying cards in the draft — never by attacking. |
| Jurisdiction realism | **Generic engine, Sweden pack first.** The engine knows no jurisdictions; rules ship as data packs. |
| Draft mechanic | **Full draft, Sushi Go / 7 Wonders style.** Pick 1, pass the rest, repeat until hands are empty (last card discarded). |
| Year-winner bonus | **Cash from the bank** (not zero-sum) to the best return each year. |
| Card scarcity | **Copies allowed.** Several players can hold the same stock, differing only in when they bought. |
| Name | **FinSim.** |
| Stream percent semantics | **Share of the pool remaining at the stream's turn.** Superseded by the pipeline model below, which generalizes exactly this rule to every card. |
| Calculation model (v2, supersedes stacks/streams/modifiers) | **A hand is played top to bottom.** Every card acts on a running monthly total: sources add their curve, drains subtract (a fixed amount, or a % of the positive running total), assets and debts take their deposit/payment from it, and whatever reaches the bottom of the root lands in Cash. **A hand nested in a hand computes its own subtotal from zero and contributes its net at its position** — recursion is the scoping rule, so two salaries can carry different taxes without interference. The Modifier kind is removed: tax is a % drain (positional), a raise is the source card's own growth curve, a fee is an asset parameter. Order is load-bearing and visible — the column *is* the calculation. |
| Simulator table layout (v2.1) | **One main hand (recursive).** The battle area holds a single main hand; everything else waits in the draw pile. Membership is **binary** — a card or bundle is *active* (in the main hand) or *in the draw pile* — with **no set-aside toggle**. The layout **alternates axis by depth**: the main hand fans across the X axis, a sub-hand stacks down the Y axis, a sub-sub-hand fans across X again, and so on. Cards are **static** on the table and in the pile; all parameter tuning lives in the Workshop (§3). **Compare is automatic:** every decision-bundle sub-hand played into the main hand auto-draws its own ghost = the plan *without* it, plus the time-to-goal delta — the killer feature, with no toggle. |

---

## 1. Vision

One engine, three faces, built in this order:

1. **The Simulator** — a single-player sandbox where you model a financial life by playing and stacking cards on a table, watching one honest net-worth curve respond in real time.
2. **The Workshop** — the card and pack authoring system. Not an admin afterthought: creating a card *is* the same act as editing one, and packs are how the product grows without growing the code.
3. **The Game** — scenario-driven, 2–6 players in a room, pick-and-pass drafting, rounds that represent years, outcomes computed by the same engine.

### Boring is the goal

Stated as design law:

- **No fantasy.** Real instruments, real decades, real tax rules. The theme is the mechanic.
- **The drama is the data.** The most exciting moment is watching a year of real market history replay while your drafted portfolio lives through it.
- **Honesty over juice.** No crits, no combo labels, no screen shake. Numbers use tabular numerals and never lie. Aesthetic target: *an annual report you fight over with friends*.
- **Losing teaches.** Game scenarios end with an epilogue showing what happened next in reality.

### Why f(t) survives the reset

The old prototype's curve model was right about **consequences** but had no **decisions** — a continuous simulation gives the player nothing to do, and its stacking semantics were never pinned down. The rebuild fixes both:

- A **stacking grammar** with one rule (§7) replaces the old ad-hoc `canStackOnto` / `stackingMultiplier` / `NestedStack` mechanisms.
- The engine simulates time continuously (monthly ticks); the simulator makes editing tactile; the **game** interrupts time at intervals (rounds) to deal decisions.

---

## 2. The Simulator (product 1)

**North-star use case — v1 is judged by this:** model your own finances as cards (salary, expenses, monthly savings streamed into five index funds), then play a "car" onto the table and read off the answer to:

> *"How much longer will it take to reach 10 million SEK just because I bought this car?"*

Every design choice below serves that question shape: model a life, toggle a decision, read its cost **in time-to-goal**, not just in kronor.

One screen, no navigation for the core loop. A **table** holding one main hand (recursive, axis-alternating), a **timeline** that is the single source of truth, and a **draw pile/library** to play from.

```
┌──────────────────────────────────────────────────────────────┐
│  TIMELINE  net-worth curve · per-vessel bands · goal lines   │ ~40%
│  ├─ today ─────────── time scrubber ───────────── horizon ─┤ │
├──────────────────────────────────────────────────────────────┤
│  THE TABLE                                                   │
│   [Salary+Tax+Raise] ──stream──▶ [Checking]                  │ ~45%
│        └────20% of surplus──────────────▶ [Index fund+Fee]   │
│   [Rent −12k/mo]            [Mortgage −1.9M ◀── 8k/mo]       │
├──────────────────────────────────────────────────────────────┤
│  HAND / LIBRARY drawer                          [＋ New card] │ ~15%
└──────────────────────────────────────────────────────────────┘
```

- **The chart is the truth.** Every gesture on the table updates the timeline with zero perceptible latency. Cards are the controls; the curve is the consequence.
- **Play:** drag a card from the library to the table. Valid drop targets glow (the kind system decides validity, §7); invalid targets are simply inert.
- **Stack:** drop a modifier onto a stack — magnetic snap, and the chart *morphs* (animated transition, never a redraw flash). Stacks fan slightly on hover so every card's header strip stays readable.
- **Stream:** drag the output chip on a flow stack onto a vessel or debt; a radial widget sets a fixed amount or a % of surplus. Streams render as soft lines on the table. A permanent **Checking** vessel catches all unrouted flow, so the model never leaks money.
- **Edit in the Workshop:** on the table, cards are static — composing (drag to reorder, play, set aside) happens here; parameter tuning happens in the Workshop (§3), where a card flips to sliders that live-update the chart. (Flip-to-edit is deferred to the Workshop; the simulator table is compose-only.)
- **Time scrub:** drag on the timeline to move a cursor; every stack annotates itself with its value at that moment (*"in 2041 this stack yields 31 200 kr/mo"*).
- **Goals:** goal cards ("10 MSEK", "mortgage-free at 55") render as target lines annotated with **the date you cross them**. No confetti — an honest date and gap number.
- **Decisions are bundles.** "Buy the car" is never one card — it's a cash outlay, a depreciating asset, running-cost flows (insurance, fuel, service, skatt), maybe a loan. A bundle is a **sub-hand** you play into the main hand as one unit, and set aside (back to the draw pile) as one unit.
- **Compare (automatic):** every decision-bundle sub-hand in the main hand renders its own **ghost curve** = the plan *without* that bundle, behind the active one. The readout speaks in the units that matter: **time-to-goal delta** per goal line — *"10 MSEK: 2045-06 → 2046-09. The car costs you 1 yr 3 mo."* — plus money-at-horizon. This is the simulator's killer feature and its v1 acceptance test — and it needs no toggle: playing the car shows its cost, setting it aside removes it.
- **Everything is undoable.** The table serializes to one small immutable document; every gesture is a diff.

---

## 3. The Workshop (the multiplier)

The workshop is not a separate editor — **the back of a blank card is the card creator.** The same flip-and-slide interaction used to tweak a salary is used to define a new instrument from scratch.

- **Authoring a card:** choose a kind (§7), a curve or transform primitive (§8), set parameters, write the front (name, description, icon, tags) and the assumptions footnote (where the numbers come from). Done — it's in your library.
- **Packs** are the unit of sharing. A pack is a data bundle (JSON, no code) containing any mix of:
  - **Instrument cards** — "ISK", "401k", "Bostadsrätt", "AP7 Såfa";
  - **Locale rules** — tax transforms and scheduled rules wired into engine hooks (Sweden pack: ISK schablonskatt, ränteavdrag, amorteringskrav, jobbskatteavdrag);
  - **Data series** — real historical monthly curves (prices, inflation, interest rates, FX) with period-accurate card descriptions;
  - **Scenarios** — game modules (§4) referencing the above.
- **Remixing is the point.** *"1990: The Decade Trade"* is a scenario referencing a US-equities data pack and a Swedish locale pack. Swap in an Argentina pack — ARS, hyperinflation series, convertibility-plan events — and the same scenario becomes a different lesson. No engine changes, no scenario changes: packs compose.
- Distribution starts humble: export/import pack files. Registry/sharing UI is a later concern; the *format* is a day-one concern.

---

## 4. The Game (product 2)

Every scenario is an instance of one loop:

```
SETUP      scenario defines: era, goal, deck(s), starting position, horizon
  │
ROUND      (usually = 1 year, scenario-configurable)
  │  1. DEAL     each player receives a hand (default 7) from the era deck
  │  2. DRAFT    pick 1 card, pass the rest left; repeat until hands are
  │              empty — the last card is discarded face-up (Sushi Go /
  │              7 Wonders style). Passing direction alternates each round.
  │  3. COMMIT   on your own device: play drafted cards into your ledger,
  │              allocate cash, buy/sell within the scenario's trading rules
  │  4. SIMULATE the engine runs the year month-by-month; the host screen
  │              replays it as a live market/news ticker; ledgers update
  │  5. INTERIM  standings + the year-winner bonus: best return that year
  │              receives cash from the bank
  │
FINAL      scoring per scenario goal → results → real-history epilogue
```

| Term | Meaning |
|---|---|
| **Scenario** | A data-defined game module: era, deck, goal, rules, tunables. |
| **Era deck** | The card pool, possibly changing per round (1993's IPOs appear in 1993). |
| **Ledger** | A player's private tableau — cards, cash, positions — on their own device. |
| **Table** | The shared host screen: race chart, market replay, events, discards, standings. |

Drafting notes:

- Drafting is simultaneous — no turn-waiting; the host screen shows who's still deciding.
- Discards are public. Knowing what nobody took is information.
- Hate-drafting (taking a card to deny it) is the game's only direct interaction, and it's enough.
- The deck contains **copies** of popular assets — several players can hold Microsoft; they differ only in entry timing and allocation.
- Not every drafted card must be funded: cards you keep but don't buy into stay in your ledger as options for later COMMIT phases (scenario-tunable).

---

## 5. Flagship scenario A — *"1990: The Decade Trade"*

**Goal:** highest net worth on 31 Dec 1999. **Players:** 2–6. **Length:** 10 rounds.

- Everyone starts with the same cash (default 100 000 kr) and an empty portfolio.
- The era deck is **real equities with real monthly price data** — Microsoft, Intel, Nokia, Ericsson, GE, Coca-Cola, Enron, AOL, dot-com IPOs appearing in their actual listing years — plus bonds, an index fund, and a savings account as the boring anchors.
- **Epistemic rule: a card only shows what was knowable at the in-game date.** Front: name, sector, a 3-year *trailing* sparkline, dividend yield, volatility grade, and a period-accurate one-liner ("Finnish conglomerate; rubber boots, cables, and now mobile telephones"). No survivorship hints.
- COMMIT: allocate cash across drafted cards; selling existing positions allowed only in this window, with realistic courtage and capital-gains tax from the locale pack.
- SIMULATE: the host screen replays the year — ticker, the race chart of everyone's net worth, and 2–4 curated period headlines ("1997: Asian currency crisis").
- **Year-winner bonus:** best portfolio return (%) that year gets cash from the bank (default 10 % of starting capital). Rewards yearly conviction, keeps trailing players alive.
- **Epilogue:** the final screen scrolls through 2000–2002 with everyone's final portfolio frozen. The dot-com lesson delivers itself.

This is the first *game* milestone because it needs no household modeling — its fun depends only on drafting + real data + the replay moment: the smallest thing that proves the game layer.

---

## 6. Flagship scenario B — *"Financial Independence First"*

**Goal:** first player to reach FI — passive income ≥ living expenses for 12 consecutive months (exact definition is a scenario tunable; alternative: net worth ≥ 25× annual expenses). **Length:** up to 30 rounds; if nobody reaches FI, highest FI-ratio wins.

- Everyone starts from the same household baseline: salary, rent, expenses, small savings. (Later variant: round 0 drafts your starting life — job, city, flat.)
- The era deck mixes kinds: **assets** (index funds, rental flat), **income moves** (career change, side business, negotiate raise), **expense changes** (move somewhere cheaper, car vs no car), **instruments** (ISK vs depot, amortize vs invest), and **life cards** (kids, sabbatical — honest costs, no scoring value; some players will draft them anyway, which is the point).
- **Shared world events** between rounds hit everyone identically: rate hikes, a 2008-style crash, tax reform, inflation spikes. Scripted per scenario seed.
- The Sweden pack is what gives this scenario teeth, and it exercises the full stacking grammar: salary stacks wear tax and raise modifiers, fund stacks wear fees, the mortgage consumes a stream of surplus.

---

## 7. Card system

### Kinds

Every card is exactly one kind; kind alone determines where it can be played. A type system, not per-card allowlists.

| Kind | Does | Examples |
|---|---|---|
| **Source** | adds its curve (kr/month) to the running total | salary (raise = its own growth curve), side business, rental income |
| **Drain** | subtracts a fixed curve, or a % of the positive running total | rent, living expenses, income tax (−30 %) |
| **Asset** | a balance with a growth curve (and optional fee); takes its deposit from the running total | stocks (sampled curve), funds, property, savings |
| **Debt** | a positive principal accruing interest; takes its payment from the running total, capped at payoff | mortgage, student loan |
| **Hand** | a named, nestable collection; computes its own subtotal and contributes its net. The battle area is one main hand; sub-hands are decision bundles (§2) | "Current budget", "Buy the car", "Financing" |
| **Event** | a scripted world change (scenario-dealt, never drafted) | crash, rate hike, tax reform |

### The pipeline (one rule)

> A **hand is played top to bottom.** Each card acts on a running monthly total; a nested hand computes its own subtotal from zero and contributes its net at its position. What reaches the bottom of the root hand lands in the permanent cash account, so the model never leaks money.

Order is load-bearing and visible: put the tax above the salary and it taxes nothing — the column is the calculation. Percentage cards read the running total *at their position*, which is what makes "20 % of surplus" composable and allocation impossible to oversubscribe. Nested hands are the scoping construct: a tax inside a hand sees only that hand's subtotal.

### Anatomy

Two-sided. **Front = meaning:** kind band, icon, name, headline number (signed, per-month for flows, absolute for balances), trailing sparkline, one-line description, tags. **Back = math:** formula, parameters as live sliders, assumptions footnote, data source. In the simulator the back is fully editable (and the back of a blank card is the workshop, §3); in the game, backs are read-only.

---

## 8. The engine

Pure, deterministic, dependency-free TypeScript module with its own test suite. No framework imports. This is the long-lived asset and it is simulator-grade from day one.

- **Tick:** monthly. Each month: play the root hand top to bottom (depth-first) — sources add, drains subtract, assets/debts grow/accrue and then take their deposit/payment from the running total — remainder to cash → scheduled rules (taxes, events). **Net worth(t)** = Σ assets − Σ debts.
- **`simulate(table, world, from, to) → Series[]`** — no hidden state. Ghosts, replays, undo, and what-if diffs are just calls.
- **Curve primitives:** linear, compound, step, sinusoidal, **sampled** (real historical monthly data), and a sandboxed custom expression as escape hatch.
- **Determinism everywhere:** shuffles and event schedules are seeded. A finished game is fully reproducible from `(scenario, seed, decisions)` — which is also the save format and the replay format.
- **Jurisdiction as data:** the engine exposes hooks (flow transforms, balance transforms, scheduled rules); locale packs wire real rules into those hooks. No `if (sweden)` anywhere.
- **Historical data as packs:** static curated datasets (~30–60 instruments per era; monthly adjusted closes, dividends, listing/delisting dates, descriptions). Bundled, no live APIs.
- **Real vs nominal:** inflation lives in a table-level Assumptions slot; a global toggle re-renders all curves in real terms.
- **Goal solver:** `firstCrossing(series, target)` — the month a curve first (sustainably) crosses a target — is a first-class query, because the product's north-star outputs are **dates and date-deltas**, not just curves.
- **Stochastic-ready:** growth parameters are `(expected, volatility?)` from day one, with volatility simply ignored by the deterministic v1 engine. A later **Monte Carlo mode** runs N seeded paths over the same table and reports percentile fans (P10/P50/P90) and *probability of reaching the goal by date X*. Shaping the parameters now costs nothing; retrofitting them would touch every card.

---

## 9. Multiplayer architecture

**Jackbox model, host-authoritative.**

- **Host screen** (laptop/TV on the table): the shared Table — race chart, market replay, events, public discards, standings, draft status ("waiting for Anna…").
- **Player devices** (phones): the private Ledger — hidden hand, drafting, commit/allocation, own net-worth detail.
- The host runs the entire simulation (pure engine; 6 players × 600 months is trivial). Player devices are thin views sending decisions, receiving state.
- **Join:** host creates a room → 4-letter code → players open the same web app and enter it. No accounts.
- **Sync:** a minimal WebSocket relay that stores nothing and understands nothing — it forwards messages. Deterministic state + full-state broadcasts make reconnects trivial.
- **Same codebase, two routes:** `/table` (host) and `/hand` (player).

---

## 10. Visual direction

**"An annual report you fight over with friends."**

- Warm paper and ink; the five kind-band colors are the only identity hues; **green/red reserved strictly for money direction**. Light + dark from day one.
- Serif display for card names and scenario titles; a sans with **tabular numerals** for every figure. Numbers never jiggle.
- Card faces are beautifully set index cards, not game art: engraved monochrome glyphs, no illustrations, no characters.
- Motion is spent in exactly two places: the tactile card interactions in the simulator (lift, snap, fan, flip), and the market replay in the game (ticker advances, curves draw, headlines slide). Everything else is calm.
- Sound: paper slides, one soft tick per simulated month, a page-turn on year end. The year-winner gets a dry stamp: *"Årets resultat: Anna. +14,2 %."*

---

## 11. Platform & tech

- **TypeScript + React + Vite web app**, PWA, local-first. Simulator data (your financial life) never leaves the device: IndexedDB persistence, JSON export/import. No backend for the simulator at all.
- **Engine:** pure TS package (`/engine`), exhaustively tested.
- **UI:** DOM, not canvas — the interface is text and numbers; accessibility and iteration speed win. `dnd-kit` for drag/stack/stream gestures, `framer-motion` for the earned animations, `visx`/D3 for timeline and replay.
- **Sync (game only):** a tiny WebSocket relay (PartyKit/Durable Object or a ~100-line Node relay). JSON state docs + decision messages.
- **Packs and scenarios are data files**, not code (§3). Saved games are `(scenario, seed, decisions)` tuples — a few KB, shareable as files or links.
- Touch-first sizing (phones are the game controllers; iPad is a fine simulator surface).

---

## 12. Tunables (proposed defaults — playtest fodder)

| Tunable | Default | Notes |
|---|---|---|
| Players | 2–6 | Draft degrades below 3; solo needs bots (later). |
| Hand size | 7 | Confirmed feel: Sushi Go / 7 Wonders. |
| Picks per round | full draft (6 of 7, last discarded) | **Confirmed.** If 10-round games drag in playtests, the lever is hand size, not the mechanic. |
| Round length | 1 year | Scenario-configurable. |
| Year-winner bonus | +10 % of starting capital, from the bank | **Confirmed** bank-paid. Size/scaling is playtest fodder. |
| Starting capital (1990) | 100 000 kr | |
| FI definition | passive income ≥ expenses for 12 consecutive months | Alternative: 25× annual expenses. |
| Trading windows | COMMIT phase only | Mid-year trading would kill the drafting tension. |

---

## 13. Build order (simulator first)

**M0 — Engine core.** Curves (incl. sampled), stacks, streams, monthly tick, seeded determinism, pack/locale hooks. Tests. No UI.
**M1 — Simulator v1.** The table, timeline, stacking, streams, flip-to-edit, goals, decision bundles, ghost compare with time-to-goal deltas, undo, persistence. Ships with a starter Sweden pack (core household cards, a car bundle, basic rules). **Acceptance test:** Sebastian models salary + expenses + five index-fund streams, plays a car bundle, and reads "how much longer to 10 MSEK" off the screen.
**M2 — Workshop v1.** Blank-card authoring, pack export/import. (Much of it falls out of M1's flip-to-edit for free.)
**M3 — Game prototype, hot-seat.** The 1990 scenario on a single device with "look away" drafting. Deliberately ugly. Purpose: find out whether the game is *fun* before building sync — the cheap insurance against the "did this concept actually work out" doubt.
**M4 — Own-devices multiplayer.** Room codes, host table, phone hands, the market replay done properly.
**M5 — FI scenario + Sweden pack deep.** Full locale rules, shared events, life cards.
**M6 — Polish.** Epilogues, replays, sound, compare ghosts in game post-mortems.
**Later:** **Monte Carlo mode** on your own table (fan charts, goal-probability curves, stress tests beyond MC — sequence-of-returns, historical replay of *your* plan through 2008), bots for solo, pack registry/sharing, more eras (1929, 1970s stagflation, 2008, Japan 1989, Argentina).

---

## 14. Open questions for the next design pass

1. **Selling rules (1990):** courtage + capital-gains tax only, or also a cap on sells per year to force conviction?
2. **FI scenario deck:** exact card list; how do life cards interact with winning — pure flavor-with-cost, or can scenarios define non-financial win conditions?
3. **Unfunded drafted cards:** keep-as-option forever, expire after N years, or scenario-defined?
4. **Pack format versioning:** decide before the first shared pack exists, not after.
5. **Monte Carlo inputs (later, but shapes the data model):** where do per-fund volatility estimates come from, and are the five funds' returns modeled as correlated (they should be — independent draws across index funds that track overlapping markets would badly understate risk)?
