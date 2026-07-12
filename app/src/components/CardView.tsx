import { formatMonth, valueAt, type Card as EngineCard, type RuleSchedule } from '@finsim/engine'
import type { ReactElement } from 'react'
import { takeLabel } from '../authored'
import { MONTH_NAMES, formatAmount, formatPerMonth, formatPercent } from '../format'
import { glyphOf } from '../glyph'
import type { CardCompare, Sim } from '../model'
import { deltaVerdict } from '../verdict'
import { Card, type CardStat } from './Card'
import { CardShelf } from './CardShelf'

/** An engine card dressed for the table: glyph, live headline, stat rows. */

function scheduleLabel(schedule: RuleSchedule): string {
  switch (schedule.kind) {
    case 'monthly':
      return 'every month'
    case 'yearly':
      return `every ${MONTH_NAMES[schedule.monthOfYear - 1]}`
    case 'once':
      return `once, ${formatMonth(schedule.atMonth)}`
  }
}

function frontStats(card: EngineCard): CardStat[] {
  const stats: CardStat[] = []
  if (card.kind === 'source' && card.flow.type === 'compound' && card.flow.annualRate.expected > 0) {
    const anchor = card.flow.holdAnchor !== undefined ? ` each ${MONTH_NAMES[card.flow.holdAnchor - 1]!.slice(0, 3)}` : ''
    stats.push({ label: 'Raise', value: `${formatPercent(card.flow.annualRate.expected)} /yr${anchor}` })
  } else if (card.kind === 'drain' && card.percent !== undefined) {
    stats.push({ label: 'Takes', value: `${formatPercent(card.percent, 0)} of subtotal` })
  } else if (card.kind === 'asset') {
    if (!card.price) stats.push({ label: 'Growth', value: `${formatPercent(card.growth?.expected ?? 0)} /yr` })
    if ((card.fee ?? 0) > 0) stats.push({ label: 'Fee', value: `${formatPercent(card.fee!, 2)} /yr` })
    if (card.take) stats.push({ label: 'Takes', value: takeLabel(card.take) })
  } else if (card.kind === 'debt') {
    stats.push({ label: 'Interest', value: `${formatPercent(card.interest.expected)} /yr` })
    if (card.payment) stats.push({ label: 'Payment', value: takeLabel(card.payment) })
  } else if (card.kind === 'hand' && card.take) {
    stats.push({ label: 'Takes', value: takeLabel(card.take) })
  } else if (card.kind === 'rule') {
    const { schedule, target, effect } = card.rule
    if (effect.type === 'balanceTax') stats.push({ label: 'Drains', value: `${formatPercent(effect.rate, 2)} of balance`, cls: 'neg' })
    else if (effect.type === 'flowTax') stats.push({ label: 'Taxes', value: formatPercent(effect.rate, 0), cls: 'neg' })
    else stats.push({ label: 'Scales', value: `× ${effect.factor}` })
    stats.push({ label: 'On', value: `${target.tags?.join(', ') ?? target.kinds?.join(', ') ?? 'cards'} below` })
    stats.push({ label: 'When', value: scheduleLabel(schedule) })
  }
  return stats
}

export function CardView({
  card,
  sim,
  scrub,
  from,
  compare,
  size = 'table',
  onRemove,
  onToggle,
}: {
  card: EngineCard
  sim: Sim
  scrub: number
  from: number
  compare?: CardCompare
  size?: 'hand' | 'table'
  onRemove: (cardId: string) => void
  onToggle: (cardId: string) => void
}): ReactElement {
  const setAside = card.enabled === false
  const contribution = sim.active.contributions.find((s) => s.id === card.id)
  const balanceSeries = sim.active.balances.find((s) => s.id === card.id)
  const isBalance = card.kind === 'asset' || card.kind === 'debt'
  // a rule card moves no money of its own — its stats say what it does
  const isRule = card.kind === 'rule'
  const value = isBalance ? (balanceSeries ? valueAt(balanceSeries, scrub) : 0) : contribution ? valueAt(contribution, scrub) : 0
  const sparkline = isRule ? undefined : isBalance ? balanceSeries?.points : contribution?.points
  const verdict = compare ? deltaVerdict(compare, from) : null

  return (
    <div className={`stack${setAside ? ' set-aside' : ''}`}>
      <Card
        size={size}
        muted={setAside}
        face={{
          kind: card.kind,
          name: card.name ?? card.id,
          glyph: glyphOf(card),
          ...(isRule
            ? {}
            : {
                headline: isBalance ? formatAmount(value) : formatPerMonth(value),
                headlineClass: value > 0 ? ('pos' as const) : value < 0 ? ('neg' as const) : ('' as const),
              }),
          stats: frontStats(card),
          ...(sparkline ? { sparkline } : {}),
          ...(verdict ? { verdict } : {}),
        }}
      />
      <CardShelf noun="card" setAside={setAside} onToggle={() => onToggle(card.id)} onRemove={() => onRemove(card.id)} />
    </div>
  )
}
