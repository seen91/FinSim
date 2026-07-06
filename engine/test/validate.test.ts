import { describe, expect, it } from 'vitest'
import { validateTable, type Card, type Table } from '../src/index.js'

const hand = (id: string, children: Card[]): Card => ({ id, kind: 'hand', children })
const table = (children: Card[]): Table => ({ root: { id: 'root', kind: 'hand', children } })

describe('validateTable (the kind system)', () => {
  it('accepts a well-formed table', () => {
    const t = table([
      { id: 'salary', kind: 'source', flow: { type: 'constant', value: 40000 } },
      { id: 'tax', kind: 'drain', percent: 0.3 },
      { id: 'rent', kind: 'drain', amount: { type: 'constant', value: 12000 } },
      { id: 'fund', kind: 'asset', growth: { expected: 0.07 }, take: { type: 'percent', percent: 0.2 } },
      hand('financing', [{ id: 'loan', kind: 'debt', principal: 100000, interest: { expected: 0.06 }, payment: { type: 'fixed', amountPerMonth: 2000 } }]),
    ])
    expect(validateTable(t)).toEqual([])
  })

  it('reserves the cash id and rejects duplicates anywhere in the tree', () => {
    expect(validateTable(table([{ id: 'cash', kind: 'asset' }]))).toContainEqual(expect.stringContaining('reserved'))
    const dupe = table([
      { id: 'a', kind: 'asset' },
      hand('h', [{ id: 'a', kind: 'asset' }]),
    ])
    expect(validateTable(dupe)).toContainEqual(expect.stringContaining('Duplicate card id'))
  })

  it('a drain has exactly one of amount or percent, within range', () => {
    expect(validateTable(table([{ id: 'x', kind: 'drain' }]))).toContainEqual(expect.stringContaining('exactly one'))
    expect(
      validateTable(table([{ id: 'x', kind: 'drain', amount: { type: 'constant', value: 1 }, percent: 0.1 }])),
    ).toContainEqual(expect.stringContaining('exactly one'))
    expect(validateTable(table([{ id: 'x', kind: 'drain', percent: 1.2 }]))).toContainEqual(expect.stringContaining('0..1'))
  })

  it('rejects an asset with both growth and a price curve, and bad takes', () => {
    const both = table([{ id: 'x', kind: 'asset', growth: { expected: 0.07 }, price: { data: { startMonth: 0, values: [1] } } }])
    expect(validateTable(both)).toContainEqual(expect.stringContaining('not both'))
    expect(validateTable(table([{ id: 'x', kind: 'asset', initialUnits: 3 }]))).toContainEqual(expect.stringContaining('requires a price curve'))
    expect(validateTable(table([{ id: 'x', kind: 'asset', take: { type: 'percent', percent: -0.1 } }]))).toContainEqual(
      expect.stringContaining('0..1'),
    )
    expect(validateTable(table([{ id: 'x', kind: 'asset', fee: -0.01 }]))).toContainEqual(expect.stringContaining('≥ 0'))
  })

  it('rejects negative principals and payments', () => {
    expect(validateTable(table([{ id: 'x', kind: 'debt', principal: -5, interest: { expected: 0 } }]))).toContainEqual(
      expect.stringContaining('≥ 0'),
    )
    expect(
      validateTable(table([{ id: 'x', kind: 'debt', principal: 5, interest: { expected: 0 }, payment: { type: 'fixed', amountPerMonth: -1 } }])),
    ).toContainEqual(expect.stringContaining('≥ 0'))
  })

  it('rejects unordered step curves', () => {
    const t = table([
      { id: 'y', kind: 'source', flow: { type: 'step', initial: 0, steps: [{ atMonth: 5, value: 1 }, { atMonth: 5, value: 2 }] } },
    ])
    expect(validateTable(t)).toContainEqual(expect.stringContaining('strictly increasing'))
  })

  it('rejects rule cards with out-of-range rates or months', () => {
    const ruleCard = (rule: Partial<{ rate: number; monthOfYear: number }>): ReturnType<typeof table> =>
      table([
        {
          id: 'x',
          kind: 'rule',
          rule: {
            id: 'x-rule',
            schedule: { kind: 'yearly', monthOfYear: rule.monthOfYear ?? 12 },
            target: { tags: ['fund'] },
            effect: { type: 'balanceTax', rate: rule.rate ?? 0.01 },
          },
        },
      ])
    expect(validateTable(ruleCard({ rate: 1.5 }))).toContainEqual(expect.stringContaining('0..1'))
    expect(validateTable(ruleCard({ monthOfYear: 13 }))).toContainEqual(expect.stringContaining('1..12'))
    expect(validateTable(ruleCard({}))).toEqual([])
  })

  it('rejects out-of-range hand takes, and a take on the root', () => {
    expect(validateTable(table([{ id: 'h', kind: 'hand', take: { type: 'percent', percent: 1.5 }, children: [] }]))).toContainEqual(
      expect.stringContaining('0..1'),
    )
    expect(validateTable(table([{ id: 'h', kind: 'hand', take: { type: 'fixed', amountPerMonth: -1 }, children: [] }]))).toContainEqual(
      expect.stringContaining('≥ 0'),
    )
    const rootTake: ReturnType<typeof table> = table([])
    rootTake.root.take = { type: 'percent', percent: 1 }
    expect(validateTable(rootTake)).toContainEqual(expect.stringContaining('root'))
  })
})
