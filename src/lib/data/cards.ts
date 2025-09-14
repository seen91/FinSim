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
  },
  {
    id: 'salary-raise',
    name: 'Annual Salary Raise',
    type: 'linear',
    parameters: { principal: 0, rate: 3 },
    timeRange: [2025, 2045],
    color: '#10b981',
    description: '+3% annual raise',
    detailedInfo: {
      strategy: 'Regular cost-of-living and performance raises compound over time.',
      timeCommitment: 'While employed'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: -3, // Negative percentage means bonus
      description: '+3% annual salary raise'
    }]
  },
  {
    id: 'overtime-pay',
    name: 'Overtime Premium',
    type: 'linear',
    parameters: { principal: 0, rate: 15 },
    timeRange: [2025, 2045],
    color: '#16a34a',
    description: '+15% overtime bonus',
    detailedInfo: {
      strategy: 'Time-and-a-half overtime premium for extra hours worked.',
      timeCommitment: 'When working overtime hours'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: -15, // Negative percentage means bonus
      description: '+15% overtime premium'
    }]
  },
  {
    id: 'inflation-drag',
    name: 'Inflation Impact',
    type: 'linear',
    parameters: { principal: 0, rate: 2.5 },
    timeRange: [2025, 2045],
    color: '#f59e0b',
    description: '-2.5% inflation erosion',
    detailedInfo: {
      strategy: 'Inflation reduces the purchasing power of fixed income over time.',
      timeCommitment: 'Ongoing economic effect'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['income'],
    stackEffects: [{
      type: 'percentage',
      value: 2.5,
      description: '-2.5% inflation erosion'
    }]
  },
  {
    id: 'investment-fee',
    name: 'Management Fees',
    type: 'linear',
    parameters: { principal: 0, rate: 0.75 },
    timeRange: [2025, 2045],
    color: '#dc2626',
    description: '-0.75% annual fee',
    detailedInfo: {
      strategy: 'Investment management fees reduce your returns annually.',
      timeCommitment: 'While invested'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'percentage',
      value: 0.75,
      description: '-0.75% management fees'
    }]
  },
  {
    id: 'tax-advantaged-growth',
    name: 'Tax-Advantaged Account',
    type: 'linear',
    parameters: { principal: 0, rate: 25 },
    timeRange: [2025, 2045],
    color: '#10b981',
    description: '+25% tax advantage',
    detailedInfo: {
      strategy: 'Tax-advantaged accounts like 401k or IRA boost effective returns by deferring taxes.',
      timeCommitment: 'While invested in tax-advantaged accounts'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'percentage',
      value: -25, // Negative percentage means bonus
      description: '+25% tax advantage boost'
    }]
  },
  {
    id: 'market-volatility',
    name: 'Market Volatility',
    type: 'linear',
    parameters: { principal: 0, rate: 15 },
    timeRange: [2025, 2045],
    color: '#f97316',
    description: '±15% volatility risk',
    detailedInfo: {
      strategy: 'Market volatility can reduce effective returns through timing and psychological effects.',
      timeCommitment: 'While invested in volatile assets'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'percentage',
      value: 15,
      description: '-15% volatility drag'
    }]
  },
  {
    id: 'cost-inflation',
    name: 'Expense Inflation',
    type: 'linear',
    parameters: { principal: 0, rate: 3 },
    timeRange: [2025, 2045],
    color: '#dc2626',
    description: '+3% annual cost increase',
    detailedInfo: {
      strategy: 'Most expenses grow with inflation over time, increasing costs.',
      timeCommitment: 'Ongoing for most living expenses'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['expense'],
    stackEffects: [{
      type: 'percentage',
      value: -3, // Negative means it increases the expense (makes it more negative)
      description: '+3% annual cost inflation'
    }]
  },
  {
    id: 'bulk-discount',
    name: 'Bulk Purchase Savings',
    type: 'linear',
    parameters: { principal: 0, rate: 8 },
    timeRange: [2025, 2045],
    color: '#16a34a',
    description: '-8% bulk savings',
    detailedInfo: {
      strategy: 'Buying in bulk or negotiating better rates can reduce ongoing expenses.',
      timeCommitment: 'With careful shopping and negotiation'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['expense'],
    stackEffects: [{
      type: 'percentage',
      value: 8, // Positive percentage reduces the expense
      description: '-8% bulk purchase savings'
    }]
  },
  {
    id: 'lifestyle-creep',
    name: 'Lifestyle Creep',
    type: 'linear',
    parameters: { principal: 0, rate: 5 },
    timeRange: [2025, 2045],
    color: '#ef4444',
    description: '+5% lifestyle increase',
    detailedInfo: {
      strategy: 'As income grows, expenses tend to grow too through lifestyle inflation.',
      timeCommitment: 'Natural tendency over time'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['expense'],
    stackEffects: [{
      type: 'percentage',
      value: -5, // Negative means it increases the expense
      description: '+5% lifestyle creep'
    }]
  }
];

// Loan cards for borrowing against assets or traditional loans
export const loanCards: FinancialCard[] = [
  {
    id: 'personal-loan',
    name: 'Personal Loan',
    type: 'loan',
    parameters: { principal: 10000, rate: 5, loanTerm: 10 },
    timeRange: [2025, 2035],
    color: '#ea580c',
    description: 'Personal loan example',
    detailedInfo: {
      strategy: 'Example: $10k initial loan with 5% interest over 10 years. Traditional unsecured personal loan.',
      timeCommitment: '10 years fixed term'
    },
    role: 'base',
    stackCategory: 'loan',
    canBeStacked: true,
    canStack: false
  },
  {
    id: 'margin-loan-monthly',
    name: 'Margin Loan (Monthly)',
    type: 'loan',
    parameters: { principal: 0, rate: 2, monthlyAmount: -1000, loanTerm: 100 }, // Very long term to simulate no payback
    timeRange: [2025, 2045],
    color: '#f59e0b',
    description: 'Margin loan with monthly draws',
    detailedInfo: {
      strategy: 'Example: $1k monthly borrowing with 2% interest rate. Borrowed money grows at same rate as underlying asset, creating 6.5% net spread (8.5% - 2%).',
      timeCommitment: 'Ongoing - no fixed payback schedule'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment', 'income'],
    stackEffects: [{
      type: 'custom',
      formula: 'baseValue + (12000 * t * 0.065)', // $12k borrowed per year earning 6.5% spread (8.5% investment - 2% loan cost)
      description: '$1k monthly borrowing creating 6.5% annual spread'
    }]
  },
  {
    id: 'margin-loan-percentage',
    name: 'Margin Loan (4% Annual)',
    type: 'loan',
    parameters: { principal: 0, rate: 2, loanTerm: 100 },
    timeRange: [2025, 2045],
    color: '#f97316',
    description: 'Borrows 4% of asset value annually',
    detailedInfo: {
      strategy: 'Borrows 4% of the underlying asset value each year at 2% interest rate. The borrowed amount is invested at the same rate as the underlying asset, creating leverage.',
      timeCommitment: 'Ongoing - percentage-based borrowing'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment'],
    stackEffects: [{
      type: 'custom',
      formula: 'baseValue + (baseValue * 0.04 * t * (0.085 - 0.02))', // Each year borrows 4% of base value, earns 6.5% spread
      description: 'Borrows 4% annually, earning 6.5% spread (8.5% investment return - 2% loan cost)'
    }]
  },
  {
    id: 'low-interest-rate',
    name: 'Excellent Credit Rate',
    type: 'linear',
    parameters: { principal: 0, rate: 2 },
    timeRange: [2025, 2045],
    color: '#10b981',
    description: '-2% interest rate discount',
    detailedInfo: {
      strategy: 'Excellent credit score reduces loan interest rates significantly.',
      timeCommitment: 'By maintaining excellent credit'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['loan'],
    stackEffects: [{
      type: 'percentage',
      value: 20, // Reduces the cost of borrowing
      description: '-20% interest cost reduction'
    }]
  },
  {
    id: 'asset-leverage',
    name: 'Asset-Based Leverage',
    type: 'linear',
    parameters: { principal: 0, rate: 50 },
    timeRange: [2025, 2045],
    color: '#8b5cf6',
    description: '+50% leverage multiplier',
    detailedInfo: {
      strategy: 'Use assets as collateral to borrow more money at lower rates, amplifying returns.',
      timeCommitment: 'While maintaining sufficient collateral'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['investment', 'loan'],
    stackEffects: [{
      type: 'percentage',
      value: -50, // Negative percentage means bonus (amplifies the effect)
      description: '+50% leverage amplification'
    }]
  },
  {
    id: 'prepayment-penalty',
    name: 'Prepayment Penalty',
    type: 'linear',
    parameters: { principal: 0, rate: 3 },
    timeRange: [2025, 2045],
    color: '#dc2626',
    description: '+3% penalty cost',
    detailedInfo: {
      strategy: 'Some loans have penalties for early repayment, reducing flexibility.',
      timeCommitment: 'If attempting early repayment'
    },
    role: 'modifier',
    canStack: true,
    compatibleWith: ['loan'],
    stackEffects: [{
      type: 'percentage',
      value: -3, // Negative increases the cost
      description: '+3% prepayment penalty'
    }]
  }
];

// Combined export of all cards
export const allCards: FinancialCard[] = [
  ...investmentCards,
  ...incomeCards,
  ...expenseCards,
  ...taxCards,
  ...bonusCards,
  ...loanCards
];
