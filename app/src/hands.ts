import type { Card, HandCard } from '@finsim/engine'
import type { Doc } from './model'

/**
 * App-side tree operations on the document's root hand. The engine owns the
 * card model (types, findCard, setHandEnabled); these are the edit gestures:
 * add, remove, reorder.
 */

export function findParentHand(hand: HandCard, cardId: string): HandCard | null {
  for (const child of hand.children) {
    if (child.id === cardId) return hand
    if (child.kind === 'hand') {
      const found = findParentHand(child, cardId)
      if (found) return found
    }
  }
  return null
}

/** Append a card to a hand (root when handId is null). */
export function addCard(doc: Doc, handId: string | null, card: Card): void {
  const target = handId === null ? doc.table.root : findHandById(doc.table.root, handId)
  ;(target ?? doc.table.root).children.push(card)
}

function findHandById(hand: HandCard, id: string): HandCard | null {
  if (hand.id === id) return hand
  for (const child of hand.children) {
    if (child.kind === 'hand') {
      const found = findHandById(child, id)
      if (found) return found
    }
  }
  return null
}

/** Remove a card (a hand goes with everything in it). */
export function removeCard(doc: Doc, cardId: string): void {
  const parent = findParentHand(doc.table.root, cardId)
  if (!parent) return
  parent.children = parent.children.filter((c) => c.id !== cardId)
}

/** Move a card up or down within its hand — order is the calculation. */
export function moveCard(doc: Doc, cardId: string, direction: -1 | 1): void {
  const parent = findParentHand(doc.table.root, cardId)
  if (!parent) return
  const index = parent.children.findIndex((c) => c.id === cardId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= parent.children.length) return
  const tmp = parent.children[index]!
  parent.children[index] = parent.children[target]!
  parent.children[target] = tmp
}
