import {
  formatMonth,
  priceCurveOf,
  type AssetCard,
  type Card as EngineCard,
  type DebtCard,
  type DrainCard,
  type MarginCard,
  type RuleCard,
  type SourceCard,
  type Take,
} from '@finsim/engine'
import type { ReactElement } from 'react'
import { MONTH_NAMES } from '../format'
import { parseMonthText } from '../seriesImport'
import { CurveField, curveBase } from './CurveField'
import { Money, Num, RateField, Row, Select, Share, Text } from './fields'

/* ---- takes and the kind-specific editors ---- */

export function TakeField({ label, take, onCommit }: { label: string; take: Take | undefined; onCommit: (t: Take | undefined) => void }): ReactElement {
  const mode = take?.type ?? 'none'
  return (
    <>
      <Select
        label={label}
        value={mode}
        options={[
          ['none', 'nothing'],
          ['fixed', 'a fixed amount'],
          ['percent', '% of the subtotal'],
        ]}
        onCommit={(m) => onCommit(m === 'none' ? undefined : m === 'fixed' ? { type: 'fixed', amountPerMonth: 1_000 } : { type: 'percent', percent: 0.1 })}
      />
      {take?.type === 'fixed' && <Money label="Takes" value={take.amountPerMonth} onCommit={(amountPerMonth) => onCommit({ type: 'fixed', amountPerMonth })} unit="/mo" />}
      {take?.type === 'percent' && <Share label="Takes" value={take.percent} onCommit={(percent) => onCommit({ type: 'percent', percent })} />}
    </>
  )
}

export function SourceEditor({ card, onChange }: { card: SourceCard; onChange: (c: EngineCard) => void }): ReactElement {
  return <CurveField curve={card.flow} cadence={card.cadence} onCommit={(flow, cadence) => onChange(withOptional({ ...card, flow }, 'cadence', cadence))} />
}

export function DrainEditor({ card, onChange }: { card: DrainCard; onChange: (c: EngineCard) => void }): ReactElement {
  const mode = card.percent !== undefined ? 'percent' : 'fixed'
  return (
    <>
      <Select
        label="Drains"
        value={mode}
        options={[
          ['fixed', 'a fixed amount'],
          ['percent', '% of the subtotal'],
        ]}
        onCommit={(m) => {
          if (m === mode) return
          const next = { ...card }
          if (m === 'percent') {
            delete next.amount
            delete next.cadence // a percent drain is a per-tick share
            next.percent = 0.3
          } else {
            delete next.percent
            next.amount = { type: 'constant', value: 5_000 }
          }
          onChange(next)
        }}
      />
      {card.percent !== undefined && <Share label="Takes" value={card.percent} onCommit={(percent) => onChange({ ...card, percent })} />}
      {card.percent === undefined && (
        <CurveField
          curve={card.amount ?? { type: 'constant', value: 0 }}
          cadence={card.cadence}
          onCommit={(amount, cadence) => onChange(withOptional({ ...card, amount }, 'cadence', cadence))}
        />
      )}
    </>
  )
}

/** The growth trio, shared by both asset shapes — on a priced card it is the post-data fallback. */
function GrowthFields({ card, onChange, label }: { card: AssetCard; onChange: (c: EngineCard) => void; label: string }): ReactElement {
  return (
    <>
      <RateField label={label} value={card.growth?.expected ?? 0} onCommit={(expected) => onChange({ ...card, growth: { ...card.growth, expected } })} />
      <RateField
        label="Volatility"
        value={card.growth?.volatility ?? 0}
        onCommit={(v) =>
          onChange({
            ...card,
            growth: {
              expected: card.growth?.expected ?? 0,
              // no volatility, no correlation — there is nothing left to correlate
              ...(v > 0 ? { volatility: v } : {}),
              ...(v > 0 && card.growth?.correlation !== undefined ? { correlation: card.growth.correlation } : {}),
            },
          })
        }
      />
      {(card.growth?.volatility ?? 0) > 0 && (
        <Num
          label="Moves with market"
          value={card.growth?.correlation ?? 1}
          onCommit={(v) => {
            const rho = Math.max(-1, Math.min(1, v))
            const growth = { expected: card.growth?.expected ?? 0, volatility: card.growth?.volatility ?? 0, ...(rho !== 1 ? { correlation: rho } : {}) }
            onChange({ ...card, growth })
          }}
          scale={100}
          unit="%"
        />
      )}
    </>
  )
}

export function AssetEditor({ card, onChange }: { card: AssetCard; onChange: (c: EngineCard) => void }): ReactElement {
  const price = card.price ? priceCurveOf(card.price) : null
  return (
    <>
      <Select
        label="Worth"
        value={price ? 'priced' : 'growth'}
        options={[
          ['growth', 'a balance growing by rate'],
          ['priced', 'units × a price curve f(t)'],
        ]}
        onCommit={(mode) => {
          if ((mode === 'priced') === (price !== null)) return
          const next = { ...card }
          if (mode === 'priced') {
            // the balance carries over as the opening price of one unit
            next.price = { type: 'linear', base: card.initialBalance ?? 100_000, slopePerMonth: 0 }
            next.initialUnits = 1
            delete next.initialBalance
            delete next.fee
          } else {
            next.initialBalance = curveBase(price!) || undefined
            delete next.price
            delete next.initialUnits
          }
          onChange(next)
        }}
      />
      {price ? (
        <>
          <CurveField curve={price} cadence={undefined} money onCommit={(p) => onChange({ ...card, price: p })} />
          <Num label="Units held" value={card.initialUnits ?? 0} onCommit={(initialUnits) => onChange({ ...card, initialUnits })} />
          {/* when a series runs out mid-horizon, this generic component takes over from the last real
              price; an analytic curve never ends, so it has nothing to fall back to */}
          {price.type === 'sampled' && <GrowthFields card={card} onChange={onChange} label="After data" />}
        </>
      ) : (
        <>
          <Money label="Already holds" value={card.initialBalance ?? 0} onCommit={(v) => onChange(withOptional(card, 'initialBalance', v || undefined))} />
          <GrowthFields card={card} onChange={onChange} label="Grows" />
          <RateField label="Fee" value={card.fee ?? 0} onCommit={(v) => onChange(withOptional(card, 'fee', v > 0 ? v : undefined))} />
        </>
      )}
      <TakeField label="Deposits" take={card.take} onCommit={(take) => onChange(withOptional(card, 'take', take))} />
    </>
  )
}

export function DebtEditor({ card, onChange }: { card: DebtCard; onChange: (c: EngineCard) => void }): ReactElement {
  return (
    <>
      <Money label="Principal" value={card.principal} onCommit={(principal) => onChange({ ...card, principal })} />
      <RateField label="Interest" value={card.interest.expected} onCommit={(expected) => onChange({ ...card, interest: { ...card.interest, expected } })} />
      <TakeField label="Pays" take={card.payment} onCommit={(payment) => onChange(withOptional(card, 'payment', payment))} />
    </>
  )
}

/**
 * The companion's two dials. The loan-to-value is a share of the pegged
 * assets' balance, kept strictly inside 0..1 — the engine rejects both ends
 * (0 pegs nothing, 1 borrows without limit) — and what it pegs is not a
 * parameter at all: position is the peg, the assets below it in its hand.
 */
export function MarginEditor({ card, onChange }: { card: MarginCard; onChange: (c: EngineCard) => void }): ReactElement {
  return (
    <>
      <Num label="Loan-to-value" value={card.ltv} onCommit={(v) => onChange({ ...card, ltv: Math.min(0.99, Math.max(0.001, v)) })} scale={100} unit="%" />
      <RateField label="Interest" value={card.interest.expected} onCommit={(expected) => onChange({ ...card, interest: { ...card.interest, expected } })} />
    </>
  )
}

const MONTH_OPTIONS: [string, string][] = MONTH_NAMES.map((name, i) => [String(i + 1), name])

export function RuleEditor({ card, onChange, from }: { card: RuleCard; onChange: (c: EngineCard) => void; from: number }): ReactElement {
  const { rule } = card
  const commit = (partial: Partial<RuleCard['rule']>): void => onChange({ ...card, rule: { ...rule, ...partial } })
  const effect = rule.effect
  return (
    <>
      <Select
        label="Effect"
        value={effect.type}
        options={[
          ['balanceTax', 'tax on balances'],
          ['flowTax', 'tax on flows'],
          ['balanceScale', 'scale balances'],
          ['flowScale', 'scale flows'],
        ]}
        onCommit={(type) => {
          if (type === effect.type) return
          commit({
            effect:
              type === 'balanceTax' || type === 'flowTax'
                ? { type, rate: 'rate' in effect ? effect.rate : 0.01 }
                : { type, factor: 'factor' in effect ? effect.factor : 1 },
          })
        }}
      />
      {'rate' in effect && <Share label="Rate" value={effect.rate} onCommit={(rate) => commit({ effect: { ...effect, rate } })} />}
      {'factor' in effect && <Num label="Factor" value={effect.factor} onCommit={(factor) => commit({ effect: { ...effect, factor } })} unit="×" />}
      <Select
        label="Fires"
        value={rule.schedule.kind}
        options={[
          ['monthly', 'every month'],
          ['yearly', 'once a year'],
          ['once', 'once'],
        ]}
        onCommit={(kind) => {
          if (kind === rule.schedule.kind) return
          commit({ schedule: kind === 'monthly' ? { kind } : kind === 'yearly' ? { kind, monthOfYear: 12 } : { kind, atMonth: from + 12 } })
        }}
      />
      {rule.schedule.kind === 'yearly' && (
        <Select
          label="In"
          value={String(rule.schedule.monthOfYear)}
          options={MONTH_OPTIONS}
          onCommit={(m) => commit({ schedule: { kind: 'yearly', monthOfYear: Number(m) } })}
        />
      )}
      {rule.schedule.kind === 'once' && (
        <Row label="On">
          <input
            type="month"
            value={formatMonth(rule.schedule.atMonth)}
            onChange={(e) => {
              const atMonth = parseMonthText(e.target.value)
              if (atMonth !== null) commit({ schedule: { kind: 'once', atMonth } })
            }}
          />
        </Row>
      )}
      <Text
        label="Hits tags"
        value={rule.target.tags?.join(', ') ?? ''}
        placeholder="fund, equity — cards below only"
        onCommit={(text) => {
          const tags = text.split(',').map((t) => t.trim()).filter(Boolean)
          const target = { ...rule.target }
          if (tags.length > 0) target.tags = tags
          else delete target.tags
          commit({ target })
        }}
      />
    </>
  )
}

/** Set-or-delete an optional key, keeping the card JSON tidy. */
export function withOptional<C extends EngineCard, K extends keyof C>(card: C, key: K, value: C[K] | undefined): C {
  const next = { ...card }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}
