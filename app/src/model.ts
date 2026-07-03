import {
  goalDelta,
  setBundleEnabled,
  simulate,
  type GoalDelta,
  type SimResult,
  type Table,
} from '@finsim/engine'
import { useCallback, useState } from 'react'

/** The one small immutable document the whole table serializes to (DESIGN.md §2). */
export interface Doc {
  table: Table
  goal: number
  from: number
  horizonMonths: number
}

export interface BundleCompare {
  bundleId: string
  name: string
  enabled: boolean
  /** Simulation with this bundle toggled the other way — the ghost curve. */
  flipped: SimResult
  /** Time-to-goal comparison, always phrased as without → with the bundle. */
  delta: GoalDelta
}

export interface Sim {
  active: SimResult
  compares: BundleCompare[]
}

/** No hidden state: ghosts and what-if diffs are just more simulate calls. */
export function runSim(doc: Doc): Sim {
  const to = doc.from + doc.horizonMonths - 1
  const active = simulate(doc.table, {}, doc.from, to)
  const compares = (doc.table.bundles ?? []).map((bundle) => {
    const flipped = simulate(setBundleEnabled(doc.table, bundle.id, !bundle.enabled), {}, doc.from, to)
    const withOff = bundle.enabled ? flipped : active
    const withOn = bundle.enabled ? active : flipped
    return {
      bundleId: bundle.id,
      name: bundle.name ?? bundle.id,
      enabled: bundle.enabled,
      flipped,
      delta: goalDelta(withOff, withOn, doc.goal),
    }
  })
  return { active, compares }
}

interface History {
  docs: Doc[]
  index: number
  /** Label of the last update, for coalescing slider drags into one undo step. */
  label: string | null
}

export interface DocStore {
  doc: Doc
  /** Apply a mutation to a fresh clone. Same label as the previous update → coalesce. */
  update: (label: string, mutate: (doc: Doc) => void) => void
  /** Seal the current undo step (call on slider release). */
  commit: () => void
  replace: (doc: Doc) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const MAX_HISTORY = 200

export function useDoc(initial: Doc): DocStore {
  const [history, setHistory] = useState<History>({ docs: [initial], index: 0, label: null })

  const update = useCallback((label: string, mutate: (doc: Doc) => void) => {
    setHistory((h) => {
      const next = structuredClone(h.docs[h.index]!)
      mutate(next)
      const coalesce = h.label !== null && h.label === label
      const kept = h.docs.slice(0, coalesce ? h.index : h.index + 1)
      const docs = [...kept, next].slice(-MAX_HISTORY)
      return { docs, index: docs.length - 1, label }
    })
  }, [])

  const commit = useCallback(() => setHistory((h) => ({ ...h, label: null })), [])
  const replace = useCallback((doc: Doc) => setHistory({ docs: [doc], index: 0, label: null }), [])
  const undo = useCallback(
    () => setHistory((h) => ({ ...h, index: Math.max(0, h.index - 1), label: null })),
    [],
  )
  const redo = useCallback(
    () => setHistory((h) => ({ ...h, index: Math.min(h.docs.length - 1, h.index + 1), label: null })),
    [],
  )

  return {
    doc: history.docs[history.index]!,
    update,
    commit,
    replace,
    undo,
    redo,
    canUndo: history.index > 0,
    canRedo: history.index < history.docs.length - 1,
  }
}
