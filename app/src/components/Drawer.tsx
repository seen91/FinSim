import type { ReactElement, ReactNode } from 'react'
import { Glyph, type GlyphName } from '../icons'

/**
 * The overlay idiom every drawer shares — the draw pile, the Rulebook, the
 * futures reports: a click outside closes, the panel swallows its clicks,
 * one header bar with the title, the hint and the ×. Escape handling stays
 * centralized in App, so the shell needs none of its own.
 */
export function Drawer({
  label,
  panelClass,
  glyph,
  title,
  hint,
  closeLabel = 'Close',
  bar,
  onClose,
  children,
}: {
  /** The dialog's aria-label. */
  label: string
  /** Extra classes on the panel ("rulebook", "rulebook report"). */
  panelClass?: string
  /** Glyph before the title; the draw pile wears none. */
  glyph?: GlyphName
  title: ReactNode
  hint: ReactNode
  closeLabel?: string
  /** Extra header content after the × (the pile's "✓ dealt" note). */
  bar?: ReactNode
  onClose: () => void
  children: ReactNode
}): ReactElement {
  return (
    <div className="drawer" role="dialog" aria-label={label} onClick={onClose}>
      <div className={`drawer-panel${panelClass ? ` ${panelClass}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-bar">
          {glyph && <Glyph name={glyph} size={22} />}
          <h2>{title}</h2>
          <p className="drawer-hint">{hint}</p>
          <button className="drawer-close" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
          {bar}
        </header>
        {children}
      </div>
    </div>
  )
}
