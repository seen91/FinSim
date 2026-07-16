import { useEffect, useState, type ReactElement } from 'react'
import { COMPARE_TABLE } from '../compare'
import type { SavedHand } from '../savedHands'

interface Props {
  sel: { a: string; b: string }
  savedHands: SavedHand[]
  onChange: (sel: { a: string; b: string }) => void
}

/**
 * Compare mode's picker: the fixture's two card backs, turned over into the
 * two contenders. Each back wears its curve's stroke — solid for the chart's
 * solid line, dashed gold for the dashed — with the chosen plan's name
 * engraved beneath it. Click a card and a small list rises off the wood:
 * the table as it stands, and every hand saved to the pile.
 */
export function ComparePicks({ sel, savedHands, onChange }: Props): ReactElement {
  const [menu, setMenu] = useState<'a' | 'b' | null>(null)

  // Escape closes the list before App's cascade would exit compare mode —
  // the capture-phase listener runs ahead of the window's bubble handler.
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMenu(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu])

  const nameOf = (id: string): string => (id === COMPARE_TABLE ? 'The table now' : (savedHands.find((s) => s.id === id)?.name ?? 'a saved hand'))

  const pickCard = (side: 'a' | 'b'): ReactElement => (
    <button
      className={`compare-card ${side}${menu === side ? ' choosing' : ''}`}
      onClick={() => setMenu((m) => (m === side ? null : side))}
      title={side === 'a' ? 'The solid line — click to choose its plan' : 'The dashed line — click to choose its plan'}
      aria-haspopup="listbox"
      aria-expanded={menu === side}
      aria-label={`${side === 'a' ? 'Contender A, the solid line' : 'Contender B, the dashed line'}: ${nameOf(sel[side])}`}
    >
      <svg viewBox="0 0 40 30" aria-hidden="true">
        <path d="M4 26 C 16 24, 27 16, 36 4" {...(side === 'b' ? { strokeDasharray: '5 3' } : {})} />
      </svg>
      <span className="compare-card-name">{nameOf(sel[side])}</span>
    </button>
  )

  return (
    <div className="compare-duel">
      {menu && <div className="compare-veil" onClick={() => setMenu(null)} aria-hidden="true" />}
      {pickCard('a')}
      {pickCard('b')}
      {menu && (
        <ul className={`compare-menu from-${menu}`} role="listbox" aria-label={menu === 'a' ? 'Contender A — the solid line' : 'Contender B — the dashed line'}>
          {[{ id: COMPARE_TABLE, name: 'The table now' }, ...savedHands].map((h) => (
            <li key={h.id}>
              <button
                role="option"
                aria-selected={sel[menu] === h.id}
                className={sel[menu] === h.id ? 'chosen' : undefined}
                onClick={() => {
                  onChange({ ...sel, [menu]: h.id })
                  setMenu(null)
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
