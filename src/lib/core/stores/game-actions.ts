import { gameState } from './game-state';
import type { FinancialCard, Deck, CardStack, NestedStack } from '../types';
import { validateStackCompatibility } from '../calculations/stack-projection';
import { createNestedStack } from '../utils/stack-utils';

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
    let newHand = [...state.hand];
    let newCardStacks = [...state.cardStacks];
    let newActiveCardIds = new Set(state.activeCardIds);
    let newActiveStackIds = new Set(state.activeStackIds);
    
    // Collect all cards from the deck (both from stacks and individual cards)
    let allCards: FinancialCard[] = [];
    
    // Add cards from pre-defined stacks
    if (deck.stacks && deck.stacks.length > 0) {
      for (const stack of deck.stacks) {
        allCards.push(...stack.cards);
      }
    }
    
    // Add individual cards from the deck
    if (deck.cards.length > 0) {
      allCards.push(...deck.cards);
    }
    
    // Create unique IDs for all cards
    const newCards = allCards.map(card => ({
      ...card,
      id: `${card.id}-${Date.now()}-${Math.random()}`
    }));
    
    if (newCards.length === 0) {
      // Empty deck - do nothing
      return state;
    } else if (newCards.length === 1) {
      // Single card - add as individual
      const newCard = newCards[0];
      newHand.push(newCard);
      newActiveCardIds.add(newCard.id);
    } else {
      // Multiple cards - create one comprehensive stack for the entire deck
      const newStack: CardStack = {
        id: `deck-${deck.id}-${Date.now()}-${Math.random()}`,
        name: deck.name, // Use deck name as stack name
        cards: newCards
      };
      
      newCardStacks.push(newStack);
      newActiveStackIds.add(newStack.id);
    }
    
    return {
      ...state,
      hand: newHand,
      cardStacks: newCardStacks,
      activeCardIds: newActiveCardIds,
      activeStackIds: newActiveStackIds
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

export function createNestedStackFromStacks(stack1Id: string, stack2Id: string): boolean {
  let success = false;
  
  gameState.update(state => {
    const stack1 = state.cardStacks.find(s => s.id === stack1Id);
    const stack2 = state.cardStacks.find(s => s.id === stack2Id);
    
    if (!stack1) {
      console.error('First stack not found:', stack1Id);
      return state;
    }
    
    if (!stack2) {
      console.error('Second stack not found:', stack2Id);
      return state;
    }
    
    // Create new nested stack containing both CardStacks
    const newNestedStack: NestedStack = createNestedStack(stack1, stack2, `nested-${Date.now()}`);
    
    // Remove original stacks from cardStacks
    const newCardStacks = state.cardStacks.filter(s => 
      s.id !== stack1Id && s.id !== stack2Id
    );
    
    // Remove from active stack IDs
    const newActiveStackIds = new Set(state.activeStackIds);
    newActiveStackIds.delete(stack1Id);
    newActiveStackIds.delete(stack2Id);
    
    // Add to nested stacks and activate it
    const newActiveNestedStackIds = new Set([...state.activeNestedStackIds, newNestedStack.id]);
    
    success = true;
    return {
      ...state,
      cardStacks: newCardStacks,
      nestedStacks: [...state.nestedStacks, newNestedStack],
      activeStackIds: newActiveStackIds,
      activeNestedStackIds: newActiveNestedStackIds
    };
  });
  
  return success;
}

export function addToNestedStack(nestedStackId: string, item: FinancialCard | CardStack): boolean {
  let success = false;
  
  gameState.update(state => {
    const nestedStack = state.nestedStacks.find(s => s.id === nestedStackId);
    
    if (!nestedStack) {
      console.error('Nested stack not found:', nestedStackId);
      return state;
    }
    
    // Update nested stack with new item
    const updatedNestedStacks = state.nestedStacks.map(s =>
      s.id === nestedStackId
        ? { ...s, items: [...s.items, item] }
        : s
    );
    
    // Remove item from its current location
    let newHand = state.hand;
    let newCardStacks = state.cardStacks;
    let newActiveCardIds = new Set(state.activeCardIds);
    let newActiveStackIds = new Set(state.activeStackIds);
    
    // Check if it's a card in hand
    if ('type' in item && 'parameters' in item) {
      const card = item as FinancialCard;
      newHand = state.hand.filter(c => c.id !== card.id);
      newActiveCardIds.delete(card.id);
    }
    // Check if it's a CardStack
    else if ('cards' in item) {
      const stack = item as CardStack;
      newCardStacks = state.cardStacks.filter(s => s.id !== stack.id);
      newActiveStackIds.delete(stack.id);
    }
    
    success = true;
    return {
      ...state,
      hand: newHand,
      cardStacks: newCardStacks,
      nestedStacks: updatedNestedStacks,
      activeCardIds: newActiveCardIds,
      activeStackIds: newActiveStackIds
    };
  });
  
  return success;
}
