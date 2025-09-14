import type { CardStack, TimeSeriesPoint, StackEffect } from '../types';
import { calculateCardProjection } from './card-projection';
import { evaluate } from 'mathjs';

export function calculateStackProjection(stack: CardStack): TimeSeriesPoint[] {
  // First calculate the base card projection
  const basePoints = calculateCardProjection(stack.baseCard);
  
  // If no modifier cards, return base projection
  if (stack.modifierCards.length === 0) {
    return basePoints;
  }
  
  // Apply modifier effects to each time point
  const modifiedPoints: TimeSeriesPoint[] = basePoints.map(point => {
    let modifiedValue = point.value;
    
    // Apply each modifier card's effects
    for (const modifier of stack.modifierCards) {
      if (modifier.stackEffects) {
        for (const effect of modifier.stackEffects) {
          modifiedValue = applyStackEffect(modifiedValue, effect, point);
        }
      }
    }
    
    return {
      ...point,
      value: modifiedValue,
      cardId: stack.id // Use stack id instead of individual card id
    };
  });
  
  return modifiedPoints;
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

export function validateStackCompatibility(baseCard: any, modifierCard: any): boolean {
  // Check if the modifier card can be stacked
  if (!modifierCard.canStack) {
    return false;
  }
  
  // Check if the base card can be stacked upon
  if (!baseCard.canBeStacked) {
    return false;
  }
  
  // All modifier cards can now stack on all base cards
  return true;
}
