import type { SampledData } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { isInstance, refBase, type HandNode, type TableNode } from './instances'
import { seriesIdsInNode } from './seriesImport'
import { UID_SUFFIX } from './uid'

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
  uid: string,
  library: AuthoredCard[],
  worldSeries?: Record<string, SampledData>,
): SavedHand {
  const snapshot = structuredClone(hand)
  snapshot.name = name
  const worn = new Set(seriesIdsInNode(snapshot, library))
  const series = Object.fromEntries(Object.entries(worldSeries ?? {}).filter(([id]) => worn.has(id)))
  return { id: `saved-${uid}`, name, hand: snapshot, ...(Object.keys(series).length > 0 ? { series } : {}) }
}

/**
 * Deal a saved hand back onto the table: the same tree, unpacked, every node
 * wearing a fresh id (per node — a hand may hold two copies of one design).
 */
export function unpackSavedHand(saved: SavedHand, freshUid: () => string): HandNode {
  return remint(structuredClone(saved.hand), freshUid) as HandNode
}

function remint(node: TableNode, freshUid: () => string): TableNode {
  if (isInstance(node)) return { ...node, id: `${refBase(node.ref)}-${freshUid()}` }
  if (node.kind === 'hand') return { ...node, id: `hand-${freshUid()}`, children: node.children.map((c) => remint(c, freshUid)) }
  // the raw-card door (solo charts, hand-built test tables): same readable-base remint
  node.id = `${node.id.replace(UID_SUFFIX, '')}-${freshUid()}`
  if (node.kind === 'rule') node.rule.id = `${node.id}-rule`
  return node
}

/** How many cards a saved hand holds — instances and raw cards count, hands recurse. */
export function countLeaves(hand: HandNode): number {
  return hand.children.reduce((n, c) => n + (!isInstance(c) && c.kind === 'hand' ? countLeaves(c) : 1), 0)
}
