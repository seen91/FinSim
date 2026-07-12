import { describe, expect, it } from 'vitest'
import { simulate, ym, type AssetCard, type SourceCard, type Table, type World } from '../src/index.js'

/**
 * Backtesting (DESIGN.md §0 "Backtesting", revised 2026-07-12): the start
 * date IS the backtest control. A table that starts in the past samples its
 * historical series on their real dates; when a series runs out mid-horizon
 * the card's growth component takes over from the last real price (frozen
 * without one), and only that simulated stretch may be shocked.
 */

const table = (...children: Table['root']['children']): Table => ({ root: { id: 'root', kind: 'hand', children } })

const pricedAsset = (id: string, price: NonNullable<AssetCard['price']>, extra?: Partial<AssetCard>): AssetCard => ({
  id,
  kind: 'asset',
  price,
  take: { type: 'fixed', amountPerMonth: 1_000 },
  ...extra,
})

describe('golden backtest scenario (hand-checked)', () => {
  // 12 known prices; 1 000 kr/month buys 10, 8, 5, 4, 2, 1 units per half-year cycle
  const prices = [100, 125, 200, 250, 500, 1_000, 100, 125, 200, 250, 500, 1_000]
  // cumulative units: 10, 18, 23, 27, 29, 30, 40, 48, 53, 57, 59, 60 — times that month's price
  const balances = [1_000, 2_250, 4_600, 6_750, 14_500, 30_000, 4_000, 6_000, 10_600, 14_250, 29_500, 60_000]
  const world: World = { series: { fund: { startMonth: ym(1999, 1), values: prices } } }
  const t: Table = {
    root: {
      id: 'root',
      kind: 'hand',
      children: [
        { id: 'salary', kind: 'source', flow: { type: 'constant', value: 1_000 } },
        pricedAsset('fund', { seriesId: 'fund' }),
      ],
    },
  }

  it('a table started in the past buys hand-computed units at each month’s real price', () => {
    const result = simulate(t, world, ym(1999, 1), ym(1999, 12))
    expect(result.balances.find((b) => b.id === 'fund')!.points).toEqual(balances)
    // the salary funds the take exactly: nothing reaches cash, net worth is the fund
    expect(result.cash.points.every((p) => p === 0)).toBe(true)
    expect(result.netWorth.points).toEqual(balances)
  })

  it('starting before the data is an error, readably — there is nothing to fall back FROM', () => {
    expect(() => simulate(t, world, ym(1998, 12), ym(1999, 12))).toThrow(/no data for 1998-12.*1999-01\.\.1999-12/)
  })
})

describe('when the price data runs out mid-horizon', () => {
  // two real months at 100, then history ends; 12.6825 %/yr ⇒ exactly ×1.01/month
  const world: World = { series: { brief: { startMonth: 0, values: [100, 100] } } }
  const growth = { expected: Math.pow(1.01, 12) - 1 }

  it('the growth component takes over from the last real price', () => {
    const t = table(pricedAsset('fund', { seriesId: 'brief' }, { growth }))
    const result = simulate(t, world, 0, 3)
    // units: 10 + 10 (real months) + 1000/101 + 1000/102.01 at extrapolated prices
    const u2 = 20 + 1_000 / 101
    const u3 = u2 + 1_000 / 102.01
    const points = result.balances.find((b) => b.id === 'fund')!.points
    expect(points[0]).toBeCloseTo(1_000, 8)
    expect(points[1]).toBeCloseTo(2_000, 8)
    expect(points[2]).toBeCloseTo(u2 * 101, 8)
    expect(points[3]).toBeCloseTo(u3 * 102.01, 8)
  })

  it('without a growth component the price freezes — deposits still buy at the last price', () => {
    const t = table(pricedAsset('fund', { seriesId: 'brief' }))
    const result = simulate(t, world, 0, 3)
    expect(result.balances.find((b) => b.id === 'fund')!.points).toEqual([1_000, 2_000, 3_000, 4_000])
  })

  it('a card played entirely after its data starts at the last real price', () => {
    const t = table({ id: 'fund', kind: 'asset', price: { seriesId: 'brief' }, growth, initialBalance: 1_000, startMonth: 5 })
    const result = simulate(t, world, 0, 7)
    const points = result.balances.find((b) => b.id === 'fund')!.points
    // start month: no growth (convention); then ×1.01 per month
    expect(points[5]).toBeCloseTo(1_000, 8)
    expect(points[6]).toBeCloseTo(1_010, 8)
    expect(points[7]).toBeCloseTo(1_020.1, 8)
  })

  it('the dice touch only the simulated stretch — never the real past', () => {
    const shocked: number[] = []
    const t = table(pricedAsset('fund', { seriesId: 'brief' }, { growth: { ...growth, volatility: 0.15 } }))
    simulate(t, world, 0, 5, (_card, i) => {
      shocked.push(i)
      return 0
    })
    // months 0–1 are history and untouchable; 2–5 extrapolate and may be shocked
    expect(shocked).toEqual([2, 3, 4, 5])
  })

  it('a sampled flow simply ends at 0 when its history runs out', () => {
    const salary: SourceCard = { id: 'salary', kind: 'source', flow: { type: 'sampled', data: { startMonth: 0, values: [500, 700] } } }
    const result = simulate(table(salary), {}, 0, 3)
    expect(result.contributions.find((c) => c.id === 'salary')!.points).toEqual([500, 700, 0, 0])
    expect(() => simulate(table(salary), {}, -1, 3)).toThrow(/no data/)
  })
})
