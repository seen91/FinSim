import type { FinancialCard, TimeSeriesPoint } from '../types';
import { evaluate } from 'mathjs';

export function calculateCardProjection(card: FinancialCard): TimeSeriesPoint[] {
  const [startYear, endYear] = card.timeRange;
  const points: TimeSeriesPoint[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const t = year - startYear;
    const value = calculateCardValue(card, t, year);
    points.push({ year, value, cardId: card.id });
  }
  
  return points;
}

function calculateCardValue(card: FinancialCard, t: number, year: number): number {
  switch (card.type) {
    case 'compound':
      return calculateCompoundValue(card, t);
    case 'linear':
      return calculateLinearValue(card, t);
    case 'exponential':
      return calculateExponentialValue(card, t);
    case 'loan':
      return calculateLoanValue(card, t);
    case 'custom':
      return calculateCustomValue(card, t, year);
    default:
      return 0;
  }
}

function calculateCompoundValue(card: FinancialCard, t: number): number {
  const P = card.parameters.principal || 0;
  const r = (card.parameters.rate || 0) / 100;
  return P * Math.pow(1 + r, t);
}

function calculateLinearValue(card: FinancialCard, t: number): number {
  const initial = card.parameters.principal || 0;
  const monthly = card.parameters.monthlyAmount || 0;
  return initial + (monthly * 12 * t);
}

function calculateExponentialValue(card: FinancialCard, t: number): number {
  const P0 = card.parameters.principal || 0;
  const rate = (card.parameters.rate || 0) / 100;
  return P0 * Math.exp(rate * t);
}

function calculateLoanValue(card: FinancialCard, t: number): number {
  const principal = card.parameters.principal || 0;
  const annualRate = (card.parameters.rate || 0) / 100;
  const termYears = card.parameters.loanTerm || 10;
  const monthlyAmount = card.parameters.monthlyAmount || 0;
  
  // Handle margin loan style (monthly borrowing with no fixed payback)
  if (monthlyAmount < 0 && principal === 0) {
    // This is a margin loan - borrowing monthly with accumulating interest
    const monthlyRate = annualRate / 12;
    const months = t * 12;
    
    if (months === 0) return 0;
    
    // Calculate accumulated debt from monthly borrowing with compound interest
    let totalDebt = 0;
    const monthlyBorrow = Math.abs(monthlyAmount);
    
    // For each month, add the monthly borrow amount and compound the interest
    for (let month = 1; month <= months; month++) {
      // Add this month's borrowing
      totalDebt += monthlyBorrow;
      // Apply monthly interest to the accumulated debt
      totalDebt *= (1 + monthlyRate);
    }
    
    return -totalDebt; // Negative because it's debt
  }
  
  // Handle traditional fixed-term loans
  if (t > termYears) {
    // After loan is paid off, no benefit remains
    return 0;
  }
  
  // Monthly interest rate
  const monthlyRate = annualRate / 12;
  const totalPayments = termYears * 12;
  
  // Calculate monthly payment using standard amortization formula
  let monthlyPayment = 0;
  if (monthlyRate > 0) {
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, totalPayments);
    const denominator = Math.pow(1 + monthlyRate, totalPayments) - 1;
    monthlyPayment = principal * (numerator / denominator);
  } else {
    // If no interest, it's just principal divided by number of payments
    monthlyPayment = principal / totalPayments;
  }
  
  // Calculate net benefit: initial principal minus cumulative payments made so far
  const annualPayment = monthlyPayment * 12;
  const totalPaymentsMade = annualPayment * t;
  
  return principal - totalPaymentsMade;
}

function calculateCustomValue(card: FinancialCard, t: number, year: number): number {
  if (!card.parameters.customFormula) return 0;
  
  try {
    // Use mathjs for safe mathematical expression evaluation
    const value = evaluate(card.parameters.customFormula, { t, year });
    return typeof value === 'number' ? value : 0;
  } catch (e) {
    console.error('Formula error:', e);
    return 0;
  }
}
