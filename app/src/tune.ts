import type { Card, HandCard, Table } from '@finsim/engine'

/**
 * Tuning dials — the sliders under the card editor's parameters. A dial is a
 * remembered −100..+100 % offset kept SEPARATELY from the authored value: the
 * card's stored number never moves, the table plays value × (1 + pct/100),
 * and centering the dial restores the authored number exactly.
 *
 * The dials ride on the card JSON (an app-level key the engine never reads —
 * they are stripped and applied at the sim boundary), keyed by the dot-path
 * of the parameter they scale, e.g. "flow.base" or "rule.effect.rate".
 */
export type Tune = Record<string, number>

type Tuned = Card & { tune?: Tune }

export function tuneOf(card: Card): Tune {
  return (card as Tuned).tune ?? {}
}

/** Set one dial (0 recenters and forgets it), keeping the card JSON tidy. */
export function withTune(card: Card, path: string, pct: number): Card {
  const tune = { ...tuneOf(card) }
  if (pct === 0) delete tune[path]
  else tune[path] = Math.max(-100, Math.min(100, pct))
  const next = { ...card } as Tuned
  if (Object.keys(tune).length === 0) delete next.tune
  else next.tune = tune
  return next
}

/** Shares live in 0..1; correlations in −1..1; month counts and unit counts stay whole. */
const SHARE = /(^|\.)(percent|rate)$/
const CORRELATION = /(^|\.)correlation$/
const WHOLE = /(^|\.)(atMonth|periodMonths|initialUnits)$/

/** What the table actually plays: the authored number scaled by its dial. */
export function effectiveValue(path: string, base: number, pct: number): number {
  let v = base * (1 + pct / 100)
  if (SHARE.test(path)) v = Math.min(1, Math.max(0, v))
  if (CORRELATION.test(path)) v = Math.min(1, Math.max(-1, v))
  if (WHOLE.test(path)) v = Math.max(path.endsWith('atMonth') || path.endsWith('periodMonths') ? 1 : 0, Math.round(v))
  return v
}

/** The card as played: every dial applied to its number, dials stripped. */
export function applyTune(card: Card): Card {
  const entries = Object.entries(tuneOf(card))
  const next = structuredClone(card) as Tuned
  delete next.tune
  for (const [path, pct] of entries) {
    const keys = path.split('.')
    let holder: unknown = next
    for (const key of keys.slice(0, -1)) holder = holder === null || typeof holder !== 'object' ? undefined : (holder as Record<string, unknown>)[key]
    if (holder === null || typeof holder !== 'object') continue // a stale dial (the curve changed shape) scales nothing
    const rec = holder as Record<string, unknown>
    const last = keys[keys.length - 1] ?? ''
    const base = rec[last]
    if (typeof base === 'number') rec[last] = effectiveValue(path, base, pct)
  }
  return next
}

/** The whole table as played, dials applied on every card at every depth. */
export function applyTuneTable(table: Table): Table {
  const walk = (card: Card): Card => {
    const played = applyTune(card)
    return played.kind === 'hand' ? { ...played, children: played.children.map(walk) } : played
  }
  return { ...table, root: walk(table.root) as HandCard }
}
