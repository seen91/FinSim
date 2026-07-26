import {
  allCards,
  crossingMonths,
  monteCarlo,
  percentileBand,
  priceCurveOf,
  quantile,
  withoutCard,
  type MonteCarloRun,
  type Series,
  type Table,
  type World,
} from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { effectiveHorizon, playedTable, type Doc } from './model'

/**
 * The app's Monte Carlo pass (M3b): the same table runSim plays, sampled
 * over N seeded paths so the chart can wear a percentile fan and bundle
 * verdicts can speak in ranges. Computed separately from runSim — the
 * deterministic answer stays instant; the fan may arrive a beat later.
 */

/** Paths per run when the table doesn't say: enough for a steady P10–P90 fan, cheap enough to rerun on every edit. */
export const MC_PATHS = 200
/** The Table menu's range: below ~50 the fan is noise, far above 5000 every edit-beat drags (one ghost run per hand). */
export const MC_PATHS_MIN = 50
export const MC_PATHS_MAX = 5000

/** The doc's path count, defaulted and clamped — every Monte Carlo consumer reads it through this. */
export function mcPathsOf(doc: Doc): number {
  const raw = doc.mcPaths ?? MC_PATHS
  return Number.isFinite(raw) ? Math.min(MC_PATHS_MAX, Math.max(MC_PATHS_MIN, Math.round(raw))) : MC_PATHS
}

/**
 * One fixed seed for the whole app. The fan must not flicker between
 * renders, and two tables must be judged under the same futures — the seed
 * is part of the product, not a knob.
 */
const MC_SEED = 0x515eed

export interface BundleRange {
  cardId: string
  /** 10th/90th percentile of the per-path time-to-goal delta, in months (same-seed ghost, so the noise cancels). */
  d10: number
  d90: number
  /** Share of paths where the goal is reached both with and without the bundle — the deltas' denominator. */
  comparable: number
  /** Goal odds without → with the bundle, for when a range is not comparable. */
  probWithout: number
  probWith: number
  /** Every comparable path's time-to-goal delta, sorted — the bundle report's distribution. */
  deltas: number[]
  /** Per path, the month the goal is first reached with this hand off the table (null where never). */
  crossingsWithout: (number | null)[]
}

export interface Mc {
  /** The raw run behind everything below — the futures report reads it directly. */
  run: MonteCarloRun
  /** Per path, the month the goal is first sustainably reached (null where never). */
  crossings: (number | null)[]
  /** The fan: per-month P10/P50/P90 of net worth across paths. */
  bands: { p10: Series; p50: Series; p90: Series }
  /** Share of paths that sustainably reach the goal within the horizon. */
  goalProbability: number
  /** One range per hand (decision bundle) in play, keyed by card id. */
  ranges: Map<string, BundleRange>
}

/**
 * Volatility anywhere on the table? Without it every path is the same line —
 * no fan to draw. A priced card's volatility only counts once the horizon
 * outruns its data: inside the data the price is history and the dice never
 * touch it.
 */
function hasVolatility(table: Table, world: World, to: number): boolean {
  return allCards(table.root).some((card) => {
    if (card.kind !== 'asset' || card.enabled === false || (card.growth?.volatility ?? 0) === 0) return false
    if (!card.price) return true
    const price = priceCurveOf(card.price)
    if (price.type !== 'sampled') return false // an analytic price is exact in every future — the dice never touch it
    const data = price.data ?? (price.seriesId ? world.series?.[price.seriesId] : undefined)
    if (!data) return true // an unresolvable series is the table's problem, not the fan's
    return to > data.startMonth + data.values.length - 1
  })
}

/**
 * Run the fan and the per-bundle ranges. Null when the table carries no
 * volatility — the deterministic line already tells the whole story.
 */
export function runMc(doc: Doc, library: AuthoredCard[] = []): Mc | null {
  // the same resolved, tuned table runSim plays — the fan and the line must live
  // in one world, over the same resolved horizon
  const { table, world } = playedTable(doc, library)
  const to = doc.from + effectiveHorizon(doc, library) - 1
  if (!hasVolatility(table, world, to)) return null
  const opts = { paths: mcPathsOf(doc), seed: MC_SEED }

  const active = monteCarlo(table, world, doc.from, to, opts)
  const activeCrossings = crossingMonths(active, doc.goal)

  // ranges for decision bundles only — hands, wherever they sit (DESIGN §13 M3b)
  const ranges = new Map<string, BundleRange>()
  for (const card of allCards(table.root)) {
    if (card.kind !== 'hand' || card.enabled === false) continue
    const ghost = monteCarlo(withoutCard(table, card.id), world, doc.from, to, opts)
    const ghostCrossings = crossingMonths(ghost, doc.goal)
    const deltas: number[] = []
    for (let p = 0; p < opts.paths; p++) {
      const withMonth = activeCrossings[p]
      const withoutMonth = ghostCrossings[p]
      if (withMonth !== null && withMonth !== undefined && withoutMonth !== null && withoutMonth !== undefined) {
        deltas.push(withMonth - withoutMonth)
      }
    }
    deltas.sort((a, b) => a - b)
    ranges.set(card.id, {
      cardId: card.id,
      d10: deltas.length > 0 ? quantile(deltas, 0.1) : 0,
      d90: deltas.length > 0 ? quantile(deltas, 0.9) : 0,
      comparable: deltas.length / opts.paths,
      probWithout: ghostCrossings.filter((m) => m !== null).length / opts.paths,
      probWith: activeCrossings.filter((m) => m !== null).length / opts.paths,
      deltas,
      crossingsWithout: ghostCrossings,
    })
  }

  return {
    run: active,
    crossings: activeCrossings,
    bands: { p10: percentileBand(active, 0.1), p50: percentileBand(active, 0.5), p90: percentileBand(active, 0.9) },
    goalProbability: activeCrossings.filter((m) => m !== null).length / opts.paths,
    ranges,
  }
}
