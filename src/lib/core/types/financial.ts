export type CurveType = 'compound' | 'linear' | 'exponential' | 'custom';

export interface FinancialParameters {
  principal?: number;
  rate?: number;
  monthlyAmount?: number;
  customFormula?: string;
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
