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

  it('holdMonths makes compound a yearly raise: flat all year, stepping on the anniversary', () => {
    const c: Curve = { type: 'compound', base: 52_000, annualRate: { expected: 0.035 }, holdMonths: 12 }
    expect(at(c, 0)).toBe(52_000)
    expect(at(c, 1)).toBe(52_000) // no monthly creep — the bug that motivated the knob
    expect(at(c, 11)).toBe(52_000)
    expect(at(c, 12)).toBeCloseTo(52_000 * 1.035, 8)
    expect(at(c, 23)).toBeCloseTo(52_000 * 1.035, 8)
    expect(at(c, 24)).toBeCloseTo(52_000 * 1.035 ** 2, 8)
  })

  it('holdMonths is sample-and-hold on any parametric curve, not just compound', () => {
    const linear: Curve = { type: 'linear', base: 1000, slopePerMonth: 10, holdMonths: 6 }
    expect(at(linear, 5)).toBe(1000)
    expect(at(linear, 6)).toBe(1060)
    expect(at(linear, 11)).toBe(1060)
    const expr: Curve = { type: 'expression', expr: '100 + t', holdMonths: 3 }
    expect(at(expr, 2)).toBe(100)
    expect(at(expr, 3)).toBe(103)
  })

  it('holdAnchor pins the raise to a calendar month: a July card raises every January', () => {
    const c: Curve = { type: 'compound', base: 52_000, annualRate: { expected: 0.035 }, holdMonths: 12, holdAnchor: 1 }
    const start = ym(2026, 7)
    const at2 = (t: number): number => at(c, t, start + t)
    expect(at2(0)).toBe(52_000) // Jul 2026
    expect(at2(5)).toBe(52_000) // Dec 2026
    expect(at2(6)).toBeCloseTo(52_000 * 1.035, 8) // Jan 2027 — the full year's raise lands
    expect(at2(17)).toBeCloseTo(52_000 * 1.035, 8) // Dec 2027
    expect(at2(18)).toBeCloseTo(52_000 * 1.035 ** 2, 8) // Jan 2028
  })

  it('a card that starts on its anchor month raises on the NEXT landing, not day one', () => {
    const c: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.1 }, holdMonths: 12, holdAnchor: 1 }
    const start = ym(2026, 1)
    expect(at(c, 0, start)).toBe(100) // Jan 2026 — starting month is not a raise
    expect(at(c, 11, start + 11)).toBe(100)
    expect(at(c, 12, start + 12)).toBeCloseTo(110, 10) // Jan 2027
  })

  it('an anchor composes with sub-yearly holds: quarterly anchored to January lands Jan/Apr/Jul/Oct', () => {
    const c: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.04 }, holdMonths: 3, holdAnchor: 1 }
    const start = ym(2026, 8) // August: next landing is October
    const q = Math.pow(1.04, 3 / 12)
    expect(at(c, 0, start)).toBe(100)
    expect(at(c, 1, start + 1)).toBe(100) // Sep
    expect(at(c, 2, start + 2)).toBeCloseTo(100 * q, 8) // Oct
    expect(at(c, 4, start + 4)).toBeCloseTo(100 * q, 8) // Dec
    expect(at(c, 5, start + 5)).toBeCloseTo(100 * q * q, 8) // Jan
  })

  it('holdMonths 1 (or absent) is the smooth monthly behavior', () => {
    const smooth: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.07 } }
    const held: Curve = { type: 'compound', base: 100, annualRate: { expected: 0.07 }, holdMonths: 1 }
    expect(at(held, 7)).toBe(at(smooth, 7))
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
