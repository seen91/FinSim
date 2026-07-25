import type { Card, CashConfig, HandCard, Table, Take } from '@finsim/engine'
import { stampCardId, type AuthoredCard } from './authored'
import { builtinOf } from './builtins'
import type { GlyphName } from './icons'
import type { Tune } from './tune'

/**
 * One card — instances, not clones (DESIGN.md §0, 2026-07-14). Every leaf
 * card on the table is an INSTANCE of exactly one canonical card: a reference
 * plus per-copy state — the what-if dials, the set-aside flag, and its
 * position in its hand. Name, math, glyph, description and tags live on the
 * canonical card (a library design, or a built-in), so a Workshop
 * edit of the canonical reaches every copy by construction. Hands stay
 * table-only compositions (DESIGN.md §3) and keep their children inline.
 *
 * Instances resolve to plain engine cards at the sim boundary — the same
 * seam where the tuning dials are applied and stripped.
 */

export interface CardInstance {
  /** Table identity — what compares, balances and gestures key on. */
  id: string
  /** The canonical card: a library design's id, or a built-in ref ("pile:…", "preset:…"). */
  ref: string
  /** What-if dials, per copy (tune.ts). */
  tune?: Tune
  /** Set aside — the sim plays without this copy. Default true. */
  enabled?: boolean
}

/** A hand on the table: a real composition, not a reference. */
export interface HandNode {
  id: string
  kind: 'hand'
  name?: string
  take?: Take
  enabled?: boolean
  glyph?: GlyphName
  /** What-if dials on the hand itself (its take), per copy — like an instance's. */
  tune?: Tune
  children: TableNode[]
}

/**
 * What a hand may hold: instances, nested hands — or a plain engine card,
 * passed through untouched. The app only ever deals instances; the raw-card
 * door stays open for solo chart runs and hand-built test tables.
 */
export type TableNode = CardInstance | HandNode | Card

/** The app-side table: same shape as the engine's, instance leaves allowed. */
export interface AppTable {
  root: HandNode
  cash?: CashConfig
}

export function isInstance(node: TableNode): node is CardInstance {
  return 'ref' in node
}

/** A node's display name: hands and raw cards wear one, instances defer to their id. */
export function nodeName(node: TableNode): string {
  return 'name' in node ? (node.name ?? node.id) : node.id
}

/** The readable base of a ref: what follows a built-in's "pile:"/"preset:" prefix, a design id whole. */
export function refBase(ref: string): string {
  return ref.slice(ref.indexOf(':') + 1)
}

/** Deal a fresh instance of a canonical card: readable base + unique suffix. */
export function instanceOf(ref: string, uid: string): CardInstance {
  return { id: `${refBase(ref)}-${uid}`, ref }
}

/**
 * The canonical card behind a ref: your library first (a design), then the
 * built-ins. Null when nothing answers — the table cannot play that instance.
 */
export function canonicalOf(ref: string, library: AuthoredCard[]): AuthoredCard | null {
  return library.find((a) => a.id === ref) ?? builtinOf(ref)
}

/** Resolve one instance to a playable engine card wearing its per-copy state. */
export function resolveInstance(inst: CardInstance, library: AuthoredCard[]): Card {
  const canonical = canonicalOf(inst.ref, library)
  if (!canonical) throw new Error(`card "${inst.id}" plays a design this table does not know ("${inst.ref}")`)
  const card = structuredClone(canonical.card)
  stampCardId(card, inst.id)
  if (inst.enabled === false) card.enabled = false
  const worn = card as Card & { glyph?: GlyphName; tune?: Tune }
  worn.glyph = canonical.glyph
  // dials are per-copy state: only the instance's play, never a canonical's
  delete worn.tune
  if (inst.tune) worn.tune = inst.tune
  return card
}

function resolveNode(node: TableNode, library: AuthoredCard[]): Card {
  if (isInstance(node)) return resolveInstance(node, library)
  if (node.kind === 'hand') return { ...node, children: node.children.map((c) => resolveNode(c, library)) } as HandCard
  return node
}

/**
 * The whole table as the engine sees it: every instance swapped for its
 * canonical card (per-copy id, dials and set-aside riding along). Throws
 * readably on a ref nothing answers to.
 */
export function resolveTable(table: AppTable, library: AuthoredCard[]): Table {
  return { ...table, root: resolveNode(table.root, library) as HandCard }
}

/** Every node in a subtree (the node itself included), depth-first, in table order — the one walk every collector shares. */
export function* nodesIn(node: TableNode): Generator<TableNode> {
  yield node
  if (!isInstance(node) && node.kind === 'hand') for (const child of node.children) yield* nodesIn(child)
}

/** Every instance in a node's subtree (the node itself included), depth-first, in table order. */
export function* instancesIn(node: TableNode): Generator<CardInstance> {
  for (const n of nodesIn(node)) if (isInstance(n)) yield n
}

/** Every ref the table's instances play, deduplicated, in table order. */
export function refsIn(root: HandNode): string[] {
  const refs: string[] = []
  for (const inst of instancesIn(root)) {
    if (!refs.includes(inst.ref)) refs.push(inst.ref)
  }
  return refs
}

/** Find any node — instance, hand or raw card — by id, depth-first (the root itself excluded). */
export function findNode(root: HandNode, id: string): TableNode | null {
  for (const child of root.children) {
    for (const n of nodesIn(child)) if (n.id === id) return n
  }
  return null
}

/** Re-point every instance of one canonical card at another (the built-in mint). */
export function repointInstances(root: HandNode, fromRef: string, toRef: string): void {
  for (const inst of instancesIn(root)) {
    if (inst.ref === fromRef) inst.ref = toRef
  }
}
