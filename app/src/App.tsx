import { findCard, formatMonth, type Card, type HandCard, type SampledData } from '@finsim/engine'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { mergeLibrary, type AuthoredCard } from './authored'
import { builtinSeriesOf } from './builtins'
import { Arena } from './components/Arena'
import { CardView } from './components/CardView'
import { contenderDoc, resolveContender, runCompare, type CompareSel, type Contender } from './compare'
import { CashDock } from './components/CashDock'
import { ComparePicks } from './components/ComparePicks'
import { DrawPile } from './components/DrawPile'
import { Fan, type FanGeometry } from './components/Fan'
import { BundleReport, FuturesReport } from './components/FuturesReport'
import { HandStack } from './components/HandStack'
import { Rulebook } from './components/Rulebook'
import { Workshop, type WorkshopFocus } from './components/Workshop'
import type { ArenaCompare, ArenaFocus } from './components/Arena'
import { loadDoc, loadLibrary, loadSavedHands, saveDoc, saveLibrary, saveSavedHands } from './db'
import { downloadJson } from './download'
import { deserializeDoc, serializeDoc } from './exchange'
import { errorMessage, formatCompact, parseCompact } from './format'
import { addCard, findParentHand, groupOnto, moveCard, moveOut, removeCard } from './hands'
import { Glyph } from './icons'
import { canonicalOf, findNode, instanceOf, instancesIn, isInstance, type TableNode } from './instances'
import { runMc } from './mc'
import { effectiveHorizon, migrateDoc, runSim, useDoc, type PlayedDoc, type Sim } from './model'
import { PRESETS } from './presets'
import { snapshotHand, unpackSavedHand, type SavedHand } from './savedHands'
import { addSeries, parseMonthText } from './seriesImport'
import { freshDoc } from './starter'
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
  const store = useDoc(freshDoc())
  const { doc } = store
  const [scrubRaw, setScrub] = useState(doc.from)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rulebookOpen, setRulebookOpen] = useState(false)
  // the unfolded futures: the whole table's report, one hand's scoped one —
  // or one compare contender's, while two plans share the chart
  const [report, setReport] = useState<'table' | 'compare-a' | 'compare-b' | { hand: string } | null>(null)
  // compare mode: the challenger's pick — a saved hand, a preset, or a single
  // card — drawn dashed on the battle chart; the table is always the solid line
  const [compareSel, setCompareSel] = useState<CompareSel | null>(null)
  const [workshopOpen, setWorkshopOpen] = useState(false)
  const [workshopFocus, setWorkshopFocus] = useState<WorkshopFocus | null>(null)
  // the Workshop's unsaved edits — held here so the chart previews the draft, not the shelf
  const [workDraft, setWorkDraft] = useState<AuthoredCard | null>(null)
  const [library, setLibrary] = useState<AuthoredCard[]>([])
  const [savedHands, setSavedHands] = useState<SavedHand[]>([])
  const [openHandId, setOpenHandId] = useState<string | null>(null)
  // the Table sign's little menu: export, import, reset under one board
  const [tableMenuOpen, setTableMenuOpen] = useState(false)
  // the one card turned face-down to its what-if dials — tap to turn, tap to turn back
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const loaded = useRef(false)
  const importInput = useRef<HTMLInputElement>(null)

  // local-first: load once, then save (debounced) on every change. The doc and
  // the library load together because a pre-instances doc migrates against the
  // library (design stamps → refs) and may mint designs into it.
  useEffect(() => {
    void Promise.all([loadDoc(), loadLibrary(), loadSavedHands()]).then(([savedDoc, savedLibrary, storedHands]) => {
      let lib = savedLibrary ?? []
      if (savedDoc) {
        // the removed Sweden-rules toggle was the only app-side writer of world
        // rules — lift what it left behind in old saves. Imported files keep
        // theirs: world rules are engine surface, and exchange round-trips them.
        if (savedDoc.world?.rules) delete savedDoc.world.rules
        // the fixed 30-year starter horizon predates the auto horizon — lift
        // it to auto (the End field, added the same day, makes 30y expressible again)
        if (savedDoc.horizonMonths === 30 * 12) savedDoc.horizonMonths = null
        const minted = migrateDoc(savedDoc, lib)
        if (minted.length > 0) lib = mergeLibrary(lib, minted)
        store.replace(savedDoc)
      }
      // a design made before the load lands must survive it — merge, don't clobber
      setLibrary((current) => (current.length > 0 ? mergeLibrary(lib, current) : lib))
      if (storedHands) setSavedHands((current) => (current.length > 0 ? [...storedHands, ...current] : storedHands))
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
  useEffect(() => {
    if (!loaded.current) return
    // saved hands are few and precious too — straight to disk
    void saveSavedHands(savedHands)
  }, [savedHands])

  // the debounced saves lose the last change when the page goes away inside
  // their 400 ms window (a reload right after authoring ate the fresh design) —
  // flush whatever is pending on the way out
  const latest = useRef({ doc, library, savedHands })
  latest.current = { doc, library, savedHands }
  useEffect(() => {
    const flush = (): void => {
      if (document.visibilityState !== 'hidden') return
      if (!loaded.current) return
      void saveDoc(latest.current.doc)
      void saveLibrary(latest.current.library)
      void saveSavedHands(latest.current.savedHands)
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // the comparison plays the raw doc: it resolves its own shared horizon, and
  // the live table IS a contender whenever "The table now" is picked — every
  // card edit moves that curve under the other. Each side's doc is kept
  // (pinned to the shared horizon) so its futures can be rolled and unfolded
  // exactly like the plain chart's.
  const compareState = useMemo(() => {
    if (!compareSel) return null
    const a: Contender = { type: 'table' }
    const b: Contender = resolveContender(compareSel, savedHands, library) ?? { type: 'table' }
    try {
      const run = runCompare(doc, a, b, library)
      const docA: PlayedDoc = { ...contenderDoc(doc, a), horizonMonths: run.horizonMonths }
      const docB: PlayedDoc = { ...contenderDoc(doc, b), horizonMonths: run.horizonMonths }
      return { run, docA, docB, error: null as string | null }
    } catch (err) {
      return { run: null, docA: null, docB: null, error: errorMessage(err) }
    }
  }, [compareSel, doc, library, savedHands])

  // the horizon resolves to a number exactly once, here — an explicit End
  // passes through, auto ends five years past the goal crossing — and
  // everything downstream (sims, chart, reports) plays the resolved doc.
  // A comparison's shared horizon can outrun the table's own; the table's sim
  // follows it, so every month the scrub can reach exists on every series a
  // card face, hand stack or the cash dock reads.
  const ownHorizonMonths = useMemo(() => effectiveHorizon(doc, library), [doc, library])
  const horizonMonths = compareState?.run ? Math.max(ownHorizonMonths, compareState.run.horizonMonths) : ownHorizonMonths
  const playDoc: PlayedDoc = useMemo(() => ({ ...doc, horizonMonths }), [doc, horizonMonths])

  // a table can still fail to play — a start before a series begins, a burned
  // design an import still references: keep the last good sim on screen and say why
  const simState = useMemo(() => {
    try {
      return { sim: runSim(playDoc, library), error: null as string | null }
    } catch (err) {
      return { sim: null, error: errorMessage(err) }
    }
  }, [playDoc, library])
  const lastGoodSim = useRef<Sim | null>(null)
  if (simState.sim) lastGoodSim.current = simState.sim
  const sim =
    simState.sim ??
    lastGoodSim.current ??
    runSim({ goal: doc.goal, from: doc.from, horizonMonths, table: { root: { id: 'root', kind: 'hand', children: [] } } })
  // the Monte Carlo pass rides a deferred value: the deterministic line
  // answers every gesture instantly, the fan follows a beat later
  const simInput = useMemo(() => ({ doc: playDoc, library }), [playDoc, library])
  const deferred = useDeferredValue(simInput)
  const mc = useMemo(() => {
    try {
      return runMc(deferred.doc, deferred.library)
    } catch {
      return null // the deterministic pass already carries the readable error
    }
  }, [deferred])
  // both contenders' futures ride the same deferred beat as the table's fan
  const compareMcInput = useMemo(
    () => (compareState?.docA && compareState.docB ? { docA: compareState.docA, docB: compareState.docB, library } : null),
    [compareState, library],
  )
  const deferredCompareMc = useDeferredValue(compareMcInput)
  const compareMc = useMemo(() => {
    if (!deferredCompareMc) return null
    try {
      return { a: runMc(deferredCompareMc.docA, deferredCompareMc.library), b: runMc(deferredCompareMc.docB, deferredCompareMc.library) }
    } catch {
      return null
    }
  }, [deferredCompareMc])

  const arenaCompare = useMemo((): ArenaCompare | null => {
    if (!compareState) return null
    return {
      run: compareState.run,
      error: compareState.error,
      mcA: compareMc?.a ?? null,
      mcB: compareMc?.b ?? null,
      onOpenReport: (side) => setReport(side === 'a' ? 'compare-a' : 'compare-b'),
    }
  }, [compareState, compareMc])

  // the compare horizon is already folded into horizonMonths — the scrub
  // never points past a month the table's own sim covers
  const to = doc.from + horizonMonths - 1
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
      const solo = runSim({ ...playDoc, table: { root: { id: 'focus-root', kind: 'hand', children: [authored.card] } } }, library)
      return { authored, solo }
    } catch {
      return null // a design can start before its data begins — no curve, not a crash
    }
  }, [workshopOpen, workshopFocus, library, playDoc, workDraft])

  const arenaFocus = useMemo((): ArenaFocus | null => {
    if (!workshopSolo) return null
    const { authored, solo } = workshopSolo
    return { name: authored.card.name ?? authored.id, note: 'played alone on an empty table', series: solo.active.netWorth }
  }, [workshopSolo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (report) setReport(null)
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
      else if (compareSel) setCompareSel(null) // the rival leaves the chart last
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [report, rulebookOpen, drawerOpen, workshopOpen, workshopFocus, workDraft, flippedId, trail, compareSel])

  const targetId = openHand?.id ?? null

  // while a hand is opened in the arena, the main strip below reads as "the
  // rest of the table" — a click anywhere down there (cards included) folds
  // the hand away like the ×. Buttons keep their own clicks, and a drag that
  // travelled is a reorder, not a close. The gesture means what it meant at
  // pointerdown: the click that OPENS a hand bubbles here after the state
  // already flipped, and must not close it right back.
  const stripCloses = !workshopOpen && trail.length > 0
  const stripDown = useRef<{ x: number; y: number; closes: boolean } | null>(null)

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

  // snapshot a hand — the root included — to the draw pile: a named copy of
  // the tree as it stands (instances with their dials and set-asides, nested
  // hands whole), dealt back later as a fresh, fully editable composition
  const handleSaveHand = (handId: string | null): void => {
    const hand = handId === null ? doc.table.root : findNode(doc.table.root, handId)
    if (!hand || isInstance(hand) || hand.kind !== 'hand') return
    const name = window.prompt('Save this hand to the pile as…', hand.name ?? 'Your plan')?.trim()
    if (!name) return
    setSavedHands((prev) => [...prev, snapshotHand(hand, name, newUid(), library, doc.world?.series)])
  }

  // onto an empty table, a saved hand becomes the plan itself — its cards
  // spread at top level, its name on the root — instead of arriving as one
  // stack; anywhere else it stays a hand so it doesn't shuffle into what's
  // already in play
  const handleDealSaved = (saved: SavedHand): void => {
    const unpacked = unpackSavedHand(saved, newUid)
    if (targetId === null && doc.table.root.children.length === 0) {
      store.update((d) => {
        addSeries(d, saved.series)
        for (const inst of instancesIn(unpacked)) addSeries(d, builtinSeriesOf(inst.ref))
        d.table.root.children = unpacked.children
        d.table.root.name = unpacked.name
      })
      return
    }
    dealNode(unpacked, saved.series)
  }

  const handleBurnSaved = (savedId: string): void => {
    const saved = savedHands.find((s) => s.id === savedId)
    if (!saved) return
    if (!window.confirm(`Burn the saved hand “${saved.name}”? The copies already dealt stay on the table.`)) return
    setSavedHands((prev) => prev.filter((s) => s.id !== savedId))
    // burning the challenger ends its comparison — table vs table says nothing
    setCompareSel((sel) => (sel?.kind === 'saved' && sel.id === savedId ? null : sel))
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

  // the clean slate: a lone salary card, empty shelves — everything authored or
  // saved is gone (Export sits right above it for anyone who wants a backup)
  const handleReset = (): void => {
    if (!window.confirm('Reset everything? The table goes back to a single Salary card and your authored cards and saved hands are cleared. Export first if you want a backup.')) return
    const dealt = freshDoc()
    store.replace(dealt)
    setLibrary([])
    setSavedHands([])
    setCompareSel(null)
    setReport(null)
    setOpenHandId(null)
    setScrub(dealt.from)
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
        <label
          className="goal-input"
          title="the table's last month — by default it follows the goal (five years past the crossing); set a month to pin it, clear the field to follow again"
        >
          End
          <input
            type="month"
            value={formatMonth(to)}
            onChange={(e) => {
              const month = parseMonthText(e.target.value)
              store.update((d) => (d.horizonMonths = month === null ? null : Math.max(1, month - d.from + 1)))
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
          <div className="table-sign">
            <button className="sign" onClick={() => setTableMenuOpen((open) => !open)} title="the table as a file — export, import, or reset">
              <Glyph name="export" size={13} />
              Table
            </button>
            {tableMenuOpen && (
              <>
                <div className="sign-veil" onClick={() => setTableMenuOpen(false)} aria-hidden="true" />
                <ul className="sign-menu" role="menu" aria-label="Table actions">
                  <li>
                    <button
                      role="menuitem"
                      title="download the whole table as a JSON file — the backup/share path"
                      onClick={() => {
                        setTableMenuOpen(false)
                        handleExport()
                      }}
                    >
                      <Glyph name="export" size={13} />
                      Export
                    </button>
                  </li>
                  <li>
                    <button
                      role="menuitem"
                      title="replace the table with a previously exported JSON file"
                      onClick={() => {
                        setTableMenuOpen(false)
                        importInput.current?.click()
                      }}
                    >
                      <Glyph name="import" size={13} />
                      Import…
                    </button>
                  </li>
                  <li>
                    <button
                      role="menuitem"
                      title="the clean slate — a lone salary card, authored cards and saved hands cleared"
                      onClick={() => {
                        setTableMenuOpen(false)
                        handleReset()
                      }}
                    >
                      <Glyph name="flame" size={13} />
                      Reset…
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>
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
        doc={playDoc}
        sim={sim}
        mc={mc}
        scrub={scrub}
        onScrub={setScrub}
        focus={arenaFocus}
        compare={arenaCompare}
        // the workbench covers the lower table and only the chart can rescale
        // into the strip left above it — an opened hand's ring cannot, so it
        // waits (openHandId survives) and reappears when the bench folds away
        trail={workshopOpen ? [] : trail}
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
        onSaveHand={handleSaveHand}
        onOpenReport={() => setReport('table')}
        onOpenHandReport={(handId) => setReport({ hand: handId })}
      />

      <footer
        className="hand-strip"
        onPointerDown={(e) => (stripDown.current = { x: e.clientX, y: e.clientY, closes: stripCloses })}
        onClick={(e) => {
          const down = stripDown.current
          stripDown.current = null
          if (!down?.closes) return
          if ((e.target as HTMLElement).closest('button, input')) return
          if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return
          setOpenHandId(null)
        }}
      >
        <Fan
          hand={root}
          geometry={MAIN_FAN}
          onReorder={handleReorder}
          onGroup={handleGroup}
          onItemClick={(card) => {
            if (stripCloses) {
              setOpenHandId(null)
              return
            }
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
                onReport={(handId) => setReport({ hand: handId })}
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

      <FuturesReport open={report === 'table'} mc={mc} doc={playDoc} onClose={() => setReport(null)} />

      {/* a compare contender's futures, unfolded — the same report the plain chart's odds open */}
      <FuturesReport open={report === 'compare-a'} mc={arenaCompare?.mcA ?? null} doc={compareState?.docA ?? playDoc} onClose={() => setReport(null)} />
      <FuturesReport open={report === 'compare-b'} mc={arenaCompare?.mcB ?? null} doc={compareState?.docB ?? playDoc} onClose={() => setReport(null)} />

      <BundleReport handId={typeof report === 'object' && report !== null ? report.hand : null} mc={mc} doc={playDoc} onClose={() => setReport(null)} />

      <DrawPile
        open={drawerOpen}
        targetName={openHand ? (openHand.name ?? openHand.id) : (root.name ?? 'Your plan')}
        authored={library}
        savedHands={savedHands}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        onChooseRef={dealRef}
        onDealNode={dealNode}
        onSaveTarget={() => handleSaveHand(openHand?.id ?? null)}
        onDealSaved={handleDealSaved}
        onBurnSaved={handleBurnSaved}
      />

      {/* the compare fixture: one card back beside the draw pile — anything
          that can be a plan may challenge the table, so it is always there.
          While a comparison plays, the card turns over into the challenger. */}
      {!compareSel && (
        <button
          className="duel"
          onClick={() => {
            setOpenHandId(null) // the comparison lives on the chart — fold any opened hand
            const lastSaved = savedHands[savedHands.length - 1]
            setCompareSel(lastSaved ? { kind: 'saved', id: lastSaved.id } : { kind: 'preset', id: PRESETS[0]!.id })
          }}
          title="Compare — the table against a saved hand, a preset, or a single card, on one chart"
          aria-label="Compare the table against another plan"
        >
          <span className="duel-card" aria-hidden="true">
            <span className="duel-word">Compare</span>
          </span>
        </button>
      )}

      {/* comparing: the fixture's spot holds the challenger, turned over —
          the card back wears the pick's name; the table is always the solid
          line, so this one card is the whole choosing, and clicking it again
          turns the comparison off */}
      {compareSel && (
        <ComparePicks
          sel={compareSel}
          savedHands={savedHands}
          library={library}
          onChange={setCompareSel}
          onExit={() => {
            setCompareSel(null)
            setReport((r) => (r === 'compare-a' || r === 'compare-b' ? null : r))
          }}
        />
      )}

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
        savedHands={savedHands}
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
