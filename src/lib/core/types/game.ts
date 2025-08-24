import type { FinancialCard } from './financial';
import type { Deck } from './deck';

export interface GameState {
  hand: FinancialCard[];
  availableDecks: Deck[];
  activeCardIds: Set<string>;
}
