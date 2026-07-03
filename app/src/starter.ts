import { ym } from '@finsim/engine'
import type { Doc } from './model'
import { PRESETS } from './presets'

/**
 * The starter table: the M1 acceptance scenario on the pipeline model — two
 * hands in play, each read top to bottom. Same cards, same numbers as the
 * engine's integration test; the tooltip on "Buy the car" should say:
 * "2045-06 → 2046-09 · costs 1 yr 3 mo".
 */
export function starterDoc(): Doc {
  const budget = PRESETS.find((p) => p.id === 'current-budget')!
  const car = PRESETS.find((p) => p.id === 'buy-the-car')!
  return {
    from: ym(2026, 1),
    horizonMonths: 30 * 12,
    goal: 10_000_000,
    table: {
      root: {
        id: 'root',
        name: 'Your table',
        kind: 'hand',
        children: [budget.build('start'), car.build('start')],
      },
    },
  }
}
