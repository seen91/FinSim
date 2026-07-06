import { firstCrossing, formatMonth, formatMonthsDelta, valueAt, type HandCard } from '@finsim/engine'
import { useState, type ReactElement } from 'react'
import { formatAmount, formatPerMonth } from '../format'
import { Glyph } from '../icons'
import type { Doc, Sim } from '../model'
import { deltaVerdict } from '../verdict'
import { CardView } from './CardView'
import { Fan, type FanGeometry } from './Fan'
import { HandStack, countCards, handHeld } from './HandStack'
import { Timeline } from './Timeline'

/**
 * The big panel: the chart, or — when a hand is opened — the game area, with
 * the hand's cards around the top of a circle and its numbers in the hub.
 */
const CIRCLE: FanGeometry = { radius: 300, maxStep: 16, maxSpread: 336, visibleTo: 105, cardWidth: 124 }

interface Props {
  doc: Doc
  sim: Sim
  scrub: number
  onScrub: (month: number) => void
  /** The opened hand, root → … → innermost. Empty = chart mode. */
  trail: HandCard[]
  onNavigate: (handId: string | null) => void
  onReorder: (cardId: string, toIndex: number) => void
  onRemoveCard: (cardId: string) => void
  onRenameHand: (handId: string, name: string) => void
}

function HandName({ name, onRename }: { name: string; onRename: (name: string) => void }): ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  if (!editing) {
    return (
      <button
        className="hand-name"
        title="Rename hand"
        onClick={() => {
          setDraft(name)
          setEditing(true)
        }}
      >
        {name}
      </button>
    )
  }
  const commit = (): void => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
  }
  return (
    <input
      className="hand-name-input"
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

export function Arena(props: Props): ReactElement {
  const { doc, sim, scrub, onScrub, trail, onNavigate, onReorder, onRemoveCard, onRenameHand } = props
  const hand = trail[trail.length - 1]

  if (!hand) {
    // the whole plan's verdict, in the same shape the hand stacks use —
    // this one, of course, factors in every card and hand on the table
    const cross = firstCrossing(sim.active, doc.goal)
    return (
      <section className="arena">
        <Timeline sim={sim} goal={doc.goal} from={doc.from} horizonMonths={doc.horizonMonths} scrub={scrub} onScrub={onScrub} />
        <div className="chart-verdict">
          {cross !== null ? (
            <span className="chart-verdict-text num pos" title={`the whole table reaches the goal ${formatMonth(cross)}`}>
              goal in {formatMonthsDelta(cross - doc.from)}
            </span>
          ) : (
            <span className="chart-verdict-text num neg" title="the whole table never reaches the goal within the horizon">
              goal out of reach
            </span>
          )}
        </div>
      </section>
    )
  }

  const cards = countCards(hand)
  const net = sim.active.contributions.find((s) => s.id === hand.id)
  const held = handHeld(hand, sim, scrub)
  const compare = sim.compares.find((c) => c.cardId === hand.id)
  const verdict = compare ? deltaVerdict(compare, doc.from) : null
  const parent = trail[trail.length - 2]

  return (
    <section className="arena arena-game">
      <nav className="trail">
        <button onClick={() => onNavigate(null)}>Chart</button>
        {trail.map((h) => (
          <button key={h.id} disabled={h === hand} onClick={() => onNavigate(h.id)}>
            {h.name ?? h.id}
          </button>
        ))}
      </nav>
      <button className="arena-close" title="Back to the chart" aria-label="Back to the chart" onClick={() => onNavigate(null)}>
        ×
      </button>
      <div className="circle">
        <Fan
          hand={hand}
          geometry={CIRCLE}
          onReorder={onReorder}
          onItemClick={(card) => {
            if (card.kind === 'hand') onNavigate(card.id)
          }}
          renderItem={(card) =>
            card.kind === 'hand' ? (
              <HandStack hand={card} sim={sim} scrub={scrub} from={doc.from} compare={sim.compares.find((c) => c.cardId === card.id)} />
            ) : (
              <CardView card={card} sim={sim} scrub={scrub} from={doc.from} compare={sim.compares.find((c) => c.cardId === card.id)} size="hand" onRemove={onRemoveCard} />
            )
          }
        />
        <div className="circle-hub">
          <HandName name={hand.name ?? hand.id} onRename={(name) => onRenameHand(hand.id, name)} />
          <span className="hub-count num">
            {cards} card{cards === 1 ? '' : 's'} · plays left to right
          </span>
          <span className={`hub-net num${net && valueAt(net, scrub) < 0 ? ' neg' : ' pos'}`}>
            {net ? formatPerMonth(valueAt(net, scrub)) : '—'}
          </span>
          {held !== null && (
            <span className={`hub-held num${held < 0 ? ' neg' : ' pos'}`} title="what this hand's assets and debts hold, net, at the scrubbed month">
              {formatAmount(held)} /total
            </span>
          )}
          {verdict && (
            <span className={`hub-delta num ${verdict.cls}`} title={verdict.tooltip}>
              {verdict.text}
            </span>
          )}
          <button
            className="hub-remove"
            title="Discard the whole hand to the draw pile"
            onClick={() => {
              onNavigate(parent?.id ?? null)
              onRemoveCard(hand.id)
            }}
          >
            <Glyph name="flame" size={12} /> discard hand
          </button>
        </div>
        {hand.children.length === 0 && <p className="hand-empty">empty hand — draw a card into it</p>}
      </div>
    </section>
  )
}
