/**
 * @finsim/engine — pure, deterministic, dependency-free simulation core.
 *
 * Every instrument is a card; every card is a curve f(t). Monthly tick,
 * seeded randomness only, no framework imports, no Date.now(). See
 * DESIGN.md §8 for the contract this package implements.
 */

export * from './types.js'
export { ym, fromMonthIndex, formatMonth, formatMonthsDelta } from './month.js'
export { createRng, shuffle, type Rng } from './rng.js'
export { compileExpression, type CompiledExpr, type ExprVars } from './expression.js'
export { evalCurve, monthlyFactor, resolveSampled, sampleAt, type CurveContext } from './curves.js'
export { evalFlowStack, assetMonthlyGrowthFactor } from './stack.js'
export { validateTable, CASH_ID } from './validate.js'
export { simulate, setBundleEnabled } from './simulate.js'
export { firstCrossing, firstTouch, goalDelta, type GoalDelta } from './goals.js'
export { toReal, valueAt } from './series.js'
