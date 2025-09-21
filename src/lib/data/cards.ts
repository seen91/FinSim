// DEPRECATED: This file is being phased out in favor of unified-cards.ts
// Temporary compatibility exports

import { allUnifiedCards } from './unified-cards';

// Legacy export - convert unified cards to legacy format for backward compatibility
export const incomeCards = allUnifiedCards.filter(card => 
  ['monthly-salary'].includes(card.id)
).map(convertToLegacyCard);

export const expenseCards = allUnifiedCards.filter(card => 
  ['living-expenses'].includes(card.id)
).map(convertToLegacyCard);

export const investmentCards = allUnifiedCards.filter(card => 
  ['isk-account'].includes(card.id)
).map(convertToLegacyCard);

export const effectCards = allUnifiedCards.filter(card => 
  ['inflation-sweden', 'annual-bonus'].includes(card.id)
).map(convertToLegacyCard);

export const carCards = allUnifiedCards.filter(card => 
  ['car-asset'].includes(card.id)
).map(convertToLegacyCard);

export const carExpenseCards = allUnifiedCards.filter(card => 
  ['car-depreciation'].includes(card.id)
).map(convertToLegacyCard);

export const taxCards = allUnifiedCards.filter(card => 
  ['income-tax'].includes(card.id)
).map(convertToLegacyCard);

// Export all cards in legacy format for compatibility
export const allCards = allUnifiedCards.map(convertToLegacyCard);

/**
 * Convert unified card to legacy format for backward compatibility
 */
function convertToLegacyCard(unifiedCard: any): any {
  const { curve } = unifiedCard;
  
  return {
    id: unifiedCard.id,
    name: unifiedCard.name,
    description: unifiedCard.description,
    color: unifiedCard.color,
    detailedInfo: unifiedCard.detailedInfo,
    type: curve.type === 'sinusoidal' ? 'custom' : curve.type,
    timeRange: curve.domain,
    parameters: {
      principal: curve.parameters.amplitude,
      rate: curve.parameters.rate * 100, // Convert back to percentage
      monthlyAmount: curve.parameters.offset,
      customFormula: curve.parameters.formula
    },
    stackEffects: [] // Simplified for compatibility
  };
}
