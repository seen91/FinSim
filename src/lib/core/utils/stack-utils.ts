import type { FinancialCard, CardStack, NestedStack, StackableItem } from '../types';

/**
 * Determines if an item is a FinancialCard
 */
export function isCard(item: StackableItem): item is FinancialCard {
  return 'type' in item && 'parameters' in item;
}

/**
 * Determines if an item is a CardStack  
 */
export function isStack(item: StackableItem): item is CardStack {
  return 'cards' in item && Array.isArray((item as CardStack).cards);
}

/**
 * Determines if an item is a NestedStack
 */
export function isNestedStack(item: any): item is NestedStack {
  return 'items' in item && Array.isArray((item as NestedStack).items);
}

/**
 * Get all cards from a stack, flattening nested structures
 */
export function getAllCardsFromStack(stack: CardStack): FinancialCard[] {
  return stack.cards;
}

/**
 * Get all cards from a nested stack, flattening all nested structures recursively
 */
export function getAllCardsFromNestedStack(nestedStack: NestedStack): FinancialCard[] {
  const cards: FinancialCard[] = [];
  
  for (const item of nestedStack.items) {
    if (isCard(item)) {
      cards.push(item);
    } else if (isStack(item)) {
      cards.push(...getAllCardsFromStack(item));
    } else if (isNestedStack(item)) {
      cards.push(...getAllCardsFromNestedStack(item));
    }
  }
  
  return cards;
}

/**
 * Get the primary (first/bottom) card from any stack type
 */
export function getPrimaryCard(stack: CardStack | NestedStack): FinancialCard | null {
  if (isNestedStack(stack)) {
    if (stack.items.length === 0) return null;
    const firstItem = stack.items[0];
    if (isCard(firstItem)) return firstItem;
    if (isStack(firstItem)) return getPrimaryCard(firstItem);
    return null;
  } else {
    return stack.cards.length > 0 ? stack.cards[0] : null;
  }
}

/**
 * Count total cards in any stack type
 */
export function getStackCardCount(stack: CardStack | NestedStack): number {
  if (isNestedStack(stack)) {
    return getAllCardsFromNestedStack(stack).length;
  } else {
    return stack.cards.length;
  }
}

/**
 * Convert a CardStack to a NestedStack
 */
export function cardStackToNestedStack(cardStack: CardStack): NestedStack {
  return {
    id: cardStack.id,
    items: cardStack.cards,
    position: cardStack.position
  };
}

/**
 * Create a new NestedStack from two stackable items
 */
export function createNestedStack(item1: StackableItem, item2: StackableItem, id?: string): NestedStack {
  return {
    id: id || `nested-stack-${Date.now()}`,
    items: [item1, item2]
  };
}