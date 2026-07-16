import { useEffect, useState, type ReactElement } from 'react'
import type { SavedHand } from '../savedHands'

interface Props {
  /** The challenger's saved-hand id — the table itself always plays the solid line. */
  sel: string
  savedHands: SavedHand[]
  onChange: (id: string) => void
  /** Turn the comparison off — clicking the card again is the way out. */
  onExit: () => void
}

/**
 * Compare mode's picker: the fixture's card back, turned over into the
 * challenger. The table as it stands is always the chart's solid line, so
 * there is only one thing to choose — the dashed rival. The list of saved
 * hands rises off the wood the moment compare opens; the card wears the
 * chosen hand's name, and clicking it again puts the whole comparison away.
 */
export function ComparePicks({ sel, savedHands, onChange, onExit }: Props): ReactElement {
  // open from the first click — entering compare IS asking "against what?"
  const [menu, setMenu] = useState(true)

  // Escape closes the list before App's cascade would exit compare mode —
  // the capture-phase listener runs ahead of the window's bubble handler.
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMenu(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu])

  const name = savedHands.find((s) => s.id === sel)?.name ?? 'a saved hand'

  return (
    <div className="compare-duel">
      {menu && <div className="compare-veil" onClick={() => setMenu(false)} aria-hidden="true" />}
      <button
        className={`compare-card${menu ? ' choosing' : ''}`}
        onClick={onExit}
        title="Stop comparing — back to the plain chart"
        aria-label={`Stop comparing against ${name}`}
      >
        <span className="compare-card-name">{name}</span>
      </button>
      {menu && (
        <ul className="compare-menu" role="listbox" aria-label="The challenger — the dashed line">
          {savedHands.map((h) => (
            <li key={h.id}>
              <button
                role="option"
                aria-selected={sel === h.id}
                className={sel === h.id ? 'chosen' : undefined}
                onClick={() => {
                  onChange(h.id)
                  setMenu(false)
                }}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
