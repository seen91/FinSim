import type { FinancialCard, TimeSeriesPoint } from '../types';
import { calculateCardProjection } from './card-projection';

export function calculateProjections(cards: FinancialCard[]): TimeSeriesPoint[] {
  const allPoints: TimeSeriesPoint[] = [];
  
  cards.forEach(card => {
    const points = calculateCardProjection(card);
    allPoints.push(...points);
  });
  
  return allPoints;
}

export function aggregateProjections(points: TimeSeriesPoint[]): Map<number, number> {
  const yearlyTotals = new Map<number, number>();
  
  points.forEach(point => {
    const currentTotal = yearlyTotals.get(point.year) || 0;
    yearlyTotals.set(point.year, currentTotal + point.value);
  });
  
  return yearlyTotals;
}
