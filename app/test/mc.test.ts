import { allCards, firstCrossing } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { addCard } from '../src/hands'
import { runMc, MC_PATHS } from '../src/mc'
import { runSim, type Doc } from '../src/model'
import { PRESETS } from '../src/presets'
import { starterDoc } from '../src/starter'
import { rangeVerdict } from '../src/verdict'

/**
 * The Monte Carlo pass through the app (M3b): the starter table carries
 * volatility on its funds, so the chart gets a fan, the plan gets goal odds,
 * and every bundle gets a range read — all seeded, so all pinnable.
 */

function docWithCar(): Doc {
  const doc = starterDoc()
  const car = PRESETS.find((p) => p.id === 'buy-the-car')!
  addCard(doc, null, car.build('test'))
  return doc
}

describe('runMc', () => {
  it('a table without volatility has no fan — the line already tells the whole story', () => {
    const doc = starterDoc()
    for (const card of allCards(doc.table.root)) {
      if (card.kind === 'asset' && card.growth) delete card.growth.volatility
    }
    expect(runMc(doc)).toBeNull()
  })

  it('the starter table gets a nested fan, honest goal odds, and a range per hand', () => {
    const doc = docWithCar()
    const mc = runMc(doc)!
    expect(mc).not.toBeNull()

    // bands nest month by month, and the deterministic line runs near the median
    const det = runSim(doc).active.netWorth.points
    const { p10, p50, p90 } = mc.bands
    expect(p50.points).toHaveLength(det.length)
    for (let i = 0; i < det.length; i++) {
      expect(p10.points[i]!).toBeLessThanOrEqual(p50.points[i]!)
      expect(p50.points[i]!).toBeLessThanOrEqual(p90.points[i]!)
    }
    const last = det.length - 1
    expect(p50.points[last]! / det[last]!).toBeGreaterThan(0.9)
    expect(p50.points[last]! / det[last]!).toBeLessThan(1.1)

    // goal odds are a real probability, consistent with the deterministic read
    expect(mc.goalProbability).toBeGreaterThan(0)
    expect(mc.goalProbability).toBeLessThanOrEqual(1)
    expect(firstCrossing(runSim(doc).active, doc.goal)).not.toBeNull()

    // every hand in play carries a range: investing, car, financing
    const hands = allCards(doc.table.root).filter((c) => c.kind === 'hand')
    expect(hands.length).toBeGreaterThanOrEqual(3)
    for (const hand of hands) expect(mc.ranges.has(hand.id)).toBe(true)

    // the car costs time in most futures: its P10–P90 delta brackets the
    // deterministic 15 months and stays positive
    const carRange = mc.ranges.get(hands.find((h) => h.name === 'Buy the car')!.id)!
    expect(carRange.comparable).toBeGreaterThan(0.5)
    expect(carRange.d10).toBeGreaterThan(0)
    expect(carRange.d10).toBeLessThanOrEqual(15)
    expect(carRange.d90).toBeGreaterThanOrEqual(15 * 0.5)
    expect(carRange.d90).toBeLessThan(120)

    // and the verdict line reads like the design's example
    const verdict = rangeVerdict(carRange)!
    expect(verdict.cls).toBe('neg')
    expect(verdict.text).toContain('in 80 % of futures')
  })

  it('is deterministic: the fixed seed pins the fan run to run', () => {
    const doc = docWithCar()
    const a = runMc(doc)!
    const b = runMc(doc)!
    expect(a.bands.p50.points).toEqual(b.bands.p50.points)
    expect(a.goalProbability).toBe(b.goalProbability)
    expect(MC_PATHS).toBeGreaterThanOrEqual(100) // enough paths for a steady P10–P90
  })
})
