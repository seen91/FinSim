export type CurveType = 'compound' | 'linear' | 'exponential' | 'custom';

export interface FinancialParameters {
  principal?: number;
  rate?: number;
  monthlyAmount?: number;
  customFormula?: string;
}

export type CardRole = 'base' | 'modifier';
export type StackCategory = 'income' | 'investment' | 'expense' | 'tax' | 'bonus';

export interface StackEffect {
  type: 'multiply' | 'add' | 'subtract' | 'percentage' | 'custom';
  value?: number;
  formula?: string; // For custom effects
  description: string;
}

export interface FinancialCard {
  id: string;
  name: string;
  type: CurveType;
  parameters: FinancialParameters;
  timeRange: [number, number]; // [startYear, endYear]
  color: string;
  description?: string;
  detailedInfo?: CardDetailInfo;
  // Stacking properties
  role: CardRole;
  stackCategory?: StackCategory;
  canBeStacked?: boolean; // Can other cards be stacked on this one
  canStack?: boolean; // Can this card be stacked on others
  stackEffects?: StackEffect[]; // Effects this card applies when stacked
  compatibleWith?: StackCategory[]; // What categories this card can stack on
}

export interface CardDetailInfo {
  strategy: string;
  timeCommitment: string;
}

export interface TimeSeriesPoint {
  year: number;
  value: number;
  cardId: string;
}

export interface CardStack {
  id: string;
  baseCard: FinancialCard;
  modifierCards: FinancialCard[];
  position?: { x: number; y: number }; // For UI positioning
}
