import type { FinancialCard } from '../core/types';

export function formatCardValue(card: any): string {
  // Safety check for null/undefined cards
  if (!card) return '';
  
  // Handle unified card format
  if (card.curve) {
    const { parameters, type } = card.curve;
    const rate = parameters.rate * 100; // Convert back to percentage for display
    const amplitude = parameters.amplitude;
    const offset = parameters.offset;
    
    switch (type) {
      case 'compound':
        if (rate !== 0) {
          return `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`;
        }
        if (amplitude !== 0) {
          return `${amplitude > 0 ? '+' : ''}${(Math.abs(amplitude) / 1000).toFixed(0)}k`;
        }
        break;
        
      case 'linear':
        if (offset !== 0) {
          // Monthly amount (converted from offset)
          const monthly = offset / 12;
          return `${monthly > 0 ? '+' : ''}${(monthly / 1000).toFixed(1)}k/mo`;
        }
        if (amplitude !== 0) {
          return `${amplitude > 0 ? '+' : ''}${(Math.abs(amplitude) / 1000).toFixed(0)}k`;
        }
        break;
        
      case 'sinusoidal':
        return `${amplitude > 0 ? '+' : ''}${(Math.abs(amplitude) / 1000).toFixed(0)}k/yr`;
        
      case 'custom':
        return 'Custom';
        
      default:
        return type;
    }
    return '';
  }
  
  // Handle legacy card format
  const type = card.type;
  const parameters = card.parameters || {};
  
  if (type === 'loan') {
    const principal = Math.abs(parameters.principal || 0);
    const rate = parameters.rate || 0;
    const term = parameters.loanTerm || 10;
    
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
  if (parameters.rate && parameters.rate !== 0) {
    return `${parameters.rate > 0 ? '+' : ''}${parameters.rate}%`;
  }
  
  // Show monthly amount if it exists and is non-zero
  if (parameters.monthlyAmount && parameters.monthlyAmount !== 0) {
    const monthly = parameters.monthlyAmount;
    return `${monthly > 0 ? '+' : ''}${(monthly / 1000).toFixed(1)}k/mo`;
  }
  
  // Show principal value if it exists and is non-zero (for cards with only initial value)
  if (parameters.principal && parameters.principal !== 0) {
    const principal = parameters.principal;
    return `${principal > 0 ? '+' : ''}${(Math.abs(principal) / 1000).toFixed(0)}k`;
  }
  
  return '';
}

export function getCardIcon(type: string): string {
  switch (type) {
    case 'compound': return '⤴️';
    case 'linear': return '📏';
    case 'exponential': return '🚀';
    case 'sinusoidal': return '🌊';
    case 'logarithmic': return '📊';
    case 'power': return '💪';
    case 'custom': return '⚙️';
    case 'loan': return '💳';
    default: return '⚙️';
  }
}

export function isPositiveCard(card: any): boolean {
  if (!card) return false;
  
  if (card.curve) {
    return card.curve.isPositive;
  }
  // Legacy format
  const type = card.type;
  const parameters = card.parameters || {};
  if (type === 'loan') return false; // Loans are neither positive nor negative for color purposes
  return (parameters.rate ?? 0) > 0 || (parameters.monthlyAmount ?? 0) > 0;
}

export function isNegativeCard(card: any): boolean {
  if (!card) return false;
  
  if (card.curve) {
    return !card.curve.isPositive;
  }
  // Legacy format
  const type = card.type;
  const parameters = card.parameters || {};
  if (type === 'loan') return false; // Loans are neither positive nor negative for color purposes
  return (parameters.rate ?? 0) < 0 || (parameters.monthlyAmount ?? 0) < 0;
}

export function isLoanCard(card: any): boolean {
  if (!card) return false;
  
  if (card.curve) {
    return false; // Unified cards don't have explicit loan type
  }
  // Legacy format
  return card.type === 'loan';
}
