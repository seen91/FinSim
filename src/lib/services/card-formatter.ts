import type { FinancialCard } from '../core/types';

export function formatCardValue(card: FinancialCard): string {
  if (card.parameters.rate) {
    return `${card.parameters.rate > 0 ? '+' : ''}${card.parameters.rate}%`;
  }
  if (card.parameters.monthlyAmount) {
    const monthly = card.parameters.monthlyAmount;
    return `${monthly > 0 ? '+' : ''}${(monthly / 1000).toFixed(1)}k/mo`;
  }
  return '';
}

export function getCardIcon(type: string): string {
  switch (type) {
    case 'compound': return '⤴️';
    case 'linear': return '📏';
    case 'exponential': return '🚀';
    default: return '⚙️';
  }
}

export function isPositiveCard(card: FinancialCard): boolean {
  return (card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0;
}

export function isNegativeCard(card: FinancialCard): boolean {
  return (card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0;
}
