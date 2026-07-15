import { formatMonth, formatMonthsDelta } from '@finsim/engine'
import type { BundleRange } from './mc'
import type { CardCompare } from './model'

/** The verdict line every card and hand carries: what it does to the goal. */
export interface Verdict {
  text: string
  cls: 'pos' | 'neg'
  tooltip: string
}

/**
 * The verdict on a card. A card that reaches the goal on its own says when —
 * that number is the card's alone and never moves when other cards change.
 * Anything else is judged marginally: what playing it does to the plan.
 */
export function deltaVerdict(c: CardCompare, from: number): Verdict | null {
  const { baseMonth, variantMonth, deltaMonths } = c.delta
  if (c.soloGoalMonth !== null) {
    return {
      text: `goal in ${formatMonthsDelta(c.soloGoalMonth - from)}`,
      cls: 'pos',
      tooltip: `this card alone reaches the goal ${formatMonth(c.soloGoalMonth)} — the rest of the table does not move this number`,
    }
  }
  if (baseMonth !== null && variantMonth !== null && deltaMonths !== null) {
    if (deltaMonths === 0) return null
    const costs = deltaMonths > 0
    return {
      text: `${costs ? '+' : '−'}${formatMonthsDelta(Math.abs(deltaMonths))} to goal`,
      cls: costs ? 'neg' : 'pos',
      tooltip: `goal ${formatMonth(baseMonth)} without → ${formatMonth(variantMonth)} with`,
    }
  }
  if (baseMonth !== null) return { text: 'goal out of reach', cls: 'neg', tooltip: `goal ${formatMonth(baseMonth)} without — never with` }
  if (variantMonth !== null) {
    return {
      text: `goal in ${formatMonthsDelta(variantMonth - from).replaceAll(' ', ' ')}`,
      cls: 'pos',
      tooltip: `this card brings the goal in reach: never without it — ${formatMonth(variantMonth)} with`,
    }
  }
  return null
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
