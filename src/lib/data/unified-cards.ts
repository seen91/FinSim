import type { UnifiedCard } from '../core/types';

/**
 * Simplified Card Definitions
 * 
 * Individual Cards: Salary, Expenses, Investment Fund (7%), Investment Bank (2%)
 * Deck: Cheap Car with all related expenses
 */

// Individual Cards
export const individualCards: UnifiedCard[] = [
  {
    id: 'salary',
    name: 'Salary',
    description: 'Monthly salary income',
    color: '#22c55e',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: 39000 * 12,      // $39k monthly = $468k annually
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: true,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual salary income providing steady financial foundation.',
      mathematicalForm: 'f(t) = 468,000 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Monthly living expenses',
    color: '#ef4444',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -15000 * 12,     // -$15k monthly = -$180k annually
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Basic living expenses including housing, food, utilities, and necessities.',
      mathematicalForm: 'f(t) = -180,000 * t'
    },
    canBeStacked: true,
    canStackOnto: ['salary'],
    stackingMultiplier: 1
  },
  
  {
    id: 'investment-fund',
    name: 'Investment Fund',
    description: '7% compound growth investment',
    color: '#06b6d4',
    curve: {
      type: 'compound',
      parameters: {
        amplitude: 0,
        rate: 0.07,            // 7% annual return
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: true,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'High-growth investment fund with 7% expected annual compound returns.',
      mathematicalForm: 'f(t) = A * (1.07)^t'
    },
    canBeStacked: true,
    canStackOnto: ['salary'],
    stackingMultiplier: 1.07
  },
  
  {
    id: 'investment-bank',
    name: 'Investment Bank',
    description: '2% compound growth investment',
    color: '#8b5cf6',
    curve: {
      type: 'compound',
      parameters: {
        amplitude: 0,
        rate: 0.02,            // 2% annual return
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: true,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Conservative bank investment with 2% expected annual compound returns.',
      mathematicalForm: 'f(t) = A * (1.02)^t'
    },
    canBeStacked: true,
    canStackOnto: ['salary'],
    stackingMultiplier: 1.02
  }
];

// Cheap Car Deck Cards
export const cheapCarCards: UnifiedCard[] = [
  {
    id: 'purchase-price',
    name: 'Purchase Price',
    description: 'Initial car purchase cost',
    color: '#3b82f6',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 120000,     // $120,000 initial cost
        rate: 0,
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,       // This is a cost
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Initial purchase price of the vehicle.',
      mathematicalForm: 'f(t) = -120,000'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'depreciation',
    name: 'Depreciation (14%)',
    description: '14% annual value loss',
    color: '#ef4444',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -16800,          // -$16,800 annual depreciation
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual 14% depreciation of vehicle value.',
      mathematicalForm: 'f(t) = -16,800 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Annual vehicle insurance',
    color: '#f59e0b',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -1920,           // -$1,920 annual insurance
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual vehicle insurance premium.',
      mathematicalForm: 'f(t) = -1,920 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'tax',
    name: 'Tax',
    description: 'Annual vehicle tax',
    color: '#dc2626',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -360,            // -$360 annual tax
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual vehicle registration tax.',
      mathematicalForm: 'f(t) = -360 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'fuel',
    name: 'Fuel',
    description: 'Annual fuel costs',
    color: '#059669',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -1560,           // -$1,560 annual fuel
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual fuel consumption costs.',
      mathematicalForm: 'f(t) = -1,560 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'service',
    name: 'Service',
    description: 'Annual maintenance and service',
    color: '#7c3aed',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -5040,           // -$5,040 annual service
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual vehicle maintenance and service costs.',
      mathematicalForm: 'f(t) = -5,040 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'winter-tires',
    name: 'Winter Tires',
    description: 'Annual winter tire costs',
    color: '#0891b2',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -3600,           // -$3,600 annual winter tires
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual winter tire replacement and storage costs.',
      mathematicalForm: 'f(t) = -3,600 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'opportunity-cost',
    name: 'Opportunity Cost',
    description: 'Annual opportunity cost of capital',
    color: '#be185d',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -6000,           // -$6,000 annual opportunity cost
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual opportunity cost of capital tied up in vehicle ownership.',
      mathematicalForm: 'f(t) = -6,000 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'parking',
    name: 'Parking',
    description: 'Annual parking costs',
    color: '#65a30d',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -9600,           // -$9,600 annual parking
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual parking fees and permits.',
      mathematicalForm: 'f(t) = -9,600 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'tire-change',
    name: 'Tire Change',
    description: 'Annual tire change service',
    color: '#c2410c',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -540,            // -$540 annual tire change
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual tire change service costs.',
      mathematicalForm: 'f(t) = -540 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'miscellaneous',
    name: 'Miscellaneous',
    description: 'Annual miscellaneous car expenses',
    color: '#7c2d12',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -3000,           // -$3,000 annual miscellaneous
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual miscellaneous vehicle-related expenses.',
      mathematicalForm: 'f(t) = -3,000 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  },
  
  {
    id: 'financing',
    name: 'Financing',
    description: 'Annual financing costs',
    color: '#991b1b',
    curve: {
      type: 'linear',
      parameters: {
        amplitude: 0,
        rate: -1788,           // -$1,788 annual financing
        frequency: 0,
        phase: 0,
        offset: 0
      },
      isPositive: false,
      isDifferentiable: true,
      domain: [2025, 2045]
    },
    detailedInfo: {
      strategy: 'Annual vehicle financing interest and fees.',
      mathematicalForm: 'f(t) = -1,788 * t'
    },
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  }
];

// Combined export
export const allUnifiedCards: UnifiedCard[] = [
  ...individualCards,
  ...cheapCarCards
];