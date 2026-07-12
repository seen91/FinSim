import { ym, type SampledData } from '@finsim/engine'

/**
 * The demo history: 56 years of synthetic monthly prices (1970-01 … 2025-12)
 * so backtesting works out of the box — play the draw pile's demo fund, move
 * the table's start into the past, watch a "real" past unfold. Not real
 * data, but shaped like it: a steady drift, deterministic noise, and
 * scripted bear markets where the famous ones sat, so backtesting through
 * 1973, 1987, 2000 or 2008 actually hurts. Deterministic on purpose — the
 * same table draws the same line on every load, and the engine's
 * no-wall-clock law stays untouched.
 */

export const DEMO_SERIES_ID = 'Demo index (synthetic)'

const frac = (x: number): number => x - Math.floor(x)
/** Pseudo-noise in [−1, 1] — a hash of the month index, not randomness. */
const noise = (i: number): number => frac(Math.sin((i + 1) * 12.9898) * 43758.5453) * 2 - 1

/** Scripted shocks: [first month, last month, extra log-return per month]. */
const SHOCKS: [number, number, number][] = [
  [ym(1973, 9), ym(1974, 9), -0.05], // the oil-shock grind
  [ym(1987, 10), ym(1987, 10), -0.22], // one black October
  [ym(2000, 4), ym(2002, 9), -0.022], // the long dot-com slide
  [ym(2008, 6), ym(2009, 2), -0.065], // the financial crisis
  [ym(2020, 3), ym(2020, 3), -0.13], // the pandemic drop…
  [ym(2020, 4), ym(2020, 4), 0.09], // …and its v-shaped snap back
]

export function demoSeriesData(): SampledData {
  const first = ym(1970, 1)
  const last = ym(2025, 12)
  const values: number[] = []
  let level = 100
  for (let m = first; m <= last; m++) {
    const i = m - first
    // ~10 % drift + a slow cycle + noise, minus the scripted shocks ≈ 6–7 %/yr
    let r = 0.0085 + Math.sin(i / 40) * 0.004 + noise(i) * 0.028
    for (const [from, to, shock] of SHOCKS) if (m >= from && m <= to) r += shock
    level *= Math.exp(r)
    values.push(Math.round(level * 100) / 100)
  }
  return { startMonth: first, values }
}
