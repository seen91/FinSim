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
 * Validates if any card can be stacked on any other card
 */
export function validateCardStacking(card1: FinancialCard, card2: FinancialCard): boolean {
  // Any card can be stacked with any other card
  return true;
}

/**
 * Validates if a card can be added to an existing stack
 */
export function validateStackAddition(stackPrimaryCard: FinancialCard, newCard: FinancialCard): boolean {
  // Any card can be added to any stack
  return true;
}
