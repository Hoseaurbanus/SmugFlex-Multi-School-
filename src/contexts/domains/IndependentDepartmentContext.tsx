import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import sqlDatabase from '../../services/sqlDatabase';
import type { Department } from '../../types/school';

interface DepartmentContextType {
  departments: Department[];
  isLoading: boolean;
  loadDepartments: () => Promise<void>;
  addDepartment: (department: Omit<Department, 'id'>) => Promise<number>;
  updateDepartment: (id: number, department: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: number) => Promise<void>;
  getDepartmentById: (id: number) => Department | undefined;
}

const DepartmentContext = createContext<DepartmentContextType | null>(null);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM departments ORDER BY name');
      if (result?.data) {
        setDepartments(result.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addDepartment = useCallback(async (department: Omit<Department, 'id'>): Promise<number> => {
    try {
      const dbPayload = {
        name: department.name,
        code: department.code || '',
        description: department.description || '',
      };
      const insertId = await sqlDatabase.insertRecord('departments', dbPayload);
      await loadDepartments();
      return Number(insertId) || 0;
    } catch {
      return 0;
    }
  }, [loadDepartments]);

  const updateDepartment = useCallback(async (id: number, department: Partial<Department>): Promise<void> => {
    try {
      await sqlDatabase.updateRecord('departments', id, department);
      await loadDepartments();
    } catch {
      // Silent fail
    }
  }, [loadDepartments]);

  const deleteDepartment = useCallback(async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteRecord('departments', id);
      await loadDepartments();
    } catch {
      // Silent fail
    }
  }, [loadDepartments]);

  const getDepartmentById = useCallback((id: number): Department | undefined => {
    return departments.find(d => d.id === id);
  }, [departments]);

  return (
    <DepartmentContext.Provider value={{
      departments,
      isLoading,
      loadDepartments,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      getDepartmentById,
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartments(): DepartmentContextType {
  const ctx = useContext(DepartmentContext);
  if (!ctx) throw new Error('useDepartments must be used within DepartmentProvider');
  return ctx;
}
