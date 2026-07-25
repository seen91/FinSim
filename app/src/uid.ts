/** Eight characters of UUID — the fresh-id suffix every dealt card wears. */
export function newUid(): string {
  return crypto.randomUUID().slice(0, 8)
}

/** The `-<uid>` tail newUid appends — strip it to recover an id's readable base. */
export const UID_SUFFIX = /-[0-9a-f]{8}$/
