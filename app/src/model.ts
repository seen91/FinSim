import { allCards, firstCrossing, goalDelta, simulate, withoutCard, type Card, type GoalDelta, type Series, type SimResult, type Table, type World } from '@finsim/engine'
import { useCallback, useState } from 'react'
import { applyTuneTable } from './tune'

/** The one small immutable document the whole table serializes to (DESIGN.md §2). */
export interface Doc {
  table: Table
  /** Rules and data series the table plays under (locale packs, events). */
  world?: World
  goal: number
  from: number
  horizonMonths: number
}

/**
 * Lift old vocabulary in saved/imported docs, in place: the playable 'event'
 * kind became 'rule' when its scope turned positional (cards below it).
 */
export function migrateDoc(doc: Doc): Doc {
  const lift = (card: Card): void => {
    if ((card.kind as string) === 'event') (card as { kind: string }).kind = 'rule'
    if (card.kind === 'hand') card.children.forEach(lift)
  }
  doc.table.root.children.forEach(lift)
  return doc
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
export function runSim(doc: Doc): Sim {
  const to = doc.from + doc.horizonMonths - 1
  const world = doc.world ?? {}
  // the sim plays the tuned table: every dial applied, dials stripped
  const table = applyTuneTable(doc.table)
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
  return { active, remainder, compares }
}

/**
 * What the Workshop's focused card puts on the chart: an asset or debt shows
 * its balance; anything else shows its cumulative contribution — what the
 * card has added to (or taken from) the table so far, in its position. Both
 * read straight off the active sim, so edits answer live.
 */
export function cardFocusSeries(sim: Sim, card: Card): Series | null {
  if (card.kind === 'asset' || card.kind === 'debt') {
    return sim.active.balances.find((b) => b.id === card.id) ?? null
  }
  const c = sim.active.contributions.find((s) => s.id === card.id)
  if (!c) return null
  let acc = 0
  return { id: `${card.id}-cumulative`, role: 'net', startMonth: c.startMonth, points: c.points.map((v) => (acc += v)) }
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
