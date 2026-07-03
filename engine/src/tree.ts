import type { Card, HandCard, Table } from './types.js'

/** Tree helpers for the one root hand a table is made of. */

export function findCard(root: HandCard, id: string): Card | null {
  for (const child of root.children) {
    if (child.id === id) return child
    if (child.kind === 'hand') {
      const found = findCard(child, id)
      if (found) return found
    }
  }
  return null
}

/** Every card in the tree, depth-first, root excluded. */
export function allCards(root: HandCard): Card[] {
  return root.children.flatMap((c) => (c.kind === 'hand' ? [c, ...allCards(c)] : [c]))
}

/** Returns a copy of the table with one hand toggled — ghost compares are just two `simulate` calls. */
export function setHandEnabled(table: Table, handId: string, enabled: boolean): Table {
  const found = findCard(table.root, handId)
  if (!found || found.kind !== 'hand') {
    throw new Error(`setHandEnabled: unknown hand "${handId}"`)
  }
  // tables are plain JSON by design (DESIGN.md §3); JSON round-trip is a faithful clone
  const next = JSON.parse(JSON.stringify(table)) as Table
  const hand = findCard(next.root, handId) as HandCard
  hand.enabled = enabled
  return next
}
