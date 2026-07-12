import type { Card, Curve, HandCard, SampledData, Table, World } from './types.js'

/**
 * Historical replay by re-anchoring (DESIGN.md §0 "Backtesting", 2026-07-12).
 * The user picks a past month; every historical series shifts — together, so
 * cross-asset co-movement through a crash stays real — until that month lines
 * up with the plan's start: "the next N years play out like 1999 onward did."
 * The table, goals and ghosts stay on the present timeline. Like tuning
 * dials, the shift is applied at the sim boundary: the authored data never
 * moves; `simulate` receives shifted copies.
 */

/**
 * Copies of the world and table with every `SampledData` — named world
 * series, inline price data, inline sampled curves — offset so that
 * `anchorMonth` lands on `planStart`. Pure: the inputs are untouched.
 */
export function reanchor(world: World, table: Table, anchorMonth: number, planStart: number): { world: World; table: Table } {
  const shift = planStart - anchorMonth
  const shiftData = (data: SampledData): SampledData => ({ ...data, startMonth: data.startMonth + shift })
  const shiftCurve = (curve: Curve): Curve => (curve.type === 'sampled' && curve.data ? { ...curve, data: shiftData(curve.data) } : curve)
  const shiftCard = (card: Card): Card => {
    switch (card.kind) {
      case 'source':
        return { ...card, flow: shiftCurve(card.flow) }
      case 'drain':
        return card.amount ? { ...card, amount: shiftCurve(card.amount) } : card
      case 'asset':
        return card.price?.data ? { ...card, price: { ...card.price, data: shiftData(card.price.data) } } : card
      case 'hand':
        return { ...card, children: card.children.map(shiftCard) }
      default:
        return card
    }
  }
  const series = world.series ? Object.fromEntries(Object.entries(world.series).map(([id, data]) => [id, shiftData(data)])) : undefined
  return {
    world: series ? { ...world, series } : world,
    table: { ...table, root: shiftCard(table.root) as HandCard },
  }
}

/** One referenced series' reach, in absolute months (its own timeline, unshifted). */
export interface SeriesCoverage {
  /** The world-series key, or the owning card's id for inline data. */
  seriesId: string
  first: number
  last: number
}

export interface ReplayCoverage {
  /** Every historical series the table references, deduplicated. */
  series: SeriesCoverage[]
  /**
   * The contiguous range of anchor months for which every reference stays
   * inside its data across the whole `from..to` horizon after re-anchoring —
   * what a replay date picker may offer. Null when the table references no
   * series, or no anchor can cover the horizon.
   */
  anchors: { first: number; last: number } | null
}

/**
 * What the table actually samples: every (series, card) reference with the
 * months it reads. Set-aside cards count too — coverage must survive a card
 * being brought back without moving the anchor.
 */
function collectRefs(world: World, table: Table, from: number): { id: string; data: SampledData; sampleFrom: number }[] {
  const refs: { id: string; data: SampledData; sampleFrom: number }[] = []
  const add = (ref: { seriesId?: string; data?: SampledData }, cardId: string, sampleFrom: number): void => {
    // an unresolvable seriesId is the table's problem with or without a replay — not coverage's
    const data = ref.data ?? (ref.seriesId ? world.series?.[ref.seriesId] : undefined)
    if (data) refs.push({ id: ref.data ? cardId : ref.seriesId!, data, sampleFrom })
  }
  const walk = (hand: HandCard): void => {
    for (const card of hand.children) {
      const sampleFrom = Math.max(from, card.startMonth ?? from)
      switch (card.kind) {
        case 'source':
          if (card.flow.type === 'sampled') add(card.flow, card.id, sampleFrom)
          break
        case 'drain':
          if (card.amount?.type === 'sampled') add(card.amount, card.id, sampleFrom)
          break
        case 'asset':
          if (card.price) add(card.price, card.id, sampleFrom)
          break
        case 'hand':
          walk(card)
          break
        default:
          break
      }
    }
  }
  walk(table.root)
  return refs
}

/**
 * The replay date picker's ground truth: which series the table references,
 * how far each reaches, and which anchor months keep every sample in range
 * over the whole horizon — `sampleAt` throws on out-of-range, so the guard
 * sits up front, not mid-run.
 */
export function replayCoverage(world: World, table: Table, from: number, to: number): ReplayCoverage {
  const refs = collectRefs(world, table, from)
  const byId = new Map<string, SeriesCoverage>()
  let first = -Infinity
  let last = Infinity
  for (const ref of refs) {
    const dataLast = ref.data.startMonth + ref.data.values.length - 1
    byId.set(ref.id, { seriesId: ref.id, first: ref.data.startMonth, last: dataLast })
    // anchor A plays original month A + (m − planStart) at sim month m, so the
    // months m ∈ sampleFrom..to need A + (sampleFrom − from) ≥ data start and
    // A + (to − from) ≤ data end:
    first = Math.max(first, ref.data.startMonth - (ref.sampleFrom - from))
    last = Math.min(last, dataLast - (to - from))
  }
  return {
    series: [...byId.values()],
    anchors: refs.length > 0 && first <= last ? { first, last } : null,
  }
}
