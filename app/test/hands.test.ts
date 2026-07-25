import { describe, expect, it } from 'vitest'
import { pileRef, presetRef } from '../src/builtins'
import { NEW_HAND_NAME, addCard, duplicateCard, groupOnto, moveOut } from '../src/hands'
import { instanceOf, isInstance, type CardInstance, type HandNode } from '../src/instances'
import { runSim, type Doc } from '../src/model'

/**
 * The stack gesture (2026-07-14): drop one card onto a sibling. Onto a card,
 * the two pile into a fresh hand at the target's slot — target first, dropped
 * card after, the way a pile grows. Onto a hand, the card joins it. This is
 * the one way a card changes hands on the table (besides the draw pile).
 */

/** salary, rent-a, rent-b, savings — four instances in the root, in that order. */
function fourCardDoc(): Doc {
  const doc: Doc = {
    from: 600, // 2050-01, nothing historical in play
    horizonMonths: 12,
    goal: 1_000_000,
    table: { root: { id: 'root', kind: 'hand', children: [] } },
  }
  addCard(doc, null, { id: 'salary-x', ref: presetRef('salary') })
  addCard(doc, null, instanceOf(pileRef('rent'), 'a'))
  addCard(doc, null, instanceOf(pileRef('rent'), 'b'))
  addCard(doc, null, { id: 'savings-x', ref: pileRef('savings') })
  return doc
}

const rootIds = (doc: Doc): string[] => doc.table.root.children.map((c) => c.id)

describe('groupOnto — the stack gesture', () => {
  it('card onto card: a fresh hand at the target slot, target first, dropped card after', () => {
    const doc = fourCardDoc()
    const handId = groupOnto(doc, 'salary-x', 'rent-b', 'u1')

    expect(handId).toBe('hand-u1')
    expect(rootIds(doc)).toEqual(['rent-a', 'hand-u1', 'savings-x'])
    const hand = doc.table.root.children[1] as HandNode
    expect(isInstance(hand)).toBe(false)
    expect(hand.kind).toBe('hand')
    expect(hand.name).toBe(NEW_HAND_NAME)
    expect(hand.children.map((c) => c.id)).toEqual(['rent-b', 'salary-x'])
    // the grouped table still plays — instances resolve through the hand
    expect(() => runSim(doc, [])).not.toThrow()
  })

  it('card onto a hand: the card joins it, playing last — no fresh hand', () => {
    const doc = fourCardDoc()
    groupOnto(doc, 'salary-x', 'rent-b', 'u1')
    const joined = groupOnto(doc, 'rent-a', 'hand-u1', 'u2')

    expect(joined).toBeNull()
    expect(rootIds(doc)).toEqual(['hand-u1', 'savings-x'])
    const hand = doc.table.root.children[0] as HandNode
    expect(hand.children.map((c) => c.id)).toEqual(['rent-b', 'salary-x', 'rent-a'])
  })

  it('a hand dropped onto a card nests — hands can hold hands', () => {
    const doc = fourCardDoc()
    groupOnto(doc, 'salary-x', 'rent-b', 'u1')
    const outerId = groupOnto(doc, 'hand-u1', 'savings-x', 'u2')

    expect(outerId).toBe('hand-u2')
    expect(rootIds(doc)).toEqual(['rent-a', 'hand-u2'])
    const outer = doc.table.root.children[1] as HandNode
    expect(outer.children.map((c) => c.id)).toEqual(['savings-x', 'hand-u1'])
  })

  it('refuses non-siblings, self-drops and unknown ids — the tree stays put', () => {
    const doc = fourCardDoc()
    groupOnto(doc, 'salary-x', 'rent-b', 'u1')
    const before = structuredClone(doc.table.root)

    // rent-a lives in the root, salary-x inside hand-u1 — not siblings
    expect(groupOnto(doc, 'rent-a', 'salary-x', 'u2')).toBeNull()
    expect(groupOnto(doc, 'rent-a', 'rent-a', 'u2')).toBeNull()
    expect(groupOnto(doc, 'ghost', 'rent-a', 'u2')).toBeNull()
    expect(doc.table.root).toEqual(before)
  })
})

describe('moveOut — the inverse gesture', () => {
  it('a card leaves its hand and lands right after it in the parent', () => {
    const doc = fourCardDoc()
    groupOnto(doc, 'salary-x', 'rent-b', 'u1') // root: rent-a, hand-u1[rent-b, salary-x], savings-x
    moveOut(doc, 'rent-b')

    expect(rootIds(doc)).toEqual(['rent-a', 'hand-u1', 'rent-b', 'savings-x'])
    const hand = doc.table.root.children[1] as HandNode
    expect(hand.children.map((c) => c.id)).toEqual(['salary-x'])
  })

  it('climbs one level at a time — out of a nested hand means into the outer hand', () => {
    const doc = fourCardDoc()
    groupOnto(doc, 'salary-x', 'rent-b', 'u1')
    groupOnto(doc, 'hand-u1', 'savings-x', 'u2') // root: rent-a, hand-u2[savings-x, hand-u1[rent-b, salary-x]]
    moveOut(doc, 'rent-b')

    const outer = doc.table.root.children[1] as HandNode
    expect(outer.children.map((c) => c.id)).toEqual(['savings-x', 'hand-u1', 'rent-b'])
  })

  it('a card already in the root stays put', () => {
    const doc = fourCardDoc()
    const before = structuredClone(doc.table.root)
    moveOut(doc, 'rent-a')
    expect(doc.table.root).toEqual(before)
  })
})

describe('duplicateCard — the copy icon', () => {
  it('a card: a fresh id on the same ref, per-copy state riding along, right after the original', () => {
    const doc = fourCardDoc()
    const rentA = doc.table.root.children[1] as CardInstance
    rentA.tune = { percent: 0.5 }
    rentA.enabled = false
    let n = 0
    duplicateCard(doc, 'rent-a', () => `d${String(++n)}`)

    expect(rootIds(doc)).toEqual(['salary-x', 'rent-a', 'rent-d1', 'rent-b', 'savings-x'])
    const copy = doc.table.root.children[2] as CardInstance
    expect(copy.ref).toBe(rentA.ref)
    expect(copy.tune).toEqual({ percent: 0.5 })
    expect(copy.enabled).toBe(false)
    expect(copy.tune).not.toBe(rentA.tune) // a deep copy, nothing shared
    expect(() => runSim(doc, [])).not.toThrow()
  })

  it('a hand goes with everything in it, every node wearing a fresh id', () => {
    const doc = fourCardDoc()
    groupOnto(doc, 'salary-x', 'rent-b', 'u1') // root: rent-a, hand-u1[rent-b, salary-x], savings-x
    let n = 0
    duplicateCard(doc, 'hand-u1', () => `d${String(++n)}`)

    expect(rootIds(doc)).toEqual(['rent-a', 'hand-u1', 'hand-d1', 'savings-x'])
    const copy = doc.table.root.children[2] as HandNode
    expect(copy.children.map((c) => c.id)).toEqual(['rent-d2', 'salary-d3'])
    expect((copy.children[0] as CardInstance).ref).toBe(pileRef('rent'))
    expect(() => runSim(doc, [])).not.toThrow()
  })

  it('an unknown id is a no-op', () => {
    const doc = fourCardDoc()
    const before = structuredClone(doc.table.root)
    duplicateCard(doc, 'ghost', () => 'd1')
    expect(doc.table.root).toEqual(before)
  })
})
