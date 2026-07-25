import { formatMonth, type Cadence, type Curve } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatAmount } from '../format'
import { AmountField, ExpressionField, HoldRateField, Money, Num, Row, Select, Text } from './fields'

/* ---- curves: every card is f(t), and this is where f gets shaped ---- */

const CURVE_TYPES: [Curve['type'], string][] = [
  ['constant', 'constant'],
  ['linear', 'linear drift'],
  ['compound', 'compound growth'],
  ['step', 'steps'],
  ['sinusoidal', 'seasonal'],
  ['sampled', 'historical data'],
  ['expression', 'formula'],
]

export function curveBase(curve: Curve): number {
  switch (curve.type) {
    case 'constant':
      return curve.value
    case 'linear':
    case 'compound':
    case 'sinusoidal':
      return curve.base
    case 'step':
      return curve.initial
    case 'sampled':
      // switching away from data seeds the new shape where the data began
      return curve.data?.values[0] ?? 0
    case 'expression':
      return 0
  }
}

function curveOfType(type: Curve['type'], from: Curve): Curve {
  const base = curveBase(from) || 10_000
  switch (type) {
    case 'constant':
      return { type, value: base }
    case 'linear':
      return { type, base, slopePerMonth: 0 }
    case 'compound':
      // no holdMonths: a fresh compound lands smooth, "(m)" — the fund
      // convention; a raise is written explicitly ("/yr", "(jan)")
      return { type, base, annualRate: { expected: 0.02 } }
    case 'step':
      return { type, initial: base, steps: [{ atMonth: 12, value: base }] }
    case 'sinusoidal':
      return { type, base, amplitude: Math.round(base / 5), periodMonths: 12 }
    case 'sampled':
      return { type, seriesId: '' }
    case 'expression':
      return { type, expr: String(base) }
  }
}

/** Keep step months valid mid-edit: strictly increasing, later entry wins. */
function normalizeSteps(steps: { atMonth: number; value: number }[]): { atMonth: number; value: number }[] {
  const byMonth = new Map<number, number>()
  for (const s of steps) byMonth.set(Math.max(1, Math.round(s.atMonth)), s.value)
  return [...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([atMonth, value]) => ({ atMonth, value }))
}

/**
 * A flow curve and its cadence, committed together: the primary amount field
 * carries the unit ("…/mo", "…/w"), so the cadence needs no dropdown.
 * With `money` the amounts are plain kr — a price curve, not a flow: no
 * cadence in the text, and the committed cadence never changes.
 */
export function CurveField({
  curve,
  cadence,
  money = false,
  onCommit,
}: {
  curve: Curve
  cadence: Cadence | undefined
  money?: boolean
  onCommit: (c: Curve, cadence: Cadence | undefined) => void
}): ReactElement {
  // secondary fields change the curve only; the cadence rides along untouched
  const commit = (c: Curve): void => onCommit(c, cadence)
  return (
    <>
      <Select label="Curve" value={curve.type} options={CURVE_TYPES} onCommit={(type) => commit(curveOfType(type, curve))} />
      {curve.type === 'constant' &&
        (money ? (
          <Money label="Price" value={curve.value} onCommit={(value) => commit({ ...curve, value })} />
        ) : (
          <AmountField label="Amount" value={curve.value} cadence={cadence} onCommit={(value, cad) => onCommit({ ...curve, value }, cad)} />
        ))}
      {curve.type === 'linear' && (
        <>
          {money ? (
            <Money label="Starts at" value={curve.base} onCommit={(base) => commit({ ...curve, base })} />
          ) : (
            <AmountField label="Starts at" value={curve.base} cadence={cadence} onCommit={(base, cad) => onCommit({ ...curve, base }, cad)} />
          )}
          <Num label="Drift" value={curve.slopePerMonth} onCommit={(slopePerMonth) => commit({ ...curve, slopePerMonth })} unit="/mo" compact />
        </>
      )}
      {curve.type === 'compound' && (
        <>
          {money ? (
            <Money label="Starts at" value={curve.base} onCommit={(base) => commit({ ...curve, base })} />
          ) : (
            <AmountField label="Starts at" value={curve.base} cadence={cadence} onCommit={(base, cad) => onCommit({ ...curve, base }, cad)} />
          )}
          <HoldRateField
            label="Grows"
            value={curve.annualRate.expected}
            landing={{ holdMonths: curve.holdMonths, holdAnchor: curve.holdAnchor }}
            onCommit={(expected, landing) => {
              const next = { ...curve, annualRate: { ...curve.annualRate, expected } }
              if (landing.holdMonths === undefined) delete next.holdMonths
              else next.holdMonths = landing.holdMonths
              if (landing.holdAnchor === undefined) delete next.holdAnchor
              else next.holdAnchor = landing.holdAnchor
              commit(next)
            }}
          />
        </>
      )}
      {curve.type === 'step' && (
        <>
          {money ? (
            <Money label="Starts at" value={curve.initial} onCommit={(initial) => commit({ ...curve, initial })} />
          ) : (
            <AmountField label="Starts at" value={curve.initial} cadence={cadence} onCommit={(initial, cad) => onCommit({ ...curve, initial }, cad)} />
          )}
          {curve.steps.map((step, i) => (
            <div className="step-row" key={i}>
              <Num
                label={`Month ${String(step.atMonth)} →`}
                value={step.value}
                onCommit={(value) => commit({ ...curve, steps: normalizeSteps(curve.steps.map((s, j) => (j === i ? { ...s, value } : s))) })}
                compact
              />
              <div className="step-tools">
                <Num
                  label="at month"
                  value={step.atMonth}
                  onCommit={(atMonth) => commit({ ...curve, steps: normalizeSteps(curve.steps.map((s, j) => (j === i ? { ...s, atMonth } : s))) })}
                />
                <button className="sign card-action" onClick={() => commit({ ...curve, steps: curve.steps.filter((_, j) => j !== i) })}>
                  remove
                </button>
              </div>
            </div>
          ))}
          <button
            className="sign card-action"
            onClick={() => {
              const last = curve.steps[curve.steps.length - 1]
              commit({ ...curve, steps: normalizeSteps([...curve.steps, { atMonth: (last?.atMonth ?? 0) + 12, value: last?.value ?? curve.initial }]) })
            }}
          >
            + add step
          </button>
        </>
      )}
      {curve.type === 'sinusoidal' && (
        <>
          {money ? (
            <Money label="Around" value={curve.base} onCommit={(base) => commit({ ...curve, base })} />
          ) : (
            <AmountField label="Around" value={curve.base} cadence={cadence} onCommit={(base, cad) => onCommit({ ...curve, base }, cad)} />
          )}
          <Money label="Swings ±" value={curve.amplitude} onCommit={(amplitude) => commit({ ...curve, amplitude })} />
          <Num label="Every" value={curve.periodMonths} onCommit={(periodMonths) => commit({ ...curve, periodMonths: Math.max(1, periodMonths) })} unit="mo" />
        </>
      )}
      {curve.type === 'sampled' &&
        (curve.data ? (
          // inline data is edited on the Data bench — here it reads as what it is
          <Row label="Data">
            <p className="param-note num">
              {formatMonth(curve.data.startMonth)} → {formatMonth(curve.data.startMonth + curve.data.values.length - 1)} ·{' '}
              {formatAmount(curve.data.values[0] ?? 0)} → {formatAmount(curve.data.values[curve.data.values.length - 1] ?? 0)}
            </p>
          </Row>
        ) : (
          <Text label="Data series" value={curve.seriesId ?? ''} placeholder="series id from a data pack" onCommit={(seriesId) => commit({ ...curve, seriesId })} />
        ))}
      {curve.type === 'expression' && <ExpressionField expr={curve.expr} onCommit={(expr) => commit({ ...curve, expr })} />}
    </>
  )
}
