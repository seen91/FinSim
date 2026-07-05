import { firstCrossing, goalDelta, setHandEnabled, simulate, type GoalDelta, type HandCard, type Series, type SimResult, type Table } from '@finsim/engine'
import { useCallback, useState } from 'react'

/** The one small immutable document the whole table serializes to (DESIGN.md §2). */
export interface Doc {
  table: Table
  goal: number
  from: number
  horizonMonths: number
}

export interface HandCompare {
  handId: string
  name: string
  /** Simulation of the plan WITHOUT this bundle — the ghost curve. */
  flipped: SimResult
  /** Time-to-goal comparison, always phrased as without → with the bundle. */
  delta: GoalDelta
  /**
   * When this hand ALONE reaches the goal (null if never within the horizon).
   * A property of the hand itself — nothing else on the table moves it.
   */
  soloGoalMonth: number | null
}

export interface Sim {
  active: SimResult
  /**
   * What fell off the bottom of the root each month — the flow into cash.
   * Exactly the sum of the root's direct children's contributions.
   */
  remainder: Series
  compares: HandCompare[]
}

/**
 * No hidden state: what-if diffs are just more simulate calls. Every decision
 * bundle (a hand played directly into the main hand) auto-computes the plan
 * without itself, so its time-to-goal cost sits on the bundle's own stack —
 * no toggle, no extra curves on the chart.
 */
export function runSim(doc: Doc): Sim {
  const to = doc.from + doc.horizonMonths - 1
  const active = simulate(doc.table, {}, doc.from, to)
  const points = new Array<number>(doc.horizonMonths).fill(0)
  for (const child of doc.table.root.children) {
    const s = active.contributions.find((c) => c.id === child.id)
    if (!s) continue
    for (let i = 0; i < points.length; i++) points[i] = points[i]! + (s.points[i] ?? 0)
  }
  const remainder: Series = { id: 'remainder', role: 'net', startMonth: doc.from, points }
  const bundles = doc.table.root.children.filter((c): c is HandCard => c.kind === 'hand')
  const compares = bundles.map((hand) => {
    const withoutBundle = simulate(setHandEnabled(doc.table, hand.id, false), {}, doc.from, to)
    const alone = simulate({ root: { id: `solo-${hand.id}`, kind: 'hand', children: [hand] } }, {}, doc.from, to)
    return {
      handId: hand.id,
      name: hand.name ?? hand.id,
      flipped: withoutBundle,
      delta: goalDelta(withoutBundle, active, doc.goal),
      soloGoalMonth: firstCrossing(alone, doc.goal),
    }
  })
  return { active, remainder, compares }
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
