import { validateTable } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { adoptNameIds } from './identity'
import { isInstance, nodesIn, resolveTable, type HandNode } from './instances'
import { migrateDoc, type Doc } from './model'
import type { SavedHand } from './savedHands'

/**
 * JSON export/import of the table document — the local-first backup and
 * share path (DESIGN.md §11). The file is a versioned envelope around the
 * same Doc that lives in IndexedDB, so a round-trip is exact.
 *
 * Version 2 (2026-07-14, "One card — instances"): the table's leaves are
 * instances referencing canonical cards, so the envelope carries the library
 * designs those instances play (`designs`) — the way presets carry the
 * series their cards wear. Built-in refs resolve on any table and travel as
 * bare references. Version 1 files (full engine cards, optional design stamps)
 * are migrated on read: stamped copies re-point at their design, unedited
 * one-offs at their built-in, and edited orphans mint into the library.
 *
 * Version 3 (2026-07-16): the margin kind exists. A new KIND is not an
 * ignorable optional field — an older app's kind switches would silently
 * skip it and mis-simulate the table — so a file that carries one must be
 * rejected there, readably (§0 "Pack format versioning": migrate-or-reject).
 * The writer keeps sharing friendly by writing the lowest version the
 * content needs: margin-free tables still export as v2. Reading v2 as v3
 * needs no migration — the shape is unchanged.
 *
 * 2026-07-17: Export is the full backup, not just the table. The whole
 * shelf rides in `designs` (referenced or not) and the draw pile rides in
 * `savedHands`. Both are optional fields an older reader safely ignores —
 * it already merges every carried design and never simulates a saved hand —
 * so neither forces a version bump. Margin detection scans everything the
 * file carries, so a margin design on the shelf or riding a saved hand
 * forces v3 the same as one on the table.
 *
 * 2026-07-17: the name IS the id (identity.ts). Reading lifts a file's old
 * uid-suffixed design ids to name-ids, so merging an import replaces
 * same-named designs and saved hands instead of duplicating them. Ids stay
 * opaque strings to an older reader, so no version bump.
 */

const FORMAT = 'finsim-table'
const VERSION = 3

/** Does the file carry a margin card — in a design's template, raw on the table, or riding a saved hand? */
function carriesMargin(doc: Doc, designs: AuthoredCard[], savedHands: SavedHand[]): boolean {
  const rawMargin = (hand: HandNode): boolean => [...nodesIn(hand)].some((n) => !isInstance(n) && n.kind === 'margin')
  return (
    designs.some((a) => a.card.kind === 'margin') ||
    rawMargin(doc.table.root) ||
    savedHands.some((s) => rawMargin(s.hand))
  )
}

interface Envelope {
  format: typeof FORMAT
  version: number
  doc: Doc
  /** The whole authored library — every design on the shelf, referenced or not. */
  designs?: AuthoredCard[]
  /** The draw pile — every saved hand, series riding along inside each. */
  savedHands?: SavedHand[]
}

export interface ImportedDoc {
  doc: Doc
  /** Designs to merge into the library: carried by a v2+ file, or minted migrating a v1 file. */
  designs: AuthoredCard[]
  /** Saved hands to merge into the draw pile. */
  savedHands: SavedHand[]
}

export function serializeDoc(doc: Doc, library: AuthoredCard[] = [], savedHands: SavedHand[] = []): string {
  // the lowest version the content needs: only a margin card forces v3
  const version = carriesMargin(doc, library, savedHands) ? VERSION : 2
  const envelope: Envelope = {
    format: FORMAT,
    version,
    doc,
    ...(library.length > 0 ? { designs: library } : {}),
    ...(savedHands.length > 0 ? { savedHands } : {}),
  }
  return JSON.stringify(envelope, null, 2)
}

/**
 * Parse, migrate and validate an exported file against the reader's library.
 * Throws with a human-readable reason.
 */
export function deserializeDoc(json: string, library: AuthoredCard[] = []): ImportedDoc {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('not a JSON file')
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('not a FinSim table file')
  const envelope = parsed as Partial<Envelope>
  if (envelope.format !== FORMAT) throw new Error('not a FinSim table file')
  if (typeof envelope.version !== 'number' || envelope.version > VERSION) {
    throw new Error(`table file version ${String(envelope.version)} is not supported (this app reads up to version ${VERSION})`)
  }
  const doc = envelope.doc
  if (typeof doc !== 'object' || doc === null) throw new Error('table file has no document')
  if (!Number.isInteger(doc.from)) throw new Error('table file has an invalid start month')
  if (doc.horizonMonths !== null && (!Number.isInteger(doc.horizonMonths) || doc.horizonMonths < 1)) throw new Error('table file has an invalid horizon')
  if (typeof doc.goal !== 'number' || !(doc.goal > 0)) throw new Error('table file has an invalid goal')
  if (typeof doc.table !== 'object' || doc.table === null) throw new Error('table file has no table')

  const savedHands = Array.isArray(envelope.savedHands) ? envelope.savedHands : []
  const wellFormed = (s: SavedHand): boolean =>
    typeof s === 'object' && s !== null && typeof s.id === 'string' && typeof s.name === 'string' &&
    typeof s.hand === 'object' && s.hand !== null && s.hand.kind === 'hand' && Array.isArray(s.hand.children)
  if (!savedHands.every(wellFormed)) throw new Error('table file has invalid saved hands')

  const carried = Array.isArray(envelope.designs) ? envelope.designs : []
  // a v1 file migrates on read; the designs it mints from edited orphans
  // travel to the library like carried ones. A v2+ file is already instances
  // (plain engine cards in one pass through the resolver untouched) — v2→v3
  // changed no shapes, so only v1 needs lifting. The migration matches design
  // stamps against the file's own uid ids, so it runs BEFORE the identity lift.
  const minted = envelope.version === 1
    ? migrateDoc(doc as Doc, [...library.filter((a) => !carried.some((c) => c.id === a.id)), ...carried])
    : []
  const designs = [...carried, ...minted]
  // the name IS the id (identity.ts): lift the file's uid-suffixed ids to
  // name-ids, table and saved-hand refs following — so merging into the
  // reader's library replaces same-named designs instead of stacking
  // duplicates of every card the two sides both hold
  adoptNameIds(designs, [(doc as Doc).table.root], savedHands)

  let resolved
  try {
    // the file's design wins a name it shares with the reader's — that IS the override
    resolved = resolveTable((doc as Doc).table, [...library.filter((a) => !designs.some((c) => c.id === a.id)), ...designs])
  } catch (err) {
    throw new Error(`table file is invalid: ${err instanceof Error ? err.message : String(err)}`)
  }
  const errors = validateTable(resolved)
  if (errors.length > 0) throw new Error(`table file is invalid:\n- ${errors.join('\n- ')}`)

  return { doc: doc as Doc, designs, savedHands }
}
