import { allCards, firstCrossing, formatMonthsDelta, ym, type ScheduledRule } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { blankCard } from '../src/authored'
import { pileRef } from '../src/builtins'
import { deserializeDoc, serializeDoc } from '../src/exchange'
import { addCard } from '../src/hands'
import { instanceOf, isInstance, resolveTable, type HandNode } from '../src/instances'
import { debtAt, effectiveHorizon, runSim, type Doc } from '../src/model'
import { PRESETS } from '../src/presets'
import { starterDoc } from '../src/starter'

/**
 * Two halves. First, the app-side M1 acceptance bridge: the hand-checked
 * five-fund golden scenario (engine/test/acceptance.car.test.ts), rebuilt
 * here from raw engine cards and run through the app's own `runSim` — the
 * compare plumbing must reproduce the engine's golden answer, "1 yr 3 mo".
 * Second, the starter table the app actually ships — one relatable
 * household — plus the "Buy the car" preset, with its own pinned delta.
 *
 * The starter's salary raise is January-anchored, so every simulated doc
 * pins `from` to 2026-01 — a wall-clock start would move the numbers.
 */

/** The starter's "Index fund investing" hand — the fund behind a 100 % take, ISK rule card on top. */
function investingHand(doc: Doc): HandNode {
  return doc.table.root.children.find((c): c is HandNode => !isInstance(c) && c.kind === 'hand')!
}

/** The starter, pinned to the tests' fixed start month. */
function starterAt2026(): Doc {
  const doc = starterDoc()
  doc.from = ym(2026, 1)
  return doc
}

/** The pinned starter without its ISK card — the baseline the deltas below are checked against. */
function goldenDoc(): Doc {
  const doc = starterAt2026()
  const invest = investingHand(doc)
  invest.children = invest.children.filter((c) => !isInstance(c) || c.ref !== pileRef('isk-tax'))
  return doc
}

function docWithCar(): Doc {
  const doc = goldenDoc()
  const car = PRESETS.find((p) => p.id === 'buy-the-car')!
  addCard(doc, null, car.build('test'))
  return doc
}

/** The engine acceptance table verbatim (raw cards ride the table untouched). */
function goldenFiveFundDoc(): Doc {
  return {
    from: ym(2026, 1),
    horizonMonths: 30 * 12,
    goal: 10_000_000,
    table: {
      root: {
        id: 'root',
        kind: 'hand',
        children: [
          {
            id: 'budget',
            kind: 'hand',
            name: 'Current budget',
            children: [
              { id: 'salary', kind: 'source', flow: { type: 'constant', value: 65000 }, tags: ['income'] },
              { id: 'income-tax', kind: 'drain', percent: 0.3 },
              { id: 'expenses', kind: 'drain', amount: { type: 'constant', value: 20500 } },
              ...[1, 2, 3, 4, 5].map((i) => ({
                id: `fund${i}`,
                kind: 'asset' as const,
                growth: { expected: 0.07, volatility: 0.15 },
                take: { type: 'percent' as const, percent: 0.2 },
                tags: ['equity', 'fund'],
              })),
            ],
          },
          {
            id: 'car',
            kind: 'hand',
            name: 'Buy the car',
            children: [
              { id: 'car-value', kind: 'asset', initialBalance: 240000, growth: { expected: -0.15 } },
              { id: 'car-costs', kind: 'drain', amount: { type: 'constant', value: 3500 } },
              {
                id: 'car-financing',
                kind: 'hand',
                name: 'Financing',
                children: [
                  { id: 'car-loan', kind: 'debt', principal: 240000, interest: { expected: 0.06 }, payment: { type: 'fixed', amountPerMonth: 4300 } },
                ],
              },
            ],
          },
        ],
      },
    },
  }
}

describe('M1 acceptance through the app model', () => {
  it('the five-fund golden scenario reads off the engine answer: 1 yr 3 mo', () => {
    const doc = goldenFiveFundDoc()
    const sim = runSim(doc)
    const compare = sim.compares.find((c) => c.name === 'Buy the car')!
    expect(compare.delta.deltaMonths).toBe(15)
    expect(formatMonthsDelta(compare.delta.deltaMonths!)).toBe('1 yr 3 mo')
    // same absolute months as the engine acceptance test
    expect(compare.delta.baseMonth).toBe(ym(2045, 6))
    expect(compare.delta.variantMonth).toBe(ym(2046, 9))
    expect(firstCrossing(sim.active, doc.goal)).toBe(ym(2046, 9))
  })

  it('playing the car preset onto the starter reads a pinned delta: 2 yr 3 mo', () => {
    const doc = docWithCar()
    const sim = runSim(doc)
    // every card on the table carries a compare, nested ones included
    expect(sim.compares).toHaveLength(allCards(resolveTable(doc.table, []).root).length)
    const compare = sim.compares.find((c) => c.name === 'Buy the car')!
    expect(compare.delta.deltaMonths).toBe(27)
    expect(formatMonthsDelta(compare.delta.deltaMonths!)).toBe('2 yr 3 mo')
    expect(compare.delta.baseMonth).toBe(doc.from + 130)
    expect(compare.delta.variantMonth).toBe(doc.from + 157)
    expect(firstCrossing(sim.active, doc.goal)).toBe(doc.from + 157)
  })
})

describe('per-card compares', () => {
  it('the salary alone reaches the goal — its solo verdict is its own number', () => {
    const sim = runSim(goldenDoc())
    const salary = sim.compares.find((c) => c.name === 'Salary')!
    expect(salary.soloGoalMonth).not.toBeNull()
  })

  it('living expenses cost time: the plan without them reaches the goal sooner', () => {
    const sim = runSim(goldenDoc())
    const expenses = sim.compares.find((c) => c.name === 'Living expenses')!
    expect(expenses.soloGoalMonth).toBeNull() // a drain never reaches a goal alone
    expect(expenses.delta.deltaMonths).toBeGreaterThan(0)
  })

  it('a nested card compares too: the ISK rule card inside the investing hand costs time', () => {
    const sim = runSim(starterAt2026())
    const isk = sim.compares.find((c) => c.cardId.startsWith('isk-'))!
    expect(isk.delta.deltaMonths).toBeGreaterThan(0)
  })
})

describe('JSON export/import', () => {
  it('round-trips the document exactly', () => {
    const doc = docWithCar()
    doc.world = { rules: [DECEMBER_FUND_TAX] }
    expect(deserializeDoc(serializeDoc(doc)).doc).toEqual(doc)
  })

  it('rejects garbage with a human-readable reason', () => {
    expect(() => deserializeDoc('not json')).toThrow('not a JSON file')
    expect(() => deserializeDoc('{"some":"json"}')).toThrow('not a FinSim table file')
    expect(() => deserializeDoc(JSON.stringify({ format: 'finsim-table', version: 99, doc: {} }))).toThrow('version 99')
  })

  it("lifts the old 'event' kind to 'rule' on a v1 import", () => {
    // a v1 file: full engine cards on the table, the ISK card still an 'event'
    const legacy = { ...starterDoc(), table: resolveTable(starterDoc().table, []) }
    const json = JSON.stringify({ format: 'finsim-table', version: 1, doc: legacy }).replaceAll('"kind":"rule"', '"kind":"event"')
    const imported = deserializeDoc(json)
    const isk = investingHand(imported.doc).children[0]!
    expect(isInstance(isk) && isk.ref).toBe(pileRef('isk-tax'))
  })

  it('rejects a structurally invalid table via the engine validator', () => {
    const doc = starterDoc()
    const dupe = doc.table.root.children[0]!
    doc.table.root.children.push(structuredClone(dupe)) // duplicate card id
    expect(() => deserializeDoc(serializeDoc(doc))).toThrow('Duplicate card id')
  })

  it('a margin card forces v3 so older apps reject readably; margin-free tables keep writing v2 (§0 migrate-or-reject)', () => {
    expect((JSON.parse(serializeDoc(starterDoc())) as { version: number }).version).toBe(2)
    const doc = starterAt2026()
    const design = blankCard('margin', 'm1')
    investingHand(doc).children.splice(1, 0, instanceOf(design.id, 'play1'))
    const json = serializeDoc(doc, [design])
    expect((JSON.parse(json) as { version: number }).version).toBe(3)
    const imported = deserializeDoc(json)
    expect(imported.doc).toEqual(doc)
    expect(imported.designs.map((d) => d.id)).toContain(design.id)
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
  it('the investing hand ships with the ISK rule card on top, draining the index fund below it each December', () => {
    const doc = starterAt2026()
    const invest = investingHand(doc)
    expect(invest.name).toBe('Index fund investing')
    expect(invest.take).toEqual({ type: 'percent', percent: 1 })
    const first = invest.children[0]!
    expect(isInstance(first) && first.ref).toBe(pileRef('isk-tax')) // on top — it only reaches the cards below it
    const bare = runSim(goldenDoc())
    const taxed = runSim(doc)
    // first December in the simulation: month % 12 === 11
    const dec = doc.from + ((11 - (doc.from % 12) + 12) % 12)
    const i = dec - doc.from
    const rate = 0.3 * (0.0196 + 0.01)
    const funds = bare.active.balances.filter((b) => b.id.startsWith('fund-'))
    expect(funds).toHaveLength(1)
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
    // pin the horizon: the tax moves the goal date, so auto horizons would differ between the two sims
    doc.horizonMonths = 30 * 12
    const bare = runSim(doc)
    doc.world = { rules: [DECEMBER_FUND_TAX] }
    const taxed = runSim(doc)
    // first December in the simulation: month % 12 === 11
    const dec = doc.from + ((11 - (doc.from % 12) + 12) % 12)
    const i = dec - doc.from
    const fund = (sim: typeof bare): number[] => sim.active.balances.find((b) => b.id.startsWith('fund-'))!.points
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

describe('effectiveHorizon: the auto horizon follows the goal', () => {
  it('an explicit horizon passes through untouched', () => {
    const doc = starterAt2026()
    doc.horizonMonths = 17 * 12
    expect(effectiveHorizon(doc)).toBe(17 * 12)
  })

  it('auto ends five years after the month the goal is reached', () => {
    const doc = starterAt2026()
    expect(doc.horizonMonths).toBeNull()
    const horizon = effectiveHorizon(doc)
    // the crossing must be measurable inside the resolved horizon itself
    const sim = runSim(doc)
    const cross = firstCrossing(sim.active, doc.goal)!
    expect(horizon).toBe(cross - doc.from + 1 + 5 * 12)
  })

  it('a goal never reached falls back to 30 years', () => {
    const doc = starterAt2026()
    doc.goal = 1e15
    expect(effectiveHorizon(doc)).toBe(30 * 12)
  })

  it('a table the probe cannot play falls back to 30 years, without throwing', () => {
    const doc = starterAt2026()
    doc.table.root.children.push({ id: 'ghost', ref: 'no-such-design' })
    expect(effectiveHorizon(doc)).toBe(30 * 12)
  })
})

describe('debtAt: what the debt cards owe at a month (the scrub readout reads it)', () => {
  it('sums the car loan while it runs and reaches 0 once paid off', () => {
    const doc = docWithCar()
    const sim = runSim(doc)
    // start tick: the principal appears and takes its first payment, no interest yet
    expect(debtAt(sim, doc.from)).toBeCloseTo(-(240000 - 4300), 6)
    // 240 000 @ 6 % on 4 300/mo clears in well under ten years
    expect(debtAt(sim, doc.from + 120)).toBe(0)
  })

  it('reaches debts nested inside hands, and ignores set-aside subtrees', () => {
    const doc = goldenFiveFundDoc()
    const sim = runSim(doc)
    // the loan sits two hands deep (car → financing)
    expect(debtAt(sim, doc.from)).toBeCloseTo(-(240000 - 4300), 6)
    const car = doc.table.root.children.find((c) => 'id' in c && c.id === 'car')!
    ;(car as { enabled?: boolean }).enabled = false
    const without = runSim(doc)
    expect(debtAt(without, doc.from)).toBe(0)
  })

  it('counts a margin loan while it leans on its fund', () => {
    const doc = starterAt2026()
    const design = blankCard('margin', 'm1')
    // between the ISK card and the fund: the fund is below it, so it is pegged
    investingHand(doc).children.splice(1, 0, instanceOf(design.id, 'play1'))
    const sim = runSim(doc, [design])
    expect(debtAt(sim, doc.from)).toBeLessThan(0)
    // the loan is 5 % of the fund's gross balance, forever pegged
    const horizon = doc.from + effectiveHorizon(doc, [design]) - 1
    expect(debtAt(sim, horizon)).toBeLessThan(debtAt(sim, doc.from))
  })

  it('a debt-free table owes nothing anywhere', () => {
    const doc = starterAt2026()
    const sim = runSim(doc)
    expect(debtAt(sim, doc.from)).toBe(0)
    // the starter's horizon is auto — the sim's own length is the last month
    expect(debtAt(sim, doc.from + sim.active.netWorth.points.length - 1)).toBe(0)
  })
})
