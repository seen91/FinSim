import { evalCurve, priceCurveOf, validateTable, type AssetCard, type Card, type Curve, type Take } from '@finsim/engine'
import { formatAmount, formatPercent, formatPerMonth } from './format'
import { KIND_GLYPHS } from './glyph'
import type { GlyphName } from './icons'

/**
 * Authored cards — what the Workshop makes. An authored card is an engine
 * card template plus its front matter: the glyph and the description, which
 * doubles as the assumptions footnote (where the numbers come from,
 * DESIGN.md §3). It is one of the two canonical-card species (the other is
 * the built-in, builtins.ts): the table holds INSTANCES of it
 * (instances.ts), so editing a design here reaches every copy in play by
 * construction.
 */
export interface AuthoredCard {
  /**
   * Library identity — the card's NAME (identity.ts): same name = same card,
   * so imports override instead of duplicating. A rename is an identity
   * change; the Workshop re-points every instance in play when it happens.
   */
  id: string
  glyph: GlyphName
  /** What it is — including the assumptions behind the numbers. */
  description?: string
  /** Engine card template. Its ids are placeholders, rewritten on play. */
  card: Card
}

/** The kinds a blank card can start as. A hand is composed on the table, not authored. */
export const AUTHORABLE_KINDS = ['source', 'drain', 'asset', 'debt', 'margin', 'rule'] as const
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
      // the one blank with a face: a global index fund, the asset most tables want first
      return {
        id,
        glyph,
        description: 'Broad global equity: 7 % CAGR ± 15 %/yr over the long run. Takes 80 % of the surplus that reaches it — the rest lands as cash.',
        card: { id, kind, name: 'Index fund: Global', growth: { expected: 0.07, volatility: 0.15 }, take: { type: 'percent', percent: 0.8 }, tags: ['equity', 'fund'] },
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
    case 'margin':
      // the companion: it leans on the asset cards below it in its hand
      return {
        id,
        glyph,
        description:
          'A broker’s margin loan that leans on the asset cards below it: the loan is held at 5 % of their balance — borrowing more as they grow, selling down when they fall — and its 1 % interest is drawn from the flow at its position.',
        card: { id, kind, name: 'Margin loan', ltv: 0.05, interest: { expected: 0.01 }, tags: [] },
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
 * Stamp a card's identity through its math: the id, and the rule id derived
 * from it — one invariant (`rule.id = "<id>-rule"`) for every place a card
 * gets a new identity: a redesign, a rename, a deal, a remint.
 */
export function stampCardId(card: Card, id: string): void {
  card.id = id
  if (card.kind === 'rule') card.rule.id = `${id}-rule`
}

/**
 * A clone of a played card with every app-level rider off — the design stamp,
 * the dials, the set-aside flag, the glyph. What remains is template material:
 * the math, plus the id (rewrite it if the copy needs its own identity).
 */
export function stripRiders(card: Card): Card {
  const bare = structuredClone(card) as Card & { design?: unknown; tune?: unknown; glyph?: unknown }
  delete bare.design
  delete bare.tune
  delete bare.enabled
  delete bare.glyph
  return bare
}

/**
 * A fresh design cut from any canonical card — the Workshop's "copy" of a
 * design or a built-in, and the save that mints an edited built-in into
 * YOUR design (Workshop.tsx re-points the instances).
 * Front matter travels; the template's ids are rewritten to the new identity.
 */
export function redesign(canonical: AuthoredCard, id: string): AuthoredCard {
  const copy = structuredClone(canonical)
  copy.id = id
  copy.card = stripRiders(copy.card)
  stampCardId(copy.card, id)
  return copy
}

/** A design with its template guaranteed rider-free — canonical cards carry math, never per-copy state. */
export function sanitizeAuthored(authored: AuthoredCard): AuthoredCard {
  return { ...authored, card: stripRiders(authored.card) }
}

/** Validate an authored card's template with the engine's own table validator. */
export function validateAuthored(authored: AuthoredCard): string[] {
  return validateTable({ root: { id: 'validate-root', kind: 'hand', children: [structuredClone(authored.card)] } })
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

/** The price a curve opens at — sampled reads its first data point; null when only a series id points elsewhere. */
function priceAtStart(price: Curve): number | null {
  switch (price.type) {
    case 'sampled':
      return price.data?.values[0] ?? null
    default:
      // month 0 stands in for expressions that read the calendar — a static preview, not the sim
      try {
        return evalCurve(price, { t: 0, month: 0 })
      } catch {
        return null
      }
  }
}

/** A priced asset's static headline: what the holding is worth where its curve begins. */
function pricedHeadline(card: AssetCard, price: Curve): string {
  const p0 = priceAtStart(price)
  if (p0 === null) return 'priced by data'
  const units = card.initialUnits ?? 0
  const flavor = price.type === 'sampled' ? 'data' : price.type === 'expression' ? 'ƒ(t)' : price.type
  return units > 0 ? `${formatAmount(units * p0)} · ${flavor}` : `${formatAmount(p0)} /unit · ${flavor}`
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
      if (card.price) return pricedHeadline(card, priceCurveOf(card.price))
      const growth = `${formatPercent(card.growth?.expected ?? 0)} /yr`
      return card.initialBalance ? `${formatAmount(card.initialBalance)} · ${growth}` : growth
    }
    case 'debt':
      return `${formatAmount(card.principal)} @ ${formatPercent(card.interest.expected)}`
    case 'margin':
      return `${formatPercent(card.ltv, 0)} LTV @ ${formatPercent(card.interest.expected)}`
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
