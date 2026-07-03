import { setBundleEnabled } from '@finsim/engine'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Readout } from './components/Readout'
import { TableView } from './components/TableView'
import { Timeline } from './components/Timeline'
import { clearDoc, loadDoc, saveDoc } from './db'
import { runSim, useDoc } from './model'
import { starterDoc } from './starter'

export function App(): ReactElement {
  const store = useDoc(starterDoc())
  const { doc } = store
  const [scrubRaw, setScrub] = useState(doc.from)
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
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <Timeline sim={sim} goal={doc.goal} from={doc.from} horizonMonths={doc.horizonMonths} scrub={scrub} onScrub={setScrub} />

      <Readout sim={sim} goal={doc.goal} />

      <TableView
        table={doc.table}
        sim={sim}
        scrub={scrub}
        onEditStack={(label, stackId, mutate) =>
          store.update(label, (d) => {
            const stack = d.table.stacks.find((s) => s.id === stackId)
            if (stack) mutate(stack)
          })
        }
        onEditStream={(label, streamId, mutate) =>
          store.update(label, (d) => {
            const stream = d.table.streams.find((s) => s.id === streamId)
            if (stream) mutate(stream)
          })
        }
        onToggleBundle={(bundleId, enabled) =>
          store.update(`bundle:${bundleId}:${enabled}`, (d) => {
            d.table = setBundleEnabled(d.table, bundleId, enabled)
          })
        }
        onCommit={store.commit}
      />
    </div>
  )
}
