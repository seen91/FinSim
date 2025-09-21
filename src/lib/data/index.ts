import { cheapCarDeck } from './decks';
import { allUnifiedCards, individualCards, cheapCarCards } from './unified-cards';

export const allDecks = [cheapCarDeck];

// Individual cards for the main game - simplified set
// Salary, Expenses, Investment Fund (7%), Investment Bank (2%)
export const allIndividualCards = individualCards;

// Export unified cards for the new mathematical model
export { allUnifiedCards };
