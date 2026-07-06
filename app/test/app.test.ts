import { firstCrossing, formatMonthsDelta, type ScheduledRule } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { deserializeDoc, serializeDoc } from '../src/exchange'
import { addCard } from '../src/hands'
import { runSim, type Doc } from '../src/model'
import { PRESETS } from '../src/presets'
import { starterDoc } from '../src/starter'

/**
 * The app-side half of the M1 acceptance test: the starter table plus the
 * "Buy the car" preset, run through the app's own `runSim`, must reproduce
 * the engine's hand-checked golden answer — the car costs "1 yr 3 mo" on
 * the way to 10 MSEK. The engine test proves the math; this proves the
 * starter pack and the compare plumbing feed it the right table.
 */

/** The starter table without the ISK card it now ships with — the hand-checked golden scenario predates it. */
function goldenDoc(): Doc {
  const doc = starterDoc()
  doc.table.root.children = doc.table.root.children.filter((c) => c.kind !== 'event')
  return doc
}

function docWithCar(): Doc {
  const doc = goldenDoc()
  const car = PRESETS.find((p) => p.id === 'buy-the-car')!
  addCard(doc, null, car.build('test'))
  return doc
}

describe('M1 acceptance through the app model', () => {
  it('playing the car preset reads off the golden answer: 1 yr 3 mo', () => {
    const doc = docWithCar()
    const sim = runSim(doc)
    expect(sim.compares).toHaveLength(1)
    const compare = sim.compares[0]!
    expect(compare.name).toBe('Buy the car')
    expect(compare.delta.deltaMonths).toBe(15)
    expect(formatMonthsDelta(compare.delta.deltaMonths!)).toBe('1 yr 3 mo')
    // same absolute offsets as the engine acceptance test, whatever the start month
    expect(compare.delta.baseMonth).toBe(doc.from + 233)
    expect(compare.delta.variantMonth).toBe(doc.from + 248)
    expect(firstCrossing(sim.active, doc.goal)).toBe(doc.from + 248)
  })
})

describe('JSON export/import', () => {
  it('round-trips the document exactly', () => {
    const doc = docWithCar()
    doc.world = { rules: [DECEMBER_FUND_TAX] }
    expect(deserializeDoc(serializeDoc(doc))).toEqual(doc)
  })

  it('rejects garbage with a human-readable reason', () => {
    expect(() => deserializeDoc('not json')).toThrow('not a JSON file')
    expect(() => deserializeDoc('{"some":"json"}')).toThrow('not a FinSim table file')
    expect(() => deserializeDoc(JSON.stringify({ format: 'finsim-table', version: 99, doc: {} }))).toThrow('version 99')
  })

  it('rejects a structurally invalid table via the engine validator', () => {
    const doc = starterDoc()
    const dupe = doc.table.root.children[0]!
    doc.table.root.children.push(structuredClone(dupe)) // duplicate card id
    expect(() => deserializeDoc(serializeDoc(doc))).toThrow('Duplicate card id')
  })
})

/**
 * The UI no longer writes world rules (taxes are modeled on the cards), but
 * the engine hook stays wired through runSim for future data packs — this
 * generic rule proves the plumbing.
 */
const DECEMBER_FUND_TAX: ScheduledRule = {
  id: 'test-december-fund-tax',
  schedule: { kind: 'yearly', monthOfYear: 12 },
  target: { tags: ['fund'] },
  effect: { type: 'balanceTax', rate: 0.01 },
}

describe('taxes as cards', () => {
  it('the default hand ships with the ISK tax card, draining every index fund each December', () => {
    const doc = starterDoc()
    expect(doc.table.root.children.filter((c) => c.kind === 'event')).toHaveLength(1)
    const bare = runSim(goldenDoc())
    const taxed = runSim(doc)
    // first December in the simulation: month % 12 === 11
    const dec = doc.from + ((11 - (doc.from % 12) + 12) % 12)
    const i = dec - doc.from
    const rate = 0.3 * (0.0196 + 0.01)
    const funds = bare.active.balances.filter((b) => b.id.startsWith('fund'))
    expect(funds).toHaveLength(5)
    for (const fund of funds) {
      const taxedFund = taxed.active.balances.find((b) => b.id === fund.id)!
      expect(taxedFund.points[i]).toBeCloseTo(fund.points[i]! * (1 - rate), 6)
    }
    // the card moves no monthly money — only balances are drained
    const iskContribution = taxed.active.contributions.find((c) => c.id.startsWith('isk-'))!
    expect(iskContribution.points.every((v) => v === 0)).toBe(true)
    // and the tax shows up as a later goal date
    expect(firstCrossing(taxed.active, doc.goal)!).toBeGreaterThan(firstCrossing(bare.active, doc.goal)!)
  })
})

describe('world rules through runSim', () => {
  it('a scheduled balance tax drains tagged fund balances every December', () => {
    const doc = docWithCar()
    const bare = runSim(doc)
    doc.world = { rules: [DECEMBER_FUND_TAX] }
    const taxed = runSim(doc)
    // first December in the simulation: month % 12 === 11
    const dec = doc.from + ((11 - (doc.from % 12) + 12) % 12)
    const i = dec - doc.from
    const fund = (sim: typeof bare): number[] => sim.active.balances.find((b) => b.id.startsWith('fund1-'))!.points
    expect(fund(taxed)[i]).toBeCloseTo(fund(bare)[i]! * 0.99, 6)
    // the untagged car is untouched by the rule
    const car = (sim: typeof bare): number[] => sim.active.balances.find((b) => b.id.startsWith('car-value-'))!.points
    expect(car(taxed)).toEqual(car(bare))
    // and the tax compounds into a strictly lower net worth from then on
    for (let k = i; k < taxed.active.netWorth.points.length; k++) {
      expect(taxed.active.netWorth.points[k]!).toBeLessThan(bare.active.netWorth.points[k]!)
    }
  })
})
