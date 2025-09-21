import type { Deck } from '../core/types';
import { cheapCarCards } from './unified-cards';

export const cheapCarDeck: Deck = {
  id: 'cheap-car',
  name: 'Cheap Car',
  description: 'Total Cost of Ownership for a $120,000 car with all related expenses',
  cards: cheapCarCards,
  stacks: []
};
