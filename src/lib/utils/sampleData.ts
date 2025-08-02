import type { Deck, FinancialCard } from '$lib/types';

export const sampleDecks: Deck[] = [
  {
    id: 'conservative',
    name: 'Conservative Mix',
    description: '3-5% growth',
    cards: [
      {
        id: 'treasury',
        name: 'Treasury Bonds',
        type: 'compound',
        parameters: { principal: 10000, rate: 4.2 },
        timeRange: [2025, 2045],
        color: '#4ade80',
        detailedInfo: {
          strategy: 'Government-backed bonds providing stable, predictable returns with minimal risk.',
          timeCommitment: '20 years'
        }
      },
      {
        id: 'balanced',
        name: 'Balanced Fund',
        type: 'compound',
        parameters: { principal: 20000, rate: 5.5 },
        timeRange: [2025, 2045],
        color: '#60a5fa',
        detailedInfo: {
          strategy: 'Diversified portfolio mixing stocks and bonds for moderate growth with reduced volatility.',
          timeCommitment: '20 years'
        }
      }
    ]
  },
  {
    id: 'tax-opt',
    name: 'Tax Optimization',
    description: 'Tax efficient strategies',
    cards: [
      {
        id: '401k',
        name: '401k Contribution',
        type: 'linear',
        parameters: { principal: 0, monthlyAmount: 500 },
        timeRange: [2025, 2045],
        color: '#a78bfa',
        detailedInfo: {
          strategy: 'Employer-sponsored retirement account with potential matching and tax advantages.',
          timeCommitment: '20 years (until retirement)'
        }
      },
      {
        id: 'roth',
        name: 'Roth IRA',
        type: 'linear',
        parameters: { principal: 5000, monthlyAmount: 200 },
        timeRange: [2025, 2045],
        color: '#fbbf24',
        detailedInfo: {
          strategy: 'After-tax retirement contributions that grow tax-free for qualified withdrawals.',
          timeCommitment: '20+ years'
        }
      }
    ]
  },
  {
    id: 'fire',
    name: 'FIRE Strategy',
    description: 'Early retirement',
    cards: [
      {
        id: 'sp500',
        name: 'S&P 500 Index',
        type: 'compound',
        parameters: { principal: 50000, rate: 7.2 },
        timeRange: [2025, 2045],
        color: '#10b981',
        detailedInfo: {
          strategy: 'Passive investment in the 500 largest US companies for long-term wealth building.',
          timeCommitment: '20+ years'
        }
      }
    ]
  }
];

export const individualCards: FinancialCard[] = [
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
  },
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
  },
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