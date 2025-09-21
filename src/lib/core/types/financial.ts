import type { UnifiedCard } from './curve-model';

// Main financial card type - now uses the unified curve model
export type FinancialCard = UnifiedCard;

// Legacy types for backward compatibility during transition
export type CurveType = 'compound' | 'linear' | 'exponential' | 'loan' | 'custom';

export interface FinancialParameters {
  principal?: number;
  rate?: number;
  monthlyAmount?: number;
  customFormula?: string;
  loanTerm?: number;
}

export interface LegacyFinancialCard {
  id: string;
  name: string;
  type: CurveType;
  parameters: FinancialParameters;
  timeRange: [number, number];
  color: string;
  description?: string;
  detailedInfo?: CardDetailInfo;
  stackEffects?: StackEffect[];
}

// Supporting types
export interface StackEffect {
  type: 'multiply' | 'add' | 'subtract' | 'percentage' | 'custom';
  value?: number;
  formula?: string;
  description: string;
}

export interface CardDetailInfo {
  strategy: string;
  timeCommitment?: string; // Optional since it's considered fluff
}

export interface TimeSeriesPoint {
  year: number;
  value: number;
  cardId: string;
}

export interface CardStack {
  id: string;
  name?: string;
  cards: FinancialCard[];
  position?: { x: number; y: number };
}

export interface NestedStack {
  id: string;
  items: (FinancialCard | CardStack)[];
  position?: { x: number; y: number };
}

export type StackableItem = FinancialCard | CardStack;

/**
 * Convert legacy card format to unified model
 */
export function legacyToUnified(legacyCard: LegacyFinancialCard): UnifiedCard {
  const [startYear, endYear] = legacyCard.timeRange;
  
  // Map legacy type to curve type and parameters
  const curveType = legacyCard.type === 'loan' ? 'compound' : legacyCard.type;
  
  return {
    id: legacyCard.id,
    name: legacyCard.name,
    description: legacyCard.description,
    color: legacyCard.color,
    curve: {
      type: curveType as any,
      parameters: {
        amplitude: legacyCard.parameters.principal || 0,
        rate: (legacyCard.parameters.rate || 0) / 100,
        frequency: legacyCard.parameters.monthlyAmount ? 12 : 0,
        phase: 0,
        offset: legacyCard.parameters.monthlyAmount || 0,
        formula: legacyCard.parameters.customFormula
      },
      isPositive: (legacyCard.parameters.principal || 0) >= 0 && (legacyCard.parameters.monthlyAmount || 0) >= 0,
      isDifferentiable: legacyCard.type !== 'custom',
      domain: [startYear, endYear]
    },
    detailedInfo: legacyCard.detailedInfo,
    canBeStacked: true,
    canStackOnto: [],
    stackingMultiplier: 1
  };
}
