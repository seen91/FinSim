import type { SimulationSettings } from '../stores/simulationStore';

/**
 * Interface representing a data point in the simulation results
 */
export interface SimulationDataPoint {
  year: number;
  month: number;
  balance: number;
  contributions: number;
  earnings: number;
  inflation: number;
  realBalance: number; // Balance adjusted for inflation
}

/**
 * Calculate compound interest over time with monthly contributions
 * @param settings Simulation settings
 * @returns Array of data points with financial values for each period
 */
export function calculateCompoundInterest(settings: SimulationSettings): SimulationDataPoint[] {
  const {
    initialAmount,
    monthlyContribution,
    annualReturn,
    inflationRate,
    years,
    taxRate
  } = settings;

  const monthlyReturn = annualReturn / 12;
  const monthlyInflation = inflationRate / 12;
  const results: SimulationDataPoint[] = [];

  let balance = initialAmount;
  let totalContributions = initialAmount;
  let cumulativeInflationFactor = 1;

  // Calculate for each month
  for (let year = 0; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      // Skip month 0 of year 0 as that's the initial state
      if (year === 0 && month === 0) {
        results.push({
          year,
          month,
          balance,
          contributions: initialAmount,
          earnings: 0,
          inflation: 1,
          realBalance: balance
        });
        continue;
      }

      // Calculate monthly earnings (pre-tax)
      const earnings = balance * monthlyReturn;
      
      // Apply taxes to earnings if applicable
      const taxedEarnings = earnings * (1 - taxRate);
      
      // Add monthly contribution
      balance += monthlyContribution + taxedEarnings;
      totalContributions += monthlyContribution;
      
      // Calculate inflation factor for this period
      cumulativeInflationFactor *= (1 + monthlyInflation);
      const realBalance = balance / cumulativeInflationFactor;

      results.push({
        year,
        month,
        balance,
        contributions: totalContributions,
        earnings: taxedEarnings,
        inflation: cumulativeInflationFactor,
        realBalance
      });
    }
  }

  return results;
}

/**
 * Returns yearly summary data from monthly simulation results
 * @param monthlyData The monthly simulation data
 * @returns Array of yearly data points
 */
export function getYearlySummary(monthlyData: SimulationDataPoint[]): SimulationDataPoint[] {
  return monthlyData.filter(dataPoint => dataPoint.month === 11);
}

/**
 * Calculate the future value of an investment
 * @param principal Initial investment amount
 * @param monthlyContribution Amount added each month
 * @param annualRate Annual interest rate (decimal)
 * @param years Number of years
 * @returns The future value of the investment
 */
export function calculateFutureValue(
  principal: number, 
  monthlyContribution: number, 
  annualRate: number, 
  years: number
): number {
  const monthlyRate = annualRate / 12;
  const periods = years * 12;
  
  // Calculate future value of initial principal
  const principalFV = principal * Math.pow(1 + monthlyRate, periods);
  
  // Calculate future value of the stream of contributions
  const contributionFV = monthlyContribution * 
    ((Math.pow(1 + monthlyRate, periods) - 1) / monthlyRate);
  
  return principalFV + contributionFV;
}