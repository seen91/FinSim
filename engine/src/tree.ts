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

/** Returns a copy of the table with one card removed — the per-card ghost is just another `simulate` call. */
export function withoutCard(table: Table, cardId: string): Table {
  if (!findCard(table.root, cardId)) {
    throw new Error(`withoutCard: unknown card "${cardId}"`)
  }
  // tables are plain JSON by design (DESIGN.md §3); JSON round-trip is a faithful clone
  const next = JSON.parse(JSON.stringify(table)) as Table
  const prune = (hand: HandCard): void => {
    hand.children = hand.children.filter((c) => c.id !== cardId)
    for (const child of hand.children) if (child.kind === 'hand') prune(child)
  }
  prune(next.root)
  return next
}

/** Returns a copy of the table with one card set aside or brought back — ghost compares are just two `simulate` calls. */
export function setCardEnabled(table: Table, cardId: string, enabled: boolean): Table {
  if (!findCard(table.root, cardId)) {
    throw new Error(`setCardEnabled: unknown card "${cardId}"`)
  }
  // tables are plain JSON by design (DESIGN.md §3); JSON round-trip is a faithful clone
  const next = JSON.parse(JSON.stringify(table)) as Table
  const card = findCard(next.root, cardId)!
  card.enabled = enabled
  return next
}
