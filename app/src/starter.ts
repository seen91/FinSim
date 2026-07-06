import { ym } from '@finsim/engine'
import { LIBRARY } from './library'
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
  const isk = LIBRARY.find((b) => b.id === 'isk-tax')!
  const now = new Date() // app-side only: the engine never touches wall-clock time
  return {
    from: ym(now.getFullYear(), now.getMonth() + 1),
    horizonMonths: 30 * 12,
    goal: 10_000_000,
    table: {
      root: {
        id: 'root',
        name: 'Your plan',
        kind: 'hand',
        // the budget plus the ISK tax card — tax-as-a-card on show from the first render
        children: [...budget.cards.map((c) => c.make('start')), isk.make('start')],
      },
    },
  }
}
