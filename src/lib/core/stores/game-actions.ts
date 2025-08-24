import { gameState } from './game-state';
import type { FinancialCard, Deck } from '../types';

export function addCardToHand(card: FinancialCard): void {
  gameState.update(state => {
    const newCard = { ...card, id: `${card.id}-${Date.now()}` };
    return {
      ...state,
      hand: [...state.hand, newCard],
      activeCardIds: new Set([...state.activeCardIds, newCard.id])
    };
  });
}

export function addDeckToHand(deck: Deck): void {
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

export function toggleCard(cardId: string): void {
  gameState.update(state => {
    const newActiveIds = new Set(state.activeCardIds);
    if (newActiveIds.has(cardId)) {
      newActiveIds.delete(cardId);
    } else {
      newActiveIds.add(cardId);
    }
    return {
      ...state,
      activeCardIds: newActiveIds
    };
  });
}

export function removeCardFromHand(cardId: string): void {
  gameState.update(state => {
    const newActiveIds = new Set(state.activeCardIds);
    newActiveIds.delete(cardId);
    return {
      ...state,
      hand: state.hand.filter(card => card.id !== cardId),
      activeCardIds: newActiveIds
    };
  });
}
