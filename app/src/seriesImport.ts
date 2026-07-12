import { formatMonth, ym, type Card, type SampledData, type Table } from '@finsim/engine'
import type { AuthoredCard } from './authored'

/**
 * Importing historical data (DESIGN.md §0 "Backtesting"): a pasted or
 * file-picked run of monthly values becomes a named series in `world.series`,
 * and — one flow, no detour — a priced-asset design in the personal library
 * wearing it. The parser is tolerant about separators and strict about time:
 * months must be consecutive, because a gap silently stretched over would be
 * a lie in the data.
 */

/** "YYYY-MM" → absolute month index, or null when the text is not a month. */
export function parseMonthText(text: string): number | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(text.trim())
  if (!m) return null
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return ym(Number(m[1]), month)
}

export interface ParsedSeries {
  /** Absolute first month when the rows carried dates; null for bare values. */
  startMonth: number | null
  values: number[]
}

const DATE_ROW = /^\d{4}-\d{1,2}([\s,;]|$)/

function parseNumber(token: string, where: string): number {
  const value = Number(token)
  if (!Number.isFinite(value)) throw new Error(`${where}: “${token}” is not a number (use a dot for decimals — commas separate values)`)
  return value
}

/**
 * Monthly values from pasted text: bare numbers split on commas, semicolons
 * or whitespace, or `YYYY-MM,value` rows on consecutive months (one header
 * line is tolerated). Throws with a human-readable reason.
 */
export function parseSeriesText(text: string): ParsedSeries {
  let lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) throw new Error('no values found')

  // a CSV header ("Date,Close") before date rows is furniture, not an error
  if (!DATE_ROW.test(lines[0]!) && lines.length > 1 && DATE_ROW.test(lines[1]!)) lines = lines.slice(1)

  if (DATE_ROW.test(lines[0]!)) {
    const values: number[] = []
    let startMonth: number | null = null
    for (const [i, line] of lines.entries()) {
      const where = `line ${i + 1}`
      const tokens = line.split(/[\s,;]+/)
      if (tokens.length !== 2) throw new Error(`${where}: expected “YYYY-MM, value”, got ${tokens.length} column${tokens.length === 1 ? '' : 's'}`)
      const month = parseMonthText(tokens[0]!)
      if (month === null) throw new Error(`${where}: “${tokens[0]}” is not a YYYY-MM month`)
      if (startMonth === null) startMonth = month
      else if (month !== startMonth + i) {
        throw new Error(`${where}: ${formatMonth(month)} does not follow ${formatMonth(startMonth + i - 1)} — months must be consecutive, no gaps`)
      }
      values.push(parseNumber(tokens[1]!, where))
    }
    return { startMonth, values }
  }

  const tokens = lines.join(' ').split(/[\s,;]+/).filter((t) => t.length > 0)
  return { startMonth: null, values: tokens.map((t, i) => parseNumber(t, `value ${i + 1}`)) }
}

/** Every named world series a card (template) references, nested hands included. */
export function seriesIdsIn(card: Card): string[] {
  switch (card.kind) {
    case 'source':
      return card.flow.type === 'sampled' && card.flow.seriesId ? [card.flow.seriesId] : []
    case 'drain':
      return card.amount?.type === 'sampled' && card.amount.seriesId ? [card.amount.seriesId] : []
    case 'asset':
      return card.price?.seriesId ? [card.price.seriesId] : []
    case 'hand':
      return card.children.flatMap(seriesIdsIn)
    default:
      return []
  }
}

/** A series may only be deleted when neither the table nor the library wears it. */
export function seriesInUse(seriesId: string, table: Table, library: AuthoredCard[]): boolean {
  return seriesIdsIn(table.root).includes(seriesId) || library.some((a) => seriesIdsIn(a.card).includes(seriesId))
}

/**
 * The "import → real card" half of the flow: a priced-asset design wearing
 * the imported series, footnoted with the coverage and the two data traps
 * (total return, currency) so the assumptions travel with the card.
 */
export function mintPricedDesign(seriesId: string, data: SampledData, uid: string): AuthoredCard {
  const id = `series-${seriesId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uid}`
  const last = data.startMonth + data.values.length - 1
  return {
    id,
    glyph: 'trend',
    description:
      `Priced by the imported series “${seriesId}” (${formatMonth(data.startMonth)} … ${formatMonth(last)}, ${String(data.values.length)} points). ` +
      'Assumes total-return data — a price-only series understates returns by dividends — in whatever currency the series is denominated in (FX is not modeled).',
    card: {
      id,
      kind: 'asset',
      name: seriesId,
      tags: [],
      price: { seriesId },
      take: { type: 'fixed', amountPerMonth: 1_000 },
    },
  }
}
