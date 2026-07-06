import { firstCrossing, goalDelta, setHandEnabled, simulate, type Card, type GoalDelta, type HandCard, type Series, type SimResult, type Table, type World } from '@finsim/engine'
import { useCallback, useState } from 'react'

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
 *
 * Everything is nominal: inflation and taxes are modeled on the cards
 * themselves (an explicit % drain, or a lowered expected return), not as
 * global views or locale toggles.
 */
export function runSim(doc: Doc): Sim {
  const to = doc.from + doc.horizonMonths - 1
  const world = doc.world ?? {}
  const active = simulate(doc.table, world, doc.from, to)
  const points = new Array<number>(doc.horizonMonths).fill(0)
  for (const child of doc.table.root.children) {
    const s = active.contributions.find((c) => c.id === child.id)
    if (!s) continue
    for (let i = 0; i < points.length; i++) points[i] = points[i]! + (s.points[i] ?? 0)
  }
  const remainder: Series = { id: 'remainder', role: 'net', startMonth: doc.from, points }
  const bundles = doc.table.root.children.filter((c): c is HandCard => c.kind === 'hand')
  const compares = bundles.map((hand) => {
    const withoutBundle = simulate(setHandEnabled(doc.table, hand.id, false), world, doc.from, to)
    const alone = simulate({ root: { id: `solo-${hand.id}`, kind: 'hand', children: [hand] } }, world, doc.from, to)
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
