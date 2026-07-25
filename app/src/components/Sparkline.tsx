import type { ReactElement } from 'react'

/** Trailing sparkline for a card front — the card's own curve, in miniature. */
export function Sparkline({ points, width = 72, height = 20 }: { points: number[]; width?: number; height?: number }): ReactElement | null {
  if (points.length < 2) return null
  const step = Math.max(1, Math.floor(points.length / 48))
  const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1)
  const min = Math.min(...sampled)
  const max = Math.max(...sampled)
  const span = max - min || 1
  const pad = 2
  const d = sampled
    .map((v, i) => {
      const x = pad + (i / (sampled.length - 1)) * (width - pad * 2)
      const y = height - pad - ((v - min) / span) * (height - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join('')
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
