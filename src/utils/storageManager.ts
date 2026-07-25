/**
 * LocalStorage Manager for SMugFlex 2.0
 * Handles data persistence across browser sessions
 */

import { API_CONFIG } from '../config/api';
import { CapacitorHelper } from './capacitorHelper';

const STORAGE_VERSION = '1.0.0';

function getStorageKey(): string {
  try {
    const userStr = localStorage.getItem(API_CONFIG.AUTH.USER_KEY);
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.school_suffix) {
        return `smugflex_${user.school_suffix}_school_data`;
      }
    }
  } catch {}
  return 'smugflex_default_school_data';
}

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

    localStorage.setItem(getStorageKey(), JSON.stringify(storageData));
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
    const data = localStorage.getItem(getStorageKey());
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
    localStorage.removeItem(getStorageKey());
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
    const data = localStorage.getItem(getStorageKey());
    if (!data) return 0;
    return new Blob([data]).size / 1024; // Size in KB
  } catch (error) {
    return 0;
  }
}

/**
 * Export data as JSON file
 */
export async function exportDataAsJSON(data: StorageData, filename?: string): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  await CapacitorHelper.downloadJSON(data, filename || `smugflex_backup_${new Date().toISOString().split('T')[0]}.json`);
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
