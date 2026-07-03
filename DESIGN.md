# FinSim — Design Specification (v2)

**Working title:** *Bokslut* (or *Stacks*; TBD)
**Status:** Founding document for the ground-up rebuild on the `cleanSlate` branch. Nothing from the previous prototype carries over except the core insight.
**One-liner:** A deliberately boring multiplayer card game about money — drafted cards, real historical curves, real(istic) rules — running on a simulation engine rigorous enough to double as a serious financial planner.

---

## 0. Decision log

| Decision | Status | Choice |
|---|---|---|
| Multiplayer form | ✅ **Confirmed** | Same room, own devices: one player hosts, friends join with a room code. Host screen is the shared table; phones/laptops hold hidden hands. |
| Product focus | ⚠️ Assumed | **Game first.** Scenarios are the product; the engine underneath is built to full simulator rigor so a standalone planner mode can be added later without rework. |
| Player interaction | ⚠️ Assumed | **Race + shared world.** Same passed hands, same market, same events. You compete on outcomes and by denying cards in the draft — never by attacking. |
| Jurisdiction realism | ⚠️ Assumed | **Generic engine, Sweden pack first.** The engine knows no jurisdictions; rules ship as data (SEK, ISK, ränteavdrag, amorteringskrav). |

⚠️ = my recommendation, adopted provisionally — override any of these and the doc updates.

---

## 1. Vision

Two products, one engine, built in this order:

1. **The game** — scenario-driven, 2–6 players in a room, pick-and-pass drafting (the 7 Wonders / Sushi Go mechanic), rounds that represent years, outcomes computed by honest simulation of curves f(t).
2. **The simulator** — the same engine exposed as a single-player sandbox/planner later. Not designed in detail here, but every engine decision below is made so this stays cheap to add.

### Boring is the goal

This is the anti-Slay-the-Spire stance, stated as design law:

- **No fantasy.** Real companies, real decades, real tax rules. The theme is the mechanic.
- **The drama is the data.** The most exciting moment in the game is watching a year of real market history replay on the shared screen while your drafted portfolio lives through it.
- **Honesty over juice.** No crits, no combos labels, no screen shake. Numbers use tabular numerals and never lie. The aesthetic target is *an annual report you fight over with friends*.
- **Losing teaches.** Every scenario ends with an epilogue showing what happened next in reality (draft heavy into dot-coms in 1999 → the game shows you 2000–2002).

### Why f(t) survives the reset

The old prototype's curve model was right about consequences but had no *decisions* — a continuous simulation gives the player nothing to do. The fix is structural: **the engine simulates time continuously (monthly ticks); the game interrupts time at intervals (rounds) to deal decisions.** Cards are still curves; rounds, drafting, and goals are what was missing.

---

## 2. The universal game shape

Every scenario is an instance of one loop:

```
SETUP      scenario defines: era, goal, deck(s), starting position, horizon
  │
ROUND      (usually = 1 year, scenario-configurable)
  │  1. DEAL    each player receives a hand (default 7) from the era deck
  │  2. DRAFT   pick 1 card, pass the rest left; repeat until K picks (default 3),
  │             remainder discarded face-up (public information)
  │  3. COMMIT  on your own device: play drafted cards into your ledger,
  │             allocate cash, buy/sell within the scenario's trading rules
  │  4. SIMULATE the engine runs the year month-by-month; the host screen
  │             replays it as a live market/news ticker; ledgers update
  │  5. INTERIM  year results: standings, and the year-winner bonus if the
  │             scenario has one
  │
FINAL      scoring per scenario goal → results screen → real-history epilogue
```

Key vocabulary:

| Term | Meaning |
|---|---|
| **Scenario** | A data-defined game module: era, deck, goal, rules, tunables. |
| **Era deck** | The card pool for a scenario, possibly changing per round (1993's IPOs appear in 1993). |
| **Ledger** | A player's private tableau: their cards, cash, positions, and household — lives on their own device. |
| **Table** | The shared host screen: race chart, market replay, events, discards, standings. |
| **Round / Year** | One decision-simulation cycle. |

### Drafting notes

- Pick-and-pass with hidden hands is *the* reason for own-device multiplayer. Passing direction alternates per round (left, then right) as in 7 Wonders.
- Drafting is simultaneous — no waiting for turns. The host screen shows who's still deciding.
- Discards are public. Knowing what everyone *didn't* take is information.
- Hate-drafting (taking a card to deny it) is the only direct interaction in the game, and it's enough.

---

## 3. Flagship scenario A — *"1990: The Decade Trade"*

**Goal:** highest net worth on 31 Dec 1999. **Players:** 2–6. **Length:** 10 rounds ≈ 45–60 min.

- Everyone starts with the same cash (default 100 000 kr) and an empty portfolio.
- The era deck is **real equities with real monthly price data**: Microsoft, Intel, Nokia, Ericsson, GE, Coca-Cola, Enron, AOL, pets.com-era IPOs appearing in their actual listing years… plus bonds, an index fund, and a savings account as the boring anchors.
- **A card only shows what was knowable at the in-game date.** Front: company name, sector, a 3-year *trailing* sparkline, dividend yield, a volatility grade, and a period-accurate one-line description ("Finnish conglomerate; rubber boots, cables, and now mobile telephones"). No survivorship hints, no logos from the future.
- COMMIT phase: allocate cash across drafted cards; selling existing positions allowed only during this window (with a small spread/courtage — Sweden pack supplies realistic fees and capital-gains tax).
- SIMULATE: the host screen replays the year month-by-month — a ticker, the race chart of everyone's net worth, and 2–4 curated period headlines ("1997: Asian currency crisis") that explain what players are watching.
- **Year-winner bonus:** best portfolio return (%) that year receives a cash bonus (default: 10 % of starting capital, paid by the bank — not zero-sum, per the race-not-war stance). This rewards yearly risk-taking and keeps trailing players in the game.
- **Epilogue:** the final screen scrolls forward through 2000–2002 with everyone's *final* portfolio held frozen. The dot-com lesson delivers itself.

Why this is the first scenario to build: it needs no household modeling, no jurisdiction rules beyond fees/tax on trades, and its fun depends only on drafting + real data + the replay moment — the smallest thing that proves the whole concept.

---

## 4. Flagship scenario B — *"Financial Independence First"*

**Goal:** first player to reach FI — passive income ≥ living expenses for 12 consecutive months (equivalently: liquid net worth ≥ 25× annual expenses; exact definition is a scenario tunable). **Length:** up to 30 rounds/years, expected win around year 15–25; if no one reaches FI by the horizon, highest FI-ratio wins.

- Everyone starts from the same household baseline: a salary, rent, living expenses, some savings. (Variant for later: draft your starting life — job, city, flat — in round 0.)
- The era deck mixes card kinds: **assets** (index funds, rental flat, förräntningskonto), **income moves** (career change, side business, negotiate raise), **expense changes** (move somewhere cheaper, car vs no car), **instruments** (ISK vs depot, amortize vs invest), and **life** (kids, sabbatical — cards with honest costs and no scoring value, which some players will draft anyway; that's the point).
- **Shared world events** between rounds hit everyone identically: rate hikes, a 2008-style crash, tax reform, inflation spikes. Scripted per scenario seed, not random per player.
- The **Sweden pack** is what makes this boring-in-the-good-way: ISK schablonskatt vs 30 % capital gains, ränteavdrag on mortgage interest, amorteringskrav tiers, jobbskatteavdrag. All data, not code (§6).
- This scenario exercises the full **stacking grammar** (§5): your salary stack wears tax and raise modifiers; your fund stack wears fees; your mortgage consumes a stream of your surplus.

---

## 5. Card system

### Kinds

Every card is exactly one kind; kind determines where it can be played. This is a type system, not per-card allowlists.

| Kind | Produces | Examples |
|---|---|---|
| **Source** | a flow (kr/month) | salary, side business, rental income |
| **Asset** | a balance with a growth curve | stocks (historical curve), funds, property, savings |
| **Debt** | a negative balance accruing interest | mortgage, student loan |
| **Modifier** | a transform on the stack below it | income tax, fund fee, raise, amortization rule |
| **Event** | a scripted world change (scenario-dealt, never drafted) | crash, rate hike, tax reform |

### Stacking grammar (one rule)

> A **stack** is a base card (source/asset/debt) plus modifiers, evaluated bottom-up as function composition. `raise(tax(salary))(t)`. One level deep — no stacks of stacks.

Cross-stack routing is a **stream**, not a stack: "40 % of monthly surplus → index fund" is an edge in the ledger, set during COMMIT. Every ledger has a default cash account that catches unrouted flow, so the model never leaks money.

### Anatomy

Two-sided. **Front = meaning** (kind band, name, headline number, trailing sparkline, one-line period-accurate description). **Back = math** (the formula, parameters, assumptions, source of data). Tap to flip. In the game, backs are mostly read-only; in the future simulator mode, backs are where you edit parameters.

**Epistemic rule, worth repeating:** a card front may only display information available at the current in-game date.

---

## 6. The engine

Pure, deterministic, dependency-free TypeScript module. No framework imports, own test suite. This is the part that must be simulator-grade from day one.

- **Tick:** monthly. Each month: evaluate flow stacks bottom-up → resolve streams in order, remainder to cash → update balances (growth/interest/fees, then inflows).
- **`simulate(ledger, world, from, to) → Series[]`** — no hidden state. Ghost curves, replays, undo, and "what if" diffs are all just calls.
- **Determinism everywhere:** shuffles and event schedules are seeded per game. A finished game is fully reproducible from `(scenario, seed, decisions)` — which is also the save format and the spectator/replay format.
- **Curve primitives:** linear, compound, step, sinusoidal, **sampled** (real historical monthly data — the 1990 scenario's card type), and a sandboxed custom expression as escape hatch.
- **Jurisdiction as data:** the engine exposes hooks (flow transforms, balance transforms, scheduled rules); a locale pack (Sweden first) is a JSON/TS data file wiring real rules into those hooks. No `if (sweden)` anywhere.
- **Historical data as packs:** each era scenario bundles a static, curated dataset (~30–60 instruments, monthly adjusted closes, dividends, listing/delisting dates, period descriptions). Shipped with the app; no live APIs, no licensing surprises (source from free monthly-resolution datasets; curation is an authoring task, not an engineering one).

---

## 7. Multiplayer architecture

**Jackbox model, host-authoritative.**

- **Host screen** (laptop on the table / TV): the shared Table — race chart, market replay, event announcements, public discards, standings, and "waiting for Anna…" draft status.
- **Player devices** (phones): the private Ledger — hidden hand, drafting UI, commit/allocation UI, own net-worth detail.
- The host device runs the entire simulation (the engine is pure and light — 6 players × 600 months is trivial). Player devices are thin views sending decisions and receiving state.
- **Join flow:** host creates room → 4-letter room code → players open the same web app on their phones and enter it. No accounts.
- **Sync layer:** a minimal WebSocket relay (host ↔ players; the relay stores nothing and understands nothing — it forwards messages). Deterministic state + full-state broadcasts make reconnects trivial: rejoin, receive current state doc, continue. Local-network-only fallback is possible later; a tiny hosted relay is the pragmatic v1.
- **Same codebase, two routes:** `/table` (host) and `/hand` (player) are views of one app.

---

## 8. Visual direction

**"An annual report you fight over with friends."** Evolved from v1's "Bloomberg terminal meets tarot deck", turned further toward boring:

- Warm paper and ink; the five kind-band colors are the only identity hues; green/red reserved strictly for money direction. Light + dark from day one.
- Serif display for card names and scenario titles (the annual-report half); a sans with **tabular numerals** for every figure (the terminal half). Numbers never jiggle.
- Card faces look like beautifully set index cards, not game art: engraved monochrome sector glyphs, no illustrations, no characters.
- The market replay is the one place motion is spent: the ticker advances, curves draw, headlines slide in. Everything else is calm.
- Sound: paper slides, a single soft tick per simulated month, a page-turn on year end. No fanfares — the year-winner gets a dry stamp: *"Årets resultat: Anna. +14,2 %."*

---

## 9. Platform & tech

- **TypeScript + React + Vite web app**, PWA. One deploy serves host and players; nothing to install at game night.
- **Engine:** pure TS package (`/engine`) with exhaustive tests — the long-lived asset.
- **UI:** DOM (not canvas) — the interface is text and numbers; accessibility and speed of iteration win. `framer-motion` for the few earned animations, `dnd-kit` for drag interactions in the ledger, `visx`/D3 for the race chart and replay.
- **Sync:** WebSocket relay (PartyKit/Durable Object or a ~100-line Node relay). Protocol: JSON state docs + decision messages. Host-authoritative, seeded-deterministic.
- **Persistence:** games are `(scenario, seed, decisions)` tuples — a few KB. LocalStorage/IndexedDB on the host; export/share as a file or link.
- **Scenarios are data**, not code: a scenario file declares era, deck composition, tunables, goal function, event script, epilogue. This is what makes "a fairly advanced financial simulator *as well as* a card game" one product — and lets us (and eventually players) author new scenarios without touching the engine.

---

## 10. Tunables (proposed defaults — all playtest fodder)

| Tunable | Default | Notes |
|---|---|---|
| Players | 2–6 | Draft degrades below 3; solo needs bots (later). |
| Hand size | 7 | Your memory of the mechanic; matches 7 Wonders. |
| Picks per round | 3 | Full 7-card drafts make years drag; 3 keeps a 10-round game under an hour. |
| Round length | 1 year | Scenario-configurable. |
| Year-winner bonus | +10 % of starting capital, from the bank | Not zero-sum. Alternative: a shared pot everyone feeds — more cutthroat, revisit in playtest. |
| Starting capital (1990) | 100 000 kr | |
| FI definition | passive income ≥ expenses for 12 consecutive months | Alternative: net worth ≥ 25× annual expenses. |
| Trading windows | COMMIT phase only | Mid-year trading would kill the drafting tension. |

---

## 11. Build order

**M0 — Engine core.** Curves, stacks, streams, monthly tick, seeded determinism, sampled-data curve type. Tests. No UI.
**M1 — 1990 scenario, hot-seat prototype.** Single device, pass-around drafting with a "look away" screen. Ugly UI. Purpose: find out if the game is fun *before* building sync. (This is the cheap insurance against the "did the concept actually work out" doubt.)
**M2 — Own-devices multiplayer.** Room codes, host table, phone hands, the market replay done properly.
**M3 — Sweden pack + FI scenario.** Household stacks, streams, locale rules, shared events.
**M4 — Polish + epilogues + replays.** Sound, standings, share-a-replay.
**Later:** simulator/sandbox mode, scenario authoring UI, bots for solo, more eras (1929, 1970s stagflation, 2008, Japan 1989).

---

## 12. Open questions for playtesting / next design pass

1. **Draft depth:** is 3 picks per year right, or should early years draft more (building) and late years fewer (managing)?
2. **Bonus mechanics:** bank-paid bonus vs shared pot; flat vs scaling; does a *streak* bonus create runaway leaders?
3. **Selling rules (1990):** courtage + capital-gains tax only, or also a limited number of sells per year to force conviction?
4. **FI scenario deck:** exact card list and how life cards (kids, sabbatical) score — pure flavor-with-cost, or do scenarios define non-financial win conditions?
5. **Card scarcity:** in a 4-player draft, are stock cards unique (only one Microsoft position exists) or copies (everyone can hold Microsoft, differing only in when they bought)? Current lean: copies — it's a race, and uniqueness is hate-draft enough.
6. **Name.** *Bokslut*? *Stacks*? Something else?
