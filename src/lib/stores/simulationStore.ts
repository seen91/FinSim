import { writable, derived } from 'svelte/store';
import type { Fragment } from '../utils/fragmentCreator';
import { calculateCompoundInterest, type SimulationDataPoint } from '../utils/financialCalculations';
import * as storage from '../utils/storage';

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

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

// Create the settings store with default values
export const simulationSettings = writable<SimulationSettings>(defaultSettings);

// Create fragment stores
export const fragments = writable<Fragment[]>([]);
export const activeFragmentId = writable<string | null>(null);

// Create simulation results store
export const simulationResults = writable<SimulationDataPoint[]>([]);

// Derived store for the active fragment
export const activeFragment = derived(
  [fragments, activeFragmentId], 
  ([$fragments, $activeFragmentId]) => {
    if (!$activeFragmentId) return null;
    return $fragments.find(f => f.id === $activeFragmentId) || null;
  }
);

// Derived store for comparative fragments (for visualization)
export const comparisonFragments = writable<Fragment[]>([]);

/**
 * Load all fragments from storage
 */
export function loadFragments(): void {
  if (!isBrowser) return;
  
  const savedFragments = storage.getAllFragments();
  fragments.set(savedFragments);
}

/**
 * Save a fragment and update the store
 */
export function saveFragment(fragment: Fragment): void {
  if (!isBrowser) return;
  
  storage.saveFragment(fragment);
  
  // Update the fragments store
  fragments.update(currentFragments => {
    const index = currentFragments.findIndex(f => f.id === fragment.id);
    if (index >= 0) {
      currentFragments[index] = fragment;
      return [...currentFragments];
    } else {
      return [...currentFragments, fragment];
    }
  });
}

/**
 * Delete a fragment and update the store
 */
export function deleteFragment(id: string): void {
  if (!isBrowser) return;
  
  storage.deleteFragment(id);
  
  // Update the fragments store
  fragments.update(currentFragments => {
    return currentFragments.filter(f => f.id !== id);
  });
  
  // Clear active fragment if it's being deleted
  activeFragmentId.update(currentId => {
    if (currentId === id) return null;
    return currentId;
  });
  
  // Remove from comparison if present
  comparisonFragments.update(fragments => {
    return fragments.filter(f => f.id !== id);
  });
}

/**
 * Run simulation for the current settings
 */
export function runSimulation(settings: SimulationSettings): void {
  const results = calculateCompoundInterest(settings);
  simulationResults.set(results);
}

/**
 * Run simulation for the active fragment
 */
export function runActiveFragmentSimulation(): void {
  activeFragment.subscribe(fragment => {
    if (fragment) {
      const results = calculateCompoundInterest(fragment.settings);
      simulationResults.set(results);
    }
  })();
}

/**
 * Add fragment to comparison
 */
export function addToComparison(fragment: Fragment): void {
  comparisonFragments.update(fragments => {
    if (!fragments.find(f => f.id === fragment.id)) {
      return [...fragments, fragment];
    }
    return fragments;
  });
}

/**
 * Remove fragment from comparison
 */
export function removeFromComparison(id: string): void {
  comparisonFragments.update(fragments => {
    return fragments.filter(f => f.id !== id);
  });
}

// Initialize by loading fragments only in browser environment
if (isBrowser) {
  loadFragments();
}