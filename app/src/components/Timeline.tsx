import { firstCrossing, formatMonth, fromMonthIndex, valueAt, type Series } from '@finsim/engine'
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactElement, type RefObject } from 'react'
import type { CompareRun } from '../compare'
import { formatCompact } from '../format'
import type { Mc } from '../mc'
import { debtAt, type Sim } from '../model'
import { bandPath, linePath, negativeRuns, scaleLinear } from '../scale'

/**
 * The chart: one honest net-worth line, the goal line annotated with the date
 * it is crossed, and a time scrubber — plus, when the table carries
 * volatility, the P10–P90 percentile fan behind the line (M3b). The
 * per-bundle time-to-goal deltas live on the bundle stacks themselves.
 *
 * When cash runs below zero the chart says so by itself: each debt stretch
 * draws the cash curve as a red dotted line under a dotted zero baseline,
 * with a wash down to zero (the scrub label names the amount on hover) —
 * and it is gone the month the debt is repaid. No toggle: net worth alone
 * cannot tell a plan that borrows from one that doesn't, so the chart grows
 * a bounded basement below zero exactly while the difference bites.
 */
interface Props {
  sim: Sim
  goal: number
  from: number
  horizonMonths: number
  scrub: number
  onScrub: (month: number) => void
  /** Workshop focus: chart this one card's curve instead — no goal line, y scaled to the curve. */
  focus?: Series
  /** Monte Carlo bands, when the table has volatility to show. */
  mc?: Mc | null
  /**
   * Compare mode: two whole plans on the one chart — contender A in the
   * table's own ink, contender B as a dashed gold rival. The scrub reads
   * both values and the gap; the fan and the debt basement stand down
   * (v1 comparison is deterministic, and neither side carries cash here).
   */
  compare?: CompareRun | null
}

const MARGIN = { top: 24, right: 20, bottom: 30, left: 16 }

export function useSize(): [RefObject<HTMLDivElement | null>, { width: number; height: number }] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 800, height: 300 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size]
}

export function Timeline({ sim, goal, from, horizonMonths, scrub, onScrub, focus, mc, compare }: Props): ReactElement {
  const [ref, { width, height }] = useSize()
  const to = from + horizonMonths - 1

  const curve = compare ? compare.a.netWorth : (focus ?? sim.active.netWorth)
  const nw = curve.points
  const rival = compare?.b.netWorth ?? null
  // a stale fan (the deferred Monte Carlo lags one edit behind) must never stretch the axes
  const fan = !focus && !compare && mc && mc.bands.p10.points.length === nw.length ? mc.bands : null
  const yMax = (focus ? Math.max(1, ...nw) : Math.max(goal, ...nw, ...(rival ? rival.points : []), ...(fan ? fan.p90.points : []))) * 1.06

  // debt stretches: while cash is below zero the axis grows a basement (never
  // shallower than 5 % of the chart, so even a small overdraft stays legible)
  const cash = sim.active.cash.points
  const debtRuns = focus || compare ? [] : negativeRuns(cash)
  const cashMin = debtRuns.length > 0 ? Math.min(...cash) : 0
  const yMin = Math.min(0, ...nw, ...(rival ? rival.points : []), ...(fan ? fan.p10.points : []), ...(debtRuns.length > 0 ? [cashMin * 1.3, -yMax * 0.05] : []))

  const x = scaleLinear([from, to], [MARGIN.left, width - MARGIN.right])
  const y = scaleLinear([yMin, yMax], [height - MARGIN.bottom, MARGIN.top])

  const path = (points: number[]): string => linePath(points, (i) => x(from + i), y)
  /** The cash curve over one debt stretch, reaching one month past each end toward the zero crossings. */
  const cashPath = (a: number, b: number): string => {
    let d = ''
    for (let i = a; i <= b; i++) d += `${i === a ? 'M' : 'L'}${x(from + i).toFixed(1)},${y(cash[i]!).toFixed(1)}`
    return d
  }

  const startYear = fromMonthIndex(from).year
  const xTicks: number[] = []
  for (let year = Math.ceil(startYear / 5) * 5; year * 12 <= to; year += 5) {
    if (year * 12 >= from) xTicks.push(year * 12)
  }

  const activeCross = compare ? compare.a.crossing : focus ? null : firstCrossing(sim.active, goal)
  const rivalCross = compare?.b.crossing ?? null
  const scrubX = x(scrub)
  const scrubNw = valueAt(curve, scrub)
  const scrubRival = rival ? valueAt(rival, scrub) : 0
  // one combined debt figure: what the plan owes at the scrub month — the
  // debt cards' balances plus any cash overdraft (positive cash isn't debt)
  const scrubDebt = focus || compare ? 0 : debtAt(sim, scrub) + Math.min(0, valueAt(sim.active.cash, scrub))

  const handlePointer = (e: PointerEvent<SVGSVGElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const month = Math.round(x.invert(e.clientX - rect.left))
    onScrub(Math.max(from, Math.min(to, month)))
  }

  return (
    <div className="timeline" ref={ref}>
      <svg
        width={width}
        height={height}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        role="img"
        aria-label="Net worth over time"
      >
        {xTicks.map((t) => (
          <text key={t} className="tick" x={x(t)} y={height - 8} textAnchor="middle">
            {fromMonthIndex(t).year}
          </text>
        ))}

        {/* goal line + crossing date (the whole table's business — not a single card's) */}
        {!focus && (
          <>
            <line className="goal-line" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(goal)} y2={y(goal)} />
            <text className="goal-label" x={MARGIN.left + 2} y={y(goal) - 5}>
              {formatCompact(goal)}
              {/* in compare mode the verdict banner carries both dates — the label stays quiet */}
              {compare ? '' : activeCross !== null ? ` · reached ${formatMonth(activeCross)}` : ' · not reached in horizon'}
            </text>
          </>
        )}

        {/* debt: wherever cash runs below zero, the cash curve draws itself — red,
            dotted, under a zero baseline — and ends the month the debt is repaid */}
        {debtRuns.length > 0 && (
          <>
            <line className="zero-line" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(0)} y2={y(0)} />
            <text className="tick" x={MARGIN.left + 2} y={y(0) - 4}>
              0
            </text>
            {debtRuns.map((run) => {
              const a = Math.max(0, run.from - 1)
              const b = Math.min(cash.length - 1, run.to + 1)
              const seg = cashPath(a, b)
              return (
                <g key={run.from}>
                  <path className="cash-under" d={`${seg}L${x(from + b).toFixed(1)},${y(0).toFixed(1)}L${x(from + a).toFixed(1)},${y(0).toFixed(1)}Z`} />
                  <path className="cash-line" d={seg} />
                </g>
              )
            })}
          </>
        )}

        {/* the fan: the middle 80 % of simulated futures, behind the line */}
        {fan && <path className="fan" d={bandPath(fan.p90.points, fan.p10.points, (i) => x(from + i), y)} />}

        {/* the one honest net-worth curve (≈ the median future — expected returns are CAGR);
            in compare mode it is contender A, with contender B a dashed gold rival over it */}
        <path className="curve active" d={path(nw)} />
        {rival && <path className="curve rival" d={path(rival.points)} />}
        {activeCross !== null && <circle className="cross active" cx={x(activeCross)} cy={y(goal)} r={3.5} />}
        {rivalCross !== null && <circle className="cross rival" cx={x(rivalCross)} cy={y(goal)} r={3.5} />}

        {/* time scrubber */}
        <line className="scrub-line" x1={scrubX} x2={scrubX} y1={MARGIN.top} y2={height - MARGIN.bottom} />
        <circle className="scrub-dot" cx={scrubX} cy={y(scrubNw)} r={3.5} />
        {rival && <circle className="scrub-dot rival" cx={scrubX} cy={y(scrubRival)} r={3.5} />}
        <text
          className="scrub-label"
          x={scrubX}
          y={MARGIN.top - 5}
          textAnchor={scrubX > width - (rival ? 300 : scrubDebt < 0 ? 220 : 180) ? 'end' : scrubX < 120 ? 'start' : 'middle'}
        >
          {formatMonth(scrub)} · {formatCompact(scrubNw)}
          {/* gold is the rival curve's ink — the colors say which plan is which, no words needed */}
          {rival && (
            <>
              <tspan className="scrub-rival"> · {formatCompact(scrubRival)}</tspan> · Δ {formatCompact(scrubRival - scrubNw)}
            </>
          )}
          {/* red is the debt line's ink — the color says which series, no word needed */}
          {scrubDebt < 0 && <tspan className="scrub-debt"> · {formatCompact(scrubDebt)}</tspan>}
        </text>
      </svg>
    </div>
  )
}
