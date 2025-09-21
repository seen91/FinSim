export type AggregationType = 'sum' | 'multiply' | 'average';

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: import('./financial').FinancialCard[];
  // Optional pre-defined stacks within the deck
  stacks?: import('./financial').CardStack[];
  aggregationType?: AggregationType;
}
