import { valueAt } from '@finsim/engine'
import { useCallback, useRef, useState, type ReactElement } from 'react'
import { AUTHORABLE_KINDS, blankCard, headlineFor, redesign, type AuthoredCard, type AuthorableKind } from '../authored'
import { builtinOf } from '../builtins'
import { formatAmount, formatPerMonth } from '../format'
import { Glyph } from '../icons'
import { refBase, refsIn, repointInstances } from '../instances'
import type { Doc, Sim } from '../model'
import type { SavedHand } from '../savedHands'
import { newUid } from '../uid'
import { Card } from './Card'
import { CardMathEditor, FrontMatterEditor } from './CardEditor'
import { frontStats } from './CardView'
import { DataBench } from './DataBench'

/**
 * The Workshop (DESIGN.md §3), in two stages so each holds one thought:
 * BROWSE — one shelf where each canonical card appears once: the blank
 * first, then your designs, then the built-ins currently in play. Every card
 * on the table is an instance of a canonical card, so the shelf never shows
 * copies — the canonical speaks for all of them.
 * FOCUS — click one and everything else clears: the bench holds that card's
 * face and its back (the editor), and the chart above holds only its curve.
 * A design edits in place — every table instance follows by construction. A
 * built-in edits just as freely, but saving MINTS: a design cut from your
 * edits lands on the shelf and every table instance of the built-in
 * re-points at it — the default becomes YOUR salary in one gesture, and the
 * pristine template stays in the pile. "copy" mints from the template
 * without re-pointing, for a variant beside the default. The back of a blank
 * card is the card creator. Edits buffer as a draft until the green save
 * commits them — a blank never touches the shelf unsaved.
 */

/** What the Workshop has zoomed into — App mirrors it onto the chart. */
export type WorkshopFocus = { where: 'library' | 'builtin'; id: string }

interface Props {
  open: boolean
  onClose: () => void
  doc: Doc
  update: (mutate: (doc: Doc) => void) => void
  library: AuthoredCard[]
  /** Hands snapshotted to the draw pile — their instances keep a design worn (no burn). */
  savedHands: SavedHand[]
  onLibraryChange: (next: AuthoredCard[]) => void
  /** Deal a fresh instance of a canonical card onto the table. */
  onPlay: (ref: string) => void
  focus: WorkshopFocus | null
  onFocus: (focus: WorkshopFocus | null) => void
  /** Unsaved edits to the focused design — App holds it so the chart can preview it. */
  draft: AuthoredCard | null
  onDraftChange: (draft: AuthoredCard | null) => void
  /** The focused card played alone — the bench face reads its value at the scrub month, like table cards do. */
  focusSim: Sim | null
  scrub: number
}

export function Workshop({ open, onClose, doc, update, library, savedHands, onLibraryChange, onPlay, focus, onFocus, draft, onDraftChange, focusSim, scrub }: Props): ReactElement | null {
  const [picking, setPicking] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)

  // the bench overlays the lower table — publish its measured height so the
  // arena (and the chart in it) can duck above instead of drawing behind it
  const benchObserver = useRef<ResizeObserver | null>(null)
  const benchRef = useCallback((el: HTMLElement | null): void => {
    benchObserver.current?.disconnect()
    if (!el) {
      document.querySelector<HTMLElement>('.app')?.style.removeProperty('--workbench-h')
      return
    }
    benchObserver.current ??= new ResizeObserver(([entry]) => {
      if (!entry) return
      const app = document.querySelector<HTMLElement>('.app')
      app?.style.setProperty('--workbench-h', `${entry.target.getBoundingClientRect().height}px`)
    })
    benchObserver.current.observe(el)
  }, [])

  if (!open) return null

  // "in play" counts the table AND the saved hands on the pile — a design a
  // snapshot still references must stay resolvable (delete only when unworn)
  const refsInPlay = [...new Set([...refsIn(doc.table.root), ...savedHands.flatMap((s) => refsIn(s.hand))])]

  // a blank starts as a draft — it reaches the shelf only when saved
  const handleNew = (kind: AuthorableKind): void => {
    const fresh = blankCard(kind, newUid())
    onDraftChange(fresh)
    setPicking(false)
    onFocus({ where: 'library', id: fresh.id })
  }

  const handleDuplicate = (a: AuthoredCard): void => {
    const copy = redesign(a, `${a.id}-${newUid()}`)
    copy.card.name = `${a.card.name ?? 'Card'} copy`
    onLibraryChange([...library, copy])
    onFocus({ where: 'library', id: copy.id })
  }

  // a built-in's "copy": a design cut from the pristine template, NOT
  // re-pointed — the default keeps playing, the copy is a variant beside it
  const handleCopyBuiltin = (builtin: AuthoredCard): void => {
    const copy = redesign(builtin, `${refBase(builtin.id)}-${newUid()}`)
    copy.card.name = `${builtin.card.name ?? 'Card'} copy`
    onLibraryChange([...library, copy])
    onFocus({ where: 'library', id: copy.id })
  }

  // ---- FOCUS: one canonical card on the bench, face and back side by side ----
  // Edits buffer as a draft; save is the explicit act that lands them on the
  // shelf. For a design every instance in play follows by construction; for a
  // built-in the save MINTS — a design cut from the edits, every table
  // instance of the built-in re-pointed at it. A brand-new blank exists only
  // as its draft until first saved.
  const focusedBuiltin = focus?.where === 'builtin' ? builtinOf(focus.id) : null
  const savedAuthored = focus?.where === 'library' ? (library.find((a) => a.id === focus.id) ?? null) : null
  const activeDraft = focus && draft && draft.id === focus.id ? draft : null
  const focusedAuthored = activeDraft ?? focusedBuiltin ?? savedAuthored
  const isNew = focusedBuiltin === null && focusedAuthored !== null && savedAuthored === null
  const dirty = activeDraft !== null

  // the built-in mint: a design cut from the edited draft, every table
  // instance re-pointed — "change once, all copies change" holds by
  // construction, and from here on it is an ordinary design
  const mintFromDraft = (): string | null => {
    if (!activeDraft || !focusedBuiltin) return null
    const design = redesign(activeDraft, `${refBase(focusedBuiltin.id)}-${newUid()}`)
    onLibraryChange([...library, design])
    update((d) => repointInstances(d.table.root, focusedBuiltin.id, design.id))
    onDraftChange(null)
    return design.id
  }

  const handleSave = (): void => {
    if (!activeDraft) return
    if (focusedBuiltin) {
      const id = mintFromDraft()
      if (id !== null) onFocus({ where: 'library', id })
      return
    }
    if (savedAuthored) onLibraryChange(library.map((a) => (a.id === activeDraft.id ? activeDraft : a)))
    else onLibraryChange([...library, activeDraft])
    onDraftChange(null)
  }

  const confirmLeave = (): boolean => !dirty || window.confirm(isNew ? 'This card is not saved yet — discard it?' : 'Discard unsaved changes to this card?')

  if (focusedAuthored) {
    const canonical = focusedAuthored
    const card = canonical.card
    const inPlay = refsInPlay.includes(canonical.id)
    // the bench face reads like a table card: scrub the chart above and the
    // headline follows — this month's flow, or an asset/debt's balance
    const isBalance = card.kind === 'asset' || card.kind === 'debt' || card.kind === 'margin'
    const liveSeries = focusSim && card.kind !== 'rule' ? (isBalance ? focusSim.active.balances : focusSim.active.contributions).find((s) => s.id === card.id) : undefined
    const live = liveSeries ? valueAt(liveSeries, scrub) : null
    const face = {
      kind: card.kind,
      name: card.name ?? canonical.id,
      glyph: canonical.glyph,
      headline: live !== null ? (isBalance ? formatAmount(live) : formatPerMonth(live)) : headlineFor(card),
      ...(live !== null ? { headlineClass: live > 0 ? ('pos' as const) : live < 0 ? ('neg' as const) : ('' as const) } : {}),
      stats: frontStats(card),
      ...(canonical.description ? { description: canonical.description } : {}),
    }
    return (
      <section className="workbench workbench-focus" role="dialog" aria-label="The Workshop" ref={benchRef}>
        <header className="workbench-bar">
          <button
            className="sign work-back"
            onClick={() => {
              if (!confirmLeave()) return
              onDraftChange(null)
              onFocus(null)
            }}
          >
            ← all cards
          </button>
          <p className="drawer-hint">
            {focusedBuiltin
              ? 'a built-in card — edit it freely: saving mints your design and every copy in play follows; “copy” keeps the default and gives you a variant'
              : isNew
                ? 'a fresh card — save it to put it on your shelf; the chart plays it alone on an empty table'
                : 'a design — save your edits and every copy in play follows; the chart plays it alone on an empty table'}
          </p>
          <button
            className="drawer-close"
            onClick={() => {
              if (!confirmLeave()) return
              onDraftChange(null)
              onClose()
            }}
            aria-label="Close the Workshop"
          >
            ×
          </button>
        </header>
        <div className="work-focus">
          {/* the tools ride right above the bench — the mouse never leaves the cards */}
          {focusedBuiltin ? (
            <div className="work-tools">
              <button
                className="sign work-save"
                disabled={!dirty}
                aria-label={dirty ? 'Save' : 'Saved'}
                title={dirty ? 'Save: mint your design from these edits — every copy in play re-points at it and follows' : 'Unedited — the built-in plays as shipped'}
                onClick={handleSave}
              >
                <Glyph name={dirty ? 'save' : 'check'} size={15} />
              </button>
              <button
                className="sign"
                aria-label="Add to hand"
                title={dirty ? 'Save your edits, then deal a copy into the hand on the table' : 'Deal a copy into the hand on the table'}
                onClick={() => {
                  if (dirty) {
                    const id = mintFromDraft()
                    onPlay(id ?? focusedBuiltin.id)
                    onFocus(null)
                    onClose()
                  } else onPlay(focusedBuiltin.id)
                }}
              >
                <Glyph name="hand" size={15} />
              </button>
              <button
                className="sign"
                disabled={dirty}
                title={dirty ? 'Save your edits first' : 'Copy to your shelf as a new design — the default keeps playing untouched'}
                onClick={() => handleCopyBuiltin(focusedBuiltin)}
              >
                copy
              </button>
            </div>
          ) : (
            <div className="work-tools">
              <button
                className="sign work-save"
                disabled={!dirty}
                aria-label={dirty ? 'Save' : 'Saved'}
                title={dirty ? (isNew ? 'Save this card to your shelf' : 'Save — every copy in play follows') : 'All changes saved to your shelf'}
                onClick={handleSave}
              >
                <Glyph name={dirty ? 'save' : 'check'} size={15} />
              </button>
              <button
                className="sign"
                aria-label="Add to hand"
                title="Save, then deal a copy into the hand on the table"
                onClick={() => {
                  handleSave()
                  onPlay(focusedAuthored.id)
                  onFocus(null)
                  onClose()
                }}
              >
                <Glyph name="hand" size={15} />
              </button>
              {savedAuthored && (
                <button className="sign" onClick={() => handleDuplicate(savedAuthored)} disabled={dirty} title={dirty ? 'Save your edits first' : 'Copy this design — two different Rents are two designs'}>
                  copy
                </button>
              )}
              <button
                className="sign work-burn"
                disabled={!isNew && inPlay}
                title={
                  isNew
                    ? 'Burn this draft'
                    : inPlay
                      ? 'Copies of this design are in play or in a saved hand — discard them first'
                      : 'Burn this design'
                }
                onClick={() => {
                  onLibraryChange(library.filter((c) => c.id !== focusedAuthored.id))
                  onDraftChange(null)
                  onFocus(null)
                }}
              >
                <Glyph name="flame" size={15} />
              </button>
            </div>
          )}
          <Card size="work" face={face} />
          <Card
            size="work"
            face={face}
            flipped
            back={
              // one live editor for both species — a built-in's edits buffer
              // as a draft (id = its ref) until the save mints them
              <>
                <CardMathEditor card={card} from={doc.from} onChange={(next) => onDraftChange({ ...focusedAuthored, card: next })} />
                <FrontMatterEditor authored={focusedAuthored} onChange={onDraftChange} />
              </>
            }
          />
        </div>
      </section>
    )
  }

  // ---- BROWSE: one shelf, each canonical card once — designs, then built-ins in play ----
  const shelf = [
    ...library.map((a) => ({
      key: `library-${a.id}`,
      face: { kind: a.card.kind, name: a.card.name ?? a.id, glyph: a.glyph, headline: headlineFor(a.card) },
      pick: () => onFocus({ where: 'library', id: a.id }),
    })),
    ...refsInPlay
      .filter((ref) => !library.some((a) => a.id === ref))
      .flatMap((ref) => {
        const builtin = builtinOf(ref)
        if (!builtin) return []
        return [
          {
            key: `builtin-${ref}`,
            face: { kind: builtin.card.kind, name: builtin.card.name ?? ref, glyph: builtin.glyph, headline: headlineFor(builtin.card) },
            pick: () => onFocus({ where: 'builtin', id: ref }),
          },
        ]
      }),
  ]

  return (
    <section className="workbench" role="dialog" aria-label="The Workshop" ref={benchRef}>
      <header className="workbench-bar">
        <h2>The Workshop</h2>
        <p className="drawer-hint">
          pick a card up to work on it — every copy in play follows its design by construction
        </p>
        <button className="drawer-close" onClick={onClose} aria-label="Close the Workshop">
          ×
        </button>
      </header>

      {/* the tools ride centered above the shelf — the mouse stays with the cards */}
      <div className="work-tools">
        <button className={dataOpen ? 'sign data-open' : 'sign'} onClick={() => setDataOpen(!dataOpen)} title="Import historical data and manage the table's series">
          {dataOpen ? '← cards' : 'Data'}
        </button>
      </div>

      {dataOpen ? (
        <DataBench
          doc={doc}
          update={update}
          library={library}
          onLibraryChange={onLibraryChange}
          onFocus={(f) => {
            setDataOpen(false)
            onFocus(f)
          }}
        />
      ) : (
        <div className="work-grid">
          {picking ? (
            <div className="kind-pick">
              <p>a blank…</p>
              {AUTHORABLE_KINDS.map((kind) => (
                <button key={kind} className={`kind-pick-btn kind-${kind}`} onClick={() => handleNew(kind)}>
                  {kind}
                </button>
              ))}
              <button className="kind-pick-cancel" onClick={() => setPicking(false)}>
                never mind
              </button>
            </div>
          ) : (
            <button className="blank-card" onClick={() => setPicking(true)} title="Author a new card from a blank">
              <span className="blank-plus">＋</span>
              <span>Blank card</span>
            </button>
          )}
          {shelf.map((item) => (
            <button key={item.key} className="drawer-slot work-item" onClick={item.pick} title="Pick up — only this card on the bench and the chart">
              <Card size="hand" face={item.face} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
