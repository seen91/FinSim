import { useDroppable } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { valueAt, type Card as EngineCard, type HandCard } from '@finsim/engine'
import { useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { formatKr, formatKrPerMonth, formatPercent } from '../format'
import type { GlyphName } from '../icons'
import type { Blueprint } from '../library'
import type { Doc, Sim } from '../model'
import { Card, type CardStat } from './Card'

/**
 * The battle area: one main hand, played top to bottom. The layout alternates
 * axis by depth — the main hand fans across the X axis, a sub-hand stacks down
 * the Y axis, a sub-sub-hand fans across X again, and so on (recursion is the
 * scoping rule). Cards are static here: composing (drag to reorder, set aside)
 * happens on the table; tuning happens in the Workshop.
 */
interface Handlers {
  onRemoveCard: (cardId: string) => void
  onRenameHand: (handId: string, name: string) => void
}

interface Props extends Handlers {
  doc: Doc
  sim: Sim
  scrub: number
  /** The card being dragged from the library right now — drives drop-target highlight. */
  draggingBp: Blueprint | null
}

/** Children laid on the X axis at even depths, the Y axis at odd depths. */
function axisAt(depth: number): 'x' | 'y' {
  return depth % 2 === 0 ? 'x' : 'y'
}

/**
 * A slot that can be dragged to a new position within its hand, along whichever
 * axis its hand uses. The grip renders after the card so a sibling selector can
 * lift it in step with the card's own hover lift, keeping it in the corner.
 */
function SortableSlot({ id, className, children }: { id: string; className: string; children: ReactNode }): ReactElement {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, data: { type: 'reorder' } })
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition: transition ?? undefined }
  return (
    <div ref={setNodeRef} style={style} className={`${className}${isDragging ? ' dragging' : ''}`}>
      {children}
      <button className="drag-grip" title="Drag to reorder — order is the calculation" aria-label="Drag to reorder" {...attributes} {...listeners}>
        ⠿
      </button>
    </div>
  )
}

function displayKind(card: EngineCard): string {
  return card.kind
}

function glyphFor(card: EngineCard): GlyphName {
  const name = (card.name ?? '').toLowerCase()
  switch (card.kind) {
    case 'debt':
      return 'bank'
    case 'hand':
      return 'bundle'
    case 'drain':
      if (card.percent !== undefined) return 'stamp'
      if (name.includes('rent') || name.includes('avgift')) return 'home'
      if (name.includes('payment')) return 'cash'
      return 'receipt'
    case 'source':
      return name.includes('hustle') ? 'briefcase' : 'coins'
    case 'asset':
      if (name.includes('car')) return 'car'
      if (name.includes('apartment') || name.includes('flat')) return 'building'
      if (name.includes('savings')) return 'vault'
      return 'trend'
  }
}

function frontStats(card: EngineCard): CardStat[] {
  const stats: CardStat[] = []
  if (card.kind === 'source' && card.flow.type === 'compound' && card.flow.annualRate.expected > 0) {
    stats.push({ label: 'Raise', value: `${formatPercent(card.flow.annualRate.expected)} /yr` })
  } else if (card.kind === 'drain' && card.percent !== undefined) {
    stats.push({ label: 'Takes', value: `${formatPercent(card.percent, 0)} of subtotal` })
  } else if (card.kind === 'asset') {
    if (!card.price) stats.push({ label: 'Growth', value: `${formatPercent(card.growth?.expected ?? 0)} /yr` })
    if ((card.fee ?? 0) > 0) stats.push({ label: 'Fee', value: `${formatPercent(card.fee!, 2)} /yr` })
    if (card.take) {
      stats.push({
        label: 'Takes',
        value: card.take.type === 'percent' ? `${formatPercent(card.take.percent, 0)} of subtotal` : formatKrPerMonth(card.take.amountPerMonth),
      })
    }
  } else if (card.kind === 'debt') {
    stats.push({ label: 'Interest', value: `${formatPercent(card.interest.expected)} /yr` })
    if (card.payment) {
      stats.push({
        label: 'Payment',
        value: card.payment.type === 'percent' ? `${formatPercent(card.payment.percent, 0)} of subtotal` : formatKrPerMonth(card.payment.amountPerMonth),
      })
    }
  }
  return stats
}

export function CardView({
  card,
  sim,
  scrub,
  handlers,
}: {
  card: EngineCard
  sim: Sim
  scrub: number
  handlers: Handlers
}): ReactElement {
  const contribution = sim.active.contributions.find((s) => s.id === card.id)
  const balanceSeries = sim.active.balances.find((s) => s.id === card.id)
  const isBalance = card.kind === 'asset' || card.kind === 'debt'
  const value = isBalance ? (balanceSeries ? valueAt(balanceSeries, scrub) : 0) : contribution ? valueAt(contribution, scrub) : 0
  const sparkline = isBalance ? balanceSeries?.points : contribution?.points

  return (
    <div className="stack">
      <Card
        face={{
          kind: displayKind(card),
          name: card.name ?? card.id,
          glyph: glyphFor(card),
          headline: isBalance ? formatKr(value) : formatKrPerMonth(value),
          headlineClass: value > 0 ? 'pos' : value < 0 ? 'neg' : '',
          stats: frontStats(card),
          ...(sparkline ? { sparkline } : {}),
        }}
      />
      <button className="card-shelf mod-remove" title="Set aside to the draw pile" aria-label="Set aside" onClick={() => handlers.onRemoveCard(card.id)}>
        ×
      </button>
    </div>
  )
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

function countCards(hand: HandCard): number {
  return hand.children.reduce((sum, c) => sum + (c.kind === 'hand' ? countCards(c) : 1), 0)
}

/**
 * A hand's children, laid out and sortable along the hand's axis. Shared by the
 * root main hand (depth 0, X) and every sub-hand (depth ≥ 1, alternating).
 */
function HandChildren({
  hand,
  depth,
  sim,
  scrub,
  draggingBp,
  handlers,
}: {
  hand: HandCard
  depth: number
  sim: Sim
  scrub: number
  draggingBp: Blueprint | null
  handlers: Handlers
}): ReactElement {
  const axis = axisAt(depth)
  return (
    <div className={`fan fan-${axis}`}>
      <SortableContext items={hand.children.map((c) => c.id)} strategy={rectSortingStrategy}>
        {hand.children.map((child) =>
          child.kind === 'hand' ? (
            <SortableSlot key={child.id} id={child.id} className={`fan-slot fan-slot-${axis} fan-hand`}>
              <SubHand hand={child} depth={depth + 1} sim={sim} scrub={scrub} draggingBp={draggingBp} handlers={handlers} />
            </SortableSlot>
          ) : (
            <SortableSlot key={child.id} id={child.id} className={`fan-slot fan-slot-${axis}`}>
              <CardView card={child} sim={sim} scrub={scrub} handlers={handlers} />
            </SortableSlot>
          ),
        )}
      </SortableContext>
      {hand.children.length === 0 && <p className="hand-empty">empty hand — drop a card here</p>}
    </div>
  )
}

/** A nested hand: chrome (name, count, fold, remove) plus its children on the opposite axis. */
function SubHand({
  hand,
  depth,
  sim,
  scrub,
  draggingBp,
  handlers,
}: {
  hand: HandCard
  depth: number
  sim: Sim
  scrub: number
  draggingBp: Blueprint | null
  handlers: Handlers
}): ReactElement {
  const [open, setOpen] = useState(true)
  const { setNodeRef, isOver } = useDroppable({ id: `hand:${hand.id}`, disabled: draggingBp === null })
  const cards = countCards(hand)
  const net = sim.active.contributions.find((s) => s.id === hand.id)

  if (!open) {
    return (
      <button className="hand-pile" onClick={() => setOpen(true)} title="Open this hand">
        <span className="hand-pile-name">{hand.name ?? hand.id}</span>
        <span className="hand-pile-count num">
          {cards} card{cards === 1 ? '' : 's'}
        </span>
      </button>
    )
  }

  return (
    <div ref={setNodeRef} className={`hand-col nested${draggingBp && isOver ? ' over' : ''}`}>
      <header className="hand-head">
        <HandName name={hand.name ?? hand.id} onRename={(name) => handlers.onRenameHand(hand.id, name)} />
        <span className="hand-count num">{cards}</span>
        <button className="hand-fold" title="Fold into a pile" onClick={() => setOpen(false)}>
          ⌃
        </button>
        <button className="hand-remove mod-remove" title="Set aside to the draw pile" onClick={() => handlers.onRemoveCard(hand.id)}>
          ×
        </button>
      </header>
      <HandChildren hand={hand} depth={depth} sim={sim} scrub={scrub} draggingBp={draggingBp} handlers={handlers} />
      <footer className={`hand-net num${net && valueAt(net, scrub) < 0 ? ' neg' : ' pos'}`}>
        net {net ? formatKrPerMonth(valueAt(net, scrub)) : '—'}
      </footer>
    </div>
  )
}

export function TableView(props: Props): ReactElement {
  const { doc, sim, scrub, draggingBp, ...handlers } = props
  const { setNodeRef, isOver } = useDroppable({ id: 'table', disabled: draggingBp === null })

  return (
    <section ref={setNodeRef} className={`table-felt${draggingBp ? ' accepts' : ''}${draggingBp && isOver ? ' over' : ''}`}>
      <p className="zone-label">{doc.table.root.name ?? 'Your plan'} · played left to right, top to bottom</p>
      <div className="main-hand">
        <HandChildren hand={doc.table.root} depth={0} sim={sim} scrub={scrub} draggingBp={draggingBp} handlers={handlers} />
        <div className="cash-vessel">
          <Card
            face={{
              kind: 'vessel',
              name: 'Cash',
              glyph: 'cash',
              headline: formatKr(valueAt(sim.active.cash, scrub)),
              stats: [{ label: 'In', value: 'whatever is left' }],
              sparkline: sim.active.cash.points,
            }}
          />
        </div>
      </div>
    </section>
  )
}
