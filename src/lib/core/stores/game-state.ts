import { writable, derived } from 'svelte/store';
import type { FinancialCard, Deck, GameState, CardStack } from '../types';
import { calculateProjections } from '../calculations';
import { allDecks } from '../../data';

const initialState: GameState = {
  hand: [],
  availableDecks: allDecks,
  activeCardIds: new Set(),
  cardStacks: [],
  activeStackIds: new Set()
};

export const gameState = writable<GameState>(initialState);

/**
 * Get modifier cards that are in the hand but not stacked on any base card.
 * These "unbound" modifier cards should apply to all cards in the hand.
 */
export const unboundModifierCards = derived(gameState, ($state) => {
  // Get all card IDs that are part of stacks (both base and modifier cards)
  const stackedCardIds = new Set<string>();
  $state.cardStacks.forEach(stack => {
    stackedCardIds.add(stack.baseCard.id);
    stack.modifierCards.forEach(modifier => stackedCardIds.add(modifier.id));
  });
  
  // Find modifier cards that are in hand but not in any stack
  return $state.hand.filter(card => 
    card.role === 'modifier' && 
    card.canStack === true &&
    !stackedCardIds.has(card.id)
  );
});

export const projections = derived(gameState, ($state) => {
  const activeCards = $state.hand.filter(card => 
    $state.activeCardIds.has(card.id)
  );
  
  const activeStacks = $state.cardStacks.filter(stack =>
    $state.activeStackIds.has(stack.id)
  );
  
  // Pass all cards in the hand for unbound modifier calculation, but only project active ones
  return calculateProjections(activeCards, activeStacks, $state.hand);
});
