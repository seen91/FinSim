import { describe, expect, it } from 'vitest'
import { validateTable, type Table } from '../src/index.js'

const source = (id: string): Table['stacks'][number] => ({
  id,
  base: { id: `${id}-card`, kind: 'source', flow: { type: 'constant', value: 1000 } },
})
const asset = (id: string): Table['stacks'][number] => ({
  id,
  base: { id: `${id}-card`, kind: 'asset', growth: { expected: 0.07 } },
})

describe('validateTable (the kind system)', () => {
  it('accepts a well-formed table', () => {
    const table: Table = {
      stacks: [source('salary'), asset('fund')],
      streams: [{ id: 's1', to: 'fund', rule: { type: 'fixed', amountPerMonth: 4000 } }],
    }
    expect(validateTable(table)).toEqual([])
  })

  it('reserves the cash id and rejects duplicates', () => {
    expect(validateTable({ stacks: [asset('cash')], streams: [] })).toContainEqual(expect.stringContaining('reserved'))
    expect(validateTable({ stacks: [asset('a'), asset('a')], streams: [] })).toContainEqual(expect.stringContaining('Duplicate stack id'))
  })

  it('rejects flow modifiers on assets and balance modifiers on sources', () => {
    const badAsset: Table = {
      stacks: [{ ...asset('fund'), modifiers: [{ id: 'tax', kind: 'modifier', target: 'flow', modifier: { type: 'taxRate', rate: 0.3 } }] }],
      streams: [],
    }
    expect(validateTable(badAsset)).toContainEqual(expect.stringContaining('cannot stack on an asset'))

    const badSource: Table = {
      stacks: [{ ...source('salary'), modifiers: [{ id: 'fee', kind: 'modifier', target: 'balance', modifier: { type: 'annualFee', rate: 0.004 } }] }],
      streams: [],
    }
    expect(validateTable(badSource)).toContainEqual(expect.stringContaining('cannot stack on a source'))
  })

  it('rejects streams into unknown targets or sources', () => {
    const table: Table = {
      stacks: [source('salary')],
      streams: [
        { id: 's1', to: 'nowhere', rule: { type: 'fixed', amountPerMonth: 100 } },
        { id: 's2', to: 'salary', rule: { type: 'fixed', amountPerMonth: 100 } },
      ],
    }
    const errors = validateTable(table)
    expect(errors).toContainEqual(expect.stringContaining('unknown stack "nowhere"'))
    expect(errors).toContainEqual(expect.stringContaining('targets a source'))
  })

  it('streams to cash are always valid targets', () => {
    const table: Table = {
      stacks: [source('salary')],
      streams: [{ id: 's1', to: 'cash', rule: { type: 'percent', percent: 0.5 } }],
    }
    expect(validateTable(table)).toEqual([])
  })

  it('rejects out-of-range stream rules', () => {
    const table: Table = {
      stacks: [asset('fund')],
      streams: [
        { id: 's1', to: 'fund', rule: { type: 'fixed', amountPerMonth: -5 } },
        { id: 's2', to: 'fund', rule: { type: 'percent', percent: 1.2 } },
      ],
    }
    const errors = validateTable(table)
    expect(errors).toContainEqual(expect.stringContaining('must be ≥ 0'))
    expect(errors).toContainEqual(expect.stringContaining('within 0..1'))
  })

  it('rejects references to unknown bundles', () => {
    const table: Table = {
      stacks: [{ ...asset('car'), bundleId: 'car-bundle' }],
      streams: [{ id: 's1', to: 'car', rule: { type: 'fixed', amountPerMonth: 100 }, bundleId: 'car-bundle' }],
    }
    const errors = validateTable(table)
    expect(errors.filter((e) => e.includes('unknown bundle'))).toHaveLength(2)
  })

  it('rejects an asset with both growth and a price curve, and unordered steps', () => {
    const both: Table = {
      stacks: [{ id: 'x', base: { id: 'x-card', kind: 'asset', growth: { expected: 0.07 }, price: { data: { startMonth: 0, values: [1] } } } }],
      streams: [],
    }
    expect(validateTable(both)).toContainEqual(expect.stringContaining('not both'))

    const steps: Table = {
      stacks: [{ id: 'y', base: { id: 'y-card', kind: 'source', flow: { type: 'step', initial: 0, steps: [{ atMonth: 5, value: 1 }, { atMonth: 5, value: 2 }] } } }],
      streams: [],
    }
    expect(validateTable(steps)).toContainEqual(expect.stringContaining('strictly increasing'))
  })

  it('rejects modifiers on debt stacks (amortization is a locale-pack hook)', () => {
    const table: Table = {
      stacks: [{
        id: 'loan',
        base: { id: 'loan-card', kind: 'debt', principal: 100000, interest: { expected: 0.06 } },
        modifiers: [{ id: 'm', kind: 'modifier', target: 'balance', modifier: { type: 'annualFee', rate: 0.01 } }],
      }],
      streams: [],
    }
    expect(validateTable(table)).toContainEqual(expect.stringContaining('debt stacks take no modifiers'))
  })
})
