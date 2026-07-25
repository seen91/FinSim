import type { ReactElement } from 'react'
import { Glyph } from '../icons'

/**
 * The hover-revealed shelf above a card or hand stack: duplicate, set aside /
 * bring back, and discard. One shelf serves both — only the noun in the
 * titles changes. Cards also get a hammer that carries them to the Workshop.
 */
export function CardShelf({
  noun,
  setAside,
  onToggle,
  onRemove,
  onDuplicate,
  onWorkshop,
}: {
  noun: 'card' | 'hand'
  setAside: boolean
  onToggle: () => void
  onRemove: () => void
  onDuplicate?: () => void
  onWorkshop?: () => void
}): ReactElement {
  return (
    <div className="card-shelf">
      {onWorkshop && (
        <button className="mod-workshop" title="To the Workshop — pick this card up on the bench to edit it" aria-label="To the Workshop" onClick={onWorkshop}>
          <Glyph name="hammer" size={15} />
        </button>
      )}
      {onDuplicate && (
        <button
          className="mod-duplicate"
          title={noun === 'hand' ? 'Duplicate — a fresh copy of the whole hand, right beside it' : 'Duplicate — a fresh copy of this card, right beside it'}
          aria-label="Duplicate"
          onClick={onDuplicate}
        >
          <Glyph name="copy" size={15} />
        </button>
      )}
      <button
        className="mod-toggle"
        title={setAside ? `Bring ${noun === 'hand' ? 'this hand ' : ''}back into play` : `Set aside — the table plays as if this ${noun} were not there`}
        aria-label={setAside ? 'Bring back into play' : 'Set aside'}
        onClick={onToggle}
      >
        <Glyph name={setAside ? 'play' : 'pause'} size={15} />
      </button>
      <button className="mod-remove" title={noun === 'hand' ? 'Discard the whole hand to the draw pile' : 'Discard to the draw pile'} aria-label="Discard" onClick={onRemove}>
        <Glyph name="flame" size={15} />
      </button>
    </div>
  )
}
