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

/** Every card below `index` in a hand, nested hands included — the scope a positional card (rule, margin) sees. */
export function cardsBelow(hand: HandCard, index: number): Card[] {
  return hand.children.slice(index + 1).flatMap((c) => (c.kind === 'hand' ? [c, ...allCards(c)] : [c]))
}

/** Assert the card exists, then clone — tables are plain JSON by design (DESIGN.md §3), so a JSON round-trip is a faithful clone. */
function cloneWithCard(table: Table, cardId: string, who: string): Table {
  if (!findCard(table.root, cardId)) {
    throw new Error(`${who}: unknown card "${cardId}"`)
  }
  return JSON.parse(JSON.stringify(table)) as Table
}

/** Returns a copy of the table with one card removed — the per-card ghost is just another `simulate` call. */
export function withoutCard(table: Table, cardId: string): Table {
  const next = cloneWithCard(table, cardId, 'withoutCard')
  const prune = (hand: HandCard): void => {
    hand.children = hand.children.filter((c) => c.id !== cardId)
    for (const child of hand.children) if (child.kind === 'hand') prune(child)
  }
  prune(next.root)
  return next
}

/** Returns a copy of the table with one card set aside or brought back — ghost compares are just two `simulate` calls. */
export function setCardEnabled(table: Table, cardId: string, enabled: boolean): Table {
  const next = cloneWithCard(table, cardId, 'setCardEnabled')
  findCard(next.root, cardId)!.enabled = enabled
  return next
}
