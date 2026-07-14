import type { Card, CashConfig, HandCard, Table, Take } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { builtinOf } from './builtins'
import type { GlyphName } from './icons'
import type { Tune } from './tune'

/**
 * One card — instances, not clones (DESIGN.md §0, 2026-07-14). Every leaf
 * card on the table is an INSTANCE of exactly one canonical card: a reference
 * plus per-copy state — the what-if dials, the set-aside flag, and its
 * position in its hand. Name, math, glyph, description and tags live on the
 * canonical card (a library design, or a read-only built-in), so a Workshop
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

/** Deal a fresh instance of a canonical card: readable base + unique suffix. */
export function instanceOf(ref: string, uid: string): CardInstance {
  const base = ref.slice(ref.indexOf(':') + 1)
  return { id: `${base}-${uid}`, ref }
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
  card.id = inst.id
  if (card.kind === 'rule') card.rule.id = `${inst.id}-rule`
  if (inst.enabled === false) card.enabled = false
  const worn = card as Card & { glyph?: GlyphName; tune?: Tune }
  worn.glyph = canonical.glyph
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

/** Every ref the table's instances play, deduplicated, in table order. */
export function refsIn(root: HandNode): string[] {
  const refs: string[] = []
  const walk = (node: TableNode): void => {
    if (isInstance(node)) {
      if (!refs.includes(node.ref)) refs.push(node.ref)
    } else if (node.kind === 'hand') {
      node.children.forEach(walk)
    }
  }
  root.children.forEach(walk)
  return refs
}

/** Find any node — instance, hand or raw card — by id, depth-first. */
export function findNode(root: HandNode, id: string): TableNode | null {
  for (const child of root.children) {
    if (child.id === id) return child
    if (!isInstance(child) && child.kind === 'hand') {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}

/** Re-point every instance of one canonical card at another (the built-in mint). */
export function repointInstances(root: HandNode, fromRef: string, toRef: string): void {
  const walk = (node: TableNode): void => {
    if (isInstance(node)) {
      if (node.ref === fromRef) node.ref = toRef
    } else if (node.kind === 'hand') {
      node.children.forEach(walk)
    }
  }
  root.children.forEach(walk)
}
