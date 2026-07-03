import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { findCard } from '@finsim/engine'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Card } from './components/Card'
import { DrawPile } from './components/DrawPile'
import { Readout } from './components/Readout'
import { TableView } from './components/TableView'
import { Timeline } from './components/Timeline'
import { clearDoc, loadDoc, saveDoc } from './db'
import { addCard, moveCard, removeCard } from './hands'
import type { Blueprint } from './library'
import { runSim, useDoc } from './model'
import type { HandPreset, PresetCard } from './presets'
import { starterDoc } from './starter'

export function App(): ReactElement {
  const store = useDoc(starterDoc())
  const { doc } = store
  const [scrubRaw, setScrub] = useState(doc.from)
  const [draggingBp, setDraggingBp] = useState<Blueprint | null>(null)
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
    setDraggingBp(bp ?? null)
  }

  const handleDragEnd = (e: DragEndEvent): void => {
    const bp = draggingBp
    setDraggingBp(null)
    setDrawerOpen(false)
    if (!bp || !e.over) return
    const overId = String(e.over.id)
    if (overId === 'table') playCard(bp, null)
    else if (overId.startsWith('hand:')) playCard(bp, overId.slice('hand:'.length))
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDraggingBp(null)}>
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
          onEditCard={(label, cardId, mutate) =>
            store.update(label, (d) => {
              const card = findCard(d.table.root, cardId)
              if (card) mutate(card)
            })
          }
          onMoveCard={(cardId, direction) => {
            store.update(`move-${cardId}-${direction}`, (d) => moveCard(d, cardId, direction))
            store.commit()
          }}
          onRemoveCard={(cardId) => {
            store.update(`remove-${cardId}`, (d) => removeCard(d, cardId))
            store.commit()
          }}
          onToggleHand={(handId, enabled) =>
            store.update(`hand:${handId}:${enabled}`, (d) => {
              const hand = findCard(d.table.root, handId)
              if (hand?.kind === 'hand') hand.enabled = enabled
            })
          }
          onRenameHand={(handId, name) => {
            store.update(`rename-${handId}`, (d) => {
              const hand = findCard(d.table.root, handId)
              if (hand?.kind === 'hand') hand.name = name
            })
            store.commit()
          }}
          onCommit={store.commit}
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
      </DragOverlay>
    </DndContext>
  )
}
