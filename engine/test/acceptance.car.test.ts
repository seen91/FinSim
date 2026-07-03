import { describe, expect, it } from 'vitest'
import {
  firstCrossing,
  formatMonth,
  formatMonthsDelta,
  goalDelta,
  setBundleEnabled,
  simulate,
  ym,
  type Table,
} from '../src/index.js'

/**
 * The M1 acceptance scenario (DESIGN.md §2, CLAUDE.md north star), run
 * against the engine with hand-checked numbers:
 *
 *   Model salary + expenses + monthly streams into five index funds, play a
 *   "car" decision bundle, and read off: "How much longer will it take to
 *   reach 10 MSEK just because I bought this car?"
 *
 * The household, starting January 2026:
 *   - Salary 65 000 kr/mo gross, income tax 30 % → 45 500 net.
 *   - Living expenses 20 500 kr/mo → surplus 25 000 kr/mo.
 *   - Five index funds at 7 % expected annual growth (volatility 0.15 is
 *     carried but ignored by the deterministic v1 engine). Each fund takes
 *     20 % of whatever surplus remains at its turn; the rest lands in cash.
 *
 * The car decision bundle:
 *   - Car worth 240 000 kr, depreciating 15 %/yr.
 *   - Car loan of 240 000 kr at 6 %/yr, fixed payment 4 300 kr/mo (paid
 *     before the fund streams).
 *   - Running costs (insurance, fuel, service, skatt) 3 500 kr/mo.
 *
 * All expected values below are derived from closed-form annuity and
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
    stacks: [
      {
        id: 'salary',
        base: { id: 'salary-card', kind: 'source', flow: { type: 'constant', value: 65000 }, tags: ['income'] },
        modifiers: [{ id: 'income-tax', kind: 'modifier', target: 'flow', modifier: { type: 'taxRate', rate: 0.3 } }],
      },
      { id: 'expenses', base: { id: 'expenses-card', kind: 'source', flow: { type: 'constant', value: -20500 } } },
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `fund${i}`,
        base: { id: `fund${i}-card`, kind: 'asset' as const, growth: { expected: 0.07, volatility: 0.15 } },
      })),
      // the car decision bundle
      {
        id: 'car-value',
        base: { id: 'car-value-card', kind: 'asset', initialBalance: 240000, growth: { expected: -0.15 } },
        bundleId: 'car',
      },
      {
        id: 'car-loan',
        base: { id: 'car-loan-card', kind: 'debt', principal: 240000, interest: { expected: 0.06 } },
        bundleId: 'car',
      },
      {
        id: 'car-costs',
        base: { id: 'car-costs-card', kind: 'source', flow: { type: 'constant', value: -3500 } },
        bundleId: 'car',
      },
    ],
    streams: [
      { id: 'loan-payment', to: 'car-loan', rule: { type: 'fixed', amountPerMonth: 4300 }, bundleId: 'car' },
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `save${i}`,
        to: `fund${i}`,
        rule: { type: 'percent' as const, percent: 0.2 },
      })),
    ],
    bundles: [{ id: 'car', enabled: true }],
  }
}

describe('M1 acceptance: "how much longer to 10 MSEK because of this car?"', () => {
  const table = buildTable()
  const withCar = simulate(table, {}, FROM, TO)
  const withoutCar = simulate(setBundleEnabled(table, 'car', false), {}, FROM, TO)

  it('baseline first month is fully hand-checkable', () => {
    // Net salary 65 000 × 0.7 = 45 500; surplus 45 500 − 20 500 = 25 000.
    // 20 % cascade: 5 000, 4 000, 3 200, 2 560, 2 048 (Σ 16 808); cash 8 192.
    // Net worth after month one = the full surplus.
    const funds = [5000, 4000, 3200, 2560, 2048]
    funds.forEach((expected, i) => {
      expect(withoutCar.stacks.find((s) => s.id === `fund${i + 1}`)!.points[0]).toBeCloseTo(expected, 9)
    })
    expect(withoutCar.cash.points[0]).toBeCloseTo(8192, 9)
    expect(withoutCar.netWorth.points[0]).toBeCloseTo(25000, 9)
  })

  it('car-scenario first month is fully hand-checkable', () => {
    // Surplus 25 000 − 3 500 running costs = 21 500. Loan payment 4 300
    // leaves 17 200 for the funds: 3 440, 2 752, 2 201.60, 1 761.28,
    // 1 409.024 (Σ 11 563.904); cash gets 5 636.096.
    // Car appears at 240 000; loan at 240 000 − 4 300 = 235 700 (no interest
    // on the start tick — the loan did not exist during that month).
    // Net worth = 11 563.904 + 5 636.096 + 240 000 − 235 700 = 21 500.
    expect(withCar.stacks.find((s) => s.id === 'fund1')!.points[0]).toBeCloseTo(3440, 9)
    expect(withCar.stacks.find((s) => s.id === 'fund5')!.points[0]).toBeCloseTo(1409.024, 9)
    expect(withCar.cash.points[0]).toBeCloseTo(5636.096, 9)
    expect(withCar.stacks.find((s) => s.id === 'car-value')!.points[0]).toBe(240000)
    expect(withCar.stacks.find((s) => s.id === 'car-loan')!.points[0]).toBe(-235700)
    expect(withCar.netWorth.points[0]).toBeCloseTo(21500, 9)
  })

  it('funds follow the closed-form annuity; the car follows its depreciation curve', () => {
    // fund1 baseline contributes 5 000/mo: balance(k) = 5 000 × A(k+1).
    expect(withoutCar.stacks.find((s) => s.id === 'fund1')!.points[12]).toBeCloseTo(5000 * A(13), 6)
    expect(withoutCar.stacks.find((s) => s.id === 'fund1')!.points[120]).toBeCloseTo(5000 * A(121), 4)
    // car value after a year: 240 000 × 0.85.
    expect(withCar.stacks.find((s) => s.id === 'car-value')!.points[12]).toBeCloseTo(204000, 6)
    // loan after a year: B(k) = (P − pmt)(1+m)^k − pmt((1+m)^k − 1)/m, B(12) ≈ 196 837.93.
    const B = (k: number): number => (240000 - 4300) * Math.pow(1 + m, k) - (4300 * (Math.pow(1 + m, k) - 1)) / m
    expect(withCar.stacks.find((s) => s.id === 'car-loan')!.points[12]).toBeCloseTo(-B(12), 6)
    expect(B(12)).toBeCloseTo(196837.93, 1)
  })

  it('the loan pays off at tick 64 with the overpayment refunded to cash', () => {
    // B(63)·(1+m) = 3 931.08 ≤ 4 300 → final payment in month 64,
    // refund 4 300 − 3 931.08 = 368.92 lands in cash; the stream then goes
    // inert and its 4 300 stays in the pool for the funds from tick 65 on.
    const loan = withCar.stacks.find((s) => s.id === 'car-loan')!.points
    expect(loan[63]).toBeLessThan(0)
    expect(loan[64]).toBe(0)
    const cashStep = withCar.cash.points[64]! - withCar.cash.points[63]!
    expect(cashStep).toBeCloseTo(5636.096 + 368.92, 1)
    // post-payoff, fund1 receives 20% of the full 21 500 = 4 300/mo
    const fund1 = withCar.stacks.find((s) => s.id === 'fund1')!.points
    expect(fund1[65]! - fund1[64]! * g).toBeCloseTo(4300, 6)
  })

  it('reads off the answer: the car costs 2 yr 9 mo on the way to 10 MSEK', () => {
    // Closed-form: baseline NW(k) = 16 808·A(k+1) + 8 192·(k+1) first
    // sustains ≥ 10 MSEK at k = 233 (June 2045); with the car (piecewise
    // annuities around the loan payoff) at k = 266 (March 2048). Δ = 33 mo.
    const delta = goalDelta(withoutCar, withCar, GOAL)
    expect(delta.baseMonth).toBe(ym(2045, 6))
    expect(delta.variantMonth).toBe(ym(2048, 3))
    expect(delta.deltaMonths).toBe(33)

    const readout = `10 MSEK: ${formatMonth(delta.baseMonth!)} → ${formatMonth(delta.variantMonth!)}. The car costs you ${formatMonthsDelta(delta.deltaMonths!)}.`
    expect(readout).toBe('10 MSEK: 2045-06 → 2048-03. The car costs you 2 yr 9 mo.')
  })

  it('spot-checks net worth against the independent closed-form model', () => {
    // Values computed from the annuity/amortization formulas above, outside
    // the engine (scratch derivation): NW_base(12) = 332 568.594…,
    // NW_car(12) = 235 969.265…
    expect(withoutCar.netWorth.points[12]).toBeCloseTo(332568.5944, 3)
    expect(withCar.netWorth.points[12]).toBeCloseTo(235969.2648, 3)
    expect(withoutCar.netWorth.points[233]).toBeCloseTo(10064957.35, 1)
    expect(withCar.netWorth.points[266]).toBeCloseTo(10052521.27, 1)
  })

  it('the car scenario trails the baseline every single month', () => {
    for (let i = 0; i < withCar.netWorth.points.length; i++) {
      expect(withCar.netWorth.points[i]!).toBeLessThan(withoutCar.netWorth.points[i]!)
    }
  })

  it('the ghost compare is deterministic and side-effect free', () => {
    const again = simulate(table, {}, FROM, TO)
    expect(JSON.stringify(again)).toBe(JSON.stringify(withCar))
    // toggling the bundle back re-produces the original result exactly
    const roundTrip = simulate(setBundleEnabled(setBundleEnabled(table, 'car', false), 'car', true), {}, FROM, TO)
    expect(JSON.stringify(roundTrip)).toBe(JSON.stringify(withCar))
  })
})
