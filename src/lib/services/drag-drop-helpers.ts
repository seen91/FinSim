import type { FinancialCard } from '$lib/core/types';

export interface DragCardData {
  type: 'card';
  card: FinancialCard;
}

/**
 * Parses drag data to extract a card if present
 */
export function parseDragCardData(dataTransfer: DataTransfer | null): FinancialCard | null {
  if (!dataTransfer) return null;
  
  try {
    const data = dataTransfer.getData('application/json');
    if (!data) return null;
    
    const draggedData = JSON.parse(data) as DragCardData;
    return draggedData.type === 'card' ? draggedData.card : null;
  } catch {
    return null;
  }
}

/**
 * Creates drag data for a card
 */
export function createDragCardData(card: FinancialCard): DragCardData {
  return {
    type: 'card',
    card
  };
}

/**
 * Validates if a modifier card can be stacked on a base card
 */
export function validateCardStacking(baseCard: FinancialCard, modifierCard: FinancialCard): boolean {
  return baseCard.role === 'base' && 
         baseCard.canBeStacked === true &&
         modifierCard.role === 'modifier' && 
         modifierCard.canStack === true &&
         baseCard.stackCategory !== undefined &&
         modifierCard.compatibleWith?.includes(baseCard.stackCategory) === true;
}

/**
 * Validates if a modifier card can be added to an existing stack
 */
export function validateStackAddition(stackBaseCard: FinancialCard, modifierCard: FinancialCard): boolean {
  return modifierCard.role === 'modifier' && 
         modifierCard.canStack === true &&
         stackBaseCard.stackCategory !== undefined &&
         modifierCard.compatibleWith?.includes(stackBaseCard.stackCategory) === true;
}
