import { findCard, valueAt, type HandCard } from '@finsim/engine'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Arena } from './components/Arena'
import { Card } from './components/Card'
import { CardView } from './components/CardView'
import { DrawPile } from './components/DrawPile'
import { Fan, type FanGeometry } from './components/Fan'
import { HandStack } from './components/HandStack'
import { clearDoc, loadDoc, saveDoc } from './db'
import { formatKr } from './format'
import { addCard, findParentHand, moveCard, removeCard } from './hands'
import type { Blueprint } from './library'
import { runSim, useDoc } from './model'
import type { HandPreset, PresetCard } from './presets'
import { starterDoc } from './starter'

/** The main hand at the bottom of the screen: a wide, gentle arc. */
const MAIN_FAN: FanGeometry = { radius: 1150, maxStep: 5, maxSpread: 40, visibleTo: 90, cardWidth: 168 }

export function App(): ReactElement {
  const store = useDoc(starterDoc())
  const { doc } = store
  const [scrubRaw, setScrub] = useState(doc.from)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openHandId, setOpenHandId] = useState<string | null>(null)
  const loaded = useRef(false)

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

  const sim = useMemo(() => runSim(doc), [doc])
  const to = doc.from + doc.horizonMonths - 1
  const scrub = Math.max(doc.from, Math.min(to, scrubRaw))
  const root = doc.table.root

  // the opened hand and the chain of hands above it (undo can vanish it — fall back to chart)
  const opened = openHandId ? findCard(root, openHandId) : null
  const trail = useMemo(() => {
    const chain: HandCard[] = []
    let cur = opened?.kind === 'hand' ? opened : null
    while (cur && cur.id !== root.id) {
      chain.unshift(cur)
      cur = findParentHand(root, cur.id)
    }
    return chain
  }, [opened, root])
  const openHand = trail[trail.length - 1] ?? null

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (drawerOpen) setDrawerOpen(false)
      else if (trail.length > 0) setOpenHandId(trail[trail.length - 2]?.id ?? null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, trail])

  const targetId = openHand?.id ?? null

  const playCard = (bp: Blueprint): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update(`play-${uid}`, (d) => addCard(d, targetId, bp.make(uid)))
    store.commit()
    setDrawerOpen(false)
  }

  const handleImportHand = (preset: HandPreset): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update(`import-${uid}`, (d) => addCard(d, targetId, preset.build(uid)))
    store.commit()
    setDrawerOpen(false)
  }

  const handleImportCard = (card: PresetCard): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update(`import-card-${uid}`, (d) => addCard(d, targetId, card.make(uid)))
    store.commit()
    setDrawerOpen(false)
  }

  const handleReorder = (cardId: string, toIndex: number): void => {
    store.update(`reorder-${cardId}`, (d) => moveCard(d, cardId, toIndex))
    store.commit()
  }

  const handleRemoveCard = (cardId: string): void => {
    store.update(`remove-${cardId}`, (d) => removeCard(d, cardId))
    store.commit()
  }

  return (
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
              setOpenHandId(null)
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <Arena
        doc={doc}
        sim={sim}
        scrub={scrub}
        onScrub={setScrub}
        trail={trail}
        onNavigate={setOpenHandId}
        onReorder={handleReorder}
        onRemoveCard={handleRemoveCard}
        onRenameHand={(handId, name) => {
          store.update(`rename-${handId}`, (d) => {
            const hand = findCard(d.table.root, handId)
            if (hand?.kind === 'hand') hand.name = name
          })
          store.commit()
        }}
      />

      <footer className="hand-strip">
        <p className="zone-label">{root.name ?? 'Your plan'} · plays left to right</p>
        <Fan
          hand={root}
          geometry={MAIN_FAN}
          onReorder={handleReorder}
          onItemClick={(card) => {
            if (card.kind === 'hand') setOpenHandId(card.id)
          }}
          renderItem={(card) =>
            card.kind === 'hand' ? (
              <HandStack hand={card} sim={sim} scrub={scrub} compare={sim.compares.find((c) => c.handId === card.id)} />
            ) : (
              <CardView card={card} sim={sim} scrub={scrub} onRemove={handleRemoveCard} />
            )
          }
        />
        {root.children.length === 0 && <p className="hand-empty">your hand is empty — draw from the pile</p>}
      </footer>

      <div className="cash-corner">
        <Card
          size="hand"
          face={{
            kind: 'vessel',
            name: 'Cash',
            glyph: 'cash',
            headline: formatKr(valueAt(sim.active.cash, scrub)),
            stats: [{ label: 'In', value: 'whatever is left' }],
            sparkline: sim.active.cash.points,
          }}
        />
      </div>

      <DrawPile
        open={drawerOpen}
        targetName={openHand ? (openHand.name ?? openHand.id) : (root.name ?? 'Your plan')}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        onChoose={playCard}
        onImportHand={handleImportHand}
        onImportCard={handleImportCard}
      />
    </div>
  )
}
