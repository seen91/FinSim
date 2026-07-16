import { firstCrossing, goalDelta, simulate, type GoalDelta, type Series } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { effectiveHorizon, playedTable, type Doc } from './model'
import type { SavedHand } from './savedHands'
import { addSeries } from './seriesImport'

/**
 * Hand comparison — the reason saved hands exist. Two contenders, each a
 * whole plan (the table as it stands, or a saved hand played as its own
 * root), simulate on otherwise identical docs and are judged the product's
 * one way: a time-to-goal delta. "What does the car actually cost me" is
 * runCompare on the table and the no-car hand saved yesterday.
 */

/** The contender picker id of the live table; saved hands go by their own ids. */
export const COMPARE_TABLE = 'table'

export type Contender = { type: 'table' } | { type: 'saved'; saved: SavedHand }

export function contenderLabel(c: Contender): string {
  return c.type === 'table' ? 'The table now' : c.saved.name
}

/**
 * The doc a contender plays: the current doc itself, or — for a saved hand —
 * the same doc (from, goal, cash, world) with the snapshot as its root. The
 * hand's carried series merge into the world the way a deal merges them
 * (data already on the table wins); its take goes — a root has no parent to
 * take from. Set-asides play as saved. The base doc is never touched.
 */
export function contenderDoc(base: Doc, c: Contender): Doc {
  if (c.type === 'table') return base
  const root = structuredClone(c.saved.hand)
  delete root.take
  // dials riding the dropped take would scale nothing — drop them too
  if (root.tune) {
    for (const path of Object.keys(root.tune)) if (path.startsWith('take.')) delete root.tune[path]
    if (Object.keys(root.tune).length === 0) delete root.tune
  }
  const doc: Doc = { ...base, table: { ...(base.table.cash ? { cash: base.table.cash } : {}), root } }
  addSeries(doc, c.saved.series)
  return doc
}

export interface ContenderRun {
  label: string
  netWorth: Series
  /** The month this plan first (sustainably) reaches the goal — null if never within the horizon. */
  crossing: number | null
}

export interface CompareRun {
  a: ContenderRun
  b: ContenderRun
  /** goalDelta(A, B): positive deltaMonths = B reaches the goal later than A. */
  delta: GoalDelta
  goal: number
  from: number
  /** Shared horizon: the longer of the two contenders' own effective horizons. */
  horizonMonths: number
}

/** Simulate both contenders over one shared horizon and judge B against A. */
export function runCompare(base: Doc, a: Contender, b: Contender, library: AuthoredCard[] = []): CompareRun {
  const docA = contenderDoc(base, a)
  const docB = contenderDoc(base, b)
  const horizonMonths = Math.max(effectiveHorizon(docA, library), effectiveHorizon(docB, library))
  const to = base.from + horizonMonths - 1
  const play = (doc: Doc, c: Contender): ContenderRun => {
    const { table, world } = playedTable(doc, library)
    const sim = simulate(table, world, base.from, to)
    return { label: contenderLabel(c), netWorth: sim.netWorth, crossing: firstCrossing(sim, base.goal) }
  }
  const ra = play(docA, a)
  const rb = play(docB, b)
  return { a: ra, b: rb, delta: goalDelta(ra.netWorth, rb.netWorth, base.goal), goal: base.goal, from: base.from, horizonMonths }
}
