import type { Series, SimResult } from './types.js'

/**
 * The goal solver. The product's north-star outputs are dates and
 * date-deltas, not curves (DESIGN.md §8) — "how much longer to 10 MSEK
 * because of this car" is `goalDelta` on two simulations.
 */

function seriesOf(x: Series | SimResult): Series {
  return 'points' in x ? x : x.netWorth
}

/**
 * The absolute month a series first *sustainably* crosses a target: the
 * earliest month at (and after) which every value stays ≥ target. Returns
 * null if the series never sustainably crosses within its range.
 */
export function firstCrossing(x: Series | SimResult, target: number): number | null {
  const series = seriesOf(x)
  const points = series.points
  let idx = points.length
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]! >= target) idx = i
    else break
  }
  return idx === points.length ? null : series.startMonth + idx
}

export interface GoalDelta {
  /** Month the base scenario reaches the goal, or null if never (in range). */
  baseMonth: number | null
  /** Month the variant scenario reaches the goal, or null if never (in range). */
  variantMonth: number | null
  /**
   * How many months later the variant reaches the goal (positive = the
   * decision costs time). Null if either side never reaches it.
   */
  deltaMonths: number | null
}

/** Time-to-goal comparison between a base table and a variant (e.g. with a bundle toggled). */
export function goalDelta(base: Series | SimResult, variant: Series | SimResult, target: number): GoalDelta {
  const baseMonth = firstCrossing(base, target)
  const variantMonth = firstCrossing(variant, target)
  return {
    baseMonth,
    variantMonth,
    deltaMonths: baseMonth !== null && variantMonth !== null ? variantMonth - baseMonth : null,
  }
}
