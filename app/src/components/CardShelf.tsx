import type { ReactElement } from 'react'
import { Glyph } from '../icons'

/**
 * The hover-revealed shelf above a card or hand stack: set aside / bring
 * back, and discard. One shelf serves both — only the noun in the titles
 * changes.
 */
export function CardShelf({
  noun,
  setAside,
  onToggle,
  onRemove,
}: {
  noun: 'card' | 'hand'
  setAside: boolean
  onToggle: () => void
  onRemove: () => void
}): ReactElement {
  return (
    <div className="card-shelf">
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
