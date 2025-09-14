import type { FinancialCard, CardStack } from './financial';
import type { Deck } from './deck';

export interface GameState {
  hand: FinancialCard[];
  availableDecks: Deck[];
  activeCardIds: Set<string>;
  cardStacks: CardStack[];
  activeStackIds: Set<string>;
}
