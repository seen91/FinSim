import { describe, expect, it } from 'vitest'
import { mergeLibrary, redesign, type AuthoredCard } from '../src/authored'
import { builtinOf, pileRef } from '../src/builtins'
import { deserializeDoc, serializeDoc } from '../src/exchange'
import { adoptNameIds, nameIdOf, untaken } from '../src/identity'
import { instanceOf, isInstance, refsIn, type HandNode } from '../src/instances'
import type { Doc } from '../src/model'
import type { SavedHand } from '../src/savedHands'

/**
 * The name IS the id (identity.ts): a design's identity is its card name, a
 * saved hand's its name. The point is the import path — two exports that both
 * hold "Salary" merge into ONE Salary instead of stacking uid-suffixed
 * duplicates.
 */

/** A design the OLD scheme would have minted: uid-suffixed id, readable name. */
function oldStyle(builtinId: string, uidId: string): AuthoredCard {
  return redesign(builtinOf(builtinId)!, uidId)
}

function docPlaying(...refs: string[]): Doc {
  return {
    from: 0,
    horizonMonths: 12,
    goal: 1_000_000,
    table: { root: { id: 'root', kind: 'hand', children: refs.map((ref, i) => instanceOf(ref, `p${String(i)}`)) } },
  }
}

describe('adoptNameIds', () => {
  it('lifts uid ids to name ids, re-pointing the table and the saved hands', () => {
    const salary = oldStyle(pileRef('salary'), 'salary-a6a5c0ea')
    const doc = docPlaying('salary-a6a5c0ea')
    const stash: SavedHand = {
      id: 'saved-c02506e5',
      name: 'Rainy day',
      hand: { id: 'stash', kind: 'hand', name: 'Rainy day', children: [instanceOf('salary-a6a5c0ea', 's1')] },
    }

    adoptNameIds([salary], [doc.table.root], [stash])

    expect(salary.id).toBe('Salary')
    expect(salary.card.id).toBe('Salary')
    expect(refsIn(doc.table.root)).toEqual(['Salary'])
    const stashed = stash.hand.children[0]!
    expect(isInstance(stashed) && stashed.ref).toBe('Salary')
    expect(stash.id).toBe('Rainy day')
  })

  it('a vacated name is claimable in the same pass — renames never chain', () => {
    // X holds the id "Salary" but is named "Lön"; Y is named "Salary".
    const x = oldStyle(pileRef('salary'), 'Salary')
    x.card.name = 'Lön'
    const y = oldStyle(pileRef('salary'), 'salary-abc')
    const root: HandNode = { id: 'root', kind: 'hand', children: [instanceOf('Salary', 'x1'), instanceOf('salary-abc', 'y1')] }

    adoptNameIds([x, y], [root], [])

    expect(x.id).toBe('Lön')
    expect(y.id).toBe('Salary')
    // x's instance follows x to "Lön" — it must NOT ride along to y's fresh "Salary"
    expect(refsIn(root)).toEqual(['Lön', 'Salary'])
  })

  it('two designs sharing a name keep both — the second becomes "name 2"', () => {
    const a = oldStyle(pileRef('salary'), 'salary-111')
    const b = oldStyle(pileRef('salary'), 'salary-222')
    if (b.card.kind === 'source') b.card.flow = { type: 'constant', value: 1 }
    adoptNameIds([a, b], [], [])
    expect([a.id, b.id]).toEqual(['Salary', 'Salary 2'])
  })

  it('a rule design carries its rule id along', () => {
    const isk = oldStyle(pileRef('isk-tax'), 'isk-tax-ac961268')
    adoptNameIds([isk], [], [])
    expect(isk.id).toBe('ISK tax')
    expect(isk.card.kind === 'rule' && isk.card.rule.id).toBe('ISK tax-rule')
  })

  it('untaken counts up; nameIdOf falls back to the id for a nameless design', () => {
    expect(untaken('Salary', new Set(['Salary', 'Salary 2']))).toBe('Salary 3')
    const nameless = oldStyle(pileRef('salary'), 'ghost-1')
    delete nameless.card.name
    expect(nameIdOf(nameless)).toBe('ghost-1')
  })
})

describe('import merges by name — the duplicate-import fix', () => {
  it('importing the same export twice grows nothing: same names override', () => {
    // an export from the OLD scheme: uid-suffixed designs and saved hands
    const salary = oldStyle(pileRef('salary'), 'salary-a6a5c0ea')
    const expenses = oldStyle(pileRef('expenses'), 'expenses-440b4056')
    const stash: SavedHand = {
      id: 'saved-c02506e5',
      name: '+car+3marg',
      hand: { id: 'stash', kind: 'hand', name: '+car+3marg', children: [instanceOf('salary-a6a5c0ea', 's1')] },
    }
    const json = serializeDoc(docPlaying('salary-a6a5c0ea', 'expenses-440b4056'), [salary, expenses], [stash])

    // first import into an empty app, merged the way App.tsx merges
    const first = deserializeDoc(json, [])
    let library = mergeLibrary([], first.designs)
    let savedHands = mergeLibrary<SavedHand>([], first.savedHands)
    expect(library.map((a) => a.id)).toEqual(['Salary', 'Living expenses'])

    // second import of the very same file: overrides, never duplicates
    const second = deserializeDoc(json, library)
    library = mergeLibrary(library, second.designs)
    savedHands = mergeLibrary(savedHands, second.savedHands)
    expect(library.map((a) => a.id)).toEqual(['Salary', 'Living expenses'])
    expect(savedHands.map((s) => s.id)).toEqual(['+car+3marg'])
  })

  it("the file's design wins the name it shares with the reader's — that is the override", () => {
    const mine = oldStyle(pileRef('salary'), 'Salary')
    const theirs = oldStyle(pileRef('salary'), 'salary-99999999')
    theirs.card.kind === 'source' && (theirs.card.flow = { type: 'constant', value: 99_000 })
    const json = serializeDoc(docPlaying('salary-99999999'), [theirs])

    const imported = deserializeDoc(json, [mine])
    const merged = mergeLibrary([mine], imported.designs)
    expect(merged).toHaveLength(1)
    expect(merged[0]!.card.kind === 'source' && merged[0]!.card.flow).toEqual({ type: 'constant', value: 99_000 })
  })
})
