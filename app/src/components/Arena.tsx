import { firstCrossing, formatMonth, formatMonthsDelta, type Card as EngineCard, type HandCard, type Series } from '@finsim/engine'
import { useState, type ReactElement } from 'react'
import { formatPercent } from '../format'
import { Glyph } from '../icons'
import type { Mc } from '../mc'
import type { Doc, Sim } from '../model'
import { CardView } from './CardView'
import { Fan, type FanGeometry } from './Fan'
import { HandFigures, HandStack, countCards } from './HandStack'
import { Timeline } from './Timeline'

/**
 * The big panel: the chart, or — when a hand is opened — the game area, with
 * the hand's cards around the top of a circle and its numbers in the hub.
 */
const CIRCLE: FanGeometry = { radius: 300, maxStep: 16, maxSpread: 336, visibleTo: 105, cardWidth: 124 }

/** What the Workshop's focused card puts in the arena: one curve, one name. */
export interface ArenaFocus {
  name: string
  note: string
  series: Series
}

interface Props {
  doc: Doc
  sim: Sim
  /** Monte Carlo results, when the table carries volatility (null otherwise). */
  mc: Mc | null
  scrub: number
  onScrub: (month: number) => void
  /** Workshop focus: chart only this card, whatever else is open. */
  focus?: ArenaFocus | null
  /** The opened hand, root → … → innermost. Empty = chart mode. */
  trail: HandCard[]
  onNavigate: (handId: string | null) => void
  onReorder: (cardId: string, toIndex: number) => void
  onRemoveCard: (cardId: string) => void
  onToggleCard: (cardId: string) => void
  /** The one card currently showing its what-if dials (a tap turns it). */
  flippedId: string | null
  onFlipCard: (cardId: string) => void
  onTuneCard: (next: EngineCard) => void
  onRenameHand: (handId: string, name: string) => void
  /** Unfold the fan: open the futures report. */
  onOpenReport: () => void
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
  const { doc, sim, mc, scrub, onScrub, focus, trail, onNavigate, onReorder, onRemoveCard, onToggleCard, flippedId, onFlipCard, onTuneCard, onRenameHand, onOpenReport } = props
  const hand = trail[trail.length - 1]

  // the Workshop's focus stage: the chart holds one card's curve, nothing else
  if (focus) {
    return (
      <section className="arena">
        <Timeline sim={sim} goal={doc.goal} from={doc.from} horizonMonths={doc.horizonMonths} scrub={scrub} onScrub={onScrub} focus={focus.series} />
        <div className="chart-verdict">
          <span className="chart-focus">{focus.name}</span>
          <span className="chart-focus-note">{focus.note}</span>
        </div>
      </section>
    )
  }

  if (!hand) {
    // the whole plan's verdict, in the same shape the hand stacks use —
    // this one, of course, factors in every card and hand on the table
    const cross = firstCrossing(sim.active, doc.goal)
    return (
      <section className="arena">
        <Timeline sim={sim} goal={doc.goal} from={doc.from} horizonMonths={doc.horizonMonths} scrub={scrub} onScrub={onScrub} mc={mc} />
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
          {mc && (
            <button
              className={`chart-verdict-odds num${mc.goalProbability >= 0.5 ? ' pos' : ' neg'}`}
              onClick={onOpenReport}
              title="share of simulated futures that reach the goal within the horizon — click to unfold the full futures report"
            >
              in {formatPercent(mc.goalProbability, 0)} of futures
              <Glyph name="book" size={10} />
            </button>
          )}
        </div>
      </section>
    )
  }

  const cards = countCards(hand)
  const compare = sim.compares.find((c) => c.cardId === hand.id)
  const range = mc?.ranges.get(hand.id)
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
            else onFlipCard(card.id)
          }}
          renderItem={(card) =>
            card.kind === 'hand' ? (
              <HandStack
                hand={card}
                sim={sim}
                scrub={scrub}
                from={doc.from}
                compare={sim.compares.find((c) => c.cardId === card.id)}
                range={mc?.ranges.get(card.id)}
                onRemove={onRemoveCard}
                onToggle={onToggleCard}
              />
            ) : (
              <CardView
                card={card}
                sim={sim}
                scrub={scrub}
                from={doc.from}
                compare={sim.compares.find((c) => c.cardId === card.id)}
                size="hand"
                flipped={flippedId === card.id}
                onRemove={onRemoveCard}
                onToggle={onToggleCard}
                onTune={onTuneCard}
              />
            )
          }
        />
        <div className="circle-hub">
          <HandName name={hand.name ?? hand.id} onRename={(name) => onRenameHand(hand.id, name)} />
          <span className="hub-count num">
            {cards} card{cards === 1 ? '' : 's'} · plays left to right
          </span>
          <HandFigures prefix="hub" hand={hand} sim={sim} scrub={scrub} from={doc.from} {...(compare ? { compare } : {})} {...(range ? { range } : {})} />
          <button
            className="sign hub-toggle"
            title={hand.enabled === false ? 'Bring this hand back into play' : 'Set aside — the table plays as if this hand were not there'}
            onClick={() => onToggleCard(hand.id)}
          >
            <Glyph name={hand.enabled === false ? 'play' : 'pause'} size={12} /> {hand.enabled === false ? 'bring back' : 'set aside'}
          </button>
          <button
            className="sign hub-remove"
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
