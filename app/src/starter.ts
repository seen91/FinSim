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
 * The funds live in an "Index fund investing" hand that takes 100 % of the
 * surplus, with the ISK rule card on top so it visibly taxes every fund below
 * it. A 100 % take is numerically identical to playing the funds flat in the
 * root, so playing the car reproduces the engine's hand-checked golden answer.
 */
export function starterDoc(): Doc {
  const budget = PRESETS.find((p) => p.id === 'current-budget')!
  const isk = LIBRARY.find((b) => b.id === 'isk-tax')!
  const funds = budget.cards.filter((c) => c.key.startsWith('fund'))
  const flows = budget.cards.filter((c) => !c.key.startsWith('fund'))
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
        children: [
          ...flows.map((c) => c.make('start')),
          {
            id: 'investing-start',
            name: 'Index fund investing',
            kind: 'hand',
            take: { type: 'percent', percent: 1 },
            // tax-as-a-card on show from the first render: ISK on top, funds below
            children: [isk.make('start'), ...funds.map((c) => c.make('start'))],
          },
        ],
      },
    },
  }
}
