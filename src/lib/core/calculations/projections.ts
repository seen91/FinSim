import type { FinancialCard, TimeSeriesPoint, CardStack, StackEffect } from '../types';
import { calculateCardProjection } from './card-projection';
import { calculateStackProjection } from './stack-projection';
import { evaluate } from 'mathjs';

/**
 * Get modifier cards that are in the hand but not stacked on any base card.
 * These "unbound" modifier cards should apply to all cards in the hand.
 */
function getUnboundModifierCards(allHandCards: FinancialCard[], stacks: CardStack[]): FinancialCard[] {
  // Get all card IDs that are part of stacks (both base and modifier cards)
  const stackedCardIds = new Set<string>();
  stacks.forEach(stack => {
    stackedCardIds.add(stack.baseCard.id);
    stack.modifierCards.forEach(modifier => stackedCardIds.add(modifier.id));
  });
  
  // Find modifier cards that are in hand but not in any stack
  return allHandCards.filter(card => 
    card.role === 'modifier' && 
    card.canStack === true &&
    !stackedCardIds.has(card.id)
  );
}

/**
 * Apply stack effects from unbound modifier cards to a given value
 */
function applyUnboundModifierEffects(
  baseValue: number, 
  modifierCards: FinancialCard[],
  point: TimeSeriesPoint
): number {
  let modifiedValue = baseValue;
  
  for (const modifier of modifierCards) {
    if (modifier.stackEffects) {
      for (const effect of modifier.stackEffects) {
        modifiedValue = applyStackEffect(modifiedValue, effect, point);
      }
    }
  }
  
  return modifiedValue;
}

/**
 * Apply a single stack effect - extracted from stack-projection.ts to reuse here
 */
function applyStackEffect(baseValue: number, effect: StackEffect, point: TimeSeriesPoint): number {
  switch (effect.type) {
    case 'multiply':
      return baseValue * (effect.value || 1);
    
    case 'add':
      return baseValue + (effect.value || 0);
    
    case 'subtract':
      return baseValue - (effect.value || 0);
    
    case 'percentage':
      // Convert percentage to multiplier (e.g., 20% tax = 0.8 multiplier)
      const percentage = effect.value || 0;
      return baseValue * (1 - (percentage / 100));
    
    case 'custom':
      if (!effect.formula) return baseValue;
      try {
        // Allow access to baseValue, year, and time in custom formulas
        const t = point.year - 2025; // Assuming 2025 as base year
        const result = evaluate(effect.formula, { 
          baseValue, 
          year: point.year, 
          t,
          value: baseValue // Alias for baseValue
        });
        return typeof result === 'number' ? result : baseValue;
      } catch (e) {
        console.error('Stack effect formula error:', e);
        return baseValue;
      }
    
    default:
      return baseValue;
  }
}

export function calculateProjections(
  cards: FinancialCard[], 
  stacks: CardStack[] = [], 
  allHandCards?: FinancialCard[]
): TimeSeriesPoint[] {
  const allPoints: TimeSeriesPoint[] = [];
  
  // Use allHandCards if provided, otherwise fall back to cards for backward compatibility
  const handCardsForModifiers = allHandCards || cards;
  
  // Get unbound modifier cards that should apply to all cards
  const unboundModifiers = getUnboundModifierCards(handCardsForModifiers, stacks);
  
  // Calculate projections for individual cards (non-modifier cards not in stacks)
  const stackedCardIds = new Set<string>();
  stacks.forEach(stack => {
    stackedCardIds.add(stack.baseCard.id);
    stack.modifierCards.forEach(modifier => stackedCardIds.add(modifier.id));
  });
  
  cards.forEach(card => {
    // Skip cards that are part of stacks or are unbound modifier cards
    if (stackedCardIds.has(card.id) || (card.role === 'modifier' && card.canStack)) {
      return;
    }
    
    let points = calculateCardProjection(card);
    
    // Apply unbound modifier effects to each point
    if (unboundModifiers.length > 0) {
      points = points.map(point => ({
        ...point,
        value: applyUnboundModifierEffects(point.value, unboundModifiers, point)
      }));
    }
    
    allPoints.push(...points);
  });
  
  // Calculate projections for card stacks (which already have their modifiers applied)
  stacks.forEach(stack => {
    let points = calculateStackProjection(stack);
    
    // Apply unbound modifier effects to stack results as well
    if (unboundModifiers.length > 0) {
      points = points.map(point => ({
        ...point,
        value: applyUnboundModifierEffects(point.value, unboundModifiers, point)
      }));
    }
    
    allPoints.push(...points);
  });
  
  return allPoints;
}

export function aggregateProjections(points: TimeSeriesPoint[]): Map<number, number> {
  const yearlyTotals = new Map<number, number>();
  
  points.forEach(point => {
    const currentTotal = yearlyTotals.get(point.year) || 0;
    yearlyTotals.set(point.year, currentTotal + point.value);
  });
  
  return yearlyTotals;
}
