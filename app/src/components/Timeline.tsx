import { firstCrossing, formatMonth, fromMonthIndex, valueAt, type Series } from '@finsim/engine'
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactElement, type RefObject } from 'react'
import { formatCompact } from '../format'
import type { Mc } from '../mc'
import type { Sim } from '../model'
import { bandPath, linePath, scaleLinear } from '../scale'

/**
 * The chart: one honest net-worth line, the goal line annotated with the date
 * it is crossed, and a time scrubber — plus, when the table carries
 * volatility, the P10–P90 percentile fan behind the line (M3b). The
 * per-bundle time-to-goal deltas live on the bundle stacks themselves.
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
}

const MARGIN = { top: 24, right: 20, bottom: 30, left: 16 }

function useSize(): [RefObject<HTMLDivElement | null>, { width: number; height: number }] {
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

export function Timeline({ sim, goal, from, horizonMonths, scrub, onScrub, focus, mc }: Props): ReactElement {
  const [ref, { width, height }] = useSize()
  const to = from + horizonMonths - 1

  const curve = focus ?? sim.active.netWorth
  const nw = curve.points
  // a stale fan (the deferred Monte Carlo lags one edit behind) must never stretch the axes
  const fan = !focus && mc && mc.bands.p10.points.length === nw.length ? mc.bands : null
  const yMax = (focus ? Math.max(1, ...nw) : Math.max(goal, ...nw, ...(fan ? fan.p90.points : []))) * 1.06
  const yMin = Math.min(0, ...nw, ...(fan ? fan.p10.points : []))

  const x = scaleLinear([from, to], [MARGIN.left, width - MARGIN.right])
  const y = scaleLinear([yMin, yMax], [height - MARGIN.bottom, MARGIN.top])

  const path = (points: number[]): string => linePath(points, (i) => x(from + i), y)

  const startYear = fromMonthIndex(from).year
  const xTicks: number[] = []
  for (let year = Math.ceil(startYear / 5) * 5; year * 12 <= to; year += 5) {
    if (year * 12 >= from) xTicks.push(year * 12)
  }

  const activeCross = focus ? null : firstCrossing(sim.active, goal)
  const scrubX = x(scrub)
  const scrubNw = valueAt(curve, scrub)

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
              {activeCross !== null ? ` · reached ${formatMonth(activeCross)}` : ' · not reached in horizon'}
            </text>
          </>
        )}

        {/* the fan: the middle 80 % of simulated futures, behind the line */}
        {fan && <path className="fan" d={bandPath(fan.p90.points, fan.p10.points, (i) => x(from + i), y)} />}

        {/* the one honest net-worth curve (≈ the median future — expected returns are CAGR) */}
        <path className="curve active" d={path(nw)} />
        {activeCross !== null && <circle className="cross active" cx={x(activeCross)} cy={y(goal)} r={3.5} />}

        {/* time scrubber */}
        <line className="scrub-line" x1={scrubX} x2={scrubX} y1={MARGIN.top} y2={height - MARGIN.bottom} />
        <circle className="scrub-dot" cx={scrubX} cy={y(scrubNw)} r={3.5} />
        <text
          className="scrub-label"
          x={scrubX}
          y={MARGIN.top - 5}
          textAnchor={scrubX > width - 180 ? 'end' : scrubX < 120 ? 'start' : 'middle'}
        >
          {formatMonth(scrub)} · {formatCompact(scrubNw)}
        </text>
      </svg>
    </div>
  )
}
