import { describe, expect, it } from 'vitest'
import { assetMonthlyGrowthFactor, evalFlowStack, type ModifierCard, type Stack } from '../src/index.js'

const tax = (rate: number): ModifierCard => ({ id: 'tax', kind: 'modifier', target: 'flow', modifier: { type: 'taxRate', rate } })
const raise = (rate: number): ModifierCard => ({ id: 'raise', kind: 'modifier', target: 'flow', modifier: { type: 'annualRaise', rate } })
const fee = (rate: number): ModifierCard => ({ id: 'fee', kind: 'modifier', target: 'balance', modifier: { type: 'annualFee', rate } })

const salaryStack = (modifiers: ModifierCard[]): Stack => ({
  id: 'salary',
  base: { id: 'salary-card', kind: 'source', flow: { type: 'constant', value: 30000 } },
  modifiers,
})

describe('stacking grammar', () => {
  it('a bare source is just its curve', () => {
    expect(evalFlowStack(salaryStack([]), { t: 0, month: 0 })).toBe(30000)
  })

  it('modifiers compose bottom-up: [tax, raise] is raise(tax(salary))', () => {
    const stack = salaryStack([tax(0.3), raise(0.05)])
    // year 0: 30000 × 0.7 = 21000
    expect(evalFlowStack(stack, { t: 0, month: 0 })).toBeCloseTo(21000, 10)
    // year 2: raise applies twice, on the taxed flow
    expect(evalFlowStack(stack, { t: 24, month: 24 })).toBeCloseTo(21000 * 1.05 * 1.05, 10)
  })

  it('modifier order matters (function composition, not a bag of effects)', () => {
    const offset: ModifierCard = { id: 'off', kind: 'modifier', target: 'flow', modifier: { type: 'flowOffset', amountPerMonth: -1000 } }
    const taxThenOffset = evalFlowStack(salaryStack([tax(0.3), offset]), { t: 0, month: 0 })
    const offsetThenTax = evalFlowStack(salaryStack([offset, tax(0.3)]), { t: 0, month: 0 })
    expect(taxThenOffset).toBeCloseTo(30000 * 0.7 - 1000, 10) // 20000
    expect(offsetThenTax).toBeCloseTo((30000 - 1000) * 0.7, 10) // 20300
  })

  it('annualRaise steps yearly, not monthly', () => {
    const stack = salaryStack([raise(0.05)])
    expect(evalFlowStack(stack, { t: 11, month: 11 })).toBe(30000)
    expect(evalFlowStack(stack, { t: 12, month: 12 })).toBeCloseTo(31500, 10)
    expect(evalFlowStack(stack, { t: 23, month: 23 })).toBeCloseTo(31500, 10)
  })

  it('expression modifiers transform the incoming flow f', () => {
    const cap: ModifierCard = { id: 'cap', kind: 'modifier', target: 'flow', modifier: { type: 'expression', expr: 'min(f, 25000)' } }
    expect(evalFlowStack(salaryStack([cap]), { t: 0, month: 0 })).toBe(25000)
  })

  it('asset growth composes fees as monthly drag', () => {
    const fund: Stack = {
      id: 'fund',
      base: { id: 'fund-card', kind: 'asset', growth: { expected: 0.07 } },
      modifiers: [fee(0.004)],
    }
    const factor = assetMonthlyGrowthFactor(fund)
    expect(Math.pow(factor, 12)).toBeCloseTo(1.07 * (1 - 0.004), 12)
  })

  it('an asset without growth holds its value', () => {
    const vault: Stack = { id: 'vault', base: { id: 'v', kind: 'asset', initialBalance: 1000 } }
    expect(assetMonthlyGrowthFactor(vault)).toBe(1)
  })

  it('kind mismatches are errors', () => {
    const fund: Stack = { id: 'fund', base: { id: 'f', kind: 'asset', growth: { expected: 0.07 } } }
    expect(() => evalFlowStack(fund, { t: 0, month: 0 })).toThrow(/not a flow stack/)
    expect(() => assetMonthlyGrowthFactor(salaryStack([]))).toThrow(/not an asset stack/)
    expect(() => evalFlowStack(salaryStack([fee(0.004)]), { t: 0, month: 0 })).toThrow(/targets balances/)
    const badFund: Stack = { id: 'fund', base: { id: 'f', kind: 'asset', growth: { expected: 0.07 } }, modifiers: [tax(0.3)] }
    expect(() => assetMonthlyGrowthFactor(badFund)).toThrow(/cannot stack/)
  })
})
