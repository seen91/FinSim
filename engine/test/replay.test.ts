import { describe, expect, it } from 'vitest'
import { reanchor, replayCoverage, simulate, ym, type AssetCard, type SourceCard, type Table, type World } from '../src/index.js'

const table = (...children: Table['root']['children']): Table => ({ root: { id: 'root', kind: 'hand', children } })

const pricedAsset = (id: string, price: NonNullable<AssetCard['price']>, startMonth?: number): AssetCard => ({
  id,
  kind: 'asset',
  price,
  take: { type: 'fixed', amountPerMonth: 1_000 },
  ...(startMonth !== undefined ? { startMonth } : {}),
})

describe('reanchor', () => {
  it('shifts named world series, inline price data and inline sampled curves together', () => {
    const world: World = { series: { sp500: { startMonth: ym(1990, 1), values: [1, 2, 3] } } }
    const source: SourceCard = { id: 'rates', kind: 'source', flow: { type: 'sampled', data: { startMonth: ym(1992, 6), values: [5, 6] } } }
    const t = table(pricedAsset('fund', { seriesId: 'sp500' }), pricedAsset('house', { data: { startMonth: ym(1991, 3), values: [7] } }), source)

    const shifted = reanchor(world, t, ym(1990, 1), ym(2026, 1))
    const shift = ym(2026, 1) - ym(1990, 1)
    expect(shifted.world.series!['sp500']!.startMonth).toBe(ym(1990, 1) + shift)
    const [, house, rates] = shifted.table.root.children as [AssetCard, AssetCard, SourceCard]
    expect(house.price!.data!.startMonth).toBe(ym(1991, 3) + shift)
    expect(rates.flow).toEqual({ type: 'sampled', data: { startMonth: ym(1992, 6) + shift, values: [5, 6] } })
  })

  it('never touches the authored inputs', () => {
    const world: World = { series: { sp500: { startMonth: ym(1990, 1), values: [1, 2] } } }
    const t = table(pricedAsset('house', { data: { startMonth: ym(1991, 3), values: [7] } }))
    reanchor(world, t, ym(1990, 1), ym(2026, 1))
    expect(world.series!['sp500']!.startMonth).toBe(ym(1990, 1))
    expect((t.root.children[0] as AssetCard).price!.data!.startMonth).toBe(ym(1991, 3))
  })

  it('leaves non-sampled cards and curves alone (same values, nested hands walked)', () => {
    const salary: SourceCard = { id: 'salary', kind: 'source', flow: { type: 'compound', base: 30_000, annualRate: { expected: 0.03 } } }
    const t = table({ id: 'bundle', kind: 'hand', children: [salary, pricedAsset('fund', { seriesId: 'sp500' })] })
    const world: World = { series: { sp500: { startMonth: 0, values: [1] } } }
    const shifted = reanchor(world, t, 0, 120)
    const bundle = shifted.table.root.children[0]!
    if (bundle.kind !== 'hand') throw new Error('bundle should still be a hand')
    expect(bundle.children[0]).toEqual(salary)
  })
})

describe('replayCoverage', () => {
  const from = ym(2026, 1)
  const to = from + 239 // a 20-year horizon

  it('is empty without historical references', () => {
    const t = table({ id: 'salary', kind: 'source', flow: { type: 'constant', value: 30_000 } })
    expect(replayCoverage({}, t, from, to)).toEqual({ series: [], anchors: null })
  })

  it('offers exactly the anchors whose horizon stays inside the data', () => {
    // 1990-01 .. 2020-12: 372 points; a 240-month horizon can start 1990-01 .. 2001-01
    const world: World = { series: { sp500: { startMonth: ym(1990, 1), values: new Array<number>(372).fill(1) } } }
    const cov = replayCoverage(world, table(pricedAsset('fund', { seriesId: 'sp500' })), from, to)
    expect(cov.series).toEqual([{ seriesId: 'sp500', first: ym(1990, 1), last: ym(2020, 12) }])
    expect(cov.anchors).toEqual({ first: ym(1990, 1), last: ym(2020, 12) - 239 })
    expect(cov.anchors!.last).toBe(ym(2001, 1))
  })

  it('reports a series shorter than the horizon with no offerable anchor', () => {
    const world: World = { series: { brief: { startMonth: ym(2000, 1), values: new Array<number>(120).fill(1) } } }
    const cov = replayCoverage(world, table(pricedAsset('fund', { seriesId: 'brief' })), from, to)
    expect(cov.series).toHaveLength(1)
    expect(cov.anchors).toBeNull()
  })

  it('a card starting later than the plan relaxes the early anchors — but not past the data end', () => {
    const world: World = { series: { sp500: { startMonth: ym(1990, 1), values: new Array<number>(372).fill(1) } } }
    // starts 5 years in: months from+60..to sample A+60..A+239, so anchors reach 60 months earlier
    const late = replayCoverage(world, table(pricedAsset('fund', { seriesId: 'sp500' }, from + 60)), from, to)
    expect(late.anchors).toEqual({ first: ym(1990, 1) - 60, last: ym(2020, 12) - 239 })
    // starting beyond the data's reach leaves nothing to offer
    const short: World = { series: { brief: { startMonth: ym(1990, 1), values: new Array<number>(72).fill(1) } } }
    expect(replayCoverage(short, table(pricedAsset('fund', { seriesId: 'brief' }, from + 120)), from, to).anchors).toBeNull()
  })

  it('intersects across series and keys inline data by card id', () => {
    const world: World = {
      series: {
        long: { startMonth: ym(1970, 1), values: new Array<number>(660).fill(1) }, // ..2024-12
        short: { startMonth: ym(1995, 1), values: new Array<number>(360).fill(1) }, // ..2024-12
      },
    }
    const t = table(
      pricedAsset('a', { seriesId: 'long' }),
      pricedAsset('b', { seriesId: 'short' }),
      pricedAsset('c', { data: { startMonth: ym(1980, 1), values: new Array<number>(480).fill(1) } }), // ..2019-12
    )
    const cov = replayCoverage(world, t, from, to)
    expect(cov.series.map((s) => s.seriesId).sort()).toEqual(['c', 'long', 'short'])
    expect(cov.anchors).toEqual({ first: ym(1995, 1), last: ym(2019, 12) - 239 })
  })

  it('ignores references that do not resolve — a broken table is not a coverage question', () => {
    const cov = replayCoverage({}, table(pricedAsset('fund', { seriesId: 'missing' })), from, to)
    expect(cov).toEqual({ series: [], anchors: null })
  })

  it('first and last offered anchors actually simulate without throwing', () => {
    const world: World = { series: { sp500: { startMonth: ym(1990, 1), values: Array.from({ length: 372 }, (_, i) => 100 + i) } } }
    const t = table(pricedAsset('fund', { seriesId: 'sp500' }))
    const cov = replayCoverage(world, t, from, to)
    for (const anchor of [cov.anchors!.first, cov.anchors!.last]) {
      const shifted = reanchor(world, t, anchor, from)
      expect(() => simulate(shifted.table, shifted.world, from, to)).not.toThrow()
    }
    // one month outside either end throws — the guard is exactly tight
    for (const anchor of [cov.anchors!.first - 1, cov.anchors!.last + 1]) {
      const shifted = reanchor(world, t, anchor, from)
      expect(() => simulate(shifted.table, shifted.world, from, to)).toThrow(/no data/)
    }
  })
})

describe('golden replay scenario (hand-checked)', () => {
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

  it('buys hand-computed units at each month’s price on the historical dates', () => {
    const result = simulate(t, world, ym(1999, 1), ym(1999, 12))
    expect(result.balances.find((b) => b.id === 'fund')!.points).toEqual(balances)
    // the salary funds the take exactly: nothing reaches cash, net worth is the fund
    expect(result.cash.points.every((p) => p === 0)).toBe(true)
    expect(result.netWorth.points).toEqual(balances)
  })

  it('re-anchored to the present, the same table plays the identical shape shifted in time', () => {
    const from = ym(2026, 1)
    const shifted = reanchor(world, t, ym(1999, 1), from)
    const result = simulate(shifted.table, shifted.world, from, ym(2026, 12))
    expect(result.netWorth.startMonth).toBe(from)
    expect(result.netWorth.points).toEqual(balances)
    expect(result.balances.find((b) => b.id === 'fund')!.points).toEqual(balances)
  })
})
