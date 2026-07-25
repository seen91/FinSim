import { firstCrossing } from './goals.js'
import { createRng, hashString } from './rng.js'
import { simulate, type ShockFn } from './simulate.js'
import type { AssetCard, Series, Table, World } from './types.js'

/**
 * Monte Carlo mode (DESIGN.md §13 M3, §14.5 decided 2026-07-12): N seeded
 * paths over the same table, so verdicts can speak in ranges and
 * probabilities instead of one point estimate. Deterministic `simulate` is
 * untouched — a Monte Carlo run is just N calls with a shock function.
 *
 * The model, in full:
 *
 *   - Volatility lives on the card (`growth.volatility`, annual σ), authored
 *     like every other number. Only growth-rate assets are sampled — priced
 *     assets follow their historical series, and flows, debts and cash stay
 *     deterministic.
 *   - `expected` is a CAGR. A month's growth factor is the deterministic
 *     factor × exp(σ/√12 · z) with z standard normal — median 1 — so the
 *     deterministic path ≈ the median path, and the mean path runs above it
 *     (volatility drag, honestly stated rather than hidden).
 *   - Correlation is a single shared market factor: each month every path
 *     draws one Z, and a card's shock is ρ·Z + √(1−ρ²)·ε with ε private to
 *     the card (ρ = `growth.correlation`, default 1). Two cards co-move with
 *     correlation ρᵢ·ρⱼ — five overlapping index funds move as one market
 *     unless the author says otherwise.
 *   - Every stream is seeded by (seed, path, card id), independent of table
 *     shape: a ghost table (a bundle set aside) replays the exact same
 *     shocks on the cards both tables share — common random numbers, so a
 *     per-path time-to-goal delta measures the decision, not the noise.
 */

export interface MonteCarloOptions {
  /** Number of paths. Each is one full deterministic simulation. */
  paths: number
  seed: number
}

export interface MonteCarloRun {
  from: number
  to: number
  paths: number
  seed: number
  /** One net-worth series per path; `netWorth[p][i]` is path p at month from + i. */
  netWorth: number[][]
}

/** Mix stream coordinates into one 32-bit seed. */
function mixSeed(seed: number, path: number, stream: number): number {
  let h = (seed ^ Math.imul(path + 1, 0x9e3779b9) ^ stream) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

const MARKET_STREAM = hashString('market')

/**
 * The shock function for one path: the month's market draw is shared by
 * every card; each card blends it with its own private draws by its ρ.
 * Draws are precomputed per stream so the order simulate asks in never
 * matters.
 */
function pathShocks(seed: number, path: number, months: number): ShockFn {
  const marketRng = createRng(mixSeed(seed, path, MARKET_STREAM))
  const market = Array.from({ length: months }, () => marketRng.normal())
  const perCard = new Map<string, number[]>()
  return (card: AssetCard, i: number): number => {
    let z = perCard.get(card.id)
    if (!z) {
      const rho = card.growth?.correlation ?? 1
      const own = Math.sqrt(Math.max(0, 1 - rho * rho))
      const rng = createRng(mixSeed(seed, path, hashString(card.id)))
      z = market.map((zm) => rho * zm + own * rng.normal())
      perCard.set(card.id, z)
    }
    return z[i]!
  }
}

export function monteCarlo(table: Table, world: World, from: number, to: number, options: MonteCarloOptions): MonteCarloRun {
  const { paths, seed } = options
  if (!Number.isInteger(paths) || paths <= 0) throw new Error(`monteCarlo: paths must be a positive integer, got ${paths}`)
  const months = to - from + 1
  const netWorth: number[][] = []
  for (let p = 0; p < paths; p++) {
    netWorth.push(simulate(table, world, from, to, pathShocks(seed, p, months)).netWorth.points)
  }
  return { from, to, paths, seed, netWorth }
}

/**
 * Linear-interpolated quantile of a sorted sample, q in 0..1 — the
 * convention percentile bands and verdict ranges share.
 */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error('quantile: empty sample')
  const pos = q * (sorted.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const w = pos - lo
  return sorted[lo]! * (1 - w) + sorted[hi]! * w
}

/** The per-month q-quantile of net worth across paths — one band of the fan. */
export function percentileBand(run: MonteCarloRun, q: number): Series {
  const months = run.to - run.from + 1
  const points = new Array<number>(months)
  const column = new Array<number>(run.paths)
  for (let i = 0; i < months; i++) {
    for (let p = 0; p < run.paths; p++) column[p] = run.netWorth[p]![i]!
    column.sort((a, b) => a - b)
    points[i] = quantile(column, q)
  }
  return { id: `p${String(Math.round(q * 100))}`, role: 'netWorth', startMonth: run.from, points }
}

/**
 * Per path, the month net worth first sustainably crosses the target
 * (null where it never does within the horizon) — `firstCrossing`, N times.
 */
export function crossingMonths(run: MonteCarloRun, target: number): (number | null)[] {
  return run.netWorth.map((points) => firstCrossing({ id: 'path', role: 'netWorth', startMonth: run.from, points }, target))
}

/** The share of paths that sustainably reach the target within the horizon. */
export function goalProbability(run: MonteCarloRun, target: number): number {
  const crossings = crossingMonths(run, target)
  return crossings.filter((m) => m !== null).length / run.paths
}
