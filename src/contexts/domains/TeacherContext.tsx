// TeacherContext - Focused teacher wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { Teacher, SubjectAssignment, Student } from '../../types/school';

interface TeacherDomain {
  teachers: Teacher[];
  addTeacher: (teacher: any) => Promise<number>;
  updateTeacher: (id: number, teacher: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: number) => Promise<void>;
  updateTeacherStatus: (id: number, status: string) => Promise<void>;
  getTeacherAssignments: (teacherId: number) => SubjectAssignment[];
  getTeacherAssignmentsForCurrentTerm: (teacherId: number) => SubjectAssignment[];
  getTeacherClasses: (teacherId: number) => Promise<Array<{
    classId: number;
    className: string;
    classLevel: string;
    studentCount: number;
    subjects: Array<{ subjectId: number; subjectName: string; subjectCode: string }>;
  }>>;
  getTeacherStudents: (teacherId: number, classId: number) => Student[];
  getTeacherResponsibilities: (teacherId: number) => {
    isClassTeacher: boolean;
    assignedClassesCount: number;
    totalStudentsCount: number;
    subjectsCount: number;
    canEnterScores: boolean;
    canCompileResults: boolean;
    canViewResults: boolean;
    canManageAttendance: boolean;
    canManageAffectivePsychomotor: boolean;
    canManageTimetable: boolean;
    canMessageParents: boolean;
    departments: string[];
    classTeacherClassesCount: number;
    subjectAssignedClassesCount: number;
    classTeacherClassIds: number[];
    subjectAssignedClassIds: number[];
  };
}

const TeacherContext = createContext<TeacherDomain | null>(null);

export function TeacherProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: TeacherDomain = {
    teachers: school.teachers,
    addTeacher: school.addTeacher,
    updateTeacher: school.updateTeacher,
    deleteTeacher: school.deleteTeacher,
    updateTeacherStatus: school.updateTeacherStatus,
    getTeacherAssignments: school.getTeacherAssignments,
    getTeacherAssignmentsForCurrentTerm: school.getTeacherAssignmentsForCurrentTerm,
    getTeacherClasses: school.getTeacherClasses,
    getTeacherStudents: school.getTeacherStudents,
    getTeacherResponsibilities: school.getTeacherResponsibilities,
  };
  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}

export function useTeachers(): TeacherDomain {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeachers must be used within TeacherProvider');
  return ctx;
}
