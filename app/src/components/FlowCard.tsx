import { valueAt } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatPerMonth } from '../format'
import type { Sim } from '../model'
import { Card } from './Card'

/**
 * The spout under the cash vessel: whatever is left after the root plays top
 * to bottom exits here, month by month, and pours into the vessel above it.
 * Flow, where the cash card is stock.
 */
export function FlowCard({ sim, scrub }: { sim: Sim; scrub: number }): ReactElement {
  const value = valueAt(sim.remainder, scrub)
  return (
    <Card
      size="hand"
      face={{
        kind: 'flow',
        name: 'Monthly flow',
        glyph: 'coins',
        headline: formatPerMonth(value),
        headlineClass: value > 0 ? 'pos' : value < 0 ? 'neg' : '',
        stats: [{ label: 'Whatever is left', value: 'goes to cash' }],
        sparkline: sim.remainder.points,
      }}
    />
  )
}
