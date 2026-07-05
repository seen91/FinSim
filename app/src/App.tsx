import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { findCard } from '@finsim/engine'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Card } from './components/Card'
import { CardView } from './components/TableView'
import { DrawPile } from './components/DrawPile'
import { Readout } from './components/Readout'
import { TableView } from './components/TableView'
import { Timeline } from './components/Timeline'
import { clearDoc, loadDoc, saveDoc } from './db'
import { addCard, findParentHand, removeCard, reorderCard } from './hands'
import type { Blueprint } from './library'
import { runSim, useDoc } from './model'
import type { HandPreset, PresetCard } from './presets'
import { starterDoc } from './starter'

/** The drag-overlay card only shows its front, so its controls never fire. */
const NO_HANDLERS = {
  onRemoveCard: () => {},
  onRenameHand: () => {},
}

export function App(): ReactElement {
  const store = useDoc(starterDoc())
  const { doc } = store
  const [scrubRaw, setScrub] = useState(doc.from)
  const [draggingBp, setDraggingBp] = useState<Blueprint | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const loaded = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // local-first: load once, then save (debounced) on every change
  useEffect(() => {
    void loadDoc().then((saved) => {
      if (saved) store.replace(saved)
      loaded.current = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!loaded.current) return
    const timer = setTimeout(() => void saveDoc(doc), 400)
    return () => clearTimeout(timer)
  }, [doc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const sim = useMemo(() => runSim(doc), [doc])
  const to = doc.from + doc.horizonMonths - 1
  const scrub = Math.max(doc.from, Math.min(to, scrubRaw))

  // the card lifted for reordering — rendered in the drag overlay so it slides
  // out from the cascade and follows the pointer
  const draggingCard = draggingCardId ? findCard(doc.table.root, draggingCardId) : null

  const playCard = (bp: Blueprint, intoHandId: string | null): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update(`play-${uid}`, (d) => addCard(d, intoHandId, bp.make(uid)))
    store.commit()
  }

  const handleImportHand = (preset: HandPreset): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update(`import-${uid}`, (d) => {
      d.table.root.children.push(preset.build(uid))
    })
    store.commit()
    setDrawerOpen(false)
  }

  const handleImportCard = (card: PresetCard): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update(`import-card-${uid}`, (d) => addCard(d, null, card.make(uid)))
    store.commit()
    setDrawerOpen(false)
  }

  const handleDragStart = (e: DragStartEvent): void => {
    const bp = e.active.data.current?.['bp'] as Blueprint | undefined
    if (bp) setDraggingBp(bp)
    else setDraggingCardId(String(e.active.id))
  }

  const handleDragEnd = (e: DragEndEvent): void => {
    const bp = draggingBp
    const cardId = draggingCardId
    setDraggingBp(null)
    setDraggingCardId(null)
    setDrawerOpen(false)
    if (!e.over) return
    const overId = String(e.over.id)

    if (bp) {
      // playing a card from the library: onto the table, a hand, or another card
      if (overId === 'table') playCard(bp, null)
      else if (overId.startsWith('hand:')) playCard(bp, overId.slice('hand:'.length))
      else playCard(bp, findParentHand(doc.table.root, overId)?.id ?? null)
      return
    }

    if (cardId && overId !== cardId && !overId.startsWith('hand:') && overId !== 'table') {
      store.update(`reorder-${cardId}`, (d) => reorderCard(d, cardId, overId))
      store.commit()
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingBp(null)
        setDraggingCardId(null)
      }}
    >
      <div className="app">
        <header className="topbar">
          <h1>FinSim</h1>
          <label className="goal-input">
            Goal
            <input
              type="number"
              min={0}
              step={500000}
              value={doc.goal}
              onChange={(e) => store.update('goal', (d) => (d.goal = Number(e.target.value) || 0))}
              onBlur={store.commit}
            />
            kr
          </label>
          <div className="topbar-actions">
            <button onClick={store.undo} disabled={!store.canUndo}>
              Undo
            </button>
            <button onClick={store.redo} disabled={!store.canRedo}>
              Redo
            </button>
            <button
              onClick={() => {
                void clearDoc()
                store.replace(starterDoc())
              }}
            >
              Reset
            </button>
          </div>
        </header>

        <Timeline sim={sim} goal={doc.goal} from={doc.from} horizonMonths={doc.horizonMonths} scrub={scrub} onScrub={setScrub} />

        <Readout sim={sim} />

        <TableView
          doc={doc}
          sim={sim}
          scrub={scrub}
          draggingBp={draggingBp}
          onRemoveCard={(cardId) => {
            store.update(`remove-${cardId}`, (d) => removeCard(d, cardId))
            store.commit()
          }}
          onRenameHand={(handId, name) => {
            store.update(`rename-${handId}`, (d) => {
              const hand = findCard(d.table.root, handId)
              if (hand?.kind === 'hand') hand.name = name
            })
            store.commit()
          }}
        />

        <DrawPile
          open={drawerOpen}
          hidden={draggingBp !== null}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          onChoose={(bp) => {
            playCard(bp, null)
            setDrawerOpen(false)
          }}
          onImportHand={handleImportHand}
          onImportCard={handleImportCard}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingBp && (
          <div className="drag-ghost">
            <Card
              size="hand"
              face={{
                kind: draggingBp.kind,
                name: draggingBp.name,
                glyph: draggingBp.glyph,
                headline: draggingBp.headline,
              }}
            />
          </div>
        )}
        {draggingCard && (
          <div className="drag-ghost drag-ghost-lift">
            <CardView card={draggingCard} sim={sim} scrub={scrub} handlers={NO_HANDLERS} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
