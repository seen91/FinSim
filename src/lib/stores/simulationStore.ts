import { writable } from 'svelte/store';

export interface SimulationSettings {
  initialAmount: number;
  monthlyContribution: number;
  annualReturn: number;
  inflationRate: number;
  years: number;
  taxRate: number;
}

// Default simulation settings
const defaultSettings: SimulationSettings = {
  initialAmount: 10000,
  monthlyContribution: 500,
  annualReturn: 0.07,
  inflationRate: 0.03,
  years: 30,
  taxRate: 0.25
};

// Create the store with default values
export const simulationSettings = writable<SimulationSettings>(defaultSettings);