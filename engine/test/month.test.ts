import { describe, expect, it } from 'vitest'
import { formatMonth, formatMonthsDelta, fromMonthIndex, ym } from '../src/index.js'

describe('month arithmetic', () => {
  it('ym is year*12 + (month-1)', () => {
    expect(ym(2026, 1)).toBe(24312)
    expect(ym(2026, 12)).toBe(24323)
    expect(ym(2027, 1)).toBe(24324)
  })

  it('rejects out-of-range months', () => {
    expect(() => ym(2026, 0)).toThrow()
    expect(() => ym(2026, 13)).toThrow()
    expect(() => ym(2026, 1.5)).toThrow()
  })

  it('fromMonthIndex inverts ym', () => {
    for (const [y, m] of [[2026, 1], [1999, 12], [2045, 6]] as const) {
      expect(fromMonthIndex(ym(y, m))).toEqual({ year: y, month: m })
    }
  })

  it('formats months as YYYY-MM', () => {
    expect(formatMonth(ym(2045, 6))).toBe('2045-06')
    expect(formatMonth(ym(1990, 12))).toBe('1990-12')
  })

  it('formats month deltas as durations', () => {
    expect(formatMonthsDelta(29)).toBe('2 yr 5 mo')
    expect(formatMonthsDelta(8)).toBe('8 mo')
    expect(formatMonthsDelta(36)).toBe('3 yr')
    expect(formatMonthsDelta(0)).toBe('0 mo')
    expect(formatMonthsDelta(-14)).toBe('-1 yr 2 mo')
  })
})
