import type { FinancialCard } from '../core/types';

export const investmentCards: FinancialCard[] = [
  {
    id: 'vtsax',
    name: 'VTSAX Total Market',
    type: 'compound',
    parameters: { principal: 10000, rate: 8.5 },
    timeRange: [2025, 2045],
    color: '#06b6d4',
    description: 'Total stock market index',
    detailedInfo: {
      strategy: 'Complete US stock market exposure through a single low-cost index fund.',
      timeCommitment: '15+ years'
    },
    role: 'base',
    stackCategory: 'investment',
    canBeStacked: true,
    canStack: false
  }
];

export const incomeCards: FinancialCard[] = [
  {
    id: 'salary',
    name: 'Primary Salary',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: 7000 },
    timeRange: [2025, 2045],
    color: '#22c55e',
    description: 'Monthly income',
    detailedInfo: {
      strategy: 'Primary income source from employment, forming the foundation of financial planning.',
      timeCommitment: '20 years until retirement'
    },
    role: 'base',
    stackCategory: 'income',
    canBeStacked: true,
    canStack: false
  }
];

export const expenseCards: FinancialCard[] = [
  {
    id: 'mortgage',
    name: 'Mortgage Payment',
    type: 'linear',
    parameters: { principal: -300000, monthlyAmount: -1200 },
    timeRange: [2025, 2055],
    color: '#ef4444',
    description: 'Home loan payment',
    detailedInfo: {
      strategy: 'Fixed monthly payment towards homeownership, building equity while providing housing.',
      timeCommitment: '30 years'
    },
    role: 'base',
    stackCategory: 'expense',
    canBeStacked: true,
    canStack: false
  }
];

// New tax and modifier cards that can be stacked on income
export const taxCards: FinancialCard[] = [
  {
    id: 'federal-tax',
    name: 'Federal Income Tax',
    type: 'linear',
    parameters: { principal: 0, rate: -22 },
    timeRange: [2025, 2045],
    color: '#dc2626',
    description: '-22% federal tax rate',
    detailedInfo: {
      strategy: 'Federal income tax reduces your take-home income. Rate varies by tax bracket.',
      timeCommitment: 'Ongoing while employed'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: 22,
      description: '-22% federal tax'
    }]
  },
  {
    id: 'state-tax',
    name: 'State Income Tax',
    type: 'linear',
    parameters: { principal: 0, rate: -8 },
    timeRange: [2025, 2045],
    color: '#b91c1c',
    description: '-8% state tax rate',
    detailedInfo: {
      strategy: 'State income tax varies by state. Some states have no income tax.',
      timeCommitment: 'Ongoing while employed'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: 8,
      description: '-8% state tax'
    }]
  },
  {
    id: 'fica-tax',
    name: 'FICA Tax',
    type: 'linear',
    parameters: { principal: 0, rate: -7.65 },
    timeRange: [2025, 2045],
    color: '#991b1b',
    description: 'Social Security & Medicare',
    detailedInfo: {
      strategy: 'Social Security (6.2%) and Medicare (1.45%) taxes. Required for most employment.',
      timeCommitment: 'Ongoing while employed'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: 7.65,
      description: '-7.65% FICA taxes'
    }]
  }
];

// Bonus cards that can enhance income or investments
export const bonusCards: FinancialCard[] = [
  {
    id: 'employer-match',
    name: '401k Employer Match',
    type: 'linear',
    parameters: { principal: 0, rate: 50 },
    timeRange: [2025, 2045],
    color: '#16a34a',
    description: '+50% match on contributions',
    detailedInfo: {
      strategy: 'Employer matches 50% of your 401k contributions up to a limit. Free money!',
      timeCommitment: 'While employed and contributing'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'percentage',
      value: -50, // Negative percentage means bonus
      description: '+50% employer match'
    }]
  },
  {
    id: 'annual-bonus',
    name: 'Annual Performance Bonus',
    type: 'linear',
    parameters: { principal: 0, monthlyAmount: 800 },
    timeRange: [2025, 2045],
    color: '#059669',
    description: 'Performance-based bonus',
    detailedInfo: {
      strategy: 'Annual bonus based on performance, averaged monthly for planning purposes.',
      timeCommitment: 'While employed with good performance'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'add',
      value: 9600, // $800 * 12 months
      description: '+$9,600 annual bonus'
    }]
  }
];
