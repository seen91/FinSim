import { describe, expect, it } from 'vitest'
import { blankCard } from '../src/authored'
import { pileRef, presetRef } from '../src/builtins'
import { contenderDoc, contenderLabel, resolveContender, runCompare, selKey } from '../src/compare'
import { addCard, removeCard } from '../src/hands'
import { instanceOf, type HandNode } from '../src/instances'
import { runSim, type Doc } from '../src/model'
import { PRESETS } from '../src/presets'
import { snapshotHand } from '../src/savedHands'
import { starterDoc } from '../src/starter'

/**
 * Comparison: two whole plans — the table as it stands, a saved hand, a
 * preset hand, or a single card played as a one-card plan — simulated on
 * otherwise identical docs and judged as a time-to-goal delta. The "what does
 * the car actually cost me" answer the saved-hands feature was built for.
 */

describe('runCompare', () => {
  it('the table against the saved no-car plan reads exactly what the car card says', () => {
    const doc = starterDoc()
    doc.horizonMonths = 40 * 12
    const car = PRESETS.find((p) => p.id === 'buy-the-car')!
    addCard(doc, null, car.build('t'))

    // the per-card verdict: the plan without the car (ghost) vs with it (active)
    const carDelta = runSim(doc).compares.find((c) => c.cardId === 'car-t')!.delta
    expect(carDelta.deltaMonths).toBeGreaterThan(0)

    const noCar = structuredClone(doc)
    removeCard(noCar, 'car-t')
    const saved = snapshotHand(noCar.table.root, 'No car', [])

    // A = the table (with car), B = the saved no-car plan: the same two sims, mirrored
    const run = runCompare(doc, { type: 'table' }, { type: 'saved', saved })
    expect(run.delta.baseMonth).toBe(carDelta.variantMonth)
    expect(run.delta.variantMonth).toBe(carDelta.baseMonth)
    expect(run.delta.deltaMonths).toBe(-carDelta.deltaMonths!)
    expect(run.a.crossing).toBe(carDelta.variantMonth)
    expect(run.b.crossing).toBe(carDelta.baseMonth)
  })

  it('a contender that never reaches the goal is said plainly, no delta invented', () => {
    const doc = starterDoc() // auto horizon: the table's own crossing sets the probe
    const broke: HandNode = { id: 'h-broke', kind: 'hand', name: 'Broke', children: [instanceOf(presetRef('expenses'), 'x')] }
    const saved = snapshotHand(broke, 'Broke', [])

    const run = runCompare(doc, { type: 'table' }, { type: 'saved', saved })
    expect(run.a.crossing).not.toBeNull()
    expect(run.b.crossing).toBeNull()
    expect(run.delta.deltaMonths).toBeNull()
  })

  it('a saved priced hand plays on a fresh table — its carried series merges in, the base doc stays clean', () => {
    const priced = blankCard('asset', 'd1')
    priced.card = { ...priced.card, kind: 'asset', price: { seriesId: 'my-series' } }
    const hand: HandNode = { id: 'h', kind: 'hand', name: 'Priced', children: [{ id: 'priced-x', ref: priced.id }] }
    const world = { 'my-series': { startMonth: 600, values: [100, 101, 102] } }
    const saved = snapshotHand(hand, 'Priced', [priced], world)

    const fresh: Doc = { from: 600, horizonMonths: 3, goal: 1, table: { root: { id: 'root', kind: 'hand', children: [] } } }
    const run = runCompare(fresh, { type: 'table' }, { type: 'saved', saved }, [priced])
    expect(run.b.netWorth.points).toHaveLength(3)
    expect(fresh.world).toBeUndefined()

    // the merge is what makes it play: the same hand stripped of its series cannot
    const bare = { ...saved }
    delete bare.series
    expect(() => runCompare(fresh, { type: 'table' }, { type: 'saved', saved: bare }, [priced])).toThrow()
  })

  it('both plans share one horizon: the longer of the two effective ones', () => {
    const doc = starterDoc()
    doc.horizonMonths = 90
    const empty: HandNode = { id: 'h-empty', kind: 'hand', name: 'Empty', children: [] }
    const saved = snapshotHand(empty, 'Empty', [])
    const run = runCompare(doc, { type: 'table' }, { type: 'saved', saved })
    expect(run.horizonMonths).toBe(90)
    expect(run.a.netWorth.points).toHaveLength(90)
    expect(run.b.netWorth.points).toHaveLength(90)
  })
})

describe('contenderDoc', () => {
  it('plays a saved hand as root without its take — the snapshot keeps it', () => {
    const hand: HandNode = {
      id: 'h',
      kind: 'hand',
      name: 'Saver',
      take: { type: 'percent', percent: 0.5 },
      tune: { 'take.percent': 20, 'children.0.flow.base': 10 },
      children: [],
    }
    const saved = snapshotHand(hand, 'Saver', [])
    const doc = contenderDoc(starterDoc(), { type: 'saved', saved })
    expect(doc.table.root.take).toBeUndefined()
    expect(doc.table.root.tune).toEqual({ 'children.0.flow.base': 10 })
    expect(saved.hand.take).toEqual({ type: 'percent', percent: 0.5 })
    expect(saved.hand.tune).toEqual({ 'take.percent': 20, 'children.0.flow.base': 10 })
  })

  it('the table contender is the doc itself', () => {
    const doc = starterDoc()
    expect(contenderDoc(doc, { type: 'table' })).toBe(doc)
  })
})

describe('challengers beyond saved hands', () => {
  it('a single card plays as a one-card plan — the base doc untouched', () => {
    const doc = starterDoc()
    const before = structuredClone(doc)
    const run = runCompare(doc, { type: 'table' }, { type: 'card', ref: pileRef('nest-egg') })
    expect(run.b.label).toBe('Nest egg')
    expect(run.b.netWorth.points).toHaveLength(run.horizonMonths)
    expect(doc).toEqual(before)

    const cDoc = contenderDoc(doc, { type: 'card', ref: pileRef('nest-egg') })
    expect(cDoc.table.root.children).toHaveLength(1)
  })

  it("a priced built-in carries its series in, like a saved hand's snapshot does", () => {
    const cDoc = contenderDoc(starterDoc(), { type: 'card', ref: pileRef('demo-history') })
    expect(Object.keys(cDoc.world?.series ?? {})).not.toHaveLength(0)
  })

  it('a preset hand challenges whole — built fresh, judged like any plan', () => {
    const doc = starterDoc()
    const preset = PRESETS.find((p) => p.id === 'buy-the-car')!
    const run = runCompare(doc, { type: 'table' }, { type: 'preset', preset })
    expect(run.b.label).toBe(preset.name)
    expect(run.b.netWorth.points).toHaveLength(run.horizonMonths)
    // the car alone earns nothing — it never reaches the goal, and says so plainly
    expect(run.b.crossing).toBeNull()
  })

  it('a card label comes from its canonical — a design by its name, a built-in by its own', () => {
    const design = blankCard('source', 'd9')
    expect(contenderLabel({ type: 'card', ref: design.id }, [design])).toBe('New source')
    expect(contenderLabel({ type: 'card', ref: pileRef('salary') })).toBe('Salary')
  })
})

describe('resolveContender', () => {
  it('resolves each kind fresh, and answers null when nothing does', () => {
    const saved = snapshotHand({ id: 'h', kind: 'hand', children: [] }, 'Empty', [])
    expect(resolveContender({ kind: 'saved', id: saved.id }, [saved], [])).toEqual({ type: 'saved', saved })
    expect(resolveContender({ kind: 'saved', id: 'gone' }, [saved], [])).toBeNull()
    expect(resolveContender({ kind: 'card', ref: pileRef('salary') }, [], [])).toEqual({ type: 'card', ref: pileRef('salary') })
    expect(resolveContender({ kind: 'card', ref: 'lost-design' }, [], [])).toBeNull()
    expect(resolveContender({ kind: 'preset', id: PRESETS[0]!.id }, [], [])?.type).toBe('preset')
    expect(resolveContender({ kind: 'preset', id: 'nope' }, [], [])).toBeNull()
  })

  it('selKey tells every pick apart, kinds included', () => {
    const keys = [
      selKey({ kind: 'saved', id: 'x' }),
      selKey({ kind: 'preset', id: 'x' }),
      selKey({ kind: 'card', ref: 'x' }),
      selKey({ kind: 'card', ref: pileRef('x') }),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })
})
