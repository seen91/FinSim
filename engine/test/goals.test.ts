import { describe, expect, it } from 'vitest'
import { firstCrossing, firstTouch, goalDelta, toReal, valueAt, type Series } from '../src/index.js'

const series = (points: number[], startMonth = 100): Series => ({ id: 'nw', role: 'netWorth', startMonth, points })

describe('goal solver', () => {
  it('firstCrossing finds the first *sustained* crossing', () => {
    // touches 10 at index 2, dips back under, sustains from index 4
    const s = series([0, 5, 12, 9, 15, 20])
    expect(firstTouch(s, 10)).toBe(102)
    expect(firstCrossing(s, 10)).toBe(104)
  })

  it('handles already-above, exact-equality and never cases', () => {
    expect(firstCrossing(series([10, 11, 12]), 10)).toBe(100)
    expect(firstCrossing(series([0, 10, 10]), 10)).toBe(101)
    expect(firstCrossing(series([0, 5, 9]), 10)).toBeNull()
    expect(firstTouch(series([0, 5, 9]), 10)).toBeNull()
    // a crossing that doesn't hold to the end of the range is not sustained
    expect(firstCrossing(series([0, 15, 5]), 10)).toBeNull()
  })

  it('goalDelta speaks in months of delay', () => {
    const base = series([0, 6, 12, 18, 24])
    const withCar = series([0, 3, 6, 12, 18])
    const d = goalDelta(base, withCar, 10)
    expect(d.baseMonth).toBe(102)
    expect(d.variantMonth).toBe(103)
    expect(d.deltaMonths).toBe(1)
  })

  it('goalDelta is null-aware when a side never reaches the goal', () => {
    const d = goalDelta(series([0, 20]), series([0, 5]), 10)
    expect(d.baseMonth).toBe(101)
    expect(d.variantMonth).toBeNull()
    expect(d.deltaMonths).toBeNull()
  })
})

describe('series helpers', () => {
  it('toReal deflates by inflation from a base month', () => {
    const s = series([100, 100, 100], 0)
    const real = toReal(s, { expected: 0.02 }, 0)
    expect(real.points[0]).toBeCloseTo(100, 10)
    expect(real.points[2]).toBeCloseTo(100 / Math.pow(1.02, 2 / 12), 10)
    const yearLater = toReal({ ...s, points: [100], startMonth: 12 }, { expected: 0.02 }, 0)
    expect(yearLater.points[0]).toBeCloseTo(100 / 1.02, 10)
  })

  it('valueAt reads by absolute month and refuses out-of-range', () => {
    const s = series([1, 2, 3], 100)
    expect(valueAt(s, 101)).toBe(2)
    expect(() => valueAt(s, 99)).toThrow(/no point/)
    expect(() => valueAt(s, 103)).toThrow(/no point/)
  })
})
