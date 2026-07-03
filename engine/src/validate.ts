import type { Stack, Table } from './types.js'

/**
 * Structural validation of a table — the kind system as code (DESIGN.md §7:
 * kind alone determines where a card can be played). `simulate` refuses
 * invalid tables; the UI uses the same checks to decide which drop targets glow.
 */

export const CASH_ID = 'cash'

function validateStack(stack: Stack, errors: string[]): void {
  const base = stack.base
  if (base.kind === 'source') {
    for (const m of stack.modifiers ?? []) {
      if (m.target !== 'flow' || m.modifier.type === 'annualFee') {
        errors.push(`Stack "${stack.id}": modifier "${m.id}" (${m.modifier.type}) cannot stack on a source`)
      }
    }
    if (base.flow.type === 'step') {
      const steps = base.flow.steps
      for (let i = 1; i < steps.length; i++) {
        if (steps[i]!.atMonth <= steps[i - 1]!.atMonth) {
          errors.push(`Stack "${stack.id}": step curve months must be strictly increasing`)
          break
        }
      }
    }
  } else if (base.kind === 'asset') {
    for (const m of stack.modifiers ?? []) {
      if (m.target !== 'balance' || m.modifier.type !== 'annualFee') {
        errors.push(`Stack "${stack.id}": modifier "${m.id}" (${m.modifier.type}) cannot stack on an asset`)
      }
    }
    if (base.price && base.growth) {
      errors.push(`Stack "${stack.id}": an asset has either a growth rate or a price curve, not both`)
    }
    if (!base.price && base.initialUnits !== undefined) {
      errors.push(`Stack "${stack.id}": initialUnits requires a price curve`)
    }
  } else {
    // debt
    if ((stack.modifiers ?? []).length > 0) {
      errors.push(`Stack "${stack.id}": debt stacks take no modifiers yet (amortization rules are locale-pack hooks)`)
    }
    if (base.principal < 0) {
      errors.push(`Stack "${stack.id}": debt principal must be ≥ 0 (it is reported as a negative balance)`)
    }
  }
}

export function validateTable(table: Table): string[] {
  const errors: string[] = []
  const stackIds = new Set<string>()
  const bundleIds = new Set((table.bundles ?? []).map((b) => b.id))

  for (const stack of table.stacks) {
    if (stack.id === CASH_ID) errors.push(`Stack id "${CASH_ID}" is reserved for the default cash account`)
    if (stackIds.has(stack.id)) errors.push(`Duplicate stack id "${stack.id}"`)
    stackIds.add(stack.id)
    if (stack.bundleId !== undefined && !bundleIds.has(stack.bundleId)) {
      errors.push(`Stack "${stack.id}" references unknown bundle "${stack.bundleId}"`)
    }
    validateStack(stack, errors)
  }

  const streamIds = new Set<string>()
  const targetKind = new Map(table.stacks.map((s) => [s.id, s.base.kind]))
  for (const stream of table.streams) {
    if (streamIds.has(stream.id)) errors.push(`Duplicate stream id "${stream.id}"`)
    streamIds.add(stream.id)
    if (stream.to !== CASH_ID) {
      const kind = targetKind.get(stream.to)
      if (kind === undefined) {
        errors.push(`Stream "${stream.id}" targets unknown stack "${stream.to}"`)
      } else if (kind === 'source') {
        errors.push(`Stream "${stream.id}" targets a source; streams may only feed assets, debts or cash`)
      }
    }
    if (stream.bundleId !== undefined && !bundleIds.has(stream.bundleId)) {
      errors.push(`Stream "${stream.id}" references unknown bundle "${stream.bundleId}"`)
    }
    if (stream.rule.type === 'fixed' && stream.rule.amountPerMonth < 0) {
      errors.push(`Stream "${stream.id}": fixed amount must be ≥ 0`)
    }
    if (stream.rule.type === 'percent' && (stream.rule.percent < 0 || stream.rule.percent > 1)) {
      errors.push(`Stream "${stream.id}": percent must be within 0..1`)
    }
  }

  return errors
}
