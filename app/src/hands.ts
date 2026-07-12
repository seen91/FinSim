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

/** Swap a card in place with an edited version of itself (same id) — the Workshop's commit. */
export function replaceCard(doc: Doc, card: Card): void {
  if (card.id === doc.table.root.id) return // the root hand is fixture, not card
  const parent = findParentHand(doc.table.root, card.id)
  if (!parent) return
  const i = parent.children.findIndex((c) => c.id === card.id)
  if (i >= 0) parent.children[i] = card
}

/**
 * Drag-reorder: move a card to `toIndex` within its own hand. Cross-hand
 * moves don't exist — a card leaves a hand only via the draw pile.
 */
export function moveCard(doc: Doc, cardId: string, toIndex: number): void {
  const parent = findParentHand(doc.table.root, cardId)
  if (!parent) return
  const from = parent.children.findIndex((c) => c.id === cardId)
  if (from < 0) return
  const [moved] = parent.children.splice(from, 1)
  parent.children.splice(Math.max(0, Math.min(parent.children.length, toIndex)), 0, moved!)
}
