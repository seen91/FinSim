import { allCards, firstCrossing, formatMonthsDelta, validateTable, ym, type AssetCard, type Card, type DebtCard, type DrainCard, type SourceCard } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { blankCard, mergeLibrary, validateAuthored, type AuthoredCard } from '../src/authored'
import { nameIdOf, restampDesign } from '../src/identity'
import { addCard, moveCard } from '../src/hands'
import { instanceOf, isInstance, resolveTable, type HandNode } from '../src/instances'
import { runSim, type Doc } from '../src/model'
import { deserializeDoc, serializeDoc } from '../src/exchange'

/**
 * The M3(a) acceptance pass (DESIGN.md §13): the M1 question answered
 * end-to-end through the M2 path. No starter hand, no presets — every card
 * is born as a Workshop blank, edited to its numbers, validated, dealt with
 * fresh ids onto an empty table with the app's own gestures, and carried
 * through a table-file export/import round-trip. The verdict must match
 * the hand-checked golden expectation (engine/test/acceptance.car.test.ts,
 * derived from closed-form annuity and amortization formulas):
 *
 *   Salary 65 000 → tax −30 % → expenses −20 500 → five funds at 7 %/±15 %
 *   taking 20 % each, versus a car bundle (240 000 at −15 %/yr, −3 500/mo
 *   running costs, a 240 000 @ 6 % loan paying 4 300/mo in a Financing
 *   hand): the car costs 1 yr 3 mo on the way to 10 MSEK —
 *   2045-06 without, 2046-09 with.
 */

const FROM = ym(2026, 1)

/** Author a blank of the given kind and reshape its template like the CardEditor commits do. */
function author<C extends Card>(kind: Parameters<typeof blankCard>[0], uid: string, edit: (card: C) => C): AuthoredCard {
  const blank = blankCard(kind, uid)
  const authored = { ...blank, card: edit(blank.card as C) }
  restampDesign(authored, nameIdOf(authored)) // the save lands it under its name — the name IS the id
  expect(validateAuthored(authored), `authored "${authored.id}" must validate`).toEqual([])
  return authored
}

/** Sebastian at the bench: all nine designs, authored fresh. */
function authorLibrary(): AuthoredCard[] {
  const salary = author<SourceCard>('source', 'salary', (c) => ({ ...c, name: 'Salary', flow: { type: 'constant', value: 65_000 }, tags: ['income'] }))
  const tax = author<DrainCard>('drain', 'tax', (c) => {
    // the editor's fixed → percent switch: amount and cadence out, percent in
    const { amount: _amount, cadence: _cadence, ...rest } = c
    return { ...rest, name: 'Income tax', percent: 0.3 }
  })
  const expenses = author<DrainCard>('drain', 'expenses', (c) => ({ ...c, name: 'Living expenses', amount: { type: 'constant', value: 20_500 } }))
  const fund = author<AssetCard>('asset', 'fund', (c) => {
    const { initialBalance: _b, ...rest } = c
    return {
      ...rest,
      name: 'Index fund',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'percent', percent: 0.2 },
      tags: ['equity', 'fund'],
    }
  })
  const carValue = author<AssetCard>('asset', 'car-value', (c) => {
    const { take: _take, ...rest } = c
    return { ...rest, name: 'Car', initialBalance: 240_000, growth: { expected: -0.15 } }
  })
  const carCosts = author<DrainCard>('drain', 'car-costs', (c) => ({ ...c, name: 'Running costs', amount: { type: 'constant', value: 3_500 } }))
  const carLoan = author<DebtCard>('debt', 'car-loan', (c) => ({
    ...c,
    name: 'Car loan',
    principal: 240_000,
    interest: { expected: 0.06 },
    payment: { type: 'fixed', amountPerMonth: 4_300 },
  }))
  return [salary, tax, expenses, fund, carValue, carCosts, carLoan].reduce<AuthoredCard[]>((lib, card) => mergeLibrary(lib, [card]), [])
}

/** An empty table — no starter hand anywhere near this test. */
function emptyDoc(): Doc {
  return {
    from: FROM,
    horizonMonths: 30 * 12,
    goal: 10_000_000,
    table: { root: { id: 'root', name: 'Your plan', kind: 'hand', children: [] } },
  }
}

describe('M3(a): the M1 question through the Workshop path, no starter hand', () => {
  it('author → validate → deal → table-file round-trip → play → the hand-checked verdict', () => {
    // 1. Author every card at the bench.
    const library = authorLibrary()

    // 2. Deal onto an empty table with the app's own gestures: every leaf an
    //    instance of its design. Hands are composed on the table (a Workshop
    //    rule), so the bundles are fresh hand nodes.
    const doc = emptyDoc()
    const find = (name: string): AuthoredCard => library.find((c) => c.card.name === name)!

    const budget: HandNode = { id: 'budget-hand', name: 'Current budget', kind: 'hand', children: [] }
    addCard(doc, null, budget)
    addCard(doc, budget.id, instanceOf(find('Salary').id, 'p1'))
    addCard(doc, budget.id, instanceOf(find('Living expenses').id, 'p1'))
    addCard(doc, budget.id, instanceOf(find('Income tax').id, 'p1'))
    // played in the wrong order on purpose: drag the tax above the expenses —
    // order is load-bearing, and reordering is a table gesture too
    const taxId = budget.children.find((c) => isInstance(c) && c.ref === find('Income tax').id)!.id
    moveCard(doc, taxId, 1)
    for (let i = 1; i <= 5; i++) addCard(doc, budget.id, instanceOf(find('Index fund').id, `p${String(i)}`))

    const car: HandNode = { id: 'car-hand', name: 'Buy the car', kind: 'hand', children: [] }
    addCard(doc, null, car)
    addCard(doc, car.id, instanceOf(find('Car').id, 'p1'))
    addCard(doc, car.id, instanceOf(find('Running costs').id, 'p1'))
    const financing: HandNode = { id: 'financing-hand', name: 'Financing', kind: 'hand', children: [] }
    addCard(doc, car.id, financing)
    addCard(doc, financing.id, instanceOf(find('Car loan').id, 'p1'))

    // 3. Share it with yourself: export the table file (it carries the
    //    whole shelf), read it back in on an empty library.
    const shared = deserializeDoc(serializeDoc(doc, library))
    expect(shared.designs).toEqual(library)
    expect(shared.doc).toEqual(doc)

    // the dealt table is structurally valid, with every id freshly suffixed
    const resolved = resolveTable(shared.doc.table, shared.designs)
    expect(validateTable(resolved)).toEqual([])
    const ids = allCards(resolved.root).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)

    // 4. Read the verdict off the table — the hand-checked golden answer.
    const sim = runSim(shared.doc, shared.designs)
    const verdict = sim.compares.find((c) => c.name === 'Buy the car')!
    expect(verdict.delta.baseMonth).toBe(ym(2045, 6))
    expect(verdict.delta.variantMonth).toBe(ym(2046, 9))
    expect(verdict.delta.deltaMonths).toBe(15)
    expect(formatMonthsDelta(verdict.delta.deltaMonths!)).toBe('1 yr 3 mo')
    expect(firstCrossing(sim.active, doc.goal)).toBe(ym(2046, 9))

    // and the first month is the hand-checkable cascade: 65 000 − 30 % −
    // 20 500 = 25 000 into the funds — 5 000, 4 000, 3 200, 2 560, 2 048
    const fundBalances = sim.active.balances.filter((b) => b.id.includes('fund')).map((b) => b.points[0])
    expect(fundBalances).toHaveLength(5)
    const cascade = [5_000, 4_000, 3_200, 2_560, 2_048]
    for (const expected of cascade) {
      expect(fundBalances.some((v) => Math.abs(v! - expected) < 1e-9), `a fund holds ${String(expected)} after month one`).toBe(true)
    }
  })

  it('the same designs survive as templates: dealing twice never collides', () => {
    const library = authorLibrary()
    const doc = emptyDoc()
    const fund = library.find((c) => c.id.includes('fund'))!
    addCard(doc, null, instanceOf(fund.id, 'first'))
    addCard(doc, null, instanceOf(fund.id, 'second'))
    expect(validateTable(resolveTable(doc.table, library))).toEqual([])
    expect(doc.table.root.children[0]!.id).not.toBe(doc.table.root.children[1]!.id)
  })
})
