import type { FinancialCard } from '../core/types';

export function formatCardValue(card: FinancialCard): string {
  if (card.type === 'loan') {
    const principal = Math.abs(card.parameters.principal || 0);
    const rate = card.parameters.rate || 0;
    const term = card.parameters.loanTerm || 10;
    
    // Calculate annual payment for display
    const monthlyRate = rate / 100 / 12;
    const totalPayments = term * 12;
    let monthlyPayment = 0;
    
    if (monthlyRate > 0) {
      const numerator = monthlyRate * Math.pow(1 + monthlyRate, totalPayments);
      const denominator = Math.pow(1 + monthlyRate, totalPayments) - 1;
      monthlyPayment = principal * (numerator / denominator);
    } else {
      monthlyPayment = principal / totalPayments;
    }
    
    const annualPayment = monthlyPayment * 12;
    return `$${(principal / 1000).toFixed(0)}k → -$${(annualPayment / 1000).toFixed(1)}k/y`;
  }
  
  // Show rate if it exists and is non-zero
  if (card.parameters.rate && card.parameters.rate !== 0) {
    return `${card.parameters.rate > 0 ? '+' : ''}${card.parameters.rate}%`;
  }
  
  // Show monthly amount if it exists and is non-zero
  if (card.parameters.monthlyAmount && card.parameters.monthlyAmount !== 0) {
    const monthly = card.parameters.monthlyAmount;
    return `${monthly > 0 ? '+' : ''}${(monthly / 1000).toFixed(1)}k/mo`;
  }
  
  // Show principal value if it exists and is non-zero (for cards with only initial value)
  if (card.parameters.principal && card.parameters.principal !== 0) {
    const principal = card.parameters.principal;
    return `${principal > 0 ? '+' : ''}${(Math.abs(principal) / 1000).toFixed(0)}k`;
  }
  
  return '';
}

export function getCardIcon(type: string): string {
  switch (type) {
    case 'compound': return '⤴️';
    case 'linear': return '📏';
    case 'exponential': return '🚀';
    case 'loan': return '💳';
    default: return '⚙️';
  }
}

export function isPositiveCard(card: FinancialCard): boolean {
  if (card.type === 'loan') return false; // Loans are neither positive nor negative for color purposes
  return (card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0;
}

export function isNegativeCard(card: FinancialCard): boolean {
  if (card.type === 'loan') return false; // Loans are neither positive nor negative for color purposes
  return (card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0;
}

export function isLoanCard(card: FinancialCard): boolean {
  return card.type === 'loan';
}
