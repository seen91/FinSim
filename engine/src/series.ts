import { monthlyFactor } from './curves.js'
import type { GrowthParam, Series } from './types.js'

/**
 * Deflates a nominal series into real terms as of `baseMonth` — the global
 * real/nominal toggle re-renders every curve through this (DESIGN.md §8).
 */
export function toReal(series: Series, inflation: GrowthParam, baseMonth: number): Series {
  const factor = monthlyFactor(inflation.expected)
  return {
    ...series,
    points: series.points.map((p, i) => p / Math.pow(factor, series.startMonth + i - baseMonth)),
  }
}

/** Value of a series at an absolute month. Out of range is an error, not a guess. */
export function valueAt(series: Series, month: number): number {
  const i = month - series.startMonth
  const value = series.points[i]
  if (value === undefined) {
    throw new Error(`Series "${series.id}" has no point at month ${month} (covers ${series.startMonth}..${series.startMonth + series.points.length - 1})`)
  }
  return value
}
