import type { FinancialCard, TimeSeriesPoint, CardStack } from '../types';
import { calculateCardProjection } from './card-projection';
import { calculateStackProjection } from './stack-projection';

export function calculateProjections(cards: FinancialCard[], stacks: CardStack[] = []): TimeSeriesPoint[] {
  const allPoints: TimeSeriesPoint[] = [];
  
  // Calculate projections for individual cards
  cards.forEach(card => {
    const points = calculateCardProjection(card);
    allPoints.push(...points);
  });
  
  // Calculate projections for card stacks
  stacks.forEach(stack => {
    const points = calculateStackProjection(stack);
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
