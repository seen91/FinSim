import { allCards, findCard, type Card as EngineCard } from '@finsim/engine'
import { useRef, useState, type ReactElement } from 'react'
import { AUTHORABLE_KINDS, blankCard, designIdOf, headlineFor, instantiate, mergeLibrary, type AuthoredCard, type AuthorableKind } from '../authored'
import { downloadJson } from '../download'
import { errorMessage } from '../format'
import { Glyph } from '../icons'
import type { Doc } from '../model'
import { deserializePack, serializePack, type Pack } from '../packs'
import { replaceCard } from '../hands'
import { seriesIdsIn } from '../seriesImport'
import { newUid } from '../uid'
import { glyphOf } from '../glyph'
import { Card } from './Card'
import { CardMathEditor, FrontMatterEditor } from './CardEditor'
import { DataBench } from './DataBench'

/**
 * The Workshop (DESIGN.md §3), in two stages so each holds one thought:
 * BROWSE — one shelf where each card appears once: the blank first, then
 * your designs, then any one-off table cards (pile blueprints, presets)
 * that have no design. A design is the one true card — its played copies
 * never show here, and editing the design reaches all of them.
 * FOCUS — click one and everything else clears: the bench holds that card's
 * face and its back (the editor), and the chart above holds only its curve.
 * The back of a blank card is the card creator; packs move designs between
 * tables. Design edits buffer as a draft until the green save commits them —
 * a blank never touches the shelf unsaved.
 */

/** What the Workshop has zoomed into — App mirrors it onto the chart. */
export type WorkshopFocus = { where: 'table' | 'library'; id: string }

interface Props {
  open: boolean
  onClose: () => void
  doc: Doc
  update: (mutate: (doc: Doc) => void) => void
  library: AuthoredCard[]
  onLibraryChange: (next: AuthoredCard[]) => void
  /** Deal a fresh copy of an authored card onto the table. */
  onPlay: (authored: AuthoredCard) => void
  focus: WorkshopFocus | null
  onFocus: (focus: WorkshopFocus | null) => void
  /** Unsaved edits to the focused design — App holds it so the chart can preview it. */
  draft: AuthoredCard | null
  onDraftChange: (draft: AuthoredCard | null) => void
}

export function Workshop({ open, onClose, doc, update, library, onLibraryChange, onPlay, focus, onFocus, draft, onDraftChange }: Props): ReactElement | null {
  const [picking, setPicking] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const importInput = useRef<HTMLInputElement>(null)

  if (!open) return null

  // a blank starts as a draft — it reaches the shelf only when saved
  const handleNew = (kind: AuthorableKind): void => {
    const fresh = blankCard(kind, newUid())
    onDraftChange(fresh)
    setPicking(false)
    onFocus({ where: 'library', id: fresh.id })
  }

  // the design is the one true card: an edit lands on the library original and
  // on every copy of it in play — each copy keeps its id, dial and set-aside
  const patchAuthored = (next: AuthoredCard): void => {
    onLibraryChange(library.map((a) => (a.id === next.id ? next : a)))
    update((d) => {
      for (const played of allCards(d.table.root)) {
        if (designIdOf(played, [next]) !== next.id) continue
        const fresh = instantiate(next, newUid())
        fresh.id = played.id
        if (played.enabled === false) fresh.enabled = false
        const tune = (played as EngineCard & { tune?: unknown }).tune
        if (tune !== undefined) (fresh as EngineCard & { tune?: unknown }).tune = tune
        replaceCard(d, fresh)
      }
    })
  }

  const handleDuplicate = (a: AuthoredCard): void => {
    const uid = newUid()
    const copy = structuredClone(a)
    copy.id = `${a.id}-${uid}`
    copy.card.id = copy.id
    if (copy.card.kind === 'rule') copy.card.rule.id = `${copy.id}-rule`
    copy.card.name = `${a.card.name ?? 'Card'} copy`
    onLibraryChange([...library, copy])
    onFocus({ where: 'library', id: copy.id })
  }

  const handleExport = (): void => {
    const name = window.prompt('Pack name', 'My cards')
    if (!name) return
    // a design priced by a series is broken without it — the pack carries what its cards wear
    const worn = new Set(library.flatMap((a) => seriesIdsIn(a.card)))
    const series = Object.fromEntries(Object.entries(doc.world?.series ?? {}).filter(([id]) => worn.has(id)))
    const pack: Pack = { name, cards: library, ...(Object.keys(series).length > 0 ? { series } : {}) }
    downloadJson(`finsim-pack-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, serializePack(pack))
  }

  const handleImportFile = (file: File): void => {
    void file.text().then((text) => {
      try {
        const pack = deserializePack(text)
        onLibraryChange(mergeLibrary(library, pack.cards))
        if (pack.series && Object.keys(pack.series).length > 0) {
          const series = pack.series
          update((d) => {
            d.world = { ...d.world, series: { ...d.world?.series, ...series } }
          })
        }
      } catch (err) {
        alert(`Could not import pack: ${errorMessage(err)}`)
      }
    })
  }

  // ---- FOCUS: one card on the bench, face and back side by side ----
  // Design edits buffer as a draft; save is the explicit act that lands them
  // on the shelf and in every copy in play. A brand-new blank exists only as
  // its draft until first saved.
  const focusedTable = focus?.where === 'table' ? findCard(doc.table.root, focus.id) : null
  const savedAuthored = focus?.where === 'library' ? (library.find((a) => a.id === focus.id) ?? null) : null
  const activeDraft = focus && draft && draft.id === focus.id ? draft : null
  const focusedAuthored = activeDraft ?? savedAuthored
  const isNew = focusedAuthored !== null && savedAuthored === null
  const dirty = activeDraft !== null

  const handleSave = (): void => {
    if (!activeDraft) return
    if (savedAuthored) patchAuthored(activeDraft)
    else onLibraryChange([...library, activeDraft])
    onDraftChange(null)
  }

  const confirmLeave = (): boolean => !dirty || window.confirm(isNew ? 'This card is not saved yet — discard it?' : 'Discard unsaved changes to this design?')

  if (focusedTable || focusedAuthored) {
    const card = focusedTable ?? focusedAuthored!.card
    const face = {
      kind: card.kind,
      name: card.name ?? card.id,
      glyph: focusedAuthored ? focusedAuthored.glyph : glyphOf(card),
      headline: headlineFor(card),
      ...(focusedAuthored?.description ? { description: focusedAuthored.description } : {}),
    }
    return (
      <section className="workbench workbench-focus" role="dialog" aria-label="The Workshop">
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
            {focusedTable
              ? 'a one-off on the table — edits land immediately; the chart holds only this card'
              : isNew
                ? 'a fresh card — save it to put it on your shelf; the chart plays it alone on an empty table'
                : 'a design — save your edits to reach the shelf and every copy in play; the chart plays it alone on an empty table'}
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
          {focusedAuthored && (
            <div className="work-tools">
              <button
                className="sign work-save"
                disabled={!dirty}
                aria-label={dirty ? 'Save' : 'Saved'}
                title={dirty ? (isNew ? 'Save this card to your shelf' : 'Save — the shelf and every copy in play take the edits') : 'All changes saved to your shelf'}
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
                  onPlay(focusedAuthored)
                  onFocus(null)
                  onClose()
                }}
              >
                <Glyph name="hand" size={15} />
              </button>
              {savedAuthored && (
                <button className="sign" onClick={() => handleDuplicate(savedAuthored)} disabled={dirty} title={dirty ? 'Save your edits first' : 'Copy this design'}>
                  copy
                </button>
              )}
              <button
                className="sign work-burn"
                title={isNew ? 'Burn this draft' : 'Burn this design — cards already on the table stay'}
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
              focusedTable ? (
                <CardMathEditor card={focusedTable} from={doc.from} onChange={(next: EngineCard) => update((d) => replaceCard(d, next))} />
              ) : (
                <>
                  <CardMathEditor card={focusedAuthored!.card} from={doc.from} onChange={(next: EngineCard) => onDraftChange({ ...focusedAuthored!, card: next })} />
                  <FrontMatterEditor authored={focusedAuthored!} onChange={onDraftChange} />
                </>
              )
            }
          />
        </div>
      </section>
    )
  }

  // ---- BROWSE: one shelf, each card once — designs, then one-off table cards ----
  const shelf = [
    ...library.map((a) => ({
      key: `library-${a.id}`,
      face: { kind: a.card.kind, name: a.card.name ?? a.id, glyph: a.glyph, headline: headlineFor(a.card) },
      pick: () => onFocus({ where: 'library', id: a.id }),
    })),
    ...allCards(doc.table.root)
      .filter((card) => designIdOf(card, library) === null) // copies follow their design; the design speaks for them
      .map((card) => ({
        key: `table-${card.id}`,
        face: { kind: card.kind, name: card.name ?? card.id, glyph: glyphOf(card), headline: headlineFor(card) },
        pick: () => onFocus({ where: 'table', id: card.id }),
      })),
  ]

  return (
    <section className="workbench" role="dialog" aria-label="The Workshop">
      <header className="workbench-bar">
        <h2>The Workshop</h2>
        <p className="drawer-hint">pick a card up to work on it — saving a design's edits reaches every copy in play · packs carry your designs between tables</p>
        <button className={dataOpen ? 'sign data-open' : 'sign'} onClick={() => setDataOpen(!dataOpen)} title="Import historical data and manage the table's series">
          {dataOpen ? '← cards' : 'Data'}
        </button>
        <button className="sign" onClick={handleExport} disabled={library.length === 0} title="Bundle your designs into a pack file to share">
          Export pack
        </button>
        <button className="sign" onClick={() => importInput.current?.click()} title="Merge a pack file into your designs">
          Import pack
        </button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportFile(file)
            e.target.value = ''
          }}
        />
        <button className="drawer-close" onClick={onClose} aria-label="Close the Workshop">
          ×
        </button>
      </header>

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
