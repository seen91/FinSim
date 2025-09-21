import type { FinancialCard, TimeSeriesPoint, UnifiedCard } from '../types';
import { evaluateCurve } from '../types/curve-model';

/**
 * Unified card projection calculation using the curve-based model
 * This replaces all the old type-specific calculation functions
 */
export function calculateCardProjection(card: UnifiedCard): TimeSeriesPoint[] {
  const [startYear, endYear] = card.curve.domain;
  const points: TimeSeriesPoint[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const t = year - startYear; // Time from start in years
    const value = evaluateCurve(card.curve, t);
    points.push({ year, value, cardId: card.id });
  }
  
  return points;
}

/**
 * Legacy support: Calculate projection for old format cards
 * This allows gradual migration without breaking existing functionality
 */
export function calculateLegacyCardProjection(card: any): TimeSeriesPoint[] {
  // If it's a UnifiedCard, use the new method
  if ('curve' in card) {
    return calculateCardProjection(card as UnifiedCard);
  }
  
  // Otherwise, it's a legacy card - convert and calculate
  const [startYear, endYear] = card.timeRange || [2025, 2045];
  const points: TimeSeriesPoint[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const t = year - startYear;
    const value = calculateLegacyValue(card, t);
    points.push({ year, value, cardId: card.id });
  }
  
  return points;
}

/**
 * Simplified legacy calculation - just the essential logic
 */
function calculateLegacyValue(card: any, t: number): number {
  const { type, parameters } = card;
  
  switch (type) {
    case 'compound':
      const P = parameters?.principal || 0;
      const r = (parameters?.rate || 0) / 100;
      return P * Math.pow(1 + r, t);
      
    case 'linear':
      const initial = parameters?.principal || 0;
      const monthly = parameters?.monthlyAmount || 0;
      return initial + (monthly * 12 * t);
      
    case 'exponential':
      const P0 = parameters?.principal || 0;
      const rate = (parameters?.rate || 0) / 100;
      return P0 * Math.exp(rate * t);
      
    case 'loan':
    case 'custom':
      // For simplicity during transition, treat these as linear
      return (parameters?.principal || 0) + ((parameters?.monthlyAmount || 0) * 12 * t);
      
    default:
      return 0;
  }
}