import type { Series } from './types.js'

/** Value of a series at an absolute month. Out of range is an error, not a guess. */
export function valueAt(series: Series, month: number): number {
  const i = month - series.startMonth
  const value = series.points[i]
  if (value === undefined) {
    throw new Error(`Series "${series.id}" has no point at month ${month} (covers ${series.startMonth}..${series.startMonth + series.points.length - 1})`)
  }
  return value
}
