# @finsim/engine

The pure simulation core (DESIGN.md §7–8). Deterministic, dependency-free
TypeScript: no framework imports, no `Date.now()`, seeded randomness only.
Every instrument is a card and every card is a curve f(t).

## The monthly tick

**A hand is played top to bottom.** Each card acts on a running monthly
total:

1. a **source** adds its curve (a raise is the curve's own growth);
2. a **drain** subtracts a fixed curve, or a share of the positive running
   total at its position — which is how income tax is a card;
3. an **asset** grows (net of its fee), then takes its deposit from the
   total; a **debt** accrues interest, then takes its payment, capped at
   payoff;
4. a **nested hand** computes its own subtotal from zero and contributes its
   net at its position — recursion is the scoping rule.

Whatever reaches the bottom of the root hand lands in the permanent cash
account, so the model never leaks money. Then scheduled rules (taxes,
crashes) fire.

`simulate(table, world, from, to)` has no hidden state: ghosts, replays,
undo and what-if diffs are just calls. Time is an integer month index
(`ym(2026, 1)`); series point `i` is the state at the end of month `from + i`.

## Semantics pinned down by this package (and its tests)

- **Order is load-bearing**: put the tax above the salary and it taxes
  nothing. The column is the calculation.
- **Percent cards read `max(0, total)`** at their position — no negative
  tax, no over-allocation; cascading percents compose naturally.
- **Fixed drains and takes draw in full** — the running total may go
  negative: an honest overdraft, never leaked money.
- **Start tick**: a card's initial balance appears and it takes its
  deposit/payment on its start month, but no growth/interest accrues —
  nothing existed during that month.
- **Debt payoff**: the payment is capped at the remaining balance; the
  excess simply stays in the running total.
- **Rules never touch cash implicitly** — only when targeted by
  `cardIds: ['cash']`.
- **Sampled data out of range is an error**, never an extrapolation.

## Jurisdiction as data

The engine knows no locales. Packs wire rules (`flowTax`, `balanceTax`,
`balanceScale`, …) into scheduled hooks — an ISK schablonskatt is a yearly
`balanceTax` on `isk`-tagged cards, a 2008 crash is a `once` `balanceScale`
on `equity` tags. There is no `if (sweden)` here and there never will be.

## Tests

`npm test` (or `npm test` at the repo root). The suite ends with the M1
acceptance scenario: a Current budget hand (salary → tax → expenses → five
index funds) and a Buy the car hand (car, running costs, nested Financing
hand with the loan), verified against closed-form annuity and amortization
math — "10 MSEK: 2045-06 → 2046-09. The car costs you 1 yr 3 mo."
