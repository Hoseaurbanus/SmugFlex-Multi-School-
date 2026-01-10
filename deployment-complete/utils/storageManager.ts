/**
 * LocalStorage Manager for Graceland Royal Academy
 * Handles data persistence across browser sessions
 */

const STORAGE_KEY = 'graceland_school_data';
const STORAGE_VERSION = '1.0.0';

export interface StorageData {
  version: string;
  lastUpdated: string;
  currentTerm: string;
  currentAcademicYear: string;
  schoolSettings: any;
  bankAccountSettings: any;
  classes: any[];
  teachers: any[];
  subjects: any[];
  students: any[];
  parents: any[];
  accountants: any[];
  subjectAssignments: any[];
  scores: any[];
  affectiveDomains: any[];
  psychomotorDomains: any[];
  compiledResults: any[];
  feeStructures: any[];
  studentFeeBalances: any[];
  payments: any[];
  notifications: any[];
  activityLogs: any[];
  attendances: any[];
  examTimetables: any[];
  classTimetables: any[];
  departments: any[];
  scholarships: any[];
  assignments: any[];
  users: any[];
}

/**
 * Save all school data to localStorage
 */
export function saveToLocalStorage(data: Partial<StorageData>): boolean {
  try {
    const storageData: StorageData = {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      ...data,
    } as StorageData;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load all school data from localStorage
 */
export function loadFromLocalStorage(): StorageData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    
    // Version check
    if (parsed.version !== STORAGE_VERSION) {
      }

    return parsed;
  } catch (error) {
    return null;
  }
}

/**
 * Clear all data from localStorage
 */
export function clearLocalStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage size estimate in KB
 */
export function getStorageSize(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    return new Blob([data]).size / 1024; // Size in KB
  } catch (error) {
    return 0;
  }
}

/**
 * Export data as JSON file
 */
export function exportDataAsJSON(data: StorageData, filename?: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `graceland_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file
 */
export function importDataFromJSON(file: File): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
