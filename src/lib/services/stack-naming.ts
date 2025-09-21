import type { CardStack, FinancialCard } from '../core/types';

/**
 * Generates simple names for card stacks based on the first card
 */
export function generateStackName(stack: CardStack): string {
  if (!stack.cards || stack.cards.length === 0) {
    return 'Empty Stack';
  }

  // Use custom name if provided (e.g., from deck)
  if (stack.name) {
    return stack.name;
  }

  if (stack.cards.length === 1) {
    return stack.cards[0].name;
  }

  const primaryCard = stack.cards[0];
  return `${primaryCard.name} Stack`;
}

/**
 * Get a shorter version of the stack name for display in constrained spaces
 */
export function getShortStackName(stack: CardStack): string {
  const fullName = generateStackName(stack);
  
  // If name is already short, return as-is
  if (fullName.length <= 25) {
    return fullName;
  }
  
  // For longer names, show abbreviated version with card count
  const primaryName = stack.cards[0].name;
  const cardCount = stack.cards.length;
  
  if (primaryName.length > 15) {
    const shortPrimary = primaryName.substring(0, 12) + '...';
    return `${shortPrimary} Stack`;
  }
  
  return fullName;
}