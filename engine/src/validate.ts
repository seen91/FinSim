import type { Card, Curve, GrowthParam, HandCard, Table } from './types.js'

/**
 * Structural validation of a table — the kind system as code (DESIGN.md §7).
 * `simulate` refuses invalid tables; the UI uses the same checks to decide
 * what may be played where.
 */

export const CASH_ID = 'cash'

const CADENCES = new Set(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])

function validateCurveShape(curve: Curve, where: string, errors: string[]): void {
  if (curve.type === 'step') {
    for (let i = 1; i < curve.steps.length; i++) {
      if (curve.steps[i]!.atMonth <= curve.steps[i - 1]!.atMonth) {
        errors.push(`${where}: step curve months must be strictly increasing`)
        break
      }
    }
  }
}

function validateGrowth(growth: GrowthParam | undefined, where: string, errors: string[]): void {
  if (!growth) return
  if (growth.volatility !== undefined && growth.volatility < 0) {
    errors.push(`${where}: volatility must be ≥ 0`)
  }
  if (growth.correlation !== undefined && (growth.correlation < -1 || growth.correlation > 1)) {
    errors.push(`${where}: correlation must be within −1..1`)
  }
}

function validateCard(card: Card, errors: string[]): void {
  switch (card.kind) {
    case 'source':
      validateCurveShape(card.flow, `Card "${card.id}"`, errors)
      if (card.cadence !== undefined && !CADENCES.has(card.cadence)) {
        errors.push(`Card "${card.id}": unknown cadence "${String(card.cadence)}"`)
      }
      break
    case 'drain': {
      const hasAmount = card.amount !== undefined
      const hasPercent = card.percent !== undefined
      if (hasAmount === hasPercent) {
        errors.push(`Card "${card.id}": a drain has exactly one of amount or percent`)
      }
      if (card.cadence !== undefined && !CADENCES.has(card.cadence)) {
        errors.push(`Card "${card.id}": unknown cadence "${String(card.cadence)}"`)
      }
      if (card.cadence !== undefined && hasPercent) {
        errors.push(`Card "${card.id}": a percent drain is a per-tick share and cannot have a cadence`)
      }
      if (card.amount) validateCurveShape(card.amount, `Card "${card.id}"`, errors)
      if (card.percent !== undefined && (card.percent < 0 || card.percent > 1)) {
        errors.push(`Card "${card.id}": drain percent must be within 0..1`)
      }
      break
    }
    case 'asset':
      validateGrowth(card.growth, `Card "${card.id}"`, errors)
      if (card.price && card.growth) {
        errors.push(`Card "${card.id}": an asset has either a growth rate or a price curve, not both`)
      }
      if (!card.price && card.initialUnits !== undefined) {
        errors.push(`Card "${card.id}": initialUnits requires a price curve`)
      }
      if (card.fee !== undefined && card.fee < 0) {
        errors.push(`Card "${card.id}": fee must be ≥ 0`)
      }
      if (card.take?.type === 'percent' && (card.take.percent < 0 || card.take.percent > 1)) {
        errors.push(`Card "${card.id}": take percent must be within 0..1`)
      }
      if (card.take?.type === 'fixed' && card.take.amountPerMonth < 0) {
        errors.push(`Card "${card.id}": take amount must be ≥ 0`)
      }
      break
    case 'debt':
      if (card.principal < 0) {
        errors.push(`Card "${card.id}": debt principal must be ≥ 0 (it is reported as a negative balance)`)
      }
      if (card.payment?.type === 'percent' && (card.payment.percent < 0 || card.payment.percent > 1)) {
        errors.push(`Card "${card.id}": payment percent must be within 0..1`)
      }
      if (card.payment?.type === 'fixed' && card.payment.amountPerMonth < 0) {
        errors.push(`Card "${card.id}": payment amount must be ≥ 0`)
      }
      break
    case 'hand':
      if (card.take?.type === 'percent' && (card.take.percent < 0 || card.take.percent > 1)) {
        errors.push(`Card "${card.id}": take percent must be within 0..1`)
      }
      if (card.take?.type === 'fixed' && card.take.amountPerMonth < 0) {
        errors.push(`Card "${card.id}": take amount must be ≥ 0`)
      }
      for (const child of card.children) validateCard(child, errors)
      break
    case 'rule': {
      const { schedule, effect } = card.rule
      if (schedule.kind === 'yearly' && (schedule.monthOfYear < 1 || schedule.monthOfYear > 12)) {
        errors.push(`Card "${card.id}": rule monthOfYear must be within 1..12`)
      }
      if ((effect.type === 'flowTax' || effect.type === 'balanceTax') && (effect.rate < 0 || effect.rate > 1)) {
        errors.push(`Card "${card.id}": rule tax rate must be within 0..1`)
      }
      break
    }
  }
}

export function validateTable(table: Table): string[] {
  const errors: string[] = []
  if (table.root.kind !== 'hand') {
    errors.push('Table root must be a hand')
    return errors
  }
  if (table.root.take) {
    errors.push('Table root cannot have a take — there is no parent hand to draw from')
  }
  const seen = new Set<string>([table.root.id])
  const walk = (hand: HandCard): void => {
    for (const child of hand.children) {
      if (child.id === CASH_ID) errors.push(`Card id "${CASH_ID}" is reserved for the default cash account`)
      if (seen.has(child.id)) errors.push(`Duplicate card id "${child.id}"`)
      seen.add(child.id)
      if (child.kind === 'hand') walk(child)
    }
  }
  walk(table.root)
  for (const child of table.root.children) validateCard(child, errors)
  return errors
}
