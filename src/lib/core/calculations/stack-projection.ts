import type { CardStack, TimeSeriesPoint, StackEffect } from '../types';
import { calculateCardProjection } from './card-projection';
import { evaluate } from 'mathjs';

export function calculateStackProjection(stack: CardStack): TimeSeriesPoint[] {
  // If only one card in stack, return its projection
  if (stack.cards.length === 1) {
    return calculateCardProjection(stack.cards[0]);
  }
  
  // Process cards sequentially in the order they were stacked
  // Start with the first card's projection
  let currentPoints = calculateCardProjection(stack.cards[0]);
  
  // Process each subsequent card in order
  for (let i = 1; i < stack.cards.length; i++) {
    const card = stack.cards[i];
    const cardPoints = calculateCardProjection(card);
    
    // Combine the current running total with this card's values
    currentPoints = combineCardProjections(currentPoints, cardPoints, card);
  }
  
  // Update the cardId to reflect that this is a stack
  return currentPoints.map(point => ({
    ...point,
    cardId: stack.id
  }));
}

/**
 * Combine two card projections, applying the second card's effects to the first
 */
function combineCardProjections(
  basePoints: TimeSeriesPoint[], 
  newCardPoints: TimeSeriesPoint[], 
  newCard: any
): TimeSeriesPoint[] {
  // Create a map of years to values for the new card
  const newCardValuesByYear = new Map<number, number>();
  newCardPoints.forEach(point => {
    newCardValuesByYear.set(point.year, point.value);
  });
  
  return basePoints.map(basePoint => {
    const newCardValue = newCardValuesByYear.get(basePoint.year) || 0;
    let combinedValue = basePoint.value;
    
    // If the new card has stack effects, apply them to the current total
    if (newCard.stackEffects && newCard.stackEffects.length > 0) {
      for (const effect of newCard.stackEffects) {
        combinedValue = applyStackEffect(combinedValue, effect, basePoint);
      }
    } else {
      // If no stack effects, simply add the card's value to the running total
      combinedValue += newCardValue;
    }
    
    return {
      ...basePoint,
      value: combinedValue
    };
  });
}

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

export function validateStackCompatibility(card1: any, card2: any): boolean {
  // Any card can be stacked with any other card
  return true;
}
