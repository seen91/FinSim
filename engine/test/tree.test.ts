import { describe, expect, it } from 'vitest'
import { allCards, findCard, withoutCard } from '../src/tree.js'
import type { Table } from '../src/types.js'

const table = (): Table => ({
  root: {
    id: 'root',
    kind: 'hand',
    children: [
      { id: 'salary', kind: 'source', flow: { type: 'constant', value: 40000 } },
      { id: 'rent', kind: 'drain', amount: { type: 'constant', value: 12000 } },
      {
        id: 'invest',
        kind: 'hand',
        take: { type: 'percent', percent: 1 },
        children: [{ id: 'fund', kind: 'asset', growth: { expected: 0.07 }, take: { type: 'percent', percent: 1 } }],
      },
    ],
  },
})

describe('withoutCard', () => {
  it('removes a root-level card and leaves the original untouched', () => {
    const base = table()
    const ghost = withoutCard(base, 'rent')
    expect(findCard(ghost.root, 'rent')).toBeNull()
    expect(allCards(ghost.root).map((c) => c.id)).toEqual(['salary', 'invest', 'fund'])
    expect(findCard(base.root, 'rent')).not.toBeNull()
  })

  it('removes a card nested inside a hand', () => {
    const ghost = withoutCard(table(), 'fund')
    expect(findCard(ghost.root, 'fund')).toBeNull()
    expect(findCard(ghost.root, 'invest')).not.toBeNull()
  })

  it('removes a hand with everything in it', () => {
    const ghost = withoutCard(table(), 'invest')
    expect(allCards(ghost.root).map((c) => c.id)).toEqual(['salary', 'rent'])
  })

  it('throws on an unknown card id', () => {
    expect(() => withoutCard(table(), 'nope')).toThrow('unknown card "nope"')
  })
})
