import { allCards, firstCrossing, goalDelta, simulate, valueAt, withoutCard, type Card, type GoalDelta, type Series, type SimResult, type Table, type World } from '@finsim/engine'
import { useCallback, useState } from 'react'
import { stripRiders, type AuthoredCard } from './authored'
import { builtinMatching, normalizedMath } from './builtins'
import { glyphOf } from './glyph'
import { isInstance, resolveTable, type AppTable, type CardInstance, type TableNode } from './instances'
import { applyTuneTable, type Tune } from './tune'
import { UID_SUFFIX } from './uid'

/**
 * The one small immutable document the whole table serializes to (DESIGN.md
 * §2). Backtesting has no field of its own: `from` IS the backtest control —
 * a table started in the past samples its historical series on their real
 * dates, and every other card computes as usual.
 *
 * The table's leaves are instances (instances.ts): a reference to a canonical
 * card plus per-copy state. Resolution to plain engine cards happens at the
 * sim boundary, so a Workshop edit of a design reaches every copy on the
 * table by construction.
 */
export interface Doc {
  table: AppTable
  /** Rules and data series the table plays under (locale packs, events). */
  world?: World
  goal: number
  from: number
  horizonMonths: number
}

/**
 * What the sim actually plays: instances resolved to their canonical cards,
 * then the dials applied and stripped — all at the boundary, so the authored
 * doc never moves.
 */
export function playedTable(doc: Doc, library: AuthoredCard[] = []): { table: Table; world: World } {
  return { table: applyTuneTable(resolveTable(doc.table, library)), world: doc.world ?? {} }
}

/**
 * Lift old vocabulary and old shapes in saved/imported docs, in place; the
 * designs it mints from edited orphans are returned for the library.
 *
 * - the playable 'event' kind became 'rule' when its scope turned positional
 * - the short-lived replay anchor (`replayFrom`, 2026-07-12) became the start
 *   date itself — same months sampled, goal dates on the historical timeline
 * - a leaf that is a full engine card (pre-instances, 2026-07-14) becomes an
 *   instance: a copy stamped with a design the library holds follows its
 *   design; an unedited one-off recognizable as a built-in re-points at the
 *   built-in; an edited orphan is minted into the library (one design per
 *   distinct math) and its copies all point there.
 */
export function migrateDoc(doc: Doc, library: AuthoredCard[] = []): AuthoredCard[] {
  const legacy = doc as Doc & { replayFrom?: number }
  if (typeof legacy.replayFrom === 'number' && Number.isInteger(legacy.replayFrom)) {
    doc.from = legacy.replayFrom
    delete legacy.replayFrom
  }

  const minted: AuthoredCard[] = []
  const taken = new Set(library.map((a) => a.id))
  const mintedByMath = new Map<string, string>()

  const designId = (base: string): string => {
    let id = base
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
    taken.add(id)
    return id
  }

  const mintOrphan = (card: Card): string => {
    const math = normalizedMath(card)
    const existing = mintedByMath.get(math)
    if (existing) return existing
    const template = stripRiders(card)
    const id = designId(card.id.replace(UID_SUFFIX, ''))
    template.id = id
    if (template.kind === 'rule') template.rule.id = `${id}-rule`
    minted.push({ id, glyph: glyphOf(card), description: '', card: template })
    mintedByMath.set(math, id)
    return id
  }

  const migrateLeaf = (card: Card & { design?: string; tune?: Tune }): CardInstance => {
    // a stamped copy follows its design; copies dealt before the stamp
    // existed carry the design's id plus one fresh suffix
    const suffixless = card.id.replace(UID_SUFFIX, '')
    const ref =
      (card.design && taken.has(card.design) ? card.design : null) ??
      (suffixless !== card.id && taken.has(suffixless) ? suffixless : null) ??
      builtinMatching(card) ??
      mintOrphan(card)
    const instance: CardInstance = { id: card.id, ref }
    if (card.tune && Object.keys(card.tune).length > 0) instance.tune = card.tune
    if (card.enabled === false) instance.enabled = false
    return instance
  }

  const lift = (node: TableNode): TableNode => {
    if (isInstance(node)) return node
    if ((node.kind as string) === 'event') (node as { kind: string }).kind = 'rule'
    if (node.kind === 'hand') {
      node.children = node.children.map(lift)
      return node
    }
    return migrateLeaf(node)
  }

  doc.table.root.children = doc.table.root.children.map(lift)
  return minted
}

export interface CardCompare {
  cardId: string
  name: string
  /** Time-to-goal comparison, always phrased as without → with the card. */
  delta: GoalDelta
  /**
   * When this card ALONE reaches the goal (null if never within the horizon).
   * A property of the card itself — nothing else on the table moves it.
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
  compares: CardCompare[]
  /** The table as the sim played it (untuned) — what card faces render from. */
  resolvedRoot: Table['root']
}

/**
 * What the table's debt cards owe at a month: the sum of enabled debt
 * balances (negative), 0 once everything is paid off. The chart's scrub
 * readout adds any cash overdraft on top and shows the total as one
 * "debt" figure — hovering tells the whole borrowing story.
 */
export function debtAt(sim: Sim, month: number): number {
  let sum = 0
  const walk = (hand: Table['root']): void => {
    for (const card of hand.children) {
      if (card.enabled === false) continue
      if (card.kind === 'debt') {
        const s = sim.active.balances.find((b) => b.id === card.id)
        if (s) sum += valueAt(s, month)
      } else if (card.kind === 'hand') {
        walk(card)
      }
    }
  }
  walk(sim.resolvedRoot)
  return sum
}

/**
 * No hidden state: what-if diffs are just more simulate calls. EVERY card on
 * the table (hands included, wherever they sit) auto-computes the plan
 * without itself and itself alone, so its time-to-goal verdict sits on the
 * card's own face — no toggle, no extra curves on the chart.
 *
 * Everything is nominal: inflation and taxes are modeled on the cards
 * themselves (an explicit % drain, or a lowered expected return), not as
 * global views or locale toggles.
 */
export function runSim(doc: Doc, library: AuthoredCard[] = []): Sim {
  const to = doc.from + doc.horizonMonths - 1
  // resolve once: the sim plays it tuned (dials applied and stripped), the card faces render it untuned
  const resolved = resolveTable(doc.table, library)
  const table = applyTuneTable(resolved)
  const world = doc.world ?? {}
  const active = simulate(table, world, doc.from, to)
  const points = new Array<number>(doc.horizonMonths).fill(0)
  for (const child of table.root.children) {
    const s = active.contributions.find((c) => c.id === child.id)
    if (!s) continue
    for (let i = 0; i < points.length; i++) points[i] = points[i]! + (s.points[i] ?? 0)
  }
  const remainder: Series = { id: 'remainder', role: 'net', startMonth: doc.from, points }
  // a set-aside card is already out of the sim — its ghost would equal the plan, so no verdict
  const compares = allCards(table.root)
    .filter((card) => card.enabled !== false)
    .map((card) => {
      const ghost = simulate(withoutCard(table, card.id), world, doc.from, to)
      // solo intentionally starts from nothing — no cash config, no siblings
      const alone = simulate({ root: { id: `solo-${card.id}`, kind: 'hand', children: [card] } }, world, doc.from, to)
      return {
        cardId: card.id,
        name: card.name ?? card.id,
        delta: goalDelta(ghost, active, doc.goal),
        soloGoalMonth: firstCrossing(alone, doc.goal),
      }
    })
  return { active, remainder, compares, resolvedRoot: resolved.root }
}

export interface DocStore {
  doc: Doc
  /** Apply a mutation to a fresh clone of the current document. */
  update: (mutate: (doc: Doc) => void) => void
  replace: (doc: Doc) => void
}

export function useDoc(initial: Doc): DocStore {
  const [doc, setDoc] = useState(initial)

  const update = useCallback((mutate: (doc: Doc) => void) => {
    setDoc((d) => {
      const next = structuredClone(d)
      mutate(next)
      return next
    })
  }, [])

  return { doc, update, replace: setDoc }
}
