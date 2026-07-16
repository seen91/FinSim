import { describe, expect, it } from 'vitest'
import { blankCard } from '../src/authored'
import { presetRef } from '../src/builtins'
import { contenderDoc, runCompare } from '../src/compare'
import { addCard, removeCard } from '../src/hands'
import { instanceOf, type HandNode } from '../src/instances'
import { runSim, type Doc } from '../src/model'
import { PRESETS } from '../src/presets'
import { snapshotHand } from '../src/savedHands'
import { starterDoc } from '../src/starter'

/**
 * Hand comparison: two whole plans — the table as it stands, or a saved hand
 * played as its own root — simulated on otherwise identical docs and judged
 * as a time-to-goal delta. The "what does the car actually cost me" answer
 * the saved-hands feature was built for.
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
    const saved = snapshotHand(noCar.table.root, 'No car', 'u1', [])

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
    const saved = snapshotHand(broke, 'Broke', 'u1', [])

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
    const saved = snapshotHand(hand, 'Priced', 'u1', [priced], world)

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
    const saved = snapshotHand(empty, 'Empty', 'u1', [])
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
    const saved = snapshotHand(hand, 'Saver', 'u1', [])
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
