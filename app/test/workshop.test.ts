import { simulate, validateTable } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { AUTHORABLE_KINDS, blankCard, headlineFor, mergeLibrary, redesign, validateAuthored, type AuthoredCard } from '../src/authored'
import { builtinOf, pileRef, presetRef } from '../src/builtins'
import { addCard } from '../src/hands'
import { canonicalOf, instanceOf, isInstance, resolveInstance, resolveTable } from '../src/instances'
import { LIBRARY } from '../src/library'
import { deserializePack, serializePack, type Pack } from '../src/packs'
import { starterDoc } from '../src/starter'

/**
 * M2/M3c — the Workshop's data layer: blank cards must be born valid,
 * playing a canonical card deals an INSTANCE that never collides ids, and
 * the pack format must round-trip exactly and reject what it cannot read
 * (DESIGN.md §3, §14.4, §0 "One card — instances").
 */

describe('blank-card authoring', () => {
  it.each(AUTHORABLE_KINDS)('a blank %s is structurally valid and playable untouched', (kind) => {
    const blank = blankCard(kind, 'uid1')
    expect(validateAuthored(blank)).toEqual([])
    // and its instance resolves and simulates without blowing up
    const doc = starterDoc()
    addCard(doc, null, instanceOf(blank.id, 'play1'))
    const table = resolveTable(doc.table, [blank])
    expect(validateTable(table)).toEqual([])
    expect(() => simulate(table, {}, doc.from, doc.from + 23)).not.toThrow()
  })

  it('every blank has a face headline', () => {
    for (const kind of AUTHORABLE_KINDS) {
      expect(headlineFor(blankCard(kind, 'uid1').card).length).toBeGreaterThan(0)
    }
  })
})

describe('playing a canonical card (instances)', () => {
  it('deals fresh ids every time — the same design can sit on the table twice', () => {
    const blank = blankCard('rule', 'uid1')
    const first = instanceOf(blank.id, 'a')
    const second = instanceOf(blank.id, 'b')
    expect(first.id).not.toBe(blank.card.id)
    expect(first.id).not.toBe(second.id)
    expect(first.ref).toBe(blank.id)
    // resolution rewrites the clone's ids to the instance's; the template is untouched
    const resolved = resolveInstance(first, [blank])
    expect(resolved.id).toBe(first.id)
    if (resolved.kind === 'rule') expect(resolved.rule.id).toBe(`${first.id}-rule`)
    expect(blank.card.id).toBe(blank.id)
  })

  it('two instances of one design on the starter table validate', () => {
    const doc = starterDoc()
    const blank = blankCard('asset', 'uid1')
    addCard(doc, null, instanceOf(blank.id, 'a'))
    addCard(doc, null, instanceOf(blank.id, 'b'))
    expect(validateTable(resolveTable(doc.table, [blank]))).toEqual([])
  })

  it('an instance carries exactly its per-copy state: dials, set-aside, id', () => {
    const blank = blankCard('drain', 'uid1')
    const inst = instanceOf(blank.id, 'a')
    inst.tune = { 'amount.value': 50 }
    inst.enabled = false
    const resolved = resolveInstance(inst, [blank])
    expect(resolved.enabled).toBe(false)
    expect((resolved as { tune?: unknown }).tune).toEqual({ 'amount.value': 50 })
    // everything else is the canonical card's
    expect(resolved.name).toBe(blank.card.name)
  })

  it('a ref nothing answers to fails readably', () => {
    expect(() => resolveInstance({ id: 'ghost-1', ref: 'burned-design' }, [])).toThrow(/plays a design this table does not know/)
  })
})

describe('canonical cards come in two species', () => {
  it('a library design shadows nothing: built-ins resolve by their own refs', () => {
    const rent = builtinOf(pileRef('rent'))!
    expect(rent.card.kind).toBe('drain')
    expect(builtinOf(presetRef('salary'))!.card.name).toBe('Salary')
    // pile salary and preset salary are different canonicals
    expect(builtinOf(pileRef('salary'))!.card).not.toEqual(builtinOf(presetRef('salary'))!.card)
  })

  it('canonicalOf reads the library first, then the built-ins', () => {
    const design = blankCard('drain', 'uid1')
    expect(canonicalOf(design.id, [design])).toBe(design)
    expect(canonicalOf(pileRef('rent'), [design])).toEqual(builtinOf(pileRef('rent')))
    expect(canonicalOf('nothing', [design])).toBeNull()
  })

  it('hands are compositions, never canonical — the pile deals no hand blueprints', () => {
    expect(LIBRARY.some((bp) => bp.card.kind === 'hand')).toBe(false)
    expect(builtinOf(pileRef('empty-hand'))).toBeNull() // the removed blueprint stays gone
  })

  it('redesign mints an independent design: fresh ids, same math and front matter', () => {
    const rent = builtinOf(pileRef('rent'))!
    const mine = redesign(rent, 'rent-mine')
    expect(mine.id).toBe('rent-mine')
    expect(mine.card.id).toBe('rent-mine')
    expect(mine.glyph).toBe(rent.glyph)
    expect(mine.card).toEqual({ ...rent.card, id: 'rent-mine' })
    // and the original template never moved
    expect(rent.card.id).toBe('rent')
  })
})

describe('the starter table is instances all the way down', () => {
  it('every leaf is an instance of a built-in; hands stay compositions', () => {
    const doc = starterDoc()
    for (const child of doc.table.root.children) {
      if (isInstance(child)) expect(builtinOf(child.ref)).not.toBeNull()
      else expect(child.kind).toBe('hand')
    }
    expect(validateTable(resolveTable(doc.table, []))).toEqual([])
  })
})

function samplePack(): Pack {
  return {
    name: 'Test pack',
    description: 'Two designs and a series',
    cards: [blankCard('source', 'p1'), blankCard('rule', 'p2')],
    series: { 'test-series': { startMonth: 0, values: [1, 2, 3] } },
  }
}

describe('pack format (decides DESIGN §14.4)', () => {
  it('round-trips exactly', () => {
    const pack = samplePack()
    expect(deserializePack(serializePack(pack))).toEqual(pack)
  })

  it('rejects garbage with a human-readable reason', () => {
    expect(() => deserializePack('not json')).toThrow('not a JSON file')
    expect(() => deserializePack('{"some":"json"}')).toThrow('not a FinSim pack file')
    expect(() => deserializePack(JSON.stringify({ format: 'finsim-table', version: 1, pack: {} }))).toThrow('not a FinSim pack file')
  })

  it('rejects versions newer than it knows', () => {
    const json = serializePack(samplePack()).replace('"version": 1', '"version": 99')
    expect(() => deserializePack(json)).toThrow('version 99')
  })

  it('rejects a pack whose card is structurally invalid', () => {
    const pack = samplePack()
    const drain = blankCard('drain', 'bad')
    if (drain.card.kind === 'drain') drain.card.percent = 2 // and amount too — doubly wrong
    pack.cards.push(drain)
    expect(() => deserializePack(serializePack(pack))).toThrow('is invalid')
  })

  it('rejects duplicate card ids inside a pack', () => {
    const pack = samplePack()
    pack.cards.push(structuredClone(pack.cards[0]!))
    expect(() => deserializePack(serializePack(pack))).toThrow('two cards')
  })

  it('coerces an unknown glyph instead of failing the pack', () => {
    const json = serializePack(samplePack()).replace('"glyph": "coins"', '"glyph": "dragon"')
    const pack = deserializePack(json)
    expect(pack.cards[0]!.glyph).toBe('trend')
  })

  it('carries unknown optional fields through — additive changes never bump the version', () => {
    const envelope = JSON.parse(serializePack(samplePack())) as { pack: Pack & { futureField?: string } }
    envelope.pack.futureField = 'from a newer app'
    const pack = deserializePack(JSON.stringify(envelope)) as Pack & { futureField?: string }
    expect(pack.futureField).toBe('from a newer app')
  })
})

describe('library merge', () => {
  it('same id replaces, new appends', () => {
    const a: AuthoredCard = blankCard('source', 'a')
    const b: AuthoredCard = blankCard('drain', 'b')
    const library = [a, b]
    const editedA = { ...a, card: { ...a.card, name: 'Edited' } }
    const c = blankCard('asset', 'c')
    const merged = mergeLibrary(library, [editedA, c])
    expect(merged).toHaveLength(3)
    expect(merged[0]!.card.name).toBe('Edited')
    expect(merged[2]!.id).toBe(c.id)
  })
})
