import { fromMonthIndex } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatCompact } from '../format'

/** Distinguishable player hues on dark wood — green/red stay reserved for money direction. */
export const PLAYER_COLORS = ['#e0c36a', '#7fa8d9', '#c08fd6', '#6fc2b0', '#d99a7f', '#c9c9c9']

/**
 * The race chart of everyone's net worth — the shared table's one picture.
 * `cursor` reveals months [0..cursor]; the replay animates by advancing it.
 */
export function RaceChart({
  months,
  nw,
  names,
  cursor,
  width = 720,
  height = 260,
}: {
  months: number[]
  /** nw[player][monthIndex] */
  nw: number[][]
  names: string[]
  cursor: number
  width?: number
  height?: number
}): ReactElement | null {
  const shown = Math.max(2, Math.min(cursor + 1, months.length))
  if (months.length < 2 || nw.length === 0) return null
  const visible = nw.map((s) => s.slice(0, shown))
  const lo = Math.min(...visible.map((s) => Math.min(...s)))
  const hi = Math.max(...visible.map((s) => Math.max(...s)))
  const span = hi - lo || 1
  const padL = 8
  const padR = 74 // room for the name tags at the line ends
  const padY = 16
  const x = (i: number): number => padL + (i / (months.length - 1)) * (width - padL - padR)
  const y = (v: number): number => height - padY - ((v - lo) / span) * (height - padY * 2)

  // a tick at each January
  const ticks = months.flatMap((m, i) => (fromMonthIndex(m).month === 1 ? [{ i, year: fromMonthIndex(m).year }] : []))

  return (
    <svg className="race-chart" viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t) => (
        <g key={t.i}>
          <line x1={x(t.i)} y1={padY} x2={x(t.i)} y2={height - padY} stroke="currentColor" strokeOpacity="0.15" />
          <text x={x(t.i) + 3} y={height - 3} fontSize="9" fill="currentColor" opacity="0.5">
            {t.year}
          </text>
        </g>
      ))}
      {visible.map((s, p) => (
        <path
          key={p}
          d={s.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')}
          fill="none"
          stroke={PLAYER_COLORS[p % PLAYER_COLORS.length]}
          strokeWidth="1.8"
        />
      ))}
      {visible.map((s, p) => {
        const last = s[s.length - 1]!
        return (
          <text key={p} x={x(shown - 1) + 5} y={y(last) + 3} fontSize="10" fill={PLAYER_COLORS[p % PLAYER_COLORS.length]}>
            {names[p]} {formatCompact(last)}
          </text>
        )
      })}
    </svg>
  )
}
