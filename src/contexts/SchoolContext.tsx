// School Context
// SMugFlex 2.0 Multi-School Management Platform
// UPDATED: Dec 30, 2025 - Testing build cache

// Module-level guard to prevent duplicate initial loads across StrictMode
let globalInitialLoadStarted = false;
let globalInitialLoadCompleted = false;

// Detect page refresh to reset guards
if (typeof window !== 'undefined') {
  const navigationType = (window.performance && window.performance.navigation) 
    ? window.performance.navigation.type 
    : null;
  // 1 = TYPE_RELOAD (page refresh)
  if (navigationType === 1) {
    globalInitialLoadStarted = false;
    globalInitialLoadCompleted = false;
  }
}

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { setAuthToken, setCurrentUser as setApiCurrentUser, getAuthToken, removeAuthToken, API_CONFIG, getCurrentUser as getApiCurrentUser } from '../config/api';
import { tokenManager } from '../utils/tokenManager';
import sqlDatabase from '../services/sqlDatabase';
import { normalizeParentStudentLinks } from '../utils/schoolHelpers';
import type {
  Student, Parent, Class, Subject, SubjectAssignment, SubjectRegistration,
  Score, AffectiveDomain, PsychomotorDomain, CompiledResult,
  CumulativeResult,
  FeeStructure, StudentFeeBalance, StudentInvoiceSummary,
  Payment, CreatePaymentPayload,
  Teacher, User, Accountant,
  Notification, Attendance,
  Department,
  CbtExam, CbtQuestion, CbtAttempt, CbtQuestionBank,
  SchoolSettings, BankAccountSettings, Scholarship, Assignment,
  ParentStudentLink, ClassTeacherAssignment, SchoolSetting, RealtimeEvent, ParentChildData
} from '../types/school';

// ==================== INTERFACES ====================
// Re-export all types from the centralized types module for backward compatibility
export type {
  Student, Parent, Class, Subject, SubjectAssignment, SubjectRegistration,
  Score, AffectiveDomain, PsychomotorDomain, CompiledResult,
  CumulativeSubjectEntry, CumulativeResult,
  FeeStructure, StudentFeeBalance, StudentInvoiceSummary,
  Payment, CreatePaymentPayload,
  Teacher, User, LoginResponse, Accountant,
  Notification, ActivityLog, Attendance,
  ExamTimetable, ClassTimetable, Department,
  CbtExam, CbtQuestion, CbtAttempt, CbtQuestionBank,
  SchoolSettings, BankAccountSettings, Scholarship, Assignment
} from '../types/school';

// ==================== CONTEXT ====================

export interface SchoolContextType {
  // Data
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
  accountants: Accountant[];
  classes: Class[];
  parentChildrenData: ParentChildData[];
  feeBalances: StudentFeeBalance[];
  subjects: Subject[];
  subjectAssignments: SubjectAssignment[];
  classTeacherAssignments: ClassTeacherAssignment[];
  subjectRegistrations: SubjectRegistration[];
  scores: Score[];
  affectiveDomains: AffectiveDomain[];
  psychomotorDomains: PsychomotorDomain[];
  compiledResults: CompiledResult[];
  cumulativeResults: CumulativeResult[];
  loadingCumulative: boolean;
  payments: Payment[];
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  feeStructures: FeeStructure[];
  studentFeeBalances: StudentFeeBalance[];
  notifications: Notification[];
  attendances: Attendance[];
  cbtExams: CbtExam[];
  cbtQuestions: CbtQuestion[];
  cbtAttempts: CbtAttempt[];
  cbtQuestionBank: CbtQuestionBank[];
  parentStudentLinks: ParentStudentLink[];
  attendanceRequirements: Record<string, number>;

  // State Setters
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  setParents: React.Dispatch<React.SetStateAction<Parent[]>>;
  setAccountants: React.Dispatch<React.SetStateAction<Accountant[]>>;
  setStudents: (students: Student[]) => void;
  setClasses: (classes: Class[]) => void;
  setSubjects: (subjects: Subject[]) => void;
  setSubjectRegistrations: (registrations: SubjectRegistration[]) => void;
  setSubjectAssignments: (assignments: SubjectAssignment[]) => void;
  setClassTeacherAssignments: (assignments: ClassTeacherAssignment[]) => void;
  setScores: (scores: Score[]) => void;
  setAffectiveDomains: (domains: AffectiveDomain[]) => void;
  setPsychomotorDomains: (domains: PsychomotorDomain[]) => void;
  setCompiledResults: (results: CompiledResult[]) => void;
  setPayments: (payments: Payment[]) => void;
  setFeeStructures: (structures: FeeStructure[]) => void;
  setStudentFeeBalances: (balances: StudentFeeBalance[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setAttendances: (attendances: Attendance[]) => void;
  setCbtExams: (exams: CbtExam[]) => void;
  setCbtQuestions: (questions: CbtQuestion[]) => void;
  setCbtAttempts: (attempts: CbtAttempt[]) => void;
  setCbtQuestionBank: (bank: CbtQuestionBank[]) => void;

  // Settings
  currentTerm: string | null;
  currentAcademicYear: string | null;
  schoolSettings: SchoolSettings;
  bankAccountSettings: BankAccountSettings | null;
  
  // System Settings Methods
  loadCurrentTermAndYear: () => Promise<{term: string | null, year: string | null}>;
  loadSchoolSettings: () => Promise<void>;
  getAllAcademicYears: () => Promise<string[]>;
  getCompiledResultsByYearAndTerm: (academicYear: string, term: string) => Promise<CompiledResult[]>;
  updateCurrentTerm: (term: string) => Promise<void>;
  updateCurrentAcademicYear: (year: string) => Promise<void>;
  updateCurrentTermAndYear: (year: string, term: string) => Promise<void>;
  updateSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  updateTermDates: (dates: {
    termStartDate: string;
    termEndDate: string;
    nextTermStarts: string;
    schoolResumptionDate: string;
    midTermBreakStart: string;
    midTermBreakEnd: string;
  }) => Promise<void>;
  getTermDates: () => {
    termStartDate: string;
    termEndDate: string;
    nextTermStarts: string;
    schoolResumptionDate: string;
    midTermBreakStart: string;
    midTermBreakEnd: string;
  };
  loadTermDates: () => Promise<void>;
  updateBankAccountSettings: (settings: Omit<BankAccountSettings, 'id' | 'updated_date'>) => void;
  getBankAccountSettings: () => BankAccountSettings | null;
  updateAttendanceRequirements: (requirements: Record<string, number>) => Promise<void>;
  getAttendanceRequirements: () => Record<string, number>;
  loadAttendanceRequirements: () => Promise<Record<string, number>>;

  // Student Methods
  addStudent: (student: Omit<Student, 'id'>) => Promise<number>;
  updateStudent: (id: number, student: Partial<Student>) => Promise<void>;
  deleteStudent: (id: number) => Promise<void>;
  deleteBulkStudents: (studentIds: number[]) => Promise<{ success: boolean }>;
  createStudentAPI: (studentData: Omit<Student, 'id'>) => Promise<Student | null>;
  updateStudentAPI: (id: number, studentData: Partial<Student>) => Promise<boolean>;
  deleteStudentAPI: (id: number) => Promise<boolean>;
  getStudentsByClass: (classId: number) => Student[];
  refreshStudents: () => Promise<void>;
  promoteStudent: (studentId: number, newClassId: number, newAcademicYear: string) => void;
  promoteMultipleStudents: (studentIds: number[], classMapping: { [studentId: number]: number }, newAcademicYear: string) => void;

  // Teacher Methods
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<number>;
  addUser: (user: Omit<User, 'id'>) => Promise<number>;
  updateTeacher: (id: number, teacher: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: number) => Promise<void>;
  getTeacherAssignments: (teacherId: number) => SubjectAssignment[];
  getTeacherAssignmentsForCurrentTerm: (teacherId: number) => SubjectAssignment[];
  getTeacherSubjectsForCurrentTerm: (teacherId: number) => Array<{
    assignment: SubjectAssignment;
    subject: Subject | undefined;
    class: Class | undefined;
  }>;
  getTeacherClasses: (teacherId: number) => Promise<Array<{
    classId: number;
    className: string;
    classLevel: string;
    studentCount: number;
    subjects: Array<{
      subjectId: number;
      subjectName: string;
      subjectCode: string;
    }>;
  }>>;
  updateTeacherStatus: (id: number, status: string) => Promise<void>;
  getTeacherClassTeacherAssignments: (teacherId: number) => number[];
  validateClassTeacherAssignment: (teacherId: number, newClassId: number) => { valid: boolean; message: string };
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

  // Parent Methods
  addParent: (parent: Omit<Parent, 'id'>) => Promise<number>;
  updateParent: (id: number, parent: Partial<Parent>) => Promise<void>;
  deleteParent: (id: number) => Promise<void>;
  getParentStudents: (parentId: number) => Student[];
  getParentChildren: (parentId: number) => Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    admissionNumber: string;
    classId: number;
    className: string;
    classLevel: string;
    gender: string;
    photoUrl?: string;
    status: string;
    academicYear: string;
    currentTerm: string;
    subjects: Array<{
      subjectId: number;
      subjectName: string;
      subjectCode: string;
      isCompulsory: boolean;
      teacherId?: number;
      teacherName: string;
    }>;
    recentScores: Score[];
    averageScore: number;
    feeBalance: number;
    totalFees: number;
    feeStatus: string;
    attendanceRecords: Attendance[];
    attendanceRate: number;
    recentActivities: Array<{
      type: string;
      title: string;
      description: string;
      date: string;
      icon: string;
    }>;
  }>;
  getStudentSubjects: (studentId: number) => Array<{
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    isCompulsory: boolean;
    teacherId?: number;
    teacherName: string;
  }>;
  getStudentRecentScores: (studentId: number) => Score[];
  getStudentRecentActivities: (studentId: number) => Array<{
    type: string;
    title: string;
    description: string;
    date: string;
    icon: string;
  }>;
  linkStudentToParent: (parentId: number, studentId: number, relationship?: 'Father' | 'Mother' | 'Guardian') => Promise<boolean>;
  linkParentToStudent: (parentId: number, studentId: number) => Promise<void>;
  unlinkStudentFromParent: (parentId: number, studentId: number) => Promise<boolean>;
  getParentPermissions: (parentId: number) => Array<{
    module: string;
    permissions: string[];
  }>;

  // Accountant Methods
  addAccountant: (accountant: Omit<Accountant, 'id'>) => Promise<number>;
  updateAccountant: (id: number, accountant: Partial<Accountant>) => Promise<void>;
  deleteAccountant: (id: number) => Promise<void>;

  // Class Methods
  addClass: (classData: Omit<Class, 'id'>) => Promise<number>;
  updateClass: (id: number, classData: Partial<Class>) => Promise<boolean>;
  deleteClass: (id: number) => Promise<boolean>;
  getClassesByLevel: (level: string) => Class[];
  getClassStudents: (classId: number) => Student[];
  getClassTeacher: (classId: number) => Teacher | null;
  getClassSubjects: (classId: number) => Subject[];
  updateClassTeacher: (classId: number, teacherId: number) => Promise<void>;
  updateClassStudentCount: (classId: number) => Promise<void>;

  // Subject Methods
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<number>;
  updateSubject: (id: number, subject: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: number) => Promise<void>;
  createSubjectAPI: (subjectData: Omit<Subject, 'id'>) => Promise<number>;
  updateSubjectAPI: (id: number, subjectData: Partial<Subject>) => Promise<boolean>;
  deleteSubjectAPI: (id: number) => Promise<boolean>;
  getSubjectsByCategory: (category: string) => Subject[];
  getSubjectsByLevel: (level: string) => Subject[];

  // Subject Registration Methods
  registerSubjectForClass: (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory?: boolean) => Promise<boolean>;
  removeSubjectRegistration: (classId: number, subjectId: number, academicYear: string, term: string) => Promise<boolean>;
  getRegisteredSubjects: (classId: number, academicYear: string, term: string) => Subject[];
  getSubjectRegistrations: (academicYear: string, term: string) => SubjectRegistration[];

  // Subject Assignment Methods
  assignSubjectToTeacher: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  removeSubjectAssignment: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  getSubjectAssignments: (academicYear: string, term: string) => SubjectAssignment[];
  getTeacherSubjectAssignments: (teacherId: number, academicYear: string, term: string) => SubjectAssignment[];
  getClassSubjectAssignments: (classId: number, academicYear: string, term: string) => SubjectAssignment[];
  getUnassignedSubjects: (classId: number, academicYear: string, term: string) => Subject[];
  getAvailableTeachers: (academicYear: string, term: string, subjectId: number, classId: number) => Teacher[];

  // Score Methods
  addScore: (score: Omit<Score, 'id'>) => Promise<number>;
  updateScore: (id: number, score: Partial<Score>) => Promise<void>;
  deleteScore: (id: number) => Promise<void>;
  createBatchScores: (batchScores: Omit<Score, 'id'>[]) => Promise<boolean>;
  getScoresByStudent: (studentId: number) => Score[];
  getScoresByAssignment: (subjectAssignmentId: number) => Score[];
  getScoresByClass: (classId: number, academicYear: string, term: string) => Score[];
  rejectScore: (scoreId: number, rejectionReason: string, rejectedBy: number) => Promise<void>;
  approveScore: (scoreId: number, approvedBy: number) => Promise<void>;
  submitScores: (assignmentId: number) => Promise<void>;
  getPendingScores: (classId?: number) => Score[];

  // Result Methods
  addCompiledResult: (result: Omit<CompiledResult, 'id'>) => Promise<number>;
  updateCompiledResult: (id: number, result: Partial<CompiledResult>) => Promise<void>;
  deleteCompiledResult: (id: number) => Promise<void>;
  getCompiledResults: (academicYear: string, term: string) => CompiledResult[];
  getResultsByClass: (classId: number, academicYear: string, term: string) => CompiledResult[];
  getResultsByStudent: (studentId: number, academicYear: string, term: string) => CompiledResult[];
  approveCompiledResult: (id: number) => Promise<void>;
  publishCompiledResult: (id: number) => Promise<void>;

  // Attendance Methods
  addAttendance: (attendance: Omit<Attendance, 'id'>) => Promise<number>;
  updateAttendance: (id: number, attendance: Partial<Attendance>) => Promise<void>;
  deleteAttendance: (id: number) => Promise<void>;
  getAttendanceByStudent: (studentId: number, academicYear: string, term: string) => Attendance[];
  getAttendancesByStudent: (studentId: number) => Attendance[];
  getAttendanceByClass: (classId: number, date: string) => Attendance[];
  getAttendancesByClass: (classId: number) => Attendance[];
  getAttendancesByDate: (date: string) => Attendance[];
  getAttendanceSummary: (classId: number, academicYear: string, term: string) => Array<{
    studentId: number;
    studentName: string;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;
  }>;
  createBatchAttendance: (attendanceRecords: Omit<Attendance, 'id'>[]) => Promise<boolean>;

  // Payment Methods
  addPayment: (payment: CreatePaymentPayload) => Promise<void>;
  updatePayment: (id: number, payment: Partial<Payment>) => Promise<void>;
  verifyPayment: (
    id: number,
    data?: {
      action: 'verify' | 'reject';
      rejection_reason?: string;
      adjusted_amount?: number;
      adjustment_reason?: string;
    }
  ) => Promise<void>;
  rejectPayment: (id: number, reason: string) => Promise<void>;
  reversePayment: (id: number, reason: string) => Promise<void>;
  getPaymentsByStudent: (studentId: number) => Payment[];

  // User Management Methods
  login: (identity: string, password: string, role: string) => Promise<User | null>;
  studentLogin: (admissionNumber: string, className: string) => Promise<User | null>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  createUser: (userData: Omit<User, 'id'>) => Promise<User | null>;
  updateUser: (id: number, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (id: number) => Promise<boolean>;
  updateUserStatus: (id: number, status: string) => Promise<boolean>;
  resetUserPassword: (id: number) => Promise<string>;
  getUserPermissions: (userId: number) => Promise<string[]>;
  createUserAPI: (userData: Omit<User, 'id'>) => Promise<User | null>;
  updateUserAPI: (id: number, userData: Partial<User>) => Promise<boolean>;
  deleteUserAPI: (id: number) => Promise<boolean>;
  updateUserStatusAPI: (id: number, status: string) => Promise<boolean>;
  resetUserPasswordAPI: (id: number, newPassword?: string) => Promise<string>;
  getUserPermissionsAPI: (userId: number) => Promise<string[]>;
  checkUserPermissionAPI: (role: string, permission: string) => boolean;
  getPendingApprovals: () => CompiledResult[];

  // Fee Management Methods
  addFeeStructure: (feeStructure: Omit<FeeStructure, 'id'>) => Promise<number>;
  updateFeeStructure: (id: number, feeStructure: Partial<FeeStructure>) => Promise<void>;
  deleteFeeStructure: (id: number) => Promise<void>;
  getFeeStructures: (classId: number, academicYear: string) => FeeStructure[];
  getFeeStructureByClass: (classId: number, term: string, academicYear: string) => FeeStructure | null;
  getStudentFeeBalance: (studentId: number) => StudentFeeBalance | null;
  updateStudentFeeBalance: (studentId: number, balance: Partial<StudentFeeBalance>) => Promise<void>;

  // Invoice Ledger Methods (Backend Authoritative)
  autoGenerateInvoices: (classId: number, term: string, academicYear: string) => Promise<{ success: boolean; message: string; count: number }>;
  getStudentInvoice: (studentId: number, term: string, academicYear: string) => Promise<StudentInvoiceSummary>;
  getClassInvoices: (classId: number, term: string, academicYear: string) => Promise<StudentInvoiceSummary[]>;

  // Notification Methods
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<number>;
  markNotificationAsRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  getUnreadNotifications: () => Notification[];
  getAllNotifications: () => Notification[];

  // CBT Methods
  loadCbtExamsFromAPI: () => Promise<boolean>;
  loadCbtQuestionsFromAPI: (examId: number) => Promise<boolean>;
  loadCbtAttemptsFromAPI: (examId?: number) => Promise<boolean>;
  loadCbtQuestionBankFromAPI: (params?: Record<string, string | number>) => Promise<boolean>;
  loadCbtStudentExamsFromAPI: () => Promise<boolean>;
  loadCbtMyAttemptsFromAPI: () => Promise<boolean>;
  createCbtExam: (exam: Omit<CbtExam, 'id' | 'total_marks' | 'published' | 'status' | 'created_at'>) => Promise<number>;
  updateCbtExam: (id: number, exam: Partial<CbtExam>) => Promise<void>;
  deleteCbtExam: (id: number) => Promise<void>;
  publishCbtExam: (id: number) => Promise<void>;
  addCbtQuestion: (examId: number, question: Omit<CbtQuestion, 'id'>) => Promise<number>;
  updateCbtQuestion: (examId: number, questionId: number, question: Partial<CbtQuestion>) => Promise<void>;
  deleteCbtQuestion: (examId: number, questionId: number) => Promise<void>;
  reorderCbtQuestions: (examId: number, order: {question_id: number; sort_order: number}[]) => Promise<void>;
  addToCbtQuestionBank: (question: Omit<CbtQuestionBank, 'id'>) => Promise<number>;
  deleteFromCbtQuestionBank: (id: number) => Promise<void>;
  importFromCbtBank: (examId: number, questionIds: number[]) => Promise<{ imported: number; skipped: number }>;
  startCbtAttempt: (examId: number) => Promise<CbtAttempt>;
  saveCbtAnswer: (attemptId: number, questionId: number, answer: string | string[]) => Promise<void>;
  submitCbtAttempt: (attemptId: number, tabSwitchCount?: number) => Promise<CbtAttempt>;
  getCbtAttemptDetail: (attemptId: number) => Promise<CbtAttempt>;
  getCbtExamResults: (examId: number) => Promise<CbtAttempt[]>;
  feedCbtExamScores: (examId: number, scoreSlot: string) => Promise<{ success: boolean }>;
  deleteCbtExamScores: (examId: number) => Promise<void>;
  bulkImportQuestions: (examId: number, questions: Omit<CbtQuestion, 'id'>[]) => Promise<{ imported: number; errors: string[] }>;
  uploadQuestionImage: (file: File) => Promise<{ url: string }>;
  generateQuestionsFromMaterial: (materialText: string, questionType: string, count: number, options?: { difficulty?: string; exam_type?: string; topic?: string; include_explanations?: boolean }) => Promise<CbtQuestion[]>;

  // Data Loading Methods
  loadUsersFromAPI: () => Promise<boolean>;
  loadTeachersFromAPI: () => Promise<boolean>;
  loadParentsFromAPI: () => Promise<boolean>;
  loadParentStudentLinksFromAPI: () => Promise<boolean>;
  getParentChildrenFromAPI: (parentId: number) => Promise<ParentChildData[]>;
  loadAccountantsFromAPI: () => Promise<boolean>;
  loadStudentsFromAPI: () => Promise<boolean>;
  loadClassesFromAPI: (force?: boolean) => Promise<boolean>;
  loadSubjectsFromAPI: () => Promise<boolean>;
  loadSubjectRegistrationsFromAPI: () => Promise<boolean>;
  loadSubjectAssignmentsFromAPI: (forceReload?: boolean, termParam?: string | null, yearParam?: string | null) => Promise<boolean>;
  loadAllDataFromAPI: () => Promise<void>;
  loadFeeStructuresFromAPI: () => Promise<boolean>;
  loadStudentFeeBalancesFromAPI: () => Promise<boolean>;
  loadNotificationsFromAPI: () => Promise<boolean>;
  loadAttendancesFromAPI: () => Promise<boolean>;
  loadScoresFromAPI: (termParam?: string | null, academicYearParam?: string | null) => Promise<boolean>;
  loadCompiledResultsFromAPI: (
    statusParam?: string | null,
    termParam?: string | null,
    academicYearParam?: string | null
  ) => Promise<boolean>;
  loadAffectiveDomainsFromAPI: (termParam?: string | null, academicYearParam?: string | null) => Promise<boolean>;
  loadPsychomotorDomainsFromAPI: (termParam?: string | null, academicYearParam?: string | null) => Promise<boolean>;
  loadClassTeacherAssignmentsFromAPI: (forceReload?: boolean, termParam?: string | null, yearParam?: string | null) => Promise<boolean>;
  loadCumulativeResultsFromAPI: (classId: number, academicYear: string) => Promise<CumulativeResult[]>;
  compileCumulativeResults: (classId: number, academicYear: string) => Promise<{ success: boolean; message: string; count: number }>;

  // Payment API Methods
  createPaymentAPI: (payment: any) => Promise<any>;
  loadPaymentsFromAPI: (allHistory?: boolean) => Promise<boolean>;
  getPaymentExceptions: (pendingOnlineMinutes?: number, pendingBankHours?: number) => Promise<{ pending: Payment[]; verified: Payment[] }>;
  createFeeStructureAPI: (feeStructure: any) => Promise<any>;
  getFeeStructuresAPI: () => Promise<FeeStructure[]>;
  getPaymentsAPI: () => Promise<Payment[]>;
  updatePaymentStatusAPI: (paymentId: number, status: string) => Promise<{ success: boolean }>;
  getFeeBalancesAPI: () => Promise<StudentFeeBalance[]>;
  createBatchPaymentsAPI: (payments: CreatePaymentPayload[]) => Promise<{ success: boolean; count: number }>;

  // Subject Registration API Methods
  registerSubjectForClassAPI: (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory?: boolean) => Promise<boolean>;
  removeSubjectRegistrationAPI: (classId: number, subjectId: number, academicYear: string, term: string) => Promise<boolean>;
  getSubjectRegistrationsAPI: (classId?: number, academicYear?: string, term?: string) => Promise<SubjectRegistration[]>;
  getRegisteredSubjectsAPI: (classId: number, academicYear: string, term: string) => Promise<Subject[]>;
  getActiveAcademicYearAPI: () => Promise<string | null>;
  getActiveTermAPI: () => Promise<string | null>;

  // Subject Assignment API Methods
  getSubjectAssignmentsAPI: (academicYear: string, term: string) => Promise<SubjectAssignment[]>;
  assignSubjectToTeacherAPI: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  removeSubjectAssignmentAPI: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  getUnassignedSubjectsAPI: (classId: number, academicYear: string, term: string) => Promise<Subject[]>;
  getAvailableTeachersAPI: (academicYear: string, term: string, subjectId: number, classId: number) => Promise<Teacher[]>;

  // Teacher API Methods
  createTeacherAPI: (teacherData: Omit<Teacher, 'id'>) => Promise<Teacher | null>;
  updateTeacherAPI: (id: number, teacherData: Partial<Teacher>) => Promise<boolean>;
  deleteTeacherAPI: (id: number) => Promise<boolean>;
  updateTeacherStatusAPI: (id: number, status: string) => Promise<boolean>;

  // Parent API Methods
  createParentAPI: (parentData: Omit<Parent, 'id'>) => Promise<Parent | null>;
  updateParentAPI: (id: number, parentData: Partial<Parent>) => Promise<boolean>;
  deleteParentAPI: (id: number) => Promise<boolean>;
  updateParentStatusAPI: (id: number, status: string) => Promise<boolean>;

  // Accountant API Methods
  createAccountantAPI: (accountantData: Omit<Accountant, 'id'>) => Promise<Accountant | null>;
  updateAccountantAPI: (id: number, accountantData: Partial<Accountant>) => Promise<boolean>;
  deleteAccountantAPI: (id: number) => Promise<boolean>;
  updateAccountantStatusAPI: (id: number, status: string) => Promise<boolean>;

  // Affective and Psychomotor API Methods
  addAffectiveDomain: (affectiveData: any) => Promise<any>;
  createAffectiveDomain: (affectiveData: any) => Promise<any>;
  updateAffectiveDomain: (id: number, affectiveData: any) => Promise<any>;
  deleteAffectiveDomain: (id: number) => Promise<void>;
  addPsychomotorDomain: (psychomotorData: any) => Promise<any>;
  createPsychomotorDomain: (psychomotorData: any) => Promise<any>;
  updatePsychomotorDomain: (id: number, psychomotorData: any) => Promise<any>;
  deletePsychomotorDomain: (id: number) => Promise<void>;

  // Real-time Sync Methods (MINIMAL)
  refreshTermData: () => Promise<void>;
  refreshTeacherData: (teacherId: number) => Promise<void>;
  refreshClassData: (classId: number) => Promise<void>;
  
  // Permission checking methods
  hasPermission: (permission: string) => Promise<boolean>;
  canViewStudents: () => Promise<boolean>;
  canManageScores: () => Promise<boolean>;
  canViewResults: () => Promise<boolean>;
  canManageClasses: () => Promise<boolean>;
  canManageSubjects: () => Promise<boolean>;
  
  // Real-time event listeners
  subscribeToDataUpdates: (callback: () => void) => () => void;
};

// ==================== CONTEXT PROVIDER ====================

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within SchoolProvider');
  }
  return context;
}

// ==================== PROVIDER ====================

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [currentTerm, setCurrentTerm] = useState<string | null>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string | null>(null);
  
  // Term dates state - initialize empty, load from database
  const [termDates, setTermDates] = useState({
    termStartDate: '',
    termEndDate: '',
    nextTermStarts: '',
    schoolResumptionDate: '',
    midTermBreakStart: '',
    midTermBreakEnd: ''
  });
  
  // Cache for academic year and term
  const termAndYearCache = useRef<{ term: string | null, year: string | null, timestamp: number }>({ term: null, year: null, timestamp: 0 });
  
  // Ref to track last teacher ID for logging frequency control
  const lastTeacherIdRef = useRef<number | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCumulative, setLoadingCumulative] = useState(false);

  // Initialize auth state from local storage on mount
  // MOVED TO BOTTOM of component to ensure access to data loading functions
  // See: useEffect with initAuth call near the end of the component
  
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    school_name: '',
    school_motto: '',
    principal_name: '',
    head_teacher_name: '',
    principal_comment: '',
    head_teacher_comment: '',
    resumption_date: ''
  });

  const [bankAccountSettings, setBankAccountSettings] = useState<BankAccountSettings | null>(null);

  // Initialize empty data arrays - All data created through the system
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [subjectRegistrations, setSubjectRegistrations] = useState<SubjectRegistration[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<any[]>([]);

  const lastLoadedSubjectAssignmentsKeyRef = useRef<string | null>(null);
  const lastLoadedClassTeacherAssignmentsKeyRef = useRef<string | null>(null);

  const [scores, setScores] = useState<Score[]>([]);
  const [affectiveDomains, setAffectiveDomains] = useState<AffectiveDomain[]>([]);
  const [psychomotorDomains, setPsychomotorDomains] = useState<PsychomotorDomain[]>([]);
  const [compiledResults, setCompiledResults] = useState<CompiledResult[]>([]);
  const [cumulativeResults, setCumulativeResults] = useState<CumulativeResult[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFeeBalances, setStudentFeeBalances] = useState<StudentFeeBalance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceRequirements, setAttendanceRequirements] = useState<Record<string, number>>({});

  const realtimeEventSourceRef = useRef<EventSource | null>(null);
  const realtimeReconnectTimerRef = useRef<number | null>(null);
  const realtimePollingTimerRef = useRef<number | null>(null);
  const pendingRealtimeTopicsRef = useRef<Set<string>>(new Set());
  const realtimeFlushTimerRef = useRef<number | null>(null);
  const lastRealtimeEventIdRef = useRef<number>(0);

  const realtimeLoadersRef = useRef<{
    loadSchoolSettings?: () => Promise<void>;
    loadClassesFromAPI?: (force?: boolean) => Promise<boolean>;
    loadStudentsFromAPI?: () => Promise<boolean>;
    loadParentStudentLinksFromAPI?: () => Promise<boolean>;
    loadSubjectsFromAPI?: (forceReload?: boolean) => Promise<boolean>;
    loadSubjectAssignmentsFromAPI?: (forceReload?: boolean, termParam?: string | null, yearParam?: string | null) => Promise<boolean>;
    loadClassTeacherAssignmentsFromAPI?: (forceReload?: boolean, termParam?: string | null, yearParam?: string | null) => Promise<boolean>;
    loadScoresFromAPI?: (termParam?: string | null, academicYearParam?: string | null) => Promise<boolean>;
    loadCompiledResultsFromAPI?: (statusParam?: string | null, termParam?: string | null, academicYearParam?: string | null) => Promise<boolean>;
    loadNotificationsFromAPI?: () => Promise<boolean>;
    loadPaymentsFromAPI?: () => Promise<boolean>;
    loadTeachersFromAPI?: () => Promise<boolean>;
    loadParentsFromAPI?: () => Promise<boolean>;
    loadUsersFromAPI?: () => Promise<boolean>;
    loadAttendancesFromAPI?: () => Promise<boolean>;
  }>({});

  const flushRealtimeTopics = useCallback(async () => {
    const topics = Array.from(pendingRealtimeTopicsRef.current);
    pendingRealtimeTopicsRef.current.clear();
    if (topics.length === 0) return;

    const role = String(currentUser?.role || '').toLowerCase();

    try {
      const jobs: Array<Promise<any>> = [];

      if (topics.includes('school_settings')) {
        if (realtimeLoadersRef.current.loadSchoolSettings) {
          jobs.push(realtimeLoadersRef.current.loadSchoolSettings());
        }
      }

      if (topics.includes('classes')) {
        if (realtimeLoadersRef.current.loadClassesFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadClassesFromAPI(true));
        }
      }

      if (topics.includes('students')) {
        // Parents do not load global students list.
        if (role !== 'parent') {
          if (realtimeLoadersRef.current.loadStudentsFromAPI) {
            jobs.push(realtimeLoadersRef.current.loadStudentsFromAPI());
          }
        } else {
          // Parent views depend on linked children + results/notifications.
          // Avoid broad parent list reload here; it is admin-only in some deployments.
          if (realtimeLoadersRef.current.loadParentStudentLinksFromAPI) {
            jobs.push(realtimeLoadersRef.current.loadParentStudentLinksFromAPI());
          }
        }
      }

      if (topics.includes('subjects') && role !== 'parent') {
        if (realtimeLoadersRef.current.loadSubjectsFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadSubjectsFromAPI());
        }
      }

      if (topics.includes('subject_assignments') && role !== 'parent') {
        if (realtimeLoadersRef.current.loadSubjectAssignmentsFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadSubjectAssignmentsFromAPI(true));
        }
        if (realtimeLoadersRef.current.loadClassTeacherAssignmentsFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadClassTeacherAssignmentsFromAPI(true));
        }
      }

      if (topics.includes('scores')) {
        // Always safe; loadScoresFromAPI enforces RBAC.
        if (realtimeLoadersRef.current.loadScoresFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadScoresFromAPI());
        }
      }

      if (topics.includes('compiled_results')) {
        // Parents should only ever see approved results.
        if (role === 'parent') {
          if (realtimeLoadersRef.current.loadCompiledResultsFromAPI) {
            jobs.push(realtimeLoadersRef.current.loadCompiledResultsFromAPI('Approved', null, currentAcademicYear ?? null));
          }
        } else {
          // null => load all statuses
          if (realtimeLoadersRef.current.loadCompiledResultsFromAPI) {
            jobs.push(realtimeLoadersRef.current.loadCompiledResultsFromAPI(null));
          }
        }
      }

      if (topics.includes('notifications')) {
        if (realtimeLoadersRef.current.loadNotificationsFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadNotificationsFromAPI());
        }
      }

      if (topics.includes('payments')) {
        // loadPaymentsFromAPI internally guards by role.
        if (realtimeLoadersRef.current.loadPaymentsFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadPaymentsFromAPI());
        }
      }

      if (topics.includes('teachers') && role !== 'parent') {
        if (realtimeLoadersRef.current.loadTeachersFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadTeachersFromAPI());
        }
      }

      if (topics.includes('parents')) {
        if (realtimeLoadersRef.current.loadParentsFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadParentsFromAPI());
        }
        if (role === 'parent' && realtimeLoadersRef.current.loadParentStudentLinksFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadParentStudentLinksFromAPI());
        }
      }

      if (topics.includes('users') && role === 'admin') {
        if (realtimeLoadersRef.current.loadUsersFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadUsersFromAPI());
        }
      }

      if (topics.includes('attendance')) {
        if (realtimeLoadersRef.current.loadAttendancesFromAPI) {
          jobs.push(realtimeLoadersRef.current.loadAttendancesFromAPI());
        }
      }

      await Promise.all(jobs);
    } catch (e) {
      // Do not toast here; realtime is best-effort and should be silent.
    }
  }, [currentUser, currentAcademicYear]);

  const scheduleRealtimeRefresh = useCallback((topic: string) => {
    pendingRealtimeTopicsRef.current.add(topic);
    if (realtimeFlushTimerRef.current) {
      window.clearTimeout(realtimeFlushTimerRef.current);
    }
    realtimeFlushTimerRef.current = window.setTimeout(() => {
      realtimeFlushTimerRef.current = null;
      flushRealtimeTopics();
    }, 250);
  }, [flushRealtimeTopics]);

  const startRealtimePollingFallback = useCallback(() => {
    if (realtimePollingTimerRef.current) return;

    realtimePollingTimerRef.current = window.setInterval(() => {
      try {
        if (document.visibilityState !== 'visible') return;
        if (!navigator.onLine) return;

        scheduleRealtimeRefresh('notifications');
        scheduleRealtimeRefresh('compiled_results');
        scheduleRealtimeRefresh('scores');
        scheduleRealtimeRefresh('students');
        scheduleRealtimeRefresh('classes');
        scheduleRealtimeRefresh('payments');
      } catch {
        // ignore
      }
    }, 15000);
  }, [scheduleRealtimeRefresh]);

  const stopRealtimePollingFallback = useCallback(() => {
    if (!realtimePollingTimerRef.current) return;
    window.clearInterval(realtimePollingTimerRef.current);
    realtimePollingTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      if (realtimeEventSourceRef.current) {
        realtimeEventSourceRef.current.close();
        realtimeEventSourceRef.current = null;
      }
      stopRealtimePollingFallback();
      return;
    }

    const token = tokenManager.getToken() || getAuthToken();
    if (!token) return;

    if (realtimeEventSourceRef.current) {
      realtimeEventSourceRef.current.close();
      realtimeEventSourceRef.current = null;
    }

    // SSE cannot work through Vercel middleware proxy (fetch buffers responses,
    // killing the streaming connection). Always use polling fallback instead.
    const isProxy = API_CONFIG.BASE_URL.startsWith('/');
    if (isProxy) {
      startRealtimePollingFallback();
      return;
    }

    const url = `${API_CONFIG.BASE_URL}/realtime/stream?token=${encodeURIComponent(String(token))}&lastEventId=${encodeURIComponent(String(lastRealtimeEventIdRef.current || 0))}`;

    const es = new EventSource(url);
    realtimeEventSourceRef.current = es;

    es.addEventListener('hello', () => {
      // connected
      stopRealtimePollingFallback();
    });

    es.addEventListener('update', (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(String(evt.data || '{}')) as RealtimeEvent;
        const id = Number(parsed?.id);
        if (Number.isFinite(id) && id > 0) {
          lastRealtimeEventIdRef.current = id;
        }

        const topic = String(parsed?.topic || '').trim();
        if (!topic) return;

        if (topic === 'notifications' && parsed?.payload?.action === 'created') {
          const notifTargetAudience = String(parsed?.payload?.target_audience || '').toLowerCase();
          const userRole = (currentUser?.role || '').toLowerCase();
          const isForUser =
            notifTargetAudience === 'all' ||
            notifTargetAudience === userRole ||
            (notifTargetAudience === 'students' && userRole === 'student') ||
            userRole === 'admin';
          if (isForUser) {
            toast.info('New Notification', {
              description: 'A new notification has been received.',
              duration: 5000,
            });
          }
        }

        scheduleRealtimeRefresh(topic);
      } catch (e) {
        // ignore malformed events
      }
    });

    es.onerror = () => {
      startRealtimePollingFallback();
      // EventSource auto-reconnects, but in some hosting setups it can get stuck.
      // We force a clean reconnect after a short delay.
      if (realtimeReconnectTimerRef.current) {
        return;
      }
      realtimeReconnectTimerRef.current = window.setTimeout(() => {
        realtimeReconnectTimerRef.current = null;
        try {
          if (realtimeEventSourceRef.current) {
            realtimeEventSourceRef.current.close();
            realtimeEventSourceRef.current = null;
          }
        } catch {}
        // Re-run this effect by updating a topic flush (no-op) and relying on token/user deps.
        scheduleRealtimeRefresh('notifications');
      }, 3000);
    };

    return () => {
      try {
        if (realtimeEventSourceRef.current) {
          realtimeEventSourceRef.current.close();
          realtimeEventSourceRef.current = null;
        }
      } catch {}
      stopRealtimePollingFallback();
      if (realtimeReconnectTimerRef.current) {
        window.clearTimeout(realtimeReconnectTimerRef.current);
        realtimeReconnectTimerRef.current = null;
      }
    };
  }, [currentUser, scheduleRealtimeRefresh, startRealtimePollingFallback, stopRealtimePollingFallback]);

  function calculateSessionPromotionMetrics(
    studentId: number,
    academicYear: string
  ): {
    termCount: number;
    sessionAverage: number;
    sessionAttendancePct: number;
    status: 'Promoted' | 'Repeated';
  } {
    const TERMS = ['First Term', 'Second Term', 'Third Term'];
    const results = (compiledResults || []).filter((r: any) =>
      Number(r.student_id) === Number(studentId) &&
      String(r.academic_year) === String(academicYear) &&
      r.status === 'Approved' &&
      TERMS.includes(String(r.term))
    );

    const termAverages = results
      .map((r: any) => {
        const raw = r?.average_score;
        const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
        return Number.isFinite(n) ? n : 0;
      })
      .filter((n: number) => Number.isFinite(n));

    const termCount = termAverages.length;
    const sessionAverage = termCount > 0
      ? termAverages.reduce((a: number, b: number) => a + b, 0) / termCount
      : 0;

    const totalPresent = results.reduce((sum: number, r: any) => sum + (Number(r.times_present) || 0), 0);
    const totalDays = results.reduce((sum: number, r: any) => sum + (Number(r.total_attendance_days) || 0), 0);
    const sessionAttendancePct = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;

    const status = (sessionAverage >= 50 && sessionAttendancePct >= 50) ? 'Promoted' : 'Repeated';
    return { termCount, sessionAverage, sessionAttendancePct, status };
  }

  const [users, setUsers] = useState<User[]>([]);
  const [parentStudentLinksData, setParentStudentLinksData] = useState<any[]>([]);
  const [parentChildrenData, setParentChildrenData] = useState<any[]>([]);

  const [cbtExams, setCbtExams] = useState<CbtExam[]>([]);
  const [cbtQuestions, setCbtQuestions] = useState<CbtQuestion[]>([]);
  const [cbtAttempts, setCbtAttempts] = useState<CbtAttempt[]>([]);
  const [cbtQuestionBank, setCbtQuestionBank] = useState<CbtQuestionBank[]>([]);

  // Loading guards to prevent concurrent calls
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  
  // Ref to prevent duplicate initial loads
  const initialLoadDone = useRef(false);

  // Ref to prevent concurrent loadDataForUser calls (do not tie to isDataLoading state)
  const loadDataForUserInFlight = useRef(false);

  // ==================== SETTINGS LOADING ====================

  const loadCurrentTermAndYear = async (): Promise<{term: string | null, year: string | null}> => {
    try {
      // Loading current term and academic year from database
      
      // Try to load from API first
      const response = await api.get('/school_settings.php');
      const responseData = response.data as any;
      let loadedTerm: string | null = null;
      let loadedYear: string | null = null;
      
      if (response && response.success && Array.isArray(responseData)) {
        const settings: any[] = responseData;
        
        // Find current_term and current_academic_year
        const termSetting = settings.find((s: any) => s.setting_key === 'current_term');
        const yearSetting = settings.find((s: any) => s.setting_key === 'current_academic_year');
        
        if (termSetting && termSetting.setting_value) {
          loadedTerm = termSetting.setting_value;
          setCurrentTerm(loadedTerm);
        }
        
        if (yearSetting && yearSetting.setting_value) {
          loadedYear = yearSetting.setting_value;
          setCurrentAcademicYear(loadedYear);
        }
        
        // Update cache
        termAndYearCache.current = {
          term: loadedTerm,
          year: loadedYear,
          timestamp: Date.now()
        };
      } else {
        // Failed to load settings from API, keeping defaults
      }
      
      return { term: loadedTerm, year: loadedYear };
    } catch (error) {
      console.error('loadCurrentTermAndYear error:', error);
      return { term: null, year: null };
    }
  };

  const reversePayment = async (id: number, reason: string): Promise<void> => {
    try {
      if (!reason || !reason.trim()) {
        throw new Error('Reversal reason is required');
      }

      const response = await api.post<any>(`/payments/reverse/${id}`, { reason: reason.trim() });

      if (response.success) {
        await loadPaymentsFromAPI();
        toast.success('Payment reversed successfully');
      } else {
        throw new Error(response.message || 'Failed to reverse payment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reverse payment');
      throw error;
    }
  };

  const getParentChildrenFromAPI = async (parentId: number): Promise<any[]> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.get<any>(API_CONFIG.ENDPOINTS.PARENTS.CHILDREN(parentId));
      if (response && response.success) {
        const children = (response.data as any) || [];
        const rows = Array.isArray(children) ? children : (Array.isArray((children as any)?.items) ? (children as any).items : []);
        setParentChildrenData(rows);
        return rows;
      }
      setParentChildrenData([]);
      return [];
    } catch (error) {
      setParentChildrenData([]);
      return [];
    }
  };

  // User API Methods
  const loadUsersFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      const hasToken = await tokenManager.ensureToken(currentUser);
      if (!hasToken) {
        console.error('[loadUsersFromAPI] No valid token available');
      }
      
      let allUsers: any[] = [];
      
      // Attempt REST endpoint with pagination
      if (hasToken) {
        let page = 1;
        let hasMore = true;
        const MAX_RETRIES = 3;
        const MAX_PAGES = 100;
        let lastError: any = null;
        
        while (hasMore && page <= MAX_PAGES) {
          let retries = 0;
          let success = false;
          
          while (!success && retries < MAX_RETRIES) {
            try {
              if (page > 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }

              const response = await api.get(API_CONFIG.ENDPOINTS.USERS.LIST, { page, limit: 50 });
              
              if (response.success && response.data) {
                const data = response.data as any;
                const items = data.items || [];
                const pagination = data.pagination || {};
                
                allUsers = allUsers.concat(items);
                
                if (page >= pagination.total_pages || !pagination.has_next) {
                  hasMore = false;
                } else {
                  page++;
                }
                success = true;
              } else {
                hasMore = false;
                success = true;
              }
            } catch (error: any) {
              lastError = error;
              retries++;
              if (retries >= MAX_RETRIES) {
                hasMore = false;
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
              }
            }
          }
        }
        
        if (allUsers.length > 0) {
          setUsers(allUsers);
          return true;
        }
        
        if (lastError) {
          console.error('[loadUsersFromAPI] REST failed after retries:', lastError);
        }
      }
      
      // Fallback: load users via SQL query layer when REST endpoint fails.
      // Uses JOINs (no subqueries) so extractTableName() correctly matches FROM users
      // and database/query.php auto-injects users.school_id into WHERE.
      try {
        const sqlResult = await sqlDatabase.executeQuery(
          `SELECT u.*,
                  COALESCE(t.first_name, p.first_name, a.first_name, '') as first_name,
                  COALESCE(t.last_name, p.last_name, a.last_name, '') as last_name,
                  CASE 
                      WHEN u.role = 'teacher' THEN CONCAT_WS(' ', t.first_name, t.last_name)
                      WHEN u.role = 'parent' THEN CONCAT_WS(' ', p.first_name, p.last_name)
                      WHEN u.role = 'accountant' THEN CONCAT_WS(' ', a.first_name, a.last_name)
                      ELSE u.username
                  END as display_name,
                  CASE 
                      WHEN u.role = 'teacher' THEN t.phone
                      WHEN u.role = 'parent' THEN p.phone
                      WHEN u.role = 'accountant' THEN a.phone
                      ELSE NULL
                  END as phone
           FROM users u
           LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'
           LEFT JOIN parents p ON u.linked_id = p.id AND u.role = 'parent'
           LEFT JOIN accountants a ON u.linked_id = a.id AND u.role = 'accountant'
           ORDER BY u.created_at DESC`
        );

        const rows: any[] = Array.isArray((sqlResult as any)?.data) ? (sqlResult as any).data : [];
        if (rows.length > 0) {
          setUsers(rows);
          return true;
        }

        console.error('[loadUsersFromAPI] SQL fallback returned empty');
      } catch (fallbackError: any) {
        console.error('[loadUsersFromAPI] SQL fallback failed:', fallbackError);
      }
      
      toast.error('Failed to load users. Check console for details.');
      return false;
    } catch (error) {
      console.error('[loadUsersFromAPI] Unexpected error:', error);
      return false;
    }
  };

  const getPaymentExceptions = async (pendingOnlineMinutes: number = 60, pendingBankHours: number = 48): Promise<any> => {
    try {
      await tokenManager.ensureToken(currentUser);

      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'accountant')) {
        throw new Error('Not authorized');
      }

      const url = `/payments/exceptions?pending_online_minutes=${encodeURIComponent(String(pendingOnlineMinutes))}&pending_bank_hours=${encodeURIComponent(String(pendingBankHours))}`;
      const response = await api.get<any>(url);

      if (!response || response.success !== true) {
        throw new Error(response?.message || 'Failed to load payment exceptions');
      }

      return response.data;
    } catch (error: any) {
      throw error;
    }
  };

  const loadTeachersFromAPI = async (): Promise<boolean> => {
    // Prevent concurrent calls
    if (isLoadingTeachers) {
      return true;
    }
    
    // Prevent excessive calls with better rate limiting
    const now = Date.now();
    const TEACHERS_CACHE_DURATION = 5000; // 5 seconds cache
    
    // Check if we have teachers data and it's recent
    if (teachers.length > 0 && (now - lastLoadTime) < TEACHERS_CACHE_DURATION) {
      return true; // Use cached data if recent
    }
    
    try {
      setIsLoadingTeachers(true);
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Robust pagination to fetch the full list (fixes 20-item limit)
      let allTeachers: any[] = [];
      let page = 1;
      const limit = 100; // fetch larger pages to reduce requests
      const MAX_PAGES = 100;
      let hasMore = true;

      while (hasMore && page <= MAX_PAGES) {
        const res = await api.get(API_CONFIG.ENDPOINTS.TEACHERS.LIST, { page, limit });
        if (res && res.success) {
          const payload: any = res.data || {};
          const items: any[] = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
          const pagination = payload?.pagination || res.pagination || {};

          if (items.length > 0) {
            allTeachers = allTeachers.concat(items);
          }

          const totalPages = pagination.totalPages || pagination.total_pages;
          const hasNext = pagination.has_next ?? (totalPages ? page < totalPages : items.length === limit);

          if (!hasNext) {
            hasMore = false;
          } else {
            page += 1;
          }
        } else {
          // Fallback: if API returns a plain array without pagination
          const fallbackData: any = res?.data;
          if (Array.isArray(fallbackData)) {
            allTeachers = fallbackData;
          }
          hasMore = false;
        }
      }

      if (allTeachers.length > 0) {
        const teachersWithComputed = allTeachers.map((teacher: any) => ({
          ...teacher,
          is_class_teacher: teacher.is_class_teacher || teacher.isClassTeacher,
          department_id: teacher.department_id || teacher.departmentId,
          firstName: teacher.firstName || teacher.first_name,
          lastName: teacher.lastName || teacher.last_name,
          employeeId: teacher.employeeId || teacher.employee_id,
        }));
        setTeachers(teachersWithComputed);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  const loadParentsFromAPI = async (): Promise<boolean> => {
    try {
      const effectiveUser: any = currentUser || getApiCurrentUser();
      // Ensure token is available
      await tokenManager.ensureToken(effectiveUser);

      // Parents are not allowed to use /database/query. Load only their own parent record via REST.
      if (String(effectiveUser?.role || '').toLowerCase() === 'parent') {
        const parentId = effectiveUser?.linked_id;
        if (!parentId) {
          return false;
        }

        const response = await api.get<any>(`/parents/${parentId}`);
        if (response && response.success && response.data) {
          const p: any = response.data;
          const value = {
            ...p,
            firstName: p.firstName ?? p.first_name,
            lastName: p.lastName ?? p.last_name,
            alternatePhone: p.alternatePhone ?? p.alternate_phone,
            childrenCount: p.childrenCount ?? p.children_count,
          };
          setParents([value]);
          return true;
        }

        return false;
      }
      
      const response = await api.get('/parents');
      if (response && response.success) {
        const parentsData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(parentsData)) {
          const parentsWithComputed = parentsData.map((parent: any) => ({
            ...parent,
            firstName: parent.first_name,
            lastName: parent.last_name,
            alternatePhone: parent.alternate_phone,
            childrenCount: parent.children_count,
          }));
          setParents(parentsWithComputed);
          return true;
        }
        console.error('[loadParentsFromAPI] REST response data is not an array:', typeof parentsData);
      } else {
        console.error('[loadParentsFromAPI] REST endpoint failed:', response?.message || 'unknown error');
      }

      // Fallback: load parents via SQL query layer when REST endpoint fails.
      // NOTE: Do NOT use a subquery in SELECT (e.g. (SELECT COUNT(*) ...)) because
      // database/query.php's extractTableName() matches the first FROM inside the
      // subquery, injecting school_id into the wrong WHERE clause. Use a simple
      // query on the parents table only; children_count is computed on the frontend.
      try {
        const sqlResult = await sqlDatabase.executeQuery(
          `SELECT * FROM parents ORDER BY first_name, last_name`
        );

        const rows: any[] = Array.isArray((sqlResult as any)?.data) ? (sqlResult as any).data : [];
        if (rows.length > 0) {
          const parentsWithComputed = rows.map((parent: any) => ({
            ...parent,
            firstName: parent.first_name,
            lastName: parent.last_name,
            alternatePhone: parent.alternate_phone,
            childrenCount: parent.children_count,
          }));
          setParents(parentsWithComputed);
          return true;
        }
      } catch (fallbackError: any) {
        console.error('[loadParentsFromAPI] SQL fallback failed:', fallbackError);
      }

      return false;
    } catch (error: any) {
      console.error('[loadParentsFromAPI] Unexpected error:', error);
      return false;
    }
  };

  const loadParentStudentLinksFromAPI = async (): Promise<boolean> => {
    try {
      const effectiveUser: any = currentUser || getApiCurrentUser();
      // Ensure token is available
      await tokenManager.ensureToken(effectiveUser);

      // Parents are not allowed to use /database/query. Use REST only (backend already filters to this parent).
      if (String(effectiveUser?.role || '').toLowerCase() === 'parent') {
        const response = await api.get('/parent-student-links');
        if (response && response.success) {
          const linksData = (response.data as any)?.items || response.data || [];
          if (Array.isArray(linksData)) {
            setParentStudentLinksData(normalizeParentStudentLinks(linksData));
            return true;
          }
        }
        return false;
      }

      let sqlRows: any[] | null = null;

      // Prefer DB truth via SQL first (more reliable for real-time UI), then fall back to REST.
      try {
        const sqlResult = await sqlDatabase.executeQuery(
          `SELECT id, parent_id, student_id, relationship, is_primary, created_at
           FROM parent_student_links
           ORDER BY created_at DESC /*ts:${Date.now()}*/`
        );

        sqlRows = Array.isArray((sqlResult as any)?.data) ? (sqlResult as any).data : [];
        if (Array.isArray(sqlRows) && sqlRows.length > 0) {
          setParentStudentLinksData(normalizeParentStudentLinks(sqlRows));
          return true;
        }
      } catch (sqlError: any) {
        // Silent fail for security
      }

      // Fallback: load from REST endpoint
      const response = await api.get('/parent-student-links');
      if (response && response.success) {
        const linksData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(linksData)) {
          setParentStudentLinksData(normalizeParentStudentLinks(linksData));
          return true;
        }
      }

      // Both sources failed or returned non-array.
      // If SQL returned an empty array, verify table is truly empty before overwriting state to [].
      if (Array.isArray(sqlRows) && sqlRows.length === 0) {
        try {
          const countResult = await sqlDatabase.executeQuery(
            `SELECT COUNT(*) AS cnt FROM parent_student_links /*ts:${Date.now()}*/`
          );
          const countRows: any[] = Array.isArray((countResult as any)?.data) ? (countResult as any).data : [];
          const cnt = Number(countRows?.[0]?.cnt ?? countRows?.[0]?.COUNT ?? 0);

          if (Number.isFinite(cnt) && cnt === 0) {
            setParentStudentLinksData([]);
            return true;
          }
        } catch (e) {
          // ignore
        }
      }

      return false;
    } catch (error: any) {
      return false;
    }
  };

  const loadParentStudentLinksAuthoritative = async (): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const sqlResult = await sqlDatabase.executeQuery(
        `SELECT id, parent_id, student_id, relationship, is_primary, created_at
         FROM parent_student_links
         ORDER BY created_at DESC /*ts:${Date.now()}*/`
      );

      const rows: any[] = Array.isArray((sqlResult as any)?.data) ? (sqlResult as any).data : [];
      if (Array.isArray(rows)) {
        setParentStudentLinksData(normalizeParentStudentLinks(rows));
        return true;
      }
      return false;
    } catch (e: any) {
      // e.g. 403 on /database/query in some environments
      return await loadParentStudentLinksFromAPI();
    }
  };

  const loadAccountantsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM accountants ORDER BY first_name');

      if (result && result.data && Array.isArray(result.data)) {
        // Transform snake_case to camelCase for frontend compatibility
        const transformedData = result.data.map((accountant: any) => ({
          id: accountant.id,
          firstName: accountant.first_name,
          lastName: accountant.last_name,
          employeeId: accountant.employee_id,
          email: accountant.email,
          phone: accountant.phone,
          department: accountant.department,
          status: accountant.status,
          created_at: accountant.created_at,
          updated_at: accountant.updated_at
        }));
        setAccountants(transformedData);
        return true;
      } else {
        setAccountants([]);
        return false;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadStudentsFromAPI = async (): Promise<boolean> => {
    try {
      const response = await api.get('/students');
      if (response && response.success) {
        const studentsData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(studentsData)) {
          
          // Transform snake_case to camelCase and handle both field name formats
          const studentsWithComputed = studentsData.map((student: any) => ({
            ...student,
            // Map database fields to frontend interface (handle both snake_case and camelCase)
            firstName: student.firstName || student.first_name || 'Unknown',
            lastName: student.lastName || student.last_name || 'Student',
            otherName: student.otherName || student.other_name || '',
            // Admission/registration number: support both legacy (GRA/0117) and new (GRA/2026/0010) formats.
            // Many teacher flows (Enter Scores / CSV import) rely on `admissionNumber` being present.
            admissionNumber: String(
              student.admissionNumber ??
              student.admission_number ??
              student.registrationNumber ??
              student.registration_number ??
              ''
            ).trim(),
            fullName: (
              student.fullName ||
              student.full_name ||
              [
                student.firstName || student.first_name || '',
                student.otherName || student.other_name || '',
                student.lastName || student.last_name || ''
              ]
                .filter((p: any) => String(p || '').trim() !== '')
                .join(' ')
                .trim()
            ),
            className: student.className || student.class_name || '',
            classCategory: student.classCategory || student.class_category,
            parentName: student.parentName || student.parent_name,
            parent_id: student.parent_id || student.parentId,
            class_id: student.class_id || student.classId,
            class_teacher_id: student.class_teacher_id || student.classTeacherId,
            // Keep snake_case mirror for components that still reference DB field name.
            admission_number: String(
              student.admission_number ??
              student.admissionNumber ??
              student.registration_number ??
              student.registrationNumber ??
              ''
            ).trim(),
            date_of_birth: student.date_of_birth || student.dateOfBirth,
            place_of_birth: student.place_of_birth || student.placeOfBirth,
            gender: student.gender,
            address: student.address,
            phone: student.phone,
            parent_phone: student.parent_phone || student.parentPhone,
            emergency_contact: student.emergency_contact || student.emergencyContact,
            blood_group: student.blood_group || student.bloodGroup,
            genotype: student.genotype,
            medical_conditions: student.medical_conditions || student.medicalConditions,
            allergies: student.allergies,
            status: student.status,
            created_at: student.created_at || student.createdAt,
            updated_at: student.updated_at || student.updatedAt,
          }));

          const byId = new Map<number, any>();
          for (const s of studentsWithComputed) {
            const idNum = Number((s as any)?.id);
            if (Number.isFinite(idNum)) {
              byId.set(idNum, s);
            }
          }
          const uniqueStudents = Array.from(byId.values());
          setStudents(uniqueStudents);
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadClassesFromAPI = async (force: boolean = false): Promise<boolean> => {
    // Prevent excessive calls with simple rate limiting - but always load if empty
    const now = Date.now();
    if (!force && classes.length > 0 && (now - lastLoadTime) < 2000) {
      return true; // Use cached data if recent
    }
    
    try {
      // Loading classes from API
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const response = await api.get(API_CONFIG.ENDPOINTS.CLASSES.LIST);
      if (response && response.success) {
        // Handle paginated response structure
        const classesData = (response.data as any)?.items || response.data || [];
        const safeClassesArray = Array.isArray(classesData) ? classesData : [];
        
        // Transform snake_case to camelCase and ensure classTeacherId is properly mapped
        const classesWithComputed = safeClassesArray.map((classItem: any) => ({
          ...classItem,
          id: Number(classItem.id),
          // Map database fields to frontend interface (support both snake_case and camelCase)
          classTeacherId:
            classItem.class_teacher_id != null && classItem.class_teacher_id !== undefined
              ? Number(classItem.class_teacher_id)
              : (classItem.classTeacherId != null && classItem.classTeacherId !== undefined
                  ? Number(classItem.classTeacherId)
                  : null),
          classTeacher: classItem.class_teacher || classItem.classTeacher || null,
          currentStudents: classItem.current_students ?? classItem.currentStudents ?? 0,
          academicYear: classItem.academic_year || classItem.academicYear,
          createdAt: classItem.created_at || classItem.createdAt,
          updatedAt: classItem.updated_at || classItem.updatedAt,
        }));
        
        setClasses(classesWithComputed);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadSubjectsFromAPI = async (_force: boolean = false): Promise<boolean> => {
    try {
      // Loading subjects from API
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      // Request a high limit so we fetch all subjects (needed for assignment matrix)
      const response = await api.get(`${API_CONFIG.ENDPOINTS.SUBJECTS.LIST}?limit=100`);
      
      if (response && response.success) {
        // Handle paginated response structure
        const subjectsData = (response.data as any)?.items || response.data || [];
        // Transform snake_case to camelCase for frontend compatibility
        const subjectsWithComputed = subjectsData.map((subject: any) => ({
          ...subject,
          id: Number(subject.id),
          subject_name: subject.name || 'Unknown Subject',
          name: subject.name,
          isCore: subject.is_core,
          createdAt: subject.created_at,
          updatedAt: subject.updated_at,
          assignmentCount: subject.assignment_count || 0
        }));
        setSubjects(subjectsWithComputed);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadSubjectRegistrationsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM subject_registrations WHERE status = "Active" ORDER BY created_at DESC');
      if (result && result.data) {
        const registrationsData = Array.isArray(result.data) ? result.data : (result.data.data || []);
        
        // Don't filter here - let components handle term/year filtering as needed
        // This ensures all registrations are available for display
        setSubjectRegistrations(registrationsData);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Force reload assignments, bypassing cache if forceReload is true
  const loadSubjectAssignmentsFromAPI = async (forceReload = false, termParam?: string | null, yearParam?: string | null): Promise<boolean> => {
    // Use passed parameters or fall back to state
    const term = termParam ?? currentTerm;
    const year = yearParam ?? currentAcademicYear;
    
    // Skip loading if term or academic year not set by admin
    if (!term || !year) {
      return false;
    }

    const cacheKey = `${String(year)}__${String(term)}`;
    const now = Date.now();
    const canUseCache =
      !forceReload &&
      subjectAssignments.length > 0 &&
      lastLoadedSubjectAssignmentsKeyRef.current === cacheKey &&
      (now - lastLoadTime) < 2000;
    if (canUseCache) {
      return true;
    }
    
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Request only assignments for current term/year
      const response = await api.get(`/subjects/assignments?term=${encodeURIComponent(term)}&academic_year=${encodeURIComponent(year)}`);
      if (response && response.success) {
        const assignmentsData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(assignmentsData)) {
          setSubjectAssignments(assignmentsData);
          lastLoadedSubjectAssignmentsKeyRef.current = cacheKey;
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Force reload class teacher assignments, bypassing cache if forceReload is true
  const loadClassTeacherAssignmentsFromAPI = async (forceReload = false, termParam?: string | null, yearParam?: string | null): Promise<boolean> => {
    try {
      // Use passed parameters or fall back to state
      const term = termParam ?? currentTerm;
      const year = yearParam ?? currentAcademicYear;

      const cacheKey = `${String(year)}__${String(term)}`;
      
      // Skip loading if term or academic year not set by admin
      if (!term || !year) {
        return false;
      }

      const now = Date.now();
      const canUseCache =
        !forceReload &&
        classTeacherAssignments.length > 0 &&
        lastLoadedClassTeacherAssignmentsKeyRef.current === cacheKey &&
        (now - lastLoadTime) < 2000;
      if (canUseCache) {
        return true;
      }

      // Ensure token is available
      const hasToken = await tokenManager.ensureToken(currentUser);
      if (!hasToken) {
        return false;
      }

      const response = await api.get(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BY_TERM(year, term));
      
      if (response && response.success) {
        const assignmentsData = (response.data as any[]) || [];
        
        // Set class teacher assignments state
        setClassTeacherAssignments(assignmentsData);
        lastLoadedClassTeacherAssignmentsKeyRef.current = cacheKey;
        
        // Update classes with current term class teachers
        setClasses(prevClasses => {
          return prevClasses.map(cls => {
            const assignment = assignmentsData.find((a: any) => a.class_id === cls.id);
            return {
              ...cls,
              classTeacherId: assignment ? assignment.teacher_id : null,
              classTeacher: assignment ? assignment.teacher_name : null
            };
          });
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Student API Methods
  const createStudentAPI = async (studentData: any): Promise<any> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.post<any>('/students', studentData);
      if (response.success && response.data) {
        await loadStudentsFromAPI();
        return response.data; // Return the full result
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const updateStudentAPI = async (id: number, studentData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Convert camelCase keys to snake_case for backend compatibility
      const snakeCaseData = Object.keys(studentData).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = studentData[key];
        return acc;
      }, {} as Record<string, unknown>);

      const response = await api.put<any>(`/students/${id}`, snakeCaseData);
      if (response.success) {
        await loadStudentsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteStudentAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.delete<any>(`/students/${id}`);
      if (response.success) {
        await loadStudentsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Teacher API Methods
  const createTeacherAPI = async (teacherData: any): Promise<any> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.post<any>('/teachers', teacherData);
      if (response.success && response.data) {
        await loadTeachersFromAPI();
        return response.data; // Return the full result
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const updateTeacherAPI = async (id: number, teacherData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.put<any>(`/teachers/${id}`, teacherData);
      if (response.success) {
        await loadTeachersFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteTeacherAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.delete<any>(`/teachers/${id}`);
      if (response.success) {
        await loadTeachersFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Parent API Methods
  const createParentAPI = async (parentData: any): Promise<any> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const result = await sqlDatabase.createParent(parentData);
      if (result && result.id) {
        await loadParentsFromAPI();
        return result; // Return the full result with ID
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const updateParentAPI = async (id: number, parentData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const result = await sqlDatabase.updateRecord('parents', id, parentData);
      if (result) {
        await loadParentsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteParentAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const result = await sqlDatabase.deleteRecord('parents', id);
      if (result) {
        await loadParentsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Accountant API Methods
  const createAccountantAPI = async (accountantData: any): Promise<any> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.post<any>('/accountants', accountantData);
      if (response.success && response.data) {
        await loadAccountantsFromAPI();
        return response.data; // Return the full result
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const updateAccountantAPI = async (id: number, accountantData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.put<any>(`/accountants/${id}`, accountantData);
      if (response.success) {
        await loadAccountantsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteAccountantAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.delete<any>(`/accountants/${id}`);
      if (response.success) {
        await loadAccountantsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Class API Methods
  const createClassAPI = async (classData: any): Promise<number> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Map to snake_case for API
      const apiPayload = {
        ...classData,
        academic_year: classData.academicYear,
        class_teacher_id: classData.classTeacherId,
      };

      
      const response = await api.post(API_CONFIG.ENDPOINTS.CLASSES.CREATE, apiPayload);
            
      if (response && response.success) {
        await loadClassesFromAPI(true);
        const responseData = response.data as any;
        return responseData && responseData.id ? responseData.id : 0;
      }
      return 0;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create class');
    }
  };

  const updateClassAPI = async (id: number, classData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      
      // Map to snake_case for API
      const apiPayload = {
        ...classData,
        academic_year: classData.academicYear,
        class_teacher_id: classData.classTeacherId,
      };

      const response = await api.put(API_CONFIG.ENDPOINTS.CLASSES.UPDATE(id), apiPayload);
            
      if (response && response.success) {
        await loadClassesFromAPI(true);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteClassAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.delete(API_CONFIG.ENDPOINTS.CLASSES.DELETE(id));
      if (response && response.success) {
        await loadClassesFromAPI(true);
        return true;
      }
      return false;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete class');
    }
  };

  // Subject API Methods
  const createSubjectAPI = async (subjectData: any): Promise<number> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.post(API_CONFIG.ENDPOINTS.SUBJECTS.CREATE, subjectData);
      
      if (response && response.success) {
        const data = response.data as any;
        // Backend returns { id: lastInsertId } where id is often a numeric string.
        // Coerce to a number so we correctly detect success and trigger reloads.
        const rawId = data && (data.id !== undefined ? data.id : null);
        const newId = rawId !== null && rawId !== undefined ? Number(rawId) : 0;

        // Do not reload subjects here; addSubject will handle it.

        return newId;
      }
      return 0;
    } catch (error: any) {
      throw error;
    }
  };

  const updateSubjectAPI = async (id: number, subjectData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.put(API_CONFIG.ENDPOINTS.SUBJECTS.UPDATE(id), subjectData);
      if (response && response.success) {
        await loadSubjectsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteSubjectAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response: any = await api.delete(API_CONFIG.ENDPOINTS.SUBJECTS.DELETE(id));

      // On HTTP 2xx, ApiService returns parsed JSON. Check the success flag first.
      if (response && response.success) {
        return true;
      }

      // If backend responded with success = false but no HTTP error,
      // surface the backend message so callers can present it.
      const backendMessage = response?.message;
      if (backendMessage) {
        throw new Error(backendMessage);
      }

      return false;
    } catch (error) {
      // Re-throw so higher-level handlers (e.g. UI) can show detailed feedback
      throw error;
    }
  };

  // Subject Registration API Methods
  const registerSubjectForClassAPI = async (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory: boolean = true): Promise<boolean> => {
    try {
      const result = await sqlDatabase.registerSubjectForClass(subjectId, classId, academicYear, term, isCompulsory);
      if (result && result.id) {
        await loadSubjectRegistrationsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const removeSubjectRegistrationAPI = async (classId: number, subjectId: number, academicYear: string, term: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.removeSubjectRegistration(subjectId, classId, academicYear, term);
      if (result) {
        await loadSubjectRegistrationsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const getSubjectRegistrationsAPI = async (classId?: number, academicYear?: string, term?: string) => {
    try {
      let query = 'SELECT sr.*, s.name as subject_name, s.code as subject_code, c.name as class_name, c.level as class_level FROM subject_registrations sr JOIN subjects s ON sr.subject_id = s.id JOIN classes c ON sr.class_id = c.id';
      const params: any[] = [];
      
      if (classId || academicYear || term) {
        query += ' WHERE';
        const conditions: string[] = [];
        
        if (classId) {
          conditions.push(' sr.class_id = ?');
          params.push(classId);
        }
        if (academicYear) {
          conditions.push(' sr.academic_year = ?');
          params.push(academicYear);
        }
        if (term) {
          conditions.push(' sr.term = ?');
          params.push(term);
        }
        
        query += conditions.join(' AND');
      }
      
      query += ' ORDER BY sr.academic_year, sr.term, c.name, s.name';
      
      const result = await sqlDatabase.executeQuery(query, params);
      return Array.isArray(result?.data) ? result.data : (result?.data?.data || []);
    } catch (error) {
      return [];
    }
  };

  // Rate limiting and loading state management
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  // Load data from API when user is logged in - REMOVED (handled by initial load useEffect)
  // useEffect(() => {
  //   if (!currentUser) {
  //     return;
  //   }

  //   const now = Date.now();
    
  //   // Prevent excessive API calls with cooldown and loading states
  //   if (isLoadingData || isDataLoading || (now - lastLoadTime) < LOAD_COOLDOWN) {
  //     return;
  //   }

  //   // Check if token is actually available before loading data
  //   const currentToken = getAuthToken();
  //   const loadData = async () => {
  //     setIsLoadingData(true);
  //     setIsDataLoading(true);
  //     setLastLoadTime(now);
      
  //     try {
  //       await loadDataForUser(currentUser);
  //     } catch (error) {
  //       
  //     } finally {
  //       setIsLoadingData(false);
  //       setIsDataLoading(false);
  //     }
  //   };

  //   loadData();
  // }, [currentUser]); // Remove isDataLoading from dependencies to prevent circular dependency

  // Load initial data on app start (for login page and general use) - CONSOLIDATED
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      const code = reason?.code;
      const status = reason?.status;
      const message = reason?.message;

      // Handle auth/permission rejections that might not be caught by UI flows
      if (code === 403 || status === 403 || (typeof message === 'string' && message.includes('403'))) {
        // Silent fail for security
        event.preventDefault();
      } else if (code === 401 || status === 401 || (typeof message === 'string' && message.includes('401'))) {
        // Handle authentication errors
        event.preventDefault();
      } else {
        // Catch ALL other unhandled rejections to prevent console errors
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    let cancelled = false;
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
    };

    // Prevent multiple initial loads using module-level variable (persists across StrictMode)
    if (globalInitialLoadStarted || globalInitialLoadCompleted) {
      cleanup();
      return;
    }
    
    // Also check ref for additional safety
    if (initialLoadDone.current) {
      cleanup();
      return;
    }
    
    // Prevent multiple initial loads using state
    if (isLoadingData || isDataLoading) {
      cleanup();
      return;
    }
    
    // Mark as started immediately to prevent race conditions
    globalInitialLoadStarted = true;
    
    const loadInitialData = async () => {
      setIsLoadingData(true);
      setIsDataLoading(true);
      
      // Safety timeout to prevent loading from getting stuck
      safetyTimeout = setTimeout(() => {
        if (cancelled) return;
        setIsLoadingData(false);
        setIsDataLoading(false);
        setIsLoading(false);
        initialLoadDone.current = true;
        globalInitialLoadCompleted = true;
        globalInitialLoadStarted = false;
      }, 30000); // 30 second timeout
      
      try {
        // Only restore authentication if NOT on landing page
        // This prevents automatic login when user clicks login button
        const currentPath = window.location.pathname;
        const isLandingPage = currentPath === '/' || currentPath === '';
        
        if (!isLandingPage) {
          // Check for existing token and restore authentication
          const token = getAuthToken();
          const savedUser = getApiCurrentUser();
          
          if (token && savedUser) {
            setAuthToken(token);
            setApiCurrentUser(savedUser);
            setCurrentUser(savedUser);
            
            await loadDataForUser(savedUser);
            if (!cancelled) setIsLoading(false);
          } else {
            if (!cancelled) setIsLoading(false);
          }
        } else {
          if (!cancelled) setIsLoading(false);
        }
        
        initialLoadDone.current = true;
      } catch (error) {
        if (!cancelled) setIsLoading(false);
      } finally {
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        if (!cancelled) {
          setIsLoadingData(false);
          setIsDataLoading(false);
          setIsLoading(false);
        }
        initialLoadDone.current = true; // Mark ref as done
        globalInitialLoadCompleted = true; // Mark global as done
        globalInitialLoadStarted = false; // Reset started flag
      }
    };
    
    loadInitialData();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []); // Only run once on mount

  // Auto-save disabled - using API only

  // ==================== API FUNCTIONS ====================

  // Centralized auth failure handler — clears token and redirects to login
  const handleAuthFailure = () => {
    if (authFailureRedirected.current) return;
    authFailureRedirected.current = true;
    removeAuthToken();
    setApiCurrentUser(null);
    setCurrentUser(null);
    localStorage.removeItem('api_token');
    localStorage.removeItem('api_user');
    window.location.href = '/login';
  };
  const authFailureRedirected = useRef(false);

  // Helper to load data for a user
  const loadDataForUser = async (user: User) => {
    // Prevent multiple simultaneous calls to loadDataForUser
    if (loadDataForUserInFlight.current) {
      return false;
    }
    loadDataForUserInFlight.current = true;
    
    try {
      // Track auth failures across essential loads
      let authFailCount = 0;
      const wrapAuth = (p: Promise<any>) => p.catch((e: any) => {
        const msg = String(e?.message || '');
        if (msg.includes('401') || msg.includes('Session expired') || msg.includes('Invalid or expired token')) {
          authFailCount++;
        }
        return null;
      });

      // Load essential data only (fast path)
      const essentialLoads = [
        wrapAuth(loadSchoolSettings()),
        wrapAuth(loadCurrentTermAndYear()),
        wrapAuth(loadStudentsFromAPI()),
        wrapAuth(loadClassesFromAPI()),
        wrapAuth(loadSubjectsFromAPI()),
      ];

      await Promise.allSettled(essentialLoads);

      // If all essential loads failed with auth errors, token is stale — force logout
      if (authFailCount >= 3) {
        handleAuthFailure();
        return false;
      }

      // Load role-specific essentials in parallel (not heavy data)
      let roleLoads: Promise<any>[] = [];

      if (user.role === 'admin') {
        roleLoads = [
          loadTeachersFromAPI().catch(() => null),
          loadSubjectAssignmentsFromAPI(false).catch(() => null),
          loadSubjectRegistrationsFromAPI().catch(() => null),
          loadParentStudentLinksFromAPI().catch(() => null),
        ];
      } else if (user.role === 'teacher') {
        roleLoads = [
          loadTeachersFromAPI().catch(() => null),
          loadSubjectAssignmentsFromAPI(true).catch(() => null),
          loadSubjectRegistrationsFromAPI().catch(() => null),
          loadClassTeacherAssignmentsFromAPI(true).catch(() => null),
        ];
      } else if (user.role === 'accountant') {
        roleLoads = [
          loadPaymentsFromAPI().catch(() => null),
          loadFeeStructuresFromAPI().catch(() => null),
        ];
      } else if (user.role === 'parent') {
        roleLoads = [
          loadParentStudentLinksFromAPI().catch(() => null),
        ];
      }

      await Promise.allSettled(roleLoads);

      // Schedule heavy data loads AFTER dashboard renders (non-blocking)
      // These load in background and update state when ready
      setTimeout(() => {
        if (user.role === 'admin' || user.role === 'teacher') {
          const term = currentTerm || '';
          const year = currentAcademicYear || '';
          Promise.allSettled([
            loadScoresFromAPI(term, year).catch(() => null),
            loadAffectiveDomainsFromAPI(term, year).catch(() => null),
            loadPsychomotorDomainsFromAPI(term, year).catch(() => null),
            loadClassTeacherAssignmentsFromAPI(user.role === 'teacher', term, year).catch(() => null),
            loadCbtExamsFromAPI().catch(() => null),
            loadCbtQuestionBankFromAPI().catch(() => null),
            loadNotificationsFromAPI().catch(() => null),
            loadAttendancesFromAPI().catch(() => null),
          ]);
        } else if (user.role === 'student') {
          Promise.allSettled([
            loadCbtStudentExamsFromAPI().catch(() => null),
            loadCbtMyAttemptsFromAPI().catch(() => null),
          ]);
        }
      }, 2000); // 2 second delay — dashboard renders first

      return true;
    } catch (error) {
      return false;
    } finally {
      loadDataForUserInFlight.current = false;
    }
  };

  const login = async (identity: string, password: string, role: string): Promise<User | null> => {
    try {
      // Login attempt
      
      // Clear any existing tokens first to prevent conflicts
      removeAuthToken();
      
      // Use API login instead of local SQL database
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          identity,
          password,
          role
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      const user = data.data;
      
      if (user) {
        setCurrentUser(user);
        setApiCurrentUser(user);
        
        // Extract token from API response structure
        const token = user.token || '';
        
        setAuthToken(token);
        
        // Reload all data after successful login using the helper function
        
        const dataLoaded = await loadDataForUser(user);
        
        if (!dataLoaded) {
          // Some data failed to load, but login will proceed
        }
        setIsLoading(false);
        // Reduced toast - only show for first login of session
        if (!sessionStorage.getItem('loginToastShown')) {
          toast.success(`Welcome back, ${user.first_name || user.username}!`);
          sessionStorage.setItem('loginToastShown', 'true');
        }
        return user;
      }
      
      return null;
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      setIsLoading(false);
      return null;
    }
  };

  // Student passwordless login (admission number + class name)
  const studentLogin = async (admissionNumber: string, className: string): Promise<User | null> => {
    try {
      removeAuthToken();

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.STUDENT_LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          admission_number: admissionNumber,
          class_name: className
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Student login failed');
      }

      const data = await response.json();
      const user = data.data;

      if (user) {
        setCurrentUser(user);
        setApiCurrentUser(user);

        const token = user.token || '';
        setAuthToken(token);

        const dataLoaded = await loadDataForUser(user);

        if (!dataLoaded) {
          // Some data failed to load, but login will proceed
        }
        setIsLoading(false);
        toast.success(`Welcome, ${user.first_name || user.username}!`);
        return user;
      }

      return null;
    } catch (error: any) {
      toast.error(error.message || 'Student login failed');
      setIsLoading(false);
      return null;
    }
  };

  // Helper function to calculate grade
  // ==================== IMPLEMENTATION ====================

  // Student Methods
  const addStudent = async (student: Omit<Student, 'id'>) => {
    // The admission number is now generated by the backend service.
    // This function simply passes the data to the API.
    const result = await createStudentAPI(student);
    if (result && result.id) {
      // Refresh students list from API to get the real data
      await loadStudentsFromAPI();
      return result.id; // Return the actual ID from API response
    }
    return -1; // Return -1 to indicate failure
  };

  const updateStudent = async (id: number, student: Partial<Student>) => {
    // Update local state immediately for instant feedback
    setStudents(prevStudents => 
      prevStudents.map(s => s.id === id ? { ...s, ...student } : s)
    );
    
    const updatedStudent = await updateStudentAPI(id, student);
    if (updatedStudent) {
      // Refresh students list from API to ensure consistency
      await loadStudentsFromAPI();
      return;
    }

    // If API update failed, revert local state and surface failure
    await loadStudentsFromAPI();
    throw new Error('Failed to update student');
  };

  const deleteStudent = async (id: number) => {
    try {
      // Force immediate state update by filtering locally first
      setStudents(prevStudents => {
        const filtered = prevStudents.filter(student => student.id !== id);
        return filtered;
      });
      
      // Then call the API to delete from database
      const success = await deleteStudentAPI(id);
      
      if (success) {
        // Refresh from database to ensure consistency
        await loadStudentsFromAPI();
        
        // Also refresh parents list as parent references might be updated
        await loadParentsFromAPI();
        
        // Force a re-render by updating timestamp
        setStudents(prevStudents => [...prevStudents]);
      } else {
        // If API deletion failed, reload from database to restore correct state
        await loadStudentsFromAPI();
        throw new Error('Failed to delete student');
      }
    } catch (error) {
      // Reload from database to ensure correct state
      await loadStudentsFromAPI();
      throw error;
    }
  };

  const deleteBulkStudents = async (studentIds: number[]) => {
    try {
      if (!studentIds || studentIds.length === 0) {
        throw new Error('No student IDs provided for bulk deletion');
      }

      // Force immediate state update by filtering locally first
      setStudents(prevStudents => {
        const filtered = prevStudents.filter(student => !studentIds.includes(student.id));
        return filtered;
      });
      
      // Then call the API to delete from database
      const result = await sqlDatabase.deleteBulkStudents(studentIds);
      
      if (result && result.success) {
        // Refresh from database to ensure consistency
        await loadStudentsFromAPI();
        
        // Also refresh parents list as parent references might be updated
        await loadParentsFromAPI();
        
        // Force a re-render by updating timestamp
        setStudents(prevStudents => [...prevStudents]);
        
        return result;
      } else {
        // If API deletion failed, reload from database to restore correct state
        await loadStudentsFromAPI();
        throw new Error('Bulk deletion failed');
      }
    } catch (error) {
      // Reload from database to ensure correct state
      await loadStudentsFromAPI();
      throw error;
    }
  };

  const getStudentsByClass = (classId: number) => {
    return (students || []).filter(s => String(s.class_id) === String(classId) && s.status === 'Active');
  };

  // Manual refresh function for students
  const refreshStudents = async () => {
    await loadStudentsFromAPI();
  };

  // Teacher Methods
  const addTeacher = async (teacher: Omit<Teacher, 'id'>): Promise<number> => {
    // Auto-generate employee ID if not provided
    let employeeId = teacher.employeeId;
    if (!employeeId || employeeId === '') {
      const year = new Date().getFullYear();
      const teacherCount = (teachers || []).length + 1;
      const prefix = currentUser?.school_suffix?.toUpperCase() || 'SCH';
      employeeId = `${prefix}-TCH-${year}-${String(teacherCount).padStart(3, '0')}`;
    }
    
    const newTeacher = await createTeacherAPI({ ...teacher, employeeId });
    if (newTeacher && newTeacher.id) {
      // Refresh teachers list from API
      await loadTeachersFromAPI();
      return newTeacher.id; // Return the actual ID from API response
    }
    return -1; // Return -1 to indicate failure
  };

  const updateTeacher = async (id: number, teacher: Partial<Teacher>) => {
    const updatedTeacher = await updateTeacherAPI(id, teacher);
    if (updatedTeacher) {
      // Refresh teachers list from API
      await loadTeachersFromAPI();
    }
  };

  const deleteTeacher = async (id: number) => {
    const success = await deleteTeacherAPI(id);
    if (success) {
      // Refresh teachers list from API
      await loadTeachersFromAPI();
      // Also refresh classes and subject assignments as they might be updated
      await loadClassesFromAPI();
    }
  };

  // Enhanced Teacher Assignment System
  const getTeacherAssignments = useCallback((teacherId: number): SubjectAssignment[] => {
    // If term/year are not set yet, return all assignments for this teacher
    if (!currentTerm || !currentAcademicYear) {
      
      return (subjectAssignments || []).filter(a => Number(a.teacher_id) === teacherId);
    }
    
    return (subjectAssignments || []).filter(a => 
      Number(a.teacher_id) === teacherId && 
      a.term === currentTerm && 
      a.academic_year === currentAcademicYear
    );
  }, [subjectAssignments, currentTerm, currentAcademicYear]);

  // Get teacher's classes with subjects and student counts
  const getTeacherClasses = useCallback(async (teacherId: number): Promise<any[]> => {
    // Lazy load assignments if empty
    if (subjectAssignments.length === 0) {
      await loadSubjectAssignmentsFromAPI();
    }
    if (classTeacherAssignments.length === 0) {
      await loadClassTeacherAssignmentsFromAPI();
    }

    // Get teacher's subject assignments directly
    const assignments = !currentTerm || !currentAcademicYear 
      ? (subjectAssignments || []).filter(a => Number(a.teacher_id) === teacherId)
      : (subjectAssignments || []).filter(a => 
          Number(a.teacher_id) === teacherId && 
          a.term === currentTerm && 
          a.academic_year === currentAcademicYear
        );
    
    // Get classes where teacher is assigned as class teacher (using class_teacher_assignments table)
    const classTeacherClasses = classes.filter((c: any) => {
      const assignment = classTeacherAssignments.find((cta: any) => 
        String(cta.teacher_id) === String(teacherId) && 
        String(cta.class_id) === String(c.id) &&
        cta.academic_year === currentAcademicYear && 
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return !!assignment;
    });

    const resolveCanonicalClassKey = (classId: any): string => {
      const baseClass = (classes || []).find((c: any) => String(c.id) === String(classId));
      if (!baseClass) return String(classId);

      const siblings = (classes || []).filter((c: any) =>
        String(c.name).trim().toLowerCase() === String((baseClass as any).name).trim().toLowerCase() &&
        String(c.level).trim().toLowerCase() === String((baseClass as any).level).trim().toLowerCase()
      );

      if (siblings.length <= 1) return String((baseClass as any).id);

      const best = siblings
        .map((c: any) => ({
          id: c.id,
          count: (students || []).filter((s: any) => String(s.class_id) === String(c.id)).length,
        }))
        .sort((a: any, b: any) => b.count - a.count)[0];

      return best?.id ? String(best.id) : String((baseClass as any).id);
    };
    
    // Group subject assignments by class
    const classGroups = assignments.reduce((groups: any, assignment: any) => {
      const classIdRaw = (assignment as any)?.class_id;
      const classKey = resolveCanonicalClassKey(classIdRaw);
      const classId = Number(classKey);

      const classRecord = classes.find((c: any) => String(c.id) === classKey);

      if (!groups[classKey]) {
        groups[classKey] = {
          classId: Number.isFinite(classId) ? classId : classIdRaw,
          className: (classRecord as any)?.name || 'Unknown',
          classLevel: (classRecord as any)?.level || 'Unknown',
          subjects: []
        };
      }

      const subjectIdRaw = (assignment as any)?.subject_id;
      const subjectId = Number(subjectIdRaw);
      const subjectRecord = subjects.find((s: any) => String(s.id) === String(subjectIdRaw));

      groups[classKey].subjects.push({
        subjectId: Number.isFinite(subjectId) ? subjectId : subjectIdRaw,
        subjectName: assignment.subject_name || (subjectRecord as any)?.name || 'Unknown',
        subjectCode: (subjectRecord as any)?.code || 'Unknown',
        assignmentId: assignment.id
      });

      return groups;
    }, {});
    
    // Add class teacher classes (even if no subject assignments)
    classTeacherClasses.forEach((classTeacherClass: any) => {
      const key = resolveCanonicalClassKey(classTeacherClass.id);
      if (!classGroups[key]) {
        const classRecord = classes.find((c: any) => String(c.id) === String(key)) || classTeacherClass;
        classGroups[key] = {
          classId: Number(key) || (classRecord as any)?.id || key,
          className: (classRecord as any)?.name || 'Unknown',
          classLevel: (classRecord as any)?.level || 'Unknown',
          subjects: []
        };
      }
    });
    
    // Convert to array and add student counts
    return Object.values(classGroups).map((classGroup: any) => ({
      ...classGroup,
      studentCount: students.filter((s: any) => String(s.class_id) === String(classGroup.classId)).length
    }));
  }, [classes, classTeacherAssignments, currentAcademicYear, currentTerm, subjectAssignments, subjects, students, loadSubjectAssignmentsFromAPI, loadClassTeacherAssignmentsFromAPI]);

// Get teacher's students for a specific class - UPDATED VERSION
  const getTeacherResponsibilities_NEW = useCallback((teacherId: number): any => {
    // Use ref to track the last teacherId for logging frequency control
    const shouldLog = lastTeacherIdRef.current !== teacherId;
    lastTeacherIdRef.current = teacherId;
    
    if (shouldLog) {
      
    }
    
    try {
      // Ensure classes are loaded before proceeding
      if (!classes || classes.length === 0) {
        if (shouldLog) {
          
        }
        
        // Fallback: Use class_teacher_assignments data if classes aren't loaded yet
        const classTeacherAssignmentsForTeacher = classTeacherAssignments.filter(
          (cta: any) => String(cta.teacher_id) === String(teacherId) && 
          cta.academic_year === currentAcademicYear && 
          cta.term === currentTerm
        );
        
        const isClassTeacher = classTeacherAssignmentsForTeacher.length > 0;
        const classTeacherClassIds = classTeacherAssignmentsForTeacher.map(cta => cta.class_id);
        const classTeacherClassesCount = classTeacherClassIds.length;
        
        if (shouldLog) {
          
        }
        
        return {
          isClassTeacher,
          assignedClassesCount: classTeacherClassesCount,
          totalStudentsCount: 0, // Can't calculate without classes data
          subjectsCount: 0, // Can't calculate without assignments data
          canEnterScores: true,
          canCompileResults: isClassTeacher,
          canViewResults: true,
          canManageAttendance: isClassTeacher,
          canManageAffectivePsychomotor: isClassTeacher,
          canManageTimetable: false,
          canMessageParents: false,
          departments: [],
          classTeacherClassesCount,
          subjectAssignedClassesCount: 0,
          classTeacherClassIds,
          subjectAssignedClassIds: []
        };
      }

      // Get teacher's subject assignments (already term-aware)
      const assignments = !currentTerm || !currentAcademicYear 
        ? (subjectAssignments || []).filter(a => Number(a.teacher_id) === teacherId)
        : (subjectAssignments || []).filter(a => 
            Number(a.teacher_id) === teacherId && 
            a.term === currentTerm && 
            a.academic_year === currentAcademicYear
          );
      
      // Get classes where teacher is assigned as class teacher (using class_teacher_assignments table)
      const classTeacherClasses = classes.filter((c: any) => {
        // Check if teacher is assigned as class teacher in current term/year
        const assignment = classTeacherAssignments.find((cta: any) => 
          String(cta.teacher_id) === String(teacherId) && 
          String(cta.class_id) === String(c.id) &&
          cta.academic_year === currentAcademicYear && 
          cta.term === currentTerm &&
          cta.status === 'Active'
        );
        
        const isMatch = !!assignment;
        
        if (shouldLog && isMatch) {
        }
        
        return isMatch;
      });
      
      // Get unique classes from subject assignments
      const assignedClassIds = [...new Set(assignments.map((a: any) => String(a.class_id)))];
      const assignedClasses = classes.filter((c: any) => assignedClassIds.includes(String(c.id)));
      
      // Combine all classes (both subject assignments and class teacher assignments)
      const allTeacherClasses = [...new Set([...assignedClasses, ...classTeacherClasses])];
      
      // Count total students across all classes
      const totalStudentsCount = allTeacherClasses.reduce((total, cls) => {
        return total + students.filter((s: any) => String(s.class_id) === String((cls as any).id)).length;
      }, 0);
      
      // Check if teacher is marked as class teacher in teachers table
      const teacherRecord = teachers.find(t => String(t.id) === String(teacherId));
      const isClassTeacher = teacherRecord?.is_class_teacher === true || classTeacherClasses.length > 0;
      
      return {
        isClassTeacher,
        assignedClassesCount: allTeacherClasses.length,
        totalStudentsCount,
        subjectsCount: assignments.length,
        classTeacherClassesCount: classTeacherClasses.length,
        canEnterScores: assignments.length > 0,
        canCompileResults: isClassTeacher,
        canViewResults: true,
        canManageAttendance: allTeacherClasses.length > 0,
        departments: teacherRecord?.department_id ? [teacherRecord.department_id] : []
      };
    } catch (error) {
      
      return {
        isClassTeacher: false,
        assignedClassesCount: 0,
        totalStudentsCount: 0,
        subjectsCount: 0,
        classTeacherClassesCount: 0,
        canEnterScores: false,
        canCompileResults: false,
        canViewResults: false,
        canManageAttendance: false,
        departments: []
      };
    }
  }, [classes, classTeacherAssignments, currentAcademicYear, currentTerm, subjectAssignments, teachers, lastTeacherIdRef]);

  // Parent Methods
  const addParent = async (parent: Omit<Parent, 'id'>): Promise<number> => {
    const result = await createParentAPI(parent);
    if (result && result.id) {
      await loadParentsFromAPI();
      return result.id; // Return the actual ID from the API response
    } else {
      return -1;
    }
  };

  const updateParent = async (id: number, parent: Partial<Parent>) => {
    const success = await updateParentAPI(id, parent);
    if (success) {
      await loadParentsFromAPI();
    }
  };

  const deleteParent = async (id: number) => {
    const success = await deleteParentAPI(id);
    if (success) {
      await loadParentsFromAPI();
    }
  };

  const getParentStudents = (parentId: number): Student[] => {
    return students.filter(student => student.parent_id === parentId);
  };

  // Accountant Methods
  const addAccountant = async (accountant: Omit<Accountant, 'id'>): Promise<number> => {
    const result = await createAccountantAPI(accountant);
    if (result && result.id) {
      await loadAccountantsFromAPI();
      return result.id; // Return the actual ID from API response
    } else {
      return -1;
    }
  };

  const updateAccountant = async (id: number, accountant: Partial<Accountant>) => {
    const success = await updateAccountantAPI(id, accountant);
    if (success) {
      await loadAccountantsFromAPI();
    }
  };

  const deleteAccountant = async (id: number) => {
    const success = await deleteAccountantAPI(id);
    if (success) {
      await loadAccountantsFromAPI();
    }
  };

  // Class Methods
  const addClass = async (newClass: Omit<Class, 'id'>): Promise<number> => {
    // Check teacher assignment limit
    if (newClass.classTeacherId) {
      const teacherAssignments = classTeacherAssignments.filter(cta => 
        String(cta.teacher_id) === String(newClass.classTeacherId) &&
        cta.academic_year === currentAcademicYear &&
        cta.term === currentTerm
      );
      
      if (teacherAssignments.length >= 3) {
        toast.error('This teacher is already assigned to 3 classes (maximum limit reached)');
        return -1;
      }
    }
    
    try {
      const newId = await createClassAPI(newClass);
      if (newId > 0) {
        await loadClassesFromAPI();
        if (newClass.classTeacherId) {
          await loadClassTeacherAssignmentsFromAPI(true);
        }
      }
      return newId;
    } catch (error: any) {
      const message = String(error?.message || error);

      if (message.includes('409') || message.toLowerCase().includes('already exists')) {
        throw new Error('Class with this name already exists for the specified academic year.');
      }

      throw new Error('Failed to create class');
    }
  };

  const updateClass = async (id: number, classData: Partial<Class>): Promise<boolean> => {
    // Check teacher assignment limit if teacher is being changed
    if (classData.classTeacherId) {
      // Check if the teacher is already assigned to THIS class (no change needed in count)
      const isAlreadyAssignedToThisClass = classTeacherAssignments.some(cta => 
        String(cta.teacher_id) === String(classData.classTeacherId) &&
        String(cta.class_id) === String(id) &&
        cta.academic_year === currentAcademicYear &&
        cta.term === currentTerm
      );
      
      if (!isAlreadyAssignedToThisClass) {
        const teacherAssignments = classTeacherAssignments.filter(cta => 
          String(cta.teacher_id) === String(classData.classTeacherId) &&
          cta.academic_year === currentAcademicYear &&
          cta.term === currentTerm
        );
        
        if (teacherAssignments.length >= 3) {
          toast.error('This teacher is already assigned to 3 classes (maximum limit reached)');
          return false;
        }
      }
    }

    const success = await updateClassAPI(id, classData);
    if (success) {
      await loadClassesFromAPI();
      if ('classTeacherId' in classData) {
        await loadClassTeacherAssignmentsFromAPI(true);
      }
    }
    return success;
  };

  const deleteClass = async (id: number): Promise<boolean> => {
    try {
      const success = await deleteClassAPI(id);
      if (success) {
        await loadClassesFromAPI();
      }
      return success;
    } catch (error: any) {
      const message = String(error?.message || error);

      // Treat "not found" as non-fatal so the UI can remove stale items.
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        return false;
      }

      if (message.includes('Cannot delete class with active students')) {
        throw new Error('Cannot delete class with enrolled students. Please move students first.');
      }

      if (message.includes('Cannot delete class with active subject assignments')) {
        throw new Error('Cannot delete class with active subject assignments. Remove all class subject assignments before deleting.');
      }

      throw new Error('Failed to delete class');
    }
  };

  const updateSubject = async (id: number, subject: Partial<Subject>) => {
    const success = await updateSubjectAPI(id, subject);
    if (!success) {
      throw new Error('Failed to update subject');
    }
    await loadSubjectsFromAPI(true);
  };

  const addSubject = async (subject: Omit<Subject, 'id'>): Promise<number> => {
    const newId = await createSubjectAPI(subject);
    if (newId > 0) {
      await loadSubjectsFromAPI(true);
    }
    return newId; // Return the ID from API response (or -1 if failed)
  };

  const deleteSubject = async (id: number) => {
    try {
      const success = await deleteSubjectAPI(id);

      // If the low-level API returns false without throwing, treat it as a failure
      if (!success) {
        throw new Error('Failed to delete subject');
      }

      // Ensure subjects list and registrations are fully refreshed after deletion
      await loadSubjectsFromAPI(true);
    } catch (error: any) {
      const message = error?.message || '';

      // Normalize the common backend conflict into a clearer admin-facing message
      if (message.includes('Cannot delete subject with active assignments')) {
        throw new Error('Cannot delete subject with active assignments. Remove all subject-teacher assignments for this subject before deleting it.');
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete subject');
    }
  };

  const getPendingApprovals = () => {
    return (compiledResults || []).filter(result => 
      result.status === 'Submitted' && 
      result.term === currentTerm && 
      result.academic_year === currentAcademicYear
    );
  };

  // System Settings Methods
  const loadSchoolSettings = async () => {
    try {
      // Use the dedicated REST endpoint instead of the SQL database/query endpoint.
      // This avoids 403s for parent accounts (database/query is admin/teacher/accountant only).
      await tokenManager.ensureToken(currentUser);
      const token = tokenManager.getToken();
      const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (resp.status === 401) {
        handleAuthFailure();
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to load school settings: ${resp.status} ${text}`);
      }

      const json = await resp.json();
      const rows = (json && json.success === true && Array.isArray(json.data)) ? json.data : [];

      const newSettings: Partial<SchoolSettings> = {};
      rows.forEach((setting: any) => {
        newSettings[setting.setting_key as keyof SchoolSettings] = setting.setting_value;
      });

      setSchoolSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      
    }
  };

  // Cache for academic years to prevent repeated API calls
  let academicYearsCache: string[] | null = null;
  let academicYearsCacheTime = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getAllAcademicYears = async (): Promise<string[]> => {
    try {
      // Check cache first
      const now = Date.now();
      if (academicYearsCache && (now - academicYearsCacheTime) < CACHE_DURATION) {
        return academicYearsCache;
      }

      const result = await sqlDatabase.executeQuery(
        "SELECT DISTINCT academic_year FROM fee_structures ORDER BY academic_year DESC"
      );
      // Handle database response format: {success: true, data: [...]}
      let dataArray = [];
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          dataArray = result;
        } else if (Array.isArray(result.data)) {
          dataArray = result.data;
        }
      }
      
      const years = dataArray.map((row: any) => row.academic_year);
      // Always include current academic year as fallback
      if (currentAcademicYear && !years.includes(currentAcademicYear)) {
        years.push(currentAcademicYear);
      }
      
      // Cache the result
      academicYearsCache = years;
      academicYearsCacheTime = now;
      
      return years;
    } catch (error) {
      
      // Return cached data if available, otherwise fallback
      if (academicYearsCache) {
        return academicYearsCache;
      }
      // Return current academic year as fallback
      return currentAcademicYear ? [currentAcademicYear] : [];
    }
  };

  const getCompiledResultsByYearAndTerm = async (academicYear: string, term: string): Promise<CompiledResult[]> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const result = await sqlDatabase.executeQuery(
        "SELECT * FROM compiled_results WHERE academic_year = ? AND term = ? ORDER BY student_id",
        [academicYear, term]
      );
      // Handle database response format: {success: true, data: [...]}
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          return result;
        } else if (Array.isArray(result.data)) {
          return result.data;
        }
      }
      return [];
    } catch (error) {
      
      return [];
    }
  };

  const updateCurrentTerm = async (term: string) => {
    const prevTerm = currentTerm;
    setCurrentTerm(term);
    try {
      const token = tokenManager.getToken();
      const year = currentAcademicYear || '';
      const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ atomic: true, current_academic_year: year, current_term: term })
      });
      if (!resp.ok) throw new Error(`Failed to persist term: ${resp.status}`);
      const json = await resp.json();
      if (!json || json.success !== true) throw new Error(json?.message || 'API error');

      termAndYearCache.current = { term: null, year: null, timestamp: 0 };
      setSubjectAssignments([]);
      setClassTeacherAssignments([]);
      setScores([]);
      setCompiledResults([]);
      setAttendances([]);
    } catch (error) {
      if (prevTerm !== null) setCurrentTerm(prevTerm);
    }
  };

  // Combined update to set both academic year and term in a single operation
  const updateCurrentTermAndYear = async (year: string, term: string) => {
    // Save previous values in case the API call fails
    const prevYear = currentAcademicYear;
    const prevTerm = currentTerm;

    // Update local state first so dependent UI uses new values immediately
    setCurrentAcademicYear(year);
    setCurrentTerm(term);

    try {
      // Persist both settings atomically via API endpoint
      const token = tokenManager.getToken();
      const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ atomic: true, current_academic_year: year, current_term: term })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to persist term/year: ${resp.status} ${text}`);
      }

      const json = await resp.json();
      if (!json || json.success !== true) {
        throw new Error(`API error persisting term/year: ${JSON.stringify(json)}`);
      }

      // Invalidate cache once
      termAndYearCache.current = {
        term,
        year,
        timestamp: 0
      };

      // Clear local data so it reloads on next access
      setSubjectAssignments([]);
      setClassTeacherAssignments([]);
      setScores([]);
      setCompiledResults([]);
      setAttendances([]);

    } catch (error) {
      // Restore previous state on failure to keep UI in sync with DB
      if (prevYear !== null) setCurrentAcademicYear(prevYear);
      if (prevTerm !== null) setCurrentTerm(prevTerm);
      toast.error(error instanceof Error ? error.message : 'Failed to update term/year');
    }
  };

  const updateAttendanceRequirements = async (requirements: Record<string, number>) => {
    
    // Optimistically update local state so UI reflects the user's inputs immediately.
    // We will refresh from DB after persistence to ensure the UI shows the authoritative values.
    setAttendanceRequirements(requirements);

    try {
      // Ensure auth token exists for API calls
      await tokenManager.ensureToken(currentUser);
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('Authentication required to update attendance requirements');
      }

      // Persist each term's requirement using the dedicated school_settings endpoint
      // (this aligns with the actual school_settings schema using updated_at, not updated_date)
      for (const [term, days] of Object.entries(requirements)) {
        const settingKey = `attendance_${term.toLowerCase().replace(/\s+/g, '_')}`;

        const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            setting_key: settingKey,
            setting_value: String(days ?? 0),
            setting_type: 'number',
            description: 'Attendance required days'
          })
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to save ${settingKey}: ${resp.status} ${text}`);
        }

        const json = await resp.json();
        if (!json || json.success !== true) {
          throw new Error(`Failed to save ${settingKey}: ${JSON.stringify(json)}`);
        }
      }

      // Reload authoritative values from DB
      await loadAttendanceRequirements();

      // Refresh compiled results and attendance data to keep calculations consistent
      await loadCompiledResultsFromAPI();
      await loadAttendancesFromAPI();
    } catch (error) {
      // Roll back local state to match DB truth and propagate error so the UI shows failure
      try {
        await loadAttendanceRequirements();
      } catch {
        // Ignore rollback errors; original error is more important
      }

      throw error;
    }
  };

  const getAttendanceRequirements = () => {
    return attendanceRequirements;
  };

  const loadAttendanceRequirements = async () => {
    try {
      // Test database connection first
      await sqlDatabase.executeQuery("SELECT 1 as test");
      
      const terms = ['first_term', 'second_term', 'third_term'];
      const requirements: Record<string, number> = {};
      
      for (const term of terms) {
        const settingKey = `attendance_${term}`;
        
        try {
          const result = await sqlDatabase.executeQuery(
            "SELECT setting_value FROM school_settings WHERE setting_key = ?",
            [settingKey]
          );
          
          // Handle database response format - check for nested data array
          // Response format: {data: {data: [...], insertId: null, affectedRows: null}}
          const data = result?.data?.data || result?.data || result;
          
          if (data && data.length > 0) {
            const termName = term.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            requirements[termName] = parseInt(data[0].setting_value) || 0;
          }
        } catch (queryError) {
          
        }
      }
      
      setAttendanceRequirements(requirements);
      return requirements;
    } catch (error: any) {
      
      return {};
    }
  };

  const updateCurrentAcademicYear = async (year: string) => {
    const prevYear = currentAcademicYear;
    setCurrentAcademicYear(year);
    try {
      const token = tokenManager.getToken();
      const term = currentTerm || '';
      const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ atomic: true, current_academic_year: year, current_term: term })
      });
      if (!resp.ok) throw new Error(`Failed to persist academic year: ${resp.status}`);
      const json = await resp.json();
      if (!json || json.success !== true) throw new Error(json?.message || 'API error');

      termAndYearCache.current = { term: null, year: null, timestamp: 0 };
      await loadCompiledResultsFromAPI();
      await loadScoresFromAPI();
      await loadAttendancesFromAPI();
      await loadAffectiveDomainsFromAPI();
      await loadPsychomotorDomainsFromAPI();
    } catch (error) {
      if (prevYear !== null) setCurrentAcademicYear(prevYear);
    }
  };

  const updateTermDates = async (dates: {
    termStartDate: string;
    termEndDate: string;
    nextTermStarts: string;
    schoolResumptionDate: string;
    midTermBreakStart: string;
    midTermBreakEnd: string;
  }) => {
    // Basic validation
    const ts = dates.termStartDate ? new Date(dates.termStartDate) : null;
    const te = dates.termEndDate ? new Date(dates.termEndDate) : null;
    const nt = dates.nextTermStarts ? new Date(dates.nextTermStarts) : null;
    const mbs = dates.midTermBreakStart ? new Date(dates.midTermBreakStart) : null;
    const mbe = dates.midTermBreakEnd ? new Date(dates.midTermBreakEnd) : null;

    if (ts && te && ts.getTime() > te.getTime()) {
      throw new Error('Term start date must be before or equal to term end date');
    }
    if (mbs && ts && mbs.getTime() < ts.getTime()) {
      throw new Error('Mid-term break start must be within the term dates');
    }
    if (mbe && te && mbe.getTime() > te.getTime()) {
      throw new Error('Mid-term break end must be within the term dates');
    }
    if (mbs && mbe && mbe.getTime() < mbs.getTime()) {
      throw new Error('Mid-term break end must be after or equal to its start');
    }
    if (nt && te && nt.getTime() < te.getTime()) {
      throw new Error('Next term start must be on or after term end date');
    }

    setTermDates(dates);
    // Persist via the dedicated endpoint so we have consistent auth + response semantics.
    // Also: do not swallow errors; propagate them so the UI can show a failure toast.
    await tokenManager.ensureToken(currentUser);
    const token = tokenManager.getToken();
    if (!token) {
      throw new Error('Authentication required to update term dates');
    }

    const dateSettings = [
      { key: 'term_start_date', value: dates.termStartDate },
      { key: 'term_end_date', value: dates.termEndDate },
      { key: 'next_term_starts', value: dates.nextTermStarts },
      { key: 'school_resumption_date', value: dates.schoolResumptionDate },
      { key: 'mid_term_break_start', value: dates.midTermBreakStart },
      { key: 'mid_term_break_end', value: dates.midTermBreakEnd }
    ];

    for (const setting of dateSettings) {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          setting_key: setting.key,
          setting_value: String(setting.value ?? ''),
          setting_type: 'date',
          description: 'Term date setting'
        })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to save ${setting.key}: ${resp.status} ${text}`);
      }

      const json = await resp.json();
      if (!json || json.success !== true) {
        throw new Error(`Failed to save ${setting.key}: ${JSON.stringify(json)}`);
      }
    }

    // Reload authoritative values after persistence
    await loadTermDates();
  };

  const getTermDates = useCallback(() => {
    return termDates;
  }, [termDates]);

  const loadTermDates = async () => {
    try {
      // Parents cannot call /database/query. Use the dedicated endpoint instead.
      const token = tokenManager.getToken();
      const resp = await fetch(`${API_CONFIG.BASE_URL}/school_settings.php`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!resp.ok) {
        return;
      }

      const json = await resp.json();
      const rows = (json && json.success === true && Array.isArray(json.data)) ? json.data : [];

      const keySet = new Set([
        'term_start_date',
        'term_end_date',
        'next_term_starts',
        'school_resumption_date',
        'mid_term_break_start',
        'mid_term_break_end'
      ]);

      const loadedDates: Record<string, string> = {};
      for (const row of rows) {
        const k = String((row as any)?.setting_key || '');
        if (!keySet.has(k)) continue;
        loadedDates[k] = String((row as any)?.setting_value ?? '');
      }

      setTermDates(prev => ({
        termStartDate: loadedDates.term_start_date || prev.termStartDate,
        termEndDate: loadedDates.term_end_date || prev.termEndDate,
        nextTermStarts: loadedDates.next_term_starts || prev.nextTermStarts,
        schoolResumptionDate: loadedDates.school_resumption_date || prev.schoolResumptionDate,
        midTermBreakStart: loadedDates.mid_term_break_start || prev.midTermBreakStart,
        midTermBreakEnd: loadedDates.mid_term_break_end || prev.midTermBreakEnd
      }));
    } catch (error) {
      
    }
  };

  const getTeacherClassTeacherAssignments = (teacherId: number): number[] => {
    return (classes || []).filter(c => c.classTeacherId === teacherId).map(c => c.id);
  };

  const validateClassTeacherAssignment = (teacherId: number, newClassId: number): { valid: boolean; message: string } => {
    const currentAssignments = getTeacherClassTeacherAssignments(teacherId);
    
    // Check if already assigned to this class
    if (currentAssignments.includes(newClassId)) {
      return { valid: false, message: 'Teacher is already class teacher for this class' };
    }
    
    // Check if limit of 3 classes will be exceeded
    if (currentAssignments.length >= 3) {
      return { 
        valid: false, 
        message: 'Teacher cannot be class teacher for more than 3 classes. Current assignments: ' + currentAssignments.length 
      };
    }
    
    return { valid: true, message: 'Valid assignment' };
  };

  const updateSchoolSettings = async (settings: Partial<SchoolSettings>) => {
    setSchoolSettings({ ...schoolSettings, ...settings });
    // Also update database
    try {
      const settingEntries = Object.entries(settings);
      
      for (const [key, value] of settingEntries) {
        if (value !== undefined) {
          // First try to update, if no rows affected, insert
          const updateResult = await sqlDatabase.executeQuery(
            `UPDATE school_settings SET setting_value = ? WHERE setting_key = ?`,
            [value, key]
          );
          
          // If update didn't affect any rows, insert the setting
          if (updateResult.affectedRows === 0) {
            await sqlDatabase.executeQuery(
              `INSERT INTO school_settings (setting_key, setting_value) VALUES (?, ?)`,
              [key, value]
            );
          }
        }
      }
    } catch (error) {
      
    }
  };

  // Bank Account Settings Methods
  const updateBankAccountSettings = async (settings: Omit<BankAccountSettings, 'id' | 'updated_date'>) => {
    try {
      const dbPayload: any = {
        bank_name: settings.bank_name,
        account_name: settings.account_name,
        account_number: settings.account_number,
        bank_transfer_enabled: settings.payment_methods.bank_transfer ? 1 : 0,
        online_payment_enabled: settings.payment_methods.online_payment ? 1 : 0,
        cash_payment_enabled: settings.payment_methods.cash ? 1 : 0,
        updated_by: settings.updated_by,
      };

      const existing = await sqlDatabase.executeQuery('SELECT id FROM bank_account_settings LIMIT 1');
      if (existing && existing.data && existing.data.length > 0) {
        await sqlDatabase.updateRecord('bank_account_settings', existing.data[0].id, dbPayload);
      } else {
        await sqlDatabase.insertRecord('bank_account_settings', dbPayload);
      }

      const newSettings: BankAccountSettings = {
        ...settings,
        id: existing?.data?.[0]?.id || 1,
        updated_date: new Date().toISOString(),
      };
      setBankAccountSettings(newSettings);
    } catch (error) {
      // Silent fail
    }
  };

  const getBankAccountSettings = () => {
    return bankAccountSettings;
  };

  const createUserAPI = async (userData: any): Promise<User | null> => {
    try {
      
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      // Call the PHP API endpoint instead of SQL database
      const response = await fetch(`${API_CONFIG.BASE_URL}/user/create.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        cache: 'no-store',
        body: JSON.stringify(userData)
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = rawText ? JSON.parse(rawText) : null;
      } catch {
        result = null;
      }

      if (!response.ok) {
        const msg = result?.error || result?.message || rawText || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      if (!result) {
        throw new Error('Invalid server response');
      }
      
      
      // Handle both response formats - direct success or wrapped in data
      const isSuccess = result.success || (result.data && result.data.success);
      const createdUserData = result.data || result;
      
      if (isSuccess && createdUserData) {
        
        
        // Add small delay to ensure database commit completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload users from API
        await loadUsersFromAPI();

        // Refresh role-linked records so UI can immediately resolve linked_id
        try {
          const createdRole = String(createdUserData?.role || userData?.role || '').toLowerCase();
          if (createdRole === 'parent') {
            await loadParentsFromAPI();
          } else if (createdRole === 'teacher') {
            await loadTeachersFromAPI();
          } else if (createdRole === 'accountant') {
            await loadAccountantsFromAPI();
          }
        } catch (e) {
          // Ignore refresh failures; user creation already succeeded
        }
        
        // Force UI update with timeout to ensure React re-renders
        setTimeout(() => {
          
        }, 100);
        
        return createdUserData;
      } else {
        const msg = result?.error || result?.message || createdUserData?.error || 'User creation failed';
        throw new Error(msg);
      }
    } catch (error) {
      
      throw error;
    }
  };

  const updateUserAPI = async (id: number, userData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const params = { id, ...userData };
      const result = await api.put<any>(`/user/update.php?id=${encodeURIComponent(String(id))}`, params);
      
      
      if (result && result.success) {
        
        
        // Add small delay to ensure database commit completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload users from API
        await loadUsersFromAPI();
        
        // Force UI update with timeout to ensure React re-renders
        setTimeout(() => {
          
        }, 100);
        
        return true;
      } else {
        const msg = result?.error || result?.message || 'User update failed';
        throw new Error(msg);
      }
    } catch (error) {
      
      throw error;
    }
  };

  const deleteUserAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const result = await api.delete<any>(`/user/delete.php?id=${encodeURIComponent(String(id))}`);
      
      
      if (result && result.success) {
        
        await loadUsersFromAPI();
        return true;
      } else {
        
        // Don't treat "User not found" as a critical error since user might already be deleted
        const errMsg = (result?.error || result?.message || '').toString();
        if (errMsg.includes('User not found')) {
          
          await loadUsersFromAPI(); // Still refresh the list
          return true; // Don't show error to user for already-deleted items
        }
        throw new Error(result?.error || result?.message || 'User delete failed');
      }
    } catch (error) {
      
      throw error;
    }
  };

  const updateUserStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const result = await api.put<any>(`/user/update.php?id=${encodeURIComponent(String(id))}`, { id, status });
      
      if (result && result.success) {
        
        
        // Add small delay to ensure database commit completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload users from API
        await loadUsersFromAPI();
        
        // Force UI update with timeout to ensure React re-renders
        setTimeout(() => {
          
        }, 100);
        
        return true;
      } else {
        
        return false;
      }
    } catch (error) {
      
      return false;
    }
  };

  const resetUserPassword = async (id: number): Promise<string> => {
    try {
      // Generate a temporary password
      const tempPassword = 'Temp' + Math.random().toString(36).slice(-8);
      const result = await sqlDatabase.updateRecord('users', id, { password_hash: tempPassword });
      if (result) {
        await loadUsersFromAPI();
        return tempPassword;
      }
      throw new Error('Failed to reset password');
    } catch (error) {
      
      throw new Error('Failed to reset password');
    }
  };

  const resetUserPasswordAPI = async (id: number, newPassword?: string): Promise<string> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await fetch(`${API_CONFIG.BASE_URL}/user/reset-password.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        cache: 'no-store',
        body: JSON.stringify({ 
          id,
          password: newPassword 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadUsersFromAPI();
        return result.data.temp_password;
      } else {
        throw new Error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      
      throw error;
    }
  };

  const getUserPermissionsAPI = async (userId: number): Promise<string[]> => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return [];
      
      // Use the centralized permissions system
      const { getRolePermissions } = await import('../utils/permissions');
      return getRolePermissions(user.role);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }
  };

  const checkUserPermissionAPI = (role: string, permission: string): boolean => {
    try {
      // Use the centralized permissions system
      // This is synchronous, so we need to use the cached version
      const { ROLE_DEFAULT_PERMISSIONS } = require('../utils/permissions');
      const rolePermissions = ROLE_DEFAULT_PERMISSIONS[role] || [];
      return rolePermissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  // Helper function to update class student count
  const updateCompiledResult = async (id: number, resultData: any): Promise<void> => {
    try {
      // Update database
      await sqlDatabase.updateRecord('compiled_results', id, resultData);
      
      // Update local state
      setCompiledResults(prev => prev.map((r: any) => (r.id === id ? { ...r, ...resultData } : r)));
    } catch (error) {
      
      throw error;
    }
  };

  const deleteCompiledResult = async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteRecord('compiled_results', id);
      setCompiledResults(prev => prev.filter((r: any) => r.id !== id));
      await loadCompiledResultsFromAPI(null);
    } catch (error) {
      throw error;
    }
  };

  const getResultsByClass = (classId: number) => {
    return compiledResults.filter((r: any) => r.class_id === classId);
  };

  // Payment Functions
  const addPayment = async (payment: CreatePaymentPayload): Promise<void> => {
    try {
      // Map frontend fields to backend expected fields
      // Backend expects: student_id, amount, payment_type, payment_method, term, academic_year, notes
      const payload = {
        student_id: payment.student_id,
        invoice_id: payment.invoice_id,
        amount: payment.amount,
        payment_type: payment.payment_type || 'School Fees',
        payment_method: payment.payment_method,
        term: payment.term || currentTerm,
        academic_year: payment.academic_year || currentAcademicYear,
        notes: payment.notes,
        transaction_reference: payment.transaction_reference || payment.reference
      };

      // Use the main payments endpoint (POST /payments) which is wired to createPayment
      const response = await api.post<any>('/payments', payload);
      
      if (response.success) {
        // Refresh payments list and fee balances
        await loadPaymentsFromAPI();
        await loadStudentFeeBalancesFromAPI();
        toast.success('Payment recorded successfully');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to record payment');
      }
    } catch (error: any) {
      
      toast.error(error.message || 'Failed to record payment');
      throw error;
    }
  };

  const updatePayment = async (id: number, payment: Partial<Payment>): Promise<void> => {
    // Note: This is mainly for local state or if we add an update endpoint later
    setPayments(payments.map((p: Payment) => (p.id === id ? { ...p, ...payment } : p)));
  };

  const verifyPayment = async (
    id: number,
    data?: {
      action: 'verify' | 'reject';
      rejection_reason?: string;
      adjusted_amount?: number;
      adjustment_reason?: string;
    }
  ): Promise<void> => {
    try {
      const response = await api.post<any>(`/payments/verify/${id}`, data || { action: 'verify' });
      
      if (response.success) {
        // Update local state based on action
        const updatedStatus = data?.action === 'reject' ? 'Rejected' : 'Verified';
        setPayments(payments.map((p: Payment) => (p.id === id ? { 
          ...p, 
          status: updatedStatus, 
          verified_date: new Date().toISOString(),
          amount: (data?.action !== 'reject' && typeof data?.adjusted_amount === 'number' && Number.isFinite(data.adjusted_amount) && data.adjusted_amount > 0)
            ? data.adjusted_amount
            : p.amount,
          notes: data?.action === 'reject' && data.rejection_reason 
            ? `${p.notes || ''}\nRejection: ${data.rejection_reason}` 
            : (data?.action !== 'reject' && typeof data?.adjusted_amount === 'number' && data.adjustment_reason && Number.isFinite(data.adjusted_amount) && data.adjusted_amount > 0 && data.adjusted_amount !== p.amount)
              ? `${p.notes || ''}\nAmount adjusted from ${p.amount} to ${data.adjusted_amount}. Reason: ${data.adjustment_reason}`
            : p.notes
        } : p)));
        
        // Refresh fee balances since verification/rejection affects amounts
        await loadStudentFeeBalancesFromAPI();
        
        if (data?.action === 'reject') {
          toast.error('Payment rejected');
        } else {
          toast.success('Payment verified successfully');
        }
        
      } else {
        throw new Error(response.message || 'Failed to verify payment');
      }
    } catch (error: any) {
      
      toast.error(error.message || 'Failed to verify payment');
      throw error;
    }
  };

  const rejectPayment = async (id: number, reason: string): Promise<void> => {
    try {
      const response = await api.post<any>(`/payments/verify/${id}`, { action: 'reject', rejection_reason: reason });
      
      if (response.success) {
        setPayments(payments.map((p: Payment) => (p.id === id ? { ...p, status: 'Rejected', notes: (p.notes || '') + '\nRejection: ' + reason } : p)));
        toast.success('Payment rejected');
      } else {
        throw new Error(response.message || 'Failed to reject payment');
      }
    } catch (error: any) {
      
      toast.error(error.message || 'Failed to reject payment');
      throw error;
    }
  };

  const getPaymentsByStudent = (studentId: number) => {
    return payments.filter((p: Payment) => p.student_id === studentId);
  };

  // Fee Functions
  const addFeeStructure = async (feeStructure: any): Promise<number> => {
    try {
      // Accountants/admin can persist fee structures via SQL (internal API).
      // Parents must never call /database/query.
      if (currentUser?.role === 'parent') {
        throw new Error('Not allowed');
      }

      // Validate fee amounts are non-negative
      const feeFields = ['tuition_fee', 'development_levy', 'sports_fee', 'exam_fee', 'books_fee', 'uniform_fee', 'transport_fee', 'total_fee'];
      for (const field of feeFields) {
        if (feeStructure[field] !== undefined && feeStructure[field] < 0) {
          throw new Error(`${field.replace(/_/g, ' ')} cannot be negative`);
        }
      }

      // Validate required fields
      if (!feeStructure.class_id || !feeStructure.term || !feeStructure.academic_year) {
        throw new Error('Class, term, and academic year are required');
      }

      // Validate academic year format (YYYY/YYYY)
      const yearPattern = /^\d{4}\/\d{4}$/;
      if (!yearPattern.test(feeStructure.academic_year)) {
        throw new Error('Academic year must be in YYYY/YYYY format (e.g., 2024/2025)');
      }

      // Check for existing fee structure for same class/term/year
      const existing = feeStructures.find((f: any) => 
        f.class_id === feeStructure.class_id && 
        f.term === feeStructure.term && 
        f.academic_year === feeStructure.academic_year
      );
      if (existing) {
        throw new Error('A fee structure already exists for this class, term, and academic year. Please update the existing one instead.');
      }

      const insertId = await sqlDatabase.insertRecord('fee_structures', feeStructure);
      await loadFeeStructuresFromAPI();
      return Number(insertId) || 0;
    } catch (error) {
      throw error;
    }
  };

  const updateFeeStructure = async (id: number, feeStructure: any): Promise<void> => {
    try {
      if (currentUser?.role === 'parent') {
        throw new Error('Not allowed');
      }

      // Validate fee amounts are non-negative
      const feeFields = ['tuition_fee', 'development_levy', 'sports_fee', 'exam_fee', 'books_fee', 'uniform_fee', 'transport_fee', 'total_fee'];
      for (const field of feeFields) {
        if (feeStructure[field] !== undefined && feeStructure[field] < 0) {
          throw new Error(`${field.replace(/_/g, ' ')} cannot be negative`);
        }
      }

      // Validate academic year format if provided
      if (feeStructure.academic_year) {
        const yearPattern = /^\d{4}\/\d{4}$/;
        if (!yearPattern.test(feeStructure.academic_year)) {
          throw new Error('Academic year must be in YYYY/YYYY format (e.g., 2024/2025)');
        }
      }

      await sqlDatabase.updateRecord('fee_structures', id, feeStructure);
      await loadFeeStructuresFromAPI();
    } catch (error) {
      throw error;
    }
  };

  const getFeeStructureByClass = (classId: number, term: string, academicYear: string) => {
    // Filter all matching structures and return the most recent one (highest ID)
    const matches = feeStructures.filter((f: any) => 
      f.class_id === classId && f.term === term && f.academic_year === academicYear
    );
    if (matches.length === 0) return null;
    // Sort by ID descending and return the first (most recent)
    matches.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    return matches[0];
  };

  const getStudentFeeBalance = (studentId: number): StudentFeeBalance | null => {
    const balance = studentFeeBalances.find((b: StudentFeeBalance) => b.student_id === studentId);
    return balance || null;
  };

  const updateStudentFeeBalance = async (_studentId: number, _balance: Partial<StudentFeeBalance>): Promise<void> => {
    // Student fee balances are now backend-authoritative via invoices/payments.
    // Keep this method as a no-op to avoid breaking older pages while we migrate.
    return;
  };

  // Invoice Ledger Functions
  const autoGenerateInvoices = async (classId: number, term: string, academicYear: string): Promise<any> => {
    await tokenManager.ensureToken(currentUser);
    const payload = { class_id: classId, term, academic_year: academicYear };
    const res: any = await api.post('/invoices/auto-generate', payload);
    if (res && res.success) {
      return res.data;
    }
    throw new Error(res?.message || 'Failed to auto-generate invoices');
  };

  const getStudentInvoice = async (studentId: number, term: string, academicYear: string): Promise<StudentInvoiceSummary> => {
    await tokenManager.ensureToken(currentUser);
    const res: any = await api.get(`/invoices/student/${studentId}`, { term, academic_year: academicYear });
    if (res && res.success) {
      return res.data as StudentInvoiceSummary;
    }
    throw new Error(res?.message || 'Failed to fetch student invoice');
  };

  const getClassInvoices = async (classId: number, term: string, academicYear: string): Promise<any[]> => {
    await tokenManager.ensureToken(currentUser);
    const res: any = await api.get(`/invoices/class/${classId}`, { term, academic_year: academicYear });
    if (res && res.success) {
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows;
    }
    throw new Error(res?.message || 'Failed to fetch class invoices');
  };

  // Notification Methods
  // Ensure notifications table has required JSON columns for per-user targeting and deletion
  const ensureNotificationSchema = async (): Promise<void> => {
    try {
      // Parents must never call /database/query (used inside sqlDatabase.executeQuery), so skip schema checks.
      if (currentUser?.role === 'parent') {
        return;
      }

      const res = await sqlDatabase.executeQuery("SHOW COLUMNS FROM notifications");
      const fields: string[] = Array.isArray(res?.data)
        ? res.data.map((row: any) => String(row.Field))
        : [];

      const needsTargetUsers = !fields.includes('target_users');
      const needsDeletedBy = !fields.includes('deleted_by');

      if (needsTargetUsers) {
        await sqlDatabase.executeQuery("ALTER TABLE notifications ADD COLUMN target_users TEXT NULL");
      }
      if (needsDeletedBy) {
        await sqlDatabase.executeQuery("ALTER TABLE notifications ADD COLUMN deleted_by TEXT NULL");
      }
    } catch (e) {
      
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id'>): Promise<number> => {
    try {
      // Admin: persist notifications via REST so parents can access them.
      if (currentUser?.role === 'admin') {
        const audienceMap: Record<string, string> = {
          all: 'All',
          teachers: 'Teacher',
          parents: 'Parent',
          students: 'Students',
          accountants: 'Accountant',
          admin: 'Admin'
        };

        const typeMap: Record<string, string> = {
          info: 'Info',
          warning: 'Warning',
          success: 'Success',
          error: 'Error'
        };

        const payload: any = {
          title: notification.title,
          message: notification.message,
          target_audience: audienceMap[String(notification.targetAudience || 'all')] || 'All',
          type: typeMap[String(notification.type || 'info')] || 'Info',
          priority: 'Medium'
        };

        // FIX: Include target_users if specific users are selected
        if (notification.targetUsers && notification.targetUsers.length > 0) {
          payload.target_users = notification.targetUsers;
        }

        const res = await api.post<any>(API_CONFIG.ENDPOINTS.NOTIFICATIONS.CREATE, payload);
        const createdId = Number((res as any)?.data?.id || 0);

        // Refresh list from API so admin and parents see the same data
        await loadNotificationsFromAPI();

        return createdId || 0;
      }

      // Make sure schema supports new columns before insert
      await ensureNotificationSchema();
      const notificationData = {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target_audience: notification.targetAudience,
        sent_by: notification.sentBy,
        sent_date: notification.sentDate,
        is_read: notification.isRead ? 1 : 0,
        read_by: JSON.stringify(notification.readBy || []),
        target_users: JSON.stringify(notification.targetUsers || []),
        deleted_by: JSON.stringify(notification.deletedBy || [])
      };

      const insertId = await sqlDatabase.insertRecord('notifications', notificationData);

      const newNotification: Notification = {
        ...notification,
        id: Number(insertId),
        readBy: notification.readBy || [],
        targetUsers: notification.targetUsers || [],
        deletedBy: notification.deletedBy || []
      };

      setNotifications(prev => [...prev, newNotification]);
      return Number(insertId);
    } catch (error) {
      
      // Fallback: add to local state only
      const newId = notifications.length > 0 
        ? Math.max(...notifications.map((n: Notification) => n.id)) + 1 
        : 1;

      const fallbackNotification: Notification = {
        ...notification,
        id: newId,
        readBy: notification.readBy || [],
        targetUsers: notification.targetUsers || [],
        deletedBy: notification.deletedBy || []
      };

      setNotifications(prev => [...prev, fallbackNotification]);
      return newId;
    }
  };

  const markNotificationAsRead = async (id: number): Promise<void> => {
    const userId = currentUser?.id;

    // Snapshot existing readBy from current state for DB update
    const existing = notifications.find((n: Notification) => n.id === id);
    const existingReadBy = existing && Array.isArray(existing.readBy) ? existing.readBy : [];
    const nextReadBy = userId
      ? Array.from(new Set<number>([...existingReadBy, userId]))
      : existingReadBy;

    // Optimistic local update
    setNotifications(prev =>
      prev.map((n: Notification) =>
        n.id === id
          ? { ...n, isRead: true, readBy: nextReadBy }
          : n
      )
    );

    // Persist to backend (per-user read)
    try {
      await api.put(API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    } catch (error) {
      // If the call fails, reload from API to resync
      try {
        await loadNotificationsFromAPI();
      } catch (e) {
        
      }
    }
  };

  const getAllNotifications = (): Notification[] => {
    const userRole = currentUser?.role;
    const userId = currentUser?.id;

    if (!userRole) {
      return [];
    }

    return notifications.filter((n: Notification) => {
      const audience = n.targetAudience;
      const hasTargetUsers = Array.isArray(n.targetUsers) && n.targetUsers.length > 0;
      const isTargetedToUser = hasTargetUsers && userId != null ? n.targetUsers!.includes(userId) : true;
      const isDeletedForUser = Array.isArray(n.deletedBy) && userId != null ? n.deletedBy!.includes(userId) : false;

      if (isDeletedForUser) return false;

      if (userRole === 'admin') {
        return isTargetedToUser && (audience === 'all' || audience === 'accountants' || audience === 'teachers' || audience === 'parents' || audience === 'students');
      }

      if (audience === 'all') {
        return isTargetedToUser;
      }

      if (userRole === 'teacher' && audience === 'teachers') return isTargetedToUser;
      if (userRole === 'parent' && audience === 'parents') return isTargetedToUser;
      if (userRole === 'accountant' && audience === 'accountants') return isTargetedToUser;

      return false;
    });
  };

  const getUnreadNotifications = (): Notification[] => {
    return getAllNotifications().filter((n: Notification) => !n.isRead);
  };

  // Subject Registration
  const registerSubjectForClass = async (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory?: boolean): Promise<boolean> => {
    try {
      
      const success = await registerSubjectForClassAPI(classId, subjectId, academicYear, term, isCompulsory);
      if (success) {
        await loadSubjectRegistrationsFromAPI();
      }
      return success;
    } catch (error) {
      
      return false;
    }
  };

  // Helper function to update class student count
  const updateClassStudentCount = async (classId: number): Promise<void> => {
    try {
      const studentCount = students.filter(s => s.class_id === classId).length;
      await sqlDatabase.updateRecord('classes', classId, { current_students: studentCount });
      await loadClassesFromAPI();
    } catch (error) {
      
    }
  };

  // Promotion Methods
  const promoteStudent = (studentId: number, newClassId: number, newAcademicYear: string) => {
    const student = students.find(s => s.id === studentId);
    const newClass = classes.find(c => c.id === newClassId);
    
    if (!student || !newClass) return;
    
    setStudents(students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          class_id: newClassId,
          class_name: newClass.name,
          level: newClass.level,
          academic_year: newAcademicYear,
        };
      }
      return s;
    }));
    
    // Update class student counts
    updateClassStudentCount(student.class_id);
    updateClassStudentCount(newClassId);
  };

  const promoteMultipleStudents = (studentIds: number[], classMapping: { [studentId: number]: number }, newAcademicYear: string) => {
    studentIds.forEach(studentId => {
      const newClassId = classMapping[studentId];
      if (newClassId) {
        promoteStudent(studentId, newClassId, newAcademicYear);
      }
    });
  };

  // Attendance Methods
  const addAttendance = async (attendance: Omit<Attendance, 'id'>): Promise<number> => {
    try {
      // Save to database
      const result = await sqlDatabase.createAttendance(attendance);
      if (result && result.id) {
        // Update local state
        const newAttendance = { ...attendance, id: result.id };
        setAttendances([...attendances, newAttendance]);
        return result.id;
      }
      throw new Error('Failed to create attendance record');
    } catch (error) {
      
      throw error;
    }
  };

  const updateAttendance = async (id: number, attendance: Partial<Attendance>): Promise<void> => {
    try {
      // Update database
      await sqlDatabase.updateRecord('attendance', id, attendance);
      // Update local state
      setAttendances(attendances.map((a: Attendance) => (a.id === id ? { ...a, ...attendance } : a)));
    } catch (error) {
      
      throw error;
    }
  };

  const deleteAttendance = async (id: number): Promise<void> => {
    try {
      // Delete from database
      await sqlDatabase.deleteRecord('attendance', id);
      // Update local state
      setAttendances(attendances.filter((a: Attendance) => a.id !== id));
    } catch (error) {
      
      throw error;
    }
  };

  const getAttendancesByStudent = (studentId: number) => {
    return attendances.filter(a => a.student_id === studentId);
  };

  const getAttendancesByClass = (classId: number) => {
    return attendances.filter(a => a.class_id === classId);
  };

  const getAttendancesByDate = (date: string) => {
    return attendances.filter(a => a.date === date);
  };

  // Missing Functions
  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const effectiveUser: any = currentUser || getApiCurrentUser();
      const hasToken = await tokenManager.ensureToken(effectiveUser);
      if (!hasToken) return false;

      const response = await api.post(API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        current_password: oldPassword,
        new_password: newPassword,
      });

      return Boolean((response as any)?.success);
    } catch (error) {
      return false;
    }
  };

  const deleteNotification = async (id: number): Promise<void> => {
    const userId = currentUser?.id;

    try {
      // Single REST endpoint:
      // - Admin: global delete
      // - Parent/others: dismiss for themselves
      await api.delete(API_CONFIG.ENDPOINTS.NOTIFICATIONS.DELETE(id));

      // Update local state optimistically
      if (currentUser?.role === 'admin') {
        // Admin: permanently remove from state
        setNotifications(prev => prev.filter((n: Notification) => n.id !== id));
      } else {
        // FIX: Non-admin: add to deletedBy array instead of removing
        // This ensures the notification is filtered out by getAllNotifications()
        setNotifications(prev =>
          prev.map((n: Notification) =>
            n.id === id
              ? { ...n, deletedBy: [...(n.deletedBy || []), ...(userId ? [userId] : [])] }
              : n
          )
        );
      }
    } catch (error) {

      toast.error('Failed to delete notification');
      // On failure, reload notifications to resync local state
      try {
        await loadNotificationsFromAPI();
      } catch (e) {

      }
      return;
    }
  };

  const getClassTeacher = (classId: number): Teacher | null => {
    const classData = classes.find((c: Class) => c.id === classId);
    if (classData && classData.classTeacherId) {
      return teachers.find((t: Teacher) => t.id === classData.classTeacherId) || null;
    }
    return null;
  };

  const getClassSubjects = (classId: number): Subject[] => {
    const subjectIds = subjectRegistrations
      .filter((sr: SubjectRegistration) => sr.class_id === classId && sr.status === 'Active')
      .map((sr: SubjectRegistration) => sr.subject_id);
    
    return subjects.filter((s: Subject) => subjectIds.includes(s.id));
  };

  // Additional missing functions
  const getTeacherStudents = (_teacherId: number, classId: number): Student[] => {
    return students.filter(s => s.class_id === classId);
  };

  const getParentChildren = (parentId: number): any[] => {
    
    
    
    
    
    // Get children from parent_student_links table
    // Handle both string and number parent_id formats
    const parentStudentLinks = parentStudentLinksData.filter(link => {
      const linkParentId = typeof link.parent_id === 'string' ? parseInt(link.parent_id) : link.parent_id;
      return linkParentId === parentId;
    });
    
    
    
    
    return parentStudentLinks.map(link => {
      const student = students.find(s => s.id === link.student_id);
      
      if (!student) {
        
        return null;
      }
      
      // Check status - only Active students should be shown
      const isActive = student.status === 'Active';
      if (!isActive) {
        
        return null;
      }
      
      
      
      // Get total fees from fee structures
      const feeStructure = feeStructures.find(fs => 
        fs.class_id === student.class_id && fs.academic_year === currentAcademicYear
      );
      const totalFees = feeStructure ? Number(feeStructure.total_fee) : 0;
      
      // Get fee balance from student fee balances (should be empty until payments are made)
      const feeBalanceRecord = studentFeeBalances.find(sfb => sfb.student_id === student.id);
      const feeBalance = feeBalanceRecord ? Number(feeBalanceRecord.balance) : totalFees; // Default to full fee if no payment record
      
      return {
        id: student.id,
        firstName: student.firstName,
        otherName: (student as any).otherName || (student as any).other_name || '',
        lastName: student.lastName,
        fullName: [
          (student as any).firstName,
          (student as any).otherName || (student as any).other_name,
          (student as any).lastName
        ]
          .filter((p: any) => String(p || '').trim() !== '')
          .join(' ')
          .trim(),
        admissionNumber: student.admissionNumber,
        classId: student.class_id,
        className: student.className || classes.find(c => c.id === student.class_id)?.name || 'Unknown',
        classLevel: student.level || classes.find(c => c.id === student.class_id)?.level || 'Unknown',
        gender: student.gender,
        photoUrl: student.photo_url,
        dateOfBirth: student.date_of_birth,
        address: '', // Not available in Student interface
        parentContact: '', // Not available in Student interface  
        enrollmentDate: student.academic_year || '', // Using academic_year as fallback
        status: student.status,
        recentActivities: [],
        feeBalance: feeBalance, // Real fee balance from database
        totalFees: totalFees // Real total fees from fee structures
      };
    }).filter(child => child !== null);
  };

  const getStudentSubjects = (studentId: number): any[] => {
    const student = students.find(s => s.id === studentId);
    if (!student) return [];
    
    const subjectIds = subjectRegistrations
      .filter((sr: SubjectRegistration) => sr.class_id === student.class_id && sr.status === 'Active')
      .map((sr: SubjectRegistration) => sr.subject_id);
    
    return subjects.filter((s: Subject) => subjectIds.includes(s.id)).map(subject => {
      const assignment = subjectAssignments.find(sa => 
        sa.subject_id === subject.id && 
        sa.class_id === student.class_id
      );
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        isCompulsory: subject.is_core || false,
        teacherId: assignment?.teacher_id,
        teacherName: assignment ? `${teachers.find(t => t.id === assignment.teacher_id)?.firstName || ''} ${teachers.find(t => t.id === assignment.teacher_id)?.lastName || ''}`.trim() || 'Unknown' : 'Not Assigned'
      };
    });
  };

  const getStudentRecentScores = (studentId: number) => {
    return scores.filter(s => s.student_id === studentId).slice(-10);
  };

  const linkStudentToParent = async (parentId: number, studentId: number, relationship: "Father" | "Mother" | "Guardian" = "Guardian"): Promise<boolean> => {
    try {
      
      
      // Fetch latest links directly (REST then SQL fallback) so pre-checks match DB truth.
      const fetchLatestLinks = async (): Promise<any[]> => {
        try {
          const linksResponse = await api.get('/parent-student-links');
          const linksData = (linksResponse && linksResponse.success)
            ? ((linksResponse.data as any)?.items || linksResponse.data || [])
            : [];
          return Array.isArray(linksData) ? linksData : [];
        } catch (e) {
          // ignore and fallback below
        }
        try {
          const sqlResult = await sqlDatabase.executeQuery(
            `SELECT id, parent_id, student_id, relationship, is_primary, created_at
             FROM parent_student_links
             ORDER BY created_at DESC`
          );
          const rows: any[] = Array.isArray((sqlResult as any)?.data) ? (sqlResult as any).data : [];
          return Array.isArray(rows) ? rows : [];
        } catch (e) {
          return [];
        }
      };

      const latestLinksRaw = await fetchLatestLinks();
      const latestLinks = normalizeParentStudentLinks(latestLinksRaw);
      setParentStudentLinksData(latestLinks);

      // Check if this link already exists with latest data
      const existingLink = latestLinks.find(
        (link: any) => String(link.parent_id) === String(parentId) && String(link.student_id) === String(studentId)
      );
      
      
      
      if (existingLink) {
        toast.error('This student is already linked to this parent');
        return false;
      }
      
      // Use API to create link in actual database
      
      const response = await api.post(`/parents/link/${parentId}`, {
        student_id: studentId,
        relationship: relationship,
        is_primary: true
      });
      
      
      
      if (response && response.success) {
        // Optimistically update link table state immediately so UIs update without waiting for refetch
        setParentStudentLinksData(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const exists = safePrev.some((l: any) => String(l.parent_id) === String(parentId) && String(l.student_id) === String(studentId));
          if (exists) return safePrev;
          return [
            {
              id: -(Date.now()),
              parent_id: parentId,
              student_id: studentId,
              relationship: relationship,
              is_primary: true,
              created_at: new Date().toISOString(),
              updated_at: null
            },
            ...safePrev
          ];
        });

        // Get parent information to update student record
        const parent = parents.find(p => p.id === parentId);
        if (parent) {
          // Update student's parent_id and parent_name fields in database
          try {
            await updateStudent(studentId, {
              parent_id: parentId,
              parent_name: `${parent.firstName} ${parent.lastName}`
            });
          } catch (e: any) {
            // Best-effort cache update only; DB link is already created.
          }
        }
        
        // Refresh links from DB truth first (authoritative for count + linked list).
        await loadParentStudentLinksAuthoritative();
        await Promise.allSettled([
          loadStudentsFromAPI(),
          loadParentsFromAPI()
        ]);
        
        
        return true;
      }
      
      
      toast.error('Failed to link student - API response error');
      return false;
    } catch (error: any) {
      
      
      // Always re-check DB truth. Sometimes the API can error after the link row is inserted.
      const checkLinks = async () => {
        await loadParentStudentLinksAuthoritative();
        const linksNow = Array.isArray(parentStudentLinksData) ? parentStudentLinksData : [];
        return linksNow.some((l: any) => String(l.parent_id) === String(parentId) && String(l.student_id) === String(studentId));
      };

      const existsInDbNow = await checkLinks();
      if (existsInDbNow) {
        return true;
      }

      // Handle specific error cases
      if (error.response?.status === 409) {
        toast.error('This student is already linked to this parent');
      } else if (error.response?.status === 404) {
        toast.error('Parent or student not found');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to link students');
      } else {
        toast.error(`An error occurred while linking student to parent: ${error.message || 'Unknown error'}`);
      }

      return false;
    }
  };

  const unlinkStudentFromParent = async (parentId: number, studentId: number): Promise<boolean> => {
    try {

      // Fetch latest links directly (REST then SQL fallback) so pre-checks match DB truth.
      const fetchLatestLinks = async (): Promise<any[]> => {
        try {
          const linksResponse = await api.get('/parent-student-links');
          const linksData = (linksResponse && linksResponse.success)
            ? ((linksResponse.data as any)?.items || linksResponse.data || [])
            : [];
          return Array.isArray(linksData) ? linksData : [];
        } catch (e) {
          // ignore and fallback below
        }
        try {
          const sqlResult = await sqlDatabase.executeQuery(
            `SELECT id, parent_id, student_id, relationship, is_primary, created_at
             FROM parent_student_links
             ORDER BY created_at DESC`
          );
          const rows: any[] = Array.isArray((sqlResult as any)?.data) ? (sqlResult as any).data : [];
          return Array.isArray(rows) ? rows : [];
        } catch (e) {
          return [];
        }
      };

      const latestLinksRaw = await fetchLatestLinks();
      const latestLinks = normalizeParentStudentLinks(latestLinksRaw);
      setParentStudentLinksData(latestLinks);

      // Check if the link exists before attempting to unlink
      // Some pages can pass a stale/incorrect parentId (e.g. student.parent_id cache out of sync).
      // In that case, fall back to unlinking the first link we find for the student.
      const exactLink = latestLinks.find(
        (link: any) => String(link.parent_id) === String(parentId) && String(link.student_id) === String(studentId)
      );

      const fallbackLinkForStudent = !exactLink
        ? latestLinks.find((link: any) => String(link.student_id) === String(studentId))
        : null;

      const effectiveParentId = Number((exactLink || fallbackLinkForStudent)?.parent_id);

      if (!Number.isFinite(effectiveParentId)) {
        toast.error('This student is not linked to this parent');
        return false;
      }
      
      const response = await api.delete(`/parents/unlink/${effectiveParentId}/${studentId}`);
      
      if (response && response.success) {
        // Optimistically update link table state immediately so UIs update without waiting for refetch
        setParentStudentLinksData(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.filter((l: any) => !(String(l.parent_id) === String(effectiveParentId) && String(l.student_id) === String(studentId)));
        });

        // Clear the student's parent_id and parent_name fields
        try {
          await updateStudent(studentId, {
            parent_id: null,
            parent_name: null
          });
        } catch (e: any) {
          // Best-effort cache update only; DB unlink is already done.
        }
        
        // Refresh links from DB truth first (authoritative for count + linked list).
        await loadParentStudentLinksAuthoritative();
        await Promise.allSettled([
          loadStudentsFromAPI(),
          loadParentsFromAPI()
        ]);
        
        
        return true;
      }
      
      
      return false;
    } catch (error: any) {
      
      
      // Always re-check DB truth. Sometimes the API can error after the link row is deleted.
      try {
        await loadParentStudentLinksAuthoritative();
        const linksNow = Array.isArray(parentStudentLinksData) ? parentStudentLinksData : [];
        const stillExists = linksNow.some((l: any) => String(l.parent_id) === String(parentId) && String(l.student_id) === String(studentId));
        if (!stillExists) {
          return true;
        }
      } catch (e) {
        // ignore
      }

      // Handle specific error cases
      if (error.response?.status === 404) {
        toast.error('Link not found - student may not be linked to this parent');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to unlink students');
      } else {
        toast.error('An error occurred while unlinking student from parent');
      }

      return false;
    }
  };

  const getParentPermissions = (_parentId: number) => {
    return [
      { module: 'view_students', permissions: ['read', 'view'] },
      { module: 'view_results', permissions: ['read', 'view'] },
      { module: 'view_attendance', permissions: ['read', 'view'] },
      { module: 'view_fees', permissions: ['read', 'view'] },
      { module: 'message_school', permissions: ['read', 'write'] }
    ];
  };

  const linkParentToStudent = async (_parentId: number, _studentId: number): Promise<void> => {
    
    // Placeholder: actual linking logic should be implemented here
  };

  // Force TypeScript reparse

  // Missing API Functions
  // Get teacher assignments for current term and academic year
  const getTeacherAssignmentsForCurrentTerm = (teacherId: number) => {
    return subjectAssignments.filter(sa => 
      String(sa.teacher_id) === String(teacherId) &&
      sa.academic_year === currentAcademicYear &&
      sa.term === currentTerm &&
      sa.status === 'Active'
    );
  };

  // Get subjects assigned to a specific teacher for current term
  const getTeacherSubjectsForCurrentTerm = (teacherId: number) => {
    const assignments = getTeacherAssignmentsForCurrentTerm(teacherId);
    return assignments.map(assignment => ({
      assignment,
      subject: subjects.find(s => s.id === assignment.subject_id),
      class: classes.find(c => c.id === assignment.class_id)
    }));
  };

  const getActiveAcademicYearAPI = async (): Promise<string | null> => {
    return currentAcademicYear;
  };

  const getActiveTermAPI = async (): Promise<string | null> => {
    return currentTerm;
  };

  const getRegisteredSubjectsAPI = async (classId: number): Promise<Subject[]> => {
    return getClassSubjects(classId);
  };

  const getSubjectAssignmentsAPI = async (): Promise<any[]> => {
    return subjectAssignments;
  };

  const assignSubjectToTeacherAPI = async (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Check if subject already assigned to another teacher in this class
      const existingAssignment = subjectAssignments.find(a => 
        a.subject_id === subjectId && 
        a.class_id === classId &&
        a.academic_year === academicYear &&
        a.term === term &&
        a.status === 'Active'
      );

      if (existingAssignment) {
        
        return false; // Already assigned
      }

      // Create new assignment via API
      const response = await api.post(API_CONFIG.ENDPOINTS.SUBJECTS.ASSIGN, {
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: classId,
        academic_year: academicYear,
        term: term
      });

      if (response && response.success) {
        // Immediately update local state for real-time UI update
        const newAssignment = {
          id: (response.data as any)?.id || Date.now(),
          subject_id: subjectId,
          class_id: classId,
          teacher_id: teacherId,
          academic_year: academicYear,
          term: term as 'First Term' | 'Second Term' | 'Third Term',
          status: 'Active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Add computed fields
          subject_name: subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject',
          class_name: classes.find(c => c.id === classId)?.name || 'Unknown Class',
          teacher_name: teachers.find(t => t.id === teacherId) ? 
            `${teachers.find(t => t.id === teacherId)!.firstName} ${teachers.find(t => t.id === teacherId)!.lastName}` : 
            'Unknown Teacher'
        } as SubjectAssignment;

        setSubjectAssignments(prev => [...prev, newAssignment]);
        
        // Then refresh from API to ensure consistency
        await loadSubjectAssignmentsFromAPI();
        
        
        return true;
      }
      
      
      return false;
    } catch (error) {
      
      return false;
    }
  };

  const removeSubjectAssignmentAPI = async (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string): Promise<boolean> => {
    try {
      // Validate inputs
      if (!currentUser) {
        
        return false;
      }
      
      if (!subjectAssignments || subjectAssignments.length === 0) {
        
        return false;
      }
      
      
      
      
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Find the assignment ID based on the criteria
      const existingAssignment = subjectAssignments.find(assignment => 
        assignment.teacher_id === teacherId &&
        assignment.subject_id === subjectId &&
        assignment.class_id === classId &&
        assignment.academic_year === academicYear &&
        assignment.term === term
      );
      
      
      
      if (!existingAssignment) {
        
        return false; // Assignment not found
      }
      
      // Use the real API to delete the assignment
      const response = await api.delete(`/subjects/assignment/${existingAssignment.id}`);
      
      if (response && response.success) {
        // Immediately update local state for real-time UI update
        setSubjectAssignments(prev => prev.filter(assignment => assignment.id !== existingAssignment.id));
        
        // Then refresh from API to ensure consistency
        await loadSubjectAssignmentsFromAPI();
        
        
        return true;
      }
      
      
      return false;
    } catch (error) {
      
      return false;
    }
  };

  const getUnassignedSubjectsAPI = async (classId: number): Promise<Subject[]> => {
    const assignedSubjectIds = subjectAssignments
      .filter(sa => sa.class_id === classId)
      .map(sa => sa.subject_id);
    
    return subjects.filter(s => !assignedSubjectIds.includes(s.id));
  };

  const getAvailableTeachersAPI = async (): Promise<Teacher[]> => {
    return teachers.filter(t => t.status === 'Active');
  };

  const loadScoresFromAPI = async (termParam?: string | null, academicYearParam?: string | null): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Only load scores for CURRENT term and academic year to prevent data leakage
      const termToUse = termParam ?? currentTerm;
      const yearToUse = academicYearParam ?? currentAcademicYear;
      if (!termToUse || !yearToUse) {
        
        setScores([]);
        return true;
      }

      // Use backend endpoint (authoritative role-based filtering) so drafts persist across refresh/logout.
      const endpoint = `/results/scores/by-term?term=${encodeURIComponent(String(termToUse))}&academic_year=${encodeURIComponent(String(yearToUse))}`;
      const response = await api.get<any>(endpoint);

      if (!response || response.success !== true) {
        setScores([]);
        return false;
      }

      const rows = Array.isArray(response.data) ? response.data : [];
      setScores(rows as any);

      // Always return true here – the state is now in a safe, array-based shape
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const is403 = message.includes('403');
      const is401 = message.includes('401');

      if (is403) {
        toast.error('You do not have permission to view submitted scores for approval');
      } else if (is401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load scores');
      }

      setScores([]);
      return false;
    }
  };

  const createPaymentAPI = async (payment: Omit<Payment, 'id'>): Promise<boolean> => {
    try {
      const result = await sqlDatabase.createPayment(payment);
      return !!result;
    } catch (error) {
      
      return false;
    }
  };

  const loadPaymentsFromAPI = async (allHistory?: boolean): Promise<boolean> => {
    try {
      // Parent-safe: load only this parent's linked students payments via secure endpoints
      if (currentUser && currentUser.role === 'parent') {
        await tokenManager.ensureToken(currentUser);

        const linkedStudentIds = Array.from(
          new Set(
            (Array.isArray(parentStudentLinksData) ? parentStudentLinksData : [])
              .map((l: any) => l?.student_id)
              .filter((id: any) => typeof id === 'number' || typeof id === 'string')
              .map((id: any) => Number(id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          )
        );

        if (linkedStudentIds.length === 0) {
          setPayments([]);
          return true;
        }

        const results = await Promise.all(
          linkedStudentIds.map(async (studentId) => {
            try {
              const res = await api.get<any>(`/payments/student/${studentId}/history`);
              if (res && res.success && res.data && Array.isArray(res.data.payments)) {
                return res.data.payments;
              }
              return [];
            } catch {
              return [];
            }
          })
        );

        const flat = results.flat();
        const transformedData = flat
          .filter((p: any) => p && p.id)
          .map((payment: any) => ({
            id: payment.id,
            student_id: payment.student_id,
            student_name:
              payment.student_name ||
              payment.studentName ||
              'Student',
            amount: parseFloat(payment.amount),
            payment_type: payment.payment_type,
            term: payment.term,
            academic_year: payment.academic_year,
            payment_method: payment.payment_method,
            reference: payment.transaction_reference || payment.reference,
            recorded_by: payment.recorded_by,
            recorded_date: payment.recorded_date,
            status: payment.status,
            receipt_number: payment.receipt_number,
            verified_by: payment.verified_by,
            verified_date: payment.verified_date,
            notes: payment.notes,
            invoice_id: payment.invoice_id ?? null,
            transaction_reference: payment.transaction_reference
          }))
          .sort((a: any, b: any) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime());

        setPayments(transformedData as Payment[]);
        return true;
      }
      
      // Additional safety check - prevent any non-admin/accountant from accessing payments
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'accountant')) {
        
        setPayments([]);
        return false;
      }
      
      // Default behaviour (admin/accountant only): use the global payments endpoint
      const paymentsQuery = `/payments?limit=1000${allHistory ? '&all_history=true' : ''}`;
      const response = await api.get<any>(paymentsQuery);
      
      if (response.success && response.data) {
        // Ensure response.data is an array before mapping
        const paymentsData = Array.isArray(response.data) ? response.data : [];
        
        // Transform data to match Payment interface
        const transformedData = paymentsData.map((payment: any) => ({
          id: payment.id,
          student_id: payment.student_id,
          // Construct student_name from joined fields if available, otherwise use placeholders
          student_name: payment.first_name && payment.last_name 
            ? `${payment.first_name} ${payment.last_name}` 
            : (payment.student_name || 'Unknown Student'),
          amount: parseFloat(payment.amount),
          payment_type: payment.payment_type,
          term: payment.term,
          academic_year: payment.academic_year,
          payment_method: payment.payment_method,
          reference: payment.transaction_reference || payment.reference,
          recorded_by: payment.recorded_by,
          recorded_date: payment.recorded_date,
          status: payment.status,
          receipt_number: payment.receipt_number,
          verified_by: payment.verified_by,
          verified_date: payment.verified_date,
          notes: payment.notes
        }));
        setPayments(transformedData);
        return true;
      }
      return false;
    } catch (error) {
      
      
      // Additional safety check - prevent any non-admin/accountant from accessing payments
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'accountant')) {
        
        setPayments([]);
        return false;
      }
      
      // Fallback to direct SQL if API fails (admin/accountant only)
      try {
        const result = await sqlDatabase.executeQuery(`
          SELECT p.*, s.first_name, s.last_name, s.admission_number,
                 c.name as class_name, c.level,
                 u.username as recorded_by_name
          FROM payments p
          JOIN students s ON p.student_id = s.id
          JOIN classes c ON s.class_id = c.id
          LEFT JOIN users u ON p.recorded_by = u.id
          ORDER BY p.recorded_date DESC
        `);
        if (result && result.data) {
           const transformedData = result.data.map((payment: any) => ({
            id: payment.id,
            student_id: payment.student_id,
            student_name: payment.first_name && payment.last_name 
              ? `${payment.first_name} ${payment.last_name}` 
              : (payment.student_name || 'Unknown Student'),
            amount: payment.amount,
            payment_type: payment.payment_type,
            term: payment.term,
            academic_year: payment.academic_year,
            payment_method: payment.payment_method,
            reference: payment.transaction_reference || payment.reference,
            recorded_by: payment.recorded_by,
            recorded_date: payment.recorded_date,
            status: payment.status,
            receipt_number: payment.receipt_number,
            verified_by: payment.verified_by,
            verified_date: payment.verified_date,
            notes: payment.notes
          }));
          setPayments(transformedData);
          return true;
        }
      } catch (sqlError) {
        
      }
      return false;
    }
  };

  const loadAffectiveDomainsFromAPI = async (termParam?: string | null, academicYearParam?: string | null): Promise<boolean> => {
      try {
        // Parents are not allowed to call /database/query, so do not attempt SQL-based loads.
        if (currentUser?.role === 'parent') {
          setAffectiveDomains([] as AffectiveDomain[]);
          return true;
        }

        // Only load affective domains for CURRENT term and academic year to prevent data leakage
        const termToUse = termParam ?? currentTerm;
        const yearToUse = academicYearParam ?? currentAcademicYear;
        if (!termToUse || !yearToUse) {
          setAffectiveDomains([] as AffectiveDomain[]);
          return true;
        }

        const result = await sqlDatabase.executeQuery(`
          SELECT * FROM affective_domains 
          WHERE term = '${termToUse}' AND academic_year = '${yearToUse}'
          ORDER BY student_id, academic_year, term
        `);

        // Normalize response to an array to avoid runtime errors like `.find is not a function`.
        const raw = (result as any)?.data;
        const unwrapped = raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw ? (raw as any).data : raw;
        const rows = Array.isArray(unwrapped) ? unwrapped : [];
        setAffectiveDomains(rows);
        return true;
      } catch (error) {
        return false;
      }
    };

    const loadPsychomotorDomainsFromAPI = async (termParam?: string | null, academicYearParam?: string | null): Promise<boolean> => {
      try {
        // Parents are not allowed to call /database/query, so do not attempt SQL-based loads.
        if (currentUser?.role === 'parent') {
          setPsychomotorDomains([] as PsychomotorDomain[]);
          return true;
        }

        // Only load psychomotor domains for CURRENT term and academic year to prevent data leakage
        const termToUse = termParam ?? currentTerm;
        const yearToUse = academicYearParam ?? currentAcademicYear;
        if (!termToUse || !yearToUse) {
          setPsychomotorDomains([] as PsychomotorDomain[]);
          return true;
        }

        const result = await sqlDatabase.executeQuery(`
          SELECT * FROM psychomotor_domains 
          WHERE term = '${termToUse}' AND academic_year = '${yearToUse}'
          ORDER BY student_id, academic_year, term
        `);

        // Normalize response to an array to avoid runtime errors like `.find is not a function`.
        const raw = (result as any)?.data;
        const unwrapped = raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw ? (raw as any).data : raw;
        const rows = Array.isArray(unwrapped) ? unwrapped : [];
        setPsychomotorDomains(rows);
        return true;
      } catch (error) {
        return false;
      }
    };

  // Request debouncing for compiled results
  const compiledResultsRequestQueue = new Map<string, Promise<boolean>>();
  const compiledResultsRetryAttempts = new Map<string, number>();
  const COMPILED_RESULTS_MAX_RETRIES = 3;
  const COMPILED_RESULTS_RETRY_DELAY = 2000; // 2 seconds for compiled results

  const loadCompiledResultsFromAPI = async (
    statusParam?: string | null,
    termParam?: string | null,
    academicYearParam?: string | null
  ): Promise<boolean> => {
    try {
      // Parents should be able to load their approved results even if term/year
      // hasn't been loaded into context yet.
      const isParent = String(currentUser?.role || '').toLowerCase() === 'parent';

      // Skip loading for non-parent users if term or academic year not set by admin
      const termToUse = termParam !== undefined ? termParam : currentTerm;
      const yearToUse = academicYearParam !== undefined ? academicYearParam : currentAcademicYear;
      // Term can be intentionally null to mean "load all terms for this academic year".
      // Academic year must always be present for non-parent users.
      if (!isParent && !yearToUse) {
        return false;
      }

      // Create unique key for this request
      // - undefined => keep legacy behavior (Approved only)
      // - null => no status filter (load all)
      // - string => filter by that status
      const statusToUse = statusParam === undefined ? 'Approved' : (statusParam ?? '');
      const requestKey = `${termToUse || ''}__${yearToUse || ''}__${statusToUse}`;
      
      // Check if request is already in progress
      if (compiledResultsRequestQueue.has(requestKey)) {
        return compiledResultsRequestQueue.get(requestKey) as Promise<boolean>;
      }

      // Create new request with retry logic
      const promise = executeCompiledResultsRequestWithRetry(requestKey);
      compiledResultsRequestQueue.set(requestKey, promise);

      // Clean up after request completes
      promise.finally(() => {
        compiledResultsRequestQueue.delete(requestKey);
        compiledResultsRetryAttempts.delete(requestKey);
      });

      return promise;
    } catch (error) {
      
      return false;
    }
  };

  const executeCompiledResultsRequestWithRetry = async (requestKey: string): Promise<boolean> => {
    const attempt = compiledResultsRetryAttempts.get(requestKey) || 0;
    
    const [termToUse, yearToUse, statusToUse] = requestKey.split('__');

    try {
      const params: Record<string, string | number> = {};

      // Cache-busting to ensure approvals reflect immediately across devices.
      // Some browsers/proxies can serve stale GET responses until caches are cleared.
      params._ts = Date.now();

      // When termParam is intentionally null, requestKey term segment becomes empty string.
      // In that case we omit the term filter to load all terms for the academic year.
      if (termToUse) {
        params.term = termToUse;
      }
      if (yearToUse) {
        params.academic_year = yearToUse;
      }

      if (statusToUse) {
        params.status = statusToUse;
      }

      const res = await api.get<any>(API_CONFIG.ENDPOINTS.RESULTS.COMPILED, params);

      let raw = (res as any)?.data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
        raw = (raw as any).data;
      }

      const compiled = Array.isArray(raw) ? raw : [];

      setCompiledResults(compiled as CompiledResult[]);
      return true;
    } catch (innerError: any) {
      const msg = String(innerError?.message || '');

      // Handle payload-level auth/permission errors that sometimes come back as 200 with JSON status
      if (msg.startsWith('401') || msg.includes(' 401 ') || msg.startsWith('403') || msg.includes(' 403 ')) {
        setCompiledResults([]);
        return false;
      }

      const isNetworkLike =
        msg.includes('ERR_INSUFFICIENT_RESOURCES') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Network');
      const isServerLike =
        msg.startsWith('500') || msg.startsWith('502') || msg.startsWith('503') || msg.startsWith('504') ||
        msg.includes('HTTP 500') || msg.includes('HTTP 502') || msg.includes('HTTP 503') || msg.includes('HTTP 504');

      if (attempt < COMPILED_RESULTS_MAX_RETRIES && (isNetworkLike || isServerLike)) {
        compiledResultsRetryAttempts.set(requestKey, attempt + 1);
        const delay = COMPILED_RESULTS_RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeCompiledResultsRequestWithRetry(requestKey);
      }

      setCompiledResults([]);
      return false;
    }

    return false;
  };

  const loadCumulativeResultsFromAPI = async (classId: number, academicYear: string): Promise<CumulativeResult[]> => {
    setLoadingCumulative(true);
    try {
      const res = await api.get<any>(`/results/cumulative/class/${classId}`, { academic_year: academicYear });
      let raw = (res as any)?.data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
        raw = (raw as any).data;
      }
      const results = Array.isArray(raw) ? raw : [];
      setCumulativeResults(results);
      return results;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load cumulative results';
      return Promise.reject(new Error(msg));
    } finally {
      setLoadingCumulative(false);
    }
  };

  const compileCumulativeResults = async (classId: number, academicYear: string): Promise<{ success: boolean; message: string; count: number }> => {
    setLoadingCumulative(true);
    try {
      const res = await api.post<any>('/results/compile-cumulative', { class_id: classId, academic_year: academicYear });
      const body = (res as any)?.data || {};
      const success = body?.success ?? false;
      if (success) {
        await loadCumulativeResultsFromAPI(classId, academicYear);
        return { success: true, message: body?.message || 'Cumulative results compiled', count: body?.data?.compiled_count ?? 0 };
      }
      return { success: false, message: body?.message || 'Failed to compile', count: 0 };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      return { success: false, message: msg, count: 0 };
    } finally {
      setLoadingCumulative(false);
    }
  };

  const createFeeStructureAPI = async (feeStructure: any): Promise<boolean> => {
    try {
      await sqlDatabase.insertRecord('fee_structures', feeStructure);
      await loadFeeStructuresFromAPI();
      return true;
    } catch (error) {
      
      return false;
    }
  };

  const getFeeStructuresAPI = async (): Promise<any> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM fee_structures ORDER BY class_id, academic_year, term');
      return result?.data || [];
    } catch (error) {
      
      return [];
    }
  };

  const getPaymentsAPI = async (): Promise<any> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM payments ORDER BY payment_date DESC');
      return result?.data || [];
    } catch (error) {
      
      return [];
    }
  };

  const updatePaymentStatusAPI = async (paymentId: number, status: string): Promise<any> => {
    try {
      await sqlDatabase.updateRecord('payments', paymentId, { status });
      await loadPaymentsFromAPI();
      return { success: true };
    } catch (error) {
      
      return { success: false, error };
    }
  };

  const getFeeBalancesAPI = async (): Promise<any> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM student_fee_balances ORDER BY student_id');
      return result?.data || [];
    } catch (error) {
      
      return [];
    }
  };

  const createBatchPaymentsAPI = async (payments: any[]): Promise<any> => {
    try {
      for (const payment of payments) {
        await sqlDatabase.insertRecord('payments', payment);
      }
      await loadPaymentsFromAPI();
      return { success: true, count: payments.length };
    } catch (error) {
      
      return { success: false, error };
    }
  };

  const loadFeeStructuresFromAPI = async (): Promise<boolean> => {
    try {
      // Parents are not allowed to call /database/query, so do not attempt SQL-based loads.
      if (currentUser?.role === 'parent') {
        setFeeStructures([]);
        return true;
      }
      const result = await sqlDatabase.executeQuery('SELECT * FROM fee_structures ORDER BY class_id, academic_year, term');
      if (result && result.data) {
        setFeeStructures(result.data);
        return true;
      }
      return false;
    } catch (error) {
      
      return false;
    }
  };

  const loadStudentFeeBalancesFromAPI = async (): Promise<boolean> => {
    try {
      // Parents are not allowed to call /database/query, so do not attempt SQL-based loads.
      if (currentUser?.role === 'parent') {
        setStudentFeeBalances([]);
        return true;
      }
      const result = await sqlDatabase.executeQuery('SELECT * FROM student_fee_balances ORDER BY student_id');
      if (result && result.data) {
        setStudentFeeBalances(result.data);
        return true;
      }
      return false;
    } catch (error) {
      
      return false;
    }
  };

  const loadNotificationsFromAPI = async (): Promise<boolean> => {
    try {
      // Parents cannot use /database/query; load via REST.
      // - Admin: can view all notifications
      // - Non-admin: use user-scoped endpoint which applies role targeting and read status.
      const endpoint = currentUser?.role === 'admin'
        ? API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST
        : API_CONFIG.ENDPOINTS.NOTIFICATIONS.USER_NOTIFICATIONS;

      const response = await api.get<any>(endpoint, { limit: 1000 });

      let raw: any = (response as any)?.data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'items' in raw) {
        raw = (raw as any).items;
      }
      const rows: any[] = Array.isArray(raw) ? raw : [];

      if (rows.length > 0 || (response as any)?.success) {
        
        const mapped: Notification[] = rows.map((row: any) => {
          let readBy: number[] = [];
          let targetUsers: number[] = [];
          let deletedBy: number[] = [];
          try {
            if (row.read_by) {
              const parsed = typeof row.read_by === 'string' ? JSON.parse(row.read_by) : row.read_by;
              if (Array.isArray(parsed)) {
                readBy = parsed
                  .map((v: any) => Number(v))
                  .filter((v: any) => Number.isFinite(v));
              }
            }
            if (row.target_users) {
              const parsedTU = typeof row.target_users === 'string' ? JSON.parse(row.target_users) : row.target_users;
              if (Array.isArray(parsedTU)) {
                targetUsers = parsedTU
                  .map((v: any) => Number(v))
                  .filter((v: any) => Number.isFinite(v));
              }
            }
            if (row.deleted_by) {
              const parsedDB = typeof row.deleted_by === 'string' ? JSON.parse(row.deleted_by) : row.deleted_by;
              if (Array.isArray(parsedDB)) {
                deletedBy = parsedDB
                  .map((v: any) => Number(v))
                  .filter((v: any) => Number.isFinite(v));
              }
            }
          } catch (e) {
            
          }
          
          const type = String(row.type || 'info').toLowerCase() as Notification['type'];
          // Backend uses 'All'/'Parent'/etc; frontend expects lowercase plural keys like 'all'/'parents'.
          const taRaw = String(row.target_audience ?? row.targetAudience ?? 'all').toLowerCase();
          const targetAudience = (taRaw === 'parent' ? 'parents' : taRaw) as Notification['targetAudience'];
          
          return {
            id: Number(row.id),
            title: row.title || '',
            message: row.message || '',
            type,
            targetAudience,
            sentBy: Number(row.sent_by) || 0,
            sentDate: row.sent_date || new Date().toISOString(),
            isRead: !!row.is_read,
            readBy,
            targetUsers,
            deletedBy,
          };
        });
        
        setNotifications(mapped);
        return true;
      }
      return false;
    } catch (error) {
      
      return false;
    }
  };

  const loadAttendancesFromAPI = async (): Promise<boolean> => {
    try {
      // Only load attendance for CURRENT term and academic year to prevent cross-term/session leakage
      if (!currentTerm || !currentAcademicYear) {
        setAttendances([]);
        return true;
      }

      const result = await sqlDatabase.executeQuery(
        `SELECT * FROM attendance 
         WHERE term = '${currentTerm}' AND academic_year = '${currentAcademicYear}'
         ORDER BY date DESC, class_id`
      );

      // Normalize response to an array (executeQuery can return nested data shapes)
      const raw = (result as any)?.data;
      const unwrapped = raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw ? (raw as any).data : raw;
      const rows = Array.isArray(unwrapped) ? unwrapped : [];
      setAttendances(rows);
      return true;
    } catch (error) {
      
      return false;
    }
  };

  const loadCbtExamsFromAPI = async (): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const response = await api.get('/cbt/exams');
      if (response && response.success) {
        const items = (response.data as any)?.items || response.data || [];
        setCbtExams(Array.isArray(items) ? items : []);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadCbtQuestionsFromAPI = async (examId: number): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const response = await api.get(`/cbt/questions/${examId}`);
      if (response && response.success) {
        const items = response.data || [];
        // Strip correct_answer for non-admin roles to prevent answer leakage
        const isAdmin = currentUser?.role === 'admin';
        const sanitized = Array.isArray(items)
          ? items.map((q: any) => isAdmin ? q : { ...q, correct_answer: undefined })
          : [];
        setCbtQuestions(sanitized);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadCbtAttemptsFromAPI = async (examId?: number): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const params: Record<string, string | number> = {};
      if (examId) params.exam_id = examId;
      const response = await api.get('/cbt/attempts', params);
      if (response && response.success) {
        const items = response.data || [];
        setCbtAttempts(Array.isArray(items) ? items : []);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadCbtQuestionBankFromAPI = async (params?: Record<string, string | number>): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const response = await api.get('/cbt/question-bank', params);
      if (response && response.success) {
        const items = (response.data as any)?.items || response.data || [];
        setCbtQuestionBank(Array.isArray(items) ? items : []);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadCbtStudentExamsFromAPI = async (): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const response = await api.get('/cbt/student-exams');
      if (response && response.success) {
        const items = response.data || [];
        setCbtExams(Array.isArray(items) ? items : []);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loadCbtMyAttemptsFromAPI = async (): Promise<boolean> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const response = await api.get('/cbt/attempts/mine');
      if (response && response.success) {
        const items = response.data || [];
        setCbtAttempts(Array.isArray(items) ? items : []);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const getFeeStructures = (classId: number, academicYear: string): FeeStructure[] => {
    return feeStructures.filter(fs => fs.class_id === classId && fs.academic_year === academicYear);
  };

  // Missing Status API Functions
  const updateTeacherStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.updateTeacher(id, { status });
      return !!result;
    } catch (error) {
      
      return false;
    }
  };

  const updateParentStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.updateParent(id, { status });
      return !!result;
    } catch (error) {
      
      return false;
    }
  };

  const updateAccountantStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.updateAccountant(id, { status });
      return !!result;
    } catch (error) {
      
      return false;
    }
  };

  // ─── CBT Exam CRUD ──────────────────────────────────────

  const createCbtExam = async (exam: Omit<CbtExam, 'id' | 'total_marks' | 'published' | 'status' | 'created_at'>): Promise<number> => {
    try {
      const payload = { ...exam, academic_year: currentAcademicYear, term: currentTerm };
      const response = await api.post<any>('/cbt/exams', payload);
      if (response && response.success && response.data?.id) {
        await loadCbtExamsFromAPI();
        return response.data.id;
      }
      return -1;
    } catch (error: any) {
      throw error;
    }
  };

  const updateCbtExam = async (id: number, exam: Partial<CbtExam>): Promise<void> => {
    try {
      await api.put(`/cbt/exams/${id}`, exam);
      await loadCbtExamsFromAPI();
    } catch (error: any) {
      throw error;
    }
  };

  const deleteCbtExam = async (id: number): Promise<void> => {
    try {
      await api.delete(`/cbt/exams/${id}`);
      await loadCbtExamsFromAPI();
    } catch (error: any) {
      throw error;
    }
  };

  const publishCbtExam = async (id: number): Promise<void> => {
    try {
      await api.post(`/cbt/exams/publish/${id}`);
      await loadCbtExamsFromAPI();
    } catch (error: any) {
      throw error;
    }
  };

  const addCbtQuestion = async (examId: number, question: any): Promise<number> => {
    try {
      const response = await api.post<any>(`/cbt/questions/${examId}`, question);
      if (response && response.success && response.data?.id) {
        await loadCbtQuestionsFromAPI(examId);
        return response.data.id;
      }
      return -1;
    } catch (error: any) {
      throw error;
    }
  };

  const updateCbtQuestion = async (examId: number, questionId: number, question: any): Promise<void> => {
    try {
      await api.put(`/cbt/questions/${examId}/${questionId}`, question);
      await loadCbtQuestionsFromAPI(examId);
    } catch (error: any) {
      throw error;
    }
  };

  const deleteCbtQuestion = async (examId: number, questionId: number): Promise<void> => {
    try {
      await api.delete(`/cbt/questions/${examId}/${questionId}`);
      await loadCbtQuestionsFromAPI(examId);
    } catch (error: any) {
      throw error;
    }
  };

  const reorderCbtQuestions = async (examId: number, order: {question_id: number; sort_order: number}[]): Promise<void> => {
    try {
      await api.post(`/cbt/questions-reorder/${examId}`, { order });
      await loadCbtQuestionsFromAPI(examId);
    } catch (error: any) {
      throw error;
    }
  };

  const addToCbtQuestionBank = async (question: any): Promise<number> => {
    try {
      const response = await api.post<any>('/cbt/question-bank', question);
      if (response && response.success && response.data?.id) {
        return response.data.id;
      }
      return -1;
    } catch (error: any) {
      throw error;
    }
  };

  const deleteFromCbtQuestionBank = async (id: number): Promise<void> => {
    try {
      await api.delete(`/cbt/question-bank/${id}`);
    } catch (error: any) {
      throw error;
    }
  };

  const importFromCbtBank = async (examId: number, questionIds: number[]): Promise<any> => {
    try {
      const response = await api.post(`/cbt/import-bank/${examId}`, { question_ids: questionIds });
      if (response && response.success) {
        await loadCbtQuestionsFromAPI(examId);
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const startCbtAttempt = async (examId: number): Promise<any> => {
    try {
      const response = await api.post(`/cbt/start/${examId}`);
      if (response && response.success) {
        return response.data;
      }
      // Surface backend message as an error so callers can display it
      const msg = response?.message || response?.error || 'Failed to start exam';
      throw new Error(msg);
    } catch (error: any) {
      throw error;
    }
  };

  const saveCbtAnswer = async (attemptId: number, questionId: number, answer: any): Promise<void> => {
    try {
      await api.post(`/cbt/save-answer/${attemptId}`, { question_id: questionId, answer });
    } catch (error: any) {
      throw error;
    }
  };

  const submitCbtAttempt = async (attemptId: number, tabSwitchCount?: number): Promise<any> => {
    try {
      const response = await api.post(`/cbt/submit/${attemptId}`, { tab_switch_count: tabSwitchCount || 0 });
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const getCbtAttemptDetail = async (attemptId: number): Promise<any> => {
    try {
      const response = await api.get(`/cbt/attempts/${attemptId}`);
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const getCbtExamResults = async (examId: number): Promise<any> => {
    try {
      const response = await api.get(`/cbt/results/${examId}`);
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const feedCbtExamScores = async (examId: number, scoreSlot: string): Promise<any> => {
    try {
      const response = await api.post(`/cbt/feed-scores/${examId}`, { score_slot: scoreSlot });
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const deleteCbtExamScores = async (examId: number): Promise<any> => {
    try {
      const response = await api.delete(`/cbt/scores/${examId}`);
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const bulkImportQuestions = async (examId: number, questions: any[]): Promise<any> => {
    try {
      await tokenManager.ensureToken(currentUser);
      const response = await api.post(`/cbt/bulk-import/${examId}`, { questions });
      if (response && response.success) {
        await loadCbtQuestionsFromAPI(examId);
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const uploadQuestionImage = async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = tokenManager.getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/cbt/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (data.success) return data.data;
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  const generateQuestionsFromMaterial = async (materialText: string, questionType: string, count: number, options?: { difficulty?: string; exam_type?: string; topic?: string; include_explanations?: boolean }): Promise<any> => {
    try {
      const response = await api.post('/cbt/generate-questions', {
        material_text: materialText,
        question_type: questionType,
        count,
        difficulty: options?.difficulty || 'mixed',
        exam_type: options?.exam_type || 'JAMB/WAEC',
        topic: options?.topic || '',
        include_explanations: options?.include_explanations ? 1 : 0,
      });
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  };

  // Score Methods
  const checkAndUpdateClassCompletionStatus = async (classId: number): Promise<void> => {
    try {
      // Get all registered subjects for this class in current term/academic year
      const registeredSubjects = subjectRegistrations.filter(sr => 
        sr.class_id === classId && 
        sr.term === currentTerm && 
        sr.academic_year === currentAcademicYear &&
        sr.status === 'Active'
      );

      // Get all students in this class
      const classStudents = students.filter(s => s.class_id === classId);

      // Check each student's compiled results
      for (const student of classStudents) {
        const compiledResult = compiledResults.find(cr => 
          cr.student_id === student.id && 
          cr.class_id === classId && 
          cr.term === currentTerm && 
          cr.academic_year === currentAcademicYear
        );

        if (compiledResult) {
          // Count how many registered subjects have scores
          const subjectsWithScores = compiledResult.scores.length;
          const totalRegisteredSubjects = registeredSubjects.length;

          // Update status based on completion
          let newStatus = compiledResult.status;
          if (subjectsWithScores === totalRegisteredSubjects && totalRegisteredSubjects > 0) {
            newStatus = 'Submitted'; // All subjects submitted
          } else if (subjectsWithScores > 0) {
            newStatus = 'Draft'; // Some subjects submitted
          }

          if (newStatus !== compiledResult.status) {
            // Update the compiled result status
            const updatedResult = { ...compiledResult, status: newStatus };
            setCompiledResults(compiledResults.map(cr => cr.id === compiledResult.id ? updatedResult : cr));

            // Show notification for status change
            if (newStatus === 'Submitted') {
              toast.success(`All subjects submitted for ${student.firstName} ${student.lastName}! Result is ready for review.`);
            }
          }
        }
      }

    } catch (error) {
      
    }
  };

  const updateCompiledResultWithNewScore = async (studentId: number, newScore: Score): Promise<void> => {
    try {
      // Skip if term or academic year not set by admin
      if (!currentTerm || !currentAcademicYear) {
        
        return;
      }

      // Find the student's class and current term/academic year
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // Find the subject assignment to get subject details
      const subjectAssignment = subjectAssignments.find(sa => sa.id === newScore.subject_assignment_id);
      if (!subjectAssignment) return;

      // Find or create compiled result for this student
      let compiledResult = compiledResults.find(cr => 
        cr.student_id === studentId && 
        cr.class_id === student.class_id && 
        cr.term === currentTerm && 
        cr.academic_year === currentAcademicYear
      );

      if (!compiledResult) {
        // Get subject name for this score
        const subjectAssignment = subjectAssignments.find(sa => sa.id === newScore.subject_assignment_id);
        const subject = subjects.find(s => s.id === subjectAssignment?.subject_id);
        
        // Calculate attendance data for this student
        const studentAttendance = attendances.filter(a => 
          a.student_id === studentId && 
          a.academic_year === currentAcademicYear && 
          a.term === currentTerm
        );
        
        const timesPresent = studentAttendance.filter(a => a.status === 'Present').length;
        const timesAbsent = studentAttendance.filter(a => a.status === 'Absent').length;
        const totalAttendanceDays = studentAttendance.length;
        
        // Create new compiled result with enhanced scores
        const enhancedScores = [{
          ...newScore,
          subject_name: subject?.subject_name || subject?.name || 'Unknown Subject'
        }];
        
        const compiledResult: CompiledResult = {
          id: 0, // Will be set by database
          student_id: student.id,
          class_id: student.class_id,
          term: currentTerm,
          academic_year: currentAcademicYear,
          total_score: newScore.total || 0,
          average_score: newScore.total || 0,
          class_average: 0,
          position: 0,
          total_students: 1,
          times_present: timesPresent,
          times_absent: timesAbsent,
          total_attendance_days: totalAttendanceDays,
          term_begin: '',
          term_end: '',
          next_term_begin: '',
          class_teacher_name: '',
          class_teacher_comment: '',
          principal_name: '',
          principal_comment: '',
          principal_signature: '',
          compiled_by: currentUser?.id || 0,
          compiled_date: new Date().toISOString(),
          approved_by: null,
          approved_date: null,
          print_approved: 0,
          rejection_reason: null,
          status: 'Draft',
          scores: enhancedScores,
          affective: null,
          psychomotor: null
        };
        setCompiledResults([...compiledResults, compiledResult]);
      } else {
        // Update existing compiled result
        if (compiledResult) {
          const existingScoreIndex = compiledResult.scores.findIndex(s => s.subject_assignment_id === newScore.subject_assignment_id);
          
          // Get subject name for this score
          const subjectAssignment = subjectAssignments.find(sa => sa.id === newScore.subject_assignment_id);
          const subject = subjects.find(s => s.id === subjectAssignment?.subject_id);
          
          // Create enhanced score with subject name
          const enhancedScore = {
            ...newScore,
            subject_name: subject?.subject_name || subject?.name || 'Unknown Subject'
          };
          
          if (existingScoreIndex >= 0) {
            // Update existing score
            compiledResult.scores[existingScoreIndex] = enhancedScore;
          } else {
            // Add new score
            compiledResult.scores.push(enhancedScore);
          }

          // Calculate attendance data for this student
          const studentAttendance = attendances.filter(a => 
            a.student_id === studentId && 
            a.academic_year === currentAcademicYear && 
            a.term === currentTerm
          );
          
          const timesPresent = studentAttendance.filter(a => a.status === 'Present').length;
          const timesAbsent = studentAttendance.filter(a => a.status === 'Absent').length;
          const totalAttendanceDays = studentAttendance.length;

          // Recalculate totals
          const totalScore = compiledResult.scores.reduce((sum, score) => sum + (score.total || 0), 0);
          const averageScore = compiledResult.scores.length > 0 ? totalScore / compiledResult.scores.length : 0;

          // Update the compiled result with attendance data
          const updatedResult = {
            ...compiledResult,
            scores: compiledResult?.scores,
            total_score: totalScore,
            average_score: averageScore,
            times_present: timesPresent,
            times_absent: timesAbsent,
            total_attendance_days: totalAttendanceDays
          };

          setCompiledResults(compiledResults.map(cr => cr.id === compiledResult?.id ? updatedResult : cr));
        }
      }

      // Check if all subjects for this class have been submitted
      await checkAndUpdateClassCompletionStatus(student.class_id);

      // Show success notification
      const subject = subjects.find(s => s.id === subjectAssignment.subject_id);
      toast.success(`Score for ${subject?.name || 'Subject'} updated in compiled results for ${student.firstName} ${student.lastName}`);

    } catch (error) {
      
      toast.error('Failed to update compiled results');
    }
  };

  const addScore = async (score: Omit<Score, 'id'>): Promise<number> => {
    // Validate that the subject is registered for this class in current term
    const subjectAssignment = subjectAssignments.find(sa => sa.id === score.subject_assignment_id);
    if (!subjectAssignment) {
      throw new Error('Subject assignment not found');
    }

    const student = students.find(s => s.id === score.student_id);
    if (!student) {
      throw new Error('Student not found');
    }

    // Check if the current user is the assigned teacher for this subject
    if (currentUser && currentUser.role === 'teacher') {
      const isAssignedTeacher = subjectAssignments.some(sa =>
        sa.id === score.subject_assignment_id &&
        sa.teacher_id === currentUser.linked_id
      );

      if (!isAssignedTeacher) {
        throw new Error('Only the assigned teacher can submit scores for this subject');
      }
    }

    // Save to database using API endpoint
    try {
      const scoreRow: any = {
        student_id: score.student_id,
        subject_name: score.subject_name,
        status: score.status ?? 'Draft'
      };

      if (score.ca1 !== undefined) scoreRow.ca1 = score.ca1;
      if (score.ca2 !== undefined) scoreRow.ca2 = score.ca2;
      if (score.exam !== undefined) scoreRow.exam = score.exam;

      const response = await api.post('/results/scores', {
        assignment_id: score.subject_assignment_id,
        scores: [scoreRow]
      });

      if (response && response.success) {
        const tempId = -Date.now();
        const optimisticScore: Score = {
          ...score,
          id: tempId,
          status: (score.status ?? 'Draft') as Score['status']
        };

        setScores(prev => {
          const existingIndex = prev.findIndex(s =>
            s.student_id === optimisticScore.student_id &&
            s.subject_assignment_id === optimisticScore.subject_assignment_id
          );

          if (existingIndex >= 0) {
            const copy = [...prev];
            copy[existingIndex] = { ...copy[existingIndex], ...optimisticScore };
            return copy;
          }

          return [...prev, optimisticScore];
        });

        // Reload scores from database to get the new data
        await loadScoresFromAPI(score.term ?? null, score.academic_year ?? null);

        // Automatically update compiled result for this student
        await updateCompiledResultWithNewScore(score.student_id, optimisticScore);
        return tempId;
      } else {
        throw new Error(response?.error || 'Failed to save score');
      }
    } catch (error) {
      
      throw error;
    }
  };

  const updateScore = async (id: number, score: Partial<Score>): Promise<void> => {
    // Find existing score to get subject assignment and student
    const existingScore = scores.find(s => s.id === id);
    if (!existingScore) {
      throw new Error('Score not found');
    }

    // Check if the current user is the assigned teacher for this subject
    if (currentUser && currentUser.role === 'teacher') {
      const subjectAssignment = subjectAssignments.find(sa => sa.id === existingScore.subject_assignment_id);
      if (!subjectAssignment || subjectAssignment.teacher_id !== currentUser.linked_id) {
        throw new Error('Only the assigned teacher can update scores for this subject');
      }
    }

    // Update in database using API endpoint
    try {
      const scoreRow: any = {
        student_id: existingScore.student_id
      };

      if (score.ca1 !== undefined) scoreRow.ca1 = score.ca1;
      if (score.ca2 !== undefined) scoreRow.ca2 = score.ca2;
      if (score.exam !== undefined) scoreRow.exam = score.exam;
      if (score.subject_name !== undefined) scoreRow.subject_name = score.subject_name;
      if (score.status !== undefined) scoreRow.status = score.status;

      const response = await api.post('/results/scores', {
        assignment_id: existingScore.subject_assignment_id,
        scores: [scoreRow]
      });

      if (response && response.success) {
        setScores(prev => prev.map(s => {
          if (s.id !== id) return s;
          return { ...s, ...score };
        }));

        // Reload scores from database to get the updated data
        await loadScoresFromAPI(score.term ?? null, score.academic_year ?? null);
        
        // Update compiled result for this student
        await updateCompiledResultWithNewScore(existingScore.student_id, { ...existingScore, ...score });
      } else {
        throw new Error(response?.error || 'Failed to update score');
      }
    } catch (error) {
      
      throw error;
    }
  };

  const deleteScore = async (id: number): Promise<void> => {
    setScores(scores.filter((s: Score) => s.id !== id));
  };

  const createBatchScores = async (batchScores: Omit<Score, 'id'>[]): Promise<boolean> => {
    try {
      const newScores = batchScores.map((score, index) => ({
        ...score,
        id: scores.length > 0 ? Math.max(...scores.map((s: Score) => s.id)) + index + 1 : index + 1
      }));

      setScores([...scores, ...newScores]);

      // Update compiled results for each student
      const studentIds = [...new Set(batchScores.map(s => s.student_id))];
      for (const studentId of studentIds) {
        const studentScores = newScores.filter(s => s.student_id === studentId);
        for (const score of studentScores) {
          await updateCompiledResultWithNewScore(studentId, score);
        }
      }

      toast.success(`${batchScores.length} scores submitted and updated in compiled results`);
      return true;
    } catch (error) {
      
      toast.error('Failed to submit batch scores');
      return false;
    }
  };

  const getScoresByAssignment = (subjectAssignmentId: number) => {
    return scores.filter(s => s.subject_assignment_id === subjectAssignmentId);
  };

  const getScoresByStudent = (studentId: number) => {
    return scores.filter(s => s.student_id === studentId);
  };

  const getScoresByClass = (classId: number, academicYear: string, term: string) => {
    return scores.filter(s => {
      const assignment = subjectAssignments.find(sa => sa.id === s.subject_assignment_id);
      return assignment && assignment.class_id === classId && s.academic_year === academicYear && s.term === term;
    });
  };

  // Score rejection function for class teachers
  const rejectScore = async (scoreId: number, rejectionReason: string, rejectedBy: number): Promise<void> => {
    try {
      await api.post(`/results/scores/reject/${scoreId}`, {
        rejection_reason: rejectionReason,
        rejected_by: rejectedBy
      });

      // Reload scores from database
      await loadScoresFromAPI();
    } catch (error) {
      
      toast.error('Failed to reject score');
      throw error;
    }
  };

  // Score approval function for class teachers
  const approveScore = async (scoreId: number, approvedBy: number): Promise<void> => {
    try {
      await api.post(`/results/scores/approve/${scoreId}`, {
        approved_by: approvedBy
      });
      
      // Reload scores from database
      await loadScoresFromAPI();
    } catch (error) {
      
      throw error;
    }
  };

  const submitScores = async (assignmentId: number): Promise<void> => {
    try {
      const response = await api.post(`/results/submit/${assignmentId}`);
      
      if (response && response.success) {
        // Reload scores from database to get updated status
        await loadScoresFromAPI();
      } else {
        // Provide more specific error message based on response
        const errorMessage = response?.message || response?.error || 'Failed to submit scores';
        throw new Error(errorMessage);
      }
    } catch (error) {
      
      
      // Enhance error message for common issues
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('Access denied')) {
          throw new Error('Access denied: You can only submit scores for your own assignments. Please ensure you are logged in as the correct teacher for this assignment.');
        } else if (error.message.includes('404')) {
          throw new Error('Assignment not found. Please check the assignment and try again.');
        } else if (error.message.includes('Cannot submit scores')) {
          throw new Error(error.message); // Pass through the original message for missing students
        } else {
          throw error; // Pass through other errors as-is
        }
      } else {
        throw new Error('Failed to submit scores due to an unknown error');
      }
    }
  };

  // Get pending scores for class teacher review
  const getPendingScores = (classId?: number) => {
    const pendingScores = scores.filter((s: any) => s.status === 'Submitted');
    
    if (classId) {
      return pendingScores.filter((s: any) => {
        const assignment = subjectAssignments.find((sa: any) => sa.id === s.subject_assignment_id);
        return assignment && assignment.class_id === classId;
      });
    }
    
    return pendingScores;
  };

  // Wrapper functions for missing non-API methods
  const updateTeacherStatus = async (id: number, status: string): Promise<void> => {
    await updateTeacherStatusAPI(id, status);
  };

  const getStudentRecentActivities = (_studentId: number) => {
    // Return recent activities for a student (placeholder implementation)
    return [];
  };

  const getClassesByLevel = (level: string) => {
    return classes.filter(c => c.level === level);
  };

  const getClassStudents = (classId: number) => {
    return students.filter(s => s.class_id === classId);
  };

  const updateClassTeacher = async (classId: number, teacherId: number): Promise<void> => {
    try {
      
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      // Update the class in the database
      const result = await sqlDatabase.updateRecord('classes', classId, { 
        class_teacher_id: teacherId 
      });
      
      if (result) {
        
        // Reload classes to get updated data
        await loadClassesFromAPI();
      } else {
        throw new Error('Failed to update class teacher');
      }
    } catch (error) {
      
      throw error;
    }
  };

  const getSubjectsByCategory = (category: string) => {
    return subjects.filter(s => s.category === category);
  };

  const getSubjectsByLevel = (level: string) => {
    return subjects.filter(s => s.department === level || s.category === level);
  };

  const getRegisteredSubjects = (classId: number, academicYear: string, term: string) => {
    const registrations = subjectRegistrations.filter(sr => 
      sr.class_id === classId && 
      sr.academic_year === academicYear && 
      sr.term === term
    );
    
    // Return the actual Subject objects
    return registrations.map(sr => {
      const subject = subjects.find(s => s.id === sr.subject_id);
      return subject || null;
    }).filter(Boolean) as Subject[];
  };

  // Add missing wrapper functions
  const getSubjectRegistrations = (academicYear: string, term: string) => {
    return subjectRegistrations.filter(sr => 
      sr.academic_year === academicYear && 
      sr.term === term
    );
  };

  const assignSubjectToTeacher = async (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string): Promise<boolean> => {
    return await assignSubjectToTeacherAPI(teacherId, subjectId, classId, academicYear, term);
  };

  const removeSubjectAssignment = async (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string): Promise<boolean> => {
    return await removeSubjectAssignmentAPI(teacherId, subjectId, classId, academicYear, term);
  };

  const getSubjectAssignments = (academicYear: string, term: string) => {
    return subjectAssignments.filter(sa => 
      sa.academic_year === academicYear && 
      sa.term === term
    );
  };

  const getTeacherSubjectAssignments = (teacherId: number, academicYear: string, term: string) => {
    return subjectAssignments.filter(sa => 
      sa.teacher_id === teacherId &&
      sa.academic_year === academicYear && 
      sa.term === term
    );
  };

  const getClassSubjectAssignments = (classId: number, academicYear: string, term: string) => {
    return subjectAssignments.filter(sa => 
      sa.class_id === classId &&
      sa.academic_year === academicYear && 
      sa.term === term
    );
  };

  const getUnassignedSubjects = (classId: number, academicYear: string, term: string) => {
    const assignedSubjectIds = subjectAssignments
      .filter(sa => sa.class_id === classId && sa.academic_year === academicYear && sa.term === term)
      .map(sa => sa.subject_id);
    
    return subjects.filter(s => !assignedSubjectIds.includes(s.id));
  };

  const getAvailableTeachers = (_academicYear: string, _term: string, _subjectId: number, _classId: number) => {
    // Return all teachers for now - could be enhanced with availability logic
    return teachers;
  };

  // Add missing score and result methods

  const getCompiledResults = (academicYear: string, term: string) => {
    return compiledResults.filter(r => 
      r.academic_year === academicYear && 
      r.term === term
    );
  };

  const getResultsByStudent = (studentId: number) => {
    return compiledResults.filter(r => r.student_id === studentId);
  };

  const getAttendanceByStudent = (studentId: number, academicYear: string, term: string): Attendance[] => {
    return attendances.filter(a =>
      a.student_id === studentId &&
      a.academic_year === academicYear &&
      a.term === term
    );
  };

  const getAttendanceByClass = (classId: number, date: string): Attendance[] => {
    return attendances.filter(a => a.class_id === classId && a.date === date);
  };

  // Add missing methods
  const getAttendanceSummary = (_classId: number, _academicYear: string, _term: string) => {
    return [];
  };

  const createBatchAttendance = async (attendanceRecords: Omit<Attendance, 'id'>[]): Promise<boolean> => {
    try {
      for (const record of attendanceRecords) {
        await sqlDatabase.createAttendance(record);
      }
      return true;
    } catch (error) {
      
      return false;
    }
  };

  const deleteUser = async (id: number): Promise<boolean> => {
    return await deleteUserAPI(id);
  };

  const deleteFeeStructure = async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteRecord('fee_structures', id);
    } catch (error) {
      
      throw error;
    }
  };

  const createUser = async (userData: any): Promise<User | null> => {
    return await createUserAPI(userData);
  };

  const updateUser = async (id: number, userData: any): Promise<boolean> => {
    return await updateUserAPI(id, userData);
  };

  const approveCompiledResult = async (resultId: number): Promise<void> => {
    try {
      // Get the compiled result details
      const result = compiledResults.find((r: any) => r.id === resultId);
      if (!result) {
        throw new Error('Result not found');
      }

      // Ensure localStorage auth artifacts match the active session.
      // This prevents RBAC checks (sqlDatabase) from reading a stale user role.
      tokenManager.ensureToken(currentUser);

      const approvedBy = currentUser?.id ?? null;
      const approvedDate = new Date().toISOString();

      // Update compiled result status to 'Approved' in database
      const updateRes: any = await sqlDatabase.updateCompiledResult(resultId, { 
        status: 'Approved',
        approved_by: approvedBy,
        approved_date: approvedDate
      });

      // Some sqlDatabase methods can return a structured failure object instead of throwing.
      if (updateRes && updateRes.success === false) {
        throw new Error(updateRes.message || 'Failed to approve result');
      }
      
      // Update local state
      setCompiledResults(prev => prev.map((r: any) => (r.id === resultId ? {
        ...r,
        status: 'Approved',
        approved_by: approvedBy,
        approved_date: approvedDate
      } : r)));

      // Send notification to parent
      const student = students.find((s: any) => s.id === result.student_id);
      if (student && student.parent_id) {
        try {
          const isThirdTerm = String(result.term) === 'Third Term';

          // On Third Term approvals we must compute the promotion status based on the session
          // (First/Second/Third Term averages) and include it in the parent notification.
          if (isThirdTerm) {
            await loadCompiledResultsFromAPI('Approved', null, String(result.academic_year));
          }

          const promo = isThirdTerm
            ? calculateSessionPromotionMetrics(Number(result.student_id), String(result.academic_year))
            : null;

          await addNotification({
            title: "Result Approved",
            message: isThirdTerm && promo
              ? `Your child's ${result.term} result for ${result.academic_year} has been approved and is now available for viewing. Promotion Status: ${promo.status}. Session Avg: ${promo.sessionAverage.toFixed(1)}% (${promo.termCount} term${promo.termCount === 1 ? '' : 's'}). Session Attendance: ${promo.sessionAttendancePct.toFixed(0)}%.`
              : `Your child's ${result.term} result for ${result.academic_year} has been approved and is now available for viewing.`,
            type: "success",
            targetAudience: "parents",
            sentBy: currentUser?.id || 0,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
        } catch (e) {
          // Notification failure should not block approval.
        }
      }

      toast.success(`Result approved for ${student?.firstName} ${student?.lastName}`);
    } catch (error) {
      
      toast.error('Failed to approve result');
      throw error;
    }
  };

  const publishCompiledResult = async (_resultId: number): Promise<void> => {
    // Implementation would go here
  };

  // Keep realtime loader refs updated once the underlying functions exist.
  // NOTE: This must be declared after the loader functions to avoid TDZ errors.
  useEffect(() => {
    realtimeLoadersRef.current.loadSchoolSettings = loadSchoolSettings;
    realtimeLoadersRef.current.loadClassesFromAPI = loadClassesFromAPI;
    realtimeLoadersRef.current.loadStudentsFromAPI = loadStudentsFromAPI;
    realtimeLoadersRef.current.loadParentStudentLinksFromAPI = loadParentStudentLinksFromAPI;
    realtimeLoadersRef.current.loadSubjectsFromAPI = loadSubjectsFromAPI;
    realtimeLoadersRef.current.loadSubjectAssignmentsFromAPI = loadSubjectAssignmentsFromAPI;
    realtimeLoadersRef.current.loadClassTeacherAssignmentsFromAPI = loadClassTeacherAssignmentsFromAPI;
    realtimeLoadersRef.current.loadScoresFromAPI = loadScoresFromAPI;
    realtimeLoadersRef.current.loadCompiledResultsFromAPI = loadCompiledResultsFromAPI;
    realtimeLoadersRef.current.loadNotificationsFromAPI = loadNotificationsFromAPI;
    realtimeLoadersRef.current.loadPaymentsFromAPI = loadPaymentsFromAPI;
    realtimeLoadersRef.current.loadTeachersFromAPI = loadTeachersFromAPI;
    realtimeLoadersRef.current.loadParentsFromAPI = loadParentsFromAPI;
    realtimeLoadersRef.current.loadUsersFromAPI = loadUsersFromAPI;
    realtimeLoadersRef.current.loadAttendancesFromAPI = loadAttendancesFromAPI;
  }, [
    loadSchoolSettings,
    loadClassesFromAPI,
    loadStudentsFromAPI,
    loadParentStudentLinksFromAPI,
    loadSubjectsFromAPI,
    loadSubjectAssignmentsFromAPI,
    loadClassTeacherAssignmentsFromAPI,
    loadScoresFromAPI,
    loadCompiledResultsFromAPI,
    loadNotificationsFromAPI,
    loadPaymentsFromAPI,
    loadTeachersFromAPI,
    loadParentsFromAPI,
    loadUsersFromAPI,
    loadAttendancesFromAPI,
  ]);

  const value: SchoolContextType = {
    // Data
    students,
    teachers,
    parents,
    accountants,
    classes,
    parentChildrenData,
    subjects,
    subjectRegistrations,
    subjectAssignments,
    classTeacherAssignments,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    cumulativeResults,
    payments,
    users,
    currentUser,
    isLoading,
    loadingCumulative,
    feeStructures,
    studentFeeBalances,
    feeBalances: studentFeeBalances,
    notifications,
    attendances,
    attendanceRequirements,
    
    // State Setters
    setUsers,
    setTeachers,
    setParents,
    setAccountants,
    setStudents,
    setClasses,
    setSubjects,
    setSubjectRegistrations,
    setSubjectAssignments,
    setClassTeacherAssignments,
    setScores,
    setAffectiveDomains,
    setPsychomotorDomains,
    setCompiledResults,
    setPayments,
    setFeeStructures,
    setStudentFeeBalances,
    setNotifications,
    setAttendances,
    setCbtExams,
    setCbtQuestions,
    setCbtAttempts,
    setCbtQuestionBank,
    cbtExams,
    cbtQuestions,
    cbtAttempts,
    cbtQuestionBank,
    parentStudentLinks: parentStudentLinksData,

    // Settings
    currentTerm,
    currentAcademicYear,
    schoolSettings,
    bankAccountSettings,

    // Methods
    addStudent,
    updateStudent,
    deleteStudent,
    deleteBulkStudents,
    createStudentAPI,
    updateStudentAPI,
    deleteStudentAPI,
    getStudentsByClass,
    refreshStudents,
    addTeacher,
    addUser: async (user: any) => {
      try {
        const res: any = await api.post('/users', user);
        return res?.data?.id ?? 0;
      } catch (e) {
        return 0;
      }
    },
    updateTeacher,
    deleteTeacher,
    addParent,
    updateParent,
    deleteParent,
    addAccountant,
    updateAccountant,
    deleteAccountant,
    addClass,
    updateClass,
    deleteClass,
    addSubject,
    updateSubject,
    deleteSubject,
    createSubjectAPI,
    updateSubjectAPI,
    deleteSubjectAPI,
    addScore,
    updateScore,
    deleteScore,

    // Payment Methods
    addPayment,
    updatePayment,
    verifyPayment,
    rejectPayment,
    reversePayment,
    getPaymentsByStudent,
    addFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    getFeeStructures,
    getStudentFeeBalance,
    updateStudentFeeBalance,
    autoGenerateInvoices,
    getStudentInvoice,
    getClassInvoices,
    updateAttendanceRequirements,
    getAttendanceRequirements,
    loadAttendanceRequirements,
    getTeacherAssignments,
    getTeacherClassTeacherAssignments,
    getTeacherClasses,
    updateTeacherStatus,
    getParentStudents,
    getStudentRecentActivities,
    getClassesByLevel,
    getClassStudents,
    updateClassTeacher,
    getSubjectsByCategory,
    getSubjectsByLevel,
    registerSubjectForClass,
    getRegisteredSubjects,
    getSubjectRegistrations,
    assignSubjectToTeacher,
    removeSubjectAssignment,
    getSubjectAssignments,
    getTeacherSubjectAssignments,
    getClassSubjectAssignments,
    getUnassignedSubjects,
    getAvailableTeachers,
    createBatchScores,
    getScoresByStudent,
    getScoresByAssignment,
    getScoresByClass,
    rejectScore,
    approveScore,
    submitScores,
    getPendingScores,
    removeSubjectRegistration: removeSubjectRegistrationAPI,
    getCompiledResults,
    getResultsByClass,
    getResultsByStudent,
    approveCompiledResult,
    updateCompiledResult,
    deleteCompiledResult,
    addCompiledResult: async (data: any) => {
      try {
        
        
        // Check if record exists to avoid duplicate entry errors
        const checkQuery = `SELECT id FROM compiled_results WHERE student_id = ? AND class_id = ? AND term = ? AND academic_year = ?`;
        const checkParams = [data.student_id, data.class_id, data.term, data.academic_year];
        
        // Use executeQuery which returns different structures depending on the backend, 
        // but for SELECT it usually returns array of rows or { data: rows }
        const checkResult = await sqlDatabase.executeQuery(checkQuery, checkParams);
        // Handle potential different return formats (array vs object with data property)
        const existingRows = Array.isArray(checkResult) ? checkResult : (checkResult?.data || []);
        
        if (existingRows && existingRows.length > 0) {
          // Update existing record
          const existingId = existingRows[0].id;
          
          
          const updateQuery = `
            UPDATE compiled_results SET
              total_score = ?,
              average_score = ?,
              class_average = ?,
              position = ?,
              total_students = ?,
              times_present = ?,
              times_absent = ?,
              total_attendance_days = ?,
              term_begin = ?,
              term_end = ?,
              next_term_begin = ?,
              class_teacher_name = ?,
              class_teacher_comment = ?,
              principal_name = ?,
              principal_comment = ?,
              principal_signature = ?,
              approved_by = ?,
              approved_date = ?,
              print_approved = ?,
              rejection_reason = ?,
              compiled_date = NOW(),
              status = ?
            WHERE id = ?
          `;
          
          const updateParams = [
            data.total_score, data.average_score, data.class_average, data.position,
            data.total_students, data.times_present, data.times_absent, data.total_attendance_days,
            data.term_begin, data.term_end, data.next_term_begin,
            data.class_teacher_name, data.class_teacher_comment,
            data.principal_name, data.principal_comment, data.principal_signature,
            data.approved_by, data.approved_date, data.print_approved || 0, data.rejection_reason,
            data.status,
            existingId
          ];
          
          await sqlDatabase.executeQuery(updateQuery, updateParams);
          await loadCompiledResultsFromAPI(null, data.term, data.academic_year);
          return existingId;
        } else {
          // Insert new record
          
          const insertQuery = `
            INSERT INTO compiled_results (
              student_id, class_id, term, academic_year, 
              total_score, average_score, class_average, position,
              total_students, times_present, times_absent, total_attendance_days,
              term_begin, term_end, next_term_begin,
              class_teacher_name, class_teacher_comment,
              principal_name, principal_comment, principal_signature,
              compiled_by, compiled_date, status,
              approved_by, approved_date, print_approved, rejection_reason
            ) VALUES (
              ?, ?, ?, ?, 
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?,
              ?, ?, ?,
              ?, NOW(), ?,
              ?, ?, ?, ?
            )
          `;
          
          const insertParams = [
            data.student_id, data.class_id, data.term, data.academic_year,
            data.total_score, data.average_score, data.class_average, data.position,
            data.total_students, data.times_present, data.times_absent, data.total_attendance_days,
            data.term_begin, data.term_end, data.next_term_begin,
            data.class_teacher_name, data.class_teacher_comment,
            data.principal_name, data.principal_comment, data.principal_signature,
            data.compiled_by, data.status,
            data.approved_by, data.approved_date, data.print_approved || 0, data.rejection_reason
          ];
          
          const result = await sqlDatabase.executeQuery(insertQuery, insertParams);
          
          if (result && (result.insertId || result.affectedRows > 0)) {
            await loadCompiledResultsFromAPI(null, data.term, data.academic_year);
            return result.insertId || 1; // Return insertId or success indicator
          }
        }
        
        return 0;
      } catch (error) {
        
        throw error;
      }
    },
    publishCompiledResult,
    getAttendanceByStudent,
    getAttendanceByClass,
    getFeeStructureByClass,
    addNotification,

    // CBT Methods
    loadCbtExamsFromAPI,
    loadCbtQuestionsFromAPI,
    loadCbtAttemptsFromAPI,
    loadCbtQuestionBankFromAPI,
    loadCbtStudentExamsFromAPI,
    loadCbtMyAttemptsFromAPI,
    createCbtExam,
    updateCbtExam,
    deleteCbtExam,
    publishCbtExam,
    addCbtQuestion,
    updateCbtQuestion,
    deleteCbtQuestion,
    reorderCbtQuestions,
    addToCbtQuestionBank,
    deleteFromCbtQuestionBank,
    importFromCbtBank,
    startCbtAttempt,
    saveCbtAnswer,
    submitCbtAttempt,
    getCbtAttemptDetail,
    getCbtExamResults,
    feedCbtExamScores,
    deleteCbtExamScores,
    bulkImportQuestions,
    uploadQuestionImage,
    generateQuestionsFromMaterial,

    createAffectiveDomain: async (affectiveData: any) => {
      try {
        await tokenManager.ensureToken(currentUser);

        const domains = {
          attentiveness: affectiveData?.attentiveness,
          honesty: affectiveData?.honesty,
          neatness: affectiveData?.neatness,
          obedience: affectiveData?.obedience,
          sense_of_responsibility: affectiveData?.sense_of_responsibility,
          attentiveness_remark: affectiveData?.attentiveness_remark,
          honesty_remark: affectiveData?.honesty_remark,
          neatness_remark: affectiveData?.neatness_remark,
          obedience_remark: affectiveData?.obedience_remark,
          sense_of_responsibility_remark: affectiveData?.sense_of_responsibility_remark
        };

        const payload = {
          student_id: affectiveData?.student_id,
          class_id: affectiveData?.class_id,
          term: affectiveData?.term,
          academic_year: affectiveData?.academic_year,
          domains
        };

        const result = await api.post('/students/affective-domains', payload);
        await loadAffectiveDomainsFromAPI(affectiveData?.term ?? null, affectiveData?.academic_year ?? null);
        toast.success('Affective domain assessment saved');
        return result;
      } catch (error: any) {
        
        toast.error('Failed to save affective domain assessment');
        throw error;
      }
    },
    deleteAffectiveDomain: async (_id: number) => {
      // Placeholder implementation
      
      return Promise.resolve();
    },
    createPsychomotorDomain: async (psychomotorData: any) => {
      try {
        await tokenManager.ensureToken(currentUser);

        const domains = {
          attention_to_direction: psychomotorData?.attention_to_direction,
          considerate_of_others: psychomotorData?.considerate_of_others,
          handwriting: psychomotorData?.handwriting,
          sports: psychomotorData?.sports,
          verbal_fluency: psychomotorData?.verbal_fluency,
          works_well_independently: psychomotorData?.works_well_independently,
          attention_to_direction_remark: psychomotorData?.attention_to_direction_remark,
          considerate_of_others_remark: psychomotorData?.considerate_of_others_remark,
          handwriting_remark: psychomotorData?.handwriting_remark,
          sports_remark: psychomotorData?.sports_remark,
          verbal_fluency_remark: psychomotorData?.verbal_fluency_remark,
          works_well_independently_remark: psychomotorData?.works_well_independently_remark
        };

        const payload = {
          student_id: psychomotorData?.student_id,
          class_id: psychomotorData?.class_id,
          term: psychomotorData?.term,
          academic_year: psychomotorData?.academic_year,
          domains
        };

        const result = await api.post('/students/psychomotor-domains', payload);
        await loadPsychomotorDomainsFromAPI(psychomotorData?.term ?? null, psychomotorData?.academic_year ?? null);
        toast.success('Psychomotor domain assessment saved');
        return result;
      } catch (error: any) {
        
        toast.error('Failed to save psychomotor domain assessment');
        throw error;
      }
    },
    deletePsychomotorDomain: async (_id: number) => {
      // Placeholder implementation
      
      return Promise.resolve();
    },


    // User Management Methods
    createUserAPI,
    updateUserAPI,
    deleteUserAPI,
    setCurrentUser,
    login,
    studentLogin,
    logout: () => {
      
      // Call backend to blacklist the token before clearing local data
      const currentToken = getAuthToken();
      if (currentToken) {
        fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
        }).catch(() => {
          // Silent fail — token may already be expired
        });
      }
      
      // Clear authentication data
      removeAuthToken();
      setCurrentUser(null);
      
      // Clear all local storage data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cached data in context
      setStudents([]);
      setTeachers([]);
      setClasses([]);
      setSubjects([]);
      setScores([]);
      setPayments([]);
      setNotifications([]);
      setCompiledResults([]);
      
      // Reset loading states
      setIsLoading(false);
      setIsLoadingData(false);
      
      // Clear login toast flag for next session
      sessionStorage.removeItem('loginToastShown');
      toast.success('Logged out successfully');
      
      // Force redirect to login page
      window.location.href = '/login';
    },
    changePassword,
    markNotificationAsRead,
    deleteNotification,
    getUnreadNotifications,
    getAllNotifications,
    getClassTeacher,
    getClassSubjects,
    updateClassStudentCount,
    loadCurrentTermAndYear,
    loadSchoolSettings,
    getAllAcademicYears,
    getCompiledResultsByYearAndTerm,
    updateCurrentTerm,
    updateCurrentAcademicYear,
    updateCurrentTermAndYear,
    updateSchoolSettings,
    updateTermDates,
    getTermDates,
    loadTermDates,
    updateBankAccountSettings,
    getBankAccountSettings,
    validateClassTeacherAssignment,
    promoteStudent,
    promoteMultipleStudents,

    // Attendance Methods
    addAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendancesByStudent,
    getAttendancesByClass,
    getAttendancesByDate,

    // Enhanced Teacher Assignment Methods
    getTeacherStudents,
    getTeacherResponsibilities: getTeacherResponsibilities_NEW,
    
    // Enhanced Parent-Child Linking Methods
    getParentChildren,
    getStudentSubjects,
    getStudentRecentScores,
    linkStudentToParent,
    linkParentToStudent,
    unlinkStudentFromParent,
    getParentPermissions,

    // API Integration Methods
    loadUsersFromAPI,
    loadTeachersFromAPI,
    loadParentsFromAPI,
    loadParentStudentLinksFromAPI,
    getParentChildrenFromAPI,
    loadAccountantsFromAPI,
    loadStudentsFromAPI,
    loadClassesFromAPI,
    loadSubjectsFromAPI,
    loadSubjectRegistrationsFromAPI,
    loadSubjectAssignmentsFromAPI,
    loadClassTeacherAssignmentsFromAPI,
    loadScoresFromAPI,
    loadAffectiveDomainsFromAPI,
    loadPsychomotorDomainsFromAPI,
    loadFeeStructuresFromAPI,
    loadStudentFeeBalancesFromAPI,
    loadNotificationsFromAPI,
    loadAttendancesFromAPI,
    // Real-time Sync Methods (MINIMAL - only term-specific data)
    refreshTermData: async () => {
      // Only load data that's term-specific
      await Promise.all([
        loadSubjectAssignmentsFromAPI(),
        loadClassTeacherAssignmentsFromAPI(),
        loadScoresFromAPI(),
        loadCompiledResultsFromAPI(),
        loadAttendancesFromAPI(),
      ]);
    },
    
    // Teacher-specific refresh methods
    refreshTeacherData: async (_teacherId: number) => {
      await Promise.all([
        loadStudentsFromAPI(),
        loadClassesFromAPI(),
        loadSubjectsFromAPI(),
        loadSubjectAssignmentsFromAPI(true), // Force reload
        loadClassTeacherAssignmentsFromAPI(true), // Force reload
        loadScoresFromAPI(),
        loadAffectiveDomainsFromAPI(),
        loadPsychomotorDomainsFromAPI(),
        loadCompiledResultsFromAPI(),
      ]);
    },
    
    // Class-specific refresh
    refreshClassData: async (_classId: number) => {
      await Promise.all([
        loadStudentsFromAPI(),
        loadScoresFromAPI(),
        loadAffectiveDomainsFromAPI(),
        loadPsychomotorDomainsFromAPI(),
        loadCompiledResultsFromAPI(),
      ]);
    },
    
    // Permission checking methods
    hasPermission: async (permission: string): Promise<boolean> => {
      if (!currentUser) return false;
      try {
        // Delegate to the in-memory permission checker for now
        return checkUserPermissionAPI(currentUser.role, permission);
      } catch (error) {
        
        return false;
      }
    },
    
    canViewStudents: async (): Promise<boolean> => {
      return checkUserPermissionAPI('teacher', 'read_students');
    },
    
    canManageScores: async (): Promise<boolean> => {
      // Check if teacher has class teacher assignments or subject assignments for current term/year
      if (currentUser?.role === 'teacher' && currentUser?.linked_id) {
        const teacherId = currentUser.linked_id;
        
        // Check class teacher assignments
        const classTeacherAssignmentsForTeacher = classTeacherAssignments.filter(
          (cta: any) => String(cta.teacher_id) === String(teacherId) && 
          cta.academic_year === currentAcademicYear && 
          cta.term === currentTerm &&
          cta.status === 'Active'
        );
        
        // Check subject assignments
        const subjectAssignmentsForTeacher = subjectAssignments.filter(
          (sa: any) => String(sa.teacher_id) === String(teacherId) && 
          sa.academic_year === currentAcademicYear && 
          sa.term === currentTerm &&
          sa.status === 'Active'
        );
        
        const hasAssignments = classTeacherAssignmentsForTeacher.length > 0 || subjectAssignmentsForTeacher.length > 0;
        
        return hasAssignments;
      }
      
      return false;
    },
    
    canViewResults: async (): Promise<boolean> => {
      return checkUserPermissionAPI('teacher', 'view_student_reports');
    },
    
    canManageClasses: async (): Promise<boolean> => {
      return checkUserPermissionAPI('teacher', 'manage_classes');
    },
    
    canManageSubjects: async (): Promise<boolean> => {
      return checkUserPermissionAPI('teacher', 'manage_subjects');
    },
    
    // Real-time event listeners
    subscribeToDataUpdates: (callback: () => void) => {
      const interval = setInterval(async () => {
        try {
          await Promise.all([
            loadScoresFromAPI(),
            // Keep admin dashboards in sync without requiring manual refresh.
            // loadCompiledResultsFromAPI already has cache-busting (_ts) on GET.
            (currentAcademicYear ? loadCompiledResultsFromAPI(null) : Promise.resolve(false)),
          ]);
          callback();
        } catch (error) {
          
        }
      }, 30000);
      
      return () => clearInterval(interval);
    },
    
    loadAllDataFromAPI: async () => {
      await loadUsersFromAPI();
      await loadTeachersFromAPI();
      await loadParentsFromAPI();
      await loadParentStudentLinksFromAPI();
      await loadAccountantsFromAPI();
      await loadStudentsFromAPI();
      await loadClassesFromAPI();
      await loadSubjectsFromAPI();
      await loadSubjectRegistrationsFromAPI();
      await loadSubjectAssignmentsFromAPI();
      await loadScoresFromAPI(); // Add missing scores loading
      
      // Load payments only for admin/accountant roles
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'accountant')) {
        await loadPaymentsFromAPI();
      }
      
      await loadFeeStructuresFromAPI();
    },
    
    // User Management Methods
    deleteUser,
    createUser,
    updateUser,
    updateUserStatus: updateUserStatusAPI,
    updateUserStatusAPI,
    resetUserPassword: resetUserPassword,
    resetUserPasswordAPI,
    getUserPermissions: getUserPermissionsAPI,
    getUserPermissionsAPI,
    
    // Attendance Methods
    getAttendanceSummary,
    createBatchAttendance,
    
    // Teacher API Methods
    createTeacherAPI,
    updateTeacherAPI,
    deleteTeacherAPI,
    
    // Parent API Methods
    createParentAPI,
    updateParentAPI,
    deleteParentAPI,
    
    // Accountant API Methods
    createAccountantAPI,
    updateAccountantAPI,
    deleteAccountantAPI,
    
    // Status Management API Methods
    updateTeacherStatusAPI,
    updateParentStatusAPI,
    updateAccountantStatusAPI,

    // Subject Registration API Methods
    getActiveAcademicYearAPI,
    getActiveTermAPI,
    getRegisteredSubjectsAPI,
    registerSubjectForClassAPI,
    removeSubjectRegistrationAPI,
    getSubjectRegistrationsAPI,
    getSubjectAssignmentsAPI,
    assignSubjectToTeacherAPI,
    removeSubjectAssignmentAPI,
    getUnassignedSubjectsAPI,
    getAvailableTeachersAPI,
    
    // Teacher Assignment Helper Functions
    getTeacherAssignmentsForCurrentTerm,
    getTeacherSubjectsForCurrentTerm,
    
    // Payment API Methods
    createPaymentAPI,
    loadPaymentsFromAPI,
    getPaymentExceptions,
    createFeeStructureAPI,
    getFeeStructuresAPI,
    getPaymentsAPI,
    updatePaymentStatusAPI,
    getFeeBalancesAPI,
    createBatchPaymentsAPI,

    // Affective and Psychomotor API Methods
    addAffectiveDomain: async (affectiveData: any) => {
      try {
        await tokenManager.ensureToken(currentUser);

        const domains = {
          attentiveness: affectiveData?.attentiveness,
          honesty: affectiveData?.honesty,
          neatness: affectiveData?.neatness,
          obedience: affectiveData?.obedience,
          sense_of_responsibility: affectiveData?.sense_of_responsibility,
          attentiveness_remark: affectiveData?.attentiveness_remark,
          honesty_remark: affectiveData?.honesty_remark,
          neatness_remark: affectiveData?.neatness_remark,
          obedience_remark: affectiveData?.obedience_remark,
          sense_of_responsibility_remark: affectiveData?.sense_of_responsibility_remark
        };

        const payload = {
          student_id: affectiveData?.student_id,
          class_id: affectiveData?.class_id,
          term: affectiveData?.term,
          academic_year: affectiveData?.academic_year,
          domains
        };

        const result = await api.post('/students/affective-domains', payload);
        await loadAffectiveDomainsFromAPI(affectiveData?.term ?? null, affectiveData?.academic_year ?? null);
        toast.success('Affective domain assessment saved');
        return result;
      } catch (error: any) {
        
        toast.error('Failed to save affective domain assessment');
        throw error;
      }
    },

    updateAffectiveDomain: async (_id: number, affectiveData: any) => {
  try {
    // Backend endpoint performs upsert, so update uses the same route.
    await tokenManager.ensureToken(currentUser);

    const domains = {
      attentiveness: affectiveData?.attentiveness,
      honesty: affectiveData?.honesty,
      neatness: affectiveData?.neatness,
      obedience: affectiveData?.obedience,
      sense_of_responsibility: affectiveData?.sense_of_responsibility,
      attentiveness_remark: affectiveData?.attentiveness_remark,
      honesty_remark: affectiveData?.honesty_remark,
      neatness_remark: affectiveData?.neatness_remark,
      obedience_remark: affectiveData?.obedience_remark,
      sense_of_responsibility_remark: affectiveData?.sense_of_responsibility_remark
    };

    const payload = {
      student_id: affectiveData?.student_id,
      class_id: affectiveData?.class_id,
      term: affectiveData?.term,
      academic_year: affectiveData?.academic_year,
      domains
    };

    const result = await api.post('/students/affective-domains', payload);
    await loadAffectiveDomainsFromAPI(affectiveData?.term ?? null, affectiveData?.academic_year ?? null);
    toast.success('Affective domain assessment updated');
    return result;
  } catch (error) {
    
    toast.error('Failed to update affective domain assessment');
    throw error;
  }
},

    addPsychomotorDomain: async (psychomotorData: any) => {
      try {
        await tokenManager.ensureToken(currentUser);

        const domains = {
          attention_to_direction: psychomotorData?.attention_to_direction,
          considerate_of_others: psychomotorData?.considerate_of_others,
          handwriting: psychomotorData?.handwriting,
          sports: psychomotorData?.sports,
          verbal_fluency: psychomotorData?.verbal_fluency,
          works_well_independently: psychomotorData?.works_well_independently,
          attention_to_direction_remark: psychomotorData?.attention_to_direction_remark,
          considerate_of_others_remark: psychomotorData?.considerate_of_others_remark,
          handwriting_remark: psychomotorData?.handwriting_remark,
          sports_remark: psychomotorData?.sports_remark,
          verbal_fluency_remark: psychomotorData?.verbal_fluency_remark,
          works_well_independently_remark: psychomotorData?.works_well_independently_remark
        };

        const payload = {
          student_id: psychomotorData?.student_id,
          class_id: psychomotorData?.class_id,
          term: psychomotorData?.term,
          academic_year: psychomotorData?.academic_year,
          domains
        };

        const result = await api.post('/students/psychomotor-domains', payload);
        await loadPsychomotorDomainsFromAPI(psychomotorData?.term ?? null, psychomotorData?.academic_year ?? null);
        toast.success('Psychomotor domain assessment saved');
        return result;
      } catch (error: any) {
        
        toast.error('Failed to save psychomotor domain assessment');
        throw error;
      }
    },

    updatePsychomotorDomain: async (_id: number, psychomotorData: any) => {
      try {
        // Backend endpoint performs upsert, so update uses the same route.
        await tokenManager.ensureToken(currentUser);

        const domains = {
          attention_to_direction: psychomotorData?.attention_to_direction,
          considerate_of_others: psychomotorData?.considerate_of_others,
          handwriting: psychomotorData?.handwriting,
          sports: psychomotorData?.sports,
          verbal_fluency: psychomotorData?.verbal_fluency,
          works_well_independently: psychomotorData?.works_well_independently,
          attention_to_direction_remark: psychomotorData?.attention_to_direction_remark,
          considerate_of_others_remark: psychomotorData?.considerate_of_others_remark,
          handwriting_remark: psychomotorData?.handwriting_remark,
          sports_remark: psychomotorData?.sports_remark,
          verbal_fluency_remark: psychomotorData?.verbal_fluency_remark,
          works_well_independently_remark: psychomotorData?.works_well_independently_remark
        };

        const payload = {
          student_id: psychomotorData?.student_id,
          class_id: psychomotorData?.class_id,
          term: psychomotorData?.term,
          academic_year: psychomotorData?.academic_year,
          domains
        };

        const result = await api.post('/students/psychomotor-domains', payload);
        await loadPsychomotorDomainsFromAPI(psychomotorData?.term ?? null, psychomotorData?.academic_year ?? null);
        toast.success('Psychomotor domain assessment updated');
        return result;
      } catch (error: any) {
        
        toast.error('Failed to update psychomotor domain assessment');
        throw error;
      }
    },

    // User Management Methods
    checkUserPermissionAPI,
    getPendingApprovals,
    loadCompiledResultsFromAPI,
    loadCumulativeResultsFromAPI,
    compileCumulativeResults
  };

  // Load term and year settings on mount
  useEffect(() => {
    loadCurrentTermAndYear();
  }, []); // Empty dependency array to run only once on mount

  // DISABLED: No automatic term change detection or refresh
  // const { isRefreshing } = useTermChangeDetector({
  //   currentTerm,
  //   currentAcademicYear,
  //   onTermChange: handleTermChange,
  //   refreshAllData: value.refreshAllData
  // });

  // DISABLED: No periodic server sync
  // useTermSync({
  //   currentTerm,
  //   currentAcademicYear,
  //   refreshAllData: value.refreshAllData
  // });

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}
