import { carTcoDeck } from './decks';
import { incomeCards as legacyIncomeCards, expenseCards as legacyExpenseCards, investmentCards as legacyInvestmentCards, effectCards as legacyEffectCards } from './cards';
import { allUnifiedCards, incomeCards, expenseCards, investmentCards, effectCards, taxCards, carCards } from './unified-cards';

export const allDecks = [carTcoDeck];

// Individual cards for the main game - now using unified curve-based cards
// This showcases the mathematical philosophy: all finance is curves f(x)
export const allIndividualCards = [
  // === INCOME CURVES (Positive Linear) ===
  // Basic salary - mathematical linear curve
  incomeCards.find(card => card.id === 'monthly-salary')!,
  
  // === EXPENSE CURVES (Negative Linear) ===  
  // Basic living expenses - negative linear function  
  expenseCards.find(card => card.id === 'living-expenses')!,
  
  // === INVESTMENT CURVES (Positive Compound) ===
  // Investment account - compound growth curve
  investmentCards.find(card => card.id === 'isk-account')!,
  
  // === TAX CURVES (Negative Compound) ===
  // Income tax - negative compound interest on income
  taxCards.find(card => card.id === 'income-tax')!,
  
  // === EFFECT CURVES (Various Mathematical Functions) ===
  // Swedish inflation effect - negative compound (universal erosion)
  effectCards.find(card => card.id === 'inflation-sweden')!,
  // Annual bonus - sinusoidal income boost (periodic function)  
  effectCards.find(card => card.id === 'annual-bonus')!,
  
  // === COMPLEX ASSET CURVES (Multi-component) ===
  // Car asset - depreciating value (demonstrates curve composition)
  carCards.find(card => card.id === 'car-asset')!,
  // Car depreciation - negative exponential (shows curve stacking)
  carCards.find(card => card.id === 'car-depreciation')!
];

// Legacy cards still available for backward compatibility
export const legacyIndividualCards = [
  // Basic salary
  legacyIncomeCards.find(card => card.id === 'monthly-salary')!,
  // Basic living expenses  
  legacyExpenseCards.find(card => card.id === 'living-expenses')!,
  // Investment account
  legacyInvestmentCards.find(card => card.id === 'isk-account')!,
  // ISK tax effect
  legacyEffectCards.find(card => card.id === 'isk-tax')!
];

// Export unified cards for the new mathematical model
export { allUnifiedCards };
