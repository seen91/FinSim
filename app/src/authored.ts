import { validateTable, type Card, type Curve, type Take } from '@finsim/engine'
import { formatAmount, formatPercent, formatPerMonth } from './format'
import { KIND_GLYPHS } from './glyph'
import type { GlyphName } from './icons'

/**
 * Authored cards — what the Workshop makes. An authored card is an engine
 * card template plus its front matter: the glyph and the description, which
 * doubles as the assumptions footnote (where the numbers come from,
 * DESIGN.md §3). It is one of the two canonical-card species (the other is
 * the read-only built-in, builtins.ts): the table holds INSTANCES of it
 * (instances.ts), so editing a design here reaches every copy in play by
 * construction.
 */
export interface AuthoredCard {
  /** Library identity — stable across edits, unique within a library/pack. */
  id: string
  glyph: GlyphName
  /** What it is — including the assumptions behind the numbers. */
  description?: string
  /** Engine card template. Its ids are placeholders, rewritten on play. */
  card: Card
}

/** The kinds a blank card can start as. A hand is composed on the table, not authored. */
export const AUTHORABLE_KINDS = ['source', 'drain', 'asset', 'debt', 'rule'] as const
export type AuthorableKind = (typeof AUTHORABLE_KINDS)[number]

/**
 * A fresh blank card of the chosen kind, ready to flip and edit. Defaults are
 * deliberately plain — real numbers, nothing exotic — and structurally valid,
 * so a blank card can be played untouched without upsetting the engine.
 */
export function blankCard(kind: AuthorableKind, uid: string): AuthoredCard {
  const id = `new-${kind}-${uid}`
  const glyph = KIND_GLYPHS[kind]
  switch (kind) {
    case 'source':
      return {
        id,
        glyph,
        description: '',
        card: { id, kind, name: 'New source', flow: { type: 'constant', value: 10_000 }, tags: [] },
      }
    case 'drain':
      return {
        id,
        glyph,
        description: '',
        card: { id, kind, name: 'New drain', amount: { type: 'constant', value: 5_000 }, tags: [] },
      }
    case 'asset':
      return {
        id,
        glyph,
        description: '',
        card: { id, kind, name: 'New asset', growth: { expected: 0.05 }, take: { type: 'fixed', amountPerMonth: 1_000 }, tags: [] },
      }
    case 'debt':
      return {
        id,
        glyph,
        description: '',
        card: {
          id,
          kind,
          name: 'New debt',
          principal: 100_000,
          interest: { expected: 0.05 },
          payment: { type: 'fixed', amountPerMonth: 1_500 },
          tags: [],
        },
      }
    case 'rule':
      return {
        id,
        glyph,
        description: '',
        card: {
          id,
          kind,
          name: 'New rule',
          tags: [],
          rule: {
            id: `${id}-rule`,
            schedule: { kind: 'yearly', monthOfYear: 12 },
            target: { tags: ['fund'] },
            effect: { type: 'balanceTax', rate: 0.01 },
          },
        },
      }
  }
}

/**
 * A fresh design cut from any canonical card — the Workshop's "copy" of a
 * design, and the "copy to shelf" that makes a read-only built-in editable.
 * Front matter travels; the template's ids are rewritten to the new identity.
 */
export function redesign(canonical: AuthoredCard, id: string): AuthoredCard {
  const copy = structuredClone(canonical)
  copy.id = id
  copy.card.id = id
  if (copy.card.kind === 'rule') copy.card.rule.id = `${id}-rule`
  return copy
}

/** Validate an authored card's template with the engine's own table validator. */
export function validateAuthored(authored: AuthoredCard): string[] {
  return validateTable({ root: { id: 'validate-root', kind: 'hand', children: [structuredClone(authored.card)] } })
}

/** Merge imported/authored cards into a library: same id replaces, new appends. */
export function mergeLibrary(library: AuthoredCard[], incoming: AuthoredCard[]): AuthoredCard[] {
  const next = [...library]
  for (const card of incoming) {
    const i = next.findIndex((c) => c.id === card.id)
    if (i >= 0) next[i] = card
    else next.push(card)
  }
  return next
}

/** How a cadence reads on a card face and in an editor field: "/mo", "/yr", … */
export const CADENCE_SUFFIX = { weekly: '/wk', biweekly: '/2wk', monthly: '/mo', quarterly: '/qtr', yearly: '/yr' } as const

function curveHeadline(curve: Curve, sign: '+' | '−', suffix: string): string {
  switch (curve.type) {
    case 'constant':
      return `${sign}${formatAmount(curve.value)} ${suffix}`
    case 'linear':
    case 'compound':
      return `${sign}${formatAmount(curve.base)} ${suffix}`
    case 'step':
      return `${sign}${formatAmount(curve.initial)} ${suffix}`
    case 'sinusoidal':
      return `${sign}${formatAmount(curve.base)} ${suffix} ±${formatAmount(curve.amplitude)}`
    case 'sampled':
      return 'historical data'
    case 'expression':
      return `${sign}ƒ(t) ${suffix}`
  }
}

/** Static face headline for a card template, in the style of the built-in library. */
export function headlineFor(card: Card): string {
  switch (card.kind) {
    case 'source':
      return curveHeadline(card.flow, '+', CADENCE_SUFFIX[card.cadence ?? 'monthly'])
    case 'drain':
      return card.percent !== undefined
        ? `−${formatPercent(card.percent, 0)}`
        : curveHeadline(card.amount ?? { type: 'constant', value: 0 }, '−', CADENCE_SUFFIX[card.cadence ?? 'monthly'])
    case 'asset': {
      if (card.price) return 'priced by data'
      const growth = `${formatPercent(card.growth?.expected ?? 0)} /yr`
      return card.initialBalance ? `${formatAmount(card.initialBalance)} · ${growth}` : growth
    }
    case 'debt':
      return `${formatAmount(card.principal)} @ ${formatPercent(card.interest.expected)}`
    case 'hand':
      return `${card.children.length} card${card.children.length === 1 ? '' : 's'}`
    case 'rule': {
      const effect = card.rule.effect
      if (effect.type === 'balanceTax') return `−${formatPercent(effect.rate, 2)} of balance`
      if (effect.type === 'flowTax') return `−${formatPercent(effect.rate, 0)} of flow`
      return `× ${String(effect.factor)}`
    }
  }
}

/** A take/payment as it reads on a card face: "10 % of subtotal" or "1 000 /mo". */
export function takeLabel(take: Take): string {
  return take.type === 'percent' ? `${formatPercent(take.percent, 0)} of subtotal` : formatPerMonth(take.amountPerMonth)
}
