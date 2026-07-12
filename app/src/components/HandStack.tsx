import { valueAt, type HandCard } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatAmount, formatPerMonth } from '../format'
import { Glyph } from '../icons'
import type { BundleRange } from '../mc'
import type { CardCompare, Sim } from '../model'
import { deltaVerdict, rangeVerdict } from '../verdict'
import { CardShelf } from './CardShelf'

/** A hand at rest: a pile of stacked cards. Tap it to open the hand. */

export function countCards(hand: HandCard): number {
  return hand.children.reduce((sum, c) => sum + (c.kind === 'hand' ? countCards(c) : 1), 0)
}

/**
 * What the hand's assets and debts hold, net, at the scrub month — the stock
 * its monthly flow builds. Null if the hand holds no balances at all, so a
 * pure flow hand shows nothing rather than a meaningless zero.
 */
export function handHeld(hand: HandCard, sim: Sim, scrub: number): number | null {
  let sum = 0
  let has = false
  const walk = (h: HandCard): void => {
    for (const c of h.children) {
      if (c.kind === 'asset' || c.kind === 'debt') {
        has = true
        const s = sim.active.balances.find((b) => b.id === c.id)
        if (s) sum += valueAt(s, scrub)
      } else if (c.kind === 'hand') {
        walk(c)
      }
    }
  }
  walk(hand)
  return has ? sum : null
}

/**
 * A hand's numbers — net flow, held balance, time-to-goal verdict, Monte
 * Carlo range — shared by the resting stack and the opened hand's hub; the
 * prefix picks which family of classes dresses them.
 */
export function HandFigures({
  prefix,
  hand,
  sim,
  scrub,
  from,
  compare,
  range,
}: {
  prefix: 'hand-stack' | 'hub'
  hand: HandCard
  sim: Sim
  scrub: number
  from: number
  compare?: CardCompare
  range?: BundleRange
}): ReactElement {
  const net = sim.active.contributions.find((s) => s.id === hand.id)
  const netValue = net ? valueAt(net, scrub) : null
  const held = handHeld(hand, sim, scrub)
  const verdict = compare ? deltaVerdict(compare, from) : null
  const mcRange = rangeVerdict(range)
  return (
    <>
      <span className={`${prefix}-net num${netValue !== null && netValue < 0 ? ' neg' : ' pos'}`}>
        {netValue !== null ? formatPerMonth(netValue) : '—'}
      </span>
      {held !== null && (
        <span className={`${prefix}-held num${held < 0 ? ' neg' : ' pos'}`} title="what this hand's assets and debts hold, net, at the scrubbed month">
          {formatAmount(held)} /total
        </span>
      )}
      {verdict && (
        <span className={`${prefix}-delta num ${verdict.cls}`} title={verdict.tooltip}>
          {verdict.text}
        </span>
      )}
      {mcRange && (
        <span className={`${prefix}-range num ${mcRange.cls}`} title={mcRange.tooltip}>
          {mcRange.text}
        </span>
      )}
    </>
  )
}

export function HandStack({
  hand,
  sim,
  scrub,
  from,
  compare,
  range,
  onRemove,
  onToggle,
}: {
  hand: HandCard
  sim: Sim
  scrub: number
  from: number
  compare?: CardCompare
  range?: BundleRange
  onRemove: (cardId: string) => void
  onToggle: (cardId: string) => void
}): ReactElement {
  const cards = countCards(hand)
  const setAside = hand.enabled === false
  return (
    <div className={`hand-stack${setAside ? ' muted' : ''}`} title="Open this hand">
      <span className="hand-stack-under u2" />
      <span className="hand-stack-under u1" />
      <CardShelf noun="hand" setAside={setAside} onToggle={() => onToggle(hand.id)} onRemove={() => onRemove(hand.id)} />
      <div className="hand-stack-front">
        <span className="hand-stack-name">{hand.name ?? hand.id}</span>
        <span className="hand-stack-art">
          <Glyph name="bundle" size={30} />
        </span>
        <span className="hand-stack-count num">
          {cards} card{cards === 1 ? '' : 's'}
        </span>
        <HandFigures prefix="hand-stack" hand={hand} sim={sim} scrub={scrub} from={from} {...(compare ? { compare } : {})} {...(range ? { range } : {})} />
      </div>
    </div>
  )
}
