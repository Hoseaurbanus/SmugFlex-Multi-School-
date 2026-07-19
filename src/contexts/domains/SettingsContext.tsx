// SettingsContext - Focused settings wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { SchoolSettings, BankAccountSettings } from '../../types/school';

interface SettingsDomain {
  schoolSettings: SchoolSettings;
  bankAccountSettings: BankAccountSettings | null;
  currentTerm: string | null;
  currentAcademicYear: string | null;
  updateSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  updateBankAccountSettings: (settings: Omit<BankAccountSettings, 'id' | 'updated_date'>) => void;
  updateCurrentTerm: (term: string) => Promise<void>;
  updateCurrentAcademicYear: (year: string) => Promise<void>;
  updateCurrentTermAndYear: (year: string, term: string) => Promise<void>;
  loadCurrentTermAndYear: () => Promise<{term: string | null, year: string | null}>;
  loadSchoolSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsDomain | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: SettingsDomain = {
    schoolSettings: school.schoolSettings,
    bankAccountSettings: school.bankAccountSettings,
    currentTerm: school.currentTerm,
    currentAcademicYear: school.currentAcademicYear,
    updateSchoolSettings: school.updateSchoolSettings,
    updateBankAccountSettings: school.updateBankAccountSettings,
    updateCurrentTerm: school.updateCurrentTerm,
    updateCurrentAcademicYear: school.updateCurrentAcademicYear,
    updateCurrentTermAndYear: school.updateCurrentTermAndYear,
    loadCurrentTermAndYear: school.loadCurrentTermAndYear,
    loadSchoolSettings: school.loadSchoolSettings,
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsDomain {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
