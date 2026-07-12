import { replayCoverage, simulate, validateTable, ym, type AssetCard, type SampledData } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { instantiate, validateAuthored } from '../src/authored'
import { deserializeDoc, serializeDoc } from '../src/exchange'
import { addCard } from '../src/hands'
import { runMc } from '../src/mc'
import { playedTable, runSim, type Doc } from '../src/model'
import { deserializePack, serializePack, type Pack } from '../src/packs'
import { mintPricedDesign, parseMonthText, parseSeriesText, seriesInUse } from '../src/seriesImport'

/**
 * Backtesting (DESIGN.md §0 "Backtesting"): import a series, mint a card
 * wearing it, pick a date — the sim boundary re-anchors shifted copies and
 * the authored doc never moves, mirroring the tuning-dial tests.
 */

// 12 known prices; 1 000 kr/month buys 60 units in total → 60 000 at the last price
const PRICES = [100, 125, 200, 250, 500, 1_000, 100, 125, 200, 250, 500, 1_000]
const GOLDEN_BALANCES = [1_000, 2_250, 4_600, 6_750, 14_500, 30_000, 4_000, 6_000, 10_600, 14_250, 29_500, 60_000]

const replayDoc = (replayFrom?: number): Doc => ({
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
  from: ym(2026, 1),
  horizonMonths: 12,
  ...(replayFrom !== undefined ? { replayFrom } : {}),
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

  it('is structurally valid and carries the coverage + data traps in its footnote', () => {
    const design = mintPricedDesign('golden', data, 'uid1')
    expect(validateAuthored(design)).toEqual([])
    expect((design.card as AssetCard).price?.seriesId).toBe('golden')
    expect(design.description).toContain('1999-01 … 1999-12')
    expect(design.description).toMatch(/total-return/)
    expect(design.description).toMatch(/currency/)
  })

  it('plays onto a table and simulates against its series', () => {
    const doc = replayDoc()
    addCard(doc, null, instantiate(mintPricedDesign('golden', data, 'uid1'), 'play1'))
    expect(validateTable(doc.table)).toEqual([])
    expect(() => simulate(doc.table, doc.world!, ym(1999, 1), ym(1999, 12))).not.toThrow()
  })

  it('seriesInUse sees both the table and the library', () => {
    const doc = replayDoc()
    expect(seriesInUse('golden', doc.table, [])).toBe(true)
    const empty: Doc['table'] = { root: { id: 'root', kind: 'hand', children: [] } }
    expect(seriesInUse('golden', empty, [])).toBe(false)
    expect(seriesInUse('golden', empty, [mintPricedDesign('golden', data, 'uid1')])).toBe(true)
  })
})

describe('the replay anchor at the sim boundary', () => {
  it('re-anchored, the golden scenario plays on the present timeline — and the authored doc never moves', () => {
    const doc = replayDoc(ym(1999, 1))
    const before = structuredClone(doc)
    const sim = runSim(doc)
    expect(doc).toEqual(before)
    expect(sim.active.netWorth.startMonth).toBe(ym(2026, 1))
    expect(sim.active.balances.find((b) => b.id === 'fund')!.points).toEqual(GOLDEN_BALANCES)
  })

  it('without an anchor the same table would outrun its data', () => {
    expect(() => runSim(replayDoc())).toThrow(/no data for/)
  })

  it('playedTable only shifts copies: clearing the anchor is the authored world again', () => {
    const doc = replayDoc(ym(1999, 1))
    const shifted = playedTable(doc)
    expect(shifted.world.series!['golden']!.startMonth).toBe(ym(2026, 1))
    expect(doc.world!.series!['golden']!.startMonth).toBe(ym(1999, 1))
    delete doc.replayFrom
    expect(playedTable(doc).world.series!['golden']!.startMonth).toBe(ym(1999, 1))
  })

  it('replayCoverage feeds the picker: only anchors that cover the whole horizon', () => {
    const doc = replayDoc()
    const cov = replayCoverage(doc.world!, doc.table, doc.from, doc.from + doc.horizonMonths - 1)
    expect(cov.anchors).toEqual({ first: ym(1999, 1), last: ym(1999, 1) })
    // a longer horizon than the data leaves nothing to offer
    expect(replayCoverage(doc.world!, doc.table, doc.from, doc.from + 12).anchors).toBeNull()
  })

  it('a priced-only table draws no fan — one real past, not futures', () => {
    expect(runMc(replayDoc(ym(1999, 1)))).toBeNull()
  })

  it('a volatile asset keeps its fan under a replay', () => {
    const doc = replayDoc(ym(1999, 1))
    doc.table.root.children.push({
      id: 'index',
      kind: 'asset',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'fixed', amountPerMonth: 100 },
    })
    const mc = runMc(doc)
    expect(mc).not.toBeNull()
    expect(mc!.bands.p10.points).toHaveLength(doc.horizonMonths)
  })
})

describe('replay round-trips', () => {
  it('the doc file carries the anchor (additive field, no version bump)', () => {
    const doc = replayDoc(ym(1999, 1))
    const back = deserializeDoc(serializeDoc(doc))
    expect(back.replayFrom).toBe(ym(1999, 1))
    // absent stays absent
    expect(deserializeDoc(serializeDoc(replayDoc())).replayFrom).toBeUndefined()
  })

  it('rejects a malformed anchor readably', () => {
    const json = serializeDoc(replayDoc()).replace('"goal"', '"replayFrom": 12.5, "goal"')
    expect(() => deserializeDoc(json)).toThrow(/replay anchor/)
  })

  it('a pack carries the series its designs wear', () => {
    const design = mintPricedDesign('golden', { startMonth: ym(1999, 1), values: PRICES }, 'uid1')
    const pack: Pack = { name: 'History', cards: [design], series: { golden: { startMonth: ym(1999, 1), values: PRICES } } }
    const back = deserializePack(serializePack(pack))
    expect(back.series).toEqual(pack.series)
    expect(back.cards[0]!.id).toBe(design.id)
  })
})
