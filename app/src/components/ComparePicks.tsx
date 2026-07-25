import { useEffect, useState, type ReactElement } from 'react'
import type { AuthoredCard } from '../authored'
import { pileRef } from '../builtins'
import { contenderLabel, resolveContender, selKey, type CompareSel } from '../compare'
import { LIBRARY } from '../library'
import { PRESETS } from '../presets'
import type { SavedHand } from '../savedHands'

interface Props {
  /** The challenger's pick — the table itself always plays the solid line. */
  sel: CompareSel
  savedHands: SavedHand[]
  /** The Workshop's designs — challengers like anything else. */
  library: AuthoredCard[]
  onChange: (sel: CompareSel) => void
  /** Turn the comparison off — clicking the card again is the way out. */
  onExit: () => void
}

/**
 * The compare fixture: one card back beside the draw pile — anything that can
 * be a plan may challenge the table, so it is always there. While a
 * comparison plays, the card turns over into the challenger (ComparePicks).
 */
export function CompareFixture({
  sel,
  savedHands,
  library,
  onEnter,
  onChange,
  onExit,
}: Omit<Props, 'sel'> & {
  sel: CompareSel | null
  /** Open compare mode with the fixture's default pick — the freshest saved hand, or the first preset. */
  onEnter: (sel: CompareSel) => void
}): ReactElement {
  if (!sel) {
    return (
      <button
        className="duel"
        onClick={() => {
          const lastSaved = savedHands[savedHands.length - 1]
          onEnter(lastSaved ? { kind: 'saved', id: lastSaved.id } : { kind: 'preset', id: PRESETS[0]!.id })
        }}
        title="Compare — the table against a saved hand, a preset, or a single card, on one chart"
        aria-label="Compare the table against another plan"
      >
        <span className="duel-card" aria-hidden="true">
          <span className="duel-word">Compare</span>
        </span>
      </button>
    )
  }
  // comparing: the fixture's spot holds the challenger, turned over — the
  // table is always the solid line, so this one card is the whole choosing,
  // and clicking it again turns the comparison off
  return <ComparePicks sel={sel} savedHands={savedHands} library={library} onChange={onChange} onExit={onExit} />
}

/**
 * Compare mode's picker: the fixture's card back, turned over into the
 * challenger. The table as it stands is always the chart's solid line, so
 * there is only one thing to choose — the dashed rival, and anything that can
 * be a plan qualifies: a saved hand, a preset hand, one of your designs, or a
 * single pile card played as a one-card plan. The list rises off the wood the
 * moment compare opens; the card wears the chosen challenger's name, and
 * clicking it again puts the whole comparison away.
 */
function ComparePicks({ sel, savedHands, library, onChange, onExit }: Props): ReactElement {
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

  const contender = resolveContender(sel, savedHands, library)
  const name = contender ? contenderLabel(contender, library) : 'a challenger'

  const sections: { title: string; items: { sel: CompareSel; label: string }[] }[] = [
    { title: 'Saved hands', items: savedHands.map((h) => ({ sel: { kind: 'saved' as const, id: h.id }, label: h.name })) },
    { title: 'Preset hands', items: PRESETS.map((p) => ({ sel: { kind: 'preset' as const, id: p.id }, label: p.name })) },
    { title: 'Your designs', items: library.map((a) => ({ sel: { kind: 'card' as const, ref: a.id }, label: a.card.name ?? a.id })) },
    { title: 'Single cards', items: LIBRARY.map((bp) => ({ sel: { kind: 'card' as const, ref: pileRef(bp.id) }, label: bp.name })) },
  ].filter((s) => s.items.length > 0)

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
          {sections.map((section) => (
            <li key={section.title} role="presentation">
              <span className="compare-menu-section">{section.title}</span>
              <ul role="presentation">
                {section.items.map((item) => (
                  <li key={selKey(item.sel)}>
                    <button
                      role="option"
                      aria-selected={selKey(sel) === selKey(item.sel)}
                      className={selKey(sel) === selKey(item.sel) ? 'chosen' : undefined}
                      onClick={() => {
                        onChange(item.sel)
                        setMenu(false)
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
