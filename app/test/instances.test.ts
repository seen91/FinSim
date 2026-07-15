import { formatMonthsDelta, validateTable, ym } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { redesign, type AuthoredCard } from '../src/authored'
import { builtinOf, pileRef, presetRef } from '../src/builtins'
import { deserializeDoc, serializeDoc } from '../src/exchange'
import { addCard } from '../src/hands'
import { instanceOf, isInstance, refsIn, repointInstances, resolveTable, type CardInstance, type HandNode } from '../src/instances'
import { migrateDoc, runSim, type Doc } from '../src/model'
import { starterDoc } from '../src/starter'

/**
 * M3c — one card, instances not clones (DESIGN.md §0, 2026-07-14): every
 * leaf on the table is a reference plus per-copy state, so a Workshop edit
 * of the canonical card reaches every copy BY CONSTRUCTION; the dials and
 * set-aside stay per copy. Plus the doc-format migration: a v1 table of full
 * engine cards becomes instances — stamped copies follow their design,
 * unedited one-offs re-point at their built-in, edited orphans mint into
 * the library. The golden baselines must ride through all of it.
 */

const RENT = pileRef('rent')

/** An empty table with three instances of the built-in Rent drain. */
function threeRentsDoc(): Doc {
  const doc: Doc = {
    from: 600, // 2050-01, nothing historical in play
    horizonMonths: 12,
    goal: 1_000_000,
    table: { root: { id: 'root', kind: 'hand', children: [] } },
  }
  addCard(doc, null, { id: 'salary-x', ref: presetRef('salary') })
  for (const uid of ['a', 'b', 'c']) addCard(doc, null, instanceOf(RENT, uid))
  return doc
}

const rentContribution = (doc: Doc, library: AuthoredCard[], id: string): number =>
  runSim(doc, library).active.contributions.find((c) => c.id === id)!.points[0]!

describe('the TODO acceptance: three copies of a built-in drain', () => {
  it('copy to shelf re-points every instance; editing the design changes all three', () => {
    const doc = threeRentsDoc()
    // all three play the built-in's −12 000
    for (const uid of ['a', 'b', 'c']) expect(rentContribution(doc, [], `rent-${uid}`)).toBe(-12_000)

    // the Workshop's "copy to shelf": mint a design, re-point the instances
    const design = redesign(builtinOf(RENT)!, 'rent-mine')
    repointInstances(doc.table.root, RENT, design.id)
    expect(refsIn(doc.table.root)).toContain('rent-mine')
    expect(refsIn(doc.table.root)).not.toContain(RENT)

    // edit the design — every copy follows by construction, no copy-patching
    if (design.card.kind === 'drain') design.card.amount = { type: 'constant', value: 13_000 }
    for (const uid of ['a', 'b', 'c']) expect(rentContribution(doc, [design], `rent-${uid}`)).toBe(-13_000)
  })

  it('a dial moves only its own copy', () => {
    const doc = threeRentsDoc()
    const dialed = doc.table.root.children.find((c) => c.id === 'rent-b') as CardInstance
    dialed.tune = { 'amount.value': 50 } // +50 %
    expect(rentContribution(doc, [], 'rent-a')).toBe(-12_000)
    expect(rentContribution(doc, [], 'rent-b')).toBe(-18_000)
    expect(rentContribution(doc, [], 'rent-c')).toBe(-12_000)
  })

  it('a tune on the canonical card never plays — dials are per-copy state only', () => {
    const doc = threeRentsDoc()
    // a design saved while the Workshop still had dials: a stale tune rides its template
    const design = redesign(builtinOf(RENT)!, 'rent-mine')
    ;(design.card as { tune?: Record<string, number> }).tune = { 'amount.value': 50 }
    repointInstances(doc.table.root, RENT, design.id)
    // every copy plays the written number; only an instance's own dial moves it
    for (const uid of ['a', 'b', 'c']) expect(rentContribution(doc, [design], `rent-${uid}`)).toBe(-12_000)
    const dialed = doc.table.root.children.find((c) => c.id === 'rent-b') as CardInstance
    dialed.tune = { 'amount.value': -50 }
    expect(rentContribution(doc, [design], 'rent-b')).toBe(-6_000)
    // and a design cut from a tuned card comes out clean
    expect((redesign(design, 'rent-again').card as { tune?: unknown }).tune).toBeUndefined()
  })

  it('set one aside — the others keep playing', () => {
    const doc = threeRentsDoc()
    const aside = doc.table.root.children.find((c) => c.id === 'rent-b') as CardInstance
    aside.enabled = false
    const sim = runSim(doc, [])
    expect(sim.active.contributions.find((c) => c.id === 'rent-b')!.points.every((v) => v === 0)).toBe(true)
    expect(rentContribution(doc, [], 'rent-a')).toBe(-12_000)
    expect(rentContribution(doc, [], 'rent-c')).toBe(-12_000)
    // and no compare for the set-aside copy — it is already out of the sim
    expect(sim.compares.some((c) => c.cardId === 'rent-b')).toBe(false)
  })
})

describe('table export/import carries the designs its instances reference', () => {
  it('exports only referenced designs; import returns them for the library', () => {
    const doc = threeRentsDoc()
    const design = redesign(builtinOf(RENT)!, 'rent-mine')
    repointInstances(doc.table.root, RENT, design.id)
    const unrelated = redesign(builtinOf(pileRef('savings'))!, 'savings-mine')

    const json = serializeDoc(doc, [design, unrelated])
    const envelope = JSON.parse(json) as { version: number; designs?: AuthoredCard[] }
    expect(envelope.version).toBe(2)
    expect(envelope.designs?.map((d) => d.id)).toEqual(['rent-mine'])

    // a reader with an empty library gets a playable table AND the designs
    const imported = deserializeDoc(json, [])
    expect(imported.designs.map((d) => d.id)).toEqual(['rent-mine'])
    expect(imported.doc).toEqual(doc)
    expect(rentContribution(imported.doc, imported.designs, 'rent-a')).toBe(-12_000)
  })

  it('rejects a table whose instances reference a design nobody carries', () => {
    const doc = threeRentsDoc()
    repointInstances(doc.table.root, RENT, 'burned-design')
    expect(() => deserializeDoc(serializeDoc(doc, []), [])).toThrow(/does not know|invalid/)
  })
})

/**
 * The old (v1) starter doc: full engine cards on the table, as shipped
 * pre-instances. `from` is pinned — the salary raise is January-anchored,
 * so the golden-baseline numbers below depend on the start month.
 */
function legacyStarterDoc(): Doc & { table: { root: HandNode } } {
  const doc = starterDoc()
  doc.from = ym(2026, 1)
  return { ...doc, table: resolveTable(doc.table, []) as unknown as Doc['table'] }
}

describe('v1 → v2 migration', () => {
  it('an unedited one-off recognizable as a built-in re-points at the built-in', () => {
    const doc = legacyStarterDoc()
    const minted = migrateDoc(doc, [])
    expect(minted).toEqual([]) // the whole starter is built-ins — nothing to mint
    const refs = refsIn(doc.table.root)
    expect(refs).toContain(presetRef('salary'))
    expect(refs).toContain(pileRef('isk-tax'))
    expect(refs).toContain(presetRef('fund'))
    expect(refs).toContain(presetRef('buffer'))
    expect(doc.table.root.children.every((c) => isInstance(c) || c.kind === 'hand')).toBe(true)
    expect(validateTable(resolveTable(doc.table, []))).toEqual([])
  })

  it('a stamped copy follows its design; per-copy dials and set-aside survive', () => {
    const design = redesign(builtinOf(RENT)!, 'rent-mine')
    const doc = legacyStarterDoc()
    const card = structuredClone(design.card) as typeof design.card & { design: string; tune?: Record<string, number> }
    card.id = 'rent-mine-copy1'
    card.design = 'rent-mine'
    card.tune = { 'amount.value': -10 }
    card.enabled = false
    addCard(doc, null, card)
    migrateDoc(doc, [design])
    const inst = doc.table.root.children.find((c) => c.id === 'rent-mine-copy1') as CardInstance
    expect(inst.ref).toBe('rent-mine')
    expect(inst.tune).toEqual({ 'amount.value': -10 })
    expect(inst.enabled).toBe(false)
  })

  it('a copy dealt before the stamp existed is matched by its id suffix', () => {
    const design = redesign(builtinOf(RENT)!, 'rent-mine')
    if (design.card.kind === 'drain') design.card.amount = { type: 'constant', value: 9_999 } // not a built-in's math
    const doc = legacyStarterDoc()
    const card = structuredClone(design.card)
    card.id = 'rent-mine-deadbeef'
    addCard(doc, null, card)
    expect(migrateDoc(doc, [design])).toEqual([])
    expect((doc.table.root.children.find((c) => c.id === 'rent-mine-deadbeef') as CardInstance).ref).toBe('rent-mine')
  })

  it('edited orphans mint ONE design per distinct math, and all copies point there', () => {
    const doc = legacyStarterDoc()
    const rent = structuredClone(builtinOf(RENT)!.card)
    if (rent.kind === 'drain') rent.amount = { type: 'constant', value: 13_000 } // edited — no built-in matches
    for (const uid of ['aaaaaaaa', 'bbbbbbbb']) addCard(doc, null, { ...structuredClone(rent), id: `rent-${uid}` })
    const minted = migrateDoc(doc, [])
    expect(minted).toHaveLength(1)
    const ref = minted[0]!.id
    expect((doc.table.root.children.find((c) => c.id === 'rent-aaaaaaaa') as CardInstance).ref).toBe(ref)
    expect((doc.table.root.children.find((c) => c.id === 'rent-bbbbbbbb') as CardInstance).ref).toBe(ref)
    expect(rentContribution(doc, minted, 'rent-aaaaaaaa')).toBe(-13_000)
  })

  it('a v1 FILE imports whole: migrated, validated, golden baseline intact', () => {
    // the golden scenario, in the old file format: full cards, version 1
    const doc = legacyStarterDoc()
    const invest = doc.table.root.children.find((c) => !isInstance(c) && c.kind === 'hand') as HandNode
    invest.children = invest.children.filter((c) => !('kind' in c) || c.kind !== 'rule') // the ISK-free golden table
    const carHand: HandNode = {
      id: 'car-test',
      name: 'Buy the car',
      kind: 'hand',
      children: [
        structuredClone(builtinOf(presetRef('car-value'))!.card),
        structuredClone(builtinOf(presetRef('car-costs'))!.card),
        { id: 'car-financing-test', name: 'Financing', kind: 'hand', children: [structuredClone(builtinOf(presetRef('car-loan'))!.card)] },
      ],
    }
    addCard(doc as Doc, null, carHand)
    const v1 = JSON.stringify({ format: 'finsim-table', version: 1, doc })

    const imported = deserializeDoc(v1, [])
    expect(imported.designs).toEqual([]) // everything matched a built-in
    const sim = runSim(imported.doc, imported.designs)
    const verdict = sim.compares.find((c) => c.name === 'Buy the car')!
    expect(verdict.delta.deltaMonths).toBe(27)
    expect(formatMonthsDelta(verdict.delta.deltaMonths!)).toBe('2 yr 3 mo')
  })
})
