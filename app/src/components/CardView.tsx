import { formatMonth, priceCurveOf, valueAt, type AssetCard, type Card as EngineCard, type Curve, type RuleSchedule, type World } from '@finsim/engine'
import type { ReactElement } from 'react'
import { takeLabel } from '../authored'
import { MONTH_NAMES, formatAmount, formatNumber, formatPerMonth, formatPercent } from '../format'
import { glyphOf } from '../glyph'
import type { CardCompare, Sim } from '../model'
import { applyTune } from '../tune'
import { deltaVerdict } from '../verdict'
import { Card, type CardStat } from './Card'
import { CardShelf } from './CardShelf'
import { TuneDials, dialsOf } from './TuneDials'

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

const signCls = (v: number): CardStat['cls'] => (v > 0 ? 'pos' : v < 0 ? 'neg' : '')

/** The numbers behind a priced asset, at a glance: what f(t) is, and what the data really did. */
function priceStats(price: Curve, card: AssetCard, world: World | undefined): CardStat[] {
  const stats: CardStat[] = []
  switch (price.type) {
    case 'constant':
      stats.push({ label: 'Price', value: formatAmount(price.value) })
      break
    case 'linear':
      stats.push({ label: 'Price', value: formatAmount(price.base) })
      stats.push({ label: 'Drifts', value: `${price.slopePerMonth > 0 ? '+' : '−'}${formatAmount(Math.abs(price.slopePerMonth))} /mo`, cls: signCls(price.slopePerMonth) })
      break
    case 'compound':
      stats.push({ label: 'Price', value: formatAmount(price.base) })
      stats.push({ label: 'Trend', value: `${formatPercent(price.annualRate.expected)} /yr`, cls: signCls(price.annualRate.expected) })
      break
    case 'step':
      stats.push({ label: 'Price', value: formatAmount(price.initial) })
      stats.push({ label: 'Steps', value: `${String(price.steps.length)} scheduled` })
      break
    case 'sinusoidal':
      stats.push({ label: 'Price', value: `${formatAmount(price.base)} ±${formatAmount(price.amplitude)}` })
      break
    case 'expression':
      stats.push({ label: 'ƒ(t)', value: price.expr.length > 24 ? `${price.expr.slice(0, 23)}…` : price.expr })
      break
    case 'sampled': {
      const data = price.data ?? (price.seriesId !== undefined ? world?.series?.[price.seriesId] : undefined)
      if (data) {
        const first = data.values[0]!
        const last = data.values[data.values.length - 1]!
        stats.push({ label: 'Data', value: `${formatMonth(data.startMonth)} → ${formatMonth(data.startMonth + data.values.length - 1)}` })
        stats.push({ label: 'Price', value: `${formatAmount(first)} → ${formatAmount(last)}` })
        if (data.values.length > 1 && first > 0 && last > 0) {
          const cagr = Math.pow(last / first, 12 / (data.values.length - 1)) - 1
          stats.push({ label: 'Trend', value: `${formatPercent(cagr)} /yr`, cls: signCls(cagr) })
        }
      } else {
        stats.push({ label: 'Data', value: price.seriesId ?? '—' })
      }
      // the generic component that takes over when the series ends — sampled prices only
      if (card.growth) stats.push({ label: 'After data', value: `${formatPercent(card.growth.expected)} /yr`, cls: signCls(card.growth.expected) })
      break
    }
  }
  if (card.initialUnits !== undefined && card.initialUnits !== 1) {
    stats.push({ label: 'Units held', value: formatNumber(card.initialUnits) })
  }
  return stats
}

export function frontStats(card: EngineCard, world?: World): CardStat[] {
  const stats: CardStat[] = []
  if (card.kind === 'source' && card.flow.type === 'compound' && card.flow.annualRate.expected > 0) {
    const anchor = card.flow.holdAnchor !== undefined ? ` each ${MONTH_NAMES[card.flow.holdAnchor - 1]!.slice(0, 3)}` : ''
    stats.push({ label: 'Raise', value: `${formatPercent(card.flow.annualRate.expected)} /yr${anchor}` })
  } else if (card.kind === 'drain' && card.percent !== undefined) {
    stats.push({ label: 'Takes', value: `${formatPercent(card.percent, 0)} of subtotal` })
  } else if (card.kind === 'asset') {
    if (card.price) stats.push(...priceStats(priceCurveOf(card.price), card, world))
    else stats.push({ label: 'Growth', value: `${formatPercent(card.growth?.expected ?? 0)} /yr` })
    if ((card.fee ?? 0) > 0) stats.push({ label: 'Fee', value: `${formatPercent(card.fee!, 2)} /yr` })
    if (card.take) stats.push({ label: 'Takes', value: takeLabel(card.take) })
  } else if (card.kind === 'debt') {
    stats.push({ label: 'Interest', value: `${formatPercent(card.interest.expected)} /yr` })
    if (card.payment) stats.push({ label: 'Payment', value: takeLabel(card.payment) })
  } else if (card.kind === 'margin') {
    stats.push({ label: 'Leans on', value: 'assets below' })
    stats.push({ label: 'Loan', value: `${formatPercent(card.ltv, 0)} of their value` })
    stats.push({ label: 'Interest', value: `${formatPercent(card.interest.expected)} /yr`, cls: 'neg' })
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
  flipped = false,
  onRemove,
  onToggle,
  onTune,
  onWorkshop,
}: {
  card: EngineCard
  sim: Sim
  scrub: number
  from: number
  compare?: CardCompare
  size?: 'hand' | 'table'
  /** Turned face-down (the what-if dials) — the tap that turns it lives in the Fan. */
  flipped?: boolean
  onRemove: (cardId: string) => void
  onToggle: (cardId: string) => void
  /** Commit a re-dialed card back onto the table; absent = the back stays sealed. */
  onTune?: (next: EngineCard) => void
  /** Carry this card to the Workshop bench; absent = no hammer on the shelf. */
  onWorkshop?: (cardId: string) => void
}): ReactElement {
  const setAside = card.enabled === false
  const contribution = sim.active.contributions.find((s) => s.id === card.id)
  const balanceSeries = sim.active.balances.find((s) => s.id === card.id)
  const isBalance = card.kind === 'asset' || card.kind === 'debt' || card.kind === 'margin'
  // a rule card moves no money of its own — its stats say what it does
  const isRule = card.kind === 'rule'
  const value = isBalance ? (balanceSeries ? valueAt(balanceSeries, scrub) : 0) : contribution ? valueAt(contribution, scrub) : 0
  const sparkline = isRule ? undefined : isBalance ? balanceSeries?.points : contribution?.points
  const verdict = compare ? deltaVerdict(compare, from) : null
  const back = onTune && dialsOf(card).length > 0 ? <TuneDials card={card} onChange={onTune} /> : undefined
  // the front shows what the table plays: dials applied (the back keeps the authored numbers)
  const played = applyTune(card)

  return (
    <div className={`stack${setAside ? ' set-aside' : ''}`}>
      <Card
        size={size}
        muted={setAside}
        {...(back !== undefined ? { back, flipped } : {})}
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
          stats: frontStats(played, sim.world),
          ...(sparkline ? { sparkline } : {}),
          ...(verdict ? { verdict } : {}),
        }}
      />
      <CardShelf
        noun="card"
        setAside={setAside}
        onToggle={() => onToggle(card.id)}
        onRemove={() => onRemove(card.id)}
        {...(onWorkshop ? { onWorkshop: () => onWorkshop(card.id) } : {})}
      />
    </div>
  )
}
