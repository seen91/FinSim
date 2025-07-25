import { v4 as uuidv4 } from 'uuid';
import type { SimulationSettings } from '../stores/simulationStore';
import { calculateCompoundInterest, type SimulationDataPoint } from './financialCalculations';

/**
 * Fragment types for different financial scenarios
 */
export enum FragmentType {
  APPRECIATION = 'appreciation',
  DEPRECIATION = 'depreciation',
  EXPENSE = 'expense',
  INCOME = 'income',
  CUSTOM = 'custom',
  COMBINED = 'combined'
}

/**
 * Interface representing a financial fragment - a reusable financial scenario
 */
export interface Fragment {
  id: string;
  name: string;
  description: string;
  type: FragmentType;
  settings: SimulationSettings;
  created: Date;
  modified: Date;
  parentIds?: string[]; // For combined fragments
  color?: string; // For visualization
}

/**
 * Create a new financial fragment
 */
export function createFragment(
  name: string,
  description: string,
  type: FragmentType,
  settings: SimulationSettings,
  color?: string
): Fragment {
  return {
    id: uuidv4(),
    name,
    description,
    type,
    settings,
    created: new Date(),
    modified: new Date(),
    color: color || generateRandomColor()
  };
}

/**
 * Create a combined fragment from multiple fragments
 */
export function combineFragments(
  name: string, 
  description: string,
  fragments: Fragment[], 
  color?: string
): Fragment {
  // Start with settings from the first fragment
  const combinedSettings: SimulationSettings = { ...fragments[0].settings };
  
  // Combine key financial parameters
  for (let i = 1; i < fragments.length; i++) {
    const fragment = fragments[i];
    combinedSettings.initialAmount += fragment.settings.initialAmount;
    combinedSettings.monthlyContribution += fragment.settings.monthlyContribution;
    // Use weighted average for rates based on initial amount
    // More sophisticated combination logic could be implemented here
  }

  return {
    id: uuidv4(),
    name,
    description,
    type: FragmentType.COMBINED,
    settings: combinedSettings,
    created: new Date(),
    modified: new Date(),
    parentIds: fragments.map(f => f.id),
    color: color || generateRandomColor()
  };
}

/**
 * Calculate simulation results for a fragment
 */
export function calculateFragmentResults(fragment: Fragment): SimulationDataPoint[] {
  return calculateCompoundInterest(fragment.settings);
}

/**
 * Generate a random color for fragment visualization
 */
function generateRandomColor(): string {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
    '#9966FF', '#FF9F40', '#62BFAD', '#F27173'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}