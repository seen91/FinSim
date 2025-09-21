import type { UnifiedCard, CurveFunction } from '../core/types';

/**
 * Unified Card Definitions using the new curve-based model
 * 
 * All financial instruments are now mathematical curves f(t).
 * This demonstrates the philosophical shift where:
 * - Tax is just negative compound interest  
 * - Salary is linear growth
 * - Investments are positive compound curves
 * - All curves can be combined and transformed
 */

// Income Cards - Linear growth functions
export const incomeCards: UnifiedCard[] = [
  {
    id: 'monthly-salary',
    name: 'Salary',
    description: '39k monthly salary - linear income growth',
    color: '#22c55e',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,          // No initial lump sum
        rate: 39000 * 12,      // 468k annually (39k monthly)
        frequency: 0,          // Not applicable for linear
        phase: 0,              // No phase shift
        offset: 0              // No baseline offset
      },
      isPositive: true,        // This adds value (income)
      isDifferentiable: true,  // Linear functions are differentiable
      domain: [2025, 2045]     // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Monthly gross salary of 39,000, forming the foundation of personal income.',
      timeCommitment: 'Full-time employment',
      mathematicalForm: 'f(t) = 468,000 * t (linear income growth)'
    },
    canBeStacked: true,
    canStackOnto: [],          // Base income card
    stackingMultiplier: 1
  }
];

// Expense Cards - Negative linear functions
export const expenseCards: UnifiedCard[] = [
  {
    id: 'living-expenses',
    name: 'Basic Living Expenses',
    description: 'Monthly living costs - negative linear function',
    color: '#ef4444',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,           // No initial cost
        rate: -15000 * 12,      // -180k annually (15k monthly expense)
        frequency: 0,           // Not applicable
        phase: 0,               // No phase shift  
        offset: 0               // No baseline
      },
      isPositive: false,        // This subtracts value (expense)
      isDifferentiable: true,   // Linear functions are differentiable
      domain: [2025, 2045]      // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Basic monthly living expenses including food, utilities, rent, and necessities totaling 15,000.',
      timeCommitment: 'Ongoing living costs',
      mathematicalForm: 'f(t) = -180,000 * t (linear expense growth)'
    },
    canBeStacked: true,
    canStackOnto: ['monthly-salary'], // Can stack on salary
    stackingMultiplier: 1
  }
];

// Investment Cards - Compound growth functions (the physicist's compound interest)
export const investmentCards: UnifiedCard[] = [
  {
    id: 'isk-account',
    name: 'ISK Investment Account',
    description: '7% compound growth - like positive exponential physics',
    color: '#06b6d4',
    curve: {
      type: 'compound',
      parameters: {
        amplitude: 0,           // No initial principal (gets from stacking)
        rate: 0.07,            // 7% annual return
        frequency: 0,           // Annual compounding
        phase: 0,               // No phase shift
        offset: 0               // No baseline
      },
      isPositive: true,         // This adds value
      isDifferentiable: true,   // Exponential functions are differentiable  
      domain: [2025, 2045]      // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Investeringssparkonto (ISK) - Swedish tax-advantaged investment account with 7% compound growth. Designed to transform whatever value it receives through stacking.',
      timeCommitment: '15+ years for compound growth',
      mathematicalForm: 'f(t) = A * (1.07)^t where A comes from stacking'
    },
    canBeStacked: true,
    canStackOnto: ['monthly-salary', 'annual-bonus'], // Can transform income into growth
    stackingMultiplier: 1.07  // 7% growth multiplier per year
  }
];

// Tax Cards - Negative compound functions (like negative physics equations)
export const taxCards: UnifiedCard[] = [
  {
    id: 'income-tax',
    name: 'Swedish Income Tax',
    description: '~30% tax - negative percentage of income curve',
    color: '#dc2626',
    curve: {
      type: 'custom',  // Custom formula to apply percentage to base income
      parameters: {
        amplitude: 1,           // Multiplier base
        rate: -0.30,           // 30% tax rate (negative)
        frequency: 0,
        phase: 0,
        offset: 0,
        formula: 'A * r * income_base' // Where income_base comes from stacking
      },
      isPositive: false,        // This subtracts value (tax)
      isDifferentiable: false,  // Custom formula dependency
      domain: [2025, 2045]      // 20 year timeframe  
    },
    detailedInfo: {
      strategy: 'Swedish progressive income tax, approximately 30% effective rate on salary.',
      timeCommitment: 'While earning income',
      mathematicalForm: 'f(t) = -0.30 * base_income(t) (tax as negative compound function)'
    },
    canBeStacked: true,
    canStackOnto: ['monthly-salary'], // Applies to income
    stackingMultiplier: 0.70  // Leaves 70% of income after tax
  }
];

// Effect Cards - Mathematical transformations (like operators in physics)
export const effectCards: UnifiedCard[] = [
  {
    id: 'inflation-sweden',
    name: 'Swedish Inflation',
    description: '2% value erosion - like entropy in physics',
    color: '#f59e0b',
    curve: {
      type: 'compound',
      parameters: {
        amplitude: 1,           // Base multiplier
        rate: -0.02,           // 2% annual erosion (negative compound)
        frequency: 0,
        phase: 0, 
        offset: 0
      },
      isPositive: false,        // This reduces value over time
      isDifferentiable: true,   // Exponential functions are differentiable
      domain: [2025, 2045]      // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Inflation reduces the purchasing power of money over time, Swedish target is 2%.',
      timeCommitment: 'Ongoing economic effect',
      mathematicalForm: 'f(t) = (0.98)^t (compound value erosion)'
    },
    canBeStacked: true,
    canStackOnto: ['monthly-salary', 'living-expenses', 'isk-account'], // Affects everything
    stackingMultiplier: 0.98  // 2% annual erosion
  },
  
  {
    id: 'annual-bonus',
    name: 'Annual Performance Bonus', 
    description: '30k annual bonus - sinusoidal yearly peak',
    color: '#059669',
    curve: {
      type: 'sinusoidal',
      parameters: {
        amplitude: 30000,       // 30k bonus amount
        rate: 0,               // No growth rate
        frequency: 1,          // Once per year 
        phase: 0,              // Peak at year start
        offset: 30000          // Baseline bonus amount
      },
      isPositive: true,         // This adds value
      isDifferentiable: true,   // Sinusoidal functions are differentiable
      domain: [2025, 2045]      // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Annual performance bonus creating periodic income spikes.',
      timeCommitment: 'While employed with good performance', 
      mathematicalForm: 'f(t) = 30000 * sin(2π * t) + 30000 (annual bonus cycle)'
    },
    canBeStacked: true,
    canStackOnto: ['monthly-salary'], // Adds to base income
    stackingMultiplier: 1
  }
];

// Car-related cards demonstrating complex curve interactions
export const carCards: UnifiedCard[] = [
  {
    id: 'car-asset',
    name: 'Car Asset Value',
    description: '120k initial value - constant baseline',
    color: '#3b82f6', 
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 120000,      // 120k initial value
        rate: 0,               // No additional growth
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: true,         // Asset has value
      isDifferentiable: true,   // Linear (constant) function
      domain: [2025, 2045]      // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Car as a depreciating asset worth 120,000 initially.',
      timeCommitment: 'Asset subject to depreciation effects',
      mathematicalForm: 'f(t) = 120,000 (constant asset value before depreciation)'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'car-depreciation',
    name: 'Car Depreciation (14%)',
    description: '14% annual value loss - negative compound physics',
    color: '#ef4444',
    curve: {
      type: 'compound', 
      parameters: {
        amplitude: 1,           // Multiplier base
        rate: -0.14,           // 14% annual depreciation (negative compound)
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,        // This reduces value
      isDifferentiable: true,   // Exponential functions are differentiable  
      domain: [2025, 2045]      // 20 year timeframe
    },
    detailedInfo: {
      strategy: 'Annual 14% depreciation that compounds yearly, reducing asset value exponentially.',
      timeCommitment: 'Ongoing depreciation effect',
      mathematicalForm: 'f(t) = (0.86)^t (compound value depreciation)'
    },
    canBeStacked: true,
    canStackOnto: ['car-asset'], // Depreciates the car asset
    stackingMultiplier: 0.86  // 14% annual depreciation
  }
];

// Combined export - all cards as unified mathematical curves
export const allUnifiedCards: UnifiedCard[] = [
  ...incomeCards,
  ...expenseCards, 
  ...investmentCards,
  ...taxCards,
  ...effectCards,
  ...carCards
];

/**
 * Migration helper: Convert a legacy card definition to unified format
 * This allows gradual migration of existing cards
 */
export function migrateCardToUnified(legacyCard: any): UnifiedCard {
  // This would contain the conversion logic from the old format
  // Implementation depends on the specific legacy structure
  console.warn('Legacy card migration not fully implemented yet:', legacyCard.id);
  
  // Return a placeholder for now
  return {
    id: legacyCard.id,
    name: legacyCard.name,
    description: legacyCard.description || 'Migrated from legacy format',
    color: legacyCard.color,
    curve: {
      type: 'linear',
      parameters: { amplitude: 0, rate: 0, frequency: 0, phase: 0, offset: 0 },
      isPositive: true,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  };
}