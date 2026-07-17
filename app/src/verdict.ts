import { formatMonth, formatMonthsDelta } from '@finsim/engine'
import { formatCompact } from './format'
import type { BundleRange } from './mc'
import type { CardCompare } from './model'

/** The verdict line every card and hand carries: what it does to the goal. */
export interface Verdict {
  text: string
  cls: 'pos' | 'neg'
  tooltip: string
}

/**
 * The verdict on a card always answers the discard question: the table is
 * replayed without the card, and the difference is stamped on the face in
 * both units — months to the goal and money at the goal month (lost or
 * earned compounding included). A card that would reach the goal all on its
 * own says so in the tooltip only; that solo number lives in a different
 * world (no siblings feeding or draining it) and never sums with anything.
 */
export function deltaVerdict(c: CardCompare, from: number): Verdict | null {
  const { baseMonth, variantMonth, deltaMonths } = c.delta
  const kr = Math.abs(c.worthDelta) >= 1 ? `${c.worthDelta < 0 ? '−' : '+'}${formatCompact(Math.abs(c.worthDelta))}` : null
  const krTold = kr === null ? '' : `; ${formatCompact(Math.abs(c.worthDelta))} ${c.worthDelta < 0 ? 'less' : 'more'} at ${formatMonth(c.worthMonth)} because of it`
  const solo = c.soloGoalMonth === null ? '' : ` — alone it would reach the goal ${formatMonth(c.soloGoalMonth)}`
  if (baseMonth !== null && variantMonth !== null && deltaMonths !== null) {
    if (deltaMonths === 0) {
      if (kr === null) return null
      return {
        text: `${kr} at goal`,
        cls: c.worthDelta < 0 ? 'neg' : 'pos',
        tooltip: `the goal date does not move without this card${krTold}${solo}`,
      }
    }
    const costs = deltaMonths > 0
    return {
      text: `${costs ? '+' : '−'}${formatMonthsDelta(Math.abs(deltaMonths))} to goal${kr === null ? '' : ` · ${kr}`}`,
      cls: costs ? 'neg' : 'pos',
      tooltip: `goal ${formatMonth(baseMonth)} without → ${formatMonth(variantMonth)} with${krTold}${solo}`,
    }
  }
  if (baseMonth !== null) {
    return {
      text: `goal out of reach${kr === null ? '' : ` · ${kr}`}`,
      cls: 'neg',
      tooltip: `goal ${formatMonth(baseMonth)} without — never with${krTold}${solo}`,
    }
  }
  if (variantMonth !== null) {
    return {
      text: `goal in ${formatMonthsDelta(variantMonth - from).replaceAll(' ', ' ')}${kr === null ? '' : ` · ${kr}`}`,
      cls: 'pos',
      tooltip: `this card brings the goal in reach: never without it — ${formatMonth(variantMonth)} with${krTold}${solo}`,
    }
  }
  if (kr === null) return null
  return {
    text: `${kr} by ${formatMonth(c.worthMonth)}`,
    cls: c.worthDelta < 0 ? 'neg' : 'pos',
    tooltip: `the goal stays out of reach with or without this card${krTold}${solo}`,
  }
}

/** "+1 yr – 2 yr 6 mo" — a signed month count, for range spans. */
export function signedDelta(months: number): string {
  return `${months < 0 ? '−' : '+'}${formatMonthsDelta(Math.abs(months))}`
}

/**
 * The Monte Carlo second line under a bundle's verdict: the P10–P90 span of
 * the per-path time-to-goal delta — "+1 yr – 2 yr 6 mo to goal in 80 % of
 * futures". When too few paths reach the goal both with and without the
 * bundle for a span to mean anything, the honest read is the odds shift.
 */
export function rangeVerdict(range: BundleRange | undefined): Verdict | null {
  if (!range) return null
  if (range.comparable >= 0.5) {
    const lo = Math.round(range.d10)
    const hi = Math.round(range.d90)
    if (lo === 0 && hi === 0) return null
    const span = lo === hi ? signedDelta(lo) : `${signedDelta(lo)} – ${signedDelta(hi)}`
    return {
      text: `${span} in 80 % of futures`,
      cls: lo + hi > 0 ? 'neg' : 'pos',
      tooltip: `the middle 80 % of futures — computed on the ${String(Math.round(range.comparable * 100))} % of simulated paths where the goal is reached both with and without this hand, under identical market draws`,
    }
  }
  const withPct = Math.round(range.probWith * 100)
  const withoutPct = Math.round(range.probWithout * 100)
  if (withPct === withoutPct) return null
  return {
    text: `goal odds ${String(withoutPct)} % → ${String(withPct)} %`,
    cls: withPct < withoutPct ? 'neg' : 'pos',
    tooltip: 'share of simulated futures that reach the goal: without this hand → with it',
  }
}
