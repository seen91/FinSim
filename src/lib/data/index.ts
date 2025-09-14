import { investmentCards, incomeCards, expenseCards, taxCards, bonusCards } from './cards';
import { conservativeDeck, taxOptDeck, fireDeck } from './decks';

export const allDecks = [conservativeDeck, taxOptDeck, fireDeck];
export const allIndividualCards = [...investmentCards, ...incomeCards, ...expenseCards, ...taxCards, ...bonusCards];
