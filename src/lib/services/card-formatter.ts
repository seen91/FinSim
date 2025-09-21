import type { FinancialCard } from '../core/types';

/**
 * Formats card with simple, layman-friendly values for the card face
 */
export function formatCardSimple(card: any): string {
  // Safety check for null/undefined cards
  if (!card) return '';
  
  // Handle unified card format - show simple, understandable values
  if (card.curve) {
    const { parameters, type } = card.curve;
    const rate = parameters.rate;
    const amplitude = parameters.amplitude;
    const offset = parameters.offset;
    
    switch (type) {
      case 'compound':
        if (rate !== 0) {
          const percentage = Math.round(rate * 1000) / 10; // Round to 1 decimal place
          return `${percentage > 0 ? '+' : ''}${percentage}%/year`;
        }
        if (amplitude !== 0) {
          const amountK = Math.round(Math.abs(amplitude) / 100) / 10; // Round to 1 decimal place
          return `${amplitude > 0 ? '+' : ''}$${amountK}k`;
        }
        break;
        
      case 'linear':
        if (rate !== 0) {
          // Show as monthly for easier understanding
          const monthly = rate / 12;
          const monthlyK = Math.round(Math.abs(monthly) / 100) / 10; // Round to 1 decimal place
          return `${monthly > 0 ? '+' : ''}$${monthlyK}k/month`;
        }
        if (amplitude !== 0) {
          const amountK = Math.round(Math.abs(amplitude) / 100) / 10; // Round to 1 decimal place
          return `${amplitude > 0 ? '+' : ''}$${amountK}k`;
        }
        break;
        
      case 'sinusoidal':
        const amplitudeK = Math.round(Math.abs(amplitude) / 100) / 10; // Round to 1 decimal place
        return `~$${amplitudeK}k/year (varies)`;
        
      case 'custom':
        if (rate !== 0) {
          const percentage = Math.round(rate * 1000) / 10; // Round to 1 decimal place
          return `${percentage > 0 ? '+' : ''}${percentage}% of base`;
        }
        return 'Variable';
        
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
    const rate = Math.round((parameters.rate || 0) * 10) / 10; // Round to 1 decimal place
    const principalK = Math.round(principal / 100) / 10; // Round to 1 decimal place
    return `$${principalK}k loan @ ${rate}%`;
  }
  
  // Show rate if it exists and is non-zero
  if (parameters.rate && parameters.rate !== 0) {
    const rate = Math.round(parameters.rate * 10) / 10; // Round to 1 decimal place
    return `${rate > 0 ? '+' : ''}${rate}%/year`;
  }
  
  // Show monthly amount if it exists and is non-zero
  if (parameters.monthlyAmount && parameters.monthlyAmount !== 0) {
    const monthly = parameters.monthlyAmount;
    const monthlyK = Math.round(Math.abs(monthly) / 100) / 10; // Round to 1 decimal place
    return `${monthly > 0 ? '+' : ''}$${monthlyK}k/month`;
  }
  
  // Show principal value if it exists and is non-zero
  if (parameters.principal && parameters.principal !== 0) {
    const principal = parameters.principal;
    const principalK = Math.round(Math.abs(principal) / 100) / 10; // Round to 1 decimal place
    return `${principal > 0 ? '+' : ''}$${principalK}k`;
  }
  
  return '';
}

/**
 * Formats card with technical mathematical f(x) data for detailed view
 */
export function formatCardTechnical(card: any): string {
  // Safety check for null/undefined cards
  if (!card) return '';
  
  // Handle unified card format - show mathematical function details
  if (card.curve) {
    const { parameters, type } = card.curve;
    const rate = parameters.rate;
    const amplitude = parameters.amplitude;
    const frequency = parameters.frequency;
    const phase = parameters.phase;
    const offset = parameters.offset;
    
    switch (type) {
      case 'compound':
        if (rate !== 0) {
          return `f(t) = A(1${rate >= 0 ? '+' : ''}${(rate * 100).toFixed(1)}%)^t`;
        }
        break;
        
      case 'linear':
        const parts = [];
        if (rate !== 0) parts.push(`${rate > 0 ? '+' : ''}${(rate / 1000).toFixed(0)}k*t`);
        if (amplitude !== 0) parts.push(`${amplitude > 0 ? '+' : ''}${(amplitude / 1000).toFixed(0)}k`);
        if (offset !== 0) parts.push(`${offset > 0 ? '+' : ''}${(offset / 1000).toFixed(0)}k`);
        return `f(t) = ${parts.join(' ') || '0'}`;
        
      case 'sinusoidal':
        return `f(t) = ${(amplitude / 1000).toFixed(0)}k*sin(${frequency}t${phase !== 0 ? `+${phase.toFixed(2)}` : ''})`;
        
      case 'exponential':
        return `f(t) = ${(amplitude / 1000).toFixed(0)}k*e^(${(rate * 100).toFixed(1)}%*t)`;
        
      case 'logarithmic':
        return `f(t) = ${(amplitude / 1000).toFixed(0)}k*ln(${rate.toFixed(2)}*t${offset !== 0 ? `+${(offset / 1000).toFixed(0)}k` : ''})`;
        
      case 'power':
        return `f(t) = ${(amplitude / 1000).toFixed(0)}k*t^${rate.toFixed(2)}`;
        
      case 'custom':
        if (parameters.formula) {
          return `f(t) = ${parameters.formula}`;
        }
        return 'f(t) = custom';
        
      default:
        return `f(t) = ${type}`;
    }
    return 'f(t) = ?';
  }
  
  // Handle legacy card format - convert to mathematical representation
  const type = card.type;
  const parameters = card.parameters || {};
  
  if (type === 'loan') {
    const principal = Math.abs(parameters.principal || 0);
    const rate = parameters.rate || 0;
    const term = parameters.loanTerm || 10;
    
    return `f(t) = -${(principal / 1000).toFixed(0)}k*(1+${rate}%)^t/${term}y`;
  }
  
  // Show rate if it exists and is non-zero
  if (parameters.rate && parameters.rate !== 0) {
    return `f(t) = A*(1${parameters.rate >= 0 ? '+' : ''}${parameters.rate}%)^t`;
  }
  
  // Show monthly amount if it exists and is non-zero
  if (parameters.monthlyAmount && parameters.monthlyAmount !== 0) {
    const monthly = parameters.monthlyAmount;
    return `f(t) = ${monthly > 0 ? '+' : ''}${(monthly / 1000).toFixed(1)}k*t*12`;
  }
  
  // Show principal value if it exists and is non-zero (for cards with only initial value)
  if (parameters.principal && parameters.principal !== 0) {
    const principal = parameters.principal;
    return `f(t) = ${principal > 0 ? '+' : ''}${(Math.abs(principal) / 1000).toFixed(0)}k`;
  }
  
  return 'f(t) = 0';
}

/**
 * Gets technical curve parameters for display
 */
export function getCardParameters(card: any): string[] {
  if (!card) return [];
  
  if (card.curve) {
    const { parameters, type } = card.curve;
    const params = [];
    
    if (parameters.rate !== 0) {
      params.push(`r=${(parameters.rate * 100).toFixed(1)}%`);
    }
    if (parameters.amplitude !== 0) {
      params.push(`A=${(parameters.amplitude / 1000).toFixed(0)}k`);
    }
    if (parameters.frequency && parameters.frequency !== 0) {
      params.push(`ω=${parameters.frequency.toFixed(2)}`);
    }
    if (parameters.phase !== 0) {
      params.push(`φ=${parameters.phase.toFixed(2)}`);
    }
    if (parameters.offset !== 0) {
      params.push(`c=${(parameters.offset / 1000).toFixed(0)}k`);
    }
    if (card.curve.domain) {
      params.push(`t∈[${card.curve.domain[0]}, ${card.curve.domain[1]}]`);
    }
    
    return params;
  }
  
  return [];
}

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
