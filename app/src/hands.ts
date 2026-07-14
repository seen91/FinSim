import { findNode, isInstance, type HandNode, type TableNode } from './instances'
import type { Doc } from './model'

/**
 * App-side tree operations on the document's root hand. The tree holds
 * instances and hand nodes (instances.ts); these are the edit gestures:
 * add, remove, reorder.
 */

export function findParentHand(hand: HandNode, cardId: string): HandNode | null {
  for (const child of hand.children) {
    if (child.id === cardId) return hand
    if (!isInstance(child) && child.kind === 'hand') {
      const found = findParentHand(child, cardId)
      if (found) return found
    }
  }
  return null
}

/** Append a node to a hand (root when handId is null). */
export function addCard(doc: Doc, handId: string | null, node: TableNode): void {
  const target = handId === null ? doc.table.root : findHandById(doc.table.root, handId)
  ;(target ?? doc.table.root).children.push(node)
}

function findHandById(root: HandNode, id: string): HandNode | null {
  if (root.id === id) return root
  const found = findNode(root, id)
  return found && !isInstance(found) && found.kind === 'hand' ? found : null
}

/** Remove a node (a hand goes with everything in it). */
export function removeCard(doc: Doc, cardId: string): void {
  const parent = findParentHand(doc.table.root, cardId)
  if (!parent) return
  parent.children = parent.children.filter((c) => c.id !== cardId)
}

/**
 * Drag-reorder: move a node to `toIndex` within its own hand. Cross-hand
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
