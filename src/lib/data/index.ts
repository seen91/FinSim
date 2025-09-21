import { carTcoDeck } from './decks';
import { incomeCards, expenseCards, investmentCards, effectCards } from './cards';
import { allUnifiedCards } from './unified-cards';

export const allDecks = [carTcoDeck];

// Individual cards for the workshop - only basic personal finance cards
export const allIndividualCards = [
  // Basic salary
  incomeCards.find(card => card.id === 'monthly-salary')!,
  // Basic living expenses  
  expenseCards.find(card => card.id === 'living-expenses')!,
  // Investment account
  investmentCards.find(card => card.id === 'isk-account')!,
  // ISK tax effect
  effectCards.find(card => card.id === 'isk-tax')!
];

// Export unified cards for the new mathematical model
export { allUnifiedCards };
