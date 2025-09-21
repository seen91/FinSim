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

export function createCardStack(card1Id: string, card2Id: string): boolean {
  let success = false;
  
  gameState.update(state => {
    const card1 = state.hand.find(card => card.id === card1Id);
    const card2 = state.hand.find(card => card.id === card2Id);
    
    if (!card1) {
      console.error('First card not found:', card1Id);
      return state;
    }
    
    if (!card2) {
      console.error('Second card not found:', card2Id);
      return state;
    }
    
    // Validate compatibility (always true now)
    if (!validateStackCompatibility(card1, card2)) {
      console.error('Cards are not compatible for stacking:', card1.name, 'and', card2.name);
      return state;
    }
    
    // Create new stack
    const newStack: CardStack = {
      id: `stack-${Date.now()}`,
      cards: [card1, card2] // First card is primary, second is stacked on top
    };
    
    // Remove cards from hand and add stack
    const newHand = state.hand.filter(card => 
      card.id !== card1Id && card.id !== card2Id
    );
    
    // Remove from active cards
    const newActiveIds = new Set(state.activeCardIds);
    newActiveIds.delete(card1Id);
    newActiveIds.delete(card2Id);
    
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

export function addToStack(stackId: string, newCardId: string): boolean {
  let success = false;
  
  gameState.update(state => {
    const stack = state.cardStacks.find(s => s.id === stackId);
    const newCard = state.hand.find(card => card.id === newCardId);
    
    if (!stack) {
      console.error('Stack not found:', stackId);
      return state;
    }
    
    if (!newCard) {
      console.error('Card not found:', newCardId);
      return state;
    }
    
    // Validate compatibility with primary card (always true now)
    const primaryCard = stack.cards[0];
    if (!validateStackCompatibility(primaryCard, newCard)) {
      console.error('Card is not compatible with stack primary card:', newCard.name, 'and', primaryCard.name);
      return state;
    }
    
    // Update stack with new card
    const updatedStacks = state.cardStacks.map(s => 
      s.id === stackId 
        ? { ...s, cards: [...s.cards, newCard] }
        : s
    );
    
    // Remove card from hand
    const newHand = state.hand.filter(card => card.id !== newCardId);
    
    // Remove from active cards
    const newActiveIds = new Set(state.activeCardIds);
    newActiveIds.delete(newCardId);
    
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
    const cardsToReturn = stack.cards;
    
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
