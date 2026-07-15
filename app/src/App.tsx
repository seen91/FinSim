import { findCard, formatMonth, type Card, type HandCard, type SampledData } from '@finsim/engine'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { mergeLibrary, type AuthoredCard } from './authored'
import { builtinSeriesOf } from './builtins'
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
import { addCard, findParentHand, groupOnto, moveCard, moveOut, removeCard } from './hands'
import { Glyph } from './icons'
import { canonicalOf, findNode, instanceOf, instancesIn, isInstance, type TableNode } from './instances'
import { runMc } from './mc'
import { migrateDoc, runSim, useDoc, type Sim } from './model'
import { addSeries, parseMonthText } from './seriesImport'
import { starterDoc } from './starter'
import type { Tune } from './tune'
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
  // the Workshop's unsaved edits — held here so the chart previews the draft, not the shelf
  const [workDraft, setWorkDraft] = useState<AuthoredCard | null>(null)
  const [library, setLibrary] = useState<AuthoredCard[]>([])
  const [openHandId, setOpenHandId] = useState<string | null>(null)
  // the one card turned face-down to its what-if dials — tap to turn, tap to turn back
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const loaded = useRef(false)
  const importInput = useRef<HTMLInputElement>(null)

  // local-first: load once, then save (debounced) on every change. The doc and
  // the library load together because a pre-instances doc migrates against the
  // library (design stamps → refs) and may mint designs into it.
  // ?fresh skips the saved table and deals the starter — designs still load.
  useEffect(() => {
    const fresh = new URLSearchParams(window.location.search).has('fresh')
    void Promise.all([fresh ? Promise.resolve(undefined) : loadDoc(), loadLibrary()]).then(([savedDoc, savedLibrary]) => {
      let lib = savedLibrary ?? []
      if (savedDoc) {
        // the removed Sweden-rules toggle was the only app-side writer of world
        // rules — lift what it left behind in old saves. Imported files keep
        // theirs: world rules are engine surface, and exchange round-trips them.
        if (savedDoc.world?.rules) delete savedDoc.world.rules
        const minted = migrateDoc(savedDoc, lib)
        if (minted.length > 0) lib = mergeLibrary(lib, minted)
        store.replace(savedDoc)
      }
      // a design made before the load lands must survive it — merge, don't clobber
      setLibrary((current) => (current.length > 0 ? mergeLibrary(lib, current) : lib))
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
    if (!loaded.current) return
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
      if (!loaded.current) return
      void saveDoc(latest.current.doc)
      void saveLibrary(latest.current.library)
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // a table can still fail to play — a start before a series begins, a burned
  // design an import still references: keep the last good sim on screen and say why
  const simState = useMemo(() => {
    try {
      return { sim: runSim(doc, library), error: null as string | null }
    } catch (err) {
      return { sim: null, error: errorMessage(err) }
    }
  }, [doc, library])
  const lastGoodSim = useRef<Sim | null>(null)
  if (simState.sim) lastGoodSim.current = simState.sim
  const sim =
    simState.sim ??
    lastGoodSim.current ??
    runSim({ goal: doc.goal, from: doc.from, horizonMonths: doc.horizonMonths, table: { root: { id: 'root', kind: 'hand', children: [] } } })
  // the Monte Carlo pass rides a deferred value: the deterministic line
  // answers every gesture instantly, the fan follows a beat later
  const simInput = useMemo(() => ({ doc, library }), [doc, library])
  const deferred = useDeferredValue(simInput)
  const mc = useMemo(() => {
    try {
      return runMc(deferred.doc, deferred.library)
    } catch {
      return null // the deterministic pass already carries the readable error
    }
  }, [deferred])
  const to = doc.from + doc.horizonMonths - 1
  const scrub = Math.max(doc.from, Math.min(to, scrubRaw))
  // what the table renders: instances resolved to their canonical cards, per-copy dials riding along
  const root = sim.resolvedRoot

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

  // the Workshop's focus, mirrored onto the chart: one canonical card, played
  // alone on an empty table — a design (or its unsaved draft), or a built-in.
  // The solo sim also feeds the bench card's live value at the scrub month.
  const workshopSolo = useMemo(() => {
    if (!workshopOpen || !workshopFocus) return null
    const authored = (workDraft?.id === workshopFocus.id ? workDraft : null) ?? canonicalOf(workshopFocus.id, library)
    if (!authored) return null
    try {
      const solo = runSim({ ...doc, table: { root: { id: 'focus-root', kind: 'hand', children: [authored.card] } } }, library)
      return { authored, solo }
    } catch {
      return null // a design can start before its data begins — no curve, not a crash
    }
  }, [workshopOpen, workshopFocus, library, doc, workDraft])

  const arenaFocus = useMemo((): ArenaFocus | null => {
    if (!workshopSolo) return null
    const { authored, solo } = workshopSolo
    return { name: authored.card.name ?? authored.id, note: 'played alone on an empty table', series: solo.active.netWorth }
  }, [workshopSolo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (reportOpen) setReportOpen(false)
      else if (rulebookOpen) setRulebookOpen(false)
      else if (drawerOpen) setDrawerOpen(false)
      else if (workshopFocus) {
        // focus → back to browsing, but unsaved Workshop edits get a say first
        if (workDraft?.id === workshopFocus.id && !window.confirm('Discard unsaved changes to this card?')) return
        setWorkDraft(null)
        setWorkshopFocus(null)
      } else if (workshopOpen) setWorkshopOpen(false)
      else if (flippedId) setFlippedId(null) // a turned card turns back first
      else if (trail.length > 0) setOpenHandId(trail[trail.length - 2]?.id ?? null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reportOpen, rulebookOpen, drawerOpen, workshopOpen, workshopFocus, workDraft, flippedId, trail])

  const targetId = openHand?.id ?? null

  // one dealing gesture for everything the pile offers — a fresh instance of
  // a canonical card (blueprint, preset member, Workshop design), or a whole
  // preset hand of them: land any series the cards wear, then the nodes
  const dealNode = (node: TableNode, series?: Record<string, SampledData>): void => {
    store.update((d) => {
      addSeries(d, series)
      for (const inst of instancesIn(node)) addSeries(d, builtinSeriesOf(inst.ref))
      addCard(d, targetId, node)
    })
  }

  const dealRef = (ref: string): void => dealNode(instanceOf(ref, newUid()))

  const handleReorder = (cardId: string, toIndex: number): void => {
    store.update((d) => moveCard(d, cardId, toIndex))
  }

  // the stack gesture: a freshly formed hand opens in the arena, its name one
  // click away in the hub; a card dropped onto an existing hand just joins it
  const handleGroup = (draggedId: string, ontoId: string): void => {
    let freshHandId: string | null = null
    store.update((d) => {
      freshHandId = groupOnto(d, draggedId, ontoId, newUid())
    })
    if (freshHandId) setOpenHandId(freshHandId)
  }

  // the inverse: a card lifted out of an opened hand and dropped on nothing
  // leaves for the parent, landing right after the hand it came from
  const handleEject = (cardId: string): void => {
    store.update((d) => moveOut(d, cardId))
  }

  const handleRemoveCard = (cardId: string): void => {
    store.update((d) => removeCard(d, cardId))
  }

  // a tap on a card in play turns it over to its what-if dials (hands open instead)
  const handleFlipCard = (cardId: string): void => {
    setFlippedId((f) => (f === cardId ? null : cardId))
  }

  // the dials are per-copy state: the gesture writes the tune onto the node,
  // never onto the canonical card the copy resolves to
  const handleTuneCard = (next: Card): void => {
    store.update((d) => {
      const node = findNode(d.table.root, next.id)
      if (!node) return
      const tune = (next as Card & { tune?: Tune }).tune
      if (tune && Object.keys(tune).length > 0) (node as { tune?: Tune }).tune = tune
      else delete (node as { tune?: Tune }).tune
    })
  }

  // the shelf's hammer: carry the card to the Workshop — every copy is an
  // instance, so the bench always holds the canonical card behind it
  const handleWorkshopCard = (cardId: string): void => {
    const node = findNode(doc.table.root, cardId)
    if (!node || !isInstance(node)) return
    setWorkDraft(null)
    setWorkshopFocus({ where: library.some((a) => a.id === node.ref) ? 'library' : 'builtin', id: node.ref })
    setWorkshopOpen(true)
  }

  // set aside / bring back: the card stays on the table, the sim plays without it
  const handleToggleCard = (cardId: string): void => {
    store.update((d) => {
      const node = findNode(d.table.root, cardId)
      if (!node) return
      if (node.enabled === false) delete node.enabled
      else node.enabled = false
    })
  }

  const handleExport = (): void => {
    downloadJson(`finsim-${new Date().toISOString().slice(0, 10)}.json`, serializeDoc(doc, library))
  }

  const handleImportFile = (file: File): void => {
    void file.text().then((text) => {
      try {
        const imported = deserializeDoc(text, library)
        if (imported.designs.length > 0) setLibrary((current) => mergeLibrary(current, imported.designs))
        store.replace(imported.doc)
        setOpenHandId(null)
        setScrub(imported.doc.from)
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
          {/* planked boards hanging from one wooden rail; the Workshop's
              signal-yellow board stays the one loud thing on the table */}
          <button className="workshop" onClick={() => setWorkshopOpen(true)} title="The Workshop — author cards, tune the ones in play, share packs">
            <span className="workshop-board">
              <Glyph name="hammer" size={15} />
              Workshop
            </span>
          </button>
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
        onGroup={handleGroup}
        onEject={handleEject}
        onRemoveCard={handleRemoveCard}
        onToggleCard={handleToggleCard}
        flippedId={flippedId}
        onFlipCard={handleFlipCard}
        onTuneCard={handleTuneCard}
        onWorkshopCard={handleWorkshopCard}
        onRenameHand={(handId, name) => {
          store.update((d) => {
            const hand = findNode(d.table.root, handId)
            if (hand && !isInstance(hand) && hand.kind === 'hand') hand.name = name
          })
        }}
        onSetHandTake={(handId, take) => {
          store.update((d) => {
            const hand = findNode(d.table.root, handId)
            if (!hand || isInstance(hand) || hand.kind !== 'hand') return
            if (take) hand.take = take
            else delete hand.take
            // an explicit new take supersedes any what-if dial riding the old one
            const tuned = hand as { tune?: Tune }
            if (tuned.tune) {
              for (const path of Object.keys(tuned.tune)) if (path.startsWith('take.')) delete tuned.tune[path]
              if (Object.keys(tuned.tune).length === 0) delete tuned.tune
            }
          })
        }}
        onOpenReport={() => setReportOpen(true)}
      />

      <footer className="hand-strip">
        <Fan
          hand={root}
          geometry={MAIN_FAN}
          onReorder={handleReorder}
          onGroup={handleGroup}
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
                onWorkshop={handleWorkshopCard}
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
        onChooseRef={dealRef}
        onDealNode={dealNode}
      />

      <Workshop
        open={workshopOpen}
        onClose={() => {
          setWorkshopOpen(false)
          setWorkshopFocus(null)
          setWorkDraft(null)
        }}
        doc={doc}
        update={store.update}
        library={library}
        onLibraryChange={setLibrary}
        onPlay={dealRef}
        focus={workshopFocus}
        onFocus={setWorkshopFocus}
        draft={workDraft}
        onDraftChange={setWorkDraft}
        focusSim={workshopSolo?.solo ?? null}
        scrub={scrub}
      />
    </div>
  )
}
