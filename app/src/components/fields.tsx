import { compileExpression, type Cadence } from '@finsim/engine'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { CADENCE_SUFFIX } from '../authored'
import { formatNumber, parseCompact, round } from '../format'
import { holdSuffix, parseAmount, parseHoldRate, parseRate, type Landing } from './amountGrammar'

/** The generic field primitives every card-back editor is built from. */

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
export function AmountField({
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
export function RateField({ label, value, onCommit }: { label: string; value: number; onCommit: (annual: number) => void }): ReactElement {
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
export function HoldRateField({
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
  /** Accept k/M magnitudes ("5,5M"), the Goal field's language — money amounts only. */
  compact?: boolean
}

/** One plain number: label and an editable value. */
export function Num({ label, value, onCommit, scale = 1, unit, compact = false }: NumProps): ReactElement {
  const canonical = formatNumber(round(value * scale))
  const { draft, setDraft, onFocus, onBlur } = useDraft(canonical)
  const commitDraft = (text: string): void => {
    setDraft(text)
    const parsed = compact ? (parseCompact(text) ?? NaN) : Number(text.replace(/\s+/g, '').replace(',', '.'))
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

/** A unit-less money amount (a balance, a principal, a monthly take); reads "5,5M" and "250k". */
export function Money({ label, value, onCommit, unit }: { label: string; value: number; onCommit: (v: number) => void; unit?: string }): ReactElement {
  return <Num label={label} value={value} onCommit={(v) => onCommit(Math.max(0, v))} compact {...(unit !== undefined ? { unit } : {})} />
}

/** A share of the running total, 0..100 %. */
export function Share({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }): ReactElement {
  return <Num label={label} value={value} onCommit={(v) => onCommit(Math.min(1, Math.max(0, v)))} scale={100} unit="%" />
}

export function Row({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <label className="param">
      <span className="param-label">
        <span>{label}</span>
      </span>
      {children}
    </label>
  )
}

export function Select<T extends string>({ label, value, options, onCommit }: { label: string; value: T; options: [T, string][]; onCommit: (v: T) => void }): ReactElement {
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

export function Text({ label, value, onCommit, placeholder }: { label: string; value: string; onCommit: (v: string) => void; placeholder?: string }): ReactElement {
  return (
    <Row label={label}>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onCommit(e.target.value)} />
    </Row>
  )
}

export function ExpressionField({ expr, onCommit }: { expr: string; onCommit: (expr: string) => void }): ReactElement {
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
