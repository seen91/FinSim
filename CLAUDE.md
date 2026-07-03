# FinSim

A financial simulator where every instrument is a card and every card is a curve f(t), plus a deliberately boring multiplayer card game (pick-and-pass drafting, real historical data) built on the same engine.

**`DESIGN.md` is the founding document and single source of truth.** Read it before making design-level decisions. Its §0 decision log records confirmed choices — do not re-litigate them; propose changes to Sebastian instead.

## Current state

- Branch `cleanSlate` is a fresh orphan start. The old Svelte prototype lives on `main`/`cardGameDesignFirst` and must never be ported — it was abandoned deliberately (Sebastian has allowed consulting it for interaction *inspiration* only).
- M0 (engine) and an M1 simulator slice exist: `/engine` (pure TS, tested) and `/app` (React+Vite card-table UI).

## Non-negotiables (from DESIGN.md)

- The engine is a **pure, deterministic, dependency-free TypeScript package** (`/engine`): no framework imports, no `Date.now()`, seeded randomness only, monthly tick. Exhaustively tested.
- Jurisdiction rules (Sweden pack: ISK, ränteavdrag, amorteringskrav) are **data wired into engine hooks** — never `if (sweden)` in engine code.
- Pipeline grammar: one rule — a hand is played top to bottom; each card acts on a running monthly total; a nested hand computes its own subtotal from zero and contributes its net at its position (recursion = scoping). No Modifier kind: tax is a % drain, a raise is the source's own curve, a fee is an asset parameter. Cash catches whatever reaches the bottom of the root hand.
- Growth parameters are `(expected, volatility?)` from day one; v1 ignores volatility (Monte Carlo comes later).
- App stack: TypeScript + React + Vite, PWA, local-first (IndexedDB), DOM not canvas.
- Numbers use tabular numerals; green/red strictly for money direction. "Boring is the goal."
- **Dependencies start at the newest stable version — no exceptions.** When scaffolding or adding a package, check the current latest stable release (`npm view <pkg> version`) instead of trusting memorized or template versions, then verify the installed lockfile versions match. The old prototype started on outdated packages; don't repeat that.

## M1 acceptance test (the north star)

Model salary + expenses + monthly streams into five index funds, play a "car" decision bundle, and read off: **"How much longer will it take to reach 10 MSEK just because I bought this car?"** — a time-to-goal delta between the table and its ghost. M0's first integration test should be this exact scenario with hand-checked numbers.
