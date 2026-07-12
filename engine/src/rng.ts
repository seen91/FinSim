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
  /** Standard normal draw (mean 0, variance 1). */
  normal(): number
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
  // Box–Muller produces normals in pairs; the spare is kept for the next call
  let spare: number | null = null
  return {
    next,
    int(n: number): number {
      if (!Number.isInteger(n) || n <= 0) throw new Error(`rng.int(${n}): n must be a positive integer`)
      return Math.floor(next() * n)
    },
    normal(): number {
      if (spare !== null) {
        const z = spare
        spare = null
        return z
      }
      const u = 1 - next() // (0, 1] — log(0) must be unreachable
      const v = next()
      const r = Math.sqrt(-2 * Math.log(u))
      spare = r * Math.sin(2 * Math.PI * v)
      return r * Math.cos(2 * Math.PI * v)
    },
  }
}

/** FNV-1a — a stable 32-bit hash, for deriving per-card RNG streams from ids. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
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
