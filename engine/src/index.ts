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
export { createRng, shuffle, type Rng } from './rng.js'
export { compileExpression, type CompiledExpr, type ExprVars } from './expression.js'
export { evalCurve, monthlyFactor, resolveSampled, sampleAt, type CurveContext } from './curves.js'
export { findCard, allCards, setHandEnabled } from './tree.js'
export { validateTable, CASH_ID } from './validate.js'
export { simulate } from './simulate.js'
export { firstCrossing, firstTouch, goalDelta, type GoalDelta } from './goals.js'
export { toReal, valueAt } from './series.js'
