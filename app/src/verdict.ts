import { formatMonth, formatMonthsDelta } from '@finsim/engine'
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
