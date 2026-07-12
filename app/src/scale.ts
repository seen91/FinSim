/**
 * The two pieces of d3 the chart actually needs: a linear scale and a
 * polyline path builder.
 */
export interface LinearScale {
  (value: number): number
  invert: (coord: number) => number
}

export function scaleLinear([d0, d1]: [number, number], [r0, r1]: [number, number]): LinearScale {
  const dSpan = d1 - d0 || 1
  const scale = ((value: number) => r0 + ((value - d0) / dSpan) * (r1 - r0)) as LinearScale
  scale.invert = (coord) => d0 + ((coord - r0) / (r1 - r0 || 1)) * dSpan
  return scale
}

/** SVG path through the points, `x` from the index and `y` from the value. */
export function linePath(points: number[], x: (index: number) => number, y: (value: number) => number): string {
  return points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
}

/** Closed SVG path between two same-length polylines — the percentile fan's band. */
export function bandPath(upper: number[], lower: number[], x: (index: number) => number, y: (value: number) => number): string {
  const down = upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const back = [...lower.keys()]
    .reverse()
    .map((i) => `L${x(i).toFixed(1)},${y(lower[i]!).toFixed(1)}`)
    .join('')
  return `${down}${back}Z`
}
