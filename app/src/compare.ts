import { firstCrossing, goalDelta, simulate, type GoalDelta, type Series } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { builtinSeriesOf } from './builtins'
import { canonicalOf, instanceOf, refBase, type HandNode } from './instances'
import { effectiveHorizon, playedTable, type Doc } from './model'
import { PRESETS, type HandPreset } from './presets'
import type { SavedHand } from './savedHands'
import { addSeries } from './seriesImport'

/**
 * Comparison — the reason saved hands exist, generalized to any challenger.
 * Two contenders, each a whole plan — the table as it stands, a saved hand, a
 * preset hand, or a single card played as a one-card plan — simulate on
 * otherwise identical docs and are judged the product's one way: a
 * time-to-goal delta. "What does the car actually cost me" is runCompare on
 * the table and the no-car hand saved yesterday; "what if I did nothing but
 * this fund" is the same call with the fund card alone as the rival.
 */

export type Contender =
  | { type: 'table' }
  | { type: 'saved'; saved: SavedHand }
  /** A single canonical card — a design id or a built-in ref — as a one-card plan. */
  | { type: 'card'; ref: string }
  | { type: 'preset'; preset: HandPreset }

/**
 * What the challenger picker holds in App state: a pointer, not the thing —
 * saved hands and libraries move under it, so it resolves fresh every run.
 */
export type CompareSel = { kind: 'saved'; id: string } | { kind: 'card'; ref: string } | { kind: 'preset'; id: string }

/** One string per pick — equality checks and React keys go through here. */
export function selKey(sel: CompareSel): string {
  return sel.kind === 'card' ? `card:${sel.ref}` : `${sel.kind}:${sel.id}`
}

/** The contender a pick points at right now — null when nothing answers (burned hand, lost design). */
export function resolveContender(sel: CompareSel, savedHands: SavedHand[], library: AuthoredCard[]): Contender | null {
  switch (sel.kind) {
    case 'saved': {
      const saved = savedHands.find((s) => s.id === sel.id)
      return saved ? { type: 'saved', saved } : null
    }
    case 'card':
      return canonicalOf(sel.ref, library) ? { type: 'card', ref: sel.ref } : null
    case 'preset': {
      const preset = PRESETS.find((p) => p.id === sel.id)
      return preset ? { type: 'preset', preset } : null
    }
  }
}

export function contenderLabel(c: Contender, library: AuthoredCard[] = []): string {
  switch (c.type) {
    case 'table':
      return 'The table now'
    case 'saved':
      return c.saved.name
    case 'card':
      return canonicalOf(c.ref, library)?.card.name ?? refBase(c.ref)
    case 'preset':
      return c.preset.name
  }
}

/** The challenger's root: a saved snapshot, a preset built fresh, or one card in a hand of its own. */
function contenderRoot(c: Exclude<Contender, { type: 'table' }>): HandNode {
  switch (c.type) {
    case 'saved':
      return structuredClone(c.saved.hand)
    case 'card':
      return { id: 'challenger-root', kind: 'hand', children: [instanceOf(c.ref, 'challenger')] }
    case 'preset':
      return c.preset.build('challenger')
  }
}

/**
 * The doc a contender plays: the current doc itself, or the same doc (from,
 * goal, cash, world) with the challenger as its root. The challenger's
 * carried series merge into the world the way a deal merges them (data
 * already on the table wins); its take goes — a root has no parent to take
 * from. Set-asides play as saved. The base doc is never touched.
 */
export function contenderDoc(base: Doc, c: Contender): Doc {
  if (c.type === 'table') return base
  const root = contenderRoot(c)
  delete root.take
  // dials riding the dropped take would scale nothing — drop them too
  if (root.tune) {
    for (const path of Object.keys(root.tune)) if (path.startsWith('take.')) delete root.tune[path]
    if (Object.keys(root.tune).length === 0) delete root.tune
  }
  const doc: Doc = { ...base, table: { ...(base.table.cash ? { cash: base.table.cash } : {}), root } }
  if (c.type === 'saved') addSeries(doc, c.saved.series)
  else if (c.type === 'card') addSeries(doc, builtinSeriesOf(c.ref))
  else addSeries(doc, c.preset.series)
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
    return { label: contenderLabel(c, library), netWorth: sim.netWorth, crossing: firstCrossing(sim, base.goal) }
  }
  const ra = play(docA, a)
  const rb = play(docB, b)
  return { a: ra, b: rb, delta: goalDelta(ra.netWorth, rb.netWorth, base.goal), goal: base.goal, from: base.from, horizonMonths }
}
