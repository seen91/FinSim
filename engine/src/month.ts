/**
 * Time is an absolute month index: `year * 12 + (month - 1)`.
 * All engine time arithmetic is integer months; there are no Dates anywhere.
 */

/** Absolute month index for a calendar year/month (month is 1-based, 1 = January). */
export function ym(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`ym(${year}, ${month}): month must be an integer 1..12`)
  }
  return year * 12 + (month - 1)
}

/** Inverse of {@link ym}. */
export function fromMonthIndex(index: number): { year: number; month: number } {
  const year = Math.floor(index / 12)
  return { year, month: (index - year * 12) + 1 }
}

/** Formats an absolute month index as "YYYY-MM". */
export function formatMonth(index: number): string {
  const { year, month } = fromMonthIndex(index)
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`
}

/**
 * Formats a month count as a human-readable duration: "2 yr 5 mo", "8 mo", "3 yr".
 * The product speaks in time-to-goal deltas; this is the canonical rendering.
 */
export function formatMonthsDelta(months: number): string {
  const sign = months < 0 ? '-' : ''
  const abs = Math.abs(Math.round(months))
  const years = Math.floor(abs / 12)
  const rest = abs % 12
  if (years === 0) return `${sign}${rest} mo`
  if (rest === 0) return `${sign}${years} yr`
  return `${sign}${years} yr ${rest} mo`
}
