import { formatMonth, formatMonthsDelta, valueAt, type HandCard } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatKrPerMonth } from '../format'
import { Glyph } from '../icons'
import type { HandCompare, Sim } from '../model'

/** A hand at rest: a pile of stacked cards. Tap it to open the hand. */

export function countCards(hand: HandCard): number {
  return hand.children.reduce((sum, c) => sum + (c.kind === 'hand' ? countCards(c) : 1), 0)
}

/** The verdict, short: "+1 yr 3 mo to goal" — and the full story on hover. */
export function deltaVerdict(c: HandCompare): { text: string; cls: 'pos' | 'neg'; tooltip: string } | null {
  const { baseMonth, variantMonth, deltaMonths } = c.delta
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
  if (variantMonth !== null) return { text: 'brings goal in reach', cls: 'pos', tooltip: `goal never without — ${formatMonth(variantMonth)} with` }
  return null
}

export function HandStack({ hand, sim, scrub, compare }: { hand: HandCard; sim: Sim; scrub: number; compare?: HandCompare }): ReactElement {
  const cards = countCards(hand)
  const net = sim.active.contributions.find((s) => s.id === hand.id)
  const netValue = net ? valueAt(net, scrub) : null
  const verdict = compare ? deltaVerdict(compare) : null
  return (
    <div className="hand-stack" title="Open this hand">
      <span className="hand-stack-under u2" />
      <span className="hand-stack-under u1" />
      <div className="hand-stack-front">
        <span className="hand-stack-name">{hand.name ?? hand.id}</span>
        <span className="hand-stack-art">
          <Glyph name="bundle" size={30} />
        </span>
        <span className="hand-stack-count num">
          {cards} card{cards === 1 ? '' : 's'}
        </span>
        <span className={`hand-stack-net num${netValue !== null && netValue < 0 ? ' neg' : ' pos'}`}>
          net {netValue !== null ? formatKrPerMonth(netValue) : '—'}
        </span>
        {verdict && (
          <span className={`hand-stack-delta num ${verdict.cls}`} title={verdict.tooltip}>
            {verdict.text}
          </span>
        )}
      </div>
    </div>
  )
}
