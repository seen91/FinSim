export type CurveType = 'compound' | 'linear' | 'exponential' | 'custom';
export type AggregationType = 'sum' | 'multiply' | 'average';

export interface FinancialCard {
  id: string;
  name: string;
  type: CurveType;
  parameters: {
    principal?: number;
    rate?: number;
    monthlyAmount?: number;
    customFormula?: string;
  };
  timeRange: [number, number]; // [startYear, endYear]
  color: string;
  description?: string;
  detailedInfo?: {
    strategy: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    expectedReturn: string;
    timeCommitment: string;
    pros: string[];
    cons: string[];
    tooltip?: string;
  };
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: FinancialCard[];
  aggregationType?: AggregationType;
}

export interface TimeSeriesPoint {
  year: number;
  value: number;
  cardId: string;
}

export interface GameState {
  hand: FinancialCard[];
  availableDecks: Deck[];
  activeCardIds: Set<string>;
}