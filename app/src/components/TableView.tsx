import { useDroppable } from '@dnd-kit/core'
import { valueAt, type Card as EngineCard, type HandCard } from '@finsim/engine'
import { useState, type ReactElement } from 'react'
import { cardEditors } from '../editors'
import { formatKr, formatKrPerMonth, formatPercent } from '../format'
import type { GlyphName } from '../icons'
import type { Blueprint } from '../library'
import type { Doc, Sim } from '../model'
import { Card, type CardStat } from './Card'

/**
 * The table: hands of cards, each played top to bottom — the column IS the
 * calculation. Cards cascade down the Y axis; a hand nested inside a hand
 * rests as a pile and expands in place, recursively. Every card is
 * self-contained: flip it for its parameters and its position controls.
 */
interface Handlers {
  onEditCard: (label: string, cardId: string, mutate: (card: EngineCard) => void) => void
  onMoveCard: (cardId: string, direction: -1 | 1) => void
  onRemoveCard: (cardId: string) => void
  onToggleHand: (handId: string, enabled: boolean) => void
  onRenameHand: (handId: string, name: string) => void
  onCommit: () => void
}

interface Props extends Handlers {
  doc: Doc
  sim: Sim
  scrub: number
  /** The card being dragged right now — drives the drop-target highlight. */
  draggingBp: Blueprint | null
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

function CardView({
  card,
  sim,
  scrub,
  muted,
  handlers,
}: {
  card: EngineCard
  sim: Sim
  scrub: number
  muted: boolean
  handlers: Handlers
}): ReactElement {
  const [flipped, setFlipped] = useState(false)
  const contribution = sim.active.contributions.find((s) => s.id === card.id)
  const balanceSeries = sim.active.balances.find((s) => s.id === card.id)
  const isBalance = card.kind === 'asset' || card.kind === 'debt'
  const value = isBalance
    ? balanceSeries
      ? valueAt(balanceSeries, scrub)
      : 0
    : contribution
      ? valueAt(contribution, scrub)
      : 0
  const editors = cardEditors(card)
  const sparkline = isBalance ? balanceSeries?.points : contribution?.points

  return (
    <div className={`stack${flipped ? ' pinned' : ''}`}>
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
        muted={muted}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        back={
          <>
            {editors.map((editor) => (
              <label key={editor.key} className="param">
                <span className="param-label">
                  {editor.label}
                  <span className="param-value num">{editor.format(editor.value)}</span>
                </span>
                <input
                  type="range"
                  min={editor.min}
                  max={editor.max}
                  step={editor.step}
                  value={editor.value}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    handlers.onEditCard(`${card.id}:${editor.key}`, card.id, (c) => editor.set(c, v))
                  }}
                  onPointerUp={handlers.onCommit}
                  onBlur={handlers.onCommit}
                />
              </label>
            ))}
            <div className="card-move">
              <button title="Move up — order is the calculation" onClick={() => handlers.onMoveCard(card.id, -1)}>
                ▲
              </button>
              <button title="Move down" onClick={() => handlers.onMoveCard(card.id, 1)}>
                ▼
              </button>
            </div>
            <button className="card-action" onClick={() => handlers.onRemoveCard(card.id)}>
              Return to library
            </button>
          </>
        }
      />
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

function HandColumn({
  hand,
  depth,
  parentEnabled,
  sim,
  scrub,
  draggingBp,
  handlers,
}: {
  hand: HandCard
  depth: number
  parentEnabled: boolean
  sim: Sim
  scrub: number
  draggingBp: Blueprint | null
  handlers: Handlers
}): ReactElement {
  const [open, setOpen] = useState(depth === 0)
  const effective = parentEnabled && hand.enabled !== false
  const { setNodeRef, isOver } = useDroppable({ id: `hand:${hand.id}`, disabled: draggingBp === null })
  const cards = countCards(hand)
  const net = sim.active.contributions.find((s) => s.id === hand.id)

  if (depth > 0 && !open) {
    return (
      <button className={`hand-pile${effective ? '' : ' off'}`} onClick={() => setOpen(true)} title="Open this hand">
        <span className="hand-pile-name">{hand.name ?? hand.id}</span>
        <span className="hand-pile-count num">
          {cards} card{cards === 1 ? '' : 's'}
        </span>
      </button>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`hand-col${effective ? '' : ' off'}${draggingBp && isOver ? ' over' : ''}${depth > 0 ? ' nested' : ''}`}
    >
      <header className="hand-head">
        <label className="hand-toggle" title={hand.enabled !== false ? 'Set this hand aside' : 'Bring this hand into play'}>
          <input type="checkbox" checked={hand.enabled !== false} onChange={(e) => handlers.onToggleHand(hand.id, e.target.checked)} />
        </label>
        <HandName name={hand.name ?? hand.id} onRename={(name) => handlers.onRenameHand(hand.id, name)} />
        <span className="hand-count num">{cards}</span>
        {depth > 0 && (
          <>
            <button className="hand-fold" title="Fold into a pile" onClick={() => setOpen(false)}>
              ⌃
            </button>
            <button className="mod-remove hand-move" title="Move up" onClick={() => handlers.onMoveCard(hand.id, -1)}>
              ▲
            </button>
            <button className="mod-remove hand-move" title="Move down" onClick={() => handlers.onMoveCard(hand.id, 1)}>
              ▼
            </button>
          </>
        )}
        <button className="hand-remove mod-remove" title="Remove hand and its cards" onClick={() => handlers.onRemoveCard(hand.id)}>
          ×
        </button>
      </header>
      <div className="hand-cascade">
        {hand.children.map((child) =>
          child.kind === 'hand' ? (
            <div key={child.id} className="cascade-slot cascade-hand">
              <HandColumn
                hand={child}
                depth={depth + 1}
                parentEnabled={effective}
                sim={sim}
                scrub={scrub}
                draggingBp={draggingBp}
                handlers={handlers}
              />
            </div>
          ) : (
            <div key={child.id} className="cascade-slot">
              <CardView card={child} sim={sim} scrub={scrub} muted={!effective} handlers={handlers} />
            </div>
          ),
        )}
        {hand.children.length === 0 && <p className="hand-empty">empty hand — drop a card here</p>}
      </div>
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
      <p className="zone-label">The table · hands are played top to bottom</p>
      <div className="hands-row">
        {doc.table.root.children.map((child) =>
          child.kind === 'hand' ? (
            <HandColumn
              key={child.id}
              hand={child}
              depth={0}
              parentEnabled
              sim={sim}
              scrub={scrub}
              draggingBp={draggingBp}
              handlers={handlers}
            />
          ) : (
            <div key={child.id} className="hand-col loose">
              <CardView card={child} sim={sim} scrub={scrub} muted={false} handlers={handlers} />
            </div>
          ),
        )}
        <div className="hand-col loose">
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
