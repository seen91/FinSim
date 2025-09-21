import type { Deck, CardStack } from '../core/types';
import { carCards, carExpenseCards } from './cards';

// Find the car asset and depreciation cards from the centralized cards
const carAssetCard = carCards.find(card => card.id === 'car-asset')!;
const carDepreciationCard = carCards.find(card => card.id === 'car-depreciation')!;

// Create a pre-stacked CardStack for car asset with depreciation
const carAssetWithDepreciation: CardStack = {
  id: 'car-asset-with-depreciation',
  cards: [carAssetCard, carDepreciationCard]
};

export const carTcoDeck: Deck = {
  id: 'car-tco',
  name: 'Cheap Car',
  description: 'Total Cost of Ownership for a 120,000 SEK car with depreciation and operating costs',
  cards: [
    // Individual operating expense cards
    ...carExpenseCards
  ],
  // Pre-defined stacks within the deck
  stacks: [
    carAssetWithDepreciation
  ]
};
