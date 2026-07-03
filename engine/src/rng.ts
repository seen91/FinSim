/**
 * Seeded, deterministic randomness. The v1 simulation itself is fully
 * deterministic (volatility is carried but ignored); the RNG exists for
 * shuffles, event schedules and the later Monte Carlo mode. A finished game
 * must be reproducible from (scenario, seed, decisions), so every random
 * draw in the product goes through this module.
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number
  /** Integer in [0, n). */
  int(n: number): number
}

/** mulberry32 — small, fast, well-distributed 32-bit PRNG. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(n: number): number {
      if (!Number.isInteger(n) || n <= 0) throw new Error(`rng.int(${n}): n must be a positive integer`)
      return Math.floor(next() * n)
    },
  }
}

/** Fisher–Yates shuffle. Returns a new array; the input is not mutated. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}
