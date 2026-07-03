# @finsim/engine

The pure simulation core (DESIGN.md §8). Deterministic, dependency-free
TypeScript: no framework imports, no `Date.now()`, seeded randomness only.
Every instrument is a card and every card is a curve f(t).

## The monthly tick

For each month, in this exact order:

1. **Flows** — every source stack is evaluated bottom-up
   (`raise(tax(salary))(t)`), then jurisdiction flow rules apply.
2. **Streams** — all flow output pools; streams draw from the pool in
   declared order; the remainder lands in the permanent cash account, so the
   model never leaks money.
3. **Balances** — growth/interest/fees first, then inflows.
4. **Scheduled rules** — balance effects (taxes, crash events) at end of tick.

`simulate(table, world, from, to)` has no hidden state: ghosts, replays, undo
and what-if diffs are just calls. Time is an integer month index
(`ym(2026, 1)`); series point `i` is the state at the end of month `from + i`.

## Semantics pinned down by this package (and its tests)

- **Percent streams** take their share of what remains in the pool *at their
  turn* — "20 % of surplus" after an earlier stream drew is 20 % of the rest.
  Declared order is resolution order, and allocations can never exceed the
  pool. Fixed streams always draw in full; cash absorbs any overdraft
  honestly rather than hiding it.
- **Start tick**: a stack's initial balance appears and receives inflows on
  its start month, but takes no growth/interest — nothing existed during that
  month.
- **Debt payoff**: an overpayment in the payoff month is refunded to cash;
  from the next month the stream is inert and its money stays in the pool.
- **Rules never touch cash implicitly** — only when targeted by
  `stackIds: ['cash']`.
- **Sampled data out of range is an error**, never an extrapolation.

## Jurisdiction as data

The engine knows no locales. Packs wire rules (`flowTax`, `balanceTax`,
`balanceScale`, …) into scheduled hooks — an ISK schablonskatt is a yearly
`balanceTax` on `isk`-tagged stacks, a 2008 crash is a `once` `balanceScale`
on `equity` tags. There is no `if (sweden)` here and there never will be.

## Tests

`npm test` (or `npm test` at the repo root). The suite ends with the M1
acceptance scenario: salary + expenses + five index-fund streams + a car
decision bundle, verified against closed-form annuity and amortization math —
"10 MSEK: 2045-06 → 2048-03. The car costs you 2 yr 9 mo."
