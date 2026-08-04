import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import sqlDatabase from '../../services/sqlDatabase';
import type { Assignment } from '../../types/school';

interface AssignmentContextType {
  assignments: Assignment[];
  isLoading: boolean;
  loadAssignments: () => Promise<void>;
  addAssignment: (assignment: Omit<Assignment, 'id'>) => Promise<number>;
  updateAssignment: (id: number, assignment: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: number) => Promise<void>;
  getAssignmentById: (id: number) => Assignment | undefined;
  getAssignmentsByClass: (classId: number) => Assignment[];
  getAssignmentsBySubject: (subjectId: number) => Assignment[];
}

const AssignmentContext = createContext<AssignmentContextType | null>(null);

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM assignments ORDER BY assigned_date DESC');
      if (result?.data) {
        setAssignments(result.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAssignment = useCallback(async (assignment: Omit<Assignment, 'id'>): Promise<number> => {
    try {
      const dbPayload = {
        title: assignment.title,
        description: assignment.description || '',
        class_id: assignment.class_id,
        subject_id: assignment.subject_id,
        teacher_id: assignment.teacher_id,
        due_date: assignment.due_date,
        max_score: assignment.max_score || 100,
        assigned_date: assignment.assigned_date || new Date().toISOString().split('T')[0],
      };
      const insertId = await sqlDatabase.insertRecord('assignments', dbPayload);
      await loadAssignments();
      return Number(insertId) || 0;
    } catch {
      return 0;
    }
  }, [loadAssignments]);

  const updateAssignment = useCallback(async (id: number, assignment: Partial<Assignment>): Promise<void> => {
    try {
      await sqlDatabase.updateRecord('assignments', id, assignment);
      await loadAssignments();
    } catch {
      // Silent fail
    }
  }, [loadAssignments]);

  const deleteAssignment = useCallback(async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteRecord('assignments', id);
      await loadAssignments();
    } catch {
      // Silent fail
    }
  }, [loadAssignments]);

  const getAssignmentById = useCallback((id: number): Assignment | undefined => {
    return assignments.find(a => a.id === id);
  }, [assignments]);

  const getAssignmentsByClass = useCallback((classId: number): Assignment[] => {
    return assignments.filter(a => a.class_id === classId);
  }, [assignments]);

  const getAssignmentsBySubject = useCallback((subjectId: number): Assignment[] => {
    return assignments.filter(a => a.subject_id === subjectId);
  }, [assignments]);

  return (
    <AssignmentContext.Provider value={{
      assignments,
      isLoading,
      loadAssignments,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      getAssignmentById,
      getAssignmentsByClass,
      getAssignmentsBySubject,
    }}>
      {children}
    </AssignmentContext.Provider>
  );
}

export function useAssignments(): AssignmentContextType {
  const ctx = useContext(AssignmentContext);
  if (!ctx) throw new Error('useAssignments must be used within AssignmentProvider');
  return ctx;
}
