import { compileExpression, type CompiledExpr } from './expression.js'
import { formatMonth } from './month.js'
import type { Curve, SampledData, World } from './types.js'

/**
 * Curve evaluation. Curves are evaluated at a *local* time `t` (months since
 * the owning stack entered play) except sampled curves, which are indexed by
 * absolute month — history has dates.
 */
export interface CurveContext {
  /** Months since the stack's start (0 on the start month). */
  t: number
  /** Absolute month index. */
  month: number
  world?: World
}

const exprCache = new Map<string, CompiledExpr>()

function compiledCurveExpr(expr: string): CompiledExpr {
  let compiled = exprCache.get(expr)
  if (!compiled) {
    compiled = compileExpression(expr, ['t', 'month'])
    exprCache.set(expr, compiled)
  }
  return compiled
}

/** Resolves a sampled reference to its data, from the curve itself or a world series. */
export function resolveSampled(
  ref: { seriesId?: string; data?: SampledData },
  world: World | undefined,
  what: string,
): SampledData {
  if (ref.data) return ref.data
  if (ref.seriesId) {
    const data = world?.series?.[ref.seriesId]
    if (!data) throw new Error(`${what}: series "${ref.seriesId}" not found in world`)
    return data
  }
  throw new Error(`${what}: sampled reference has neither inline data nor a seriesId`)
}

/** Value of a sampled series at an absolute month. Out-of-range is an error, not a guess. */
export function sampleAt(data: SampledData, month: number, what: string): number {
  const i = month - data.startMonth
  const value = data.values[i]
  if (i < 0 || value === undefined) {
    throw new Error(
      `${what}: no data for ${formatMonth(month)} (series covers ${formatMonth(data.startMonth)}..${formatMonth(data.startMonth + data.values.length - 1)})`,
    )
  }
  return value
}

/** Converts an annual rate to the equivalent monthly compounding factor. */
export function monthlyFactor(annualRate: number): number {
  const f = 1 + annualRate
  if (f <= 0) throw new Error(`Annual rate ${annualRate} implies a non-positive factor; total loss is a balanceScale event, not a rate`)
  return Math.pow(f, 1 / 12)
}

export function evalCurve(curve: Curve, ctx: CurveContext): number {
  switch (curve.type) {
    case 'constant':
      return curve.value
    case 'linear':
      return curve.base + curve.slopePerMonth * ctx.t
    case 'compound':
      return curve.base * Math.pow(monthlyFactor(curve.annualRate.expected), ctx.t)
    case 'step': {
      let value = curve.initial
      for (const step of curve.steps) {
        if (ctx.t >= step.atMonth) value = step.value
      }
      return value
    }
    case 'sinusoidal': {
      const phase = curve.phaseMonths ?? 0
      return curve.base + curve.amplitude * Math.sin((2 * Math.PI * (ctx.t - phase)) / curve.periodMonths)
    }
    case 'sampled': {
      const data = resolveSampled(curve, ctx.world, 'sampled curve')
      return sampleAt(data, ctx.month, 'sampled curve')
    }
    case 'expression':
      return compiledCurveExpr(curve.expr)({ t: ctx.t, month: ctx.month })
  }
}
