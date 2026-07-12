import { describe, expect, it } from 'vitest'
import { evalCurve, monthlyFactor, ym, type Curve, type World } from '../src/index.js'

const at = (curve: Curve, t: number, month = t, world?: World): number => evalCurve(curve, { t, month, ...(world ? { world } : {}) })

describe('curve primitives', () => {
  it('constant', () => {
    expect(at({ type: 'constant', value: -12000 }, 0)).toBe(-12000)
    expect(at({ type: 'constant', value: -12000 }, 500)).toBe(-12000)
  })

  it('linear', () => {
    const c: Curve = { type: 'linear', base: 1000, slopePerMonth: 50 }
    expect(at(c, 0)).toBe(1000)
    expect(at(c, 10)).toBe(1500)
  })

  it('compound grows at the monthly-compounded annual rate', () => {
    const c: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.07 } }
    expect(at(c, 0)).toBe(100)
    expect(at(c, 12)).toBeCloseTo(107, 10)
    expect(at(c, 24)).toBeCloseTo(100 * 1.07 * 1.07, 10)
  })

  it('compound carries volatility without using it (deterministic v1)', () => {
    const flat: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.07 } }
    const vol: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.07, volatility: 0.15 } }
    expect(at(vol, 36)).toBe(at(flat, 36))
  })

  it('step holds each value from its month onward', () => {
    const c: Curve = { type: 'step', initial: 100, steps: [{ atMonth: 12, value: 150 }, { atMonth: 24, value: 0 }] }
    expect(at(c, 0)).toBe(100)
    expect(at(c, 11)).toBe(100)
    expect(at(c, 12)).toBe(150)
    expect(at(c, 24)).toBe(0)
    expect(at(c, 500)).toBe(0)
  })

  it('sinusoidal oscillates around its base with the given period', () => {
    const c: Curve = { type: 'sinusoidal', base: 1000, amplitude: 200, periodMonths: 12 }
    expect(at(c, 0)).toBeCloseTo(1000, 10)
    expect(at(c, 3)).toBeCloseTo(1200, 10)
    expect(at(c, 6)).toBeCloseTo(1000, 10)
    expect(at(c, 9)).toBeCloseTo(800, 10)
    expect(at(c, 12)).toBeCloseTo(1000, 10)
  })

  it('sampled reads real data by absolute month, inline or from the world', () => {
    const start = ym(1993, 1)
    const inline: Curve = { type: 'sampled', data: { startMonth: start, values: [2.3, 2.4, 2.6] } }
    expect(at(inline, 0, start)).toBe(2.3)
    expect(at(inline, 2, start + 2)).toBe(2.6)

    const world: World = { series: { 'msft-1990s': { startMonth: start, values: [2.3, 2.4, 2.6] } } }
    const byRef: Curve = { type: 'sampled', seriesId: 'msft-1990s' }
    expect(at(byRef, 1, start + 1, world)).toBe(2.4)
  })

  it('a sampled flow ends at 0 when its data runs out; before the data is an error, not a guess', () => {
    const c: Curve = { type: 'sampled', data: { startMonth: ym(1993, 1), values: [2.3] } }
    expect(at(c, 1, ym(1993, 2))).toBe(0)
    expect(() => at(c, -1, ym(1992, 12))).toThrow(/no data/)
    expect(() => at({ type: 'sampled', seriesId: 'missing' }, 0, 0, { series: {} })).toThrow(/not found/)
  })

  it('expression curves see t and month', () => {
    const c: Curve = { type: 'expression', expr: 'min(1000 + 10 * t, 1200)' }
    expect(at(c, 0)).toBe(1000)
    expect(at(c, 50)).toBe(1200)
  })

  it('monthlyFactor compounds to the annual rate and rejects total loss', () => {
    expect(Math.pow(monthlyFactor(0.07), 12)).toBeCloseTo(1.07, 12)
    expect(Math.pow(monthlyFactor(-0.15), 12)).toBeCloseTo(0.85, 12)
    expect(() => monthlyFactor(-1)).toThrow()
  })
})
