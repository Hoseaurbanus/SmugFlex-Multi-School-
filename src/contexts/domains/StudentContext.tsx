// StudentContext - Focused student wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { Student, Parent, Attendance } from '../../types/school';

interface StudentDomain {
  students: Student[];
  parents: Parent[];
  attendances: Attendance[];
  addStudent: (student: Omit<Student, 'id'>) => Promise<number>;
  updateStudent: (id: number, student: Partial<Student>) => Promise<void>;
  deleteStudent: (id: number) => Promise<void>;
  deleteBulkStudents: (studentIds: number[]) => Promise<any>;
  getStudentsByClass: (classId: number) => Student[];
  refreshStudents: () => Promise<void>;
  promoteStudent: (studentId: number, newClassId: number, newAcademicYear: string) => void;
  promoteMultipleStudents: (studentIds: number[], classMapping: { [studentId: number]: number }, newAcademicYear: string) => void;
  addParent: (parent: Omit<Parent, 'id'>) => Promise<number>;
  updateParent: (id: number, parent: Partial<Parent>) => Promise<void>;
  deleteParent: (id: number) => Promise<void>;
  getParentStudents: (parentId: number) => Student[];
  linkStudentToParent: (parentId: number, studentId: number, relationship?: 'Father' | 'Mother' | 'Guardian') => Promise<boolean>;
  unlinkStudentFromParent: (parentId: number, studentId: number) => Promise<boolean>;
  addAttendance: (attendance: Omit<Attendance, 'id'>) => Promise<number>;
  updateAttendance: (id: number, attendance: Partial<Attendance>) => Promise<void>;
  deleteAttendance: (id: number) => Promise<void>;
  getAttendanceByStudent: (studentId: number, academicYear: string, term: string) => Attendance[];
  getAttendancesByStudent: (studentId: number) => Attendance[];
  getAttendanceByClass: (classId: number, date: string) => Attendance[];
  createBatchAttendance: (attendanceRecords: Omit<Attendance, 'id'>[]) => Promise<boolean>;
}

const StudentContext = createContext<StudentDomain | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: StudentDomain = {
    students: school.students,
    parents: school.parents,
    attendances: school.attendances,
    addStudent: school.addStudent,
    updateStudent: school.updateStudent,
    deleteStudent: school.deleteStudent,
    deleteBulkStudents: school.deleteBulkStudents,
    getStudentsByClass: school.getStudentsByClass,
    refreshStudents: school.refreshStudents,
    promoteStudent: school.promoteStudent,
    promoteMultipleStudents: school.promoteMultipleStudents,
    addParent: school.addParent,
    updateParent: school.updateParent,
    deleteParent: school.deleteParent,
    getParentStudents: school.getParentStudents,
    linkStudentToParent: school.linkStudentToParent,
    unlinkStudentFromParent: school.unlinkStudentFromParent,
    addAttendance: school.addAttendance,
    updateAttendance: school.updateAttendance,
    deleteAttendance: school.deleteAttendance,
    getAttendanceByStudent: school.getAttendanceByStudent,
    getAttendancesByStudent: school.getAttendancesByStudent,
    getAttendanceByClass: school.getAttendanceByClass,
    createBatchAttendance: school.createBatchAttendance,
  };
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudents(): StudentDomain {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudents must be used within StudentProvider');
  return ctx;
}
