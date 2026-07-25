import { CADENCES, type Cadence, type Card, type Curve, type GrowthParam, type HandCard, type Table, type Take } from './types.js'

/**
 * Structural validation of a table — the kind system as code (DESIGN.md §7).
 * `simulate` refuses invalid tables; the UI uses the same checks to decide
 * what may be played where.
 */

export const CASH_ID = 'cash'

function validCadence(cadence: Cadence): boolean {
  return (CADENCES as readonly string[]).includes(cadence)
}

/** A take/payment draws a share within 0..1 or a non-negative fixed amount. */
function validateTake(take: Take | undefined, what: string, where: string, errors: string[]): void {
  if (take?.type === 'percent' && (take.percent < 0 || take.percent > 1)) {
    errors.push(`${where}: ${what} percent must be within 0..1`)
  }
  if (take?.type === 'fixed' && take.amountPerMonth < 0) {
    errors.push(`${where}: ${what} amount must be ≥ 0`)
  }
}

function validateCurveShape(curve: Curve, where: string, errors: string[]): void {
  if (curve.type === 'step') {
    for (let i = 1; i < curve.steps.length; i++) {
      if (curve.steps[i]!.atMonth <= curve.steps[i - 1]!.atMonth) {
        errors.push(`${where}: step curve months must be strictly increasing`)
        break
      }
    }
  }
  if ('holdMonths' in curve && curve.holdMonths !== undefined && (!Number.isInteger(curve.holdMonths) || curve.holdMonths < 1)) {
    errors.push(`${where}: holdMonths must be a whole number of months ≥ 1`)
  }
  if ('holdAnchor' in curve && curve.holdAnchor !== undefined) {
    if (!Number.isInteger(curve.holdAnchor) || curve.holdAnchor < 1 || curve.holdAnchor > 12) {
      errors.push(`${where}: holdAnchor must be a calendar month 1..12`)
    }
    if (!('holdMonths' in curve) || curve.holdMonths === undefined) {
      errors.push(`${where}: holdAnchor requires holdMonths — an anchor needs a landing interval`)
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
      if (card.cadence !== undefined && !validCadence(card.cadence)) {
        errors.push(`Card "${card.id}": unknown cadence "${String(card.cadence)}"`)
      }
      break
    case 'drain': {
      const hasAmount = card.amount !== undefined
      const hasPercent = card.percent !== undefined
      if (hasAmount === hasPercent) {
        errors.push(`Card "${card.id}": a drain has exactly one of amount or percent`)
      }
      if (card.cadence !== undefined && !validCadence(card.cadence)) {
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
      if (!card.price && card.initialUnits !== undefined) {
        errors.push(`Card "${card.id}": initialUnits requires a price curve`)
      }
      if (card.price && 'type' in card.price) validateCurveShape(card.price, `Card "${card.id}" price`, errors)
      if (card.fee !== undefined && card.fee < 0) {
        errors.push(`Card "${card.id}": fee must be ≥ 0`)
      }
      validateTake(card.take, 'take', `Card "${card.id}"`, errors)
      break
    case 'debt':
      if (card.principal < 0) {
        errors.push(`Card "${card.id}": debt principal must be ≥ 0 (it is reported as a negative balance)`)
      }
      validateTake(card.payment, 'payment', `Card "${card.id}"`, errors)
      break
    case 'hand':
      validateTake(card.take, 'take', `Card "${card.id}"`, errors)
      for (const child of card.children) validateCard(child, errors)
      break
    case 'margin':
      // strictly exclusive: 0 pegs nothing and 1 makes the closed-form borrow (ltv⁄(1−ltv) × equity) unbounded
      if (!(card.ltv > 0 && card.ltv < 1)) {
        errors.push(`Card "${card.id}": margin ltv must be strictly between 0 and 1`)
      }
      validateGrowth(card.interest, `Card "${card.id}"`, errors)
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
