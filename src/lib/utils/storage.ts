import type { Fragment } from './fragmentCreator';

// Storage keys
const FRAGMENTS_KEY = 'finsim_fragments';
const SETTINGS_KEY = 'finsim_settings';

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/**
 * Save a fragment to local storage
 * @param fragment The fragment to save
 */
export function saveFragment(fragment: Fragment): void {
  if (!isBrowser) return;

  const fragments = getAllFragments();
  
  // Update if exists, otherwise add
  const index = fragments.findIndex(f => f.id === fragment.id);
  
  if (index >= 0) {
    fragment.modified = new Date();
    fragments[index] = fragment;
  } else {
    fragments.push(fragment);
  }
  
  localStorage.setItem(FRAGMENTS_KEY, JSON.stringify(fragments));
}

/**
 * Save multiple fragments at once
 * @param fragments Array of fragments to save
 */
export function saveFragments(fragments: Fragment[]): void {
  if (!isBrowser) return;

  const existingFragments = getAllFragments();
  
  // Create a map for faster lookups
  const fragmentMap = new Map<string, Fragment>();
  existingFragments.forEach(f => fragmentMap.set(f.id, f));
  
  // Update existing or add new fragments
  fragments.forEach(fragment => {
    fragment.modified = new Date();
    fragmentMap.set(fragment.id, fragment);
  });
  
  localStorage.setItem(FRAGMENTS_KEY, JSON.stringify(Array.from(fragmentMap.values())));
}

/**
 * Get a fragment by its ID
 * @param id The fragment ID
 * @returns The fragment or undefined if not found
 */
export function getFragment(id: string): Fragment | undefined {
  const fragments = getAllFragments();
  return fragments.find(f => f.id === id);
}

/**
 * Get all fragments from local storage
 * @returns Array of fragments
 */
export function getAllFragments(): Fragment[] {
  if (!isBrowser) return [];

  const data = localStorage.getItem(FRAGMENTS_KEY);
  if (!data) return [];
  
  const fragments = JSON.parse(data) as Fragment[];
  
  // Convert date strings back to Date objects
  return fragments.map(f => ({
    ...f,
    created: new Date(f.created),
    modified: new Date(f.modified)
  }));
}

/**
 * Delete a fragment from local storage
 * @param id The ID of the fragment to delete
 * @returns true if fragment was found and deleted, false otherwise
 */
export function deleteFragment(id: string): boolean {
  if (!isBrowser) return false;

  const fragments = getAllFragments();
  const initialLength = fragments.length;
  
  const filteredFragments = fragments.filter(f => f.id !== id);
  
  if (filteredFragments.length !== initialLength) {
    localStorage.setItem(FRAGMENTS_KEY, JSON.stringify(filteredFragments));
    return true;
  }
  
  return false;
}

/**
 * Export fragments to a JSON file for backup
 * @param fragments Fragments to export (or all if not provided)
 */
export function exportFragments(fragments?: Fragment[]): void {
  if (!isBrowser) return;

  const dataToExport = fragments || getAllFragments();
  
  const dataStr = JSON.stringify(dataToExport, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `finsim_fragments_${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

/**
 * Import fragments from a JSON file
 * @param jsonData The JSON data containing fragments
 * @returns Number of fragments successfully imported
 */
export function importFragments(jsonData: string): number {
  if (!isBrowser) return 0;

  try {
    const importedFragments = JSON.parse(jsonData) as Fragment[];
    
    // Validate that imported data has required fragment properties
    const validFragments = importedFragments.filter(f => 
      f.id && f.name && f.type && f.settings && f.created && f.modified
    );
    
    if (validFragments.length > 0) {
      saveFragments(validFragments);
    }
    
    return validFragments.length;
  } catch (error) {
    console.error('Failed to import fragments:', error);
    return 0;
  }
}

/**
 * Save application settings to local storage
 * @param settings The settings object to save
 */
export function saveSettings<T>(settings: T): void {
  if (!isBrowser) return;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Get application settings from local storage
 * @returns The settings object or null if not found
 */
export function getSettings<T>(): T | null {
  if (!isBrowser) return null;

  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return null;
  return JSON.parse(data) as T;
}

/**
 * Clear all stored data (fragments and settings)
 */
export function clearAllData(): void {
  if (!isBrowser) return;

  localStorage.removeItem(FRAGMENTS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}