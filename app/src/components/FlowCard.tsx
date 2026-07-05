import { valueAt } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatPerMonth } from '../format'
import type { Sim } from '../model'
import { Card } from './Card'

/**
 * The spout at the right end of the hand: whatever is left after the root
 * plays left to right exits here, month by month, and pours into the cash
 * vessel on the far left. Flow, where the cash card is stock.
 */
export function FlowCard({ sim, scrub }: { sim: Sim; scrub: number }): ReactElement {
  const value = valueAt(sim.remainder, scrub)
  return (
    <Card
      size="hand"
      face={{
        kind: 'flow',
        name: 'This month',
        glyph: 'coins',
        headline: formatPerMonth(value),
        headlineClass: value > 0 ? 'pos' : value < 0 ? 'neg' : '',
        stats: [{ label: 'Whatever is left', value: 'goes to cash' }],
        sparkline: sim.remainder.points,
      }}
    />
  )
}
