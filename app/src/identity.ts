import type { AuthoredCard } from './authored'
import { instancesIn, type HandNode } from './instances'
import type { SavedHand } from './savedHands'

/**
 * The name IS the id (2026-07-17). A design's identity — what instances
 * reference, what merges match on — is its card name; a saved hand's is its
 * name. Two libraries that author "Salary" independently hold the SAME card,
 * so importing a file overrides same-named designs instead of stacking
 * uid-suffixed duplicates (the old scheme minted `salary-a6a5c0ea` ids that
 * never matched across machines or resets).
 *
 * Older stores and files still carry uid ids; `adoptNameIds` lifts them on
 * read — every load and every import passes through it — so the law holds
 * everywhere without a file-format version bump (ids stay opaque strings to
 * an older reader).
 */

/** The id a design's name claims: the trimmed name, or the old id when nameless. */
export function nameIdOf(authored: AuthoredCard): string {
  return authored.card.name?.trim() || authored.id
}

/** "Salary", "Salary 2", "Salary 3", … — the first not yet taken. */
export function untaken(want: string, taken: ReadonlySet<string>): string {
  let id = want
  for (let n = 2; taken.has(id); n++) id = `${want} ${n}`
  return id
}

/** Stamp a design's identity through its template (and its rule's id). */
export function restampDesign(authored: AuthoredCard, id: string): void {
  authored.id = id
  authored.card.id = id
  if (authored.card.kind === 'rule') authored.card.rule.id = `${id}-rule`
}

/**
 * Rename every design to its name-id and every saved hand to its name, in
 * place, re-pointing every instance ref in the given roots and hands. Two
 * phases: first the full old→new map (a rename's target may equal another
 * design's OLD id — "Salary"→"Lön" freeing "Salary" for `salary-abc` — so
 * refs must re-point in one pass over the finished map, never rename by
 * rename), then the sweep. Same-name designs keep both: the second gets
 * "name 2" — they may hold different math, and dropping one silently would
 * eat a card.
 */
export function adoptNameIds(designs: AuthoredCard[], roots: HandNode[], savedHands: SavedHand[] = []): void {
  const assigned = new Set(designs.filter((a) => a.id === nameIdOf(a)).map((a) => a.id))
  const rename = new Map<string, string>()
  for (const a of designs) {
    const want = nameIdOf(a)
    if (a.id === want) continue
    const id = untaken(want, assigned)
    assigned.add(id)
    rename.set(a.id, id)
    restampDesign(a, id)
  }
  if (rename.size > 0) {
    for (const root of [...roots, ...savedHands.map((s) => s.hand)]) {
      for (const inst of instancesIn(root)) inst.ref = rename.get(inst.ref) ?? inst.ref
    }
  }

  const handIds = new Set<string>()
  for (const s of savedHands) {
    const id = untaken(s.name.trim() || s.id, handIds)
    handIds.add(id)
    s.id = id
  }
}
