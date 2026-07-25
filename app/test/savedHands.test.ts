import { valueAt } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { blankCard } from '../src/authored'
import { pileRef, presetRef } from '../src/builtins'
import { addCard } from '../src/hands'
import { instancesIn, isInstance, type HandNode } from '../src/instances'
import { runSim, type Doc } from '../src/model'
import { countLeaves, snapshotHand, unpackSavedHand } from '../src/savedHands'
import { starterDoc } from '../src/starter'

/**
 * Saved hands: snapshot any hand — the root included — to the draw pile, and
 * deal it back later as a fresh, fully editable composition ("unpacked"): the
 * same instances-and-hands tree wearing fresh ids, per-copy state riding
 * along. The seed of the hand-comparison feature: "my economy" and "my
 * economy without the car" saved side by side.
 */

/** Deterministic uid stream — real deals use crypto UUIDs. */
function uids(prefix: string): () => string {
  let n = 0
  return () => `${prefix}${++n}`
}

/** A hand with per-copy state everywhere: dials, a set-aside, a nested taking hand, two copies of one ref. */
function dressedHand(): HandNode {
  return {
    id: 'hand-orig',
    kind: 'hand',
    name: 'My economy',
    glyph: 'coins',
    take: { type: 'percent', percent: 0.5 },
    children: [
      { id: 'salary-a', ref: presetRef('salary'), tune: { 'flow.base': 45_000 } },
      { id: 'rent-a', ref: pileRef('rent'), enabled: false },
      {
        id: 'inner-orig',
        kind: 'hand',
        name: 'Investing',
        take: { type: 'fixed', amountPerMonth: 3_000 },
        children: [
          { id: 'fund-a', ref: presetRef('fund') },
          { id: 'fund-b', ref: presetRef('fund') },
        ],
      },
    ],
  }
}

describe('snapshotHand', () => {
  it('keeps the tree with its per-copy state and wears the chosen name', () => {
    const saved = snapshotHand(dressedHand(), 'Economy 2026', [])
    expect(saved.id).toBe('Economy 2026') // the name IS the id — saving the same name replaces
    expect(saved.name).toBe('Economy 2026')
    expect(saved.hand.name).toBe('Economy 2026')
    expect(saved.hand.take).toEqual({ type: 'percent', percent: 0.5 })
    const [salary, rent] = saved.hand.children
    expect((salary as { tune?: object }).tune).toEqual({ 'flow.base': 45_000 })
    expect((rent as { enabled?: boolean }).enabled).toBe(false)
    expect(countLeaves(saved.hand)).toBe(4)
  })

  it('is a deep copy — the table moving on never rewrites the snapshot', () => {
    const hand = dressedHand()
    const saved = snapshotHand(hand, 'Frozen', [])
    hand.children.pop()
    ;(hand.children[0] as { tune?: object }).tune = { 'flow.base': 1 }
    expect(saved.hand.children).toHaveLength(3)
    expect((saved.hand.children[0] as { tune?: object }).tune).toEqual({ 'flow.base': 45_000 })
  })

  it('carries the world series its cards wear, like a pack', () => {
    const priced = blankCard('asset', 'd1')
    priced.card = { ...priced.card, kind: 'asset', price: { seriesId: 'my-series' } }
    const hand: HandNode = { id: 'h', kind: 'hand', children: [{ id: 'priced-x', ref: priced.id }] }
    const world = {
      'my-series': { startMonth: 600, values: [100, 101] },
      'unworn-series': { startMonth: 600, values: [1, 2] },
    }
    const saved = snapshotHand(hand, 'Priced', [priced], world)
    expect(saved.series).toEqual({ 'my-series': world['my-series'] })
    // and a hand wearing nothing carries nothing
    expect(snapshotHand(dressedHand(), 'Plain', [], world).series).toBeUndefined()
  })
})

describe('unpackSavedHand', () => {
  it('deals the same tree unpacked: fresh unique ids, refs and state preserved', () => {
    const saved = snapshotHand(dressedHand(), 'Economy', [])
    const dealt = unpackSavedHand(saved, uids('a'))

    // structure and state survive
    expect(dealt.name).toBe('Economy')
    expect(dealt.glyph).toBe('coins')
    expect(dealt.take).toEqual({ type: 'percent', percent: 0.5 })
    const inner = dealt.children[2] as HandNode
    expect(inner.kind).toBe('hand')
    expect(inner.name).toBe('Investing')
    expect(inner.take).toEqual({ type: 'fixed', amountPerMonth: 3_000 })
    expect([...instancesIn(dealt)].map((i) => i.ref)).toEqual([presetRef('salary'), pileRef('rent'), presetRef('fund'), presetRef('fund')])
    expect((dealt.children[0] as { tune?: object }).tune).toEqual({ 'flow.base': 45_000 })
    expect((dealt.children[1] as { enabled?: boolean }).enabled).toBe(false)

    // every id is fresh and unique — two copies of one ref included
    const ids = [dealt.id, inner.id, ...[...instancesIn(dealt)].map((i) => i.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('hand-orig')
    expect(ids).not.toContain('fund-a')
  })

  it('two deals live side by side — no id collides, the snapshot never mutates', () => {
    const saved = snapshotHand(dressedHand(), 'Economy', [])
    const first = unpackSavedHand(saved, uids('a'))
    const second = unpackSavedHand(saved, uids('b'))
    const idsOf = (h: HandNode): string[] => [h.id, ...[...instancesIn(h)].map((i) => i.id)]
    expect(idsOf(first).filter((id) => idsOf(second).includes(id))).toEqual([])
    expect(saved.hand.id).toBe('hand-orig')
    expect((saved.hand.children[0] as { id: string }).id).toBe('salary-a')
  })

  it('the whole plan round-trips: saved from the root, dealt to a fresh table, same simulation', () => {
    const original = starterDoc()
    original.horizonMonths = 120
    const saved = snapshotHand(original.table.root, 'Your plan', [])

    const fresh: Doc = { ...original, table: { root: { id: 'root', kind: 'hand', children: [] } } }
    addCard(fresh, null, unpackSavedHand(saved, uids('a')))

    const dealt = fresh.table.root.children[0] as HandNode
    expect(isInstance(dealt)).toBe(false)
    expect(dealt.name).toBe('Your plan')

    // a hand with no take passes the running total straight through, so the
    // replayed plan nets exactly what the original table did
    const a = runSim(original)
    const b = runSim(fresh)
    const last = original.from + 119
    expect(valueAt(b.active.netWorth, last)).toBeCloseTo(valueAt(a.active.netWorth, last), 6)
  })
})
