/**
 * Currency-agnostic: amounts are plain numbers in whatever currency the
 * table is kept in — the math never needs to know which one.
 */
const num = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 })

export function formatAmount(value: number): string {
  return num.format(Math.round(value))
}

export function formatPerMonth(value: number): string {
  return `${num.format(Math.round(value))} /mo`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')} %`
}

const dec = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 })

const editNum = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 })

/** A number as it reads in an editable field: grouped digits, up to 3 decimals. */
export function formatNumber(value: number): string {
  return editNum.format(value)
}

/** Round to the 3 decimals an editable field shows. */
export function round(v: number): number {
  return Math.round(v * 1000) / 1000
}

/** Compact money: 10 000 000 → "10 M", 1 500 000 → "1,5 M", 10 000 → "10 k". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e6) return `${dec.format(value / 1e6)} M`
  if (abs >= 1e3) return `${dec.format(value / 1e3)} k`
  return num.format(value)
}

/** Inverse of {@link formatCompact}: "10M", "1,5m", "250 k", "-2k", "500000" → number. Null if unreadable. */
export function parseCompact(text: string): number | null {
  const cleaned = text.replace(/[\s  ']/g, '').replace(',', '.')
  const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([kKmM])?$/.exec(cleaned)
  if (!m) return null
  const mult = m[2] === undefined ? 1 : m[2].toLowerCase() === 'k' ? 1e3 : 1e6
  return Number(m[1]) * mult
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** A thrown value as it reads to a human. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
