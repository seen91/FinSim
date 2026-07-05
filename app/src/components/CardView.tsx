import { valueAt, type Card as EngineCard } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatAmount, formatPerMonth, formatPercent } from '../format'
import { Glyph, type GlyphName } from '../icons'
import type { Sim } from '../model'
import { Card, type CardStat } from './Card'

/** An engine card dressed for the table: glyph, live headline, stat rows. */

function glyphFor(card: EngineCard): GlyphName {
  const name = (card.name ?? '').toLowerCase()
  switch (card.kind) {
    case 'debt':
      return 'bank'
    case 'hand':
      return 'bundle'
    case 'drain':
      if (card.percent !== undefined) return 'stamp'
      if (name.includes('rent') || name.includes('avgift')) return 'home'
      if (name.includes('payment')) return 'cash'
      return 'receipt'
    case 'source':
      return name.includes('hustle') ? 'briefcase' : 'coins'
    case 'asset':
      if (name.includes('car')) return 'car'
      if (name.includes('apartment') || name.includes('flat')) return 'building'
      if (name.includes('savings') || name.includes('nest')) return 'vault'
      return 'trend'
  }
}

function frontStats(card: EngineCard): CardStat[] {
  const stats: CardStat[] = []
  if (card.kind === 'source' && card.flow.type === 'compound' && card.flow.annualRate.expected > 0) {
    stats.push({ label: 'Raise', value: `${formatPercent(card.flow.annualRate.expected)} /yr` })
  } else if (card.kind === 'drain' && card.percent !== undefined) {
    stats.push({ label: 'Takes', value: `${formatPercent(card.percent, 0)} of subtotal` })
  } else if (card.kind === 'asset') {
    if (!card.price) stats.push({ label: 'Growth', value: `${formatPercent(card.growth?.expected ?? 0)} /yr` })
    if ((card.fee ?? 0) > 0) stats.push({ label: 'Fee', value: `${formatPercent(card.fee!, 2)} /yr` })
    if (card.take) {
      stats.push({
        label: 'Takes',
        value: card.take.type === 'percent' ? `${formatPercent(card.take.percent, 0)} of subtotal` : formatPerMonth(card.take.amountPerMonth),
      })
    }
  } else if (card.kind === 'debt') {
    stats.push({ label: 'Interest', value: `${formatPercent(card.interest.expected)} /yr` })
    if (card.payment) {
      stats.push({
        label: 'Payment',
        value: card.payment.type === 'percent' ? `${formatPercent(card.payment.percent, 0)} of subtotal` : formatPerMonth(card.payment.amountPerMonth),
      })
    }
  }
  return stats
}

export function CardView({
  card,
  sim,
  scrub,
  size = 'table',
  onRemove,
}: {
  card: EngineCard
  sim: Sim
  scrub: number
  size?: 'hand' | 'table'
  onRemove: (cardId: string) => void
}): ReactElement {
  const contribution = sim.active.contributions.find((s) => s.id === card.id)
  const balanceSeries = sim.active.balances.find((s) => s.id === card.id)
  const isBalance = card.kind === 'asset' || card.kind === 'debt'
  const value = isBalance ? (balanceSeries ? valueAt(balanceSeries, scrub) : 0) : contribution ? valueAt(contribution, scrub) : 0
  const sparkline = isBalance ? balanceSeries?.points : contribution?.points

  return (
    <div className="stack">
      <Card
        size={size}
        face={{
          kind: card.kind,
          name: card.name ?? card.id,
          glyph: glyphFor(card),
          headline: isBalance ? formatAmount(value) : formatPerMonth(value),
          headlineClass: value > 0 ? 'pos' : value < 0 ? 'neg' : '',
          stats: frontStats(card),
          ...(sparkline ? { sparkline } : {}),
        }}
      />
      <button className="card-shelf mod-remove" title="Discard to the draw pile" aria-label="Discard" onClick={() => onRemove(card.id)}>
        <Glyph name="flame" size={15} />
      </button>
    </div>
  )
}
