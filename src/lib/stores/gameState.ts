import { writable, derived } from 'svelte/store';
import type { FinancialCard, Deck, GameState, TimeSeriesPoint } from '$lib/types';
import { calculateProjections } from '$lib/utils/calculations';
import { sampleDecks } from '$lib/utils/sampleData';

// Initialize with sample data
const initialState: GameState = {
  hand: [],
  availableDecks: sampleDecks,
  activeCardIds: new Set()
};

export const gameState = writable<GameState>(initialState);

export const projections = derived(gameState, ($state) => {
  const activeCards = $state.hand.filter(card => 
    $state.activeCardIds.has(card.id)
  );
  return calculateProjections(activeCards);
});

export function addCardToHand(card: FinancialCard) {
  gameState.update(state => {
    const newCard = { ...card, id: `${card.id}-${Date.now()}` };
    return {
      ...state,
      hand: [...state.hand, newCard],
      activeCardIds: new Set([...state.activeCardIds, newCard.id])
    };
  });
}

export function addDeckToHand(deck: Deck) {
  gameState.update(state => {
    const newCards = deck.cards.map(card => ({
      ...card,
      id: `${card.id}-${Date.now()}`
    }));
    const newActiveIds = new Set([
      ...state.activeCardIds,
      ...newCards.map(c => c.id)
    ]);
    return {
      ...state,
      hand: [...state.hand, ...newCards],
      activeCardIds: newActiveIds
    };
  });
}

export function toggleCard(cardId: string) {
  gameState.update(state => {
    const newActiveIds = new Set(state.activeCardIds);
    if (newActiveIds.has(cardId)) {
      newActiveIds.delete(cardId);
    } else {
      newActiveIds.add(cardId);
    }
    return { ...state, activeCardIds: newActiveIds };
  });
}

export function removeCardFromHand(cardId: string) {
  gameState.update(state => {
    const newHand = state.hand.filter(card => card.id !== cardId);
    const newActiveIds = new Set(state.activeCardIds);
    newActiveIds.delete(cardId);
    return {
      ...state,
      hand: newHand,
      activeCardIds: newActiveIds
    };
  });
}