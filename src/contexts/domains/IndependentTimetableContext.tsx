import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import sqlDatabase from '../../services/sqlDatabase';
import type { ExamTimetable, ClassTimetable } from '../../types/school';

interface TimetableContextType {
  examTimetables: ExamTimetable[];
  classTimetables: ClassTimetable[];
  isLoading: boolean;
  loadExamTimetables: () => Promise<void>;
  loadClassTimetables: () => Promise<void>;
  addExamTimetable: (timetable: Omit<ExamTimetable, 'id'>) => Promise<number>;
  updateExamTimetable: (id: number, timetable: Partial<ExamTimetable>) => Promise<void>;
  deleteExamTimetable: (id: number) => Promise<void>;
  getExamTimetables: (classId: number, academicYear: string, term: string) => ExamTimetable[];
  getExamTimetablesByClass: (classId: number) => ExamTimetable[];
  getExamTimetablesBySubject: (subjectId: number) => ExamTimetable[];
  getExamTimetablesByDate: (date: string) => ExamTimetable[];
  addClassTimetable: (timetable: Omit<ClassTimetable, 'id'>) => Promise<number>;
  updateClassTimetable: (id: number, timetable: Partial<ClassTimetable>) => Promise<void>;
  deleteClassTimetable: (id: number) => Promise<void>;
  getClassTimetables: (classId: number, academicYear: string, term: string) => ClassTimetable[];
  getClassTimetablesByClass: (classId: number) => ClassTimetable[];
  getClassTimetablesBySubject: (subjectId: number) => ClassTimetable[];
  getClassTimetablesByDay: (day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday') => ClassTimetable[];
}

const TimetableContext = createContext<TimetableContextType | null>(null);

export function TimetableProvider({ children }: { children: ReactNode }) {
  const [examTimetables, setExamTimetables] = useState<ExamTimetable[]>([]);
  const [classTimetables, setClassTimetables] = useState<ClassTimetable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadExamTimetables = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await sqlDatabase.getExamTimetables();
      setExamTimetables(result);
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadClassTimetables = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM class_timetables ORDER BY day_of_week, start_time');
      if (result?.data) {
        setClassTimetables(result.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExamTimetables();
    loadClassTimetables();
  }, [loadExamTimetables, loadClassTimetables]);

  const addExamTimetable = useCallback(async (timetable: Omit<ExamTimetable, 'id'>): Promise<number> => {
    try {
      const result = await sqlDatabase.createExamTimetable(timetable);
      await loadExamTimetables();
      return result.id;
    } catch {
      return 0;
    }
  }, [loadExamTimetables]);

  const updateExamTimetable = useCallback(async (id: number, timetable: Partial<ExamTimetable>): Promise<void> => {
    try {
      await sqlDatabase.updateExamTimetable(id, timetable);
      await loadExamTimetables();
    } catch {
      // Silent fail
    }
  }, [loadExamTimetables]);

  const deleteExamTimetable = useCallback(async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteExamTimetable(id);
      await loadExamTimetables();
    } catch {
      // Silent fail
    }
  }, [loadExamTimetables]);

  const getExamTimetables = useCallback((classId: number, academicYear: string, term: string) => {
    return examTimetables.filter(t => t.class_id === classId && t.academic_year === academicYear && t.term === term);
  }, [examTimetables]);

  const getExamTimetablesByClass = useCallback((classId: number) => {
    return examTimetables.filter(t => t.class_id === classId);
  }, [examTimetables]);

  const getExamTimetablesBySubject = useCallback((subjectId: number) => {
    return examTimetables.filter(t => t.subject_id === subjectId);
  }, [examTimetables]);

  const getExamTimetablesByDate = useCallback((date: string) => {
    return examTimetables.filter(t => t.exam_date === date);
  }, [examTimetables]);

  const addClassTimetable = useCallback(async (timetable: Omit<ClassTimetable, 'id'>): Promise<number> => {
    try {
      const newId = classTimetables.length > 0 ? Math.max(...classTimetables.map(t => t.id)) + 1 : 1;
      const newTimetable = { ...timetable, id: newId };
      setClassTimetables([...classTimetables, newTimetable]);
      return newId;
    } catch {
      return 0;
    }
  }, [classTimetables]);

  const updateClassTimetable = useCallback(async (id: number, timetable: Partial<ClassTimetable>): Promise<void> => {
    setClassTimetables(classTimetables.map(t => (t.id === id ? { ...t, ...timetable } : t)));
  }, [classTimetables]);

  const deleteClassTimetable = useCallback(async (id: number): Promise<void> => {
    setClassTimetables(classTimetables.filter(t => t.id !== id));
  }, [classTimetables]);

  const getClassTimetables = useCallback((classId: number, academicYear: string, term: string) => {
    return classTimetables.filter(t => t.class_id === classId && t.academic_year === academicYear && t.term === term);
  }, [classTimetables]);

  const getClassTimetablesByClass = useCallback((classId: number) => {
    return classTimetables.filter(t => t.class_id === classId);
  }, [classTimetables]);

  const getClassTimetablesBySubject = useCallback((subjectId: number) => {
    return classTimetables.filter(t => t.subject_id === subjectId);
  }, [classTimetables]);

  const getClassTimetablesByDay = useCallback((dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday') => {
    return classTimetables.filter(t => t.day_of_week === dayOfWeek);
  }, [classTimetables]);

  return (
    <TimetableContext.Provider value={{
      examTimetables,
      classTimetables,
      isLoading,
      loadExamTimetables,
      loadClassTimetables,
      addExamTimetable,
      updateExamTimetable,
      deleteExamTimetable,
      getExamTimetables,
      getExamTimetablesByClass,
      getExamTimetablesBySubject,
      getExamTimetablesByDate,
      addClassTimetable,
      updateClassTimetable,
      deleteClassTimetable,
      getClassTimetables,
      getClassTimetablesByClass,
      getClassTimetablesBySubject,
      getClassTimetablesByDay,
    }}>
      {children}
    </TimetableContext.Provider>
  );
}

export function useTimetables(): TimetableContextType {
  const ctx = useContext(TimetableContext);
  if (!ctx) throw new Error('useTimetables must be used within TimetableProvider');
  return ctx;
}
