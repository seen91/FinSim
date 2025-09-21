import type { Deck } from '../core/types';
import { carCards, carExpenseCards } from './cards';

// Find the car asset and depreciation cards from the centralized cards
const carAssetCard = carCards.find(card => card.id === 'car-asset')!;
const carDepreciationCard = carCards.find(card => card.id === 'car-depreciation')!;

export const carTcoDeck: Deck = {
  id: 'car-tco',
  name: 'Cheap Car TCO',
  description: 'Total Cost of Ownership for a 120,000 SEK car with depreciation and operating costs',
  cards: [
    // Car Asset and Depreciation
    carAssetCard,
    carDepreciationCard,
    
    // Car Operating Expenses - imported from centralized cards
    ...carExpenseCards
  ]
};
