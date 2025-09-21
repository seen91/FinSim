import type { FinancialCard, CardStack, NestedStack } from './financial';
import type { Deck } from './deck';

export interface GameState {
  hand: FinancialCard[];
  availableDecks: Deck[];
  activeCardIds: Set<string>;
  cardStacks: CardStack[];
  activeStackIds: Set<string>;
  // For multi-dimensional stacking support
  nestedStacks: NestedStack[];
  activeNestedStackIds: Set<string>;
}
