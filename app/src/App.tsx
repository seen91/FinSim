import { findCard, formatMonth, type Card, type HandCard, type SampledData } from '@finsim/engine'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { instantiate, mergeLibrary, type AuthoredCard } from './authored'
import { Arena } from './components/Arena'
import { CardView } from './components/CardView'
import { CashDock } from './components/CashDock'
import { DrawPile } from './components/DrawPile'
import { Fan, type FanGeometry } from './components/Fan'
import { FuturesReport } from './components/FuturesReport'
import { HandStack } from './components/HandStack'
import { Rulebook } from './components/Rulebook'
import { Workshop, type WorkshopFocus } from './components/Workshop'
import type { ArenaFocus } from './components/Arena'
import { loadDoc, loadLibrary, saveDoc, saveLibrary } from './db'
import { downloadJson } from './download'
import { deserializeDoc, serializeDoc } from './exchange'
import { errorMessage, formatCompact, parseCompact } from './format'
import { addCard, findParentHand, moveCard, removeCard, replaceCard } from './hands'
import { Glyph } from './icons'
import { runMc } from './mc'
import { cardFocusSeries, migrateDoc, runSim, useDoc, type Sim } from './model'
import { addSeries, parseMonthText } from './seriesImport'
import { starterDoc } from './starter'
import { newUid } from './uid'

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
  const [rulebookOpen, setRulebookOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [workshopOpen, setWorkshopOpen] = useState(false)
  const [workshopFocus, setWorkshopFocus] = useState<WorkshopFocus | null>(null)
  const [library, setLibrary] = useState<AuthoredCard[]>([])
  const [openHandId, setOpenHandId] = useState<string | null>(null)
  // the one card turned face-down to its what-if dials — tap to turn, tap to turn back
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const loaded = useRef(false)
  const libraryLoaded = useRef(false)
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
        // the removed Sweden-rules toggle was the only app-side writer of world
        // rules — lift what it left behind in old saves. Imported files keep
        // theirs: world rules are engine surface, and exchange round-trips them.
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

  // the Workshop's authored cards persist too — even under ?fresh, designs survive
  useEffect(() => {
    void loadLibrary().then((saved) => {
      // a design made before the load lands must survive it — merge, don't clobber
      if (saved) setLibrary((current) => (current.length > 0 ? mergeLibrary(saved, current) : saved))
      libraryLoaded.current = true
    })
  }, [])
  useEffect(() => {
    if (!libraryLoaded.current) return
    // no debounce: designs are few and precious — a fresh one must hit disk
    // before any reload can eat it (the doc keeps its debounce; it churns)
    void saveLibrary(library)
  }, [library])

  // the debounced saves lose the last change when the page goes away inside
  // their 400 ms window (a reload right after authoring ate the fresh design) —
  // flush whatever is pending on the way out
  const latest = useRef({ doc, library })
  latest.current = { doc, library }
  useEffect(() => {
    const flush = (): void => {
      if (document.visibilityState !== 'hidden') return
      if (loaded.current) void saveDoc(latest.current.doc)
      if (libraryLoaded.current) void saveLibrary(latest.current.library)
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // a table can still fail to play — a start before a series begins, a bogus
  // series id: keep the last good sim on screen and say why
  const simState = useMemo(() => {
    try {
      return { sim: runSim(doc), error: null as string | null }
    } catch (err) {
      return { sim: null, error: errorMessage(err) }
    }
  }, [doc])
  const lastGoodSim = useRef<Sim | null>(null)
  if (simState.sim) lastGoodSim.current = simState.sim
  const sim =
    simState.sim ?? lastGoodSim.current ?? runSim({ goal: doc.goal, from: doc.from, horizonMonths: doc.horizonMonths, table: { root: { id: 'root', kind: 'hand', children: [] } } })
  // the Monte Carlo pass rides a deferred value: the deterministic line
  // answers every gesture instantly, the fan follows a beat later
  const deferredDoc = useDeferredValue(doc)
  const mc = useMemo(() => {
    try {
      return runMc(deferredDoc)
    } catch {
      return null // the deterministic pass already carries the readable error
    }
  }, [deferredDoc])
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

  // the Workshop's focus, mirrored onto the chart: one card, one curve.
  // In play → its balance / cumulative effect from the live sim; a design →
  // a fresh solo sim, the card alone on an empty table.
  const arenaFocus = useMemo((): ArenaFocus | null => {
    if (!workshopOpen || !workshopFocus) return null
    if (workshopFocus.where === 'table') {
      const card = findCard(root, workshopFocus.id)
      const series = card ? cardFocusSeries(sim, card) : null
      if (!card || !series) return null
      const what = card.kind === 'asset' || card.kind === 'debt' ? 'its balance, in place on the table' : 'what it has moved so far, in place on the table'
      return { name: card.name ?? card.id, note: what, series }
    }
    const authored = library.find((a) => a.id === workshopFocus.id)
    if (!authored) return null
    try {
      const solo = runSim({ ...doc, table: { root: { id: 'focus-root', kind: 'hand', children: [authored.card] } } })
      return { name: authored.card.name ?? authored.id, note: 'played alone on an empty table', series: solo.active.netWorth }
    } catch {
      return null // a design can start before its data begins — no curve, not a crash
    }
  }, [workshopOpen, workshopFocus, root, sim, library, doc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (reportOpen) setReportOpen(false)
      else if (rulebookOpen) setRulebookOpen(false)
      else if (drawerOpen) setDrawerOpen(false)
      else if (workshopFocus) setWorkshopFocus(null) // focus → back to browsing
      else if (workshopOpen) setWorkshopOpen(false)
      else if (flippedId) setFlippedId(null) // a turned card turns back first
      else if (trail.length > 0) setOpenHandId(trail[trail.length - 2]?.id ?? null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reportOpen, rulebookOpen, drawerOpen, workshopOpen, workshopFocus, flippedId, trail])

  const targetId = openHand?.id ?? null

  // one dealing gesture for everything the pile offers — a library blueprint,
  // a preset card or hand, a Workshop design: land any series the card wears,
  // then the card itself, into the open hand
  const deal = (make: (uid: string) => Card, series?: Record<string, SampledData>): void => {
    store.update((d) => {
      addSeries(d, series)
      addCard(d, targetId, make(newUid()))
    })
    setDrawerOpen(false)
  }

  const playAuthored = (authored: AuthoredCard): void => deal((uid) => instantiate(authored, uid))

  const handleReorder = (cardId: string, toIndex: number): void => {
    store.update((d) => moveCard(d, cardId, toIndex))
  }

  const handleRemoveCard = (cardId: string): void => {
    store.update((d) => removeCard(d, cardId))
  }

  // a tap on a card in play turns it over to its what-if dials (hands open instead)
  const handleFlipCard = (cardId: string): void => {
    setFlippedId((f) => (f === cardId ? null : cardId))
  }

  const handleTuneCard = (next: Card): void => {
    store.update((d) => replaceCard(d, next))
  }

  // set aside / bring back: the card stays on the table, the sim plays without it
  const handleToggleCard = (cardId: string): void => {
    store.update((d) => {
      const card = findCard(d.table.root, cardId)
      if (!card) return
      if (card.enabled === false) delete card.enabled
      else card.enabled = false
    })
  }

  const handleExport = (): void => {
    downloadJson(`finsim-${new Date().toISOString().slice(0, 10)}.json`, serializeDoc(doc))
  }

  const handleImportFile = (file: File): void => {
    void file.text().then((text) => {
      try {
        const imported = deserializeDoc(text)
        store.replace(imported)
        setOpenHandId(null)
        setScrub(imported.from)
      } catch (err) {
        alert(`Could not import: ${errorMessage(err)}`)
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
        <label className="goal-input" title="the table's first month — set it in the past to backtest against historical data">
          Start
          <input
            type="month"
            value={formatMonth(doc.from)}
            onChange={(e) => {
              const month = parseMonthText(e.target.value)
              if (month !== null) store.update((d) => (d.from = month))
            }}
          />
        </label>
        <div className="topbar-actions">
          {/* planked wooden boards on the rail, kin to the Workshop's sign */}
          <button className="sign" onClick={() => setRulebookOpen(true)} title="how the table plays — the rules, written down">
            <Glyph name="book" size={14} />
            Rulebook
          </button>
          <button className="sign" onClick={handleExport} title="download the whole table as a JSON file — the backup/share path">
            <Glyph name="export" size={13} />
            Export
          </button>
          <button className="sign" onClick={() => importInput.current?.click()} title="replace the table with a previously exported JSON file">
            <Glyph name="import" size={13} />
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

      {simState.error && (
        <div className="sim-error" role="alert">
          the table cannot play: {simState.error}
          {simState.error.includes('no data for') && ' — move the table’s start into the months the data covers'}
        </div>
      )}

      <Arena
        doc={doc}
        sim={sim}
        mc={mc}
        scrub={scrub}
        onScrub={setScrub}
        focus={arenaFocus}
        trail={trail}
        onNavigate={setOpenHandId}
        onReorder={handleReorder}
        onRemoveCard={handleRemoveCard}
        onToggleCard={handleToggleCard}
        flippedId={flippedId}
        onFlipCard={handleFlipCard}
        onTuneCard={handleTuneCard}
        onRenameHand={(handId, name) => {
          store.update((d) => {
            const hand = findCard(d.table.root, handId)
            if (hand?.kind === 'hand') hand.name = name
          })
        }}
        onOpenReport={() => setReportOpen(true)}
      />

      <footer className="hand-strip">
        <Fan
          hand={root}
          geometry={MAIN_FAN}
          onReorder={handleReorder}
          onItemClick={(card) => {
            if (card.kind === 'hand') setOpenHandId(card.id)
            else handleFlipCard(card.id)
          }}
          renderItem={(card) =>
            card.kind === 'hand' ? (
              <HandStack
                hand={card}
                sim={sim}
                scrub={scrub}
                from={doc.from}
                compare={sim.compares.find((c) => c.cardId === card.id)}
                range={mc?.ranges.get(card.id)}
                onRemove={handleRemoveCard}
                onToggle={handleToggleCard}
              />
            ) : (
              <CardView
                card={card}
                sim={sim}
                scrub={scrub}
                from={doc.from}
                compare={sim.compares.find((c) => c.cardId === card.id)}
                flipped={flippedId === card.id}
                onRemove={handleRemoveCard}
                onToggle={handleToggleCard}
                onTune={handleTuneCard}
              />
            )
          }
        />
        {root.children.length === 0 && <p className="hand-empty">your hand is empty — draw from the pile</p>}
      </footer>

      <CashDock doc={doc} sim={sim} scrub={scrub} update={store.update} />

      <Rulebook open={rulebookOpen} onClose={() => setRulebookOpen(false)} />

      <FuturesReport open={reportOpen} mc={mc} doc={doc} onClose={() => setReportOpen(false)} />

      <DrawPile
        open={drawerOpen}
        targetName={openHand ? (openHand.name ?? openHand.id) : (root.name ?? 'Your plan')}
        authored={library}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        onChoose={(bp) => deal(bp.make, bp.series)}
        onChooseAuthored={playAuthored}
        onImportHand={(preset) => deal(preset.build, preset.series)}
        onImportCard={(card) => deal(card.make, card.series)}
        onWorkshop={() => {
          setDrawerOpen(false)
          setWorkshopOpen(true)
        }}
      />

      <Workshop
        open={workshopOpen}
        onClose={() => {
          setWorkshopOpen(false)
          setWorkshopFocus(null)
        }}
        doc={doc}
        update={store.update}
        library={library}
        onLibraryChange={setLibrary}
        onPlay={playAuthored}
        focus={workshopFocus}
        onFocus={setWorkshopFocus}
      />
    </div>
  )
}
