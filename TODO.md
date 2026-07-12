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
- [x] Real-terms deflation `toReal` (`series.ts`) — engine-side only; the app renders nominal by design (taxes/inflation are modeled on cards)
- [x] Validation (`validate.ts`), test suite ending in the M1 acceptance scenario with the golden answer **"1 yr 3 mo"** (`test/acceptance.car.test.ts`)
- [x] `(expected, volatility?)` growth params, volatility ignored by v1

Gaps discovered later:

- [x] **Multiple tick resolutions** → **card cadence** (decision "Card cadence" recorded in DESIGN.md §0, 2026-07-12): sources and fixed-amount drains may declare `cadence: weekly | biweekly | quarterly | yearly` (default monthly) — the period their amount is expressed in; the tick normalizes it to kr/month with fixed average factors (weekly ×52⁄12, biweekly ×26⁄12, quarterly ×⅓, yearly ×1⁄12). The base tick stays monthly; percent drains/takes are per-tick shares and carry no cadence; yearly amounts are smoothed, not fired in one month. (`types.ts` `Cadence`, `curves.ts` `periodsPerMonth`, validated in `validate.ts`, tested in `simulate.test.ts`/`validate.test.ts`. The Workshop card editor is where cadence gets a UI — M2.)

## M1 — Simulator v1 ✅ done

Done:

- [x] Circular-fan table (v3 layout): arena chart, main hand fanned on a virtual circle, nested hands as stacks, drill-in with breadcrumb
- [x] Timeline with scrubber, goal line, compact goal + start date editing
- [x] Draw pile / library; play by click, binary membership (active vs pile)
- [x] Drag-to-reorder along the arc (order is load-bearing)
- [x] Decision bundles with **automatic ghost compare** and time-to-goal verdict on the bundle stack
- [x] Editable cash vessel + monthly-flow spout, stacked bottom-left with "accumulated" / "monthly" captions (Undo/Redo/Reset removed by design — re-play the card instead; `?fresh` deals the starter over the saved table)
- [x] IndexedDB persistence (`db.ts`), local-first
- [x] Starter table: budget in root hand, "Buy the car" + "Buy a flat" bundles in the pile (`starter.ts`, `presets.ts`)
- [x] D&D quest-ledger aesthetic, tabular numerals, green/red only for money direction; currency-agnostic (no unit anywhere, compact M/k amounts)
- [x] **JSON export/import** of the table document (`exchange.ts`, versioned envelope, topbar Export/Import; DESIGN §11)
- [x] **Taxes as cards** (decision 2026-07-06, supersedes the real/nominal and Sweden-rules toggles, both removed): engine `event` cards are playable — a card carrying a `ScheduledRule` scoped to the hand it sits in. The **ISK tax card** (yearly December `balanceTax` on `fund`-tagged assets) ships in the default hand; users model any regime explicitly (event/drain card) or implicitly (lower a card's expected return). Engine `toReal` and world-rule hooks remain for later packs.
- [x] **PWA offline**: `vite-plugin-pwa` service worker precaches the app; verified offline reload + play in a headless browser
- [x] Acceptance pass in the running app (headless Chrome): default (ISK-taxed) table reads "goal in 20 yr 6 mo", car played → "+1 yr 5 mo to goal"; the hand-checked ISK-free golden scenario ("1 yr 3 mo", chart "20 yr 8 mo") is pinned by `app/test/app.test.ts` via `goldenDoc()`

Remaining gaps (both resolved 2026-07-12):

- [x] `editors.ts` **deleted** (not wired) so the Workshop starts clean — see the M2 note below about bringing back a quick what-if tool afterwards
- [x] Taxes-as-cards decision recorded in DESIGN.md §0/§7/§8 (plus §7 Anatomy aligned with the v3 "tuning lives in the Workshop" rule)

## M2 — Workshop v1 ✅ done (2026-07-12)

Spec: DESIGN §3. The Workshop opens from the diamond button in the draw pile:
a workbench (`Workshop.tsx`) that unfolds over the lower table, leaving the
chart visible above. It works in **two stages** so each holds one thought:
**browse** (one shelf of small cards — blank card first, then everything;
cards currently in play wear a small 'in play' plaque instead of their own section) and
**focus** (click a card and everything else clears: the bench holds only that
card's face and back-editor, and the chart above holds only that card's curve —
balance or cumulative effect for cards in play, a solo run for designs).
Escape steps back out: focus → browse → closed.

- [x] Card back as editor (`CardEditor.tsx`, built fresh): every card on the table flips to its math — name, tags, kind-specific parameters as live slider+field pairs, all curve primitives editable (constant, linear, compound, step, sinusoidal, sampled-by-id, expression with compile-guarded commit so a broken formula never reaches the sim), cadence, takes, rule schedule/target/effect
- [x] Blank-card authoring: blank tile → pick kind (source/drain/asset/debt/rule; hands are composed on the table) → tune math → front matter (sigil picker, description, assumptions footnote). Blanks are born structurally valid (`blankCard` tested against `validateTable`)
- [x] Personal library (`authored.ts`): designs persist in IndexedDB alongside the table doc (`library-v1` key, `db.ts`), survive `?fresh`, play with fresh ids (`instantiate`), and show under "Your designs" in the draw pile
- [x] **Pack format** (`packs.ts`) — **versioning decided (§14.4, mirrors the table file): `format: 'finsim-pack'` + one integer `version`; additive optional fields never bump it (readers ignore unknown fields, writers keep them); breaking shape changes bump it and must migrate-or-reject with a readable message; readers reject newer versions.** v1 carries instrument cards (engine template + front matter) and data series; `rules`/`scenarios` fields are reserved for the game layers (the simulator plays rules as cards). Recorded in DESIGN.md §0 (2026-07-12).
- [x] Pack export/import as files (Workshop header; import merges cards by id and pack series into `world.series`)
- [x] What-if tool on the table: **tuning dials** (`tune.ts`, commit `be350c6`) — the slider under each editor parameter scrubs a −100..+100 % dial kept separately on the card JSON and stripped at the sim boundary; the authored value never moves, double-click re-centers

Verified: 128 unit tests green (`workshop.test.ts` covers blank validity, fresh-id
plays, replaceCard, pack round-trip/version-rejection/merge), headless Chrome run
— slider edit moves the chart verdict live, blank→author→play→export→burn→import
round-trip, golden baseline "goal in 20 yr 6 mo" intact.

## M3 — Simulator complete: verification + Monte Carlo ❌ not started

Spec: DESIGN §13 M3 (build order re-ordered 2026-07-12, §0): finish the core
product — confident answers to "how much does this cost me relative to my
goal" — before any game work. Two kinds of confidence, in order:

**(a) The software computes the right number** (engine/UI correctness):

- [ ] Custom-cards acceptance pass: the M1 question answered end-to-end through the M2 path — author *every* card fresh in the Workshop (no starter pack), build the table, play a car bundle, verdict matches a hand-checked expectation
- [ ] Pin that pass as a headless test beside the existing golden baseline (`app/test/app.test.ts`)

**(b) The number reflects an uncertain world** (Monte Carlo):

- [ ] Decide §14.5 first: per-fund volatility sources + correlated draws across funds (independent draws across overlapping index markets would understate risk — worse than deterministic)
- [ ] Engine: seeded Monte Carlo runs over `(expected, volatility)` — percentile bands, goal-probability curve; deterministic mode untouched
- [ ] App: percentile fan on the arena chart; bundle verdicts gain a range read ("+1–2.5 yr in 80 % of futures")
- [ ] Document return semantics: `expected` is CAGR, so the deterministic path ≈ median path (volatility drag) — a Rulebook line / assumptions footnote, not code

**(c) Simulator polish pass:** whatever daily use surfaces once (a) and (b) exist.

## M4 — Game prototype, hot-seat ❌ not started

Spec: DESIGN §4–5. Purpose: find out if the game is fun before building sync.

- [ ] "1990: The Decade Trade" scenario data pack: ~30–60 real instruments, monthly closes, listing dates, period-accurate descriptions, epistemic rule (trailing data only)
- [ ] Round loop: DEAL → DRAFT (pick 1, pass, last card discarded) → COMMIT → SIMULATE (year replay) → INTERIM (year-winner bonus from the bank)
- [ ] Single-device "look away" drafting, deliberately ugly
- [ ] Final scoring + real-history epilogue (2000–2002 scroll)
- [ ] Decide open question §14.1: selling rules (courtage + tax only, or sell cap per year)

## M5 — Own-devices multiplayer ❌ not started

Spec: DESIGN §9. Room codes, `/table` host + `/hand` player routes, WebSocket relay (stores nothing), host-authoritative simulation, market replay done properly.

## M6 — FI scenario + Sweden pack deep ❌ not started

Spec: DESIGN §6. Full locale rules (ISK, ränteavdrag, amorteringskrav, jobbskatteavdrag), shared world events, life cards. Decide open questions §14.2 (FI deck / life-card win conditions) and §14.3 (unfunded drafted cards).

## M7 — Polish ❌ not started

Epilogues, replays, sound (paper slides, monthly tick, year stamp), compare ghosts in game post-mortems.

## Later (explicitly deferred)

Stress tests beyond Monte Carlo (sequence-of-returns, historical replay of your plan through 2008), solo bots, pack registry/sharing, more eras (1929, 1970s, 2008, Japan 1989, Argentina).
