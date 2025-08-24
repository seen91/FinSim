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
    }
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
    }
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
    }
  }
];
