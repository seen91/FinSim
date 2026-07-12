import { allCards, findCard, type Card as EngineCard } from '@finsim/engine'
import { useRef, useState, type ReactElement } from 'react'
import { AUTHORABLE_KINDS, blankCard, headlineFor, mergeLibrary, type AuthoredCard, type AuthorableKind } from '../authored'
import { Glyph } from '../icons'
import type { Doc } from '../model'
import { deserializePack, serializePack, type Pack } from '../packs'
import { replaceCard } from '../hands'
import { seriesIdsIn } from '../seriesImport'
import { Card } from './Card'
import { CardMathEditor, FrontMatterEditor } from './CardEditor'
import { glyphFor } from './CardView'
import { DataBench } from './DataBench'

/**
 * The Workshop (DESIGN.md §3), in two stages so each holds one thought:
 * BROWSE — one shelf of small cards, the blank first, then everything you
 * could work on; cards currently in play wear a small 'in play' plaque.
 * FOCUS — click one and everything else clears: the bench holds that card's
 * face and its back (the editor), and the chart above holds only its curve.
 * The back of a blank card is the card creator; packs move designs between
 * tables.
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
}

export function Workshop({ open, onClose, doc, update, library, onLibraryChange, onPlay, focus, onFocus }: Props): ReactElement | null {
  const [picking, setPicking] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const importInput = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleNew = (kind: AuthorableKind): void => {
    const fresh = blankCard(kind, crypto.randomUUID().slice(0, 8))
    onLibraryChange([...library, fresh])
    setPicking(false)
    onFocus({ where: 'library', id: fresh.id })
  }

  const patchAuthored = (next: AuthoredCard): void => onLibraryChange(library.map((a) => (a.id === next.id ? next : a)))

  const handleDuplicate = (a: AuthoredCard): void => {
    const uid = crypto.randomUUID().slice(0, 8)
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
    const blob = new Blob([serializePack(pack)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finsim-pack-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
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
        alert(`Could not import pack: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  // ---- FOCUS: one card on the bench, face and back side by side ----
  const focusedTable = focus?.where === 'table' ? findCard(doc.table.root, focus.id) : null
  const focusedAuthored = focus?.where === 'library' ? (library.find((a) => a.id === focus.id) ?? null) : null

  if (focusedTable || focusedAuthored) {
    const card = focusedTable ?? focusedAuthored!.card
    const face = {
      kind: card.kind,
      name: card.name ?? card.id,
      glyph: focusedAuthored ? focusedAuthored.glyph : glyphFor(card),
      headline: headlineFor(card),
      ...(focusedAuthored?.description ? { description: focusedAuthored.description } : {}),
    }
    return (
      <section className="workbench workbench-focus" role="dialog" aria-label="The Workshop">
        <header className="workbench-bar">
          <button className="work-back" onClick={() => onFocus(null)}>
            ← all cards
          </button>
          <p className="drawer-hint">
            {focusedTable ? 'in play — edits land immediately; the chart holds only this card' : 'a design — the chart plays it alone on an empty table'}
          </p>
          {focusedAuthored && (
            <span className="work-tools">
              <button
                title="Deal a copy onto the table and return to it"
                onClick={() => {
                  onPlay(focusedAuthored)
                  onFocus(null)
                  onClose()
                }}
              >
                <Glyph name="play" size={13} /> play
              </button>
              <button onClick={() => handleDuplicate(focusedAuthored)} title="Copy this design">
                copy
              </button>
              <button
                className="work-burn"
                title="Burn this design — cards already on the table stay"
                onClick={() => {
                  onLibraryChange(library.filter((c) => c.id !== focusedAuthored.id))
                  onFocus(null)
                }}
              >
                <Glyph name="flame" size={13} />
              </button>
            </span>
          )}
          <button className="drawer-close" onClick={onClose} aria-label="Close the Workshop">
            ×
          </button>
        </header>
        <div className="work-focus">
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
                  <CardMathEditor card={focusedAuthored!.card} from={doc.from} onChange={(next: EngineCard) => patchAuthored({ ...focusedAuthored!, card: next })} />
                  <FrontMatterEditor authored={focusedAuthored!} onChange={patchAuthored} />
                </>
              )
            }
          />
        </div>
      </section>
    )
  }

  // ---- BROWSE: one shelf — the blank first, then everything, in play or not ----
  const shelf = [
    ...allCards(doc.table.root).map((card) => ({
      key: `table-${card.id}`,
      face: { kind: card.kind, name: card.name ?? card.id, glyph: glyphFor(card), headline: headlineFor(card) },
      inPlay: true,
      pick: () => onFocus({ where: 'table', id: card.id }),
    })),
    ...library.map((a) => ({
      key: `library-${a.id}`,
      face: { kind: a.card.kind, name: a.card.name ?? a.id, glyph: a.glyph, headline: headlineFor(a.card) },
      inPlay: false,
      pick: () => onFocus({ where: 'library', id: a.id }),
    })),
  ]

  return (
    <section className="workbench" role="dialog" aria-label="The Workshop">
      <header className="workbench-bar">
        <h2>The Workshop</h2>
        <p className="drawer-hint">pick a card up to work on it — ‘in play’ cards edit the live table · packs carry your designs between tables</p>
        <button className={dataOpen ? 'data-open' : undefined} onClick={() => setDataOpen(!dataOpen)} title="Import historical data and manage the table's series">
          {dataOpen ? '← cards' : 'Data'}
        </button>
        <button onClick={handleExport} disabled={library.length === 0} title="Bundle your designs into a pack file to share">
          Export pack
        </button>
        <button onClick={() => importInput.current?.click()} title="Merge a pack file into your designs">
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
              {item.inPlay && <span className="work-flag">in play</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
