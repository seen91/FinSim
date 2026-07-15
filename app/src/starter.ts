import { ym } from '@finsim/engine'
import { pileRef, presetRef } from './builtins'
import { instanceOf } from './instances'
import type { Doc } from './model'
import { PRESETS } from './presets'

/**
 * The starter table: one relatable household, played top to bottom — salary,
 * tax, living expenses, a savings buffer, then an "Index fund investing" hand
 * that takes 100 % of the surplus, with the ISK rule card on top so it
 * visibly taxes the fund below it. The fund takes 80 % of what reaches it,
 * so a trickle still lands as cash. The decision bundles ("Buy the car",
 * "Buy a flat") wait in the draw pile; the hand-checked five-fund golden
 * scenario lives on in the acceptance tests, not here.
 *
 * Every leaf is an instance of a built-in canonical card (builtins.ts) —
 * flip one to its dials for a what-if, or edit it in the Workshop to make it
 * YOUR salary (saving mints your design and every copy follows).
 */
export function starterDoc(): Doc {
  const budget = PRESETS.find((p) => p.id === 'current-budget')!
  const funds = budget.cards.filter((c) => c.key.startsWith('fund'))
  const flows = budget.cards.filter((c) => !c.key.startsWith('fund'))
  const now = new Date() // app-side only: the engine never touches wall-clock time
  return {
    from: ym(now.getFullYear(), now.getMonth() + 1),
    horizonMonths: null, // auto: the chart ends five years after the goal is reached
    goal: 2_000_000,
    table: {
      root: {
        id: 'root',
        name: 'Your plan',
        kind: 'hand',
        children: [
          ...flows.map((c) => instanceOf(presetRef(c.key), 'start')),
          {
            id: 'investing-start',
            name: 'Index fund investing',
            kind: 'hand',
            take: { type: 'percent', percent: 1 },
            // tax-as-a-card on show from the first render: ISK on top, funds below
            children: [instanceOf(pileRef('isk-tax'), 'start'), ...funds.map((c) => instanceOf(presetRef(c.key), 'start'))],
          },
        ],
      },
    },
  }
}
