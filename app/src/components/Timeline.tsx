import { firstCrossing, formatMonth, fromMonthIndex, valueAt, type SimResult } from '@finsim/engine'
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactElement, type RefObject } from 'react'
import { formatKr } from '../format'
import { GHOST_DASHES, type Sim } from '../model'

/**
 * The timeline is the single source of truth (DESIGN.md §2): net-worth curve,
 * ghost curves for flipped decision bundles, goal line annotated with the
 * date it is crossed, and a time scrubber.
 */
interface Props {
  sim: Sim
  goal: number
  from: number
  horizonMonths: number
  scrub: number
  onScrub: (month: number) => void
}

const MARGIN = { top: 18, right: 74, bottom: 26, left: 12 }

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

function crossingMarker(result: SimResult, goal: number): number | null {
  return firstCrossing(result, goal)
}

export function Timeline({ sim, goal, from, horizonMonths, scrub, onScrub }: Props): ReactElement {
  const [ref, { width, height }] = useSize()
  const to = from + horizonMonths - 1

  const nw = sim.active.netWorth.points
  const ghosts = sim.compares.map((c) => c.flipped.netWorth.points)
  const yMax = Math.max(goal, ...nw, ...ghosts.flat()) * 1.06
  const yMin = Math.min(0, ...nw, ...ghosts.flat())

  const x = scaleLinear([from, to], [MARGIN.left, width - MARGIN.right])
  const y = scaleLinear([yMin, yMax], [height - MARGIN.bottom, MARGIN.top])

  const path = line<number>()
    .x((_, i) => x(from + i))
    .y((v) => y(v))

  const yTicks = y.ticks(4).filter((t) => t !== 0 || yMin < 0)
  const startYear = fromMonthIndex(from).year
  const xTicks: number[] = []
  for (let year = Math.ceil(startYear / 5) * 5; year * 12 <= to; year += 5) {
    if (year * 12 >= from) xTicks.push(year * 12)
  }

  const activeCross = crossingMarker(sim.active, goal)
  const scrubX = x(scrub)
  const scrubNw = valueAt(sim.active.netWorth, scrub)

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
        {/* y grid + labels (right side, annual-report style) */}
        {yTicks.map((t) => (
          <g key={t}>
            <line className="grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} />
            <text className="tick" x={width - MARGIN.right + 6} y={y(t) + 3}>
              {t >= 1_000_000 ? `${(t / 1_000_000).toLocaleString('sv-SE')} M` : t.toLocaleString('sv-SE')}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} className="tick" x={x(t)} y={height - 8} textAnchor="middle">
            {fromMonthIndex(t).year}
          </text>
        ))}

        {/* goal line + crossing date */}
        <line className="goal-line" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(goal)} y2={y(goal)} />
        <text className="goal-label" x={MARGIN.left + 2} y={y(goal) - 5}>
          {formatKr(goal)}
          {activeCross !== null ? ` · reached ${formatMonth(activeCross)}` : ' · not reached in horizon'}
        </text>

        {/* ghost curves: one line per compared hand, dash-coded to the legend */}
        {sim.compares.map((c, i) => (
          <path
            key={c.handId}
            className="curve ghost"
            strokeDasharray={GHOST_DASHES[i % GHOST_DASHES.length]}
            d={path(c.flipped.netWorth.points) ?? undefined}
          />
        ))}
        {/* the one honest net-worth curve */}
        <path className="curve active" d={path(nw) ?? undefined} />

        {/* crossing markers */}
        {activeCross !== null && <circle className="cross active" cx={x(activeCross)} cy={y(goal)} r={3.5} />}
        {sim.compares.map((c) => {
          const cross = crossingMarker(c.flipped, goal)
          return cross !== null && <circle key={c.handId} className="cross ghost" cx={x(cross)} cy={y(goal)} r={3} />
        })}

        {/* time scrubber */}
        <line className="scrub-line" x1={scrubX} x2={scrubX} y1={MARGIN.top} y2={height - MARGIN.bottom} />
        <circle className="scrub-dot" cx={scrubX} cy={y(scrubNw)} r={3.5} />
        <text
          className="scrub-label"
          x={scrubX}
          y={MARGIN.top - 5}
          textAnchor={scrubX > width - 180 ? 'end' : scrubX < 120 ? 'start' : 'middle'}
        >
          {formatMonth(scrub)} · {formatKr(scrubNw)}
        </text>
      </svg>
    </div>
  )
}
