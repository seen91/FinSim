/**
 * @finsim/engine — pure, deterministic, dependency-free simulation core.
 *
 * Every instrument is a card and every card is a curve f(t). A hand is
 * played top to bottom; nested hands scope their own subtotal. Monthly tick,
 * seeded randomness only, no framework imports, no Date.now(). See
 * DESIGN.md §7–8 for the contract this package implements.
 */

export * from './types.js'
export { ym, fromMonthIndex, formatMonth, formatMonthsDelta } from './month.js'
export { createRng, type Rng } from './rng.js'
export { compileExpression, type CompiledExpr, type ExprVars } from './expression.js'
export { evalCurve, monthlyFactor, periodsPerMonth, priceCurveOf, resolveSampled, sampleAt, type CurveContext } from './curves.js'
export { findCard, allCards, setCardEnabled, withoutCard } from './tree.js'
export { validateTable, CASH_ID } from './validate.js'
export { simulate, type ShockFn } from './simulate.js'
export {
  monteCarlo,
  percentileBand,
  crossingMonths,
  goalProbability,
  quantile,
  type MonteCarloOptions,
  type MonteCarloRun,
} from './montecarlo.js'
export { firstCrossing, goalDelta, type GoalDelta } from './goals.js'
export { valueAt } from './series.js'
