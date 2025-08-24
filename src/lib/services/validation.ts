import type { FinancialCard, Deck } from '../core/types';

export function validateFinancialCard(card: Partial<FinancialCard>): card is FinancialCard {
  return !!(
    card.id &&
    card.name &&
    card.type &&
    card.parameters &&
    card.timeRange &&
    Array.isArray(card.timeRange) &&
    card.timeRange.length === 2 &&
    card.color
  );
}

export function validateDeck(deck: Partial<Deck>): deck is Deck {
  return !!(
    deck.id &&
    deck.name &&
    deck.description &&
    Array.isArray(deck.cards) &&
    deck.cards.every(validateFinancialCard)
  );
}

export function sanitizeCardInput(card: Partial<FinancialCard>): FinancialCard | null {
  if (!validateFinancialCard(card)) {
    console.warn('Invalid card data:', card);
    return null;
  }
  
  // Ensure numeric values are properly typed
  const sanitized = { ...card };
  if (sanitized.parameters.principal !== undefined) {
    sanitized.parameters.principal = Number(sanitized.parameters.principal);
  }
  if (sanitized.parameters.rate !== undefined) {
    sanitized.parameters.rate = Number(sanitized.parameters.rate);
  }
  if (sanitized.parameters.monthlyAmount !== undefined) {
    sanitized.parameters.monthlyAmount = Number(sanitized.parameters.monthlyAmount);
  }
  
  return sanitized;
}
