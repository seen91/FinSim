import type { SampledData } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { isInstance, nodesIn, remintNode, type HandNode } from './instances'
import { seriesIdsInNode } from './seriesImport'

/**
 * Saved hands: a whole hand — the root included — snapshotted to the draw
 * pile and dealt back later as a fresh, fully editable composition. The
 * snapshot keeps what the table held: instances (ref + dials + set-aside)
 * and nested hands with their names, takes and glyphs. Nothing is sealed —
 * dealing unpacks the same tree with fresh ids, so two deals of one saved
 * hand live side by side and every instance still follows its canonical
 * card. Like a pack, a saved hand carries the world series its cards wear,
 * so it survives a table that has since lost them.
 */
export interface SavedHand {
  /** The name IS the id (identity.ts): saving under a taken name replaces that hand. */
  id: string
  name: string
  /** The snapshot subtree — instances and nested hands, per-copy state riding along. */
  hand: HandNode
  /** Series the hand's cards sample — merged into `world.series` on deal (like a pack). */
  series?: Record<string, SampledData>
}

/** Snapshot a hand on the table into a saved hand — a deep copy, nothing shared. */
export function snapshotHand(
  hand: HandNode,
  name: string,
  library: AuthoredCard[],
  worldSeries?: Record<string, SampledData>,
): SavedHand {
  const snapshot = structuredClone(hand)
  snapshot.name = name
  const worn = new Set(seriesIdsInNode(snapshot, library))
  const series = Object.fromEntries(Object.entries(worldSeries ?? {}).filter(([id]) => worn.has(id)))
  return { id: name, name, hand: snapshot, ...(Object.keys(series).length > 0 ? { series } : {}) }
}

/**
 * Deal a saved hand back onto the table: the same tree, unpacked, every node
 * wearing a fresh id (per node — a hand may hold two copies of one design).
 */
export function unpackSavedHand(saved: SavedHand, freshUid: () => string): HandNode {
  return remintNode(structuredClone(saved.hand), freshUid) as HandNode
}

/** How many cards a saved hand holds — instances and raw cards count, hands don't. */
export function countLeaves(hand: HandNode): number {
  return [...nodesIn(hand)].filter((n) => isInstance(n) || n.kind !== 'hand').length
}
