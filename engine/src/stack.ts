import { evalCurve, monthlyFactor, type CurveContext } from './curves.js'
import { compileExpression, type CompiledExpr } from './expression.js'
import type { ModifierCard, Stack } from './types.js'

/**
 * The stacking grammar's one rule (DESIGN.md §7): a stack is one base card
 * plus modifiers, evaluated bottom-up as function composition —
 * `modifiers: [tax, raise]` is `raise(tax(salary))(t)`.
 */

const modifierExprCache = new Map<string, CompiledExpr>()

function compiledModifierExpr(expr: string): CompiledExpr {
  let compiled = modifierExprCache.get(expr)
  if (!compiled) {
    compiled = compileExpression(expr, ['f', 't', 'month'])
    modifierExprCache.set(expr, compiled)
  }
  return compiled
}

function applyFlowModifier(card: ModifierCard, flow: number, ctx: CurveContext): number {
  const m = card.modifier
  switch (m.type) {
    case 'taxRate':
      return flow * (1 - m.rate)
    case 'flowScale':
      return flow * m.factor
    case 'flowOffset':
      return flow + m.amountPerMonth
    case 'annualRaise':
      return flow * Math.pow(1 + m.rate, Math.floor(ctx.t / 12))
    case 'expression':
      return compiledModifierExpr(m.expr)({ f: flow, t: ctx.t, month: ctx.month })
    case 'annualFee':
      throw new Error(`Modifier "${card.id}": annualFee targets balances, not flows`)
  }
}

/** Net flow of a source stack at ctx: base curve through its flow modifiers, bottom-up. */
export function evalFlowStack(stack: Stack, ctx: CurveContext): number {
  if (stack.base.kind !== 'source') {
    throw new Error(`Stack "${stack.id}" is not a flow stack (base kind: ${stack.base.kind})`)
  }
  let flow = evalCurve(stack.base.flow, ctx)
  for (const card of stack.modifiers ?? []) {
    flow = applyFlowModifier(card, flow, ctx)
  }
  return flow
}

/**
 * Monthly growth factor of an asset stack: the base growth rate with every
 * annualFee modifier composed in as a (1 − fee)^(1/12) drag.
 */
export function assetMonthlyGrowthFactor(stack: Stack): number {
  if (stack.base.kind !== 'asset') {
    throw new Error(`Stack "${stack.id}" is not an asset stack (base kind: ${stack.base.kind})`)
  }
  let factor = monthlyFactor(stack.base.growth?.expected ?? 0)
  for (const card of stack.modifiers ?? []) {
    if (card.modifier.type !== 'annualFee') {
      throw new Error(`Modifier "${card.id}" (${card.modifier.type}) cannot stack on asset "${stack.id}"`)
    }
    factor *= monthlyFactor(-card.modifier.rate)
  }
  return factor
}
