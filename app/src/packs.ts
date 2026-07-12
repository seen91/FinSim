import type { SampledData, ScheduledRule } from '@finsim/engine'
import { validateAuthored, type AuthoredCard } from './authored'
import { isCardGlyph } from './glyph'

/**
 * The pack format — the unit of sharing (DESIGN.md §3). A pack is a data
 * bundle, JSON, never code: instrument cards with their front matter, plus
 * room for the other three pack ingredients (locale rules, data series,
 * scenarios) so the format is a day-one concern even where the app is not.
 *
 * Versioning (decides DESIGN.md §14.4, same policy as the table file):
 * a `format` name and one integer `version`. Adding OPTIONAL fields does not
 * bump the version — readers ignore fields they don't know and writers keep
 * fields they don't understand, so old apps read new packs. A BREAKING shape
 * change bumps the version, and the reader must either migrate the old shape
 * on import (like `migrateDoc`) or reject with a human-readable message.
 * Readers always reject versions newer than they know.
 */

const FORMAT = 'finsim-pack'
const VERSION = 1

export interface Pack {
  name: string
  description?: string
  /** Instrument cards: engine card templates with their front matter. */
  cards: AuthoredCard[]
  /** Real historical monthly series, referenced by cards via seriesId. */
  series?: Record<string, SampledData>
  /** Locale rules — carried for the game/scenario layers (M3+); the simulator plays rules as cards instead. */
  rules?: ScheduledRule[]
  /** Game modules (DESIGN.md §4) — reserved, defined by M3. */
  scenarios?: unknown[]
}

interface Envelope {
  format: typeof FORMAT
  version: number
  pack: Pack
}

export function serializePack(pack: Pack): string {
  const envelope: Envelope = { format: FORMAT, version: VERSION, pack }
  return JSON.stringify(envelope, null, 2)
}

/** Parse and validate a pack file. Throws with a human-readable reason. */
export function deserializePack(json: string): Pack {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('not a JSON file')
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('not a FinSim pack file')
  const envelope = parsed as Partial<Envelope>
  if (envelope.format !== FORMAT) throw new Error('not a FinSim pack file')
  if (typeof envelope.version !== 'number' || envelope.version > VERSION) {
    throw new Error(`pack version ${String(envelope.version)} is not supported (this app reads up to version ${VERSION})`)
  }
  const pack = envelope.pack
  if (typeof pack !== 'object' || pack === null) throw new Error('pack file has no pack')
  if (typeof pack.name !== 'string' || pack.name.length === 0) throw new Error('pack file has no name')
  if (!Array.isArray(pack.cards)) throw new Error('pack file has no cards')
  const seen = new Set<string>()
  for (const card of pack.cards) {
    if (typeof card !== 'object' || card === null || typeof card.id !== 'string' || typeof card.card !== 'object') {
      throw new Error('pack has a malformed card')
    }
    if (seen.has(card.id)) throw new Error(`pack has two cards with the id "${card.id}"`)
    seen.add(card.id)
    // an unknown glyph is cosmetic — coerce instead of failing the whole pack
    if (!isCardGlyph(card.glyph)) card.glyph = 'trend'
    const errors = validateAuthored(card)
    if (errors.length > 0) throw new Error(`pack card "${card.id}" is invalid:\n- ${errors.join('\n- ')}`)
  }
  return pack as Pack
}
