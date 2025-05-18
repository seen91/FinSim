export interface Fragment {
  id: string;
  name: string;
  initialAmount: number;
  periodicContribution: number;
  contributionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  expectedReturn: number;
  years: number;
  createdAt: Date;
  updatedAt: Date;
  type: 'appreciation' | 'depreciation' | 'imported';
}

export interface FragmentParams {
  name: string;
  initialAmount: number;
  periodicContribution: number;
  contributionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  expectedReturn: number;
  years: number;
  type?: 'appreciation' | 'depreciation' | 'imported';
}

/**
 * Creates a new financial fragment
 * @param params Fragment parameters
 * @returns A new Fragment object
 */
export function createFragment(params: FragmentParams): Fragment {
  const now = new Date();
  const type = determineFragmentType(params.expectedReturn);
  
  return {
    id: generateFragmentId(),
    name: params.name,
    initialAmount: params.initialAmount,
    periodicContribution: params.periodicContribution,
    contributionFrequency: params.contributionFrequency,
    expectedReturn: params.expectedReturn,
    years: params.years,
    createdAt: now,
    updatedAt: now,
    type: params.type || type
  };
}

/**
 * Determines the fragment type based on expected return
 * @param expectedReturn The expected rate of return
 * @returns The fragment type
 */
function determineFragmentType(expectedReturn: number): 'appreciation' | 'depreciation' | 'imported' {
  if (expectedReturn >= 0) {
    return 'appreciation';
  } else {
    return 'depreciation';
  }
}

/**
 * Generates a unique ID for a fragment
 * @returns A unique ID string
 */
function generateFragmentId(): string {
  return `fragment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates future value of a financial fragment
 * @param fragment The fragment to calculate for
 * @returns Array of yearly values
 */
export function calculateFragmentValues(fragment: Fragment): { year: number; value: number }[] {
  const periodsPerYear = getPeriodsPerYear(fragment.contributionFrequency);
  const totalPeriods = fragment.years * periodsPerYear;
  const ratePerPeriod = fragment.expectedReturn / periodsPerYear;
  
  const values = [];
  let currentValue = fragment.initialAmount;
  
  for (let period = 1; period <= totalPeriods; period++) {
    // Add periodic contribution
    currentValue += fragment.periodicContribution;
    
    // Apply interest/return
    currentValue *= (1 + ratePerPeriod);
    
    // If this is the end of a year, record the value
    if (period % periodsPerYear === 0) {
      const year = period / periodsPerYear;
      values.push({ year, value: currentValue });
    }
  }
  
  return values;
}

/**
 * Gets the number of periods per year based on contribution frequency
 * @param frequency The contribution frequency
 * @returns Number of periods per year
 */
function getPeriodsPerYear(frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): number {
  switch (frequency) {
    case 'daily': return 365;
    case 'weekly': return 52;
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    default: return 12; // Default to monthly
  }
}

/**
 * Combines multiple fragments into a single result
 * @param fragments Array of fragments to combine
 * @param name Name for the combined fragment
 * @returns A new combined fragment
 */
export function combineFragments(fragments: Fragment[], name: string): Fragment {
  if (fragments.length === 0) {
    throw new Error('Cannot combine empty fragment array');
  }
  
  // Use the first fragment as a base for the combined fragment
  const baseFragment = fragments[0];
  
  // Create a new fragment with combined properties
  return {
    id: generateFragmentId(),
    name,
    initialAmount: fragments.reduce((sum, f) => sum + f.initialAmount, 0),
    periodicContribution: fragments.reduce((sum, f) => sum + f.periodicContribution, 0),
    contributionFrequency: baseFragment.contributionFrequency, // Using the first fragment's frequency
    expectedReturn: calculateWeightedReturn(fragments),
    years: Math.max(...fragments.map(f => f.years)),
    createdAt: new Date(),
    updatedAt: new Date(),
    type: 'appreciation' // Default to appreciation for combined fragments
  };
}

/**
 * Calculates the weighted average return rate across multiple fragments
 * @param fragments Array of fragments
 * @returns Weighted average return rate
 */
function calculateWeightedReturn(fragments: Fragment[]): number {
  const totalValue = fragments.reduce((sum, f) => sum + f.initialAmount, 0);
  
  if (totalValue === 0) {
    // Simple average if all initial amounts are zero
    return fragments.reduce((sum, f) => sum + f.expectedReturn, 0) / fragments.length;
  }
  
  // Weighted average based on initial amounts
  const weightedSum = fragments.reduce(
    (sum, f) => sum + (f.expectedReturn * (f.initialAmount / totalValue)), 
    0
  );
  
  return weightedSum;
}