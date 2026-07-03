import { useDraggable } from '@dnd-kit/core'
import { useState, type ReactElement } from 'react'
import { Glyph } from '../icons'
import { LIBRARY, type Blueprint } from '../library'
import { PRESETS, type HandPreset, type PresetCard } from '../presets'
import { Card } from './Card'

/**
 * The draw pile: a face-down deck in the corner of the table. Open it and
 * the library spreads out — whole hands first (import them as one, or open
 * a hand and take single cards), then the loose cards. Cards can also be
 * dragged straight onto the table.
 */
interface Props {
  open: boolean
  /** Kept mounted but invisible while a card is being dragged out of it. */
  hidden: boolean
  onOpen: () => void
  onClose: () => void
  onChoose: (bp: Blueprint) => void
  onImportHand: (preset: HandPreset) => void
  onImportCard: (card: PresetCard) => void
}

function DrawerCard({ bp, onChoose }: { bp: Blueprint; onChoose: (bp: Blueprint) => void }): ReactElement {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `bp:${bp.id}`, data: { bp } })
  return (
    <div
      ref={setNodeRef}
      className={`drawer-slot${isDragging ? ' lifting' : ''}`}
      onClick={() => onChoose(bp)}
      {...listeners}
      {...attributes}
    >
      <Card
        size="hand"
        face={{
          kind: bp.kind,
          name: bp.name,
          glyph: bp.glyph,
          headline: bp.headline,
          headlineClass: bp.headline.startsWith('−') ? 'neg' : bp.kind === 'source' ? 'pos' : '',
          description: bp.description,
        }}
      />
    </div>
  )
}

function PresetTile({
  preset,
  onImportHand,
  onImportCard,
}: {
  preset: HandPreset
  onImportHand: (preset: HandPreset) => void
  onImportCard: (card: PresetCard) => void
}): ReactElement {
  const [openList, setOpenList] = useState(false)
  return (
    <div className="preset">
      <button className="preset-tile" onClick={() => onImportHand(preset)} title="Import the whole hand">
        <span className="preset-glyph">
          <Glyph name={preset.glyph} size={30} />
        </span>
        <span className="preset-name">{preset.name}</span>
        <span className="preset-count num">
          {preset.cards.length} card{preset.cards.length === 1 ? '' : 's'} · import all
        </span>
      </button>
      <button className="preset-open" onClick={() => setOpenList((o) => !o)}>
        {openList ? 'hide cards' : 'take single cards…'}
      </button>
      {openList && (
        <ul className="preset-cards">
          {preset.cards.map((card) => (
            <li key={card.key}>
              <button onClick={() => onImportCard(card)} title="Import just this card">
                <Glyph name={card.glyph} size={16} />
                <span className="preset-card-name">{card.name}</span>
                <span className="preset-card-headline num">{card.headline}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DrawPile({ open, hidden, onOpen, onClose, onChoose, onImportHand, onImportCard }: Props): ReactElement {
  return (
    <>
      <button className="pile" onClick={onOpen} title="Open the library" aria-label="Open the library">
        <span className="pile-card" />
        <span className="pile-card" />
        <span className="pile-card pile-top">
          <em>f(t)</em>
        </span>
        <span className="pile-label">Library</span>
      </button>

      {open && (
        <div className={`drawer${hidden ? ' drawer-hidden' : ''}`} onClick={onClose} role="dialog" aria-label="Library">
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-head">
              <h2>Library</h2>
              <p>Import a whole hand, take single cards from one, or play loose cards — click, or drag onto a hand. Order matters: a hand plays top to bottom.</p>
              <button className="drawer-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </header>
            <h3 className="drawer-section">Hands</h3>
            <div className="preset-row">
              {PRESETS.map((preset) => (
                <PresetTile key={preset.id} preset={preset} onImportHand={onImportHand} onImportCard={onImportCard} />
              ))}
            </div>
            <h3 className="drawer-section">Cards</h3>
            <div className="drawer-grid">
              {LIBRARY.map((bp) => (
                <DrawerCard key={bp.id} bp={bp} onChoose={onChoose} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
