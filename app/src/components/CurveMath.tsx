import { evalCurve, formatMonth, priceCurveOf, type Card as EngineCard, type Curve, type World } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatAmount } from '../format'
import { Sparkline } from './Sparkline'

/**
 * The formula half of a card's back — "back = math" (DESIGN.md §7). The
 * analytic shapes already say their numbers through the dials; expression
 * and sampled curves have no numbers to scale, so this block prints what
 * they ARE — the full ƒ(t), or the data's coverage — and draws the curve
 * over the table's horizon. Read-only: real edits live in the Workshop.
 */

/** The curve a card's money follows, and the word for what that curve prices. */
function curveOf(card: EngineCard): { noun: string; curve: Curve } | null {
  switch (card.kind) {
    case 'source':
      return { noun: 'Flow', curve: card.flow }
    case 'drain':
      return card.amount !== undefined ? { noun: 'Amount', curve: card.amount } : null
    case 'asset':
      return card.price !== undefined ? { noun: 'Price', curve: priceCurveOf(card.price) } : null
    default:
      return null
  }
}

/** Whether the card's back has a formula to print — decides flippability alongside the dials. */
export function hasCurveMath(card: EngineCard): boolean {
  const found = curveOf(card)
  return found !== null && (found.curve.type === 'expression' || found.curve.type === 'sampled')
}

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <span className="param-label">
      <span>{label}</span>
      <span className="param-value num">{value}</span>
    </span>
  )
}

function Plot({ points }: { points: number[] }): ReactElement | null {
  if (points.length < 2) return null
  return (
    <div className="back-plot">
      <Sparkline points={points} width={148} height={40} />
    </div>
  )
}

export function CurveMath({ card, world, from, months }: { card: EngineCard; world: World; from: number; months: number }): ReactElement | null {
  const found = curveOf(card)
  if (found === null) return null
  const { noun, curve } = found

  if (curve.type === 'expression') {
    let points: number[] = []
    try {
      points = Array.from({ length: months }, (_, t) => evalCurve(curve, { t, month: from + t }))
    } catch {
      points = [] // a formula the engine can't read draws nothing — the text still shows
    }
    const first = points[0]
    const last = points[points.length - 1]
    return (
      <div className="curve-math">
        <div className="param">
          <span className="param-label">
            <span>ƒ(t, month)</span>
          </span>
          <code className="curve-expr">{curve.expr}</code>
        </div>
        <Plot points={points} />
        {first !== undefined && last !== undefined && (
          <div className="param">
            <Row label={formatMonth(from)} value={formatAmount(first)} />
            <Row label={formatMonth(from + months - 1)} value={formatAmount(last)} />
          </div>
        )}
        <p className="curve-vars">t counts months in play · month is the calendar month</p>
      </div>
    )
  }

  if (curve.type === 'sampled') {
    const data = curve.data ?? (curve.seriesId !== undefined ? world.series?.[curve.seriesId] : undefined)
    if (data === undefined || data.values.length === 0) {
      return (
        <div className="curve-math">
          <div className="param">
            <Row label="Data" value={curve.seriesId ?? '—'} />
          </div>
        </div>
      )
    }
    const last = data.startMonth + data.values.length - 1
    return (
      <div className="curve-math">
        <Plot points={data.values} />
        <div className="param">
          <Row label="Data" value={`${formatMonth(data.startMonth)} → ${formatMonth(last)}`} />
          <Row label={noun} value={`${formatAmount(data.values[0]!)} → ${formatAmount(data.values[data.values.length - 1]!)}`} />
        </div>
      </div>
    )
  }

  return null
}
