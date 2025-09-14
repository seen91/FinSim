import { gameState } from './game-state';
import type { FinancialCard, Deck, CardStack } from '../types';
import { validateStackCompatibility } from '../calculations/stack-projection';

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

export function toggleStack(stackId: string): void {
  gameState.update(state => {
    const newActiveStackIds = new Set(state.activeStackIds);
    if (newActiveStackIds.has(stackId)) {
      newActiveStackIds.delete(stackId);
    } else {
      newActiveStackIds.add(stackId);
    }
    return {
      ...state,
      activeStackIds: newActiveStackIds
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

export function createCardStack(baseCardId: string, modifierCardId: string): boolean {
  let success = false;
  
  gameState.update(state => {
    const baseCard = state.hand.find(card => card.id === baseCardId);
    const modifierCard = state.hand.find(card => card.id === modifierCardId);
    
    if (!baseCard || !modifierCard) {
      return state;
    }
    
    // Validate compatibility
    if (!validateStackCompatibility(baseCard, modifierCard)) {
      return state;
    }
    
    // Create new stack
    const newStack: CardStack = {
      id: `stack-${Date.now()}`,
      baseCard,
      modifierCards: [modifierCard]
    };
    
    // Remove cards from hand and add stack
    const newHand = state.hand.filter(card => 
      card.id !== baseCardId && card.id !== modifierCardId
    );
    
    // Remove from active cards
    const newActiveIds = new Set(state.activeCardIds);
    newActiveIds.delete(baseCardId);
    newActiveIds.delete(modifierCardId);
    
    // Activate the new stack
    const newActiveStackIds = new Set([...state.activeStackIds, newStack.id]);
    
    success = true;
    return {
      ...state,
      hand: newHand,
      cardStacks: [...state.cardStacks, newStack],
      activeCardIds: newActiveIds,
      activeStackIds: newActiveStackIds
    };
  });
  
  return success;
}

export function addToStack(stackId: string, modifierCardId: string): boolean {
  let success = false;
  
  gameState.update(state => {
    const stack = state.cardStacks.find(s => s.id === stackId);
    const modifierCard = state.hand.find(card => card.id === modifierCardId);
    
    if (!stack || !modifierCard) {
      return state;
    }
    
    // Validate compatibility with base card
    if (!validateStackCompatibility(stack.baseCard, modifierCard)) {
      return state;
    }
    
    // Update stack with new modifier
    const updatedStacks = state.cardStacks.map(s => 
      s.id === stackId 
        ? { ...s, modifierCards: [...s.modifierCards, modifierCard] }
        : s
    );
    
    // Remove card from hand
    const newHand = state.hand.filter(card => card.id !== modifierCardId);
    
    // Remove from active cards
    const newActiveIds = new Set(state.activeCardIds);
    newActiveIds.delete(modifierCardId);
    
    success = true;
    return {
      ...state,
      hand: newHand,
      cardStacks: updatedStacks,
      activeCardIds: newActiveIds
    };
  });
  
  return success;
}

export function unstackCards(stackId: string): void {
  gameState.update(state => {
    const stack = state.cardStacks.find(s => s.id === stackId);
    if (!stack) return state;
    
    // Check if the stack was active to preserve activity state
    const wasStackActive = state.activeStackIds.has(stackId);
    
    // Return all cards to hand
    const cardsToReturn = [stack.baseCard, ...stack.modifierCards];
    
    // Remove stack
    const newStacks = state.cardStacks.filter(s => s.id !== stackId);
    
    // Remove from active stacks
    const newActiveStackIds = new Set(state.activeStackIds);
    newActiveStackIds.delete(stackId);
    
    // If the stack was active, make all returned cards active
    const newActiveCardIds = new Set(state.activeCardIds);
    if (wasStackActive) {
      cardsToReturn.forEach(card => {
        newActiveCardIds.add(card.id);
      });
    }
    
    return {
      ...state,
      hand: [...state.hand, ...cardsToReturn],
      cardStacks: newStacks,
      activeStackIds: newActiveStackIds,
      activeCardIds: newActiveCardIds
    };
  });
}

export function removeStack(stackId: string): void {
  gameState.update(state => {
    const newStacks = state.cardStacks.filter(s => s.id !== stackId);
    const newActiveStackIds = new Set(state.activeStackIds);
    newActiveStackIds.delete(stackId);
    
    return {
      ...state,
      cardStacks: newStacks,
      activeStackIds: newActiveStackIds
    };
  });
}
