// Re-export core functionality
export * from './core';
export * from './data';
export * from './services';

// Legacy exports for backward compatibility with old imports
export { gameState, projections, addCardToHand, addDeckToHand, toggleCard, removeCardFromHand } from './core/stores';
export { calculateProjections } from './core/calculations';