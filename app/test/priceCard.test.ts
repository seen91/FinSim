import { ym, type AssetCard } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { headlineFor } from '../src/authored'
import { frontStats } from '../src/components/CardView'
import { dialsOf } from '../src/components/TuneDials'
import { formatAmount } from '../src/format'

// sv-SE digit grouping is a narrow no-break space — spell amounts via the formatter
const kr = formatAmount

/**
 * Priced cards say their numbers out loud (2026-07-17): the face carries the
 * start value, the data's real trend, and the fallback — a chart alone was
 * the complaint. And a price is any curve f(t) now, so the linear car and
 * the formula car read as their own parameters.
 */

const car = (price: NonNullable<AssetCard['price']>, extra?: Partial<AssetCard>): AssetCard => ({
  id: 'car',
  kind: 'asset',
  price,
  initialUnits: 1,
  ...extra,
})

describe('a data-priced card face carries its numbers', () => {
  // the used-car shape: 61 points sliding 230 400 → 151 200 (−8,1 %/yr), −7 % fallback
  const values = Array.from({ length: 61 }, (_, i) => 230_400 * Math.pow(151_200 / 230_400, i / 60))
  const sampled = car({ data: { startMonth: ym(2030, 1), values } }, { growth: { expected: -0.07 } })

  it('headline is the holding’s value where the data begins', () => {
    expect(headlineFor(sampled)).toBe(`${kr(230_400)} · data`)
  })

  it('stats read coverage, first → last, trend and the after-data fallback', () => {
    const stats = frontStats(sampled)
    expect(stats).toContainEqual({ label: 'Data', value: '2030-01 → 2035-01' })
    expect(stats).toContainEqual({ label: 'Price', value: `${kr(230_400)} → ${kr(151_200)}` })
    expect(stats).toContainEqual({ label: 'Trend', value: '-8,1 % /yr', cls: 'neg' })
    expect(stats).toContainEqual({ label: 'After data', value: '-7,0 % /yr', cls: 'neg' })
  })

  it('a series-id price without a world still names its series', () => {
    expect(frontStats(car({ seriesId: 'OMX' }))).toContainEqual({ label: 'Data', value: 'OMX' })
  })

  it('a series-id price resolves its numbers through the world it plays in', () => {
    const world = { series: { OMX: { startMonth: ym(2030, 1), values } } }
    const stats = frontStats(car({ seriesId: 'OMX' }), world)
    expect(stats).toContainEqual({ label: 'Data', value: '2030-01 → 2035-01' })
    expect(stats).toContainEqual({ label: 'Trend', value: '-8,1 % /yr', cls: 'neg' })
  })
})

describe('an analytic price is its own numbers', () => {
  it('linear: start price and monthly drift', () => {
    const linear = car({ type: 'linear', base: 240_000, slopePerMonth: -1_500 })
    expect(headlineFor(linear)).toBe(`${kr(240_000)} · linear`)
    const stats = frontStats(linear)
    expect(stats).toContainEqual({ label: 'Price', value: kr(240_000) })
    expect(stats).toContainEqual({ label: 'Drifts', value: `−${kr(1_500)} /mo`, cls: 'neg' })
  })

  it('expression: the formula itself, and the headline evaluates it at t = 0', () => {
    const formula = car({ type: 'expression', expr: 'max(10000, 240000 - 1500*t)' })
    expect(headlineFor(formula)).toBe(`${kr(240_000)} · ƒ(t)`)
    // long formulas truncate to fit the face — the back holds the whole thing
    expect(frontStats(formula).find((s) => s.label === 'ƒ(t)')!.value).toMatch(/^max\(10000, 240000 - 150.*…$/)
  })

  it('units multiply into the headline and show as a stat when they are not 1', () => {
    const shares = car({ type: 'constant', value: 250 }, { initialUnits: 40 })
    expect(headlineFor(shares)).toBe(`${kr(10_000)} · constant`)
    expect(frontStats(shares)).toContainEqual({ label: 'Units held', value: '40' })
  })

  it('dials scale the price curve itself — growth and its dice belong to sampled prices only', () => {
    const labels = dialsOf(car({ type: 'linear', base: 240_000, slopePerMonth: -1_500 }, { growth: { expected: -0.07, volatility: 0.5 } })).map((d) => d.label)
    expect(labels).toContain('Starts at')
    expect(labels).toContain('Drift')
    expect(labels).not.toContain('After data')
    expect(labels).not.toContain('Volatility')
  })
})
