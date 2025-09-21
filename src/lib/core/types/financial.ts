export type CurveType = 'compound' | 'linear' | 'exponential' | 'loan' | 'custom';

export interface FinancialParameters {
  principal?: number;
  rate?: number;
  monthlyAmount?: number;
  customFormula?: string;
  loanTerm?: number; // For loan type: loan term in years
}

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
  stackEffects?: StackEffect[]; // Effects this card applies when stacked
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
  cards: FinancialCard[]; // All cards in the stack, first is bottom/primary, rest are stacked on top
  position?: { x: number; y: number }; // For UI positioning
}

// For future nested stacking support - can contain both cards and other stacks  
export interface NestedStack {
  id: string;
  items: (FinancialCard | CardStack)[]; // Multi-dimensional stacking support
  position?: { x: number; y: number };
}

// Utility type for working with stackable items
export type StackableItem = FinancialCard | CardStack;
