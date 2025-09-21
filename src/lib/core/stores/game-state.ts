import { writable, derived } from 'svelte/store';
import type { FinancialCard, Deck, GameState, CardStack } from '../types';
import { calculateProjections } from '../calculations';
import { allDecks } from '../../data';

const initialState: GameState = {
  hand: [],
  availableDecks: allDecks,
  activeCardIds: new Set(),
  cardStacks: [],
  activeStackIds: new Set(),
  nestedStacks: [],
  activeNestedStackIds: new Set()
};

export const gameState = writable<GameState>(initialState);

/**
 * Get cards with stack effects that are in the hand but not part of any stack.
 * These "unbound" effect cards should apply to all cards in the hand.
 */
export const unboundEffectCards = derived(gameState, ($state) => {
  // Get all card IDs that are part of stacks
  const stackedCardIds = new Set<string>();
  $state.cardStacks.forEach(stack => {
    stack.cards.forEach(card => stackedCardIds.add(card.id));
  });
  
  // Find cards with stack effects that are in hand but not in any stack
  return $state.hand.filter(card => 
    card.stackEffects && 
    card.stackEffects.length > 0 &&
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
