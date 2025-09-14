import type { Deck } from '../core/types';

export const conservativeDeck: Deck = {
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
      role: 'base',
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
      role: 'base',
      detailedInfo: {
        strategy: 'Diversified portfolio mixing stocks and bonds for moderate growth with reduced volatility.',
        timeCommitment: '20 years'
      }
    }
  ]
};

export const taxOptDeck: Deck = {
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
      role: 'base',
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
      role: 'base',
      detailedInfo: {
        strategy: 'After-tax retirement contributions that grow tax-free for qualified withdrawals.',
        timeCommitment: '20+ years'
      }
    }
  ]
};

export const fireDeck: Deck = {
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
      role: 'base',
      detailedInfo: {
        strategy: 'Passive investment in the 500 largest US companies for long-term wealth building.',
        timeCommitment: '20+ years'
      }
    }
  ]
};

export const leverageDeck: Deck = {
  id: 'leverage',
  name: 'Leverage Strategy',
  description: 'Personal loan example',
  cards: [
    {
      id: 'personal-loan-deck',
      name: 'Personal Loan',
      type: 'loan',
      parameters: { principal: 10000, rate: 5, loanTerm: 10 },
      timeRange: [2025, 2035],
      color: '#ea580c',
      role: 'base',
      detailedInfo: {
        strategy: 'Example: $10k initial loan with 5% interest over 10 years. Traditional unsecured personal loan.',
        timeCommitment: '10 years fixed term'
      }
    }
  ]
};
