import { describe, expect, it } from 'vitest'
import { monteCarlo, setCardEnabled, simulate, validateTable, type Card, type MarginCard, type Series, type Table, type World } from '../src/index.js'

/**
 * The margin card (DESIGN.md §0 2026-07-16, §7): a loan pegged to the asset
 * cards below it in its hand — held at ltv × their balance, rebalanced at
 * month-end, interest drawn from the running total at its position.
 *
 * The load-bearing algebra, used throughout: with monthly growth factor
 * G = (1+g)^(1/12), monthly interest R = (1+r)^(1/12) − 1 and λ = ltv, a
 * pegged position rebalanced every month-end gives equity the recurrence
 * E' = E·M + deposits, with M = (G − λ(1+R)) ⁄ (1−λ) — exactly a growth-rate
 * asset whose annual rate is M¹² − 1, the discrete-compounding form of the
 * folded closed form (g − λr)/(1−λ).
 */

const G = Math.pow(1.07, 1 / 12)
const R = Math.pow(1.01, 1 / 12) - 1
const LTV = 0.05

const source = (id: string, value: number): Card => ({ id, kind: 'source', flow: { type: 'constant', value } })
const fund = (id: string, initialBalance: number, expected = 0.07, extra: Partial<Card> = {}): Card =>
  ({ id, kind: 'asset', growth: { expected }, initialBalance, ...extra }) as Card
const margin = (id: string, ltv = LTV, interest = 0.01, extra: Partial<MarginCard> = {}): MarginCard => ({
  id,
  kind: 'margin',
  ltv,
  interest: { expected: interest },
  ...extra,
})
const hand = (id: string, children: Card[]): Card => ({ id, kind: 'hand', children })
const table = (children: Card[]): Table => ({ root: { id: 'root', kind: 'hand', children } })

const contribution = (r: { contributions: Series[] }, id: string): number[] => r.contributions.find((s) => s.id === id)!.points
const balance = (r: { balances: Series[] }, id: string): number[] => r.balances.find((s) => s.id === id)!.points

/** Relative equality — balances compound into the millions, so absolute epsilons lie. */
const expectClose = (a: number, b: number, rel = 1e-9): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(1, Math.abs(b)) * rel)
}

describe('validation', () => {
  const check = (card: MarginCard): string[] => validateTable({ root: { id: 'root', kind: 'hand', children: [card] } })

  it('accepts an ltv strictly between 0 and 1', () => {
    expect(check(margin('m', 0.05))).toEqual([])
    expect(check(margin('m', 0.9))).toEqual([])
  })

  it('rejects ltv at or beyond the ends — 1 would borrow without limit', () => {
    for (const ltv of [0, 1, 1.2, -0.05]) {
      expect(check(margin('m', ltv)).join()).toContain('ltv must be strictly between 0 and 1')
    }
  })

  it('rejects a negative interest volatility like every GrowthParam', () => {
    expect(check(margin('m', 0.05, 0.01, { interest: { expected: 0.01, volatility: -1 } })).join()).toContain('volatility')
  })
})

describe('entering play: the initial borrow', () => {
  it('borrows the closed form loan = ltv⁄(1−ltv) × equity on the start month — ltv × post-deposit balance is circular', () => {
    const r = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), {}, 0, 0)
    expectClose(balance(r, 'f')[0]!, 100_000 / (1 - LTV))
    expectClose(balance(r, 'm')[0]!, -(LTV / (1 - LTV)) * 100_000)
    // the borrow is broker credit straight into the fund: equity — and net worth — never move
    expectClose(r.netWorth.points[0]!, 100_000)
    expect(r.cash.points[0]).toBe(0)
  })

  it('holds the peg: loan = ltv × pegged balance at every month-end', () => {
    const r = simulate(table([source('salary', 5_000), hand('lev', [margin('m'), fund('f', 100_000, 0.07, { take: { type: 'percent', percent: 1 } })])]), {}, 0, 59)
    for (let i = 0; i < 60; i++) {
      expectClose(-balance(r, 'm')[i]!, LTV * balance(r, 'f')[i]!)
    }
  })

  it('draws no interest on the start month — nothing was borrowed during it', () => {
    const r = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), {}, 0, 1)
    expect(contribution(r, 'm')[0]).toBe(0)
    // month 1: interest on the loan carried in from month 0's rebalance
    expectClose(contribution(r, 'm')[1]!, -(LTV / (1 - LTV)) * 100_000 * R)
  })
})

describe('interest obeys the pipeline', () => {
  it('is drawn from the running total at its position — cards below see the reduced total', () => {
    const r = simulate(table([source('salary', 10_000), margin('m'), fund('f', 100_000, 0, { take: { type: 'percent', percent: 1 } })]), {}, 0, 1)
    const interest = (LTV / (1 - LTV)) * (100_000 + 10_000) * R
    expectClose(contribution(r, 'm')[1]!, -interest)
    // the fund's month-1 deposit is the salary minus the interest, nothing leaks
    expectClose(contribution(r, 'f')[1]!, -(10_000 - interest))
    expect(r.cash.points[1]).toBe(0)
  })

  it('draws in full with no income: an honest overdraft, bleeding cash', () => {
    const r = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), {}, 0, 2)
    expect(r.cash.points[1]!).toBeLessThan(0)
    expect(r.cash.points[2]!).toBeLessThan(r.cash.points[1]!)
    expectClose(r.cash.points[1]!, -(LTV / (1 - LTV)) * 100_000 * R)
  })
})

describe('positional scoping, like a rule card', () => {
  it('pegs only asset cards below it in its hand — an asset above is out of reach', () => {
    const r = simulate(table([fund('above', 300_000), margin('m'), fund('below', 100_000)]), {}, 0, 0)
    expect(balance(r, 'above')[0]).toBe(300_000)
    expectClose(-balance(r, 'm')[0]!, (LTV / (1 - LTV)) * 100_000)
  })

  it('reaches into nested hands below it', () => {
    const r = simulate(table([hand('lev', [margin('m'), hand('inner', [fund('f', 100_000)])])]), {}, 0, 0)
    expectClose(-balance(r, 'm')[0]!, (LTV / (1 - LTV)) * 100_000)
  })

  it('cannot see past its own hand — a sibling below the hand is not pegged', () => {
    const r = simulate(table([hand('lev', [fund('f', 100_000), margin('m')]), fund('outside', 200_000)]), {}, 0, 0)
    // the margin is the last card of its hand: nothing below it, nothing pegged
    expect(balance(r, 'm')[0]).toBe(0)
    expect(balance(r, 'outside')[0]).toBe(200_000)
    expect(balance(r, 'f')[0]).toBe(100_000)
  })

  it('pegging nothing is a no-op card', () => {
    const r = simulate(table([source('salary', 1_000), margin('m')]), {}, 0, 11)
    expect(balance(r, 'm')).toEqual(new Array(12).fill(0))
    expect(contribution(r, 'm')).toEqual(new Array(12).fill(0))
    expect(r.cash.points[11]).toBe(12_000)
  })
})

describe('rebalance mechanics', () => {
  it('splits the borrowed delta pro-rata by balance — two funds keep their ratio', () => {
    const r = simulate(table([margin('m'), fund('a', 300_000), fund('b', 100_000)]), {}, 0, 0)
    expectClose(balance(r, 'a')[0]! / balance(r, 'b')[0]!, 3)
    expectClose(balance(r, 'a')[0]!, 300_000 / (1 - LTV))
    expectClose(-balance(r, 'm')[0]!, (LTV / (1 - LTV)) * 400_000)
  })

  it('buys units of a priced asset at the month’s price', () => {
    const world: World = { series: { px: { startMonth: 0, values: [100, 110, 120] } } }
    const r = simulate(table([margin('m'), { id: 'f', kind: 'asset', price: { seriesId: 'px' }, initialUnits: 1_000, growth: { expected: 0.07 } }]), world, 0, 1)
    // month 0: equity 100 000 → gross 100 000/0.95, all held as units at price 100
    expectClose(balance(r, 'f')[0]!, 100_000 / (1 - LTV))
    const units0 = (100_000 / (1 - LTV)) / 100
    // month 1: those units reprice to 110 before the rebalance trades at 110
    const equity1 = units0 * 110 - (LTV / (1 - LTV)) * 100_000
    expectClose(balance(r, 'f')[1]!, equity1 / (1 - LTV))
    expectClose(-balance(r, 'm')[1]!, (LTV / (1 - LTV)) * equity1)
  })

  it('a crash deleverages mechanically: the loan sells down the month after', () => {
    const crash: World = { rules: [{ id: 'crash', schedule: { kind: 'once', atMonth: 6 }, target: { cardIds: ['f'] }, effect: { type: 'balanceScale', factor: 0.5 } }] }
    const r = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), crash, 0, 8)
    const calm = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), {}, 0, 8)
    // the crash fires after month 6's rebalance: that month the peg is honestly broken…
    expect(-balance(r, 'm')[6]!).toBeGreaterThan(LTV * balance(r, 'f')[6]!)
    expectClose(balance(r, 'm')[6]!, balance(calm, 'm')[6]!) // the loan itself is untouched by the fund's crash
    // …and month 7's rebalance sells down and restores it
    expect(-balance(r, 'm')[7]!).toBeLessThan(-balance(r, 'm')[6]!)
    expectClose(-balance(r, 'm')[7]!, LTV * balance(r, 'f')[7]!)
  })

  it('equity wiped out: sells everything, the uncovered loan stays and keeps costing interest', () => {
    const crash: World = { rules: [{ id: 'crash', schedule: { kind: 'once', atMonth: 3 }, target: { cardIds: ['f'] }, effect: { type: 'balanceScale', factor: 0.05 } }] }
    const r = simulate(table([hand('lev', [margin('m', 0.9, 0.01), fund('f', 100_000)])]), crash, 0, 8)
    // at 90 % LTV a ×0.05 crash leaves the loan far above the position
    expect(balance(r, 'f')[4]).toBe(0)
    const residual = -balance(r, 'm')[4]!
    expect(residual).toBeGreaterThan(0)
    // nothing left to rebalance against: the residual loan just stands…
    expect(balance(r, 'm')[8]).toBe(-residual)
    // …while its interest keeps draining the running total every month
    expectClose(contribution(r, 'm')[5]!, -residual * R)
    expect(r.netWorth.points[8]!).toBeLessThan(r.netWorth.points[4]!)
  })

  it('balance rules fire after the rebalance: an ISK schablonskatt taxes the gross, margin-inflated balance', () => {
    const isk: Card = {
      id: 'isk',
      kind: 'rule',
      rule: { id: 'isk-rule', schedule: { kind: 'yearly', monthOfYear: 12 }, target: { tags: ['fund'] }, effect: { type: 'balanceTax', rate: 0.009 } },
    }
    // interest 0 keeps the arithmetic pure; month 11 is December (month % 12 === 11)
    const noTax = simulate(table([hand('wrap', [margin('m', LTV, 0), fund('f', 100_000, 0.07, { tags: ['fund'] })])]), {}, 0, 11)
    const taxed = simulate(table([hand('wrap', [isk, margin('m', LTV, 0), fund('f', 100_000, 0.07, { tags: ['fund'] })])]), {}, 0, 11)
    // December's fund balance is the rebalanced gross × (1 − rate): the tax hits ltv-inflated money
    expectClose(balance(taxed, 'f')[11]!, balance(noTax, 'f')[11]! * (1 - 0.009))
    // the loan was pegged before the tax — pre-tax gross — and sells down next January
    expectClose(-balance(taxed, 'm')[11]!, LTV * balance(noTax, 'f')[11]!)
  })
})

describe('card conventions', () => {
  it('a margin starting later borrows nothing until its start month', () => {
    const r = simulate(table([hand('lev', [margin('m', LTV, 0.01, { startMonth: 3 }), fund('f', 100_000)])]), {}, 0, 4)
    expect(balance(r, 'm').slice(0, 3)).toEqual([0, 0, 0])
    expect(contribution(r, 'm').slice(0, 4)).toEqual([0, 0, 0, 0])
    // its start month performs the initial borrow at month-end
    expectClose(-balance(r, 'm')[3]!, LTV * balance(r, 'f')[3]!)
    expectClose(contribution(r, 'm')[4]!, balance(r, 'm')[3]! * R)
  })

  it('set aside, the margin — loan, interest and all — is out of the sim', () => {
    const plain = simulate(table([hand('lev', [fund('f', 100_000)])]), {}, 0, 11)
    const aside = simulate(setCardEnabled(table([hand('lev', [margin('m'), fund('f', 100_000)])]), 'm', false), {}, 0, 11)
    expect(balance(aside, 'm')).toEqual(new Array(12).fill(0))
    expect(aside.netWorth.points).toEqual(plain.netWorth.points)
    expect(balance(aside, 'f')).toEqual(balance(plain, 'f'))
  })

  it('reports like a debt: a negative balance series, counted in net worth', () => {
    const r = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), {}, 0, 5)
    const m = r.balances.find((s) => s.id === 'm')!
    expect(m.role).toBe('balance')
    for (const p of m.points) expect(p).toBeLessThan(0)
    for (let i = 0; i < 6; i++) {
      expectClose(r.netWorth.points[i]!, balance(r, 'f')[i]! + balance(r, 'm')[i]! + r.cash.points[i]!)
    }
  })

  it('an explicitly targeted balance rule can reach the loan, like a debt’s', () => {
    const forgiveness: World = { rules: [{ id: 'gift', schedule: { kind: 'once', atMonth: 2 }, target: { kinds: ['margin'] }, effect: { type: 'balanceScale', factor: 0 } }] }
    const r = simulate(table([hand('lev', [margin('m'), fund('f', 100_000)])]), forgiveness, 0, 3)
    expect(balance(r, 'm')[2]).toBe(0)
    // the peg re-establishes the next month-end
    expectClose(-balance(r, 'm')[3]!, LTV * balance(r, 'f')[3]!)
  })
})

describe('the golden fold (DESIGN.md §0): 5 % LTV at 1 % over a 7 % ± 15 % fund', () => {
  // the mechanism's equity recurrence E' = E·M + deposits, M = (G − λ(1+R))/(1−λ)
  const M = (G - LTV * (1 + R)) / (1 - LTV)
  const folded = Math.pow(M, 12) - 1

  it('the discrete fold agrees with the closed form (g − λr)/(1−λ) = 7,32 %', () => {
    expect(folded).toBeCloseTo((0.07 - LTV * 0.01) / (1 - LTV), 3)
    expect(folded).toBeCloseTo(0.0732, 3)
  })

  it('deterministically matches a fund folded to that equity rate, month for month', () => {
    const leveraged = table([
      source('salary', 10_000),
      {
        id: 'lev',
        kind: 'hand',
        take: { type: 'percent', percent: 1 },
        children: [margin('m', LTV, 0.01), fund('f', 500_000, 0.07, { take: { type: 'percent', percent: 1 } })],
      } as Card,
    ])
    const fold = table([source('salary', 10_000), fund('f', 500_000, folded, { take: { type: 'percent', percent: 1 } })])
    const a = simulate(leveraged, {}, 0, 239)
    const b = simulate(fold, {}, 0, 239)
    for (let i = 0; i < 240; i++) {
      // every krona is invested in both tables, so net worth IS equity — and the paths agree
      expect(a.cash.points[i]).toBe(0)
      expect(b.cash.points[i]).toBe(0)
      expectClose(a.netWorth.points[i]!, b.netWorth.points[i]!, 1e-9)
    }
  })

  it('a month’s shock lands on equity levered by exactly 1⁄(1−λ) — the σ⁄(1−λ) = 15,8 % fold', () => {
    const vol = { growth: { expected: 0.07, volatility: 0.15 } } as Partial<Card>
    const leveraged = table([hand('lev', [margin('m', LTV, 0.01), fund('f', 100_000, 0.07, vol)])])
    const plain = table([fund('f', 100_000, 0.07, vol)])
    const shock = (_: unknown, i: number): number => (i === 1 ? 1 : 0)
    const dLev = simulate(leveraged, {}, 0, 1, shock).netWorth.points[1]! - simulate(leveraged, {}, 0, 1).netWorth.points[1]!
    const dPlain = simulate(plain, {}, 0, 1, shock).netWorth.points[1]! - simulate(plain, {}, 0, 1).netWorth.points[1]!
    expectClose(dLev / dPlain, 1 / (1 - LTV), 1e-9)
  })

  it('under Monte Carlo the equity path realizes σ⁄(1−λ)', () => {
    // interest 0 keeps cash at exactly 0, so net worth is pure equity
    const t = table([hand('lev', [margin('m', LTV, 0), fund('f', 100_000, 0.07, { growth: { expected: 0.07, volatility: 0.15 } } as Partial<Card>)])])
    const run = monteCarlo(t, {}, 0, 119, { paths: 200, seed: 42 })
    const logReturns: number[] = []
    for (const path of run.netWorth) {
      for (let i = 1; i < path.length; i++) logReturns.push(Math.log(path[i]! / path[i - 1]!))
    }
    const mean = logReturns.reduce((s, x) => s + x, 0) / logReturns.length
    const sd = Math.sqrt(logReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / (logReturns.length - 1))
    expect(sd * Math.sqrt(12)).toBeCloseTo(0.15 / (1 - LTV), 2)
  })

  it('Monte Carlo’s median stays near the deterministic fold — expected is still the CAGR', () => {
    const t = table([hand('lev', [margin('m', LTV, 0.01), fund('f', 100_000, 0.07, { growth: { expected: 0.07, volatility: 0.15 } } as Partial<Card>)])])
    const run = monteCarlo(t, {}, 0, 119, { paths: 400, seed: 7 })
    const finals = run.netWorth.map((p) => p[119]!).sort((a, b) => a - b)
    const median = finals[199]!
    const deterministic = simulate(t, {}, 0, 119).netWorth.points[119]!
    expect(median / deterministic).toBeGreaterThan(0.9)
    expect(median / deterministic).toBeLessThan(1.1)
  })
})
