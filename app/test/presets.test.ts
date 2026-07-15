import { simulate, validateTable, ym, type Card } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import { PRESETS } from '../src/presets'
import { resolveTable, type HandNode } from '../src/instances'

/**
 * The Progressive income tax preset — statlig skatt crafted from the
 * pipeline itself, no bracket primitive: a shelter drain hides everything
 * below brytpunkten, the 20 % percent drain bites only the positive
 * remainder (a percent drain never taxes a negative subtotal), the shelter's
 * twin gives the money back, kommunalskatt takes the rest. The hand's 100 %
 * take makes it read the gross at its position.
 */

const BRYT = 53_600 // the preset's monthly brytpunkt, first year

/** A one-month table: a flat gross salary, then the dealt tax hand. */
function taxTable(gross: number): ReturnType<typeof resolveTable> {
  const preset = PRESETS.find((p) => p.id === 'progressive-tax')!
  const salary: Card = { id: 'gross', kind: 'source', flow: { type: 'constant', value: gross } }
  const root: HandNode = { id: 'root', kind: 'hand', children: [salary, preset.build('t')] }
  return resolveTable({ root }, [])
}

const JAN = ym(2050, 1) // nothing historical in play; January, so the hold anchor is at rest

const cashAfter = (gross: number): number => simulate(taxTable(gross), {}, JAN, JAN).cash.points[0]!

const statligPaid = (gross: number): number =>
  -simulate(taxTable(gross), {}, JAN, JAN).contributions.find((c) => c.id === 'statlig-skatt-t')!.points[0]!

describe('the Progressive income tax hand', () => {
  it('deals a valid table', () => {
    expect(validateTable(taxTable(45_000))).toEqual([])
  })

  it('below brytpunkten only kommunalskatt bites', () => {
    expect(statligPaid(45_000)).toBeCloseTo(0, 12)
    expect(cashAfter(45_000)).toBeCloseTo(45_000 * 0.7, 6)
  })

  it('exactly at brytpunkten the statlig drain takes nothing', () => {
    expect(statligPaid(BRYT)).toBeCloseTo(0, 12)
  })

  it('above brytpunkten: 20 % marginal on the excess, kommunalskatt on the rest', () => {
    const statlig = 0.2 * (60_000 - BRYT) // 1 280
    expect(statligPaid(60_000)).toBeCloseTo(statlig, 6)
    expect(cashAfter(60_000)).toBeCloseTo((60_000 - statlig) * 0.7, 6)
  })

  it('brytpunkten walks: a January step lifts a 55 000 salary back under it', () => {
    // year 1: threshold 53 600 → statlig 0.2 × 1 400 = 280/mo
    // next January: 53 600 × 1.04 = 55 744 > 55 000 → statlig 0
    const sim = simulate(taxTable(55_000), {}, JAN, JAN + 12)
    const statlig = sim.contributions.find((c) => c.id === 'statlig-skatt-t')!
    expect(statlig.points[0]).toBeCloseTo(-280, 6)
    expect(statlig.points[11]).toBeCloseTo(-280, 6)
    expect(statlig.points[12]).toBeCloseTo(0, 12)
  })

  it('the shelter and its return cancel: the hand nets exactly the tax', () => {
    const sim = simulate(taxTable(60_000), {}, JAN, JAN)
    const hand = sim.contributions.find((c) => c.id === 'tax-t')!
    const tax = 0.2 * (60_000 - BRYT) + 0.7 * 0 + 0.3 * (60_000 - 0.2 * (60_000 - BRYT))
    expect(hand.points[0]).toBeCloseTo(-tax, 6)
  })
})
