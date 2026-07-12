/** Eight characters of UUID — the fresh-id suffix every dealt card wears. */
export function newUid(): string {
  return crypto.randomUUID().slice(0, 8)
}
