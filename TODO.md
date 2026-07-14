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

## M3 — Simulator complete: verification + Monte Carlo 🟡 (a) + (b) done 2026-07-12; (c) open

Spec: DESIGN §13 M3 (build order re-ordered 2026-07-12, §0): finish the core
product — confident answers to "how much does this cost me relative to my
goal" — before any game work. Two kinds of confidence, in order:

**(a) The software computes the right number** (engine/UI correctness): ✅

- [x] Custom-cards acceptance pass: the M1 question answered end-to-end through the M2 path — every card born as a Workshop blank (no starter pack, no presets), edited to the golden numbers, validated, round-tripped through a pack export/import, dealt with fresh ids and played onto an empty table with the app's own gestures (`addCard`/`moveCard`); the verdict reproduces the hand-checked closed-form answer (car = 1 yr 3 mo, 2045-06 → 2046-09)
- [x] Pinned beside the golden baseline: `app/test/acceptance.workshop.test.ts`

**(b) The number reflects an uncertain world** (Monte Carlo): ✅

- [x] §14.5 decided (recorded in DESIGN.md §0 "Monte Carlo model"): volatility is card-authored (`growth.volatility`, annual σ); correlation is one shared market factor with per-card loading `growth.correlation`, default 1 — overlapping funds move as one unless the author says otherwise
- [x] Engine: `monteCarlo(table, world, from, to, {paths, seed})` — seeded paths via a shock hook on `simulate` (deterministic mode untouched), `percentileBand`, `crossingMonths`, `goalProbability`, `quantile`; streams seeded by (seed, path, card id) so ghost tables share shocks — per-path deltas are noise-free (common random numbers). Tested in `engine/test/montecarlo.test.ts`
- [x] App: P10–P90 fan behind the net-worth line (`mc.ts`, 200 paths, one fixed seed, computed deferred so the deterministic line stays instant); the plan's verdict gains "in NN % of futures"; hand bundles gain the range read ("+1 yr – 2 yr 6 mo in 80 % of futures", falling back to a goal-odds shift when few paths cross both ways); "moves with market" (correlation) editable on the asset's back
- [x] Return semantics documented: `expected` is CAGR ≈ the median path, volatility drag stated — Rulebook section "The fan: futures, not promises" + the index-fund card's footnote

**(c) Simulator polish pass:** whatever daily use surfaces once (a) and (b) exist — open, by design; it accrues from Sebastian using the table.

- [x] **Backtesting: historical cards + the start date as the time machine** (decision "Backtesting" in DESIGN.md §0, 2026-07-12, revised same day): import historical monthly data in the Workshop's **Data bench** (paste/file, bare values or `YYYY-MM,value` rows, consecutive-month validation, total-return + currency hints) → series lands in `world.series` and mints a priced-asset design in the library; series list with coverage + delete-only-when-unworn; pack export carries worn series; blueprints/presets can carry series too (draw pile's synthetic **Demo index fund**, 1970–2025). Backtesting is **moving `doc.from` into the past** — the short-lived `doc.replayFrom` re-anchoring (and `engine/src/replay.ts`) was replaced the same day; legacy docs lift the anchor into `from` on migrate. When a series ends mid-horizon the card's `growth` is the generic fallback (price extrapolates from the last real value; Monte Carlo shocks that stretch and only that stretch — `hasVolatility` in `mc.ts` knows); no `growth` = frozen price; a sampled flow ends at 0; a start before the data is a readable banner. Tested: `engine/test/backtest.test.ts` (hand-checked golden priced scenario on real dates, fallback/freeze/shock-boundary math), `app/test/backtest.test.ts` (parser, mint with fallback, start-date backtests, fan-opens-where-data-ends, legacy-anchor migration, doc/pack round-trips), headless Chrome pass
- [x] **One card — instances, not clones** (decided 2026-07-14; landed 2026-07-14, recorded in DESIGN.md §0): killed the design/one-off split permanently. Before, a played card was a deep clone of its template that may or may not wear a `design` stamp, so two identical-looking drains behaved differently in the Workshop (found 2026-07-14: stamped copies follow design edits, unstamped one-offs edit alone). The model as built (`instances.ts`, `builtins.ts`; table file v2 in `exchange.ts`, migration in `model.ts` `migrateDoc`; acceptance pinned in `app/test/instances.test.ts`, verified headless):
  - **Every leaf card on the table is an instance of exactly one canonical card** — a reference plus per-copy state (`{id, ref, tune?, enabled?}`), resolved to its template at the sim boundary (the same seam where `applyTune` already lives). No cloned math on the table: a Workshop edit of the canonical card reaches every copy *by construction*, and `patchAuthored`'s copy-patching loop, the `design` stamp, and `designIdOf`'s legacy id-suffix heuristic all die.
  - **Canonical cards come in two species.** Your library designs: editable in the Workshop, an edit is an edit of every instance. Built-ins (pile blueprints, preset members, starter cards): **read-only** — their instances play and dial like any card, but changing the math takes an explicit "copy to shelf", which mints a design from the template **and re-points every table instance of that built-in to the new design** (the only reading consistent with "change once, all copies change"); from then on it is an ordinary design.
  - **Per-copy state is exactly**: the ±% tuning dials (`tune`), set-aside (`enabled`), and position in its hand. Name, math, glyph, description, tags live on the canonical card. Two different Rents = duplicate the design, not a divergent copy.
  - **Hands stay table-only compositions** (DESIGN §3: composed on the table, not authored); only source/drain/asset/debt/rule are canonical. A preset hand imports instances of its member cards.
  - Consequences to handle: table export/import must carry the designs its instances reference (as packs already carry worn series) — doc format version bump + migration (stamped copies → instances of their design; unedited one-offs recognizable as built-ins → re-point at the built-in; edited orphans → mint into the library); the Workshop's one-off focus stage and the 2026-07-14 "to shelf"/burn tools collapse into the built-in mint path; chart focus, ghosts and Monte Carlo resolve instances before simulating.
  - Acceptance: draw three copies of a built-in drain → copy to shelf → edit the design → all three change on the table; dial one copy → only that copy moves; set one aside → the others keep playing; golden baselines ("goal in 20 yr 6 mo", car "+1 yr 5 mo", golden "1 yr 3 mo") intact through migration.

## M4 — Game prototype, hot-seat ✅ done (2026-07-13)

Spec: DESIGN §4–5. Purpose: find out if the game is fun before building sync.
Lives behind `/#game` (the simulator route is untouched); everything under
`app/src/game/`, playtest-ready.

- [x] "1990: The Decade Trade" scenario data pack (`scenario1990.ts` + `series1990.json`): **41 real instruments** — split/dividend-adjusted monthly closes 1987–2002 fetched from Yahoo Finance, rebased to 100, listing dates ARE the data (Cisco enters 1991, Qualcomm 1992, Amazon 1997, eBay/Priceline 1998/99); the savings account compounds the real 13-week T-bill yield; four delisted names (Enron, WorldCom, AOL, Yahoo!) reconstructed from known split-adjusted anchor closes, marked + footnoted on the card. Period-accurate one-liners; epistemic rule enforced by shape (`trailing()` never reads past the in-game month; risk grade + sparkline are trailing-only). USD treated as table units — no FX in v1, said on the setup screen
- [x] Round loop as a **pure, serializable state machine** (`game.ts`, no React): DEAL (seeded per `(seed, round)`, newly-listed instruments guaranteed a dealt copy) → DRAFT (simultaneous pick-1-pass, direction alternates by round, last card discarded face-up; drafted cards are standing options) → COMMIT (sells then buys, atomic per player) → SIMULATE (Jan-close trades, year valued monthly) → INTERIM (best return collects the bank's bonus). Every decision is recorded; a game is reproducible from `(scenario, seed, decisions)`. 19 tests in `app/test/game.test.ts`
- [x] Single-device "look away" drafting, deliberately ugly (`GameApp.tsx`): pass-the-device shield before every private screen, plain boxes on the wooden table, race chart + curated real headlines during the year replay, game survives a reload (localStorage)
- [x] Final scoring (net worth 31 Dec 1999) + epilogue: portfolios frozen, 2000–2002 replayed monthly with the crash headlines — the dot-com lesson delivers itself
- [x] §14.1 decided (confirmed 2026-07-13, recorded in DESIGN.md §0): courtage (0,5 %, min 100) + 30 % capital-gains tax on realized gains (average cost basis, losses not refunded), **no sell cap** — trading only in COMMIT already forces conviction; a per-year sell cap stays playtest fodder

Verified: 90 unit tests + typecheck green; headless Chrome played a full
2-player, 10-round game (120 picks, 20 commits) through final + epilogue,
mid-game reload restored the interim screen, simulator golden baseline
("goal in 20 yr 6 mo") intact. Open for playtesting: bonus size, hand size,
copies-per-instrument, and whether unfunded options should expire (§14.3).

## M5 — Own-devices multiplayer ❌ not started

Spec: DESIGN §9. Room codes, `/table` host + `/hand` player routes, WebSocket relay (stores nothing), host-authoritative simulation, market replay done properly.

## M6 — FI scenario + Sweden pack deep ❌ not started

Spec: DESIGN §6. Full locale rules (ISK, ränteavdrag, amorteringskrav, jobbskatteavdrag), shared world events, life cards. Decide open questions §14.2 (FI deck / life-card win conditions) and §14.3 (unfunded drafted cards).

## M7 — Polish ❌ not started

Epilogues, replays, sound (paper slides, monthly tick, year stamp), compare ghosts in game post-mortems.

## Later (explicitly deferred)

Stress tests beyond Monte Carlo — the *all-start-dates fan of pasts*: a sequence-of-returns distribution reusing `MonteCarloRun` + the futures report (single-date historical replay shipped with M3c; natural sequels also include named-era ghost overlays and offering imported series as `sampled`-curve source cards). Solo bots, pack registry/sharing, more eras (1929, 1970s, 2008, Japan 1989, Argentina).
