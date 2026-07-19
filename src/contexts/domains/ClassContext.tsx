// ClassContext - Focused class/subject wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { Class, Subject, SubjectAssignment, SubjectRegistration, Teacher, Student } from '../../types/school';

interface ClassDomain {
  classes: Class[];
  subjects: Subject[];
  subjectAssignments: SubjectAssignment[];
  subjectRegistrations: SubjectRegistration[];
  addClass: (classData: Omit<Class, 'id'>) => Promise<number>;
  updateClass: (id: number, classData: Partial<Class>) => Promise<boolean>;
  deleteClass: (id: number) => Promise<boolean>;
  getClassesByLevel: (level: string) => Class[];
  getClassStudents: (classId: number) => Student[];
  getClassTeacher: (classId: number) => Teacher | null;
  getClassSubjects: (classId: number) => Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<number>;
  updateSubject: (id: number, subject: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: number) => Promise<void>;
  getSubjectsByCategory: (category: string) => Subject[];
  getSubjectsByLevel: (level: string) => Subject[];
  registerSubjectForClass: (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory?: boolean) => Promise<boolean>;
  removeSubjectRegistration: (classId: number, subjectId: number, academicYear: string, term: string) => Promise<boolean>;
  getRegisteredSubjects: (classId: number, academicYear: string, term: string) => Subject[];
  getSubjectRegistrations: (academicYear: string, term: string) => SubjectRegistration[];
  assignSubjectToTeacher: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  removeSubjectAssignment: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  getSubjectAssignments: (academicYear: string, term: string) => SubjectAssignment[];
  getTeacherSubjectAssignments: (teacherId: number, academicYear: string, term: string) => SubjectAssignment[];
  getClassSubjectAssignments: (classId: number, academicYear: string, term: string) => SubjectAssignment[];
  getUnassignedSubjects: (classId: number, academicYear: string, term: string) => Subject[];
  getAvailableTeachers: (academicYear: string, term: string, subjectId: number, classId: number) => Teacher[];
}

const ClassContext = createContext<ClassDomain | null>(null);

export function ClassProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: ClassDomain = {
    classes: school.classes,
    subjects: school.subjects,
    subjectAssignments: school.subjectAssignments,
    subjectRegistrations: school.subjectRegistrations,
    addClass: school.addClass,
    updateClass: school.updateClass,
    deleteClass: school.deleteClass,
    getClassesByLevel: school.getClassesByLevel,
    getClassStudents: school.getClassStudents,
    getClassTeacher: school.getClassTeacher,
    getClassSubjects: school.getClassSubjects,
    addSubject: school.addSubject,
    updateSubject: school.updateSubject,
    deleteSubject: school.deleteSubject,
    getSubjectsByCategory: school.getSubjectsByCategory,
    getSubjectsByLevel: school.getSubjectsByLevel,
    registerSubjectForClass: school.registerSubjectForClass,
    removeSubjectRegistration: school.removeSubjectRegistration,
    getRegisteredSubjects: school.getRegisteredSubjects,
    getSubjectRegistrations: school.getSubjectRegistrations,
    assignSubjectToTeacher: school.assignSubjectToTeacher,
    removeSubjectAssignment: school.removeSubjectAssignment,
    getSubjectAssignments: school.getSubjectAssignments,
    getTeacherSubjectAssignments: school.getTeacherSubjectAssignments,
    getClassSubjectAssignments: school.getClassSubjectAssignments,
    getUnassignedSubjects: school.getUnassignedSubjects,
    getAvailableTeachers: school.getAvailableTeachers,
  };
  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

export function useClasses(): ClassDomain {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error('useClasses must be used within ClassProvider');
  return ctx;
}
