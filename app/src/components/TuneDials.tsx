import { priceCurveOf, type Card as EngineCard, type Curve, type Take } from '@finsim/engine'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { CADENCE_SUFFIX } from '../authored'
import { formatNumber, round } from '../format'
import { effectiveValue, tuneOf, withTune } from '../tune'

/**
 * The back of a card in play: what-if dials only, and the only place the
 * −100..+100 % dials live — the Workshop bench edits the written numbers
 * themselves. The authored value never moves, the table plays
 * value × (1 + pct/100), and re-centering restores it exactly. Real edits
 * (curve shapes, units, text) stay in the Workshop; this is the "ephemeral
 * experiments" allowance of DESIGN.md §7's cards-are-static decision.
 */

interface Dial {
  label: string
  path: string
  base: number
  format: (v: number) => string
}

const money = (v: number): string => formatNumber(Math.round(v))
const rate = (v: number): string => `${formatNumber(round(v * 100))} %/yr`
const share = (v: number): string => `${formatNumber(round(v * 100))} %`

/** A dial exists only where a number does — a dial on 0 (or nothing) scales nothing. */
function dial(label: string, path: string, base: number | undefined, format: (v: number) => string): Dial[] {
  return base !== undefined && base !== 0 ? [{ label, path, base, format }] : []
}

function curveDials(curve: Curve, path: string, suffix: string): Dial[] {
  const amount = (v: number): string => `${money(v)}${suffix}`
  switch (curve.type) {
    case 'constant':
      return dial('Amount', `${path}.value`, curve.value, amount)
    case 'linear':
      return [...dial('Starts at', `${path}.base`, curve.base, amount), ...dial('Drift', `${path}.slopePerMonth`, curve.slopePerMonth, (v) => `${money(v)}/mo`)]
    case 'compound':
      return [...dial('Starts at', `${path}.base`, curve.base, amount), ...dial('Grows', `${path}.annualRate.expected`, curve.annualRate.expected, rate)]
    case 'step':
      return [
        ...dial('Starts at', `${path}.initial`, curve.initial, amount),
        ...curve.steps.flatMap((step, i) => dial(`Month ${String(step.atMonth)} →`, `${path}.steps.${String(i)}.value`, step.value, money)),
      ]
    case 'sinusoidal':
      return [...dial('Around', `${path}.base`, curve.base, amount), ...dial('Swings ±', `${path}.amplitude`, curve.amplitude, money)]
    case 'sampled':
    case 'expression':
      return []
  }
}

function takeDials(label: string, path: string, take: Take | undefined): Dial[] {
  if (take?.type === 'fixed') return dial(label, `${path}.amountPerMonth`, take.amountPerMonth, (v) => `${money(v)}/mo`)
  if (take?.type === 'percent') return dial(label, `${path}.percent`, take.percent, share)
  return []
}

/** Every dial this card offers — empty means the card has nothing to tune (no back). */
export function dialsOf(card: EngineCard): Dial[] {
  const suffix = 'cadence' in card ? CADENCE_SUFFIX[card.cadence ?? 'monthly'] : '/mo'
  switch (card.kind) {
    case 'source':
      return curveDials(card.flow, 'flow', suffix)
    case 'drain':
      return card.percent !== undefined
        ? dial('Takes', 'percent', card.percent, share)
        : curveDials(card.amount ?? { type: 'constant', value: 0 }, 'amount', suffix)
    case 'asset': {
      const price = card.price ? priceCurveOf(card.price) : null
      // an analytic price is its own dials; growth (and its dice) belong only
      // to the sampled fallback and the growth-rate asset
      const sampled = price === null || price.type === 'sampled'
      return [
        ...(price
          ? [
              ...dial('Units held', 'initialUnits', card.initialUnits, (v) => formatNumber(round(v))),
              // a bare SampledRef never reaches here as analytic, so 'price.…' paths always resolve
              ...(price.type === 'sampled' ? [] : curveDials(price, 'price', '')),
            ]
          : [...dial('Already holds', 'initialBalance', card.initialBalance, money), ...dial('Fee', 'fee', card.fee, rate)]),
        ...(sampled ? dial(price ? 'After data' : 'Grows', 'growth.expected', card.growth?.expected, rate) : []),
        ...(sampled ? dial('Volatility', 'growth.volatility', card.growth?.volatility, rate) : []),
        ...takeDials('Deposits', 'take', card.take),
      ]
    }
    case 'debt':
      return [
        ...dial('Principal', 'principal', card.principal, money),
        ...dial('Interest', 'interest.expected', card.interest.expected, rate),
        ...takeDials('Pays', 'payment', card.payment),
      ]
    case 'margin':
      return [...dial('Loan-to-value', 'ltv', card.ltv, share), ...dial('Interest', 'interest.expected', card.interest.expected, rate)]
    case 'rule': {
      const effect = card.rule.effect
      return 'rate' in effect
        ? dial('Rate', 'rule.effect.rate', effect.rate, share)
        : dial('Factor', 'rule.effect.factor', effect.factor, (v) => `× ${formatNumber(round(v))}`)
    }
    case 'hand':
      return takeDials('Takes', 'take', card.take)
  }
}

/** How often a drag replays the table — the thumb and readout track every pixel regardless. */
const COMMIT_EVERY_MS = 150

function DialRow({ card, row, onChange }: { card: EngineCard; row: Dial; onChange: (next: EngineCard) => void }): ReactElement {
  const { label, path, base, format } = row
  const committed = tuneOf(card)[path] ?? 0
  // a full replay of the table per pointer move melts the CPU — the thumb and
  // the readout follow the pointer instantly on local state, and the table
  // replays on a throttled beat, with a final commit when the drag settles
  const [draft, setDraft] = useState<number | null>(null)
  const pct = draft ?? committed
  const latest = useRef(committed)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const push = useRef<(v: number) => void>(() => undefined)
  push.current = (v) => onChange(withTune(card, path, v))

  const slide = (v: number): void => {
    latest.current = v
    setDraft(v)
    timer.current ??= setTimeout(() => {
      timer.current = null
      push.current(latest.current)
    }, COMMIT_EVERY_MS)
  }

  const settle = (v = latest.current): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    latest.current = v
    if (draft !== null || v !== committed) push.current(v)
    setDraft(null)
  }

  // turning the card back mid-drag must not lose the last position
  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current)
        push.current(latest.current)
      }
    },
    [],
  )

  return (
    <div className="param">
      <span className="param-label">
        <span>{label}</span>
        <span className="param-value num">{format(base)}</span>
      </span>
      <input
        type="range"
        className={pct === 0 ? undefined : 'tuned'}
        min={-100}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => slide(Number(e.target.value))}
        onPointerUp={() => settle()}
        onKeyUp={() => settle()}
        onBlur={() => settle()}
        onDoubleClick={() => settle(0)}
      />
      {pct !== 0 && (
        <em className="tune-note">
          {pct > 0 ? '+' : ''}
          {pct} % → {format(effectiveValue(path, base, pct))}
        </em>
      )}
    </div>
  )
}

export function TuneDials({ card, onChange }: { card: EngineCard; onChange: (next: EngineCard) => void }): ReactElement {
  return (
    <>
      {dialsOf(card).map((row) => (
        <DialRow key={row.path} card={card} row={row} onChange={onChange} />
      ))}
      <p className="tune-hint">what-if dials — the written numbers stand · double-click recenters</p>
    </>
  )
}
