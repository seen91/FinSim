import type { Card, SampledData } from '@finsim/engine'
import { stripRiders, type AuthoredCard } from './authored'
import { LIBRARY } from './library'
import { PRESETS } from './presets'

/**
 * The built-in canonical cards: everything the draw pile deals that is not a
 * personal design — pile blueprints ("pile:<id>") and preset hand members
 * ("preset:<key>"). Their instances play and dial like any card, and the
 * template itself never mutates: editing a built-in in the Workshop mints a
 * design from your edits and re-points every table instance of the built-in
 * at it (DESIGN.md §0 "One card — instances"); a plain "copy" mints without
 * re-pointing, so the default keeps playing untouched.
 *
 * A built-in wears the same shape as a library design (AuthoredCard) so the
 * Workshop bench and the resolver treat both species alike; its id is its ref.
 */

const PILE_PREFIX = 'pile:'
const PRESET_PREFIX = 'preset:'

export function pileRef(blueprintId: string): string {
  return `${PILE_PREFIX}${blueprintId}`
}

export function presetRef(cardKey: string): string {
  return `${PRESET_PREFIX}${cardKey}`
}

const BUILTINS = new Map<string, AuthoredCard>()
const BUILTIN_SERIES = new Map<string, Record<string, SampledData>>()

for (const bp of LIBRARY) {
  if (bp.card.kind === 'hand') continue // hands are composed on the table, never canonical
  BUILTINS.set(pileRef(bp.id), { id: pileRef(bp.id), glyph: bp.glyph, description: bp.description, card: bp.card })
  if (bp.series) BUILTIN_SERIES.set(pileRef(bp.id), bp.series)
}
for (const preset of PRESETS) {
  for (const pc of preset.cards) {
    BUILTINS.set(presetRef(pc.key), { id: presetRef(pc.key), glyph: pc.glyph, description: pc.description ?? '', card: pc.card })
    if (pc.series) BUILTIN_SERIES.set(presetRef(pc.key), pc.series)
  }
}

/** The built-in behind a ref, or null — library designs shadow nothing here. */
export function builtinOf(ref: string): AuthoredCard | null {
  return BUILTINS.get(ref) ?? null
}

/** The series a built-in's card samples — landed in `world.series` when an instance is dealt. */
export function builtinSeriesOf(ref: string): Record<string, SampledData> | undefined {
  return BUILTIN_SERIES.get(ref)
}

/**
 * The math of a card, normalized for recognition: play-state and front-matter
 * riders off, ids out (a dealt copy differs from its template only there),
 * keys sorted so property order never decides. Used by the v1→v2 migration
 * to see a built-in behind an unedited one-off.
 */
export function normalizedMath(card: Card): string {
  const bare = stripRiders(card)
  delete (bare as { id?: string }).id
  if (bare.kind === 'rule') delete (bare.rule as { id?: string }).id
  const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted)
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((k) => [k, sorted((value as Record<string, unknown>)[k])]),
      )
    }
    return value
  }
  return JSON.stringify(sorted(bare))
}

/** The built-in a plain card is an unedited copy of, if any — matched by math. */
export function builtinMatching(card: Card): string | null {
  const math = normalizedMath(card)
  for (const [ref, builtin] of BUILTINS) {
    if (normalizedMath(builtin.card) === math) return ref
  }
  return null
}
