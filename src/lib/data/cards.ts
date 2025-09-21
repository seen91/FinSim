import type { FinancialCard } from '../core/types';

// Base Income Cards for Swedish Financial Context
export const incomeCards: FinancialCard[] = [
  {
    id: 'monthly-salary',
    name: 'Monthly Salary',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: 35000 },
    timeRange: [2025, 2045],
    color: '#22c55e',
    description: 'Monthly gross salary income',
    detailedInfo: {
      strategy: 'Monthly gross salary of 35,000 SEK, forming the foundation of personal income in Sweden.',
      timeCommitment: 'Full-time employment'
    },
    role: 'base',
    stackCategory: 'income',
    canBeStacked: true,
    canStack: false
  }
];

// Base Expense Cards for Swedish Living Costs
export const expenseCards: FinancialCard[] = [
  {
    id: 'living-expenses',
    name: 'Basic Living Expenses',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -18000 },
    timeRange: [2025, 2045],
    color: '#ef4444',
    description: 'Monthly living costs',
    detailedInfo: {
      strategy: 'Basic monthly living expenses including food, utilities, rent, and necessities totaling 18,000 SEK.',
      timeCommitment: 'Ongoing living costs'
    },
    role: 'base',
    stackCategory: 'expense',
    canBeStacked: true,
    canStack: false
  }
];

// Swedish Tax System Cards
export const taxCards: FinancialCard[] = [
];

// Investment Cards for Swedish Context
export const investmentCards: FinancialCard[] = [
  {
    id: 'isk-account',
    name: 'ISK Investment Account',
    type: 'compound',
    parameters: { principal: 10000, rate: 7 },
    timeRange: [2025, 2045],
    color: '#06b6d4',
    description: 'Swedish ISK account with 1% annual tax',
    detailedInfo: {
      strategy: 'Investeringssparkonto (ISK) - Swedish tax-advantaged investment account with 1% annual standard tax.',
      timeCommitment: '15+ years for compound growth'
    },
    role: 'base',
    stackCategory: 'investment',
    canBeStacked: true,
    canStack: false
  }
];

// Car Asset and Depreciation Cards
export const carCards: FinancialCard[] = [
  {
    id: 'car-asset',
    name: 'Car Asset Value',
    type: 'compound',
    parameters: { principal: 120000, rate: 0 },
    timeRange: [2025, 2045],
    color: '#3b82f6',
    description: 'Car as depreciating asset',
    detailedInfo: {
      strategy: 'Car as a depreciating asset worth 120,000 SEK initially, subject to depreciation effects.',
      timeCommitment: 'Asset subject to market forces'
    },
    role: 'base',
    stackCategory: 'investment',
    canBeStacked: true,
    canStack: false
  },
  {
    id: 'car-depreciation',
    name: 'Car Depreciation (14%)',
    type: 'linear',
    parameters: { principal: 0, rate: -14 },
    timeRange: [2025, 2045],
    color: '#ef4444',
    description: '14% annual depreciation',
    detailedInfo: {
      strategy: 'Annual 14% depreciation that compounds yearly, significantly reducing car value over time.',
      timeCommitment: 'Ongoing depreciation effect'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'percentage',
      value: 14,
      description: 'Car loses 14% of its value annually'
    }]
  }
];

// Car Operating Expense Cards
export const carExpenseCards: FinancialCard[] = [
  {
    id: 'car-insurance',
    name: 'Car Insurance',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -160 },
    timeRange: [2025, 2045],
    color: '#f59e0b',
    role: 'base',
    description: 'Monthly car insurance premium',
    detailedInfo: {
      strategy: 'Comprehensive car insurance coverage (1,920 SEK annually)',
      timeCommitment: 'Required for legal driving'
    }
  },
  {
    id: 'car-tax',
    name: 'Vehicle Tax',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -30 },
    timeRange: [2025, 2045],
    color: '#f97316',
    role: 'base',
    description: 'Annual vehicle registration tax',
    detailedInfo: {
      strategy: 'Annual vehicle registration tax (360 SEK annually)',
      timeCommitment: 'Required for legal ownership'
    }
  },
  {
    id: 'car-fuel',
    name: 'Fuel Costs',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -130 },
    timeRange: [2025, 2045],
    color: '#ea580c',
    role: 'base',
    description: 'Monthly gasoline costs',
    detailedInfo: {
      strategy: 'Gasoline or diesel fuel costs based on usage (1,560 SEK annually)',
      timeCommitment: 'Ongoing based on driving distance'
    }
  },
  {
    id: 'car-service',
    name: 'Service & Maintenance',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -420 },
    timeRange: [2025, 2045],
    color: '#d97706',
    role: 'base',
    description: 'Monthly service and repair costs',
    detailedInfo: {
      strategy: 'Regular service, repairs, and maintenance costs (5,040 SEK annually)',
      timeCommitment: 'Ongoing maintenance required'
    }
  },
  {
    id: 'winter-tires',
    name: 'Winter Tires',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -300 },
    timeRange: [2025, 2045],
    color: '#0ea5e9',
    role: 'base',
    description: 'Winter tire costs',
    detailedInfo: {
      strategy: 'Winter tire purchase and replacement costs (3,600 SEK annually)',
      timeCommitment: 'Required for winter driving safety'
    }
  },
  {
    id: 'parking',
    name: 'Parking Costs',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -800 },
    timeRange: [2025, 2045],
    color: '#6b7280',
    role: 'base',
    description: 'Monthly parking fees',
    detailedInfo: {
      strategy: 'Monthly parking fees, garage rental, or parking permits (9,600 SEK annually)',
      timeCommitment: 'Required for secure parking'
    }
  },
  {
    id: 'opportunity-cost',
    name: 'Opportunity Cost',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -500 },
    timeRange: [2025, 2045],
    color: '#8b5cf6',
    role: 'base',
    description: 'Investment opportunity cost',
    detailedInfo: {
      strategy: 'Opportunity cost of capital tied up in car instead of investments (6,000 SEK annually)',
      timeCommitment: 'Ongoing while owning car'
    }
  },
  {
    id: 'tire-change',
    name: 'Tire Changes',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -45 },
    timeRange: [2025, 2045],
    color: '#06b6d4',
    role: 'base',
    description: 'Tire changing service costs',
    detailedInfo: {
      strategy: 'Seasonal tire changes and mounting costs (540 SEK annually)',
      timeCommitment: 'Twice yearly service'
    }
  },
  {
    id: 'miscellaneous-costs',
    name: 'Miscellaneous Costs',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -250 },
    timeRange: [2025, 2045],
    color: '#84cc16',
    role: 'base',
    description: 'Small car-related expenses',
    detailedInfo: {
      strategy: 'Various small costs like car wash, accessories, minor repairs (3,000 SEK annually)',
      timeCommitment: 'Ongoing small expenses'
    }
  },
  {
    id: 'financing-cost',
    name: 'Financing Cost',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: -149 },
    timeRange: [2025, 2045],
    color: '#f43f5e',
    role: 'base',
    description: 'Car loan interest costs',
    detailedInfo: {
      strategy: 'Interest payments on car financing or loan (1,788 SEK annually)',
      timeCommitment: 'While loan is active'
    }
  }
];

// Swedish Financial Modifier Cards
export const bonusCards: FinancialCard[] = [
  {
    id: 'annual-bonus',
    name: 'Annual Performance Bonus',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: 2500 },
    timeRange: [2025, 2045],
    color: '#059669',
    description: 'Performance-based bonus',
    detailedInfo: {
      strategy: 'Annual bonus of 30,000 SEK based on performance, averaged monthly for planning purposes.',
      timeCommitment: 'While employed with good performance'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'add',
      value: 30000,
      description: '+30,000 SEK annual bonus'
    }]
  },
  {
    id: 'salary-raise',
    name: 'Annual Salary Raise',
    type: 'linear',
    parameters: { principal: 0, rate: 2.5 },
    timeRange: [2025, 2045],
    color: '#10b981',
    description: '2.5% annual raise',
    detailedInfo: {
      strategy: 'Regular cost-of-living and performance raises compound over time, typical in Sweden.',
      timeCommitment: 'While employed'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: -2.5,
      description: '+2.5% annual salary raise'
    }]
  },
  {
    id: 'inflation-sweden',
    name: 'Swedish Inflation',
    type: 'linear',
    parameters: { principal: 0, rate: 2 },
    timeRange: [2025, 2045],
    color: '#f59e0b',
    description: '2% inflation erosion',
    detailedInfo: {
      strategy: 'Inflation reduces the purchasing power of fixed income over time, Swedish target is 2%.',
      timeCommitment: 'Ongoing economic effect'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income', 'expense'],
    stackEffects: [{
      type: 'percentage',
      value: 2,
      description: '-2% inflation erosion on income / +2% cost increase on expenses'
    }]
  },
  {
    id: 'isk-tax',
    name: 'ISK Standard Tax',
    type: 'linear',
    parameters: { principal: 0, rate: 1 },
    timeRange: [2025, 2045],
    color: '#dc2626',
    description: '1% annual standard tax',
    detailedInfo: {
      strategy: 'Swedish ISK accounts have 1% annual standard tax on the account value regardless of performance.',
      timeCommitment: 'While invested in ISK account'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'percentage',
      value: 1,
      description: '-1% ISK standard tax'
    }]
  },
  {
    id: 'cost-inflation',
    name: 'Living Cost Inflation',
    type: 'linear',
    parameters: { principal: 0, rate: 2.5 },
    timeRange: [2025, 2045],
    color: '#dc2626',
    description: '2.5% annual cost increase',
    detailedInfo: {
      strategy: 'Living expenses typically grow slightly faster than general inflation due to lifestyle improvements.',
      timeCommitment: 'Ongoing for most living expenses'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['expense'],
    stackEffects: [{
      type: 'percentage',
      value: -2.5,
      description: '+2.5% annual cost inflation'
    }]
  }
];

// Combined export of all cards
export const allCards: FinancialCard[] = [
  ...incomeCards,
  ...expenseCards,
  ...taxCards,
  ...investmentCards,
  ...carCards,
  ...carExpenseCards,
  ...bonusCards
];
