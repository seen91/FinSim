import { formatMonth, valueAt, type HandCard } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatAmount, formatPerMonth } from '../format'
import { Glyph } from '../icons'
import type { BundleRange } from '../mc'
import { isBalanceKind, type CardCompare, type Sim } from '../model'
import { deltaVerdict, rangeVerdict } from '../verdict'
import { CardShelf } from './CardShelf'

/** A hand at rest: a pile of stacked cards. Tap it to open the hand. */

function countCards(hand: HandCard): number {
  return hand.children.reduce((sum, c) => sum + (c.kind === 'hand' ? countCards(c) : 1), 0)
}

/**
 * What the hand's assets and debts hold, net, at the scrub month — the stock
 * its monthly flow builds. Null if the hand holds no balances at all, so a
 * pure flow hand shows nothing rather than a meaningless zero.
 */
function handHeld(hand: HandCard, sim: Sim, scrub: number): number | null {
  let sum = 0
  let has = false
  const walk = (h: HandCard): void => {
    for (const c of h.children) {
      if (isBalanceKind(c.kind)) {
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
 * Where a hand's take overdraws its parent: the first month the take exceeded
 * what was available at the hand's position, and the worst monthly gap. Null
 * when the take is always covered (percent takes never overdraw). The engine
 * still draws in full — this only decides whether the UI shows the red flag.
 */
export function handShortfall(hand: HandCard, sim: Sim): { firstMonth: number; peak: number } | null {
  const s = sim.active.shortfalls.find((x) => x.id === hand.id)
  if (!s) return null
  let firstMonth: number | null = null
  let peak = 0
  for (const [i, p] of s.points.entries()) {
    if (p <= 0) continue
    firstMonth ??= s.startMonth + i
    peak = Math.max(peak, p)
  }
  return firstMonth === null ? null : { firstMonth, peak }
}

export function shortfallTitle(shortfall: { firstMonth: number; peak: number }): string {
  return `the take exceeds what's available at this hand's position — first ${formatMonth(shortfall.firstMonth)}, up to ${formatPerMonth(shortfall.peak)} uncovered`
}

/**
 * A hand's numbers — net flow, held balance, time-to-goal verdict, Monte
 * Carlo range — shared by the resting stack and the opened hand's hub; the
 * prefix picks which family of classes dresses them.
 */
export function HandFigures({
  prefix,
  net = true,
  hand,
  sim,
  scrub,
  from,
  compare,
  range,
  onReport,
}: {
  prefix: 'hand-stack' | 'hub'
  /** Show the net /mo line — the hub omits it, its take line already says what goes in. */
  net?: boolean
  hand: HandCard
  sim: Sim
  scrub: number
  from: number
  compare?: CardCompare
  range?: BundleRange
  /** When set, the range line is a door: click to unfold this hand's futures report. */
  onReport?: () => void
}): ReactElement {
  const contribution = sim.active.contributions.find((s) => s.id === hand.id)
  const netValue = contribution ? valueAt(contribution, scrub) : null
  const held = handHeld(hand, sim, scrub)
  const verdict = compare ? deltaVerdict(compare, from) : null
  const mcRange = rangeVerdict(range)
  // a negative net is normal life (ink, not red) — red is the overdraft flag,
  // when the take exceeds what the parent actually has at the hand's position
  const shortfall = handShortfall(hand, sim)
  return (
    <>
      {net && (
        <span
          className={`${prefix}-net num${netValue !== null && netValue < 0 ? (shortfall ? ' neg' : '') : ' pos'}`}
          {...(shortfall ? { title: shortfallTitle(shortfall) } : {})}
        >
          {netValue !== null ? formatPerMonth(netValue) : '—'}
        </span>
      )}
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
      {mcRange &&
        (onReport ? (
          <button
            className={`${prefix}-range num ${mcRange.cls}`}
            title={`${mcRange.tooltip} — click to unfold this hand's futures report`}
            onClick={onReport}
          >
            {mcRange.text}
            <Glyph name="book" size={9} />
          </button>
        ) : (
          <span className={`${prefix}-range num ${mcRange.cls}`} title={mcRange.tooltip}>
            {mcRange.text}
          </span>
        ))}
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
  onReport,
}: {
  hand: HandCard
  sim: Sim
  scrub: number
  from: number
  compare?: CardCompare
  range?: BundleRange
  onRemove: (cardId: string) => void
  onToggle: (cardId: string) => void
  /** Unfold this hand's futures report (the range line becomes a door). */
  onReport?: (handId: string) => void
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
        <HandFigures
          prefix="hand-stack"
          hand={hand}
          sim={sim}
          scrub={scrub}
          from={from}
          {...(compare ? { compare } : {})}
          {...(range ? { range } : {})}
          {...(onReport ? { onReport: () => onReport(hand.id) } : {})}
        />
      </div>
    </div>
  )
}
