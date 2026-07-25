import type { HandCard } from '@finsim/engine'
import { findNode, isInstance, nodesIn, remintNode, type HandNode, type TableNode } from './instances'
import type { Doc } from './model'

export const NEW_HAND_NAME = 'New hand'

/**
 * App-side tree operations on the document's root hand. The tree holds
 * instances and hand nodes (instances.ts); these are the edit gestures:
 * add, remove, reorder.
 */

/** The hand that directly holds `cardId` — works on the app tree (HandNode) and the resolved engine tree (HandCard) alike. */
export function findParentHand<H extends HandNode | HandCard>(hand: H, cardId: string): H | null {
  for (const n of nodesIn(hand)) {
    if (!isInstance(n) && n.kind === 'hand' && n.children.some((c) => c.id === cardId)) return n as H
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
 * Duplicate a node in place: a deep copy — a hand goes with everything in it,
 * per-copy state (dials, set-asides) riding along — every node wearing a
 * fresh id, landing right after the original in its hand.
 */
export function duplicateCard(doc: Doc, cardId: string, freshUid: () => string): void {
  const parent = findParentHand(doc.table.root, cardId)
  if (!parent) return
  const index = parent.children.findIndex((c) => c.id === cardId)
  const copy = remintNode(structuredClone(parent.children[index]!), freshUid)
  parent.children.splice(index + 1, 0, copy)
}

/**
 * The stack gesture: drop one node onto a sibling in the same hand. Onto a
 * hand, the dropped node joins it (appended — plays last); onto a card, the
 * two pile into a fresh hand born at the target's slot — target first, the
 * dropped card after, the way a pile grows on a table. Returns the fresh
 * hand's id (null when the drop just joined an existing hand, or did nothing).
 */
export function groupOnto(doc: Doc, draggedId: string, ontoId: string, uid: string): string | null {
  if (draggedId === ontoId) return null
  const parent = findParentHand(doc.table.root, draggedId)
  if (!parent) return null
  const dragged = parent.children.find((c) => c.id === draggedId)!
  const onto = parent.children.find((c) => c.id === ontoId)
  if (!onto) return null // siblings only — the fan that was dragged in holds both
  if (!isInstance(onto) && onto.kind === 'hand') {
    parent.children = parent.children.filter((c) => c.id !== draggedId)
    // a raw engine hand types its children Card[]; on the app tree they hold TableNodes
    ;(onto.children as TableNode[]).push(dragged)
    return null
  }
  const hand: HandNode = { id: `hand-${uid}`, kind: 'hand', name: NEW_HAND_NAME, glyph: 'bundle', children: [onto, dragged] }
  parent.children[parent.children.indexOf(onto)] = hand
  parent.children = parent.children.filter((c) => c.id !== draggedId)
  return hand.id
}

/**
 * The inverse of the stack gesture: lift a card out of its hand and drop it
 * on nothing — it leaves, landing in the parent's parent right after the hand
 * it came from. Cards already in the root have nowhere to go: no-op.
 */
export function moveOut(doc: Doc, cardId: string): void {
  const root = doc.table.root
  const hand = findParentHand(root, cardId)
  if (!hand || hand.id === root.id) return
  const grandparent = findParentHand(root, hand.id)
  if (!grandparent) return
  const card = hand.children.find((c) => c.id === cardId)!
  hand.children = hand.children.filter((c) => c.id !== cardId)
  grandparent.children.splice(grandparent.children.indexOf(hand) + 1, 0, card)
}

/**
 * Drag-reorder: move a node to `toIndex` within its own hand. Cross-hand
 * drags don't exist — a card changes hands only by being dropped onto one
 * (groupOnto), lifted out of one (moveOut), or via the draw pile.
 */
export function moveCard(doc: Doc, cardId: string, toIndex: number): void {
  const parent = findParentHand(doc.table.root, cardId)
  if (!parent) return
  const from = parent.children.findIndex((c) => c.id === cardId)
  if (from < 0) return
  const [moved] = parent.children.splice(from, 1)
  parent.children.splice(Math.max(0, Math.min(parent.children.length, toIndex)), 0, moved!)
}
