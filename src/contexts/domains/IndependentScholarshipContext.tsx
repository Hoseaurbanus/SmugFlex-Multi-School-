import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import sqlDatabase from '../../services/sqlDatabase';
import { getCurrentUser } from '../../config/api';
import type { Scholarship } from '../../types/school';

interface ScholarshipContextType {
  scholarships: Scholarship[];
  isLoading: boolean;
  loadScholarships: () => Promise<void>;
  addScholarship: (scholarship: Omit<Scholarship, 'id'>) => Promise<number>;
  updateScholarship: (id: number, scholarship: Partial<Scholarship>) => Promise<void>;
  deleteScholarship: (id: number) => Promise<void>;
  getScholarshipsByStudent: (studentId: number) => Scholarship[];
  getScholarshipsByClass: (classId: number) => Scholarship[];
}

const ScholarshipContext = createContext<ScholarshipContextType | null>(null);

export function ScholarshipProvider({ children }: { children: ReactNode }) {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadScholarships = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM scholarships ORDER BY academic_year, student_id');
      if (result?.data) {
        setScholarships(result.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addScholarship = useCallback(async (scholarship: Omit<Scholarship, 'id'>): Promise<number> => {
    try {
      const currentUser = await getCurrentUser();
      const dbPayload: Record<string, unknown> = {
        ...scholarship,
        current_beneficiaries: scholarship.beneficiaries,
        created_by: currentUser?.id || 0,
      };
      delete dbPayload.beneficiaries;

      const insertId = await sqlDatabase.insertRecord('scholarships', dbPayload);
      await loadScholarships();
      return Number(insertId) || 0;
    } catch {
      return 0;
    }
  }, [loadScholarships]);

  const updateScholarship = useCallback(async (id: number, scholarship: Partial<Scholarship>): Promise<void> => {
    try {
      const dbPayload: Record<string, unknown> = { ...scholarship };
      if (dbPayload.beneficiaries !== undefined) {
        dbPayload.current_beneficiaries = dbPayload.beneficiaries;
        delete dbPayload.beneficiaries;
      }
      await sqlDatabase.updateRecord('scholarships', id, dbPayload);
      await loadScholarships();
    } catch {
      // Silent fail
    }
  }, [loadScholarships]);

  const deleteScholarship = useCallback(async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteRecord('scholarships', id);
      await loadScholarships();
    } catch {
      // Silent fail
    }
  }, [loadScholarships]);

  const getScholarshipsByStudent = useCallback((studentId: number): Scholarship[] => {
    return scholarships.filter(s => s.student_id === studentId);
  }, [scholarships]);

  const getScholarshipsByClass = useCallback((classId: number): Scholarship[] => {
    return scholarships.filter(s => s.class_id === classId);
  }, [scholarships]);

  return (
    <ScholarshipContext.Provider value={{
      scholarships,
      isLoading,
      loadScholarships,
      addScholarship,
      updateScholarship,
      deleteScholarship,
      getScholarshipsByStudent,
      getScholarshipsByClass,
    }}>
      {children}
    </ScholarshipContext.Provider>
  );
}

export function useScholarships(): ScholarshipContextType {
  const ctx = useContext(ScholarshipContext);
  if (!ctx) throw new Error('useScholarships must be used within ScholarshipProvider');
  return ctx;
}
