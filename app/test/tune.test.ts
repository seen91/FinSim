import type { Card, SourceCard } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { resolveTable } from '../src/instances'
import { runSim, type Doc } from '../src/model'
import { starterDoc } from '../src/starter'
import { applyTune, applyTuneTable, effectiveValue, tuneOf, withTune } from '../src/tune'

/**
 * Tuning dials: a slider's percent is remembered SEPARATELY from the authored
 * value — the stored number never moves, the sim plays value × (1 + pct/100),
 * and re-centering the dial restores the authored number exactly.
 */

const salary = (): SourceCard => ({
  id: 's',
  kind: 'source',
  name: 'Salary',
  flow: { type: 'constant', value: 1_000 },
})

describe('withTune', () => {
  it('remembers a dial without touching the authored value', () => {
    const tuned = withTune(salary(), 'flow.value', 100)
    expect(tuneOf(tuned)).toEqual({ 'flow.value': 100 })
    expect((tuned as SourceCard).flow).toEqual({ type: 'constant', value: 1_000 })
  })

  it('re-centering forgets the dial and leaves the card JSON tidy', () => {
    const tuned = withTune(withTune(salary(), 'flow.value', 40), 'flow.value', 0)
    expect(tuned).toEqual(salary())
    expect('tune' in tuned).toBe(false)
  })

  it('clamps to the dial range −100..+100', () => {
    expect(tuneOf(withTune(salary(), 'flow.value', 250))['flow.value']).toBe(100)
    expect(tuneOf(withTune(salary(), 'flow.value', -250))['flow.value']).toBe(-100)
  })
})

describe('effectiveValue', () => {
  it('scales by the percent: 1000 at +100 % plays as 2000', () => {
    expect(effectiveValue('flow.value', 1_000, 100)).toBe(2_000)
    expect(effectiveValue('flow.value', 1_000, -100)).toBe(0)
    expect(effectiveValue('flow.value', 1_000, 50)).toBe(1_500)
  })

  it('keeps shares inside 0..1', () => {
    expect(effectiveValue('take.percent', 0.8, 100)).toBe(1)
    expect(effectiveValue('rule.effect.rate', 0.006, 50)).toBeCloseTo(0.009)
  })

  it('keeps a margin ltv strictly inside 0..1 — the engine rejects both ends', () => {
    expect(effectiveValue('ltv', 0.6, 100)).toBe(0.99)
    expect(effectiveValue('ltv', 0.05, -100)).toBe(0.001)
    expect(effectiveValue('ltv', 0.05, 100)).toBeCloseTo(0.1, 12)
  })

  it('keeps month and unit counts whole', () => {
    expect(effectiveValue('flow.periodMonths', 12, 37)).toBe(16)
    expect(effectiveValue('flow.periodMonths', 12, -100)).toBe(1)
    expect(effectiveValue('initialUnits', 10, -100)).toBe(0)
  })
})

describe('applyTune', () => {
  it('applies every dial and strips the tune key', () => {
    const played = applyTune(withTune(salary(), 'flow.value', 100)) as SourceCard
    expect(played.flow).toEqual({ type: 'constant', value: 2_000 })
    expect('tune' in played).toBe(false)
  })

  it('ignores a stale dial left behind by a curve-shape change', () => {
    const card = withTune(salary(), 'flow.base', 50) // constant curves have no .base
    expect(applyTune(card)).toEqual(salary())
  })

  it('never mutates the stored card', () => {
    const card = withTune(salary(), 'flow.value', 100)
    applyTune(card)
    expect((card as SourceCard).flow).toEqual({ type: 'constant', value: 1_000 })
  })

  it('reaches into nested paths', () => {
    const debt: Card = { id: 'd', kind: 'debt', principal: 100, interest: { expected: 0.04 } }
    const played = applyTune(withTune(debt, 'interest.expected', 50))
    expect(played.kind === 'debt' && played.interest.expected).toBeCloseTo(0.06)
  })
})

describe('a tuned table plays the dialed values', () => {
  it('doubling the salary dial moves the sim, and re-centering restores it', () => {
    const doc: Doc = { table: { root: { id: 'root', kind: 'hand', children: [salary()] } }, goal: 1_000_000, from: 0, horizonMonths: 12 }
    const plain = runSim(doc)
    doc.table.root.children[0] = withTune(salary(), 'flow.value', 100)
    const dialed = runSim(doc)
    expect(dialed.active.cash.points[0]).toBe(plain.active.cash.points[0]! * 2)
    doc.table.root.children[0] = withTune(doc.table.root.children[0] as Card, 'flow.value', 0)
    expect(runSim(doc).active.cash.points).toEqual(plain.active.cash.points)
  })

  it('the resolved starter table is untouched by an all-zero pass', () => {
    const table = resolveTable(starterDoc().table, [])
    expect(applyTuneTable(table)).toEqual(table)
  })
})
