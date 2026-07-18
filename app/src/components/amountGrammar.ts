import type { Cadence } from '@finsim/engine'
import { MONTH_NAMES } from '../format'

/** The text grammar of amounts, rates and landings — pure parse/format, no React. */

/** The unit tokens an amount or rate accepts after a slash. */
const UNIT_TOKENS: Record<string, Cadence> = {
  w: 'weekly',
  wk: 'weekly',
  week: 'weekly',
  '2w': 'biweekly',
  '2wk': 'biweekly',
  biweekly: 'biweekly',
  m: 'monthly',
  mo: 'monthly',
  month: 'monthly',
  q: 'quarterly',
  qtr: 'quarterly',
  quarter: 'quarterly',
  y: 'yearly',
  yr: 'yearly',
  year: 'yearly',
}

const PERIODS_PER_YEAR: Record<Cadence, number> = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 }

/**
 * "5 000/w" → amount and cadence; a bare number keeps the current cadence.
 * An attached k or M is a magnitude, same language as the Goal field —
 * "1,5M" is a million and a half, "1,5M/m" is that much per month.
 */
export function parseAmount(text: string): { value: number; cadence?: Cadence } | null {
  const cleaned = text.replace(/\s+/g, '').replace(',', '.')
  const m = /^(-?\d+(?:\.\d+)?)([km])?(?:\/(.+))?$/i.exec(cleaned)
  if (!m) return null
  const magnitude = m[2] === undefined ? 1 : m[2].toLowerCase() === 'k' ? 1e3 : 1e6
  const value = Number(m[1]) * magnitude
  if (!Number.isFinite(value)) return null
  if (m[3] === undefined) return { value }
  const cadence = UNIT_TOKENS[m[3].toLowerCase()]
  return cadence ? { value, cadence } : null
}

/** A counted unit token, "2m" → { count: 2, unit: monthly }; a bare unit counts as one. */
function countedUnit(token: string): { count: number; unit: Cadence } | null {
  const m = /^(\d+)?([a-z]+)$/.exec(token)
  const unit = m ? UNIT_TOKENS[m[2] ?? ''] : undefined
  if (!m || !unit) return null
  return { count: m[1] === undefined ? 1 : Math.max(1, Number(m[1])), unit }
}

/** Periods per year a rate's quote unit means: "m" → 12, "2m" → 6, "q" → 4, "2yr" → ½. */
function quotePeriods(token: string): number | null {
  const parsed = countedUnit(token)
  return parsed ? PERIODS_PER_YEAR[parsed.unit] / parsed.count : null
}

/** "3 %/m" → the equivalent annual fraction (compounding); bare "%" means /yr. */
export function parseRate(text: string): number | null {
  const cleaned = text.replace(/\s+/g, '').replace(',', '.').replace('%', '')
  const m = /^(-?\d+(?:\.\d+)?)(?:\/(.+))?$/.exec(cleaned)
  if (!m) return null
  const r = Number(m[1]) / 100
  if (!Number.isFinite(r)) return null
  const n = m[2] === undefined ? 1 : quotePeriods(m[2].toLowerCase())
  if (n === null) return null
  return n === 1 ? r : Math.pow(1 + r, n) - 1
}

/** Months a landing token means: "yr" → 12, "q" → 3, "m" → 1, "6m" → 6, "2yr" → 24. */
function landMonths(token: string): number | null {
  const parsed = countedUnit(token)
  if (!parsed) return null
  // sub-monthly landings ("w", "2w") collapse to the tick
  return Math.max(1, Math.round((parsed.count * 12) / PERIODS_PER_YEAR[parsed.unit]))
}

/** "jan" or "january" → 1, … — the calendar month a landing is anchored to. */
const MONTH_TOKENS: Record<string, number> = Object.fromEntries(
  MONTH_NAMES.flatMap((name, i) => [
    [name.toLowerCase(), i + 1],
    [name.slice(0, 3).toLowerCase(), i + 1],
  ]),
)

export interface Landing {
  holdMonths: number | undefined
  holdAnchor: number | undefined
}

/**
 * A landing token: "m" | "q" | "yr" | "6m" (interval, anniversary-based),
 * "jan" (yearly, anchored to January), or "q-jan" (interval-anchor).
 */
function parseLanding(token: string): Landing | null {
  const [head, tail] = token.split('-') as [string, string?]
  if (tail !== undefined) {
    const hold = landMonths(head)
    const anchor = MONTH_TOKENS[tail]
    if (hold === null || anchor === undefined) return null
    // an anchor on a monthly landing has nothing to pin — every month lands
    return hold > 1 ? { holdMonths: hold, holdAnchor: anchor } : { holdMonths: undefined, holdAnchor: undefined }
  }
  const anchor = MONTH_TOKENS[token]
  if (anchor !== undefined) return { holdMonths: 12, holdAnchor: anchor }
  const hold = landMonths(token)
  if (hold === null) return null
  return hold > 1 ? { holdMonths: hold, holdAnchor: undefined } : { holdMonths: undefined, holdAnchor: undefined }
}

/**
 * A growth rate on a flow states two periods: the unit it is quoted in and —
 * in parens — when it lands. "3,5 %/yr" is a yearly raise on the card's
 * anniversary; "3,5 %/yr(apr)" is that raise landing every April; "7 %/yr(m)"
 * is quoted per year but lands every month, smooth — how a fund is quoted.
 * Any unit takes a count: "10 %/2m" is 10 % per two months. The parens
 * default to the quote unit; a bare number keeps the current landing and
 * anchor.
 */
export function parseHoldRate(text: string, current: Landing): ({ annual: number } & Landing) | null {
  const cleaned = text.replace(/\s+/g, '').replace(',', '.').replace('%', '').toLowerCase()
  const m = /^(-?\d+(?:\.\d+)?)(?:\/([a-z0-9]+))?(?:\(([a-z0-9-]+)\))?$/.exec(cleaned)
  if (!m) return null
  const r = Number(m[1]) / 100
  if (!Number.isFinite(r)) return null
  const n = m[2] === undefined ? 1 : quotePeriods(m[2])
  if (n === null) return null
  const annual = n === 1 ? r : Math.pow(1 + r, n) - 1
  const landing = m[3] !== undefined ? parseLanding(m[3]) : m[2] !== undefined ? parseLanding(m[2]) : current
  if (landing === null) return null
  return { annual, ...landing }
}

/** The landing parens of the canonical rate text: a bare "%/yr" is the anniversary raise, "(m)" is smooth. */
export function holdSuffix({ holdMonths, holdAnchor }: Landing): string {
  if (holdMonths === undefined || holdMonths <= 1) return '(m)'
  const interval = holdMonths === 12 ? '' : holdMonths === 3 ? 'q' : `${String(holdMonths)}m`
  const anchor = holdAnchor !== undefined ? MONTH_NAMES[holdAnchor - 1]!.slice(0, 3).toLowerCase() : ''
  if (!interval && !anchor) return ''
  return `(${interval && anchor ? `${interval}-${anchor}` : interval || anchor})`
}
