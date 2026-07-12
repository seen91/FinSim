import { findCard, formatMonth, ym, type HandCard } from '@finsim/engine'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Arena } from './components/Arena'
import { CardView } from './components/CardView'
import { CashDock } from './components/CashDock'
import { DrawPile } from './components/DrawPile'
import { Fan, type FanGeometry } from './components/Fan'
import { HandStack } from './components/HandStack'
import { loadDoc, saveDoc } from './db'
import { deserializeDoc, serializeDoc } from './exchange'
import { formatCompact, parseCompact } from './format'
import { addCard, findParentHand, moveCard, removeCard } from './hands'
import type { Blueprint } from './library'
import { migrateDoc, runSim, useDoc } from './model'
import type { HandPreset, PresetCard } from './presets'
import { starterDoc } from './starter'

/** The main hand at the bottom of the screen: a wide, gentle arc. */
const MAIN_FAN: FanGeometry = { radius: 1150, maxStep: 6, maxSpread: 46, visibleTo: 90, cardWidth: 184 }

/** The goal in compact money ("10 M", "250 k"); accepts "1,5m", "10M", "250k" or a plain number. */
function GoalInput({ goal, onCommit }: { goal: number; onCommit: (v: number) => void }): ReactElement {
  const [draft, setDraft] = useState(() => formatCompact(goal))
  useEffect(() => setDraft(formatCompact(goal)), [goal])
  const commit = (): void => {
    const parsed = parseCompact(draft)
    if (parsed !== null && parsed > 0) {
      onCommit(parsed)
      setDraft(formatCompact(parsed))
    } else {
      setDraft(formatCompact(goal))
    }
  }
  return (
    <input
      type="text"
      className="num"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(formatCompact(goal))
      }}
    />
  )
}

export function App(): ReactElement {
  const store = useDoc(starterDoc())
  const { doc } = store
  const [scrubRaw, setScrub] = useState(doc.from)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openHandId, setOpenHandId] = useState<string | null>(null)
  const loaded = useRef(false)
  const importInput = useRef<HTMLInputElement>(null)

  // local-first: load once, then save (debounced) on every change.
  // ?fresh skips the saved table and deals the starter — the clean-slate path now that Reset is gone.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('fresh')) {
      loaded.current = true
      return
    }
    void loadDoc().then((saved) => {
      if (saved) {
        // the removed Sweden-rules toggle was the only writer of world rules — lift any it left behind
        if (saved.world?.rules) delete saved.world.rules
        store.replace(migrateDoc(saved))
      }
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

  // the opened hand and the chain of hands above it (a removal or import can vanish it — fall back to chart)
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
    store.update((d) => addCard(d, targetId, bp.make(uid)))
    setDrawerOpen(false)
  }

  const handleImportHand = (preset: HandPreset): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update((d) => addCard(d, targetId, preset.build(uid)))
    setDrawerOpen(false)
  }

  const handleImportCard = (card: PresetCard): void => {
    const uid = crypto.randomUUID().slice(0, 8)
    store.update((d) => addCard(d, targetId, card.make(uid)))
    setDrawerOpen(false)
  }

  const handleReorder = (cardId: string, toIndex: number): void => {
    store.update((d) => moveCard(d, cardId, toIndex))
  }

  const handleRemoveCard = (cardId: string): void => {
    store.update((d) => removeCard(d, cardId))
  }

  const handleExport = (): void => {
    const blob = new Blob([serializeDoc(doc)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finsim-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (file: File): void => {
    void file.text().then((text) => {
      try {
        const imported = deserializeDoc(text)
        store.replace(imported)
        setOpenHandId(null)
        setScrub(imported.from)
      } catch (err) {
        alert(`Could not import: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>FinSim</h1>
        <label className="goal-input">
          Goal
          <GoalInput
            goal={doc.goal}
            onCommit={(v) => {
              store.update((d) => (d.goal = v))
            }}
          />
        </label>
        <label className="goal-input">
          Start
          <input
            type="month"
            value={formatMonth(doc.from)}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (!y || !m) return
              store.update((d) => (d.from = ym(y, m)))
            }}
          />
        </label>
        <div className="topbar-actions">
          <button onClick={handleExport} title="download the whole table as a JSON file — the backup/share path">
            Export
          </button>
          <button onClick={() => importInput.current?.click()} title="replace the table with a previously exported JSON file">
            Import
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
          store.update((d) => {
            const hand = findCard(d.table.root, handId)
            if (hand?.kind === 'hand') hand.name = name
          })
        }}
      />

      <footer className="hand-strip">
        <Fan
          hand={root}
          geometry={MAIN_FAN}
          onReorder={handleReorder}
          onItemClick={(card) => {
            if (card.kind === 'hand') setOpenHandId(card.id)
          }}
          renderItem={(card) =>
            card.kind === 'hand' ? (
              <HandStack hand={card} sim={sim} scrub={scrub} from={doc.from} compare={sim.compares.find((c) => c.cardId === card.id)} />
            ) : (
              <CardView card={card} sim={sim} scrub={scrub} from={doc.from} compare={sim.compares.find((c) => c.cardId === card.id)} onRemove={handleRemoveCard} />
            )
          }
        />
        {root.children.length === 0 && <p className="hand-empty">your hand is empty — draw from the pile</p>}
      </footer>

      <CashDock doc={doc} sim={sim} scrub={scrub} onEdit={store.update} />

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
