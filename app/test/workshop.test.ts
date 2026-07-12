import { simulate, validateTable } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { AUTHORABLE_KINDS, blankCard, designIdOf, headlineFor, instantiate, mergeLibrary, validateAuthored, type AuthoredCard } from '../src/authored'
import { addCard, replaceCard } from '../src/hands'
import { deserializePack, serializePack, type Pack } from '../src/packs'
import { starterDoc } from '../src/starter'

/**
 * M2 — the Workshop's data layer: blank cards must be born valid, playing a
 * design must never collide ids, and the pack format must round-trip exactly
 * and reject what it cannot read (DESIGN.md §3, §14.4).
 */

describe('blank-card authoring', () => {
  it.each(AUTHORABLE_KINDS)('a blank %s is structurally valid and playable untouched', (kind) => {
    const blank = blankCard(kind, 'uid1')
    expect(validateAuthored(blank)).toEqual([])
    // and it simulates without blowing up
    const doc = starterDoc()
    addCard(doc, null, instantiate(blank, 'play1'))
    expect(validateTable(doc.table)).toEqual([])
    expect(() => simulate(doc.table, {}, doc.from, doc.from + 23)).not.toThrow()
  })

  it('every blank has a face headline', () => {
    for (const kind of AUTHORABLE_KINDS) {
      expect(headlineFor(blankCard(kind, 'uid1').card).length).toBeGreaterThan(0)
    }
  })
})

describe('playing a design', () => {
  it('deals fresh ids every time — the same design can sit on the table twice', () => {
    const blank = blankCard('rule', 'uid1')
    const first = instantiate(blank, 'a')
    const second = instantiate(blank, 'b')
    expect(first.id).not.toBe(blank.card.id)
    expect(first.id).not.toBe(second.id)
    if (first.kind === 'rule' && second.kind === 'rule') {
      expect(first.rule.id).not.toBe(second.rule.id)
    }
    // the template is untouched
    expect(blank.card.id).toBe(blank.id)
  })

  it('two copies of one design on the starter table validate', () => {
    const doc = starterDoc()
    const blank = blankCard('asset', 'uid1')
    addCard(doc, null, instantiate(blank, 'a'))
    addCard(doc, null, instantiate(blank, 'b'))
    expect(validateTable(doc.table)).toEqual([])
  })
})

describe('the design is the one true card (designIdOf)', () => {
  it('a dealt copy is stamped with its design and found by it', () => {
    const design = blankCard('source', 'uid1')
    const copy = instantiate(design, 'a')
    expect(designIdOf(copy, [design])).toBe(design.id)
  })

  it('an orphan whose design was burned is its own original', () => {
    const design = blankCard('source', 'uid1')
    const copy = instantiate(design, 'a')
    expect(designIdOf(copy, [])).toBeNull()
  })

  it('a one-off card (no stamp, id not from a design) is its own original', () => {
    const design = blankCard('source', 'uid1')
    const salary = starterDoc().table.root.children[0]!
    expect(designIdOf(salary, [design])).toBeNull()
  })

  it('a copy dealt before the stamp existed is matched by its id suffix', () => {
    const design = blankCard('source', 'uid1')
    const legacy = instantiate(design, 'deadbeef')
    delete (legacy as { design?: string }).design
    expect(designIdOf(legacy, [design])).toBe(design.id)
    // even when the design itself is a duplicate, whose id ends in the same shape
    const dupe = structuredClone(design)
    dupe.id = `${design.id}-12345678`
    dupe.card.id = dupe.id
    const fromDupe = instantiate(dupe, 'cafebabe')
    delete (fromDupe as { design?: string }).design
    expect(designIdOf(fromDupe, [design, dupe])).toBe(dupe.id)
  })
})

describe('editing in place (replaceCard)', () => {
  it('swaps a nested card by id and leaves the rest of the tree alone', () => {
    const doc = starterDoc()
    const invest = doc.table.root.children.find((c) => c.kind === 'hand')!
    const fund = invest.kind === 'hand' ? invest.children.find((c) => c.kind === 'asset')! : null!
    replaceCard(doc, { ...fund, name: 'Renamed fund' })
    const again = doc.table.root.children.find((c) => c.kind === 'hand')!
    expect(again.kind === 'hand' && again.children.find((c) => c.id === fund.id)?.name).toBe('Renamed fund')
    expect(validateTable(doc.table)).toEqual([])
  })

  it('never replaces the root hand', () => {
    const doc = starterDoc()
    const before = structuredClone(doc.table.root)
    replaceCard(doc, { ...doc.table.root, name: 'Hijacked' })
    expect(doc.table.root).toEqual(before)
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
