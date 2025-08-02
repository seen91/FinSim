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
          riskLevel: 'Low',
          expectedReturn: '3-5% annually',
          timeCommitment: '20 years',
          pros: ['Government-backed security', 'Predictable returns', 'Low volatility', 'Portfolio stability'],
          cons: ['Lower returns than stocks', 'Inflation risk', 'Interest rate sensitivity'],
          tooltip: 'Safe haven investment for conservative portfolios'
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
          riskLevel: 'Medium',
          expectedReturn: '5-7% annually',
          timeCommitment: '20 years',
          pros: ['Diversification', 'Professional management', 'Moderate risk', 'Steady growth'],
          cons: ['Management fees', 'Market risk', 'Less control over allocation'],
          tooltip: 'Ideal for investors seeking balanced growth and stability'
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
          riskLevel: 'Low',
          expectedReturn: 'Tax savings + employer match',
          timeCommitment: '20 years (until retirement)',
          pros: ['Tax deductible', 'Employer matching', 'High contribution limits', 'Automatic payroll deduction'],
          cons: ['Early withdrawal penalties', 'Required minimum distributions', 'Limited investment options'],
          tooltip: 'Essential for retirement planning with immediate tax benefits'
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
          riskLevel: 'Low',
          expectedReturn: 'Tax-free growth',
          timeCommitment: '20+ years',
          pros: ['Tax-free withdrawals', 'No required distributions', 'Flexible contribution timing', 'Estate planning benefits'],
          cons: ['Income limits', 'Lower contribution limits', 'No immediate tax deduction'],
          tooltip: 'Perfect for young investors in lower tax brackets'
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
          riskLevel: 'Medium',
          expectedReturn: '7-10% annually (historical)',
          timeCommitment: '20+ years',
          pros: ['Low fees', 'Broad diversification', 'Historical strong performance', 'Liquid'],
          cons: ['Market volatility', 'No guaranteed returns', 'US market concentration'],
          tooltip: 'Foundation of many FIRE (Financial Independence, Retire Early) strategies'
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
      riskLevel: 'Medium',
      expectedReturn: '8-11% annually (historical)',
      timeCommitment: '15+ years',
      pros: ['Ultra-low fees', 'Complete market exposure', 'Simple diversification', 'Tax efficient'],
      cons: ['Market risk', 'US-only exposure', 'No active management'],
      tooltip: 'Vanguard\'s flagship total market fund, beloved by Bogleheads'
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
      riskLevel: 'Low',
      expectedReturn: 'Equity building + housing',
      timeCommitment: '30 years',
      pros: ['Building equity', 'Fixed housing costs', 'Tax deductions', 'Leverage'],
      cons: ['Interest costs', 'Illiquid asset', 'Maintenance costs', 'Market risk'],
      tooltip: 'Often the largest monthly expense but builds long-term wealth'
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
      riskLevel: 'Medium',
      expectedReturn: '2-5% annual raises',
      timeCommitment: '20 years until retirement',
      pros: ['Steady cash flow', 'Benefits package', 'Career growth potential', 'Predictable'],
      cons: ['Job security risk', 'Limited growth', 'Taxes', 'Time commitment'],
      tooltip: 'The engine that powers all other financial strategies'
    }
  }
];