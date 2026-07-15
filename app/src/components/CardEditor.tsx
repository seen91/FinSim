import {
  compileExpression,
  formatMonth,
  type AssetCard,
  type Cadence,
  type Card as EngineCard,
  type Curve,
  type DebtCard,
  type DrainCard,
  type RuleCard,
  type SourceCard,
  type Take,
} from '@finsim/engine'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { CADENCE_SUFFIX, type AuthoredCard } from '../authored'
import { MONTH_NAMES, formatNumber } from '../format'
import { CARD_GLYPHS } from '../glyph'
import { Glyph } from '../icons'
import { parseMonthText } from '../seriesImport'

/**
 * The back of the card is the card creator (DESIGN.md §3): every parameter a
 * live field, edits committed on every change so the chart (or the face)
 * answers immediately. Here the written numbers ARE the design — the
 * −100..+100 % what-if dials belong to cards in play (TuneDials), not the
 * Workshop bench.
 *
 * Amounts and rates carry their unit in the text itself: type "5000/w",
 * "480000/yr" or "1 %/m" and the field understands — no cadence dropdown.
 */

/** The unit tokens an amount or rate accepts after a slash. */
const UNIT_TOKENS: Record<string, Cadence> = {
  w: 'weekly',
  wk: 'weekly',
  week: 'weekly',
  '2w': 'biweekly',
  '2wk': 'biweekly',
  biweekly: 'biweekly',
  m: 'monthly',
  mo: 'monthly',
  month: 'monthly',
  q: 'quarterly',
  qtr: 'quarterly',
  quarter: 'quarterly',
  y: 'yearly',
  yr: 'yearly',
  year: 'yearly',
}

const PERIODS_PER_YEAR: Record<Cadence, number> = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 }

/**
 * "5 000/w" → amount and cadence; a bare number keeps the current cadence.
 * An attached k or M is a magnitude, same language as the Goal field —
 * "1,5M" is a million and a half, "1,5M/m" is that much per month.
 */
function parseAmount(text: string): { value: number; cadence?: Cadence } | null {
  const cleaned = text.replace(/\s+/g, '').replace(',', '.')
  const m = /^(-?\d+(?:\.\d+)?)([km])?(?:\/(.+))?$/i.exec(cleaned)
  if (!m) return null
  const magnitude = m[2] === undefined ? 1 : m[2].toLowerCase() === 'k' ? 1e3 : 1e6
  const value = Number(m[1]) * magnitude
  if (!Number.isFinite(value)) return null
  if (m[3] === undefined) return { value }
  const cadence = UNIT_TOKENS[m[3].toLowerCase()]
  return cadence ? { value, cadence } : null
}

/** A counted unit token, "2m" → { count: 2, unit: monthly }; a bare unit counts as one. */
function countedUnit(token: string): { count: number; unit: Cadence } | null {
  const m = /^(\d+)?([a-z]+)$/.exec(token)
  const unit = m ? UNIT_TOKENS[m[2] ?? ''] : undefined
  if (!m || !unit) return null
  return { count: m[1] === undefined ? 1 : Math.max(1, Number(m[1])), unit }
}

/** Periods per year a rate's quote unit means: "m" → 12, "2m" → 6, "q" → 4, "2yr" → ½. */
function quotePeriods(token: string): number | null {
  const parsed = countedUnit(token)
  return parsed ? PERIODS_PER_YEAR[parsed.unit] / parsed.count : null
}

/** "3 %/m" → the equivalent annual fraction (compounding); bare "%" means /yr. */
function parseRate(text: string): number | null {
  const cleaned = text.replace(/\s+/g, '').replace(',', '.').replace('%', '')
  const m = /^(-?\d+(?:\.\d+)?)(?:\/(.+))?$/.exec(cleaned)
  if (!m) return null
  const r = Number(m[1]) / 100
  if (!Number.isFinite(r)) return null
  const n = m[2] === undefined ? 1 : quotePeriods(m[2].toLowerCase())
  if (n === null) return null
  return n === 1 ? r : Math.pow(1 + r, n) - 1
}

/** Months a landing token means: "yr" → 12, "q" → 3, "m" → 1, "6m" → 6, "2yr" → 24. */
function landMonths(token: string): number | null {
  const parsed = countedUnit(token)
  if (!parsed) return null
  // sub-monthly landings ("w", "2w") collapse to the tick
  return Math.max(1, Math.round((parsed.count * 12) / PERIODS_PER_YEAR[parsed.unit]))
}

/** "jan" or "january" → 1, … — the calendar month a landing is anchored to. */
const MONTH_TOKENS: Record<string, number> = Object.fromEntries(
  MONTH_NAMES.flatMap((name, i) => [
    [name.toLowerCase(), i + 1],
    [name.slice(0, 3).toLowerCase(), i + 1],
  ]),
)

interface Landing {
  holdMonths: number | undefined
  holdAnchor: number | undefined
}

/**
 * A landing token: "m" | "q" | "yr" | "6m" (interval, anniversary-based),
 * "jan" (yearly, anchored to January), or "q-jan" (interval-anchor).
 */
function parseLanding(token: string): Landing | null {
  const [head, tail] = token.split('-') as [string, string?]
  if (tail !== undefined) {
    const hold = landMonths(head)
    const anchor = MONTH_TOKENS[tail]
    if (hold === null || anchor === undefined) return null
    // an anchor on a monthly landing has nothing to pin — every month lands
    return hold > 1 ? { holdMonths: hold, holdAnchor: anchor } : { holdMonths: undefined, holdAnchor: undefined }
  }
  const anchor = MONTH_TOKENS[token]
  if (anchor !== undefined) return { holdMonths: 12, holdAnchor: anchor }
  const hold = landMonths(token)
  if (hold === null) return null
  return hold > 1 ? { holdMonths: hold, holdAnchor: undefined } : { holdMonths: undefined, holdAnchor: undefined }
}

/**
 * A growth rate on a flow states two periods: the unit it is quoted in and —
 * in parens — when it lands. "3,5 %/yr" is a yearly raise on the card's
 * anniversary; "3,5 %/yr(apr)" is that raise landing every April; "7 %/yr(m)"
 * is quoted per year but lands every month, smooth — how a fund is quoted.
 * Any unit takes a count: "10 %/2m" is 10 % per two months. The parens
 * default to the quote unit; a bare number keeps the current landing and
 * anchor.
 */
function parseHoldRate(text: string, current: Landing): ({ annual: number } & Landing) | null {
  const cleaned = text.replace(/\s+/g, '').replace(',', '.').replace('%', '').toLowerCase()
  const m = /^(-?\d+(?:\.\d+)?)(?:\/([a-z0-9]+))?(?:\(([a-z0-9-]+)\))?$/.exec(cleaned)
  if (!m) return null
  const r = Number(m[1]) / 100
  if (!Number.isFinite(r)) return null
  const n = m[2] === undefined ? 1 : quotePeriods(m[2])
  if (n === null) return null
  const annual = n === 1 ? r : Math.pow(1 + r, n) - 1
  const landing = m[3] !== undefined ? parseLanding(m[3]) : m[2] !== undefined ? parseLanding(m[2]) : current
  if (landing === null) return null
  return { annual, ...landing }
}

/** The landing parens of the canonical rate text: a bare "%/yr" is the anniversary raise, "(m)" is smooth. */
function holdSuffix({ holdMonths, holdAnchor }: Landing): string {
  if (holdMonths === undefined || holdMonths <= 1) return '(m)'
  const interval = holdMonths === 12 ? '' : holdMonths === 3 ? 'q' : `${String(holdMonths)}m`
  const anchor = holdAnchor !== undefined ? MONTH_NAMES[holdAnchor - 1]!.slice(0, 3).toLowerCase() : ''
  if (!interval && !anchor) return ''
  return `(${interval && anchor ? `${interval}-${anchor}` : interval || anchor})`
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000
}

/**
 * A text draft that commits on every valid keystroke but is only rewritten
 * from outside (slider, canonical spelling) while the field is not focused —
 * so typing "…/w" never snaps to "/wk" under the cursor.
 */
function useDraft(canonical: string): {
  draft: string
  setDraft: (text: string) => void
  onFocus: () => void
  onBlur: () => void
} {
  const [draft, setDraft] = useState(canonical)
  const focused = useRef(false)
  const latest = useRef(canonical)
  latest.current = canonical
  useEffect(() => {
    if (!focused.current) setDraft(canonical)
  }, [canonical])
  return {
    draft,
    setDraft,
    onFocus: () => {
      focused.current = true
    },
    onBlur: () => {
      focused.current = false
      setDraft(latest.current)
    },
  }
}

/**
 * A money amount with its unit in the text: "65 000/mo", editable to "/w",
 * "/yr", … The slider moves the number; the unit rides along.
 */
function AmountField({
  label,
  value,
  cadence,
  onCommit,
}: {
  label: string
  value: number
  cadence: Cadence | undefined
  onCommit: (value: number, cadence: Cadence | undefined) => void
}): ReactElement {
  const suffix = CADENCE_SUFFIX[cadence ?? 'monthly']
  const canonical = `${formatNumber(round(value))}${suffix}`
  const { draft, setDraft, onFocus, onBlur } = useDraft(canonical)
  const commit = (text: string): void => {
    setDraft(text)
    const parsed = parseAmount(text)
    if (!parsed) return
    const next = parsed.cadence ?? cadence ?? 'monthly'
    onCommit(Math.max(0, parsed.value), next === 'monthly' ? undefined : next)
  }
  return (
    <label className="param">
      <span className="param-label">
        <span>{label}</span>
        <span className="param-value">
          <input className="num" type="text" inputMode="decimal" value={draft} onChange={(e) => commit(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
        </span>
      </span>
    </label>
  )
}

/**
 * An annual rate, unit editable in the text: "7 %/yr" understands "1 %/m"
 * and compounds it to the yearly figure the engine keeps.
 */
function RateField({ label, value, onCommit }: { label: string; value: number; onCommit: (annual: number) => void }): ReactElement {
  const canonical = `${round(value * 100)} %/yr`
  const { draft, setDraft, onFocus, onBlur } = useDraft(canonical)
  const commit = (text: string): void => {
    setDraft(text)
    const annual = parseRate(text)
    if (annual !== null) onCommit(annual)
  }
  return (
    <label className="param">
      <span className="param-label">
        <span>{label}</span>
        <span className="param-value">
          <input className="num" type="text" inputMode="decimal" value={draft} onChange={(e) => commit(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
        </span>
      </span>
    </label>
  )
}

/**
 * The rate of a compound flow: quote unit and landing in one text —
 * "3,5 %/yr" (a raise), "3,5 %/yr(apr)" (the raise lands each April),
 * "7 %/yr(m)" (smooth, fund-style). Commits the annual rate the engine
 * keeps plus the curve's holdMonths/holdAnchor. A small ⓘ beside the
 * label shows the grammar as a hover tooltip — floating, so the card
 * back never grows or scrolls for it.
 */
function HoldRateField({
  label,
  value,
  landing,
  onCommit,
}: {
  label: string
  value: number
  landing: Landing
  onCommit: (annual: number, landing: Landing) => void
}): ReactElement {
  const suffix = holdSuffix(landing)
  const canonical = `${round(value * 100)} %/yr${suffix}`
  const { draft, setDraft, onFocus, onBlur } = useDraft(canonical)
  // the tooltip floats fixed and portals out to <body>: the card back is a
  // scroll box inside the flip's rotateY, which would clip it and re-anchor fixed
  const [hint, setHint] = useState<{ left: number; top: number } | null>(null)
  const showHint = (e: { currentTarget: Element }): void => {
    const r = e.currentTarget.getBoundingClientRect()
    // below the ⓘ, or above it when the bottom of the screen is too close
    const top = r.bottom + 110 > window.innerHeight ? r.top - 105 : r.bottom + 5
    setHint({ left: Math.max(8, Math.min(r.left, window.innerWidth - 268)), top: Math.max(8, top) })
  }
  const commit = (text: string): void => {
    setDraft(text)
    const parsed = parseHoldRate(text, landing)
    if (parsed) onCommit(parsed.annual, { holdMonths: parsed.holdMonths, holdAnchor: parsed.holdAnchor })
  }
  return (
    <label className="param">
      <span className="param-label">
        <span>
          {label}
          {/* not a <button>: the read-only fieldset must not disable the hint */}
          <span
            tabIndex={0}
            className="param-info"
            aria-label="How to write this rate"
            onMouseEnter={showHint}
            onMouseLeave={() => setHint(null)}
            onFocus={showHint}
            onBlur={() => setHint(null)}
          >
            i
          </span>
        </span>
        <span className="param-value">
          <input className="num" type="text" inputMode="decimal" value={draft} onChange={(e) => commit(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
        </span>
      </span>
      {hint &&
        createPortal(
          <ul className="param-hint" style={hint}>
            <li>
              <code>n % /nUnit(nCompounding)</code>
            </li>
            <li>
              <code>7 %/yr(m)</code> — grows 7 % a year, compounded monthly
            </li>
            <li>
              <code>10 %/2m(2w)</code> — 10 % every two months, credited every two weeks
            </li>
            <li>
              <code>3,5 %/yr(apr)</code> — a yearly raise, credited every April
            </li>
            <li>
              units: <code>w</code>, <code>m</code>, <code>q</code>, <code>yr</code> — a unit combines with a specific month: <code>(q-jan)</code>
            </li>
          </ul>,
          document.body,
        )}
    </label>
  )
}

interface NumProps {
  label: string
  value: number
  onCommit: (value: number) => void
  /** Display multiplier: 100 shows a 0.07 rate as 7. */
  scale?: number
  unit?: string
}

/** One plain number: label and an editable value. */
function Num({ label, value, onCommit, scale = 1, unit }: NumProps): ReactElement {
  const canonical = formatNumber(round(value * scale))
  const { draft, setDraft, onFocus, onBlur } = useDraft(canonical)
  const commitDraft = (text: string): void => {
    setDraft(text)
    const parsed = Number(text.replace(/\s+/g, '').replace(',', '.'))
    if (Number.isFinite(parsed)) onCommit(parsed / scale)
  }
  return (
    <label className="param">
      <span className="param-label">
        <span>{label}</span>
        <span className="param-value">
          <input className="num" type="text" inputMode="decimal" value={draft} onChange={(e) => commitDraft(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
          {unit !== undefined && <em>{unit}</em>}
        </span>
      </span>
    </label>
  )
}

/** A unit-less money amount (a balance, a principal, a monthly take). */
function Money({ label, value, onCommit, unit }: { label: string; value: number; onCommit: (v: number) => void; unit?: string }): ReactElement {
  return <Num label={label} value={value} onCommit={(v) => onCommit(Math.max(0, v))} {...(unit !== undefined ? { unit } : {})} />
}

/** A share of the running total, 0..100 %. */
function Share({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }): ReactElement {
  return <Num label={label} value={value} onCommit={(v) => onCommit(Math.min(1, Math.max(0, v)))} scale={100} unit="%" />
}

function Row({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <label className="param">
      <span className="param-label">
        <span>{label}</span>
      </span>
      {children}
    </label>
  )
}

function Select<T extends string>({ label, value, options, onCommit }: { label: string; value: T; options: [T, string][]; onCommit: (v: T) => void }): ReactElement {
  return (
    <Row label={label}>
      <select value={value} onChange={(e) => onCommit(e.target.value as T)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </Row>
  )
}

function Text({ label, value, onCommit, placeholder }: { label: string; value: string; onCommit: (v: string) => void; placeholder?: string }): ReactElement {
  return (
    <Row label={label}>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onCommit(e.target.value)} />
    </Row>
  )
}

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

function curveBase(curve: Curve): number {
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

function ExpressionField({ expr, onCommit }: { expr: string; onCommit: (expr: string) => void }): ReactElement {
  const [draft, setDraft] = useState(expr)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setDraft(expr)
    setError(null)
  }, [expr])
  // only a formula that compiles reaches the card — the sim must never see a broken one
  const tryCommit = (text: string): void => {
    setDraft(text)
    try {
      compileExpression(text, ['t', 'month'])
      setError(null)
      onCommit(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  return (
    <div className="param">
      <span className="param-label">
        <span>ƒ(t, month)</span>
      </span>
      <textarea rows={2} value={draft} onChange={(e) => tryCommit(e.target.value)} spellCheck={false} />
      {error !== null && <p className="param-error">{error}</p>}
    </div>
  )
}

/**
 * A flow curve and its cadence, committed together: the primary amount field
 * carries the unit ("…/mo", "…/w"), so the cadence needs no dropdown.
 */
function CurveField({
  curve,
  cadence,
  onCommit,
}: {
  curve: Curve
  cadence: Cadence | undefined
  onCommit: (c: Curve, cadence: Cadence | undefined) => void
}): ReactElement {
  // secondary fields change the curve only; the cadence rides along untouched
  const commit = (c: Curve): void => onCommit(c, cadence)
  return (
    <>
      <Select label="Curve" value={curve.type} options={CURVE_TYPES} onCommit={(type) => commit(curveOfType(type, curve))} />
      {curve.type === 'constant' && <AmountField label="Amount" value={curve.value} cadence={cadence} onCommit={(value, cad) => onCommit({ ...curve, value }, cad)} />}
      {curve.type === 'linear' && (
        <>
          <AmountField label="Starts at" value={curve.base} cadence={cadence} onCommit={(base, cad) => onCommit({ ...curve, base }, cad)} />
          <Num label="Drift" value={curve.slopePerMonth} onCommit={(slopePerMonth) => commit({ ...curve, slopePerMonth })} unit="/mo" />
        </>
      )}
      {curve.type === 'compound' && (
        <>
          <AmountField label="Starts at" value={curve.base} cadence={cadence} onCommit={(base, cad) => onCommit({ ...curve, base }, cad)} />
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
          <AmountField label="Starts at" value={curve.initial} cadence={cadence} onCommit={(initial, cad) => onCommit({ ...curve, initial }, cad)} />
          {curve.steps.map((step, i) => (
            <div className="step-row" key={i}>
              <Num
                label={`Month ${String(step.atMonth)} →`}
                value={step.value}
                onCommit={(value) => commit({ ...curve, steps: normalizeSteps(curve.steps.map((s, j) => (j === i ? { ...s, value } : s))) })}
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
          <AmountField label="Around" value={curve.base} cadence={cadence} onCommit={(base, cad) => onCommit({ ...curve, base }, cad)} />
          <Money label="Swings ±" value={curve.amplitude} onCommit={(amplitude) => commit({ ...curve, amplitude })} />
          <Num label="Every" value={curve.periodMonths} onCommit={(periodMonths) => commit({ ...curve, periodMonths: Math.max(1, periodMonths) })} unit="mo" />
        </>
      )}
      {curve.type === 'sampled' && (
        <Text label="Data series" value={curve.seriesId ?? ''} placeholder="series id from a data pack" onCommit={(seriesId) => commit({ ...curve, seriesId })} />
      )}
      {curve.type === 'expression' && <ExpressionField expr={curve.expr} onCommit={(expr) => commit({ ...curve, expr })} />}
    </>
  )
}

/* ---- takes and the kind-specific editors ---- */

function TakeField({ label, take, onCommit }: { label: string; take: Take | undefined; onCommit: (t: Take | undefined) => void }): ReactElement {
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

function SourceEditor({ card, onChange }: { card: SourceCard; onChange: (c: EngineCard) => void }): ReactElement {
  return <CurveField curve={card.flow} cadence={card.cadence} onCommit={(flow, cadence) => onChange(withOptional({ ...card, flow }, 'cadence', cadence))} />
}

function DrainEditor({ card, onChange }: { card: DrainCard; onChange: (c: EngineCard) => void }): ReactElement {
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

function AssetEditor({ card, onChange }: { card: AssetCard; onChange: (c: EngineCard) => void }): ReactElement {
  return (
    <>
      {card.price ? (
        <>
          <Text
            label="Priced by"
            value={card.price.seriesId ?? ''}
            placeholder="series id from a data pack"
            onCommit={(seriesId) => onChange({ ...card, price: { ...card.price, seriesId } })}
          />
          <Num label="Units held" value={card.initialUnits ?? 0} onCommit={(initialUnits) => onChange({ ...card, initialUnits })} />
          {/* when the series runs out mid-horizon, this generic component takes over from the last real price */}
          <GrowthFields card={card} onChange={onChange} label="After data" />
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

function DebtEditor({ card, onChange }: { card: DebtCard; onChange: (c: EngineCard) => void }): ReactElement {
  return (
    <>
      <Num label="Principal" value={card.principal} onCommit={(principal) => onChange({ ...card, principal: Math.max(0, principal) })} />
      <RateField label="Interest" value={card.interest.expected} onCommit={(expected) => onChange({ ...card, interest: { ...card.interest, expected } })} />
      <TakeField label="Pays" take={card.payment} onCommit={(payment) => onChange(withOptional(card, 'payment', payment))} />
    </>
  )
}

const MONTH_OPTIONS: [string, string][] = MONTH_NAMES.map((name, i) => [String(i + 1), name])

function RuleEditor({ card, onChange, from }: { card: RuleCard; onChange: (c: EngineCard) => void; from: number }): ReactElement {
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
function withOptional<C extends EngineCard, K extends keyof C>(card: C, key: K, value: C[K] | undefined): C {
  const next = { ...card }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

/**
 * The math side of the back: name, tags, and every parameter of the kind.
 * Emits a whole new card on each change — callers decide where it lands
 * (the table document or a library template).
 */
export function CardMathEditor({ card, onChange, from }: { card: EngineCard; onChange: (next: EngineCard) => void; from: number }): ReactElement {
  return (
    <div className="card-editor">
      <Text label="Name" value={card.name ?? ''} onCommit={(name) => onChange({ ...card, name })} />
      {card.kind === 'source' && <SourceEditor card={card} onChange={onChange} />}
      {card.kind === 'drain' && <DrainEditor card={card} onChange={onChange} />}
      {card.kind === 'asset' && <AssetEditor card={card} onChange={onChange} />}
      {card.kind === 'debt' && <DebtEditor card={card} onChange={onChange} />}
      {card.kind === 'rule' && <RuleEditor card={card} onChange={onChange} from={from} />}
      {card.kind === 'hand' && <TakeField label="Takes" take={card.take} onCommit={(take) => onChange(withOptional(card, 'take', take))} />}
      <Text
        label="Tags"
        value={card.tags?.join(', ') ?? ''}
        placeholder="fund, equity — what rules aim at"
        onCommit={(text) => {
          const tags = text.split(',').map((t) => t.trim()).filter(Boolean)
          onChange(withOptional(card, 'tags', tags.length > 0 ? tags : undefined))
        }}
      />
    </div>
  )
}

/** The front matter of an authored card: sigil and the one description field. */
export function FrontMatterEditor({ authored, onChange }: { authored: AuthoredCard; onChange: (next: AuthoredCard) => void }): ReactElement {
  return (
    <div className="card-editor">
      <Row label="Sigil">
        <div className="glyph-pick">
          {CARD_GLYPHS.map((g) => (
            <button key={g} className={g === authored.glyph ? 'on' : ''} onClick={() => onChange({ ...authored, glyph: g })} aria-label={g} title={g}>
              <Glyph name={g} size={17} />
            </button>
          ))}
        </div>
      </Row>
      <Row label="Description">
        <textarea
          rows={3}
          value={authored.description ?? ''}
          placeholder="what it is — and the assumptions behind the numbers (source, year, fees…)"
          onChange={(e) => onChange({ ...authored, description: e.target.value })}
        />
      </Row>
    </div>
  )
}
