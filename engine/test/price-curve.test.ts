import { describe, expect, it } from 'vitest'
import { priceCurveOf, simulate, validateTable, type AssetCard, type Table } from '../src/index.js'

/**
 * A price is any curve f(t) (decision 2026-07-17): a car depreciating along
 * k·t + m, a formula with a scrap-value floor, a step schedule — same
 * grammar as every flow. Analytic prices are exact at every month, in every
 * future: no data end to fall back from, so `growth` idles and the Monte
 * Carlo dice never touch them. A bare SampledRef stays the historical-data
 * shorthand every existing file uses.
 */

const table = (...children: Table['root']['children']): Table => ({ root: { id: 'root', kind: 'hand', children } })
const balancesOf = (t: Table, from: number, to: number, shocks?: Parameters<typeof simulate>[4]): number[] =>
  simulate(t, {}, from, to, shocks).balances.find((b) => b.id === 'car')!.points

describe('linear price — the depreciating car, hand-checked', () => {
  const car: AssetCard = {
    id: 'car',
    kind: 'asset',
    price: { type: 'linear', base: 240_000, slopePerMonth: -1_500 },
    initialUnits: 1,
  }

  it('the balance follows k·t + m exactly', () => {
    expect(balancesOf(table(car), 0, 4)).toEqual([240_000, 238_500, 237_000, 235_500, 234_000])
  })

  it('t is local — a card entering play later starts its slide at its own base', () => {
    const late = { ...car, startMonth: 3 }
    expect(balancesOf(table(late), 0, 5)).toEqual([0, 0, 0, 240_000, 238_500, 237_000])
  })

  it('growth is the sampled fallback only — an analytic price ignores it', () => {
    const withGrowth = { ...car, growth: { expected: 0.5 } }
    expect(balancesOf(table(withGrowth), 0, 2)).toEqual([240_000, 238_500, 237_000])
  })

  it('the dice never touch an analytic price, volatility or not', () => {
    const jumpy = { ...car, growth: { expected: -0.07, volatility: 0.5 } }
    const shocked: number[] = []
    const points = balancesOf(table(jumpy), 0, 3, (_card, i) => {
      shocked.push(i)
      return 10 // would be a huge shock if it ever landed
    })
    expect(shocked).toEqual([])
    expect(points).toEqual([240_000, 238_500, 237_000, 235_500])
  })
})

describe('expression price', () => {
  it('a formula floors at scrap value where a bare line would keep falling', () => {
    const car: AssetCard = {
      id: 'car',
      kind: 'asset',
      price: { type: 'expression', expr: 'max(10000, 240000 - 10000*t)' },
      initialUnits: 1,
    }
    expect(balancesOf(table(car), 0, 25)[25]).toBe(10_000)
    expect(balancesOf(table(car), 0, 2)).toEqual([240_000, 230_000, 220_000])
  })
})

describe('deposits and rules on curve-priced assets', () => {
  it('deposits buy units at the month’s curve price', () => {
    const fund: AssetCard = {
      id: 'car',
      kind: 'asset',
      price: { type: 'linear', base: 100, slopePerMonth: 25 },
      take: { type: 'fixed', amountPerMonth: 1_000 },
    }
    const salary = { id: 'salary', kind: 'source', flow: { type: 'constant', value: 1_000 } } as const
    // prices 100, 125: units 10, then +8 — balances 1 000, 2 250 like the sampled golden
    expect(balancesOf(table(salary, fund), 0, 1)).toEqual([1_000, 2_250])
  })

  it('a balance rule sells units, not the price', () => {
    const car: AssetCard = {
      id: 'car',
      kind: 'asset',
      price: { type: 'linear', base: 200_000, slopePerMonth: -1_000 },
      initialUnits: 1,
      tags: ['car'],
    }
    const rule = {
      id: 'wealth-tax',
      kind: 'rule',
      rule: {
        id: 'wealth-tax-rule',
        schedule: { kind: 'once', atMonth: 1 },
        target: { tags: ['car'] },
        effect: { type: 'balanceTax', rate: 0.5 },
      },
    } as const
    const points = balancesOf(table(rule, car), 0, 2)
    // month 1: price 199 000, then half the units taxed away; month 2 rides the curve at 0.5 units
    expect(points).toEqual([200_000, 99_500, 99_000])
  })

  it('a margin loan trades its pegged curve-priced asset at the curve price', () => {
    const fund: AssetCard = { id: 'car', kind: 'asset', price: { type: 'constant', value: 100 }, initialUnits: 10 }
    const margin = { id: 'loan', kind: 'margin', ltv: 0.5, interest: { expected: 0 } } as const
    const result = simulate(table(margin, fund), {}, 0, 0)
    // equity 1 000 → borrow ltv/(1−ltv) × 1 000 = 1 000, deposited as 10 more units
    expect(result.balances.find((b) => b.id === 'car')!.points).toEqual([2_000])
    expect(result.balances.find((b) => b.id === 'loan')!.points).toEqual([-1_000])
  })
})

describe('compatibility and validation', () => {
  it('a bare SampledRef and the sampled curve are the same price', () => {
    const world = { series: { fund: { startMonth: 0, values: [100, 125, 200] } } }
    const bare: Table = table({ id: 'car', kind: 'asset', price: { seriesId: 'fund' }, initialUnits: 1 })
    const curve: Table = table({ id: 'car', kind: 'asset', price: { type: 'sampled', seriesId: 'fund' }, initialUnits: 1 })
    expect(simulate(bare, world, 0, 2).netWorth.points).toEqual(simulate(curve, world, 0, 2).netWorth.points)
    expect(priceCurveOf({ seriesId: 'fund' })).toEqual({ type: 'sampled', seriesId: 'fund' })
  })

  it('a malformed price curve is rejected before it can simulate', () => {
    const bad: Table = table({
      id: 'car',
      kind: 'asset',
      price: { type: 'step', initial: 100, steps: [{ atMonth: 5, value: 90 }, { atMonth: 3, value: 80 }] },
      initialUnits: 1,
    })
    expect(validateTable(bad)).toEqual(['Card "car" price: step curve months must be strictly increasing'])
  })

  it('buying at a non-positive curve price is an error, not a silent negative', () => {
    const doomed: Table = table(
      { id: 'salary', kind: 'source', flow: { type: 'constant', value: 100 } },
      { id: 'car', kind: 'asset', price: { type: 'linear', base: 10, slopePerMonth: -10 }, take: { type: 'fixed', amountPerMonth: 100 } },
    )
    expect(() => simulate(doomed, {}, 0, 2)).toThrow(/cannot buy at non-positive price/)
  })
})
