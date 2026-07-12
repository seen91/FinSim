import type { Card, Kind } from '@finsim/engine'
import type { GlyphName } from './icons'

/**
 * The glyph a card face wears. It rides on the card JSON as an app-level key
 * the engine never reads (like `tune`): blueprints, presets and authored
 * designs stamp theirs on every card they deal, so the mark survives renames
 * and round-trips. A card without one falls back to its kind's default.
 */

/** The glyphs a card face may carry — pickable in the Workshop, checked on pack import. */
export const CARD_GLYPHS: GlyphName[] = [
  'coins',
  'briefcase',
  'home',
  'receipt',
  'trend',
  'vault',
  'percent',
  'raise',
  'stamp',
  'car',
  'building',
  'bank',
  'bundle',
  'cash',
]

export function isCardGlyph(value: unknown): value is GlyphName {
  return typeof value === 'string' && (CARD_GLYPHS as string[]).includes(value)
}

/** The kind's default mark — what a card wears when nothing stamped one on it. */
export const KIND_GLYPHS: Record<Kind, GlyphName> = {
  source: 'coins',
  drain: 'receipt',
  asset: 'trend',
  debt: 'bank',
  hand: 'bundle',
  rule: 'percent',
}

type Glyphed = Card & { glyph?: GlyphName }

/** The glyph a card in play wears: its stamped one, else its kind's default. */
export function glyphOf(card: Card): GlyphName {
  const glyph = (card as Glyphed).glyph
  return isCardGlyph(glyph) ? glyph : KIND_GLYPHS[card.kind]
}

/** Stamp a glyph onto a dealt card. */
export function withGlyph<C extends Card>(card: C, glyph: GlyphName): C {
  return { ...card, glyph }
}
