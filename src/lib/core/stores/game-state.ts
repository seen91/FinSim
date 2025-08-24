import { writable, derived } from 'svelte/store';
import type { FinancialCard, Deck, GameState } from '../types';
import { calculateProjections } from '../calculations';
import { allDecks } from '../../data';

const initialState: GameState = {
  hand: [],
  availableDecks: allDecks,
  activeCardIds: new Set()
};

export const gameState = writable<GameState>(initialState);

export const projections = derived(gameState, ($state) => {
  const activeCards = $state.hand.filter(card => 
    $state.activeCardIds.has(card.id)
  );
  return calculateProjections(activeCards);
});
