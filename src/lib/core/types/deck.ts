export type AggregationType = 'sum' | 'multiply' | 'average';

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: import('./financial').FinancialCard[];
  aggregationType?: AggregationType;
}
