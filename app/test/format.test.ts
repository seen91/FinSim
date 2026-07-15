import { describe, expect, it } from 'vitest'
import { parseCompact } from '../src/format'

describe('parseCompact', () => {
  it('reads plain numbers, grouped or not', () => {
    expect(parseCompact('500000')).toBe(500_000)
    expect(parseCompact('5 000')).toBe(5_000)
    expect(parseCompact('0,5')).toBe(0.5)
  })

  it('reads k and M magnitudes in either case', () => {
    expect(parseCompact('250k')).toBe(250_000)
    expect(parseCompact('250 K')).toBe(250_000)
    expect(parseCompact('5,5m')).toBe(5_500_000)
    expect(parseCompact('1.5M')).toBe(1_500_000)
    expect(parseCompact('10M')).toBe(10_000_000)
  })

  it('reads negative amounts (a drift can point down)', () => {
    expect(parseCompact('-2k')).toBe(-2_000)
    expect(parseCompact('-1,5M')).toBe(-1_500_000)
    expect(parseCompact('-300')).toBe(-300)
  })

  it('rejects what it cannot read', () => {
    expect(parseCompact('')).toBeNull()
    expect(parseCompact('abc')).toBeNull()
    expect(parseCompact('5b')).toBeNull()
    expect(parseCompact('1,5,5M')).toBeNull()
  })
})
