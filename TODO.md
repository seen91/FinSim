# TODO

Tracks build progress against `DESIGN.md` §13 (build order). DESIGN.md stays the
source of truth for *what* and *why*; this file only tracks *done / not done*.
Update it when a milestone item lands or a new gap is discovered.

## M0 — Engine core ✅ done

- [x] Pipeline tick: hand played top to bottom, nested hands scope, cash catches the remainder (`engine/src/simulate.ts`)
- [x] Curve primitives: constant, compound, step, sinusoidal, sampled, sandboxed expression (`curves.ts`, `expression.ts`)
- [x] Seeded determinism (`rng.ts`), integer month index (`month.ts`)
- [x] Pack/locale rule hooks: `flowTax`, `balanceScale`, `balanceTax` scheduled rules — no `if (sweden)` (`types.ts`)
- [x] Goal solver `firstCrossing` (`goals.ts`)
- [x] Real-terms deflation `toReal` (`series.ts`) — engine-side only, no UI yet (see M1 gaps)
- [x] Validation (`validate.ts`), test suite ending in the M1 acceptance scenario with the golden answer **"1 yr 3 mo"** (`test/acceptance.car.test.ts`)
- [x] `(expected, volatility?)` growth params, volatility ignored by v1

## M1 — Simulator v1 🔶 mostly done

Done:

- [x] Circular-fan table (v3 layout): arena chart, main hand fanned on a virtual circle, nested hands as stacks, drill-in with breadcrumb
- [x] Timeline with scrubber, goal line, compact goal + start date editing
- [x] Draw pile / library; play by click, binary membership (active vs pile)
- [x] Drag-to-reorder along the arc (order is load-bearing)
- [x] Decision bundles with **automatic ghost compare** and time-to-goal verdict on the bundle stack
- [x] Undo (with slider-drag coalescing), editable cash vessel, monthly-flow spout
- [x] IndexedDB persistence (`db.ts`), local-first
- [x] Starter table: budget in root hand, "Buy the car" + "Buy a flat" bundles in the pile (`starter.ts`, `presets.ts`)
- [x] D&D quest-ledger aesthetic, tabular numerals, green/red only for money direction

Remaining gaps:

- [ ] **JSON export/import** of the table document (DESIGN §11 — local-first requires it as the backup/share path)
- [ ] **Real vs nominal toggle** in the UI — engine `toReal` exists but nothing calls it
- [ ] **Starter Sweden pack rules**: presets are cards only; no locale rules (ISK schablonskatt etc.) are wired into `world.rules` from the app yet
- [ ] **PWA offline**: `manifest.webmanifest` exists, but there's no service worker — app doesn't work offline
- [ ] `editors.ts` (card-back parameter sliders) is written but unused — per the v3 decision, tuning lives in the Workshop; wire it there in M2 or delete it
- [ ] Manual acceptance pass: run the app, play the car, confirm the on-screen verdict matches the engine's "1 yr 3 mo"

## M2 — Workshop v1 ❌ not started

The Workshop button in the draw pile is a disabled placeholder (`DrawPile.tsx`).
Spec: DESIGN §3.

- [ ] Card back as editor: flip a card, tune parameters with live sliders (reuse/wire `app/src/editors.ts`)
- [ ] Blank-card authoring: pick kind → curve primitive → parameters → front (name, icon, tags) → assumptions footnote
- [ ] Personal library (authored cards persisted alongside the table doc)
- [ ] **Pack format** (JSON: instrument cards, locale rules, data series, scenarios) — decide versioning *first* (open question §14.4)
- [ ] Pack export/import as files

## M3 — Game prototype, hot-seat ❌ not started

Spec: DESIGN §4–5. Purpose: find out if the game is fun before building sync.

- [ ] "1990: The Decade Trade" scenario data pack: ~30–60 real instruments, monthly closes, listing dates, period-accurate descriptions, epistemic rule (trailing data only)
- [ ] Round loop: DEAL → DRAFT (pick 1, pass, last card discarded) → COMMIT → SIMULATE (year replay) → INTERIM (year-winner bonus from the bank)
- [ ] Single-device "look away" drafting, deliberately ugly
- [ ] Final scoring + real-history epilogue (2000–2002 scroll)
- [ ] Decide open question §14.1: selling rules (courtage + tax only, or sell cap per year)

## M4 — Own-devices multiplayer ❌ not started

Spec: DESIGN §9. Room codes, `/table` host + `/hand` player routes, WebSocket relay (stores nothing), host-authoritative simulation, market replay done properly.

## M5 — FI scenario + Sweden pack deep ❌ not started

Spec: DESIGN §6. Full locale rules (ISK, ränteavdrag, amorteringskrav, jobbskatteavdrag), shared world events, life cards. Decide open questions §14.2 (FI deck / life-card win conditions) and §14.3 (unfunded drafted cards).

## M6 — Polish ❌ not started

Epilogues, replays, sound (paper slides, monthly tick, year stamp), compare ghosts in game post-mortems.

## Later (explicitly deferred)

Monte Carlo mode (percentile fans, goal probability — needs §14.5: correlated fund volatilities), solo bots, pack registry/sharing, more eras (1929, 1970s, 2008, Japan 1989, Argentina).
