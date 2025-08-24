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
