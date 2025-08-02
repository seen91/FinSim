import type { FinancialCard, TimeSeriesPoint } from '$lib/types';
import { evaluate } from 'mathjs';

export function calculateProjections(cards: FinancialCard[]): TimeSeriesPoint[] {
  const allPoints: TimeSeriesPoint[] = [];
  
  cards.forEach(card => {
    const points = calculateCardProjection(card);
    allPoints.push(...points);
  });
  
  return allPoints;
}

function calculateCardProjection(card: FinancialCard): TimeSeriesPoint[] {
  const [startYear, endYear] = card.timeRange;
  const points: TimeSeriesPoint[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const t = year - startYear;
    let value = 0;
    
    switch (card.type) {
      case 'compound':
        const P = card.parameters.principal || 0;
        const r = (card.parameters.rate || 0) / 100;
        value = P * Math.pow(1 + r, t);
        break;
        
      case 'linear':
        const initial = card.parameters.principal || 0;
        const monthly = card.parameters.monthlyAmount || 0;
        value = initial + (monthly * 12 * t);
        break;
        
      case 'exponential':
        const P0 = card.parameters.principal || 0;
        const rate = (card.parameters.rate || 0) / 100;
        value = P0 * Math.exp(rate * t);
        break;
        
      case 'custom':
        if (card.parameters.customFormula) {
          try {
            value = evaluate(card.parameters.customFormula, { t, year });
          } catch (e) {
            console.error('Formula error:', e);
          }
        }
        break;
    }
    
    points.push({ year, value, cardId: card.id });
  }
  
  return points;
}