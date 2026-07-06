import { validateTable } from '@finsim/engine'
import { migrateDoc, type Doc } from './model'

/**
 * JSON export/import of the table document — the local-first backup and
 * share path (DESIGN.md §11). The file is a versioned envelope around the
 * same Doc that lives in IndexedDB, so a round-trip is exact.
 */

const FORMAT = 'finsim-table'
const VERSION = 1

interface Envelope {
  format: typeof FORMAT
  version: number
  doc: Doc
}

export function serializeDoc(doc: Doc): string {
  const envelope: Envelope = { format: FORMAT, version: VERSION, doc }
  return JSON.stringify(envelope, null, 2)
}

/** Parse and validate an exported file. Throws with a human-readable reason. */
export function deserializeDoc(json: string): Doc {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('not a JSON file')
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('not a FinSim table file')
  const envelope = parsed as Partial<Envelope>
  if (envelope.format !== FORMAT) throw new Error('not a FinSim table file')
  if (envelope.version !== VERSION) {
    throw new Error(`table file version ${String(envelope.version)} is not supported (this app reads version ${VERSION})`)
  }
  const doc = envelope.doc
  if (typeof doc !== 'object' || doc === null) throw new Error('table file has no document')
  if (!Number.isInteger(doc.from)) throw new Error('table file has an invalid start month')
  if (!Number.isInteger(doc.horizonMonths) || doc.horizonMonths < 1) throw new Error('table file has an invalid horizon')
  if (typeof doc.goal !== 'number' || !(doc.goal > 0)) throw new Error('table file has an invalid goal')
  if (typeof doc.table !== 'object' || doc.table === null) throw new Error('table file has no table')
  migrateDoc(doc as Doc)
  const errors = validateTable(doc.table)
  if (errors.length > 0) throw new Error(`table file is invalid:\n- ${errors.join('\n- ')}`)
  return doc as Doc
}
