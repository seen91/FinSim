import type { FinancialCard, TimeSeriesPoint, CardStack, StackEffect } from '../types';
import { calculateLegacyCardProjection } from './unified-projection';
import { calculateStackProjection } from './stack-projection';
import { evaluate } from 'mathjs';

/**
 * Get cards with stack effects that are in the hand but not part of any stack.
 * These "unbound" effect cards should apply to all cards in the hand.
 */
function getUnboundEffectCards(allHandCards: FinancialCard[], stacks: CardStack[]): FinancialCard[] {
  // Get all card IDs that are part of stacks
  const stackedCardIds = new Set<string>();
  stacks.forEach(stack => {
    stack.cards.forEach(card => stackedCardIds.add(card.id));
  });
  
  // Find cards with stack effects that are in hand but not in any stack
  return allHandCards.filter(card => 
    card.stackEffects && 
    card.stackEffects.length > 0 &&
    !stackedCardIds.has(card.id)
  );
}

/**
 * Apply stack effects from unbound effect cards to a given value
 */
function applyUnboundEffectCardEffects(
  baseValue: number, 
  effectCards: FinancialCard[],
  point: TimeSeriesPoint
): number {
  let modifiedValue = baseValue;
  
  for (const card of effectCards) {
    if (card.stackEffects) {
      for (const effect of card.stackEffects) {
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
  const handCardsForEffects = allHandCards || cards;
  
  // Get unbound effect cards that should apply to all cards
  // Only use ACTIVE cards for unbound effects (cards that are passed in, not allHandCards)
  const unboundEffects = getUnboundEffectCards(cards, stacks);
  
  // Calculate projections for individual cards (cards not in stacks)
  const stackedCardIds = new Set<string>();
  stacks.forEach(stack => {
    stack.cards.forEach(card => stackedCardIds.add(card.id));
  });
  
  cards.forEach(card => {
    // Skip cards that are part of stacks or are unbound effect cards
    if (stackedCardIds.has(card.id) || (card.stackEffects && card.stackEffects.length > 0 && unboundEffects.includes(card))) {
      return;
    }
    
    let points = calculateLegacyCardProjection(card);
    
    // Apply unbound effect card effects to each point
    if (unboundEffects.length > 0) {
      points = points.map((point: TimeSeriesPoint) => ({
        ...point,
        value: applyUnboundEffectCardEffects(point.value, unboundEffects, point)
      }));
    }
    
    allPoints.push(...points);
  });
  
  // Calculate projections for card stacks (which already have their effects applied)
  stacks.forEach(stack => {
    let points = calculateStackProjection(stack);
    
    // Apply unbound effect card effects to stack results as well
    if (unboundEffects.length > 0) {
      points = points.map((point: TimeSeriesPoint) => ({
        ...point,
        value: applyUnboundEffectCardEffects(point.value, unboundEffects, point)
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
