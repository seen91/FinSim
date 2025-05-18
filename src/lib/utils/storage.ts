import type { Fragment } from './fragmentCreator';

const STORAGE_KEY = 'finsim_fragments';

/**
 * Saves fragments to localStorage
 * @param fragments Array of fragments to save
 */
export function saveFragments(fragments: Fragment[]): void {
  try {
    // Convert Date objects to strings before storing
    const serializedFragments = JSON.stringify(fragments, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return value.toISOString();
      }
      return value;
    });
    
    localStorage.setItem(STORAGE_KEY, serializedFragments);
  } catch (error) {
    console.error('Error saving fragments to localStorage:', error);
  }
}

/**
 * Loads fragments from localStorage
 * @returns Array of fragments or empty array if none found
 */
export function loadFragments(): Fragment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    
    if (!data) {
      return [];
    }
    
    // Convert string dates back to Date objects
    const fragments = JSON.parse(data, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
    
    return Array.isArray(fragments) ? fragments : [];
  } catch (error) {
    console.error('Error loading fragments from localStorage:', error);
    return [];
  }
}

/**
 * Saves a single fragment to localStorage
 * @param fragment Fragment to save
 */
export function saveFragment(fragment: Fragment): void {
  const fragments = loadFragments();
  const existingIndex = fragments.findIndex(f => f.id === fragment.id);
  
  if (existingIndex >= 0) {
    // Update existing fragment
    fragments[existingIndex] = {
      ...fragment,
      updatedAt: new Date()
    };
  } else {
    // Add new fragment
    fragments.push(fragment);
  }
  
  saveFragments(fragments);
}

/**
 * Deletes a fragment from localStorage
 * @param fragmentId ID of the fragment to delete
 * @returns true if fragment was deleted, false otherwise
 */
export function deleteFragment(fragmentId: string): boolean {
  const fragments = loadFragments();
  const initialLength = fragments.length;
  
  const updatedFragments = fragments.filter(f => f.id !== fragmentId);
  
  if (updatedFragments.length !== initialLength) {
    saveFragments(updatedFragments);
    return true;
  }
  
  return false;
}

/**
 * Exports all fragments as JSON file for download
 */
export function exportFragmentsToFile(): void {
  const fragments = loadFragments();
  
  if (fragments.length === 0) {
    alert('No fragments to export');
    return;
  }
  
  const dataStr = JSON.stringify(fragments, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `finsim-fragments-${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

/**
 * Imports fragments from a JSON file
 * @param jsonData JSON string containing fragment data
 * @returns true if import successful, false otherwise
 */
export async function importFragmentsFromJson(jsonData: string): Promise<boolean> {
  try {
    const importedData = JSON.parse(jsonData, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
    
    if (!Array.isArray(importedData)) {
      console.error('Imported data is not an array');
      return false;
    }
    
    const validFragments = importedData.filter(isValidFragment);
    
    if (validFragments.length === 0) {
      console.error('No valid fragments found in import data');
      return false;
    }
    
    // Get current fragments and add new ones
    const currentFragments = loadFragments();
    const mergedFragments = [...currentFragments];
    
    // Add only fragments with IDs that don't already exist
    for (const fragment of validFragments) {
      if (!currentFragments.some(f => f.id === fragment.id)) {
        mergedFragments.push(fragment);
      }
    }
    
    saveFragments(mergedFragments);
    return true;
  } catch (error) {
    console.error('Error importing fragments:', error);
    return false;
  }
}

/**
 * Type guard to validate if an object is a valid Fragment
 * @param obj Object to check
 * @returns true if object is a valid Fragment
 */
function isValidFragment(obj: any): obj is Fragment {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.initialAmount === 'number' &&
    typeof obj.periodicContribution === 'number' &&
    typeof obj.expectedReturn === 'number' &&
    typeof obj.years === 'number' &&
    typeof obj.type === 'string'
  );
}