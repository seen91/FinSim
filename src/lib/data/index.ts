import { investmentCards, incomeCards, expenseCards, taxCards, bonusCards, loanCards } from './cards';
import { conservativeDeck, taxOptDeck, fireDeck, leverageDeck } from './decks';

export const allDecks = [conservativeDeck, taxOptDeck, fireDeck, leverageDeck];
export const allIndividualCards = [...investmentCards, ...incomeCards, ...expenseCards, ...taxCards, ...bonusCards, ...loanCards];
