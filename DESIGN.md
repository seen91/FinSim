# FinSim — Design Specification

**Working title:** *Stacks*
**Status:** Founding document for the ground-up rewrite. No code from the previous prototype is carried over.
**One-liner:** A financial planning tool that plays like a card game — every financial instrument is a card, every card is a curve *f(t)*, and stacking cards composes them into your life's balance sheet.

---

## 1. What this is (and isn't)

The previous prototype proved the core insight: **all personal finance decomposes into simple curves over time** — salary is linear, investments are compound, tax is a negative multiplier, inflation is a universal decay. The card metaphor makes composing these curves tactile instead of spreadsheet-shaped.

What the prototype never resolved was the **grammar of stacking** — what it *means* to put one card on another. This spec's main job is to nail that down.

**This is:** a serious personal-finance modeling tool with the tactility, legibility, and delight of a modern card game (Slay the Spire's clarity of "card → visible effect", Balatro's joy of combos).

**This is not:** a game with win/lose states, HP, mana, RNG draws, or grinding. There is one optional game-flavored mode (Scenarios, §8), but the default experience is a sandbox where the only score is your projected net worth.

### Design pillars

1. **The chart is the truth.** Every action on the table updates one always-visible timeline. Cards are the controls; the curve is the consequence. Latency between "card touches stack" and "curve moves" must feel like zero.
2. **Stacking is composition.** A stack is a pipeline of math, read bottom-to-top. No hidden rules — flip any card to see its formula and parameters.
3. **Serious table, playful hands.** Interactions borrow from card games (fan, lift, snap, flip). Information design borrows from finance (tabular numerals, restrained color, honest axes). When the two conflict, finance wins.

---

## 2. Core concepts & glossary

| Term | Meaning |
|---|---|
| **Card** | One financial instrument or effect, defined by a curve or transform. |
| **Flow** | Money per month over time (kr/month). Salaries, rents, expenses. |
| **Balance** | Money at a point in time (kr). Accounts, assets, debts. |
| **Stack** | One base card plus zero or more modifiers on top of it. The atomic unit of play. |
| **Stream** | A visible routing of a flow-stack's output into a vessel (e.g. "surplus → index fund"). |
| **Table** | The play area where stacks live. |
| **Hand / Library** | Where unplayed cards wait. The Library is the full catalog; the Hand is a working subset. |
| **Horizon** | The simulation end date (default: today + 30 years). |

### The four card kinds

Every card is exactly one of these. Kind determines what it can stack on. This replaces the old `canStackOnto: string[]` allowlists with a type system.

| Kind | Band color | Produces | Examples | Stacks onto |
|---|---|---|---|---|
| **Source** | Gold | a Flow | Salary, side gig, rental income, child benefit | the Table (base of a stack) |
| **Modifier** | Slate | Flow→Flow or Balance→Balance transform | Income tax, inflation, annual raise, management fee, interest rate change | any Source, Vessel, or Debt stack |
| **Vessel** | Teal | a Balance (integrates inflows, applies growth) | Checking, savings, index fund, apartment, car | the Table (base of a stack) |
| **Debt** | Oxblood | a negative Balance (accrues interest, consumes flow) | Mortgage, student loan, car loan | the Table (base of a stack) |

*(A fifth kind, **Event**, exists only in Scenario mode — see §8.)*

---

## 3. The stacking grammar

This is the heart of the design. One rule, applied uniformly:

> **A stack is function composition, evaluated bottom-up. The base card produces a value; each modifier above it transforms the result of everything below it.**

### 3.1 Flow stacks

```
┌ Annual raise 3%  ┐   ← applied last
├ Income tax 32%   ┤   ← applied second
└ SALARY 39 000/mo ┘   ← base, evaluated first
```

Reads as: `raise(tax(salary))(t)`. Order matters and is player-controlled — putting the raise *below* the tax models a different (here identical, but e.g. flat deductions are not commutative) situation. The stack header shows the **net result**: "≈ 27 300 kr/mo, growing 3%/yr".

### 3.2 Balance stacks

```
┌ Mgmt fee −0.4%/yr ┐
├ Growth 7%/yr      ┤
└ INDEX FUND 250 000┘   ← vessel with opening balance
```

Vessels integrate: each month, balance ← modifiers(balance) + inflows.

### 3.3 Streams: routing flows into balances

A flow stack's net output must go somewhere. Two mechanisms:

- **Default routing:** every table has a permanent **Checking** vessel. All unrouted net flow lands there. This guarantees the model is always complete — nothing leaks.
- **Explicit streams:** drag a flow stack's output chip onto a vessel (or debt) to create a stream. A stream carries either a fixed amount ("5 000 kr/mo") or a percentage of the remaining flow ("20% of surplus"). Streams render as soft animated lines on the table — this is the "stack cards somehow" answer at the board level: stacks compose vertically, streams compose horizontally.

Debt vessels consume streams as payments (amortization + interest, computed by the card).

### 3.4 What stacking is NOT

- No `stackingMultiplier` magic numbers on cards. A card's effect is fully described by its own transform.
- No nested stacks-of-stacks. One level: base + modifiers. Cross-stack relationships are streams. (The old prototype's `NestedStack` was solving routing with geometry; streams solve it with semantics.)

---

## 4. The simulation model

Deterministic, discrete, monthly. No randomness in Sandbox mode.

- **Tick:** for each month *m* from start to horizon:
  1. Evaluate every flow stack at *m* (base curve, then modifiers bottom-up).
  2. Resolve streams in declared order; remainder to Checking.
  3. Update every balance stack: apply balance modifiers (growth, fees, interest), then add inflows.
- **Net worth(t)** = Σ vessel balances − Σ debt balances. This is the headline curve.
- **Engine is pure:** `simulate(table: Table, horizon: Date) → Series[]`. No state outside the table description. This makes ghost curves (§7), undo, and scenario diffing trivial.
- Curve primitives per card: linear, compound, exponential, sinusoidal (seasonal costs/bonuses), step (raises, rent changes), and a custom-formula escape hatch (sandboxed math expression). Same family as the prototype — that part was right.
- **Inflation is a table-level modifier**, not a per-card one: a global card slot ("Assumptions") holding inflation, and a toggle to display all curves in real vs. nominal terms.

---

## 5. Card anatomy

Cards are two-sided. **Front = meaning, back = math.** Tap/click to flip.

```
FRONT                              BACK
┌─────────────────────┐            ┌─────────────────────┐
│ ▮ gold band         │            │ f(t) = A·(1+r)^t    │
│  💼 Salary          │            │                     │
│                     │            │  A  opening   250k ─○──
│  +39 000 kr/mo      │            │  r  growth    7.0% ──○─
│  ~~~▁▂▃▄ sparkline  │            │                     │
│                     │            │  assumes: MSCI World │
│  "Monthly net...    │            │  30-yr avg, nominal  │
│  Tags: income, work │            │                     │
└─────────────────────┘            └─────────────────────┘
```

- **Front:** kind band, icon, name, headline number (signed, per-month for flows, absolute for balances), a sparkline of its own curve over the horizon, one-line description, tags.
- **Back:** the human-readable formula, each parameter as a **slider that live-updates the chart while dragging**, and an "assumptions" footnote (where the estimate comes from). Parameter editing on the back replaces the prototype's modal editors.
- **Color discipline:** green/red are reserved exclusively for money direction (inflow/outflow, above/below zero). Card kind is communicated by the band color only. Never use green/red decoratively.

---

## 6. The table — layout & interaction

Desktop / landscape tablet, single screen, no navigation for the core loop:

```
┌──────────────────────────────────────────────────────────────┐
│  TIMELINE  net-worth curve · vessel bands · goal lines       │ ~40%
│  ├─ today ─────────── scrubber ────────────── horizon ──┤    │
├──────────────────────────────────────────────────────────────┤
│  THE TABLE                                                   │
│   [Salary+Tax] ──stream──▶ [Checking]    [Index fund+Growth] │ ~45%
│        └────────20%───────────────────────────▲              │
│   [Rent −12k/mo]           [Mortgage −1.9M ◀── 8k/mo]        │
├──────────────────────────────────────────────────────────────┤
│  HAND  (fanned cards)                    [Library ▸] [＋ New] │ ~15%
└──────────────────────────────────────────────────────────────┘
```

### Interactions

- **Play a card:** drag from hand to table. Valid drop targets glow (kind system decides validity); invalid targets are inert, never error-modal.
- **Stack:** drop a modifier onto a stack — it slides in with a magnetic snap and the chart morphs (animated transition, never a redraw-flash).
- **Reorder / unstack:** drag a modifier out or within the stack; stacks fan slightly on hover so every card's header strip stays readable (solitaire cascade, not a pile).
- **Stream:** drag the output chip at a flow stack's top edge onto a vessel; a radial widget sets amount or %.
- **Flip:** tap a card; **edit:** drag sliders on the back.
- **Time scrub:** drag on the timeline to move a cursor; the table annotates every stack with its value *at that moment* ("in 2041 this stack yields 31 200 kr/mo"). This makes time tangible — the table is not static, it's a slice of the simulation.
- **Everything is undoable.** The table description is a small immutable document; every gesture is a diff.

### Game feel budget (the "playful hands" part)

Card lift + shadow on pickup, slight rotation following drag velocity, elastic hand fan, satisfying snap sound on stack, a soft chime when net worth crosses a goal line. Nothing screen-shaking, no particles, no juice on numbers — the numbers are sacred.

---

## 7. Modes

1. **Sandbox (default).** Everything above. One table = one financial life model. Multiple named tables ("Current plan", "If we buy the house").
2. **Compare.** Pin a table as a **ghost**: its net-worth curve renders dimmed behind your active table's curve. Answering "what does this decision cost me over 20 years?" is the product's killer feature, and it's just two curves.
3. **Goals.** Goal cards ("2M by 2035", "mortgage-free at 55") render as target lines/markers on the timeline with a live delta readout. Not gamified — no confetti, just an honest gap number.

---

## 8. Scenario mode (the Slay-the-Spire garnish — optional, post-MVP)

The one deliberately game-shaped mode, for stress-testing a plan and for learning:

- Your sandbox table is the "deck you brought". Time advances year by year along a **route** (StS map, but the nodes are years, some marked with events).
- At event nodes you draw an **Event card** (violet): *Recession — market vessels −25% now, growth −2% for 3 yrs*; *Job loss — salary stack suspended 6 months*; *Windfall*; *New child*; *Interest rate shock*.
- You respond by restacking with a limited number of **moves** per event (scarcity creates the puzzle), then the simulation runs to the next node.
- Score at the end is simply the net-worth curve you actually realized vs. your plan — a resilience report, not points. Seeded RNG so runs are shareable/replayable.

This mode is where card-game DNA earns its keep, but it must never leak mechanics (moves, events, routes) back into Sandbox.

---

## 9. Visual direction

**"Bloomberg terminal meets tarot deck."**

- **Palette:** warm paper/ink neutrals for the table; the four kind band colors (gold, slate, teal, oxblood) as the only identity hues; green/red strictly for money sign. Full light/dark themes from day one.
- **Type:** a serif display face for card names (the tarot half), a sans with **tabular numerals** for every number (the terminal half). Numbers never jiggle when they change width.
- **Texture:** subtle paper grain on cards, felt-like table surface — enough to feel physical, dialed far below Slay the Spire's painterliness. No character art. Card icons are engraved-style monochrome glyphs.
- **Chart:** the dataviz is austere and honest — no gradient fills below curves except a whisper for net worth, gridlines whisper-thin, axes always labeled, currency-formatted ticks.

---

## 10. Platform & technical stance

- **Local-first web app (PWA).** Personal financial data never leaves the device by default — everything persists to IndexedDB; export/import is a JSON file. This is both a privacy stance and a simplicity win (no backend at all for v1).
- **Stack:** TypeScript + React + Vite. Cards and table are **DOM elements** (not canvas) — the UI is text- and number-heavy, needs accessibility, and DOM+CSS transforms comfortably handle a few dozen cards. `dnd-kit` for drag/stack/stream gestures, `framer-motion` for the game-feel budget, `visx`/D3 for the timeline, `zustand` (or plain reducer) over an immutable table document.
- **The engine is a dependency-free pure TS module** with its own test suite — no framework imports. It's the part most likely to outlive any UI decision.
- Touch-first sizing so it works on iPad in the browser; wrap in Tauri later only if a desktop app is ever wanted.

---

## 11. Data model sketch

```ts
type Kind = 'source' | 'vessel' | 'debt' | 'modifier' | 'event';

interface Card {
  id: string;
  kind: Kind;
  name: string;
  icon: string;
  tags: string[];
  // exactly one of:
  flow?: Curve;                      // source: kr/month over t
  balance?: { opening: number; growth?: Curve };   // vessel/debt
  transform?: Transform;             // modifier: how it rewrites the value below it
  assumptions?: string;
}

type Curve =
  | { type: 'linear';     base: number; slope: number }
  | { type: 'compound';   base: number; rate: number }
  | { type: 'step';       base: number; steps: { at: Month; to: number }[] }
  | { type: 'sinusoidal'; base: number; amp: number; period: number; phase: number }
  | { type: 'custom';     expr: string };           // sandboxed

type Transform =
  | { type: 'scale';  factor: number }              // tax: 0.68
  | { type: 'add';    curve: Curve }                // flat deduction/addition
  | { type: 'rate';   deltaAnnual: number }         // growth/fee/raise
  | { type: 'custom'; expr: string };

interface Stack   { id: string; base: Card; modifiers: Card[]; pos: XY }
interface Stream  { from: StackId; to: StackId; rule: { pct: number } | { fixed: number }; order: number }
interface Table   { stacks: Stack[]; streams: Stream[]; assumptions: Card[]; start: Month; horizon: Month }
```

The whole table serializes to one small JSON document — that's the save file, the undo unit, and the compare unit.

---

## 12. MVP cut & roadmap

**MVP (prove the loop):**
- Sandbox mode, one table, ~15 built-in cards (salary, tax, expenses ×3, raise, inflation, checking, savings, index fund, mortgage, car loan, rent, side gig, goal).
- Stacking + reorder, default routing to Checking, one explicit stream type (% of surplus).
- Live net-worth timeline, time scrubber, card flip with slider editing.
- IndexedDB persistence, JSON export/import, light+dark.

**v1.1:** multiple tables + Compare ghosts, goal cards, custom card creator (the back of a blank card *is* the creator).
**v1.2:** fixed-amount streams, debt payoff strategies, real-vs-nominal toggle.
**v2:** Scenario mode with event deck and route map.

**Explicit non-goals:** bank sync, multi-user, budgets/receipts tracking, tax-jurisdiction accuracy (cards carry *your* assumptions; the tool is a modeler, not an advisor).

---

## 13. Open questions (decide during build, not now)

1. Should streams be first-class cards (an "Allocator" modifier card) instead of board-level edges? Cards are more consistent; edges are more visible. Current lean: edges, revisit after MVP playtest.
2. Monthly tick vs. continuous evaluation — monthly is chosen for correctness of routing; confirm performance at 50 stacks × 600 months (trivially fine, but verify before adding per-frame scrubbing).
3. Does the Hand earn its place in Sandbox, or should the Library drawer replace it entirely? The fan is charming but may be pure ceremony outside Scenario mode.
