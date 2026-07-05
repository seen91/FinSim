import { ym } from '@finsim/engine'
import type { Doc } from './model'
import { PRESETS } from './presets'

/**
 * The starter table: one main hand — your budget, played top to bottom — with
 * the decision bundles ("Buy the car", "Buy a flat") waiting in the draw pile.
 * Play the car and its ghost shows the answer to the north-star question:
 * "how much longer to 10 MSEK just because I bought this car?" ("1 yr 3 mo").
 *
 * The budget's cards live directly in the root; un-wrapping them from a nested
 * hand is numerically identical (the root also starts its subtotal at zero),
 * so playing the car reproduces the engine's hand-checked golden answer.
 */
export function starterDoc(): Doc {
  const budget = PRESETS.find((p) => p.id === 'current-budget')!
  return {
    from: ym(2026, 1),
    horizonMonths: 30 * 12,
    goal: 10_000_000,
    table: {
      root: {
        id: 'root',
        name: 'Your plan',
        kind: 'hand',
        children: budget.cards.map((c) => c.make('start')),
      },
    },
  }
}
