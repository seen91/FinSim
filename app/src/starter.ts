import { ym } from '@finsim/engine'
import type { Doc } from './model'

/**
 * The starter table: the exact M1 acceptance scenario from the engine's
 * integration test (engine/test/acceptance.car.test.ts). Salary + expenses,
 * five index funds fed by cascading 20 % streams, and a "Buy the car"
 * decision bundle. The readout should say:
 * "10 MSEK: 2045-06 → 2048-03. The car costs you 2 yr 9 mo."
 */
export function starterDoc(): Doc {
  const fundNames = ['Index: Global', 'Index: Sverige', 'Index: USA', 'Index: Europa', 'Index: Asien']
  return {
    from: ym(2026, 1),
    horizonMonths: 30 * 12,
    goal: 10_000_000,
    table: {
      stacks: [
        {
          id: 'salary',
          name: 'Salary',
          base: { id: 'salary-card', kind: 'source', flow: { type: 'constant', value: 65000 }, tags: ['income'] },
          modifiers: [
            { id: 'income-tax', name: 'Income tax', kind: 'modifier', target: 'flow', modifier: { type: 'taxRate', rate: 0.3 } },
          ],
        },
        {
          id: 'expenses',
          name: 'Living expenses',
          base: { id: 'expenses-card', kind: 'source', flow: { type: 'constant', value: -20500 } },
        },
        ...fundNames.map((name, i) => ({
          id: `fund${i + 1}`,
          name,
          base: {
            id: `fund${i + 1}-card`,
            kind: 'asset' as const,
            growth: { expected: 0.07, volatility: 0.15 },
            tags: ['equity', 'fund'],
          },
        })),
        {
          id: 'car-value',
          name: 'Car',
          base: { id: 'car-value-card', kind: 'asset', initialBalance: 240000, growth: { expected: -0.15 } },
          bundleId: 'car',
        },
        {
          id: 'car-loan',
          name: 'Car loan',
          base: { id: 'car-loan-card', kind: 'debt', principal: 240000, interest: { expected: 0.06 } },
          bundleId: 'car',
        },
        {
          id: 'car-costs',
          name: 'Running costs',
          base: { id: 'car-costs-card', kind: 'source', flow: { type: 'constant', value: -3500 } },
          bundleId: 'car',
        },
      ],
      streams: [
        { id: 'loan-payment', to: 'car-loan', rule: { type: 'fixed', amountPerMonth: 4300 }, bundleId: 'car' },
        ...fundNames.map((_, i) => ({
          id: `save${i + 1}`,
          to: `fund${i + 1}`,
          rule: { type: 'percent' as const, percent: 0.2 },
        })),
      ],
      bundles: [{ id: 'car', name: 'Buy the car', enabled: true }],
    },
  }
}
