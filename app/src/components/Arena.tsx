import { firstCrossing, formatMonth, formatMonthsDelta, type Card as EngineCard, type HandCard, type Series, type Take } from '@finsim/engine'
import { useEffect, useState, type ReactElement } from 'react'
import { formatCompact, formatNumber, formatPercent, formatPerMonth, parseCompact } from '../format'
import { NEW_HAND_NAME } from '../hands'
import { Glyph } from '../icons'
import type { Mc } from '../mc'
import type { Doc, Sim } from '../model'
import { CardView } from './CardView'
import { Fan, type FanGeometry } from './Fan'
import { HandFigures, HandStack, handShortfall, shortfallTitle } from './HandStack'
import { Timeline } from './Timeline'

/**
 * The big panel: the chart, or — when a hand is opened — the game area, with
 * the hand's cards around the top of a circle and its numbers in the hub.
 */
/**
 * Cards in an opened hand are full-size — the same 184px they are in the main
 * hand — and only shrink when the arena is too short to fit card + hub, down
 * to the old 124px floor. Radius scales along so the arc keeps its shape.
 */
const FULL_CARD_W = 184
const MIN_CARD_W = 124
/** What must fit under the ring: clearance + the hub's text and buttons. */
const HUB_ROOM = 218
const circleGeometry = (arenaHeight: number | null): FanGeometry => {
  const fits = arenaHeight === null ? FULL_CARD_W : Math.floor(((arenaHeight * 0.96 - HUB_ROOM) * 63) / 88)
  const cardWidth = Math.max(MIN_CARD_W, Math.min(FULL_CARD_W, fits))
  return { radius: Math.round((445 * cardWidth) / FULL_CARD_W), maxStep: 16, maxSpread: 336, visibleTo: 105, cardWidth }
}

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
  /** A card lifted off the ring and dropped onto a sibling — stack them into a hand. */
  onGroup: (draggedId: string, ontoId: string) => void
  /** A card lifted off the ring and dropped on nothing — it leaves this hand for the parent. */
  onEject: (cardId: string) => void
  onRemoveCard: (cardId: string) => void
  onToggleCard: (cardId: string) => void
  /** The one card currently showing its what-if dials (a tap turns it). */
  flippedId: string | null
  onFlipCard: (cardId: string) => void
  onTuneCard: (next: EngineCard) => void
  /** Carry a card from its shelf to the Workshop bench. */
  onWorkshopCard: (cardId: string) => void
  onRenameHand: (handId: string, name: string) => void
  /** Set (or clear) what the hand draws out of its parent each month. */
  onSetHandTake: (handId: string, take: Take | undefined) => void
  /** Unfold the fan: open the futures report. */
  onOpenReport: () => void
}

function HandName({ name, onRename }: { name: string; onRename: (name: string) => void }): ReactElement {
  // a hand still wearing the fresh-stack name opens straight into editing —
  // naming it IS the next move (keyed by hand id, so the state is per hand)
  const [editing, setEditing] = useState(name === NEW_HAND_NAME)
  const [draft, setDraft] = useState(name)
  if (!editing) {
    // the watermark fills the felt whatever the name's length: short names
    // ("ISK") grow until the viewport caps them, long ones shrink to fit
    const fontSize = `min(28vh, ${Math.min(22, 180 / Math.max(1, name.length))}vw)`
    return (
      <button
        className="hand-name"
        style={{ fontSize }}
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
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

/**
 * What the hand draws out of its parent each month, before its cards play —
 * nothing (the subtotal starts from zero), a fixed amount ("I save
 * 5 000 /mo"), or a share of what's left at the hand's position. The one
 * line in the hub that decides whether the hand receives money at all.
 */
function HandTake({
  take,
  parentName,
  shortfall,
  onChange,
}: {
  take: Take | undefined
  parentName: string
  /** Set when the take overdraws the parent — the line turns red, honestly. */
  shortfall: { firstMonth: number; peak: number } | null
  onChange: (take: Take | undefined) => void
}): ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!editing) {
    const label =
      take === undefined
        ? `takes nothing from ${parentName}`
        : take.type === 'fixed'
          ? `takes ${formatPerMonth(take.amountPerMonth)} from ${parentName}`
          : `takes ${formatPercent(take.percent, 0)} of what's left in ${parentName}`
    return (
      <button
        className={`hub-take${shortfall ? ' overdrawn' : ''}`}
        title={`what this hand draws out of ${parentName} each month, before its cards play — click to change${shortfall ? `. ${shortfallTitle(shortfall)}` : ''}`}
        onClick={() => {
          setDraft(take === undefined ? '' : take.type === 'fixed' ? formatCompact(take.amountPerMonth) : formatNumber(take.percent * 100))
          setEditing(true)
        }}
      >
        {label}
      </button>
    )
  }

  const commitDraft = (): void => {
    if (take === undefined) return
    if (take.type === 'fixed') {
      const parsed = parseCompact(draft)
      if (parsed !== null && parsed >= 0) onChange({ type: 'fixed', amountPerMonth: parsed })
      else setDraft(formatCompact(take.amountPerMonth))
    } else {
      const parsed = Number(draft.replace(/[\s  ]/g, '').replace(',', '.'))
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) onChange({ type: 'percent', percent: parsed / 100 })
      else setDraft(formatNumber(take.percent * 100))
    }
  }

  // every change commits live; the editor folds away when focus leaves it
  return (
    <span
      className="hub-take-edit"
      onKeyDown={(e) => {
        // Escape must not also close the opened hand (the app-level listener)
        e.stopPropagation()
        if (e.key === 'Enter') {
          commitDraft()
          setEditing(false)
        }
        if (e.key === 'Escape') setEditing(false)
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        commitDraft()
        setEditing(false)
      }}
    >
      takes
      <select
        autoFocus={take === undefined}
        value={take?.type ?? 'none'}
        onChange={(e) => {
          const mode = e.target.value
          if (mode === (take?.type ?? 'none')) return
          if (mode === 'none') onChange(undefined)
          else if (mode === 'fixed') {
            onChange({ type: 'fixed', amountPerMonth: 1_000 })
            setDraft(formatCompact(1_000))
          } else {
            onChange({ type: 'percent', percent: 0.1 })
            setDraft(formatNumber(10))
          }
        }}
      >
        <option value="none">nothing</option>
        <option value="fixed">a fixed amount</option>
        <option value="percent">a share of what&rsquo;s left</option>
      </select>
      {take && (
        <input
          className="num"
          value={draft}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      {take && <span className="hub-take-unit">{take.type === 'fixed' ? '/mo' : '%'}</span>}
    </span>
  )
}

export function Arena(props: Props): ReactElement {
  const {
    doc,
    sim,
    mc,
    scrub,
    onScrub,
    focus,
    trail,
    onNavigate,
    onReorder,
    onGroup,
    onEject,
    onRemoveCard,
    onToggleCard,
    flippedId,
    onFlipCard,
    onTuneCard,
    onWorkshopCard,
    onRenameHand,
    onSetHandTake,
    onOpenReport,
  } = props
  const hand = trail[trail.length - 1]

  // the ring scales to the arena: full-size cards whenever they fit
  const [arenaEl, setArenaEl] = useState<HTMLElement | null>(null)
  const [arenaHeight, setArenaHeight] = useState<number | null>(null)
  useEffect(() => {
    if (!arenaEl) return
    const observer = new ResizeObserver(() => setArenaHeight(arenaEl.clientHeight))
    observer.observe(arenaEl)
    return () => observer.disconnect()
  }, [arenaEl])
  const circle = circleGeometry(arenaHeight)

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

  const compare = sim.compares.find((c) => c.cardId === hand.id)
  const range = mc?.ranges.get(hand.id)
  const parent = trail[trail.length - 2]

  const cardHeight = Math.round((circle.cardWidth * 88) / 63)
  return (
    <section className="arena arena-game" ref={setArenaEl}>
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
      <div className="circle" style={{ ['--ring-h' as string]: `${cardHeight + HUB_ROOM}px` }}>
        <Fan
          hand={hand}
          geometry={circle}
          onReorder={onReorder}
          onGroup={onGroup}
          onEject={onEject}
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
                size={circle.cardWidth < FULL_CARD_W ? 'hand' : 'table'}
                flipped={flippedId === card.id}
                onRemove={onRemoveCard}
                onToggle={onToggleCard}
                onTune={onTuneCard}
                onWorkshop={onWorkshopCard}
              />
            )
          }
        />
        {/* the name reads as a watermark across the felt, out of the numbers' way — still the rename button */}
        <div className="hand-watermark">
          <HandName key={hand.id} name={hand.name ?? hand.id} onRename={(name) => onRenameHand(hand.id, name)} />
        </div>
        <div className="circle-hub">
          <HandTake
            key={`take-${hand.id}`}
            take={hand.take}
            parentName={(parent ?? sim.resolvedRoot).name ?? 'the table'}
            shortfall={handShortfall(hand, sim)}
            onChange={(take) => onSetHandTake(hand.id, take)}
          />
          {/* visible only while a lifted card hovers over no sibling (CSS :has on .fan-ejecting) */}
          <span className="hub-eject-hint">drop — the card leaves this hand for {(parent ?? sim.resolvedRoot).name ?? 'the table'}</span>
          {/* no net /mo line here: the take line above already says what goes in */}
          <HandFigures prefix="hub" net={false} hand={hand} sim={sim} scrub={scrub} from={doc.from} {...(compare ? { compare } : {})} {...(range ? { range } : {})} />
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
