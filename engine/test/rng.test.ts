import { describe, expect, it } from 'vitest'
import { createRng, shuffle } from '../src/index.js'

describe('seeded rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next())
  })

  it('different seeds give different sequences', () => {
    const a = createRng(1)
    const b = createRng(2)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('next() stays in [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const x = rng.next()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('int(n) stays in [0, n) and rejects bad n', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const x = rng.int(6)
      expect(Number.isInteger(x)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(6)
    }
    expect(() => rng.int(0)).toThrow()
    expect(() => rng.int(2.5)).toThrow()
  })

  it('shuffle is a deterministic permutation and does not mutate', () => {
    const deck = ['MSFT', 'INTC', 'NOK', 'ERIC', 'GE', 'KO', 'ENE']
    const before = deck.slice()
    const a = shuffle(createRng(1990), deck)
    const b = shuffle(createRng(1990), deck)
    expect(deck).toEqual(before)
    expect(a).toEqual(b)
    expect(a.slice().sort()).toEqual(deck.slice().sort())
    expect(shuffle(createRng(1991), deck)).not.toEqual(a)
  })
})
