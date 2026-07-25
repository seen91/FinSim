import { describe, expect, it } from 'vitest'
import {
  crossingMonths,
  goalProbability,
  monteCarlo,
  percentileBand,
  quantile,
  setCardEnabled,
  simulate,
  ym,
  type AssetCard,
  type MonteCarloRun,
  type Table,
} from '../src/index.js'

/**
 * Monte Carlo mode (M3b). The model under test, per §14.5 (decided
 * 2026-07-12): volatility is authored on the asset card, shocks are
 * exp(σ/√12·z) on top of the deterministic monthly factor (so `expected`
 * stays the CAGR of the median path), and correlation is a single shared
 * market factor with per-card loading ρ (default 1). Every stream is seeded
 * by (seed, path, card id), so ghost tables replay identical shocks on
 * shared cards — common random numbers.
 */

const FROM = ym(2026, 1)

function fund(id: string, volatility: number, correlation?: number): AssetCard {
  return {
    id,
    kind: 'asset',
    initialBalance: 100_000,
    growth: { expected: 0.07, volatility, ...(correlation !== undefined ? { correlation } : {}) },
  }
}

function tableOf(...cards: AssetCard[]): Table {
  return { root: { id: 'root', kind: 'hand', children: cards } }
}

const finals = (run: MonteCarloRun): number[] => run.netWorth.map((points) => points[points.length - 1]!)

const variance = (xs: number[]): number => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length
}

describe('determinism', () => {
  const table = tableOf(fund('f', 0.15))
  const to = FROM + 119

  it('the same seed reproduces the run exactly; another seed does not', () => {
    const a = monteCarlo(table, {}, FROM, to, { paths: 20, seed: 42 })
    const b = monteCarlo(table, {}, FROM, to, { paths: 20, seed: 42 })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const c = monteCarlo(table, {}, FROM, to, { paths: 20, seed: 43 })
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a))
  })

  it('rejects a non-positive path count', () => {
    expect(() => monteCarlo(table, {}, FROM, to, { paths: 0, seed: 1 })).toThrow('paths')
    expect(() => monteCarlo(table, {}, FROM, to, { paths: 1.5, seed: 1 })).toThrow('paths')
  })
})

describe('volatility semantics', () => {
  it('zero volatility: every path IS the deterministic simulation', () => {
    const table = tableOf({ ...fund('f', 0.15), growth: { expected: 0.07 } })
    const to = FROM + 59
    const run = monteCarlo(table, {}, FROM, to, { paths: 5, seed: 7 })
    const det = simulate(table, {}, FROM, to).netWorth.points
    for (const path of run.netWorth) expect(path).toEqual(det)
  })

  it('no shock lands on the start month — the fan opens only once growth begins', () => {
    const run = monteCarlo(tableOf(fund('f', 0.3)), {}, FROM, FROM + 12, { paths: 50, seed: 7 })
    for (const path of run.netWorth) expect(path[0]).toBe(100_000)
    expect(run.netWorth.some((path) => path[1] !== run.netWorth[0]![1])).toBe(true)
  })

  it('expected is CAGR: the median path tracks the deterministic path, the mean runs above it', () => {
    // one asset, 10 years at 7 % ± 15 %: log-σ at the horizon is 0.15·√10 ≈ 0.47,
    // so with 4 000 paths the sample median sits within ~1 % (1σ) of the true
    // median — a 3 % gate is ~3σ. The mean/median ratio is exp(σ²/2) ≈ 1.12.
    const table = tableOf(fund('f', 0.15))
    const to = FROM + 119
    const run = monteCarlo(table, {}, FROM, to, { paths: 4000, seed: 1 })
    const det = simulate(table, {}, FROM, to).netWorth.points
    const detFinal = det[det.length - 1]!
    const median = quantile([...finals(run)].sort((a, b) => a - b), 0.5)
    expect(median / detFinal).toBeGreaterThan(0.97)
    expect(median / detFinal).toBeLessThan(1.03)
    const mean = finals(run).reduce((a, b) => a + b, 0) / run.paths
    expect(mean / detFinal).toBeGreaterThan(1.06) // volatility drag, honestly stated
  })
})

describe('correlation: one shared market factor', () => {
  const to = FROM + 119

  it('ρ = 1 is the market itself: the shock is the shared draw, whatever the card id', () => {
    const a = monteCarlo(tableOf(fund('a', 0.2, 1)), {}, FROM, to, { paths: 20, seed: 3 })
    const z = monteCarlo(tableOf(fund('a-renamed', 0.2, 1)), {}, FROM, to, { paths: 20, seed: 3 })
    expect(z.netWorth).toEqual(a.netWorth)
    // at ρ = 0 the card's private stream takes over, and the id seeds it
    const own = monteCarlo(tableOf(fund('a', 0.2, 0)), {}, FROM, to, { paths: 20, seed: 3 })
    const ownRenamed = monteCarlo(tableOf(fund('a-renamed', 0.2, 0)), {}, FROM, to, { paths: 20, seed: 3 })
    expect(JSON.stringify(ownRenamed.netWorth)).not.toBe(JSON.stringify(own.netWorth))
  })

  it('ρ = 1 funds move as one market; ρ = 0 funds diversify — correlated risk is wider', () => {
    // theory: var(X+Y) doubles when two equal lognormals go from independent
    // to identical. Lognormal variance estimates are heavy-tailed, so the
    // gate is 1.5 at 2 000 paths (measured ratio ≈ 1.85 for this seed).
    const correlated = monteCarlo(tableOf(fund('a', 0.2, 1), fund('b', 0.2, 1)), {}, FROM, to, { paths: 2000, seed: 3 })
    const independent = monteCarlo(tableOf(fund('a', 0.2, 0), fund('b', 0.2, 0)), {}, FROM, to, { paths: 2000, seed: 3 })
    expect(variance(finals(correlated))).toBeGreaterThan(1.5 * variance(finals(independent)))
  })

  it('correlation defaults to 1: omitting it reads as fully market-bound', () => {
    const explicit = monteCarlo(tableOf(fund('a', 0.2, 1)), {}, FROM, to, { paths: 20, seed: 3 })
    const defaulted = monteCarlo(tableOf(fund('a', 0.2)), {}, FROM, to, { paths: 20, seed: 3 })
    expect(JSON.stringify(defaulted)).toBe(JSON.stringify(explicit))
  })

  it('a correlation outside −1..1 is rejected by validation', () => {
    const bad = tableOf({ ...fund('f', 0.2), growth: { expected: 0.07, volatility: 0.2, correlation: 1.5 } })
    expect(() => simulate(bad, {}, FROM, FROM + 1)).toThrow('correlation')
    const negVol = tableOf({ ...fund('f', 0.2), growth: { expected: 0.07, volatility: -0.1 } })
    expect(() => simulate(negVol, {}, FROM, FROM + 1)).toThrow('volatility')
  })
})

describe('common random numbers across table variants', () => {
  it('a ghost table replays identical shocks on shared cards: the per-path delta is noise-free', () => {
    // budget with a volatile fund + a deterministic car bundle. Setting the car
    // aside must not reshuffle the fund's shocks — the with/without difference
    // has to be exactly the deterministic difference, on every path.
    const table: Table = {
      root: {
        id: 'root',
        kind: 'hand',
        children: [
          {
            id: 'budget',
            kind: 'hand',
            children: [
              { id: 'salary', kind: 'source', flow: { type: 'constant', value: 40_000 } },
              { id: 'invest', kind: 'asset', growth: { expected: 0.07, volatility: 0.15 }, take: { type: 'percent', percent: 0.5 } },
            ],
          },
          {
            id: 'car',
            kind: 'hand',
            children: [
              { id: 'car-value', kind: 'asset', initialBalance: 240_000, growth: { expected: -0.15 } },
              { id: 'car-costs', kind: 'drain', amount: { type: 'constant', value: 3_500 } },
            ],
          },
        ],
      },
    }
    const to = FROM + 119
    const withCar = monteCarlo(table, {}, FROM, to, { paths: 40, seed: 11 })
    const withoutCar = monteCarlo(setCardEnabled(table, 'car', false), {}, FROM, to, { paths: 40, seed: 11 })
    const detDelta =
      simulate(table, {}, FROM, to).netWorth.points[119]! - simulate(setCardEnabled(table, 'car', false), {}, FROM, to).netWorth.points[119]!
    for (let p = 0; p < withCar.paths; p++) {
      expect(withCar.netWorth[p]![119]! - withoutCar.netWorth[p]![119]!).toBeCloseTo(detDelta, 6)
    }
  })
})

describe('bands, crossings, probabilities', () => {
  // a lone 100 k fund at 7 % ± 20 % over 20 years: median ≈ 390 k, so a
  // 400 k goal splits the paths and a 900 k goal thins them further
  const table = tableOf(fund('f', 0.2))
  const to = FROM + 239
  const run = monteCarlo(table, {}, FROM, to, { paths: 300, seed: 5 })

  it('percentile bands nest: p10 ≤ p50 ≤ p90, every month', () => {
    const p10 = percentileBand(run, 0.1)
    const p50 = percentileBand(run, 0.5)
    const p90 = percentileBand(run, 0.9)
    expect(p10.id).toBe('p10')
    expect(p10.startMonth).toBe(FROM)
    for (let i = 0; i < p50.points.length; i++) {
      expect(p10.points[i]!).toBeLessThanOrEqual(p50.points[i]!)
      expect(p50.points[i]!).toBeLessThanOrEqual(p90.points[i]!)
    }
  })

  it('goal probability is the share of paths that sustainably cross, and falls as the goal rises', () => {
    const crossings = crossingMonths(run, 400_000)
    expect(crossings).toHaveLength(300)
    expect(goalProbability(run, 400_000)).toBe(crossings.filter((m) => m !== null).length / 300)
    expect(goalProbability(run, 1)).toBe(1) // the table starts above 1 and never dips below
    expect(goalProbability(run, 1e12)).toBe(0)
    expect(goalProbability(run, 900_000)).toBeLessThanOrEqual(goalProbability(run, 400_000))
  })

  it('quantile interpolates and clamps to the sample edges', () => {
    expect(quantile([10], 0.5)).toBe(10)
    expect(quantile([0, 10], 0.5)).toBe(5)
    expect(quantile([0, 10, 20], 0)).toBe(0)
    expect(quantile([0, 10, 20], 1)).toBe(20)
    expect(() => quantile([], 0.5)).toThrow('empty')
  })
})
