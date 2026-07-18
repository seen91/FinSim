import { priceCurveOf, simulate, validateTable, ym, type AssetCard, type SampledData } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { validateAuthored } from '../src/authored'
import { pileRef } from '../src/builtins'
import { demoSeriesData } from '../src/demoSeries'
import { deserializeDoc, serializeDoc } from '../src/exchange'
import { addCard } from '../src/hands'
import { instanceOf, resolveTable } from '../src/instances'
import { LIBRARY } from '../src/library'
import { runMc } from '../src/mc'
import { migrateDoc, runSim, type Doc } from '../src/model'
import { addSeries, mintPricedDesign, parseMonthText, parseSeriesText, seriesInUse } from '../src/seriesImport'

/**
 * Backtesting (DESIGN.md §0 "Backtesting", revised 2026-07-12): import a
 * series, mint a card wearing it, and move the table's START into the past —
 * there is no separate replay control. Historical cards play their real
 * dates; when the data runs out the card's growth component takes over (and
 * only that stretch may fan); other cards compute as they always do.
 */

// 12 known prices; 1 000 kr/month buys 60 units in total → 60 000 at the last price
const PRICES = [100, 125, 200, 250, 500, 1_000, 100, 125, 200, 250, 500, 1_000]
const GOLDEN_BALANCES = [1_000, 2_250, 4_600, 6_750, 14_500, 30_000, 4_000, 6_000, 10_600, 14_250, 29_500, 60_000]

const goldenDoc = (from: number): Doc => ({
  table: {
    root: {
      id: 'root',
      kind: 'hand',
      children: [
        { id: 'salary', kind: 'source', flow: { type: 'constant', value: 1_000 } },
        { id: 'fund', kind: 'asset', price: { seriesId: 'golden' }, take: { type: 'fixed', amountPerMonth: 1_000 } },
      ],
    },
  },
  world: { series: { golden: { startMonth: ym(1999, 1), values: PRICES } } },
  goal: 50_000,
  from,
  horizonMonths: 12,
})

describe('parseSeriesText', () => {
  it('reads bare values split on commas, semicolons, whitespace and newlines', () => {
    expect(parseSeriesText('1, 2.5, 3\n4;5\t6')).toEqual({ startMonth: null, values: [1, 2.5, 3, 4, 5, 6] })
  })

  it('reads date,value rows and takes the first month from the data', () => {
    expect(parseSeriesText('1990-01, 353.4\n1990-02 356.1\n1990-03;361.2')).toEqual({
      startMonth: ym(1990, 1),
      values: [353.4, 356.1, 361.2],
    })
  })

  it('tolerates one CSV header line before date rows', () => {
    expect(parseSeriesText('Date,Close\n1990-01,353.4\n1990-02,356.1')).toEqual({ startMonth: ym(1990, 1), values: [353.4, 356.1] })
  })

  it('rejects gaps in the months, readably', () => {
    expect(() => parseSeriesText('1990-01, 1\n1990-04, 2')).toThrow(/1990-04 does not follow 1990-01.*consecutive/)
  })

  it('rejects non-numbers with their position', () => {
    expect(() => parseSeriesText('1 2 x 4')).toThrow(/value 3.*“x” is not a number/)
    expect(() => parseSeriesText('1990-01, abc')).toThrow(/line 1.*not a number/)
    expect(() => parseSeriesText('  \n ')).toThrow(/no values/)
  })

  it('parseMonthText reads YYYY-MM and refuses the rest', () => {
    expect(parseMonthText('1999-03')).toBe(ym(1999, 3))
    expect(parseMonthText('1999-13')).toBeNull()
    expect(parseMonthText('soon')).toBeNull()
  })
})

describe('minting a priced design from an imported series', () => {
  const data: SampledData = { startMonth: ym(1999, 1), values: PRICES }

  it('is structurally valid and carries the coverage, the fallback and the data traps in its footnote', () => {
    const design = mintPricedDesign('golden', data)
    expect(validateAuthored(design)).toEqual([])
    expect(priceCurveOf((design.card as AssetCard).price!)).toEqual({ type: 'sampled', seriesId: 'golden' })
    // the generic component that takes over when the data runs out
    expect((design.card as AssetCard).growth).toEqual({ expected: 0.07, volatility: 0.15 })
    expect(design.description).toContain('1999-01 … 1999-12')
    expect(design.description).toMatch(/takes over/)
    expect(design.description).toMatch(/total-return/)
    expect(design.description).toMatch(/currency/)
  })

  it('plays onto a table (as an instance) and simulates against its series', () => {
    const doc = goldenDoc(ym(1999, 1))
    const design = mintPricedDesign('golden', data)
    addCard(doc, null, instanceOf(design.id, 'play1'))
    const table = resolveTable(doc.table, [design])
    expect(validateTable(table)).toEqual([])
    expect(() => simulate(table, doc.world!, ym(1999, 1), ym(1999, 12))).not.toThrow()
  })

  it('seriesInUse sees both the table and the library', () => {
    const doc = goldenDoc(ym(1999, 1))
    expect(seriesInUse('golden', doc.table, [])).toBe(true)
    const empty: Doc['table'] = { root: { id: 'root', kind: 'hand', children: [] } }
    expect(seriesInUse('golden', empty, [])).toBe(false)
    expect(seriesInUse('golden', empty, [mintPricedDesign('golden', data)])).toBe(true)
  })
})

describe('the start date is the backtest control', () => {
  it('started on the data, the golden scenario plays the real past — and the doc never moves', () => {
    const doc = goldenDoc(ym(1999, 1))
    const before = structuredClone(doc)
    const sim = runSim(doc)
    expect(doc).toEqual(before)
    expect(sim.active.netWorth.startMonth).toBe(ym(1999, 1))
    expect(sim.active.balances.find((b) => b.id === 'fund')!.points).toEqual(GOLDEN_BALANCES)
  })

  it('started after the data (no growth component) the fund freezes at its last price', () => {
    const sim = runSim(goldenDoc(ym(2026, 1)))
    // every deposit buys at the frozen 1 000: balance is just the deposits
    expect(sim.active.balances.find((b) => b.id === 'fund')!.points).toEqual(PRICES.map((_, i) => (i + 1) * 1_000))
  })

  it('started before the data the table cannot play, readably', () => {
    expect(() => runSim(goldenDoc(ym(1998, 12)))).toThrow(/no data for/)
  })

  it('a historical-only table draws no fan while the horizon stays inside the data', () => {
    expect(runMc(goldenDoc(ym(1999, 1)))).toBeNull()
  })

  it('a volatile growth asset keeps its fan beside historical cards', () => {
    const doc = goldenDoc(ym(1999, 1))
    doc.table.root.children.push({
      id: 'index',
      kind: 'asset',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'fixed', amountPerMonth: 100 },
    })
    const mc = runMc(doc)
    expect(mc).not.toBeNull()
    expect(mc!.bands.p10.points).toHaveLength(doc.horizonMonths!)
  })
})

describe('the draw pile demo history ("Demo index fund")', () => {
  const bp = LIBRARY.find((b) => b.id === 'demo-history')!
  const demoDoc = (from: number, horizonMonths = 30 * 12): Doc => {
    const doc: Doc = { table: { root: { id: 'root', kind: 'hand', children: [] } }, goal: 10_000_000, from, horizonMonths }
    addSeries(doc, bp.series)
    addCard(doc, null, instanceOf(pileRef(bp.id), 'uid1'))
    return doc
  }

  it('is deterministic, positive, and 56 years long', () => {
    const data = demoSeriesData()
    expect(data).toEqual(demoSeriesData())
    expect(data.startMonth).toBe(ym(1970, 1))
    expect(data.values).toHaveLength(56 * 12)
    expect(data.values.every((v) => Number.isFinite(v) && v > 0)).toBe(true)
  })

  it('played the way the app plays it, any start inside the data backtests for a full 30-year horizon', () => {
    const doc = demoDoc(ym(1990, 1))
    expect(validateTable(resolveTable(doc.table, []))).toEqual([])
    expect(() => runSim(doc)).not.toThrow()
    // inside the data (1990-01..2019-12): one real past, no fan
    expect(runMc(doc)).toBeNull()
  })

  it('a horizon that outruns the data hands over to the generic growth — and the fan opens there', () => {
    const doc = demoDoc(ym(2000, 1)) // ..2029-12, data ends 2025-12
    expect(() => runSim(doc)).not.toThrow()
    expect(runMc(doc)).not.toBeNull()
  })

  it('a start before 1970 cannot play, readably', () => {
    expect(() => runSim(demoDoc(ym(1969, 1)))).toThrow(/no data for/)
  })

  it('addSeries never rewrites a series already on the table', () => {
    const doc: Doc = { table: { root: { id: 'root', kind: 'hand', children: [] } }, goal: 1, from: 0, horizonMonths: 12 }
    const mine: SampledData = { startMonth: ym(2000, 1), values: [1, 2, 3] }
    const [id] = Object.keys(bp.series!) as [string]
    addSeries(doc, { [id]: mine })
    addSeries(doc, bp.series)
    expect(doc.world!.series![id]).toEqual(mine)
  })
})

describe('doc round-trips', () => {
  it('serialize → deserialize is exact', () => {
    const doc = goldenDoc(ym(1999, 1))
    expect(deserializeDoc(serializeDoc(doc)).doc).toEqual(doc)
  })

  it('a legacy replay anchor is lifted into the start date, and the v1 cards become instances', () => {
    const legacy = { ...goldenDoc(ym(2026, 1)), replayFrom: ym(1999, 1) }
    const doc = structuredClone(legacy) as Doc
    const minted = migrateDoc(doc)
    expect(doc.from).toBe(ym(1999, 1))
    expect('replayFrom' in doc).toBe(false)
    // the raw salary + priced fund minted into designs their instances play
    expect(minted.length).toBeGreaterThan(0)
    expect(runSim(doc, minted).active.balances.find((b) => b.id === 'fund')!.points).toEqual(GOLDEN_BALANCES)
    // and the same lift happens importing a v1 file
    const back = deserializeDoc(JSON.stringify({ format: 'finsim-table', version: 1, doc: legacy }))
    expect(back.doc.from).toBe(ym(1999, 1))
    expect(runSim(back.doc, back.designs).active.balances.find((b) => b.id === 'fund')!.points).toEqual(GOLDEN_BALANCES)
  })

})
