import { describe, expect, it } from 'vitest'
import {
  firstCrossing,
  formatMonth,
  formatMonthsDelta,
  goalDelta,
  setCardEnabled,
  simulate,
  ym,
  type Series,
  type Table,
} from '../src/index.js'

/**
 * The M1 acceptance scenario (DESIGN.md §2, CLAUDE.md north star), on the
 * v2 pipeline model with hand-checked numbers:
 *
 *   Model salary + expenses + five index funds, play a "Buy the car" hand,
 *   and read off: "How much longer will it take to reach 10 MSEK just
 *   because I bought this car?"
 *
 * The table, starting January 2026 — two hands, played top to bottom:
 *
 *   Current budget (its own subtotal):
 *     Salary +65 000 → Income tax −30 % → 45 500 → Living expenses −20 500
 *     → 25 000 → five funds at 7 % (volatility 0.15 carried, ignored), each
 *     taking 20 % of what remains: 5 000, 4 000, 3 200, 2 560, 2 048
 *     (Σ 16 808) → hand net 8 192/mo.
 *
 *   Buy the car (its own subtotal — the budget's funds are untouched):
 *     Car 240 000 at −15 %/yr (takes nothing) → Running costs −3 500 →
 *     Financing hand: loan 240 000 at 6 %/yr, payment 4 300/mo capped at
 *     payoff → hand net −7 800/mo until the loan dies.
 *
 * All expected values below derive from closed-form annuity and
 * amortization formulas, independently of the engine (see comments).
 */

const FROM = ym(2026, 1)
const TO = FROM + 30 * 12 - 1 // 30-year horizon
const GOAL = 10_000_000

const g = Math.pow(1.07, 1 / 12) // fund monthly growth factor
const A = (j: number): number => (Math.pow(g, j) - 1) / (g - 1) // annuity: Σ_{i<j} g^i
const m = Math.pow(1.06, 1 / 12) - 1 // loan monthly interest rate
const d = Math.pow(0.85, 1 / 12) // car monthly depreciation factor

function buildTable(): Table {
  return {
    root: {
      id: 'root',
      kind: 'hand',
      children: [
        {
          id: 'budget',
          kind: 'hand',
          name: 'Current budget',
          children: [
            { id: 'salary', kind: 'source', flow: { type: 'constant', value: 65000 }, tags: ['income'] },
            { id: 'income-tax', kind: 'drain', percent: 0.3 },
            { id: 'expenses', kind: 'drain', amount: { type: 'constant', value: 20500 } },
            ...[1, 2, 3, 4, 5].map((i) => ({
              id: `fund${i}`,
              kind: 'asset' as const,
              growth: { expected: 0.07, volatility: 0.15 },
              take: { type: 'percent' as const, percent: 0.2 },
              tags: ['equity', 'fund'],
            })),
          ],
        },
        {
          id: 'car',
          kind: 'hand',
          name: 'Buy the car',
          children: [
            { id: 'car-value', kind: 'asset', initialBalance: 240000, growth: { expected: -0.15 } },
            { id: 'car-costs', kind: 'drain', amount: { type: 'constant', value: 3500 } },
            {
              id: 'car-financing',
              kind: 'hand',
              name: 'Financing',
              children: [
                { id: 'car-loan', kind: 'debt', principal: 240000, interest: { expected: 0.06 }, payment: { type: 'fixed', amountPerMonth: 4300 } },
              ],
            },
          ],
        },
      ],
    },
  }
}

const balance = (r: { balances: Series[] }, id: string): number[] => r.balances.find((s) => s.id === id)!.points
const contribution = (r: { contributions: Series[] }, id: string): number[] => r.contributions.find((s) => s.id === id)!.points

describe('M1 acceptance: "how much longer to 10 MSEK because of this car?"', () => {
  const table = buildTable()
  const withCar = simulate(table, {}, FROM, TO)
  const withoutCar = simulate(setCardEnabled(table, 'car', false), {}, FROM, TO)

  it('the budget hand plays top to bottom, fully hand-checkable', () => {
    // 65 000 − 30 % = 45 500; − 20 500 = 25 000; funds cascade 20 %:
    // 5 000, 4 000, 3 200, 2 560, 2 048; hand net 8 192.
    expect(contribution(withoutCar, 'income-tax')[0]).toBeCloseTo(-19500, 9)
    const funds = [5000, 4000, 3200, 2560, 2048]
    funds.forEach((expected, i) => {
      expect(balance(withoutCar, `fund${i + 1}`)[0]).toBeCloseTo(expected, 9)
    })
    expect(contribution(withoutCar, 'budget')[0]).toBeCloseTo(8192, 9)
    expect(withoutCar.cash.points[0]).toBeCloseTo(8192, 9)
    expect(withoutCar.netWorth.points[0]).toBeCloseTo(25000, 9)
  })

  it('the car hand scopes: the budget’s funds are identical with and without it', () => {
    expect(balance(withCar, 'fund1')).toEqual(balance(withoutCar, 'fund1'))
    // car hand net: −3 500 running costs − 4 300 loan payment = −7 800
    expect(contribution(withCar, 'car')[0]).toBeCloseTo(-7800, 9)
    // first month: funds 16 808 + cash 392 + car 240 000 − loan 235 700 = 21 500
    expect(withCar.cash.points[0]).toBeCloseTo(392, 9)
    expect(balance(withCar, 'car-value')[0]).toBe(240000)
    expect(balance(withCar, 'car-loan')[0]).toBe(-235700)
    expect(withCar.netWorth.points[0]).toBeCloseTo(21500, 9)
  })

  it('funds follow the closed-form annuity; the car follows its depreciation curve', () => {
    // fund1 contributes 5 000/mo: balance(k) = 5 000 × A(k+1)
    expect(balance(withCar, 'fund1')[12]).toBeCloseTo(5000 * A(13), 6)
    expect(balance(withCar, 'fund1')[120]).toBeCloseTo(5000 * A(121), 4)
    // car after a year: 240 000 × 0.85
    expect(balance(withCar, 'car-value')[12]).toBeCloseTo(204000, 6)
    // loan: B(k) = (P − pmt)(1+m)^k − pmt((1+m)^k − 1)/m; B(12) ≈ 196 837.93
    const B = (k: number): number => (240000 - 4300) * Math.pow(1 + m, k) - (4300 * (Math.pow(1 + m, k) - 1)) / m
    expect(balance(withCar, 'car-loan')[12]).toBeCloseTo(-B(12), 6)
    expect(B(12)).toBeCloseTo(196837.93, 1)
  })

  it('the loan pays off at tick 64; the capped payment never leaves the pipeline', () => {
    // B(63)·(1+m) = 3 931.08 ≤ 4 300 → final (partial) payment in month 64;
    // from month 65 the car hand drains only its running costs.
    const loan = balance(withCar, 'car-loan')
    expect(loan[63]).toBeLessThan(0)
    expect(loan[64]).toBe(0)
    expect(contribution(withCar, 'car-loan')[64]).toBeCloseTo(-3931.076, 2)
    expect(contribution(withCar, 'car')[65]).toBeCloseTo(-3500, 9)
    // cash: 392/mo while paying, 760.92 in the payoff month, 4 692/mo after
    expect(withCar.cash.points[63]).toBeCloseTo(392 * 64, 6)
    expect(withCar.cash.points[64]! - withCar.cash.points[63]!).toBeCloseTo(760.924, 2)
    expect(withCar.cash.points[65]! - withCar.cash.points[64]!).toBeCloseTo(4692, 6)
  })

  it('reads off the answer: the car costs 1 yr 3 mo on the way to 10 MSEK', () => {
    // Closed-form: baseline NW(k) = 16 808·A(k+1) + 8 192·(k+1) first
    // sustains ≥ 10 MSEK at k = 233 (June 2045); with the car (same funds,
    // thinner cash, depreciating car, dying loan) at k = 248 (September
    // 2046). Δ = 15 months.
    const delta = goalDelta(withoutCar, withCar, GOAL)
    expect(delta.baseMonth).toBe(ym(2045, 6))
    expect(delta.variantMonth).toBe(ym(2046, 9))
    expect(delta.deltaMonths).toBe(15)

    const readout = `10 MSEK: ${formatMonth(delta.baseMonth!)} → ${formatMonth(delta.variantMonth!)}. The car costs you ${formatMonthsDelta(delta.deltaMonths!)}.`
    expect(readout).toBe('10 MSEK: 2045-06 → 2046-09. The car costs you 1 yr 3 mo.')
  })

  it('spot-checks net worth against the independent closed-form model', () => {
    // From the scratch derivation (annuity + amortization formulas only):
    expect(withoutCar.netWorth.points[12]).toBeCloseTo(332568.5944, 3)
    expect(withCar.netWorth.points[12]).toBeCloseTo(238330.6663, 3)
    expect(withoutCar.netWorth.points[233]).toBeCloseTo(10064957.35, 1)
    expect(withCar.netWorth.points[248]).toBeCloseTo(10026985.68, 1)
  })

  it('the car scenario trails the baseline every single month', () => {
    for (let i = 0; i < withCar.netWorth.points.length; i++) {
      expect(withCar.netWorth.points[i]!).toBeLessThan(withoutCar.netWorth.points[i]!)
    }
  })

  it('the ghost compare is deterministic and side-effect free', () => {
    const again = simulate(table, {}, FROM, TO)
    expect(JSON.stringify(again)).toBe(JSON.stringify(withCar))
    const roundTrip = simulate(setCardEnabled(setCardEnabled(table, 'car', false), 'car', true), {}, FROM, TO)
    expect(JSON.stringify(roundTrip)).toBe(JSON.stringify(withCar))
    expect(firstCrossing(withCar, GOAL)).toBe(ym(2046, 9))
  })
})
