import { validateTable } from '@finsim/engine'
import type { AuthoredCard } from './authored'
import { refsIn, resolveTable } from './instances'
import { migrateDoc, type Doc } from './model'

/**
 * JSON export/import of the table document — the local-first backup and
 * share path (DESIGN.md §11). The file is a versioned envelope around the
 * same Doc that lives in IndexedDB, so a round-trip is exact.
 *
 * Version 2 (2026-07-14, "One card — instances"): the table's leaves are
 * instances referencing canonical cards, so the envelope carries the library
 * designs those instances play (`designs`) — the way packs carry the series
 * their cards wear. Built-in refs resolve on any table and travel as bare
 * references. Version 1 files (full engine cards, optional design stamps)
 * are migrated on read: stamped copies re-point at their design, unedited
 * one-offs at their built-in, and edited orphans mint into the library.
 */

const FORMAT = 'finsim-table'
const VERSION = 2

interface Envelope {
  format: typeof FORMAT
  version: number
  doc: Doc
  /** The library designs the table's instances reference. */
  designs?: AuthoredCard[]
}

export interface ImportedDoc {
  doc: Doc
  /** Designs to merge into the library: carried by a v2 file, or minted migrating a v1 file. */
  designs: AuthoredCard[]
}

export function serializeDoc(doc: Doc, library: AuthoredCard[] = []): string {
  const refs = refsIn(doc.table.root)
  const designs = library.filter((a) => refs.includes(a.id))
  const envelope: Envelope = { format: FORMAT, version: VERSION, doc, ...(designs.length > 0 ? { designs } : {}) }
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

  const carried = Array.isArray(envelope.designs) ? envelope.designs : []
  const known = [...library.filter((a) => !carried.some((c) => c.id === a.id)), ...carried]
  // a v1 file migrates on read; the designs it mints from edited orphans
  // travel to the library like carried ones. A v2 file is already instances
  // (plain engine cards in one pass through the resolver untouched).
  const minted = envelope.version < VERSION ? migrateDoc(doc as Doc, known) : []
  const designs = [...carried, ...minted]

  let resolved
  try {
    resolved = resolveTable((doc as Doc).table, [...known, ...minted])
  } catch (err) {
    throw new Error(`table file is invalid: ${err instanceof Error ? err.message : String(err)}`)
  }
  const errors = validateTable(resolved)
  if (errors.length > 0) throw new Error(`table file is invalid:\n- ${errors.join('\n- ')}`)
  return { doc: doc as Doc, designs }
}
