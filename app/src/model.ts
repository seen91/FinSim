import { allCards, firstCrossing, goalDelta, simulate, valueAt, withoutCard, type Card, type GoalDelta, type Series, type SimResult, type Table, type World } from '@finsim/engine'
import { stampCardId, stripRiders, type AuthoredCard } from './authored'
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
  /** Explicit horizon, or null = auto: the chart runs a scaled margin (up to three years) past the goal crossing. */
  horizonMonths: number | null
}

/** A doc whose horizon has been resolved to a concrete number — what the sim boundary consumes. */
export type PlayedDoc = Doc & { horizonMonths: number }

/** The kinds that hold a balance (asset, debt, margin) — everything else moves flow or scaffolds. */
export function isBalanceKind(kind: Card['kind']): boolean {
  return kind === 'asset' || kind === 'debt' || kind === 'margin'
}

/**
 * What the sim actually plays: instances resolved to their canonical cards,
 * then the dials applied and stripped — all at the boundary, so the authored
 * doc never moves.
 */
export function playedTable(doc: Doc, library: AuthoredCard[] = []): { table: Table; world: World } {
  return { table: applyTuneTable(resolveTable(doc.table, library)), world: doc.world ?? {} }
}

/** The most after-story an auto horizon shows past the goal crossing. */
const AUTO_MARGIN_MAX_MONTHS = 3 * 12
/** The least after-story, so a near-instant goal still shows the plan holding. */
const AUTO_MARGIN_MIN_MONTHS = 3
/** How far the auto probe looks for the crossing before giving up. */
const AUTO_CAP_MONTHS = 100 * 12
/** The auto horizon when the goal is never reached within the cap. */
const AUTO_FALLBACK_MONTHS = 30 * 12

/** After-story proportional to the journey — half the months-to-goal, clamped to [3mo, 3y]. */
function autoMargin(monthsToGoal: number): number {
  return Math.min(AUTO_MARGIN_MAX_MONTHS, Math.max(AUTO_MARGIN_MIN_MONTHS, Math.round(monthsToGoal / 2)))
}

/**
 * Resolve the doc's horizon: an explicit one passes through; the auto one
 * (null) runs a single deterministic probe and ends the table a margin past
 * the month the goal is first reached — the x-axis follows the goal. The
 * margin scales with the journey (half of it, at most three years, at least
 * three months) so a short plan isn't drowned in after-story. A table the
 * probe cannot play falls back to 30 years; the real sim will surface the
 * error itself.
 */
export function effectiveHorizon(doc: Doc, library: AuthoredCard[] = []): number {
  if (doc.horizonMonths !== null) return doc.horizonMonths
  try {
    const { table, world } = playedTable(doc, library)
    const probe = simulate(table, world, doc.from, doc.from + AUTO_CAP_MONTHS - 1)
    const cross = firstCrossing(probe, doc.goal)
    if (cross === null) return AUTO_FALLBACK_MONTHS
    const monthsToGoal = cross - doc.from + 1
    return monthsToGoal + autoMargin(monthsToGoal)
  } catch {
    return AUTO_FALLBACK_MONTHS
  }
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
    stampCardId(template, id)
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
  /**
   * Net worth with the card minus without it, read at worthMonth — the kr the
   * card lifts (positive) or weighs down (negative) the plan, lost/earned
   * compounding included.
   */
  worthDelta: number
  /** Where worthDelta is read: the plan's goal month, or the last simulated month when the goal is never reached. */
  worthMonth: number
}

export interface Sim {
  active: SimResult
  /**
   * What fell off the bottom of the root each month — the flow into cash.
   * Exactly the sum of the root's direct children's contributions.
   */
  remainder: Series
  compares: CardCompare[]
  /** The resolved table (dials still riding) — card faces apply them per card when rendering. */
  resolvedRoot: Table['root']
  /** The world it played under — faces resolve priced cards' series through it. */
  world: World
}

/**
 * What the table's debt and margin cards owe at a month: the sum of their
 * enabled balances (negative), 0 once everything is paid off. The chart's scrub
 * readout adds any cash overdraft on top and shows the total as one
 * "debt" figure — hovering tells the whole borrowing story.
 */
export function debtAt(sim: Sim, month: number): number {
  let sum = 0
  const walk = (hand: Table['root']): void => {
    for (const card of hand.children) {
      if (card.enabled === false) continue
      if (card.kind === 'debt' || card.kind === 'margin') {
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
  const horizonMonths = effectiveHorizon(doc, library)
  const to = doc.from + horizonMonths - 1
  // resolve once: the sim plays it tuned (dials applied and stripped); the faces get the resolved root with dials still riding
  const resolved = resolveTable(doc.table, library)
  const table = applyTuneTable(resolved)
  const world = doc.world ?? {}
  const active = simulate(table, world, doc.from, to)
  const points = new Array<number>(horizonMonths).fill(0)
  for (const child of table.root.children) {
    const s = active.contributions.find((c) => c.id === child.id)
    if (!s) continue
    for (let i = 0; i < points.length; i++) points[i] = points[i]! + (s.points[i] ?? 0)
  }
  const remainder: Series = { id: 'remainder', role: 'net', startMonth: doc.from, points }
  // a set-aside card is already out of the sim — its ghost would equal the plan, so no verdict
  const worthMonth = firstCrossing(active, doc.goal) ?? to
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
        worthDelta: valueAt(active.netWorth, worthMonth) - valueAt(ghost.netWorth, worthMonth),
        worthMonth,
      }
    })
  return { active, remainder, compares, resolvedRoot: resolved.root, world }
}
