import { valueAt } from '@finsim/engine'
import { useState, type ReactElement } from 'react'
import { formatAmount, formatPercent } from '../format'
import type { Doc, Sim } from '../model'
import { Card, type CardStat } from './Card'

/**
 * The permanent cash vessel in the corner. Not a hand card — it catches
 * whatever reaches the bottom of the root — but it flips like one: the back
 * edits the table's starting balance and the account's interest, so a plan
 * doesn't have to start from zero.
 */
export function CashCard({
  doc,
  sim,
  scrub,
  onEdit,
}: {
  doc: Doc
  sim: Sim
  scrub: number
  /** Doc update, same contract as DocStore.update. */
  onEdit: (mutate: (doc: Doc) => void) => void
}): ReactElement {
  const [flipped, setFlipped] = useState(false)
  const initial = doc.table.cash?.initialBalance ?? 0
  const interest = doc.table.cash?.growth?.expected ?? 0

  const stats: CardStat[] = []
  if (initial > 0) stats.push({ label: 'Start', value: formatAmount(initial) })
  stats.push({ label: 'In', value: 'whatever is left' })
  if (interest > 0) stats.push({ label: 'Interest', value: `${formatPercent(interest)} /yr` })

  return (
    <Card
      size="hand"
      flipped={flipped}
      onFlip={() => setFlipped((f) => !f)}
      face={{
        kind: 'vessel',
        name: 'Cash',
        glyph: 'cash',
        headline: formatAmount(valueAt(sim.active.cash, scrub)),
        stats,
        sparkline: sim.active.cash.points,
      }}
      back={
        <>
          <label className="param">
            <span className="param-label">
              Starting balance <span className="param-value num">{formatAmount(initial)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={2_000_000}
              step={10_000}
              value={initial}
              onChange={(e) => {
                const v = Number(e.target.value)
                onEdit((d) => {
                  d.table.cash = { ...d.table.cash, initialBalance: v }
                })
              }}
            />
          </label>
          <label className="param">
            <span className="param-label">
              Interest /yr <span className="param-value num">{formatPercent(interest)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={0.05}
              step={0.0025}
              value={interest}
              onChange={(e) => {
                const v = Number(e.target.value)
                onEdit((d) => {
                  d.table.cash = { ...d.table.cash, growth: { ...d.table.cash?.growth, expected: v } }
                })
              }}
            />
          </label>
        </>
      }
    />
  )
}
