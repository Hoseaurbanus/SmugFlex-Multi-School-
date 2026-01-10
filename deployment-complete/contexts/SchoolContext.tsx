// School Context
// Graceland Royal Academy School Management System
// UPDATED: Dec 30, 2025 - Testing build cache

import { School } from 'lucide-react';
import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { api, PaginatedData } from '../services/api';
import { setAuthToken, setCurrentUser as setApiCurrentUser, getAuthToken, removeAuthToken, API_CONFIG, getCurrentUser as getApiCurrentUser } from '../config/api';
import { saveToLocalStorage, loadFromLocalStorage, type StorageData } from '../utils/storageManager';
import { tokenManager } from '../utils/tokenManager';
import { connectionMonitor } from '../utils/connectionMonitor';
import sqlDatabase from '../services/sqlDatabase';
import { useTermChangeDetector, useTermSync } from '../hooks/useTermChangeDetector';

// ==================== INTERFACES ====================

export interface Student {
  id: number;
  firstName: string; // changed from first_name
  lastName: string; // changed from last_name
  otherName?: string; // changed from other_name
  admissionNumber: string; // changed from admission_number
  class_id: number; // matches database
  level: string;
  parent_id: number | null; // matches database
  parent_name?: string; // parent full name - computed field for display
  date_of_birth: string; // matches database
  gender: 'Male' | 'Female';
  photo_url?: string; // matches database
  passport_photo?: string; // base64 encoded - matches database
  status: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
  academic_year: string; // matches database
  admission_date?: string; // matches database
  created_at: string; // matches database
  updated_at: string; // matches database
  // Computed fields (from JOINs)
  className?: string; // from classes table
  classCategory?: string; // from classes table
  parentName?: string; // from parents table
}

export interface Parent {
  id: number;
  first_name: string; // matches database
  last_name: string; // matches database
  email: string;
  phone: string;
  alternate_phone?: string; // matches database
  address?: string; // matches database
  occupation?: string; // matches database
  status: 'Active' | 'Inactive';
  created_at: string; // matches database
  updated_at: string; // matches database
  // Computed fields
  student_ids?: number[]; // from parent_student_links table
  children_count?: number; // computed from parent_student_links
  // Computed display fields (for frontend convenience)
  firstName?: string; // computed from first_name
  lastName?: string; // computed from last_name
}

export interface Class {
  id: number;
  name: string; // matches database
  level: string; // matches database
  section?: string; // matches database
  category: 'Primary' | 'Secondary'; // matches database
  capacity: number; // matches database
  currentStudents: number; // mapped from current_students
  classTeacherId: number | null; // mapped from class_teacher_id
  classTeacher?: string; // mapped from class_teacher
  academicYear: string; // mapped from academic_year
  status: 'Active' | 'Inactive'; // matches database
  createdAt: string; // mapped from created_at
  updatedAt: string; // mapped from updated_at
  // Computed fields
  class_teacher_name?: string; // from teachers table
  enrolled_students?: number; // computed from students table
}

export interface Subject {
  id: number;
  name: string; // matches database field 'name'
  subject_name: string; // alias for name for compatibility
  code: string; // matches database
  category: 'Creche' | 'Nursery' | 'Primary' | 'JSS' | 'SS' | 'General'; // matches database
  department?: string; // matches database
  description?: string; // matches database
  is_core?: boolean; // matches database
  status: 'Active' | 'Inactive'; // matches database
  created_at?: string; // matches database
  updated_at?: string; // matches database
}

export interface SubjectAssignment {
  id: number;
  subject_id: number; // matches database
  class_id: number; // matches database
  teacher_id: number; // matches database
  academic_year: string; // matches database
  term: 'First Term' | 'Second Term' | 'Third Term'; // matches database
  status: 'Active' | 'Inactive'; // matches database
  created_at: string; // matches database
  updated_at: string; // matches database
  // Computed fields
  subject_name?: string; // from subjects table
  class_name?: string; // from classes table
  teacher_name?: string; // from teachers table
}

export interface SubjectRegistration {
  id: number;
  subject_id: number; // matches database
  class_id: number; // matches database
  academic_year: string; // matches database
  term: 'First Term' | 'Second Term' | 'Third Term'; // matches database
  is_compulsory: boolean; // matches database
  status: 'Active' | 'Inactive'; // matches database
  created_at: string; // matches database
  updated_at: string; // matches database
  // Computed fields
  subject_name?: string; // from subjects table
  subject_code?: string; // from subjects table
  subject_category?: string; // from subjects table
  class_name?: string; // from classes table
  class_level?: string; // from classes table
}

export interface Score {
  id: number;
  student_id: number; // matches database
  subject_assignment_id: number; // matches database
  subject_name?: string; // matches database - exact subject name as submitted (optional for backward compatibility)
  ca1: number; // matches database
  ca2: number; // matches database
  exam: number; // matches database
  total: number; // matches database (generated column)
  grade?: string; // matches database
  remark?: string; // matches database
  class_average?: number; // matches database
  class_min?: number; // matches database
  class_max?: number; // matches database
  entered_by: number; // matches database
  entered_date: string; // matches database
  status: 'Draft' | 'Submitted' | 'Rejected' | 'Approved'; // matches database
  rejection_reason?: string; // matches database
  rejected_by?: number; // matches database (class teacher id)
  rejected_date?: string; // matches database
  academic_year?: string; // matches database
  term?: 'First Term' | 'Second Term' | 'Third Term'; // matches database
  // Computed fields
  class_name?: string; // from subject_assignments + classes
  student_name?: string; // from students
}

export interface AffectiveDomain {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  attentiveness: number;
  attentiveness_remark: string;
  honesty: number;
  honesty_remark: string;
  punctuality: number;
  punctuality_remark: string;
  neatness: number;
  neatness_remark: string;
  obedience: number;
  obedience_remark: string;
  sense_of_responsibility: number;
  sense_of_responsibility_remark: string;
  entered_by: number;
  entered_date: string;
}

export interface PsychomotorDomain {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  attention_to_direction: number;
  attention_to_direction_remark: string;
  considerate_of_others: number;
  considerate_of_others_remark: string;
  handwriting: number;
  handwriting_remark: string;
  sports: number;
  sports_remark: string;
  handwork: number;
  handwork_remark: string;
  drawing: number;
  drawing_remark: string;
  music: number;
  music_remark: string;
  verbal_fluency: number;
  verbal_fluency_remark: string;
  works_well_independently: number;
  works_well_independently_remark: string;
  entered_by: number;
  entered_date: string;
}

export interface CompiledResult {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  scores: Score[];
  affective: AffectiveDomain | null;
  psychomotor: PsychomotorDomain | null;
  total_score: number;
  average_score: number;
  class_average: number;
  position: number;
  total_students: number;
  times_present: number;
  times_absent: number;
  total_attendance_days: number;
  term_begin: string;
  term_end: string;
  next_term_begin: string;
  class_teacher_name: string;
  class_teacher_comment: string;
  principal_name: string;
  principal_comment: string;
  principal_signature: string;
  compiled_by: number;
  compiled_date: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approved_by: number | null;
  approved_date: string | null;
  print_approved: number;
  rejection_reason: string | null;
}

export interface FeeStructure {
  id: number;
  class_id: number;
  class_name: string;
  level: string;
  term: string;
  academic_year: string;
  tuition_fee: number;
  development_levy: number;
  sports_fee: number;
  exam_fee: number;
  books_fee: number;
  uniform_fee: number;
  transport_fee: number;
  total_fee: number;
}

export interface StudentFeeBalance {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  total_fee_required: number;
  total_paid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface Payment {
  id: number;
  student_id: number;
  student_name: string;
  amount: number;
  payment_type: string;
  term: string;
  academic_year: string;
  payment_method: string;
  reference: string;
  recorded_by: number;
  recorded_date: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  receipt_number: string;
  verified_by?: number;
  verified_date?: string;
  notes?: string;
  transaction_reference?: string;
}

export interface Teacher {
  id: number | string; // ID can be string or number depending on API response
  firstName: string; // changed from first_name
  lastName: string; // changed from last_name
  otherName?: string;
  email?: string;
  phone?: string;
  employeeId?: string; // changed from employee_id
  gender?: string;
  qualification?: string;
  specialization?: string;
  status: 'Active' | 'Inactive';
  is_class_teacher?: boolean; // from database
  department_id?: number; // from database
  department?: string;
  signature?: string;
  created_at: string; // matches database
  updated_at: string; // matches database
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'teacher' | 'accountant' | 'parent';
  linked_id: number; // links to teacher/parent/accountant id - matches database
  email: string;
  status: 'Active' | 'Inactive';
  last_login: string | null; // matches database
  created_at: string; // matches database
  updated_at: string; // matches database
  token?: string; // JWT token for API authentication (runtime only)
}

export interface LoginResponse {
  id: string;
  username: string;
  role: string;
  linked_id: number;
  email: string;
  first_name: string;
  last_name: string;
  token: string;
}

export interface Accountant {
  id: number;
  firstName: string; // changed from first_name
  lastName: string; // changed from last_name
  employeeId: string; // changed from employee_id
  email: string;
  phone: string;
  department?: string;
  status: 'Active' | 'Inactive';
  created_at: string; // matches database
  updated_at: string; // matches database
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'teachers' | 'parents' | 'students' | 'accountants';
  sentBy: number; // admin user id
  sentDate: string;
  isRead: boolean;
  readBy: number[]; // user ids who have read this
}

export interface ActivityLog {
  id: number;
  actor: string;
  actor_role: 'Admin' | 'Teacher' | 'Accountant' | 'Parent' | 'System';
  action: string;
  target: string;
  timestamp: string;
  ip_address: string;
  status: 'Success' | 'Failed';
  details?: string;
  user_id?: number;
}

export interface Attendance {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  marked_by: number;
  marked_date: string;
  term: string;
  academic_year: string;
  remarks?: string;
  attended_days?: number;
  required_days?: number;
  times_absent?: number;
  attendance_rate?: number;
}

export interface ExamTimetable {
  id: number;
  class_id: number;
  class_name?: string;
  subject_id: number;
  subject_name?: string;
  exam_type: 'CA1' | 'CA2' | 'Exam' | 'Practical';
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  venue?: string;
  supervisor_id?: number;
  term: string;
  academic_year: string;
  instructions?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClassTimetable {
  id: number;
  class_id: number;
  class_name: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  venue: string;
  term: string;
  academic_year: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  head_of_department: string;
  head_of_department_id: number | null;
  description: string;
  teacher_count: number;
  status: 'Active' | 'Inactive';
}

export interface Scholarship {
  id: number;
  name: string;
  type: 'Percentage' | 'Fixed Amount';
  value: number;
  description: string;
  eligibility_criteria: string;
  beneficiaries: number;
  total_budget: number;
  status: 'Active' | 'Inactive';
  academic_year: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  due_date: string;
  total_marks: number;
  assigned_date: string;
  term: string;
  academic_year: string;
  status: 'Active' | 'Completed' | 'Overdue';
  attachment_url?: string;
}

export interface SchoolSettings {
  school_name: string;
  school_motto: string;
  school_logo_url?: string;
  principal_name: string;
  principal_signature?: string;
  head_teacher_name?: string;
  head_teacher_signature?: string;
  principal_comment?: string;
  head_teacher_comment?: string;
  resumption_date?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
}

export interface BankAccountSettings {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  payment_methods: {
    bank_transfer: boolean;
    online_payment: boolean;
    cash: boolean;
  };
  updated_by: number;
  updated_date: string;
}

// ==================== CONTEXT ====================

interface SchoolContextType {
  // Data
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
  accountants: Accountant[];
  classes: Class[];
  subjects: Subject[];
  subjectAssignments: SubjectAssignment[];
  classTeacherAssignments: any[];
  subjectRegistrations: SubjectRegistration[];
  scores: Score[];
  affectiveDomains: AffectiveDomain[];
  psychomotorDomains: PsychomotorDomain[];
  compiledResults: CompiledResult[];
  payments: Payment[];
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  feeStructures: FeeStructure[];
  studentFeeBalances: StudentFeeBalance[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  attendances: Attendance[];
  examTimetables: ExamTimetable[];
  classTimetables: ClassTimetable[];
  departments: Department[];
  scholarships: Scholarship[];
  assignments: Assignment[];
  parentStudentLinks: any[];
  attendanceRequirements: Record<string, number>;
  sqlDatabase: any;

  // State Setters
  setUsers: (users: User[]) => void;
  setTeachers: (teachers: Teacher[]) => void;
  setParents: (parents: Parent[]) => void;
  setAccountants: (accountants: Accountant[]) => void;
  setStudents: (students: Student[]) => void;
  setClasses: (classes: Class[]) => void;
  setSubjects: (subjects: Subject[]) => void;
  setSubjectRegistrations: (registrations: SubjectRegistration[]) => void;
  setSubjectAssignments: (assignments: SubjectAssignment[]) => void;
  setClassTeacherAssignments: (assignments: any[]) => void;
  setScores: (scores: Score[]) => void;
  setAffectiveDomains: (domains: AffectiveDomain[]) => void;
  setPsychomotorDomains: (domains: PsychomotorDomain[]) => void;
  setCompiledResults: (results: CompiledResult[]) => void;
  setPayments: (payments: Payment[]) => void;
  setFeeStructures: (structures: FeeStructure[]) => void;
  setStudentFeeBalances: (balances: StudentFeeBalance[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setActivityLogs: (logs: ActivityLog[]) => void;
  setAttendances: (attendances: Attendance[]) => void;

  // Settings
  currentTerm: string;
  currentAcademicYear: string;
  schoolSettings: SchoolSettings;
  bankAccountSettings: BankAccountSettings | null;
  
  // System Settings Methods
  loadCurrentTermAndYear: () => Promise<void>;
  loadSchoolSettings: () => Promise<void>;
  getAllAcademicYears: () => Promise<string[]>;
  getCompiledResultsByYearAndTerm: (academicYear: string, term: string) => Promise<CompiledResult[]>;
  updateCurrentTerm: (term: string) => Promise<void>;
  updateCurrentAcademicYear: (year: string) => Promise<void>;
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
  deleteBulkStudents: (studentIds: number[]) => Promise<any>;
  createStudentAPI: (studentData: any) => Promise<any>;
  updateStudentAPI: (id: number, studentData: any) => Promise<boolean>;
  deleteStudentAPI: (id: number) => Promise<boolean>;
  getStudentsByClass: (classId: number) => Student[];
  refreshStudents: () => Promise<void>;
  promoteStudent: (studentId: number, newClassId: number, newAcademicYear: string) => void;
  promoteMultipleStudents: (studentIds: number[], classMapping: { [studentId: number]: number }, newAcademicYear: string) => void;

  // Teacher Methods
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<number>;
  updateTeacher: (id: number, teacher: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: number) => Promise<void>;
  getTeacherAssignments: (teacherId: number) => SubjectAssignment[];
  getTeacherAssignmentsForCurrentTerm: (teacherId: number) => SubjectAssignment[];
  getTeacherSubjectsForCurrentTerm: (teacherId: number) => Array<{
    assignment: SubjectAssignment;
    subject: Subject | undefined;
    class: Class | undefined;
  }>;
  getTeacherClasses: (teacherId: number) => Array<{
    classId: number;
    className: string;
    classLevel: string;
    studentCount: number;
    subjects: Array<{
      subjectId: number;
      subjectName: string;
      subjectCode: string;
    }>;
  }>;
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
  createSubjectAPI: (subjectData: any) => Promise<number>;
  updateSubjectAPI: (id: number, subjectData: any) => Promise<boolean>;
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
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: number, payment: Partial<Payment>) => Promise<void>;
  verifyPayment: (id: number, data?: { action: 'verify' | 'reject', rejection_reason?: string }) => Promise<void>;
  rejectPayment: (id: number, reason: string) => Promise<void>;
  getPaymentsByStudent: (studentId: number) => Payment[];

  // User Management Methods
  login: (username: string, password: string, role: string) => Promise<User | null>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  createUser: (userData: any) => Promise<User | null>;
  updateUser: (id: number, userData: any) => Promise<boolean>;
  deleteUser: (id: number) => Promise<boolean>;
  updateUserStatus: (id: number, status: string) => Promise<boolean>;
  resetUserPassword: (id: number) => Promise<string>;
  getUserPermissions: (userId: number) => Promise<string[]>;
  createUserAPI: (userData: any) => Promise<User | null>;
  updateUserAPI: (id: number, userData: any) => Promise<boolean>;
  deleteUserAPI: (id: number) => Promise<boolean>;
  updateUserStatusAPI: (id: number, status: string) => Promise<boolean>;
  resetUserPasswordAPI: (id: number, newPassword?: string) => Promise<string>;
  getUserPermissionsAPI: (userId: number) => Promise<string[]>;
  checkUserPermissionAPI: (role: string, permission: string) => boolean;
  getPendingApprovals: () => any[];

  // Fee Management Methods
  addFeeStructure: (feeStructure: Omit<FeeStructure, 'id'>) => Promise<number>;
  updateFeeStructure: (id: number, feeStructure: Partial<FeeStructure>) => Promise<void>;
  deleteFeeStructure: (id: number) => Promise<void>;
  getFeeStructures: (classId: number, academicYear: string) => FeeStructure[];
  getFeeStructureByClass: (classId: number, term: string, academicYear: string) => FeeStructure | null;
  getStudentFeeBalance: (studentId: number) => StudentFeeBalance | null;
  updateStudentFeeBalance: (studentId: number, balance: Partial<StudentFeeBalance>) => Promise<void>;

  // Notification Methods
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<number>;
  markNotificationAsRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  getUnreadNotifications: () => Notification[];
  getAllNotifications: () => Notification[];

  // Activity Log Methods
  addActivityLog: (log: ActivityLog) => Promise<number>;
  getActivityLogs: (userId?: number, action?: string) => ActivityLog[];

  // Timetable Methods
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

  // Department Methods
  addDepartment: (department: Omit<Department, 'id'>) => Promise<number>;
  updateDepartment: (id: number, department: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: number) => Promise<void>;
  getDepartments: () => Department[];

  // Scholarship Methods
  addScholarship: (scholarship: Omit<Scholarship, 'id'>) => Promise<number>;
  updateScholarship: (id: number, scholarship: Partial<Scholarship>) => Promise<void>;
  deleteScholarship: (id: number) => Promise<void>;
  getScholarships: () => Scholarship[];
  getStudentScholarships: (studentId: number) => Scholarship[];

  // Assignment Methods
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  updateAssignment: (id: number, assignment: Partial<Assignment>) => void;
  deleteAssignment: (id: number) => void;

  // Data Loading Methods
  loadUsersFromAPI: () => Promise<boolean>;
  loadTeachersFromAPI: () => Promise<boolean>;
  loadParentsFromAPI: () => Promise<boolean>;
  loadParentStudentLinksFromAPI: () => Promise<boolean>;
  loadAccountantsFromAPI: () => Promise<boolean>;
  loadStudentsFromAPI: () => Promise<boolean>;
  loadClassesFromAPI: () => Promise<boolean>;
  loadSubjectsFromAPI: () => Promise<boolean>;
  loadSubjectRegistrationsFromAPI: () => Promise<boolean>;
  loadSubjectAssignmentsFromAPI: () => Promise<boolean>;
  loadAllDataFromAPI: () => Promise<void>;
  loadFeeStructuresFromAPI: () => Promise<boolean>;
  loadStudentFeeBalancesFromAPI: () => Promise<boolean>;
  loadNotificationsFromAPI: () => Promise<boolean>;
  loadAttendancesFromAPI: () => Promise<boolean>;
  loadScoresFromAPI: () => Promise<boolean>;
  loadCompiledResultsFromAPI: () => Promise<boolean>;
  loadAffectiveDomainsFromAPI: () => Promise<boolean>;
  loadPsychomotorDomainsFromAPI: () => Promise<boolean>;
  loadExamTimetablesFromAPI: () => Promise<boolean>;
  loadClassTimetablesFromAPI: () => Promise<boolean>;
  loadDepartmentsFromAPI: () => Promise<boolean>;
  loadScholarshipsFromAPI: () => Promise<boolean>;
  loadAssignmentsFromAPI: () => Promise<boolean>;
  loadClassTeacherAssignmentsFromAPI: () => Promise<boolean>;

  // Payment API Methods
  createPaymentAPI: (payment: any) => Promise<any>;
  loadPaymentsFromAPI: () => Promise<boolean>;
  createFeeStructureAPI: (feeStructure: any) => Promise<any>;
  getFeeStructuresAPI: () => Promise<any>;
  getPaymentsAPI: () => Promise<any>;
  updatePaymentStatusAPI: (paymentId: number, status: string) => Promise<any>;
  getFeeBalancesAPI: () => Promise<any>;
  createBatchPaymentsAPI: (payments: any[]) => Promise<any>;

  // Subject Registration API Methods
  registerSubjectForClassAPI: (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory?: boolean) => Promise<boolean>;
  removeSubjectRegistrationAPI: (classId: number, subjectId: number, academicYear: string, term: string) => Promise<boolean>;
  getSubjectRegistrationsAPI: (classId?: number, academicYear?: string, term?: string) => Promise<any>;
  getRegisteredSubjectsAPI: (classId: number, academicYear: string, term: string) => Promise<any>;
  getActiveAcademicYearAPI: () => Promise<string>;
  getActiveTermAPI: () => Promise<string>;

  // Subject Assignment API Methods
  getSubjectAssignmentsAPI: (academicYear: string, term: string) => Promise<any>;
  assignSubjectToTeacherAPI: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  removeSubjectAssignmentAPI: (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string) => Promise<boolean>;
  getUnassignedSubjectsAPI: (classId: number, academicYear: string, term: string) => Promise<any>;
  getAvailableTeachersAPI: (academicYear: string, term: string, subjectId: number, classId: number) => Promise<Teacher[]>;

  // Teacher API Methods
  createTeacherAPI: (teacherData: any) => Promise<any>;
  updateTeacherAPI: (id: number, teacherData: any) => Promise<boolean>;
  deleteTeacherAPI: (id: number) => Promise<boolean>;
  updateTeacherStatusAPI: (id: number, status: string) => Promise<boolean>;

  // Parent API Methods
  createParentAPI: (parentData: any) => Promise<any>;
  updateParentAPI: (id: number, parentData: any) => Promise<boolean>;
  deleteParentAPI: (id: number) => Promise<boolean>;
  updateParentStatusAPI: (id: number, status: string) => Promise<boolean>;

  // Accountant API Methods
  createAccountantAPI: (accountantData: any) => Promise<any>;
  updateAccountantAPI: (id: number, accountantData: any) => Promise<boolean>;
  deleteAccountantAPI: (id: number) => Promise<boolean>;
  updateAccountantStatusAPI: (id: number, status: string) => Promise<boolean>;

  // Affective and Psychomotor API Methods
  addAffectiveDomain: (affectiveData: any) => Promise<any>;
  createAffectiveDomain: (affectiveData: any) => Promise<any>;
  updateAffectiveDomain: (id: number, affectiveData: any) => Promise<any>;
  deleteAffectiveDomain: (id: number) => Promise<any>;
  addPsychomotorDomain: (psychomotorData: any) => Promise<any>;
  createPsychomotorDomain: (psychomotorData: any) => Promise<any>;
  updatePsychomotorDomain: (id: number, psychomotorData: any) => Promise<any>;
  deletePsychomotorDomain: (id: number) => Promise<any>;

  // Real-time Sync Methods
  refreshAllData: () => Promise<void>;
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
  const [currentTerm, setCurrentTerm] = useState('First Term');
  const [currentAcademicYear, setCurrentAcademicYear] = useState('2025/2026');
  
  // Term dates state
  const [termDates, setTermDates] = useState({
    termStartDate: '2025-09-01',
    termEndDate: '2025-12-15',
    nextTermStarts: '2026-01-10',
    schoolResumptionDate: '2025-09-01',
    midTermBreakStart: '2025-10-25',
    midTermBreakEnd: '2025-11-01'
  });
  
  // Cache for academic year and term
  const termAndYearCache = useRef<{ term: string | null, year: string | null, timestamp: number }>({ term: null, year: null, timestamp: 0 });
  
  // Ref to track last teacher ID for logging frequency control
  const lastTeacherIdRef = useRef<number | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const [scores, setScores] = useState<Score[]>([]);
  const [affectiveDomains, setAffectiveDomains] = useState<AffectiveDomain[]>([]);
  const [psychomotorDomains, setPsychomotorDomains] = useState<PsychomotorDomain[]>([]);
  const [compiledResults, setCompiledResults] = useState<CompiledResult[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFeeBalances, setStudentFeeBalances] = useState<StudentFeeBalance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceRequirements, setAttendanceRequirements] = useState<Record<string, number>>({});

  // Initialize with empty arrays - all data loaded from database
  const [users, setUsers] = useState<User[]>([]);
  const [examTimetables, setExamTimetables] = useState<ExamTimetable[]>([]);
  const [classTimetables, setClassTimetables] = useState<ClassTimetable[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [parentStudentLinksData, setParentStudentLinksData] = useState<any[]>([]);

  // ==================== API IMPLEMENTATIONS ====================

  // User API Methods
  const loadUsersFromAPI = async (): Promise<boolean> => {
    try {
      console.log('=== LOAD USERS FROM API STARTED ===');
      
      // Ensure token is available
      const hasToken = await tokenManager.ensureToken(currentUser);
      if (!hasToken) {
        console.error('Authentication required: No token found');
        return false;
      }
      
      let allUsers: any[] = [];
      let page = 1;
      let hasMore = true;
      const MAX_RETRIES = 3;
      
      while (hasMore) {
        let retries = 0;
        let success = false;
        
        while (!success && retries < MAX_RETRIES) {
          try {
            // Add a small delay between pages to prevent socket exhaustion
            if (page > 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            const response = await api.get(API_CONFIG.ENDPOINTS.USERS.LIST, { page, limit: 50 });
            
            console.log(`Users API response status for page ${page}:`, response.success ? 'Success' : 'Failed');
            
            if (response.success && response.data) {
              const data = response.data as any;
              const items = data.items || [];
              
              allUsers = allUsers.concat(items);
              console.log(`Loaded ${items.length} users from page ${page}`);
              
              // Check if there are more pages
              if (page >= data.total_pages) {
                hasMore = false;
              } else {
                page++;
              }
              success = true;
            } else {
              console.error('Users API failed:', response.error);
              hasMore = false;
              success = true; // Exit retry loop on API error
            }
          } catch (error) {
            console.warn(`Error loading users page ${page} (Attempt ${retries + 1}/${MAX_RETRIES}):`, error);
            retries++;
            if (retries >= MAX_RETRIES) {
              console.error(`Failed to load users page ${page} after ${MAX_RETRIES} attempts`);
              hasMore = false; // Stop fetching
            } else {
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
          }
        }
      }
      
      if (allUsers.length > 0) {
        setUsers(allUsers);
        console.log('Loaded total users from API:', allUsers.length, 'users');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading users:', error);
      return false;
    }
  };

  const loadActivityLogsFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const result = await sqlDatabase.executeQuery(`
        SELECT 
          id,
          actor,
          actor_role as actorRole,
          action,
          target,
          ip_address as ipAddress,
          status,
          details,
          user_id as userId,
          created_at as timestamp
        FROM activity_logs 
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      if (result && result.data) {
        setActivityLogs(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading activity logs:', error);
      return false;
    }
  };

  const loadTeachersFromAPI = async (): Promise<boolean> => {
    // Prevent excessive calls with simple rate limiting
    const now = Date.now();
    if (teachers.length > 0 && (now - lastLoadTime) < 2000) {
      return true; // Use cached data if recent
    }
    
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.get('/teachers');
      if (response && response.success) {
        const teachersData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(teachersData)) {
          console.log('Loaded all teachers from API:', teachersData.length, 'teachers');
          
          // The API already returns data with correct field names, no mapping needed
          const teachersWithComputed = teachersData.map((teacher: any) => ({
            ...teacher,
            // Keep existing fields, just add computed ones
            is_class_teacher: teacher.is_class_teacher || teacher.isClassTeacher,
            department_id: teacher.department_id || teacher.departmentId,
          }));
          
          setTeachers(teachersWithComputed);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error loading teachers from API:', error);
      return false;
    }
  };

  const loadParentsFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const response = await api.get('/parents');
      if (response && response.success) {
        const parentsData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(parentsData)) {
          console.log('Loaded all parents from API:', parentsData.length, 'parents');
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
      }
      return false;
    } catch (error) {
      console.warn('Error loading parents from API:', error);
      return false;
    }
  };

  const loadParentStudentLinksFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      // Load from API to get actual database data
      const response = await api.get('/parent-student-links');
      if (response && response.success) {
        const linksData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(linksData)) {
          setParentStudentLinksData(linksData);
          console.log(`Loaded ${linksData.length} parent-student links from API`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading parent student links from API:', error);
      return false;
    }
  };

  const loadAccountantsFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const result = await sqlDatabase.executeQuery('SELECT * FROM accountants ORDER BY created_at DESC');
      if (result && result.data) {
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
      }
      return false;
    } catch (error) {
      console.error('Error loading accountants:', error);
      return false;
    }
  };

  const loadStudentsFromAPI = async (): Promise<boolean> => {
    try {
      const response = await api.get('/students');
      if (response && response.success) {
        const studentsData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(studentsData)) {
          console.log('Loaded all students from API:', studentsData.length, 'students');
          
          // Transform snake_case to camelCase and handle both field name formats
          const studentsWithComputed = studentsData.map((student: any) => ({
            ...student,
            // Map database fields to frontend interface (handle both snake_case and camelCase)
            firstName: student.firstName || student.first_name || 'Unknown',
            lastName: student.lastName || student.last_name || 'Student',
            className: student.className || student.class_name,
            classCategory: student.classCategory || student.class_category,
            parentName: student.parentName || student.parent_name,
            parent_id: student.parent_id || student.parentId,
            class_id: student.class_id || student.classId,
            class_teacher_id: student.class_teacher_id || student.classTeacherId,
            admission_number: student.admission_number || student.admissionNumber,
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
          
          setStudents(studentsWithComputed);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error loading students from API:', error);
      return false;
    }
  };

  const loadClassesFromAPI = async (force: boolean = false): Promise<boolean> => {
    // Prevent excessive calls with simple rate limiting - but always load if empty
    const now = Date.now();
    if (!force && classes.length > 0 && (now - lastLoadTime) < 2000) {
      console.log('Using cached classes data');
      return true; // Use cached data if recent
    }
    
    try {
      console.log('Loading classes from API...', force ? '(Forced)' : '');
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const response = await api.get(API_CONFIG.ENDPOINTS.CLASSES.LIST);
      if (response && response.success) {
        // Handle paginated response structure
        const classesData = (response.data as any)?.items || response.data || [];
        console.log('Loaded classes from API:', classesData.length, 'classes');
        
        // Transform snake_case to camelCase and ensure classTeacherId is properly mapped
        const classesWithComputed = classesData.map((classItem: any) => ({
          ...classItem,
          id: Number(classItem.id),
          // Map database fields to frontend interface
          classTeacherId: classItem.class_teacher_id ? Number(classItem.class_teacher_id) : null,
          classTeacher: classItem.class_teacher,
          currentStudents: classItem.current_students || classItem.currentStudents,
          academicYear: classItem.academic_year || classItem.academicYear,
          createdAt: classItem.created_at || classItem.createdAt,
          updatedAt: classItem.updated_at || classItem.updatedAt,
        }));
        
        console.log('Classes with mapped fields:', classesWithComputed.map((c: any) => ({
          id: c.id,
          name: c.name,
          classTeacherId: c.classTeacherId,
          class_teacher_id: c.class_teacher_id
        })));
        
        setClasses(classesWithComputed);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error loading classes from database:', error);
      return false;
    }
  };

  const loadSubjectsFromAPI = async (force: boolean = false): Promise<boolean> => {
    try {
      console.log('Loading subjects from API...', force ? '(Forced)' : '');
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const response = await api.get(API_CONFIG.ENDPOINTS.SUBJECTS.LIST);
      
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
      console.warn('Error loading subjects from API:', error);
      return false;
    }
  };

  const loadSubjectRegistrationsFromAPI = async (): Promise<boolean> => {
    try {
      console.log('Loading subject registrations from sqlDatabase...');
      const result = await sqlDatabase.executeQuery('SELECT * FROM subject_registrations WHERE status = "Active" ORDER BY created_at DESC');
      if (result && result.data) {
        const registrationsData = result.data;
        console.log('Loaded subject registrations from database:', registrationsData.length, 'registrations');
        
        // Don't filter here - let components handle term/year filtering as needed
        // This ensures all registrations are available for display
        console.log('Setting all subject registrations (no term/year filtering at context level)');
        setSubjectRegistrations(registrationsData);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error loading subject registrations from database:', error);
      return false;
    }
  };

  const loadSubjectAssignmentsFromAPI = async (): Promise<boolean> => {
    // Prevent excessive calls with simple rate limiting
    const now = Date.now();
    if (subjectAssignments.length > 0 && (now - lastLoadTime) < 2000) {
      return true; // Use cached data if recent
    }
    
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.get('/subjects/assignments');
      if (response && response.success) {
        const assignmentsData = (response.data as any)?.items || response.data || [];
        if (Array.isArray(assignmentsData)) {
          console.log('Loaded subject assignments from API:', assignmentsData.length, 'assignments');
          
          // Filter assignments - show active assignments, filter by term/year only if they are set
          const filteredAssignments = assignmentsData.filter(assignment => 
            assignment.status === 'Active' &&
            (!currentTerm || assignment.term === currentTerm) &&
            (!currentAcademicYear || assignment.academic_year === currentAcademicYear)
          );
          
          console.log(`Filtered to current term (${currentTerm}) and academic year (${currentAcademicYear}):`, filteredAssignments.length, 'assignments');
          setSubjectAssignments(filteredAssignments);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error loading subject assignments from API:', error);
      return false;
    }
  };

  const loadClassTeacherAssignmentsFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      const hasToken = await tokenManager.ensureToken(currentUser);
      if (!hasToken) {
        console.error('Authentication required: No token found');
        return false;
      }

      const response = await api.get(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BY_TERM(currentAcademicYear, currentTerm));
      
      if (response && response.success) {
        const assignmentsData = (response.data as any[]) || [];
        console.log('Loaded class teacher assignments from API:', assignmentsData.length, 'assignments');
        
        // Set class teacher assignments state
        setClassTeacherAssignments(assignmentsData);
        
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
      console.warn('Error loading class teacher assignments from API:', error);
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
      console.error('Error creating student:', error);
      return null;
    }
  };

  const updateStudentAPI = async (id: number, studentData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.put<any>(`/students/${id}`, studentData);
      if (response.success) {
        await loadStudentsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating student:', error);
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
      console.error('Error deleting student:', error);
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
      console.error('Error creating teacher:', error);
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
      console.error('Error updating teacher:', error);
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
      console.error('Error deleting teacher:', error);
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
      console.error('Error creating parent:', error);
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
      console.error('Error updating parent:', error);
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
      console.error('Error deleting parent:', error);
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
      console.error('Error creating accountant:', error);
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
      console.error('Error updating accountant:', error);
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
      console.error('Error deleting accountant:', error);
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

      console.log('=== CREATE CLASS DEBUG ===');
      console.log('Class data being sent:', apiPayload);
      console.log('API endpoint:', API_CONFIG.ENDPOINTS.CLASSES.CREATE);

      const response = await api.post(API_CONFIG.ENDPOINTS.CLASSES.CREATE, apiPayload);
      console.log('Create class response:', response);
      
      if (response && response.success) {
        await loadClassesFromAPI(true);
        const responseData = response.data as any;
        return responseData && responseData.id ? responseData.id : 0;
      }
      return 0;
    } catch (error) {
      console.error('Error creating class:', error);
      return 0;
    }
  };

  const updateClassAPI = async (id: number, classData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      console.log('=== UPDATE CLASS DEBUG ===');
      console.log('Updating class ID:', id);
      console.log('Class data being sent:', classData);

      // Map to snake_case for API
      const apiPayload = {
        ...classData,
        academic_year: classData.academicYear,
        class_teacher_id: classData.classTeacherId,
      };

      const response = await api.put(API_CONFIG.ENDPOINTS.CLASSES.UPDATE(id), apiPayload);
      console.log('Update response:', response);
      
      if (response && response.success) {
        await loadClassesFromAPI(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating class:', error);
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
      console.error('Error deleting class:', error);
      return false;
    }
  };

  // Subject API Methods
  const createSubjectAPI = async (subjectData: any): Promise<number> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      console.log('=== CREATE SUBJECT DEBUG ===');
      console.log('Subject data being sent:', subjectData);
      console.log('API endpoint:', API_CONFIG.ENDPOINTS.SUBJECTS.CREATE);
      console.log('Current user:', currentUser);

      const response = await api.post(API_CONFIG.ENDPOINTS.SUBJECTS.CREATE, subjectData);
      console.log('Create subject response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data:', response?.data);
      
      if (response && response.success) {
        console.log('Subject created successfully, reloading subjects...');
        await loadSubjectsFromAPI(true);
        console.log('Subjects reloaded');
        // Return the new subject ID from the response data
        const newId = (response.data as any)?.id || -1;
        console.log('New subject ID:', newId);
        return newId;
      }
      console.log('Subject creation failed - response not successful');
      return -1;
    } catch (error) {
      console.error('Error creating subject:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('409') || error.message.includes('Conflict') || error.message.includes('already exists')) {
          // This is a duplicate error, re-throw with specific message
          throw new Error('Subject with this code already exists');
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
          throw new Error('Invalid subject data provided');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('You are not authorized to create subjects');
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          throw new Error('You do not have permission to create subjects');
        }
      }
      
      // Re-throw the original error for better handling
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
      console.error('Error updating subject:', error);
      return false;
    }
  };

  const deleteSubjectAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await api.delete(API_CONFIG.ENDPOINTS.SUBJECTS.DELETE(id));
      if (response && response.success) {
        await loadSubjectsFromAPI();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  };

  // Subject Registration API Methods
  const registerSubjectForClassAPI = async (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory: boolean = true): Promise<boolean> => {
    try {
      const result = await sqlDatabase.registerSubjectForClass(subjectId, classId, academicYear, term, isCompulsory);
      if (result && result.id) {
        await loadSubjectsFromAPI(); // This will also refresh subject registrations
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error registering subject for class:', error);
      return false;
    }
  };

  const removeSubjectRegistrationAPI = async (classId: number, subjectId: number, academicYear: string, term: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.removeSubjectRegistration(subjectId, classId, academicYear, term);
      if (result) {
        await loadSubjectsFromAPI(); // This will also refresh subject registrations
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing subject registration:', error);
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
      return result?.data || [];
    } catch (error) {
      console.error('Error getting subject registrations:', error);
      return [];
    }
  };

  // Rate limiting and loading state management
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const LOAD_COOLDOWN = 5000; // 5 seconds between loads

  // Load data from API when user is logged in
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const now = Date.now();
    
    // Prevent excessive API calls with cooldown
    if (isLoadingData || (now - lastLoadTime) < LOAD_COOLDOWN) {
      return;
    }

    // Check if token is actually available before loading data
    const currentToken = getAuthToken();
    if (!currentToken) {
      console.log('No token available, skipping data load');
      return;
    }

    // Heavy data loading is now handled in the login() function based on user role
    const loadData = async () => {
      setIsLoadingData(true);
      setLastLoadTime(now);
      
      try {
        console.log('=== BATCH DATA LOAD SKIPPED - handled by login role-based loader ===');
      } catch (error) {
        console.warn('Some API calls failed during batch load:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [currentUser]); // Remove isLoadingData and lastLoadTime to prevent infinite loop

  // Load initial data on app start (for login page and general use) - OPTIMIZED
  useEffect(() => {
    // Prevent multiple initial loads
    if (isLoadingData) return;
    
    const loadInitialData = async () => {
      setIsLoadingData(true);
      
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
            console.log('🔄 Restoring authentication from storage');
            setAuthToken(token);
            setCurrentUser(savedUser);
            setIsLoading(false);
            
            // Load data for restored user
            await loadDataForUser(savedUser);
          } else {
            console.log('No existing authentication found');
            setIsLoading(false);
          }
        } else {
          console.log('On landing page - skipping authentication restoration');
          setIsLoading(false);
        }
        
        console.log('Initial load complete');
        
      } catch (error) {
        console.warn('Initial data loading failed:', error);
        setIsLoading(false);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Auto-save disabled - using API only

  // ==================== API FUNCTIONS ====================

  // Helper to load data for a user
  const loadDataForUser = async (user: User) => {
    console.log('Loading data for user:', user.username, user.role);
    
    // Load essential data first with retry logic
    const loadWithRetry = async (loadFn: () => Promise<any>, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Loading data (attempt ${i + 1}/${retries})...`);
          const result = await loadFn();
          console.log('Data loaded successfully');
          return result;
        } catch (error) {
          console.warn(`Load attempt ${i + 1} failed:`, error);
          if (i < retries - 1) {
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          } else {
            console.error('All retry attempts failed');
            throw error;
          }
        }
      }
    };

    try {
      // Ensure term/year are loaded first
      await loadWithRetry(loadCurrentTermAndYear);
      await loadWithRetry(loadTermDates);

      // Load core data in parallel with error isolation
      const coreLoads = [
        loadWithRetry(() => loadStudentsFromAPI()).catch(e => { console.error('Students load failed:', e); return null; }),
        loadWithRetry(() => loadClassesFromAPI()).catch(e => { console.error('Classes load failed:', e); return null; }),
        loadWithRetry(() => loadSubjectsFromAPI()).catch(e => { console.error('Subjects load failed:', e); return null; }),
      ];

      // Wait for core data to complete
      await Promise.allSettled(coreLoads);

      // Load role-specific data
      let roleSpecificLoads: Promise<any>[] = [];

      if (user.role === 'admin') {
        roleSpecificLoads = [
          loadWithRetry(() => loadTeachersFromAPI()).catch(e => { console.error('Teachers load failed:', e); return null; }),
          loadWithRetry(() => loadSubjectAssignmentsFromAPI()).catch(e => { console.error('Subject assignments load failed:', e); return null; }),
          loadWithRetry(() => loadScoresFromAPI()).catch(e => { console.error('Scores load failed:', e); return null; }),
          loadWithRetry(() => loadAffectiveDomainsFromAPI()).catch(e => { console.error('Affective domains load failed:', e); return null; }),
          loadWithRetry(() => loadPsychomotorDomainsFromAPI()).catch(e => { console.error('Psychomotor domains load failed:', e); return null; }),
          loadWithRetry(() => loadParentStudentLinksFromAPI()).catch(e => { console.error('Parent links load failed:', e); return null; }),
        ];
      } else if (user.role === 'teacher') {
        roleSpecificLoads = [
          loadWithRetry(() => loadTeachersFromAPI()).catch(e => { console.error('Teachers load failed:', e); return null; }),
          loadWithRetry(() => loadSubjectAssignmentsFromAPI()).catch(e => { console.error('Subject assignments load failed:', e); return null; }),
          loadWithRetry(() => loadClassTeacherAssignmentsFromAPI()).catch(e => { console.error('Class teacher assignments load failed:', e); return null; }),
          loadWithRetry(() => loadScoresFromAPI()).catch(e => { console.error('Scores load failed:', e); return null; }),
          loadWithRetry(() => loadAffectiveDomainsFromAPI()).catch(e => { console.error('Affective domains load failed:', e); return null; }),
          loadWithRetry(() => loadPsychomotorDomainsFromAPI()).catch(e => { console.error('Psychomotor domains load failed:', e); return null; }),
        ];
      } else if (user.role === 'accountant') {
        roleSpecificLoads = [
          loadWithRetry(() => loadPaymentsFromAPI()).catch(e => { console.error('Payments load failed:', e); return null; }),
          loadWithRetry(() => loadFeeStructuresFromAPI()).catch(e => { console.error('Fee structures load failed:', e); return null; }),
          loadWithRetry(() => loadStudentFeeBalancesFromAPI()).catch(e => { console.error('Fee balances load failed:', e); return null; }),
        ];
      } else if (user.role === 'parent') {
        roleSpecificLoads = [
          loadWithRetry(() => loadParentStudentLinksFromAPI()).catch(e => { console.error('Parent links load failed:', e); return null; }),
          loadWithRetry(() => loadFeeStructuresFromAPI()).catch(e => { console.error('Fee structures load failed:', e); return null; }),
        ];
      }

      await Promise.allSettled(roleSpecificLoads);
      return true;
    } catch (error) {
      console.error('Error loading data for user:', error);
      return false;
    }
  };

  const login = async (username: string, password: string, role: string): Promise<User | null> => {
    try {
      console.log('Login attempt:', { username, role });
      
      // Clear any existing tokens first to prevent conflicts
      removeAuthToken();
      
      const user = await sqlDatabase.authenticateUser(username, password, role);
      
      if (user) {
        setCurrentUser(user);
        setApiCurrentUser(user);
        
        // Extract token from API response structure
        const token = user.token || '';
        
        setAuthToken(token);
        
        // Verify token was stored
        const storedToken = tokenManager.getToken();
        
        // Small delay to ensure token is stored before API calls
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload all data after successful login using the helper function
        console.log('Login successful, loading data for user...');
        
        const dataLoaded = await loadDataForUser(user);
        
        if (!dataLoaded) {
          console.warn('Some data failed to load, but login will proceed');
        }
        setIsLoading(false);
        // Reduced toast - only show for first login of the session
        if (!sessionStorage.getItem('loginToastShown')) {
          toast.success(`Welcome back, ${user.first_name || user.username}!`);
          sessionStorage.setItem('loginToastShown', 'true');
        }
        return user;
      }
      
      return null;
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      setIsLoading(false);
      return null;
    }
  };

  // Helper function to calculate grade
  const calculateGrade = (total: number): string => {
    if (total >= 80) return 'A';
    if (total >= 70) return 'B';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    if (total >= 40) return 'E';
    return 'F';
  };

  // Helper function to get remark
  const getRemark = (grade: string): string => {
    const remarks: { [key: string]: string } = {
      A: 'Excellent',
      B: 'Very Good',
      C: 'Good',
      D: 'Fair',
      E: 'Pass',
      F: 'Fail',
    };
    return remarks[grade] || 'N/A';
  };

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
    } else {
      // If API update failed, revert local state
      await loadStudentsFromAPI();
    }
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
      employeeId = `GRA-TCH-${year}-${String(teacherCount).padStart(3, '0')}`;
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
      console.warn('Current term or academic year not set, returning all assignments for teacher', teacherId);
      return (subjectAssignments || []).filter(a => Number(a.teacher_id) === teacherId);
    }
    
    return (subjectAssignments || []).filter(a => 
      Number(a.teacher_id) === teacherId && 
      a.term === currentTerm && 
      a.academic_year === currentAcademicYear
    );
  }, [subjectAssignments, currentTerm, currentAcademicYear]);

  // Get teacher's classes with subjects and student counts
  const getTeacherClasses = useCallback((teacherId: number): any[] => {
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
    
    // Group subject assignments by class
    const classGroups = assignments.reduce((groups: any, assignment: any) => {
      const classId = assignment.class_id;
      if (!groups[classId]) {
        groups[classId] = {
          classId,
          className: classes.find(c => c.id === classId)?.name || 'Unknown',
          classLevel: classes.find(c => c.id === classId)?.level || 'Unknown',
          subjects: []
        };
      }
      
      groups[classId].subjects.push({
        subjectId: assignment.subject_id,
        subjectName: assignment.subject_name || subjects.find(s => s.id === assignment.subject_id)?.name || 'Unknown',
        subjectCode: subjects.find(s => s.id === assignment.subject_id)?.code || 'Unknown',
        assignmentId: assignment.id
      });
      
      return groups;
    }, {});
    
    // Add class teacher classes (even if no subject assignments)
    classTeacherClasses.forEach((classTeacherClass: any) => {
      if (!classGroups[classTeacherClass.id]) {
        classGroups[classTeacherClass.id] = {
          classId: classTeacherClass.id,
          className: classTeacherClass.name || 'Unknown',
          classLevel: classTeacherClass.level || 'Unknown',
          subjects: []
        };
      }
    });
    
    // Convert to array and add student counts
    return Object.values(classGroups).map((classGroup: any) => ({
      ...classGroup,
      studentCount: students.filter(s => s.class_id === classGroup.classId).length
    }));
  }, [classes, classTeacherAssignments, currentAcademicYear, currentTerm, subjectAssignments, subjects, students]);

// Get teacher's students for a specific class - UPDATED VERSION
  const getTeacherResponsibilities_NEW = useCallback((teacherId: number): any => {
    // Use ref to track the last teacherId for logging frequency control
    const shouldLog = lastTeacherIdRef.current !== teacherId;
    lastTeacherIdRef.current = teacherId;
    
    if (shouldLog) {
      console.log(`🚀 GET TEACHER RESPONSIBILITIES: teacherId=${teacherId}`);
    }
    
    try {
      // Ensure classes are loaded before proceeding
      if (!classes || classes.length === 0) {
        if (shouldLog) {
          console.log('🔄 Classes not loaded yet, using class_teacher_assignments as fallback');
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
          console.log(`🔄 FALLBACK RESULT: isClassTeacher=${isClassTeacher}, classCount=${classTeacherClassesCount}`);
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
          console.log(`✅ CLASS TEACHER MATCH: Teacher ${teacherId} assigned to class ${c.id} (${c.name})`);
        }
        
        return isMatch;
      });
      
      // FORCE FIX: If teacher is TALI (39) and has Class 13 assignment, force recognition
      let forcedClassTeacherClasses = classTeacherClasses;
      if (String(teacherId) === '39' && classTeacherAssignments.some((cta: any) => 
        String(cta.teacher_id) === '39' && String(cta.class_id) === '13' && 
        cta.academic_year === currentAcademicYear && cta.term === currentTerm
      )) {
        if (shouldLog) {
          console.log('🔧 FORCE FIX: Applied for Teacher TALI (39) - Class 13 assignment found');
        }
        forcedClassTeacherClasses = classes.filter((c: any) => String(c.id) === '13');
        if (forcedClassTeacherClasses.length > 0 && shouldLog) {
          console.log('✅ FORCE FIX SUCCESS: Teacher 39 now recognized as class teacher for Class 13');
        }
      }
      
            
      // Get unique classes from subject assignments
      const assignedClassIds = [...new Set(assignments.map(a => a.class_id))];
      const assignedClasses = classes.filter(c => assignedClassIds.includes(c.id));
      
      // Combine all classes (both subject assignments and class teacher assignments)
      const allTeacherClasses = [...new Set([...assignedClasses, ...forcedClassTeacherClasses])];
      
      // Count total students across all classes
      const totalStudentsCount = allTeacherClasses.reduce((total, cls) => {
        return total + students.filter(s => s.class_id === cls.id).length;
      }, 0);
      
      // Check if teacher is marked as class teacher in teachers table
      const teacherRecord = teachers.find(t => String(t.id) === String(teacherId));
      const isClassTeacher = teacherRecord?.is_class_teacher === true || forcedClassTeacherClasses.length > 0;
      
      return {
        isClassTeacher,
        assignedClassesCount: allTeacherClasses.length,
        totalStudentsCount,
        subjectsCount: assignments.length,
        classTeacherClassesCount: forcedClassTeacherClasses.length,
        canEnterScores: assignments.length > 0,
        canCompileResults: isClassTeacher,
        canViewResults: true,
        canManageAttendance: allTeacherClasses.length > 0,
        departments: teacherRecord?.department_id ? [teacherRecord.department_id] : []
      };
    } catch (error) {
      console.error('Error getting teacher responsibilities:', error);
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

  // Get teacher's students for a specific class
  const getTeacherStudentsForClass = (classId: number): any[] => {
    return students.filter(s => s.class_id === classId);
  };

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

  const updateAccountantStatus = async (id: number, status: string): Promise<void> => {
    await updateAccountantAPI(id, { status });
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
    
    const newId = await createClassAPI(newClass);
    if (newId > 0) {
      await loadClassesFromAPI();
    }
    return newId;
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
    }
    return success;
  };

  const deleteClass = async (id: number): Promise<boolean> => {
    const success = await deleteClassAPI(id);
    if (success) {
      await loadClassesFromAPI();
    }
    return success;
  };

  const updateSubject = async (id: number, subject: Partial<Subject>) => {
    const success = await updateSubjectAPI(id, subject);
    if (success) {
      await loadSubjectsFromAPI(true);
    }
  };

  const addSubject = async (subject: Omit<Subject, 'id'>): Promise<number> => {
    const newId = await createSubjectAPI(subject);
    if (newId > 0) {
      await loadSubjectsFromAPI(true);
    }
    return newId; // Return the ID from API response (or -1 if failed)
  };

  const deleteSubject = async (id: number) => {
    const success = await deleteSubjectAPI(id);
    if (success) {
      await loadSubjectsFromAPI(true);
    }
  };

  const getPendingApprovals = () => {
    return compiledResults.filter(result => 
      result.status === 'Submitted' && 
      result.term === currentTerm && 
      result.academic_year === currentAcademicYear
    );
  };

  // System Settings Methods
  const loadCurrentTermAndYear = async () => {
    try {
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // Check cache validity
      if (termAndYearCache.current.timestamp > 0 && (now - termAndYearCache.current.timestamp < CACHE_DURATION)) {
        console.log('Using cached term and year');
        if (termAndYearCache.current.term) setCurrentTerm(termAndYearCache.current.term);
        if (termAndYearCache.current.year) setCurrentAcademicYear(termAndYearCache.current.year);
        return;
      }

      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      const termResult = await sqlDatabase.executeQuery(
        "SELECT setting_value FROM school_settings WHERE setting_key = 'current_term'"
      );
      const yearResult = await sqlDatabase.executeQuery(
        "SELECT setting_value FROM school_settings WHERE setting_key = 'current_academic_year'"
      );
      
      // Extract data from result objects
      const termData = termResult?.data || termResult;
      const yearData = yearResult?.data || yearResult;
      
      let newTerm = null;
      let newYear = null;

      if (termData && termData.length > 0) {
        newTerm = termData[0].setting_value;
        setCurrentTerm(newTerm);
      }
      if (yearData && yearData.length > 0) {
        newYear = yearData[0].setting_value;
        setCurrentAcademicYear(newYear);
      }
      
      // Update cache
      termAndYearCache.current = {
        term: newTerm,
        year: newYear,
        timestamp: now
      };
      
    } catch (error) {
      console.error('Error loading current term and year:', error);
    }
  };

  const loadSchoolSettings = async () => {
    try {
      const result = await sqlDatabase.executeQuery(
        "SELECT setting_key, setting_value FROM school_settings"
      );
      
      const newSettings: Partial<SchoolSettings> = {};
      // Extract the data array from the result object
      const settings = result?.data || result;
      
      if (Array.isArray(settings)) {
        settings.forEach((setting: any) => {
          newSettings[setting.setting_key as keyof SchoolSettings] = setting.setting_value;
        });
      } else {
        console.warn('School settings query did not return an array:', typeof settings, settings);
      }
      
      setSchoolSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error loading school settings:', error);
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
        "SELECT DISTINCT academic_year FROM compiled_results ORDER BY academic_year DESC"
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
      console.error('Error getting academic years:', error);
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
      console.error('Error getting compiled results by year and term:', error);
      return [];
    }
  };

  const updateCurrentTerm = async (term: string) => {
    setCurrentTerm(term);
    // Update database using INSERT ON DUPLICATE KEY UPDATE
    try {
      await sqlDatabase.executeQuery(
        "INSERT INTO school_settings (setting_key, setting_value) VALUES ('current_term', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [term, term]
      );
      
      // Invalidate cache
      termAndYearCache.current = {
        term: null,
        year: null,
        timestamp: 0
      };
      
      // Force refresh of data that depends on term/year
      await loadCompiledResultsFromAPI();
      await loadScoresFromAPI();
      await loadAttendancesFromAPI();
      await loadAffectiveDomainsFromAPI();
      await loadPsychomotorDomainsFromAPI();
      
    } catch (error) {
      console.error('Error updating current term in database:', error);
    }
  };

  const updateAttendanceRequirements = async (requirements: Record<string, number>) => {
    console.log('Updating attendance requirements:', requirements);
    setAttendanceRequirements(requirements);
    // Save to database
    try {
      // Save each term's requirement
      for (const [term, days] of Object.entries(requirements)) {
        const settingKey = `attendance_${term.toLowerCase().replace(' ', '_')}`;
        console.log(`Saving ${settingKey}: ${days} days`);
        await sqlDatabase.executeQuery(`
          INSERT INTO school_settings (setting_key, setting_value, updated_date) 
          VALUES (?, ?, NOW())
          ON DUPLICATE KEY UPDATE setting_value = ?, updated_date = NOW()
        `, [settingKey, days.toString(), days.toString()]);
      }
      
      console.log('Attendance requirements saved successfully');
      
      // Force refresh of compiled results to update attendance calculations
      await loadCompiledResultsFromAPI();
      
      // Also refresh attendance data to ensure consistency
      await loadAttendancesFromAPI();
      
    } catch (error) {
      console.error('Error updating attendance requirements in database:', error);
    }
  };

  const getAttendanceRequirements = () => {
    return attendanceRequirements;
  };

  const loadAttendanceRequirements = async () => {
    try {
      // Test database connection first
      const testQuery = await sqlDatabase.executeQuery("SELECT 1 as test");
      
      const terms = ['first_term', 'second_term', 'third_term'];
      const requirements: Record<string, number> = {};
      
      for (const term of terms) {
        const settingKey = `attendance_${term}`;
        
        try {
          const result = await sqlDatabase.executeQuery(
            "SELECT setting_value FROM school_settings WHERE setting_key = ?",
            [settingKey]
          );
          
          // Handle database response format - check for data array
          const data = result?.data || result;
          
          if (data && data.length > 0) {
            const termName = term.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            requirements[termName] = parseInt(data[0].setting_value) || 0;
          }
        } catch (queryError) {
          console.error(`Error querying ${settingKey}:`, queryError);
        }
      }
      
      setAttendanceRequirements(requirements);
      return requirements;
    } catch (error: any) {
      console.error('Error loading attendance requirements:', error);
      return {};
    }
  };

  const updateCurrentAcademicYear = async (year: string) => {
    setCurrentAcademicYear(year);
    // Update database using INSERT ON DUPLICATE KEY UPDATE
    try {
      await sqlDatabase.executeQuery(
        "INSERT INTO school_settings (setting_key, setting_value) VALUES ('current_academic_year', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [year, year]
      );
      
      // Invalidate cache
      termAndYearCache.current = {
        term: null,
        year: null,
        timestamp: 0
      };
      
      // Force refresh of data that depends on term/year
      await loadCompiledResultsFromAPI();
      await loadScoresFromAPI();
      await loadAttendancesFromAPI();
      await loadAffectiveDomainsFromAPI();
      await loadPsychomotorDomainsFromAPI();
      
    } catch (error) {
      console.error('Error updating academic year in database:', error);
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
    setTermDates(dates);
    // Save to database
    try {
      const dateSettings = [
        { key: 'term_start_date', value: dates.termStartDate },
        { key: 'term_end_date', value: dates.termEndDate },
        { key: 'next_term_starts', value: dates.nextTermStarts },
        { key: 'school_resumption_date', value: dates.schoolResumptionDate },
        { key: 'mid_term_break_start', value: dates.midTermBreakStart },
        { key: 'mid_term_break_end', value: dates.midTermBreakEnd }
      ];

      for (const setting of dateSettings) {
        await sqlDatabase.executeQuery(`
          INSERT INTO school_settings (setting_key, setting_value, updated_date) 
          VALUES (?, ?, NOW())
          ON DUPLICATE KEY UPDATE setting_value = ?, updated_date = NOW()
        `, [setting.key, setting.value, setting.value]);
      }
      
      console.log('Term dates saved successfully');
    } catch (error) {
      console.error('Error updating term dates in database:', error);
    }
  };

  const getTermDates = () => {
    return termDates;
  };

  const loadTermDates = async () => {
    try {
      const dateKeys = [
        'term_start_date',
        'term_end_date', 
        'next_term_starts',
        'school_resumption_date',
        'mid_term_break_start',
        'mid_term_break_end'
      ];

      const loadedDates: any = {};
      
      for (const key of dateKeys) {
        const result = await sqlDatabase.executeQuery(
          "SELECT setting_value FROM school_settings WHERE setting_key = ?",
          [key]
        );
        
        const data = result?.data || result;
        
        if (data && data.length > 0) {
          const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
          loadedDates[camelCaseKey] = data[0].setting_value;
        }
      }

      // Update state with loaded dates, keeping defaults for missing ones
      setTermDates(prev => ({
        termStartDate: loadedDates.termStartDate || prev.termStartDate,
        termEndDate: loadedDates.termEndDate || prev.termEndDate,
        nextTermStarts: loadedDates.nextTermStarts || prev.nextTermStarts,
        schoolResumptionDate: loadedDates.schoolResumptionDate || prev.schoolResumptionDate,
        midTermBreakStart: loadedDates.midTermBreakStart || prev.midTermBreakStart,
        midTermBreakEnd: loadedDates.midTermBreakEnd || prev.midTermBreakEnd
      }));

      console.log('Term dates loaded successfully');
    } catch (error) {
      console.error('Error loading term dates:', error);
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
      console.error('Error updating school settings in database:', error);
    }
  };

  // Bank Account Settings Methods
  const updateBankAccountSettings = (settings: Omit<BankAccountSettings, 'id' | 'updated_date'>) => {
    const newSettings: BankAccountSettings = {
      ...settings,
      id: 1,
      updated_date: new Date().toISOString(),
    };
    setBankAccountSettings(newSettings);
    
    if (currentUser) {
      // Convert role from lowercase to capitalized format for ActivityLog
      const getCapitalizedRole = (role: string): 'Admin' | 'Teacher' | 'Accountant' | 'Parent' | 'System' => {
        const roleMap: { [key: string]: 'Admin' | 'Teacher' | 'Accountant' | 'Parent' | 'System' } = {
          'admin': 'Admin',
          'teacher': 'Teacher',
          'accountant': 'Accountant',
          'parent': 'Parent'
        };
        return roleMap[role] || 'System';
      };
      
      addActivityLog({
        id: 0, // Will be generated by database
        actor: currentUser.username,
        actor_role: getCapitalizedRole(currentUser.role),
        action: 'update_bank_account',
        target: settings.bank_name,
        ip_address: '127.0.0.1',
        status: 'Success',
        timestamp: new Date().toISOString(),
        details: `Updated bank account to ${settings.account_number}`,
      });
    }
  };

  const getBankAccountSettings = () => {
    return bankAccountSettings;
  };

  // Activity Log Methods
  const addActivityLog = async (log: ActivityLog): Promise<number> => {
    try {
      // Create a copy without id and timestamp for database insertion
      const { id, timestamp, ...logData } = log;
      
      // Save to database first
      const result = await sqlDatabase.insertRecord('activity_logs', logData);

      if (result && result.insertId) {
        // Reload activity logs from database to get the latest
        await loadActivityLogsFromAPI();
        return result.insertId;
      }
      return 0;
    } catch (error) {
      console.error('Error adding activity log:', error);
      // Fallback to memory-only storage
      const newId = activityLogs.length > 0 ? Math.max(...activityLogs.map((l: ActivityLog) => l.id)) + 1 : 1;
      const newLog: ActivityLog = {
        ...log,
        id: newId,
        timestamp: new Date().toISOString(),
      };
      setActivityLogs([newLog, ...activityLogs]);
      return newId;
    }
  };

  const getActivityLogs = (userId?: number, action?: string): ActivityLog[] => {
    let filtered = activityLogs;
    
    // If current user is a teacher, filter logs to show only their assigned responsibilities
    if (currentUser?.role === 'teacher' && currentUser.linked_id) {
      const currentTeacher = teachers.find(t => t.id === currentUser.linked_id);
      if (currentTeacher) {
        const teacherAssignments = getTeacherAssignments(Number(currentTeacher.id));
        const assignedClassIds = teacherAssignments.map(a => a.class_id);
        
        // Filter logs related to teacher's assigned classes and students
        filtered = filtered.filter((log: ActivityLog) => {
          // Show logs where the teacher is the actor
          if (log.actor === currentUser.username) return true;
          
          // Show logs related to students in teacher's assigned classes
          const targetStudentId = log.user_id;
          if (targetStudentId) {
            const targetStudent = students.find(s => s.id === targetStudentId);
            if (targetStudent && assignedClassIds.includes(targetStudent.class_id)) {
              return true;
            }
          }
          
          // Show logs related to teacher's assigned classes
          if (log.target && log.target.includes('Class')) {
            return true; // Class-related logs are relevant
          }
          
          return false;
        });
      }
    } else if (userId) {
      // For other roles, filter by specific user if requested
      filtered = filtered.filter((log: ActivityLog) => log.actor === currentUser?.username);
    }
    
    if (action && action !== 'all') {
      filtered = filtered.filter((log: ActivityLog) => log.action === action);
    }
    
    return filtered;
  };

  const createUserAPI = async (userData: any): Promise<User | null> => {
    try {
      console.log('SchoolContext: Creating user with data:', userData);
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      // Call the PHP API endpoint instead of SQL database
      const response = await fetch(`${API_CONFIG.BASE_URL}/user/create.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      console.log('SchoolContext: PHP API response:', result);
      
      if (result.success && result.data) {
        console.log('SchoolContext: User created successfully, loading users from API');
        await loadUsersFromAPI();
        console.log('SchoolContext: Users loaded, returning user:', result.data);
        return result.data;
      } else {
        console.error('SchoolContext: User creation failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('SchoolContext: Error creating user:', error);
      return null;
    }
  };

  const updateUserAPI = async (id: number, userData: any): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await fetch(`${API_CONFIG.BASE_URL}/user/update.php?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadUsersFromAPI();
        return true;
      } else {
        console.error('Update user failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const deleteUserAPI = async (id: number): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await fetch(`${API_CONFIG.BASE_URL}/user/delete.php?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadUsersFromAPI();
        return true;
      } else {
        console.error('Delete user failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  };

  const updateUserStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);

      const response = await fetch(`${API_CONFIG.BASE_URL}/user/update.php?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify({ status })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadUsersFromAPI();
        return true;
      } else {
        console.error('Update user status failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating user status:', error);
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
      console.error('Error resetting user password:', error);
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
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
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
      console.error('Error resetting user password:', error);
      throw error;
    }
  };

  const getUserPermissionsAPI = async (userId: number): Promise<string[]> => {
    try {
      // For now, return all permissions for the user's role
      const user = users.find(u => u.id === userId);
      if (!user) return [];
      
      const allPermissions = [
        'create_users', 'read_users', 'update_users', 'delete_users',
        'create_students', 'read_students', 'update_students', 'delete_students',
        'create_teachers', 'read_teachers', 'update_teachers', 'delete_teachers',
        'create_parents', 'read_parents', 'update_parents', 'delete_parents',
        'manage_classes', 'manage_subjects', 'manage_fees', 'view_reports'
      ];
      
      return user.role === 'admin' ? allPermissions : 
             user.role === 'teacher' ? ['read_students', 'update_students', 'manage_classes', 'manage_subjects'] :
             user.role === 'accountant' ? ['read_students', 'manage_fees', 'view_reports'] :
             ['read_students'];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  };

  const checkUserPermissionAPI = (role: string, permission: string): boolean => {
    try {
      // For now, return true for all permissions
      // In production, this would check against the database
      const allPermissions = [
        'create_users', 'read_users', 'update_users', 'delete_users',
        'create_students', 'read_students', 'update_students', 'delete_students',
        'create_teachers', 'read_teachers', 'update_teachers', 'delete_teachers',
        'create_parents', 'read_parents', 'update_parents', 'delete_parents',
        'manage_classes', 'manage_subjects', 'manage_fees', 'view_reports',
        'link_students', 'assign_subjects', 'manage_exams', 'manage_timetable',
        'manage_notifications', 'manage_settings', 'view_student_reports'
      ];
      
      return role === 'admin' ? true : 
             role === 'teacher' ? allPermissions.includes(permission) :
             role === 'accountant' ? ['read_students', 'manage_fees', 'view_reports'].includes(permission) :
             ['read_students'].includes(permission);
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  };

  // Helper function to update class student count
  const compileResult = async (resultData: any): Promise<number> => {
    try {
      // Use INSERT ... ON DUPLICATE KEY UPDATE to handle race conditions and duplicates atomically
      const query = `
        INSERT INTO compiled_results (
          student_id, class_id, term, academic_year, 
          total_score, average_score, class_average, position, 
          total_students, times_present, times_absent, total_attendance_days, 
          term_begin, term_end, next_term_begin,
          class_teacher_name, class_teacher_comment, 
          principal_name, principal_comment, principal_signature, 
          compiled_by, compiled_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_score = VALUES(total_score),
          average_score = VALUES(average_score),
          class_average = VALUES(class_average),
          position = VALUES(position),
          total_students = VALUES(total_students),
          times_present = VALUES(times_present),
          times_absent = VALUES(times_absent),
          total_attendance_days = VALUES(total_attendance_days),
          term_begin = VALUES(term_begin),
          term_end = VALUES(term_end),
          next_term_begin = VALUES(next_term_begin),
          class_teacher_name = VALUES(class_teacher_name),
          class_teacher_comment = VALUES(class_teacher_comment),
          principal_name = VALUES(principal_name),
          principal_comment = VALUES(principal_comment),
          principal_signature = VALUES(principal_signature),
          compiled_by = VALUES(compiled_by),
          compiled_date = VALUES(compiled_date),
          status = VALUES(status)
      `;
      
      const params = [
        resultData.student_id,
        resultData.class_id,
        resultData.term,
        resultData.academic_year,
        resultData.total_score,
        resultData.average_score,
        resultData.class_average || 0,
        resultData.position,
        resultData.total_students,
        resultData.times_present || 0,
        resultData.times_absent || 0,
        resultData.total_attendance_days || 0,
        resultData.term_begin || null,
        resultData.term_end || null,
        resultData.next_term_begin || null,
        resultData.class_teacher_name,
        resultData.class_teacher_comment,
        resultData.principal_name || '',
        resultData.principal_comment,
        resultData.principal_signature || '',
        resultData.compiled_by || null,
        resultData.compiled_date,
        resultData.status
      ];

      const result = await sqlDatabase.executeQuery(query, params);

      // If insertId is present, it's a new record. 
      if (result && result.insertId) {
          const newResult = { ...resultData, id: result.insertId };
          setCompiledResults(prev => {
              // Check just in case
              const exists = prev.find(r => r.id === result.insertId);
              if (exists) return prev.map(r => r.id === result.insertId ? newResult : r);
              return [...prev, newResult];
          });
          return result.insertId;
      } else {
         // Updated record. Fetch the ID to ensure we return the correct ID and update state correctly.
         const idQuery = `SELECT id FROM compiled_results WHERE student_id = ? AND class_id = ? AND term = ? AND academic_year = ?`;
         const idResult = await sqlDatabase.executeQuery(idQuery, [resultData.student_id, resultData.class_id, resultData.term, resultData.academic_year]);
         
         if (idResult && (idResult.length > 0 || idResult.data?.length > 0)) {
             const rows = idResult.data || idResult;
             const id = rows[0].id;
             const updatedResult = { ...resultData, id };
             
             setCompiledResults(prev => {
                 const exists = prev.find(r => r.id === id);
                 if (exists) return prev.map(r => r.id === id ? updatedResult : r);
                 return [...prev, updatedResult];
             });
             return id;
         }
         return 0;
      }
    } catch (error) {
      console.error('Error compiling result:', error);
      throw error;
    }
  };

  const updateCompiledResult = async (id: number, resultData: any): Promise<void> => {
    try {
      // Update database
      await sqlDatabase.updateRecord('compiled_results', id, resultData);
      
      // Update local state
      setCompiledResults(compiledResults.map((r: any) => (r.id === id ? { ...r, ...resultData } : r)));
    } catch (error) {
      console.error('Error updating compiled result:', error);
      throw error;
    }
  };

  const deleteCompiledResult = async (id: number): Promise<void> => {
    setCompiledResults(compiledResults.filter((r: any) => r.id !== id));
  };

  const submitResult = async (id: number): Promise<void> => {
    try {
      // Update compiled result status to 'Submitted' in database using generic update
      await sqlDatabase.updateRecord('compiled_results', id, { status: 'Submitted' });
      
      // Update local state
      setCompiledResults(compiledResults.map((r: any) => (r.id === id ? { ...r, status: 'Submitted' } : r)));
      
      // Also update individual scores status to 'Submitted'
      const result = compiledResults.find((r: any) => r.id === id);
      if (result) {
        // Get all scores for this student and update their status
        const studentScores = scores.filter((s: Score) => s.student_id === result.student_id);
        for (const score of studentScores) {
          if (score.status === 'Draft') {
            await sqlDatabase.updateRecord('scores', score.id, { status: 'Submitted' });
          }
        }
        // Reload scores to get updated status
        await loadScoresFromAPI();
      }
    } catch (error) {
      console.error('Error submitting result to database:', error);
      throw error;
    }
  };

  const approveResult = async (id: number): Promise<void> => {
    try {
      // Update compiled result status to 'Approved' in database
      await sqlDatabase.updateCompiledResult(id, { status: 'Approved' });
      
      // Update local state
      setCompiledResults(compiledResults.map((r: any) => (r.id === id ? { ...r, status: 'Approved' } : r)));
    } catch (error) {
      console.error('Error approving result in database:', error);
      throw error;
    }
  };

  const rejectResult = async (id: number, reason: string = ''): Promise<void> => {
    try {
      // Get the compiled result details
      const result = compiledResults.find((r: any) => r.id === id);
      if (!result) {
        throw new Error('Result not found');
      }

      // Update compiled result status to 'Rejected' in database
      await sqlDatabase.updateCompiledResult(id, { 
        status: 'Rejected',
        rejectionReason: reason
      });
      
      // Update local state
      setCompiledResults(compiledResults.map((r: any) => (r.id === id ? { ...r, status: 'Rejected', rejectionReason: reason } : r)));

      // Find and reject all subject scores for this student, class, and term
      const studentScores = scores.filter((s: any) => 
        s.student_id === result.student_id &&
        s.term === result.term &&
        s.academic_year === result.academic_year &&
        s.status === 'Approved' // Only reject approved scores, not submitted ones
      );

      // Update all related scores to 'Rejected' status
      for (const score of studentScores) {
        await sqlDatabase.updateRecord('scores', score.id, { 
          status: 'Rejected',
          rejectionReason: `Admin rejected compiled result: ${reason}`,
          rejectedBy: currentUser?.id || null,
          rejectedDate: new Date().toISOString()
        });
        
        // Update local state
        setScores(scores.map((s: any) => 
          s.id === score.id 
            ? { ...s, status: 'Rejected', rejectionReason: `Admin rejected compiled result: ${reason}` }
            : s
        ));
      }

      // Send notification to class teacher
      const student = students.find((s: any) => s.id === result.student_id);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
      
      const classTeacher = teachers.find((t: any) => t.id === result.compiled_by);
      if (classTeacher) {
        await addNotification({
          title: "Compiled Result Rejected - Action Required",
          message: `Admin has rejected the compiled result for ${studentName}. You can now edit attendance, comments, psychomotor skills, and reject subject scores for correction.`,
          type: "warning",
          targetAudience: "teachers",
          sentBy: currentUser?.id || 0,
          sentDate: new Date().toISOString(),
          isRead: false,
          readBy: []
        });
      }

    } catch (error) {
      console.error('Error rejecting result in database:', error);
      throw error;
    }
  };

  const getResultsByClass = (classId: number) => {
    return compiledResults.filter((r: any) => r.class_id === classId);
  };

  // Payment Functions
  const addPayment = async (payment: Omit<Payment, 'id'>): Promise<void> => {
    try {
      // Map frontend fields to backend expected fields
      // Backend expects: student_id, amount, payment_type, payment_method, term, academic_year, notes
      const payload = {
        student_id: payment.student_id,
        amount: payment.amount,
        payment_type: payment.payment_type || 'School Fees',
        payment_method: payment.payment_method,
        term: payment.term || currentTerm,
        academic_year: payment.academic_year || currentAcademicYear,
        notes: payment.notes,
        transaction_reference: payment.transaction_reference
      };

      // Use the main payments endpoint (POST /payments) which is wired to createPayment
      const response = await api.post<any>('/payments', payload);
      
      if (response.success) {
        // Refresh payments list
        await loadPaymentsFromAPI();
        // Also refresh student fee balances
        await loadStudentFeeBalancesFromAPI();
        toast.success('Payment recorded successfully');
      } else {
        throw new Error(response.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error(error.message || 'Failed to record payment');
      throw error;
    }
  };

  const updatePayment = async (id: number, payment: Partial<Payment>): Promise<void> => {
    // Note: This is mainly for local state or if we add an update endpoint later
    setPayments(payments.map((p: Payment) => (p.id === id ? { ...p, ...payment } : p)));
  };

  const verifyPayment = async (id: number, data?: { action: 'verify' | 'reject', rejection_reason?: string }): Promise<void> => {
    try {
      const response = await api.post<any>(`/payments/verify/${id}`, data || { action: 'verify' });
      
      if (response.success) {
        // Update local state based on action
        const updatedStatus = data?.action === 'reject' ? 'Rejected' : 'Verified';
        setPayments(payments.map((p: Payment) => (p.id === id ? { 
          ...p, 
          status: updatedStatus, 
          verified_date: new Date().toISOString(),
          notes: data?.action === 'reject' && data.rejection_reason 
            ? `${p.notes || ''}\nRejection: ${data.rejection_reason}` 
            : p.notes
        } : p)));
        
        if (data?.action === 'reject') {
          toast.error('Payment rejected');
        } else {
          toast.success('Payment verified successfully');
        }
        
        // Refresh student fee balances as verification affects it
        await loadStudentFeeBalancesFromAPI(); 
      } else {
        throw new Error(response.message || 'Failed to verify payment');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error(error.message || 'Failed to verify payment');
      throw error;
    }
  };

  const rejectPayment = async (id: number, reason: string): Promise<void> => {
    try {
      const response = await api.post<any>(`/payments/verify/${id}`, { action: 'reject', rejection_reason: reason });
      
      if (response.success) {
        setPayments(payments.map((p: Payment) => (p.id === id ? { ...p, status: 'Rejected', notes: (p.notes || '') + '\nRejection: ' + reason } : p)));
        // Refresh student fee balances as rejection reverses the balance update
        await loadStudentFeeBalancesFromAPI();
        toast.success('Payment rejected');
      } else {
        throw new Error(response.message || 'Failed to reject payment');
      }
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error(error.message || 'Failed to reject payment');
      throw error;
    }
  };

  const getPaymentsByStudent = (studentId: number) => {
    return payments.filter((p: Payment) => p.student_id === studentId);
  };

  // Fee Functions
  const addFeeStructure = async (feeStructure: any): Promise<number> => {
    const newId = feeStructures.length > 0 ? Math.max(...feeStructures.map((f: any) => f.id)) + 1 : 1;
    const newFeeStructure = { ...feeStructure, id: newId };
    setFeeStructures([...feeStructures, newFeeStructure]);
    return newId;
  };

  const updateFeeStructure = async (id: number, feeStructure: any): Promise<void> => {
    setFeeStructures(feeStructures.map((f: any) => (f.id === id ? { ...f, ...feeStructure } : f)));
  };

  const getFeeStructureByClass = (classId: number, term: string, academicYear: string) => {
    return feeStructures.find((f: any) => 
      f.class_id === classId && f.term === term && f.academic_year === academicYear
    ) || null;
  };

  const getStudentFeeBalance = (studentId: number): StudentFeeBalance | null => {
    const balance = studentFeeBalances.find((b: StudentFeeBalance) => b.student_id === studentId);
    return balance || null;
  };

  const updateStudentFeeBalance = async (studentId: number, balance: Partial<StudentFeeBalance>): Promise<void> => {
    setStudentFeeBalances(studentFeeBalances.map((b: StudentFeeBalance) => 
      (b.student_id === studentId ? { ...b, ...balance } : b)
    ));
  };

  // Parent-Student Link
  const linkParentToStudent = async (parentId: number, studentId: number): Promise<void> => {
    try {
      // Insert into parent_student_links table
      await sqlDatabase.createParentStudentLink(parentId, studentId, 'Parent', true);
      
      // Also update the student's parent_id field
      await sqlDatabase.updateRecord('students', studentId, { parent_id: parentId });
      
      // Reload data to reflect changes
      await loadStudentsFromAPI();
      await loadParentsFromAPI();
      await loadParentStudentLinksFromAPI();
      
      console.log(`Successfully linked parent ${parentId} to student ${studentId}`);
    } catch (error) {
      console.error('Error linking parent to student:', error);
      throw error;
    }
  };

  // Subject Registration
  const registerSubjectForClass = async (classId: number, subjectId: number, academicYear: string, term: string, isCompulsory?: boolean): Promise<boolean> => {
    try {
      console.log(`Registering subject ${subjectId} for class ${classId}`);
      const success = await registerSubjectForClassAPI(classId, subjectId, academicYear, term, isCompulsory);
      if (success) {
        await loadSubjectRegistrationsFromAPI();
      }
      return success;
    } catch (error) {
      console.error('Error registering subject for class:', error);
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
      console.error('Error updating class student count:', error);
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
    
    // Log the promotion activity
    if (currentUser) {
      addActivityLog({
        id: 0, // Will be generated by database
        actor: currentUser.username,
        actor_role: 'Admin',
        action: 'Promote Student',
        target: `${student.firstName} ${student.lastName} → ${newClass.name}`,
        ip_address: 'System',
        status: 'Success',
        timestamp: new Date().toISOString(),
        details: `Promoted from ${student.className} to ${newClass.name} for ${newAcademicYear}`,
      });
    }
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
      console.error('Error adding attendance:', error);
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
      console.error('Error updating attendance:', error);
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
      console.error('Error deleting attendance:', error);
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
      // This would typically call an API to update the password
      // For now, just return true for demo purposes
      console.log(`Changing password from ${oldPassword} to ${newPassword}`);
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id'>): Promise<number> => {
    try {
      // Convert to snake_case for database
      const notificationData = {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target_audience: notification.targetAudience,
        sent_by: notification.sentBy,
        sent_date: notification.sentDate,
        is_read: notification.isRead ? 1 : 0,
        read_by: JSON.stringify(notification.readBy || [])
      };

      // Insert into database
      const insertId = await sqlDatabase.insertRecord('notifications', notificationData);
      
      // Create notification object for local state
      const newNotification = { 
        ...notification, 
        id: insertId 
      };
      
      // Update local state
      setNotifications(prev => [...prev, newNotification]);
      
      return insertId;
    } catch (error) {
      console.error('Error adding notification to database:', error);
      // Fallback to local state only
      const newId = notifications.length > 0 ? Math.max(...notifications.map((n: Notification) => n.id)) + 1 : 1;
      const newNotification = { ...notification, id: newId };
      setNotifications([...notifications, newNotification]);
      return newId;
    }
  };

  const markNotificationAsRead = async (id: number): Promise<void> => {
    setNotifications(notifications.map((n: Notification) => 
      (n.id === id ? { ...n, isRead: true } : n)
    ));
  };

  const getUnreadNotifications = (): Notification[] => {
    const userRole = currentUser?.role;
    const userId = currentUser?.id;
    
    return notifications.filter((n: Notification) => {
      // First check if unread
      if (n.isRead) return false;
      
      // Check if notification is relevant to this user
      if (n.targetAudience === 'all') return true;
      if (userRole === 'admin') return true; // Admins see all 'all' notifications
      if (userRole === 'teacher' && n.targetAudience === 'teachers') return true;
      if (userRole === 'parent' && n.targetAudience === 'parents') return true;
      if (userRole === 'accountant' && n.targetAudience === 'accountants') return true;
      
      return false;
    });
  };

  const getAllNotifications = (): Notification[] => {
    return notifications;
  };

  const deleteNotification = async (id: number): Promise<void> => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter((n: any) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
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
  const getTeacherStudents = (teacherId: number, classId: number): Student[] => {
    return students.filter(s => s.class_id === classId);
  };

  const getParentChildren = (parentId: number): any[] => {
    console.log('=== GET PARENT CHILDREN DEBUG ===');
    console.log('Parent ID requested:', parentId);
    console.log('Available parent-student links:', parentStudentLinksData);
    console.log('Available students:', students);
    
    // Get children from parent_student_links table
    // Handle both string and number parent_id formats
    const parentStudentLinks = parentStudentLinksData.filter(link => {
      const linkParentId = typeof link.parent_id === 'string' ? parseInt(link.parent_id) : link.parent_id;
      return linkParentId === parentId;
    });
    
    console.log('Filtered links for this parent:', parentStudentLinks);
    console.log('Number of links found:', parentStudentLinks.length);
    
    return parentStudentLinks.map(link => {
      const student = students.find(s => s.id === link.student_id);
      
      if (!student) {
        console.log('Student not found for link:', link);
        return null;
      }
      
      // Check status - only Active students should be shown
      const isActive = student.status === 'Active';
      if (!isActive) {
        console.log('Student not active:', student);
        return null;
      }
      
      console.log('Valid child found:', student);
      
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
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
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
      console.log(`Linking student ${studentId} to parent ${parentId} with relationship: ${relationship}`);
      
      // First, refresh the parent-student links to ensure we have the latest data
      console.log('Refreshing parent-student links before checking...');
      await loadParentStudentLinksFromAPI();
      
      // Check if this link already exists with fresh data
      const existingLink = Array.isArray(parentStudentLinksData) ? parentStudentLinksData.find(
        (link: any) => link.parent_id === parentId && link.student_id === studentId
      ) : null;
      
      console.log('Existing link check:', existingLink);
      
      if (existingLink) {
        console.log('Student is already linked to this parent (found in refreshed data)');
        toast.error('This student is already linked to this parent');
        return false;
      }
      
      // Use API to create link in actual database
      console.log('Making API call to:', `/parents/link/${parentId}`);
      console.log('Request data:', {
        student_id: studentId,
        relationship: relationship,
        is_primary: true
      });
      
      const response = await api.post(`/parents/link/${parentId}`, {
        student_id: studentId,
        relationship: relationship,
        is_primary: true
      });
      
      console.log('API response:', response);
      
      if (response && response.success) {
        // Get parent information to update student record
        const parent = parents.find(p => p.id === parentId);
        if (parent) {
          // Update student's parent_id and parent_name fields in database
          await updateStudent(studentId, {
            parent_id: parentId,
            parent_name: `${parent.firstName} ${parent.lastName}`
          });
        }
        
        // Refresh data to reflect changes immediately
        await Promise.all([
          loadStudentsFromAPI(),
          loadParentsFromAPI(),
          loadParentStudentLinksFromAPI()
        ]);
        
        console.log('Student linked to parent successfully via API');
        return true;
      }
      
      console.error('API response failed:', response);
      toast.error('Failed to link student - API response error');
      return false;
    } catch (error: any) {
      console.error('Error linking student to parent via API:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        console.log('409 Conflict detected - refreshing data and checking again...');
        // Refresh data and check if link now appears
        await loadParentStudentLinksFromAPI();
        const refreshedLink = Array.isArray(parentStudentLinksData) ? parentStudentLinksData.find(
          (link: any) => link.parent_id === parentId && link.student_id === studentId
        ) : null;
        
        if (refreshedLink) {
          console.log('Link found after refresh - student was already linked');
          toast.error('This student is already linked to this parent');
        } else {
          console.log('Link still not found after refresh - possible database inconsistency');
          toast.error('Link already exists in database but not visible in frontend. Please refresh the page.');
        }
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
      console.log(`Unlinking student ${studentId} from parent ${parentId}`);
      
      // Check if the link exists before attempting to unlink
      const existingLink = Array.isArray(parentStudentLinksData) ? parentStudentLinksData.find(
        (link: any) => link.parent_id === parentId && link.student_id === studentId
      ) : null;
      
      if (!existingLink) {
        console.log('No link found between this student and parent');
        toast.error('This student is not linked to this parent');
        return false;
      }
      
      const response = await api.delete(`/parents/unlink/${parentId}/${studentId}`);
      
      if (response && response.success) {
        // Clear the student's parent_id and parent_name fields
        await updateStudent(studentId, {
          parent_id: null,
          parent_name: undefined
        });
        
        // Refresh data to reflect changes immediately
        await Promise.all([
          loadStudentsFromAPI(),
          loadParentsFromAPI(),
          loadParentStudentLinksFromAPI()
        ]);
        
        console.log('Student unlinked from parent successfully via API');
        return true;
      }
      
      console.error('API unlink response failed:', response);
      return false;
    } catch (error: any) {
      console.error('Error unlinking student from parent via API:', error);
      
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

  const getParentPermissions = (parentId: number): { module: string; permissions: string[] }[] => {
    return [
      { module: 'children', permissions: ['view_children', 'view_results'] },
      { module: 'payments', permissions: ['view_payments', 'make_payments'] },
      { module: 'reports', permissions: ['view_reports'] }
    ];
  };

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

  const getActiveAcademicYearAPI = async (): Promise<string> => {
    return '2025/2026';
  };

  const getActiveTermAPI = async (): Promise<string> => {
    return 'First Term';
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
        console.warn('Subject already assigned:', existingAssignment);
        return false; // Already assigned
      }

      // Create new assignment via API
      const response = await api.post('/subjects/assignments', {
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
        
        console.log('Subject assignment created successfully:', newAssignment);
        return true;
      }
      
      console.warn('Failed to create assignment:', response);
      return false;
    } catch (error) {
      console.error('Error assigning subject to teacher:', error);
      return false;
    }
  };

  const removeSubjectAssignmentAPI = async (teacherId: number, subjectId: number, classId: number, academicYear: string, term: string): Promise<boolean> => {
    try {
      // Validate inputs
      if (!currentUser) {
        console.error('No current user found for assignment removal');
        return false;
      }
      
      if (!subjectAssignments || subjectAssignments.length === 0) {
        console.error('No subject assignments loaded');
        return false;
      }
      
      console.log('=== REMOVE ASSIGNMENT DEBUG ===');
      console.log('Removing assignment:', { teacherId, subjectId, classId, academicYear, term });
      console.log('Available assignments:', subjectAssignments.length);
      
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
      
      console.log('Found assignment:', existingAssignment);
      
      if (!existingAssignment) {
        console.warn('Assignment not found for removal:', { teacherId, subjectId, classId, academicYear, term });
        return false; // Assignment not found
      }
      
      // Use the real API to delete the assignment
      const response = await api.delete(`/subjects/assignment/${existingAssignment.id}`);
      
      if (response && response.success) {
        // Immediately update local state for real-time UI update
        setSubjectAssignments(prev => prev.filter(assignment => assignment.id !== existingAssignment.id));
        
        // Then refresh from API to ensure consistency
        await loadSubjectAssignmentsFromAPI();
        
        console.log('Assignment removed successfully:', existingAssignment.id);
        return true;
      }
      
      console.warn('Failed to remove assignment:', response);
      return false;
    } catch (error) {
      console.error('Error removing subject assignment:', error);
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

  const loadScoresFromAPI = async (): Promise<boolean> => {
    try {
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      // If user is a teacher, only load scores for their assigned subjects
      let whereClause = '';
      if (currentUser && currentUser.role === 'teacher') {
        const teacherId = currentUser.linked_id;
        // Get subject assignments for this teacher
        const assignmentResult = await sqlDatabase.executeQuery(`
          SELECT id FROM subject_assignments 
          WHERE teacher_id = ${teacherId}
        `);
        
        if (assignmentResult && assignmentResult.data && assignmentResult.data.length > 0) {
          const assignmentIds = assignmentResult.data.map((a: any) => a.id).join(',');
          whereClause = `WHERE sc.subject_assignment_id IN (${assignmentIds})`;
        } else {
          // Teacher has no assignments, return empty scores
          console.log('Teacher has no subject assignments');
          setScores([]);
          return true;
        }
      }
      
      const query = `
        SELECT sc.*, sa.subject_id, sa.class_id, sub.name as subject_name 
        FROM scores sc 
        LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id 
        LEFT JOIN subjects sub ON sa.subject_id = sub.id 
        ${whereClause}
        ORDER BY sc.student_id, sc.subject_assignment_id
      `;
      
      const result = await sqlDatabase.executeQuery(query);
      console.log('SQL Result:', result);
      if (result && result.data) {
        console.log('Database scores loaded:', {
          totalScores: result.data.length,
          scores: result.data.map((s: any) => ({
            id: s.id,
            student_id: s.student_id,
            subject_assignment_id: s.subject_assignment_id,
            subject_id: s.subject_id,
            class_id: s.class_id,
            subject_name: s.subject_name,
            term: s.term,
            academic_year: s.academic_year,
            status: s.status,
            ca1: s.ca1,
            ca2: s.ca2,
            exam: s.exam,
            total: s.total
          }))
        });
        setScores(result.data);
        return true;
      }
      console.log('No result or data from scores query');
      return false;
    } catch (error) {
      console.error('Error loading scores:', error);
      return false;
    }
  };

  const createPaymentAPI = async (payment: Omit<Payment, 'id'>): Promise<boolean> => {
    try {
      const result = await sqlDatabase.createPayment(payment);
      return !!result;
    } catch (error) {
      console.error('Error creating payment:', error);
      return false;
    }
  };

  const loadPaymentsFromAPI = async (): Promise<boolean> => {
    try {
      // IMMEDIATE EXIT FOR PARENTS - Don't process anything else
      if (currentUser && currentUser.role === 'parent') {
        console.log('Parent user detected - skipping all payments loading');
        setPayments([]);
        return true;
      }
      
      // Additional safety check - prevent any non-admin/accountant from accessing payments
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'accountant')) {
        console.warn('Unauthorized role attempting to access payments:', currentUser?.role);
        setPayments([]);
        return false;
      }
      
      // Default behaviour (admin/accountant only): use the global payments endpoint
      const response = await api.get<any>('/payments?limit=1000');
      
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
      console.error('Error loading payments:', error);
      
      // Additional safety check - prevent any non-admin/accountant from accessing payments
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'accountant')) {
        console.warn('Unauthorized role attempting to access payments:', currentUser?.role);
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
        console.error('Error loading payments via SQL:', sqlError);
      }
      return false;
    }
  };

  const loadAffectiveDomainsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM affective_domains ORDER BY student_id, academic_year, term');
      if (result && result.data) {
        setAffectiveDomains(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading affective domains:', error);
      return false;
    }
  };

  const loadPsychomotorDomainsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM psychomotor_domains ORDER BY student_id, academic_year, term');
      if (result && result.data) {
        setPsychomotorDomains(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading psychomotor domains:', error);
      return false;
    }
  };

  const loadCompiledResultsFromAPI = async (): Promise<boolean> => {
    try {
      if (!sqlDatabase) {
        console.error('SQL Database service is not available');
        return false;
      }
      
      // Check cache first - but skip cache for parents to get fresh data
      const cacheKey = 'compiled_results';
      if (currentUser?.role !== 'parent') {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        const now = Date.now();
        const CACHE_DURATION = 5000; // 5 seconds cache for real-time data
        
        // Use cached data if fresh enough (only for non-parents)
        if (cached && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
          setCompiledResults(JSON.parse(cached));
          return true;
        }
      }
      
      let result;
      if (currentUser?.role === 'parent') {
        // For parents, only load results for their linked students
        console.log('Loading compiled results for parent, linked_id:', currentUser.linked_id);
        const parentLinks = await sqlDatabase.executeQuery(
          "SELECT student_id FROM parent_student_links WHERE parent_id = ?",
          [currentUser.linked_id]
        );
        
        console.log('Parent links found:', parentLinks);
        console.log('Parent links type:', typeof parentLinks);
        console.log('Parent links isArray:', Array.isArray(parentLinks));
        
        // Handle different response formats
        const linksArray = Array.isArray(parentLinks) ? parentLinks : (parentLinks?.data || []);
        console.log('Processed links array:', linksArray);
        
        if (linksArray && linksArray.length > 0) {
          const studentIds = linksArray.map((link: any) => link.student_id);
          
          console.log('Student IDs for parent:', studentIds);
          
          // Only load approved results for parent's children
          const placeholders = studentIds.map(() => '?').join(',');
          const query = `
            SELECT * FROM compiled_results 
            WHERE student_id IN (${placeholders}) 
            AND status = 'Approved'
            ORDER BY student_id, class_id
          `;
          console.log('Executing query:', query);
          console.log('With params:', studentIds);
          
          result = await sqlDatabase.executeQuery(query, studentIds);
          console.log('Compiled results query result:', result);
        } else {
          console.log('No parent-student links found for parent ID:', currentUser.linked_id);
        }
      } else {
        // For other roles (admin, teacher), load all results
        result = await sqlDatabase.executeQuery('SELECT * FROM compiled_results ORDER BY student_id, class_id');
      }
      
      if (result && result.data) {
        // Cache the results
        const currentTime = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(result.data));
        localStorage.setItem(`${cacheKey}_time`, currentTime.toString());
        setCompiledResults(result.data);
        return true;
      } else if (result && Array.isArray(result)) {
        // Handle direct array response
        const currentTime = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(`${cacheKey}_time`, currentTime.toString());
        setCompiledResults(result);
        return true;
      } else {
        console.log('No compiled results found or unexpected format:', result);
        setCompiledResults([]);
        return true;
      }
    } catch (error) {
      console.error('Error loading compiled results:', error);
      return false;
    }
  };

  const createFeeStructureAPI = async (feeStructure: any): Promise<boolean> => {
    try {
      await sqlDatabase.insertRecord('fee_structures', feeStructure);
      await loadFeeStructuresFromAPI();
      return true;
    } catch (error) {
      console.error('Error creating fee structure:', error);
      return false;
    }
  };

  const getFeeStructuresAPI = async (): Promise<any> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM fee_structures ORDER BY class_id, academic_year, term');
      return result?.data || [];
    } catch (error) {
      console.error('Error getting fee structures:', error);
      return [];
    }
  };

  const getPaymentsAPI = async (): Promise<any> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM payments ORDER BY payment_date DESC');
      return result?.data || [];
    } catch (error) {
      console.error('Error getting payments:', error);
      return [];
    }
  };

  const updatePaymentStatusAPI = async (paymentId: number, status: string): Promise<any> => {
    try {
      await sqlDatabase.updateRecord('payments', paymentId, { status });
      await loadPaymentsFromAPI();
      return { success: true };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error };
    }
  };

  const getFeeBalancesAPI = async (): Promise<any> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM student_fee_balances ORDER BY student_id');
      return result?.data || [];
    } catch (error) {
      console.error('Error getting fee balances:', error);
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
      console.error('Error creating batch payments:', error);
      return { success: false, error };
    }
  };

  const loadFeeStructuresFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM fee_structures ORDER BY class_id, academic_year, term');
      if (result && result.data) {
        setFeeStructures(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading fee structures:', error);
      return false;
    }
  };

  const loadStudentFeeBalancesFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM student_fee_balances ORDER BY student_id');
      if (result && result.data) {
        setStudentFeeBalances(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading student fee balances:', error);
      return false;
    }
  };

  const loadNotificationsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM notifications ORDER BY sent_date DESC');
      if (result && result.data) {
        setNotifications(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return false;
    }
  };

  const loadAttendancesFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM attendance ORDER BY date DESC, class_id');
      if (result && result.data) {
        setAttendances(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading attendances:', error);
      return false;
    }
  };

  const loadExamTimetablesFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.getExamTimetables();
      setExamTimetables(result);
      return true;
    } catch (error) {
      console.error('Error loading exam timetables:', error);
      return false;
    }
  };

  const loadClassTimetablesFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM class_timetables ORDER BY day_of_week, start_time');
      if (result && result.data) {
        setClassTimetables(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading class timetables:', error);
      return false;
    }
  };

  const loadDepartmentsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM departments ORDER BY name');
      if (result && result.data) {
        setDepartments(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading departments:', error);
      return false;
    }
  };

  const loadScholarshipsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM scholarships ORDER BY academic_year, student_id');
      if (result && result.data) {
        setScholarships(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading scholarships:', error);
      return false;
    }
  };

  const loadAssignmentsFromAPI = async (): Promise<boolean> => {
    try {
      const result = await sqlDatabase.executeQuery('SELECT * FROM assignments ORDER BY assigned_date DESC');
      if (result && result.data) {
        setAssignments(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading assignments:', error);
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
      console.error('Error updating teacher status:', error);
      return false;
    }
  };

  const updateParentStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.updateParent(id, { status });
      return !!result;
    } catch (error) {
      console.error('Error updating parent status:', error);
      return false;
    }
  };

  const updateAccountantStatusAPI = async (id: number, status: string): Promise<boolean> => {
    try {
      const result = await sqlDatabase.updateAccountant(id, { status });
      return !!result;
    } catch (error) {
      console.error('Error updating accountant status:', error);
      return false;
    }
  };

  // Exam Timetable Methods
  const addExamTimetable = async (timetable: Omit<ExamTimetable, 'id'>): Promise<number> => {
    try {
      const timetableData = {
        ...timetable,
        createdBy: currentUser?.id || null,
        academicYear: currentAcademicYear,
        term: currentTerm
      };
      const result = await sqlDatabase.createExamTimetable(timetableData);
      await loadExamTimetablesFromAPI();
      return result.id;
    } catch (error) {
      console.error('Error adding exam timetable:', error);
      throw error;
    }
  };

  const updateExamTimetable = async (id: number, timetable: Partial<ExamTimetable>): Promise<void> => {
    try {
      await sqlDatabase.updateExamTimetable(id, timetable);
      await loadExamTimetablesFromAPI();
    } catch (error) {
      console.error('Error updating exam timetable:', error);
      throw error;
    }
  };

  const deleteExamTimetable = async (id: number): Promise<void> => {
    try {
      await sqlDatabase.deleteExamTimetable(id);
      await loadExamTimetablesFromAPI();
    } catch (error) {
      console.error('Error deleting exam timetable:', error);
      throw error;
    }
  };

  const getExamTimetablesByClass = (classId: number) => {
    return examTimetables.filter((t: ExamTimetable) => t.class_id === classId);
  };

  const getExamTimetablesBySubject = (subjectId: number) => {
    return examTimetables.filter((t: ExamTimetable) => t.subject_id === subjectId);
  };

  const getExamTimetablesByDate = (date: string) => {
    return examTimetables.filter((t: ExamTimetable) => t.exam_date === date);
  };

  const getExamTimetables = (classId: number, academicYear: string, term: string) => {
    return examTimetables.filter((t: ExamTimetable) => 
      t.class_id === classId && t.academic_year === academicYear && t.term === term
    );
  };

  // Class Timetable Methods
  const addClassTimetable = async (timetable: Omit<ClassTimetable, 'id'>): Promise<number> => {
    const newId = classTimetables.length > 0 ? Math.max(...classTimetables.map((t: ClassTimetable) => t.id)) + 1 : 1;
    const newTimetable = { ...timetable, id: newId };
    setClassTimetables([...classTimetables, newTimetable]);
    return newId;
  };

  const updateClassTimetable = async (id: number, timetable: Partial<ClassTimetable>): Promise<void> => {
    setClassTimetables(classTimetables.map((t: ClassTimetable) => (t.id === id ? { ...t, ...timetable } : t)));
  };

  const deleteClassTimetable = async (id: number): Promise<void> => {
    setClassTimetables(classTimetables.filter((t: ClassTimetable) => t.id !== id));
  };

  const getClassTimetablesByClass = (classId: number) => {
    return classTimetables.filter((t: ClassTimetable) => t.class_id === classId);
  };

  const getClassTimetablesBySubject = (subjectId: number) => {
    return classTimetables.filter((t: ClassTimetable) => t.subject_id === subjectId);
  };

  const getClassTimetablesByDay = (dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday') => {
    return classTimetables.filter((t: ClassTimetable) => t.day_of_week === dayOfWeek);
  };

  const getClassTimetables = (classId: number, academicYear: string, term: string) => {
    return classTimetables.filter((t: ClassTimetable) => 
      t.class_id === classId && t.academic_year === academicYear && t.term === term
    );
  };

  // Department Methods
  const addDepartment = async (department: Omit<Department, 'id'>): Promise<number> => {
    const newId = departments.length > 0 ? Math.max(...departments.map((d: Department) => d.id)) + 1 : 1;
    const newDepartment = { ...department, id: newId };
    setDepartments([...departments, newDepartment]);
    return newId;
  };

  const updateDepartment = async (id: number, department: Partial<Department>): Promise<void> => {
    setDepartments(departments.map((d: Department) => (d.id === id ? { ...d, ...department } : d)));
  };

  const deleteDepartment = async (id: number): Promise<void> => {
    setDepartments(departments.filter((d: Department) => d.id !== id));
  };

  // Scholarship Methods
  const addScholarship = async (scholarship: Omit<Scholarship, 'id'>): Promise<number> => {
    const newId = scholarships.length > 0 ? Math.max(...scholarships.map((s: Scholarship) => s.id)) + 1 : 1;
    const newScholarship = { ...scholarship, id: newId };
    setScholarships([...scholarships, newScholarship]);
    return newId;
  };

  const updateScholarship = async (id: number, scholarship: Partial<Scholarship>): Promise<void> => {
    setScholarships(scholarships.map((s: Scholarship) => (s.id === id ? { ...s, ...scholarship } : s)));
  };

  const deleteScholarship = async (id: number): Promise<void> => {
    setScholarships(scholarships.filter((s: Scholarship) => s.id !== id));
  };

  // Assignment Methods
  const addAssignment = async (assignment: Omit<Assignment, 'id'>): Promise<number> => {
    const newId = assignments.length > 0 ? Math.max(...assignments.map((a: Assignment) => a.id)) + 1 : 1;
    const newAssignment = { ...assignment, id: newId };
    setAssignments([...assignments, newAssignment]);
    return newId;
  };

  const updateAssignment = async (id: number, assignment: Partial<Assignment>): Promise<void> => {
    setAssignments(assignments.map((a: Assignment) => (a.id === id ? { ...a, ...assignment } : a)));
  };

  const deleteAssignment = async (id: number): Promise<void> => {
    setAssignments(assignments.filter((a: Assignment) => a.id !== id));
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
      console.error('Error checking class completion status:', error);
    }
  };

  const updateCompiledResultWithNewScore = async (studentId: number, newScore: Score): Promise<void> => {
    try {
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
      console.error('Error updating compiled result with new score:', error);
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
      const response = await api.post('/results/scores', {
        assignment_id: score.subject_assignment_id,
        scores: [{
          student_id: score.student_id,
          ca1: score.ca1 || 0,
          ca2: score.ca2 || 0,
          exam: score.exam || 0,
          subject_name: score.subject_name,
          status: score.status || 'Submitted'
        }]
      });

      if (response && response.success) {
        // Reload scores from database to get the new data
        await loadScoresFromAPI();
        
        // Find the new score ID (this is a workaround since API doesn't return ID)
        const newScore = scores.find(s => 
          s.student_id === score.student_id && 
          s.subject_assignment_id === score.subject_assignment_id &&
          s.status === (score.status || 'Draft')
        );
        
        if (newScore) {
          // Automatically update compiled result for this student
          await updateCompiledResultWithNewScore(score.student_id, { ...score, id: newScore.id });
          return newScore.id;
        }
        
        console.log('Score saved successfully, continuing without ID lookup');
        return 0; // Return placeholder ID since score was saved
      } else {
        throw new Error(response?.error || 'Failed to save score');
      }
    } catch (error) {
      console.error('Error adding score:', error);
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
      const response = await api.post('/results/scores', {
        assignment_id: existingScore.subject_assignment_id,
        scores: [{
          student_id: existingScore.student_id,
          ca1: score.ca1 !== undefined ? score.ca1 : existingScore.ca1,
          ca2: score.ca2 !== undefined ? score.ca2 : existingScore.ca2,
          exam: score.exam !== undefined ? score.exam : existingScore.exam,
          subject_name: score.subject_name !== undefined ? score.subject_name : existingScore.subject_name,
          status: score.status !== undefined ? score.status : existingScore.status
        }]
      });

      if (response && response.success) {
        // Reload scores from database to get the updated data
        await loadScoresFromAPI();
        
        // Update compiled result for this student
        await updateCompiledResultWithNewScore(existingScore.student_id, { ...existingScore, ...score });
      } else {
        throw new Error(response?.error || 'Failed to update score');
      }
    } catch (error) {
      console.error('Error updating score:', error);
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
      console.error('Error creating batch scores:', error);
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
      // Update database with rejection info (after migration)
      await sqlDatabase.updateRecord('scores', scoreId, {
        status: 'Rejected',
        rejection_reason: rejectionReason,
        rejected_by: rejectedBy,
        rejected_date: new Date().toISOString()
      });

      // Update local state
      setScores((scores: any[]) => scores.map((s: any) => 
        s.id === scoreId 
          ? { ...s, status: 'Rejected', rejectionReason, rejectedBy, rejectedDate: new Date().toISOString() }
          : s
      ));

      toast.success('Score rejected and notification sent to subject teacher');
    } catch (error) {
      console.error('Error rejecting score:', error);
      toast.error('Failed to reject score');
      throw error;
    }
  };

  // Score approval function for class teachers
  const approveScore = async (scoreId: number, approvedBy: number): Promise<void> => {
    try {
      await api.post(`/results/approve/${scoreId}`, {
        status: 'Approved',
        approved_by: approvedBy
      });
      
      // Reload scores from database
      await loadScoresFromAPI();
    } catch (error) {
      console.error('Error approving score:', error);
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
      console.error('Error submitting scores:', error);
      
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

  const getStudentRecentActivities = (studentId: number) => {
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
      console.log(`Updating class ${classId} teacher to ${teacherId}`);
      
      // Ensure token is available
      await tokenManager.ensureToken(currentUser);
      
      // Update the class in the database
      const result = await sqlDatabase.updateRecord('classes', classId, { 
        class_teacher_id: teacherId 
      });
      
      if (result) {
        console.log('Class teacher updated successfully');
        // Reload classes to get updated data
        await loadClassesFromAPI();
      } else {
        throw new Error('Failed to update class teacher');
      }
    } catch (error) {
      console.error('Error updating class teacher:', error);
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

  const getAvailableTeachers = (academicYear: string, term: string, subjectId: number, classId: number) => {
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

  // Add missing attendance and approval methods
  const getAttendanceByStudent = (studentId: number) => {
    return [];
  };

  const getAttendanceByClass = (classId: number) => {
    return [];
  };

  // Add missing methods
  const getAttendanceSummary = (classId: number, academicYear: string, term: string) => {
    return [];
  };

  const createBatchAttendance = async (attendanceRecords: Omit<Attendance, 'id'>[]): Promise<boolean> => {
    try {
      for (const record of attendanceRecords) {
        await sqlDatabase.createAttendance(record);
      }
      return true;
    } catch (error) {
      console.error('Error creating batch attendance:', error);
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
      console.error('Error deleting fee structure:', error);
      throw error;
    }
  };

  const getDepartments = () => {
    return [];
  };

  const getScholarships = () => {
    return [];
  };

  const getStudentScholarships = (studentId: number) => {
    return [];
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

      // Update compiled result status to 'Approved' in database
      await sqlDatabase.updateCompiledResult(resultId, { 
        status: 'Approved',
        approvedBy: currentUser?.id || undefined,
        approvedDate: new Date().toISOString()
      });
      
      // Update local state
      setCompiledResults(compiledResults.map((r: any) => (r.id === resultId ? { 
        ...r, 
        status: 'Approved',
        approvedBy: currentUser?.id || undefined,
        approvedDate: new Date().toISOString()
      } : r)));

      // Send notification to parent
      const student = students.find((s: any) => s.id === result.student_id);
      if (student && student.parent_id) {
        await addNotification({
          title: "Result Approved",
          message: `Your child's ${result.term} result for ${result.academic_year} has been approved and is now available for viewing.`,
          type: "success",
          targetAudience: "parents",
          sentBy: currentUser?.id || 0,
          sentDate: new Date().toISOString(),
          isRead: false,
          readBy: []
        });
      }

      toast.success(`Result approved for ${student?.firstName} ${student?.lastName}`);
    } catch (error) {
      console.error('Error approving result:', error);
      toast.error('Failed to approve result');
      throw error;
    }
  };

  const publishCompiledResult = async (resultId: number): Promise<void> => {
    // Implementation would go here
  };

  const value: SchoolContextType = {
    // Data
    students,
    teachers,
    parents,
    accountants,
    classes,
    subjects,
    subjectRegistrations,
    subjectAssignments,
    classTeacherAssignments,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    payments,
    users,
    currentUser,
    isLoading,
    feeStructures,
    studentFeeBalances,
    notifications,
    activityLogs,
    attendances,
    attendanceRequirements,
    sqlDatabase,
    
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
    setActivityLogs,
    setAttendances,
    examTimetables,
    classTimetables,
    departments,
    scholarships,
    assignments,
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
    getPaymentsByStudent,
    addFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    getFeeStructures,
    getStudentFeeBalance,
    updateStudentFeeBalance,
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
        console.log('Adding/Updating compiled result:', data);
        
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
          console.log(`Updating existing compiled result ID: ${existingId}`);
          
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
              class_teacher_comment = ?,
              compiled_date = NOW(),
              status = ?
            WHERE id = ?
          `;
          
          const updateParams = [
            data.total_score, data.average_score, data.class_average, data.position,
            data.total_students, data.times_present, data.times_absent, data.total_attendance_days,
            data.class_teacher_comment, data.status,
            existingId
          ];
          
          await sqlDatabase.executeQuery(updateQuery, updateParams);
          await loadCompiledResultsFromAPI();
          return existingId;
        } else {
          // Insert new record
          console.log('Inserting new compiled result');
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
            await loadCompiledResultsFromAPI();
            return result.insertId || 1; // Return insertId or success indicator
          }
        }
        
        return 0;
      } catch (error) {
        console.error('Error adding/updating compiled result:', error);
        throw error;
      }
    },
    publishCompiledResult,
    getAttendanceByStudent,
    getAttendanceByClass,
    getFeeStructureByClass,
    addNotification,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    createAffectiveDomain: async (affectiveData: any) => {
      // Placeholder implementation
      console.log('createAffectiveDomain called with:', affectiveData);
      return Promise.resolve();
    },
    deleteAffectiveDomain: async (id: number) => {
      // Placeholder implementation
      console.log('deleteAffectiveDomain called with:', id);
      return Promise.resolve();
    },
    addPsychomotorDomain: async (psychomotorData: any) => {
      // Placeholder implementation
      console.log('addPsychomotorDomain called with:', psychomotorData);
      return Promise.resolve();
    },
    createPsychomotorDomain: async (psychomotorData: any) => {
      // Placeholder implementation
      console.log('createPsychomotorDomain called with:', psychomotorData);
      return Promise.resolve();
    },
    deletePsychomotorDomain: async (id: number) => {
      // Placeholder implementation
      console.log('deletePsychomotorDomain called with:', id);
      return Promise.resolve();
    },
    updatePsychomotorDomain: async (id: number, data: any) => {
      // Placeholder implementation
      console.log('updatePsychomotorDomain called with:', id, data);
      return Promise.resolve();
    },

    // User Management Methods
    createUserAPI,
    updateUserAPI,
    deleteUserAPI,
    setCurrentUser,
    login,
    logout: () => {
      console.log('🔒 Logging out user');
      
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
    updateSchoolSettings,
    updateTermDates,
    getTermDates,
    loadTermDates,
    updateBankAccountSettings,
    getBankAccountSettings,
    validateClassTeacherAssignment,
    addActivityLog,
    getActivityLogs,
    promoteStudent,
    promoteMultipleStudents,

    // Attendance Methods
    addAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendancesByStudent,
    getAttendancesByClass,
    getAttendancesByDate,

    // Exam Timetable Methods
    addExamTimetable,
    updateExamTimetable,
    deleteExamTimetable,
    getExamTimetables,
    getExamTimetablesByClass,
    getExamTimetablesBySubject,
    getExamTimetablesByDate,

    // Class Timetable Methods
    addClassTimetable,
    updateClassTimetable,
    deleteClassTimetable,
    getClassTimetables,
    getClassTimetablesByClass,
    getClassTimetablesBySubject,
    getClassTimetablesByDay,

    // Department Methods
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartments,

    // Scholarship Methods
    addScholarship,
    updateScholarship,
    deleteScholarship,
    getScholarships,
    getStudentScholarships,

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
    loadStudentsFromAPI,
    loadTeachersFromAPI,
    loadClassesFromAPI,
    loadSubjectsFromAPI,
    loadSubjectRegistrationsFromAPI,
    loadSubjectAssignmentsFromAPI,
    loadClassTeacherAssignmentsFromAPI,
    loadParentsFromAPI,
    loadParentStudentLinksFromAPI,
    loadAccountantsFromAPI,
    loadUsersFromAPI,
    loadScoresFromAPI,
    loadAffectiveDomainsFromAPI,
    loadPsychomotorDomainsFromAPI,
    loadFeeStructuresFromAPI,
    loadStudentFeeBalancesFromAPI,
    loadNotificationsFromAPI,
    loadAttendancesFromAPI,
    loadExamTimetablesFromAPI,
    loadClassTimetablesFromAPI,
    loadDepartmentsFromAPI,
    loadScholarshipsFromAPI,
    loadAssignmentsFromAPI,
    // Real-time Sync Methods
    refreshAllData: async () => {
      const baseLoads = [
        loadUsersFromAPI(),
        loadTeachersFromAPI(),
        loadParentsFromAPI(),
        loadParentStudentLinksFromAPI(),
        loadAccountantsFromAPI(),
        loadStudentsFromAPI(),
        loadClassesFromAPI(),
        loadSubjectsFromAPI(),
        loadSubjectRegistrationsFromAPI(),
        loadSubjectAssignmentsFromAPI(),
        loadFeeStructuresFromAPI(),
        loadStudentFeeBalancesFromAPI(),
        loadNotificationsFromAPI(),
        loadAttendancesFromAPI(),
        loadExamTimetablesFromAPI(),
        loadClassTimetablesFromAPI(),
        loadDepartmentsFromAPI(),
        loadScholarshipsFromAPI(),
        loadAssignmentsFromAPI(),
      ];

      // Add payments loading only for admin/accountant roles
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'accountant')) {
        baseLoads.push(loadPaymentsFromAPI());
      }

      await Promise.all(baseLoads);
    },
    
    // Teacher-specific refresh methods
    refreshTeacherData: async (teacherId: number) => {
      await Promise.all([
        loadStudentsFromAPI(),
        loadClassesFromAPI(),
        loadSubjectsFromAPI(),
        loadSubjectAssignmentsFromAPI(),
        loadScoresFromAPI(),
        loadAffectiveDomainsFromAPI(),
        loadPsychomotorDomainsFromAPI(),
        loadCompiledResultsFromAPI(),
      ]);
    },
    
    // Class-specific refresh
    refreshClassData: async (classId: number) => {
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
        return await sqlDatabase.checkUserPermission(currentUser.role, permission);
      } catch (error) {
        console.error('Error checking permission:', error);
        return false;
      }
    },
    
    canViewStudents: async (): Promise<boolean> => {
      return await sqlDatabase.checkUserPermission('teacher', 'read_students');
    },
    
    canManageScores: async (): Promise<boolean> => {
      return await sqlDatabase.checkUserPermission('teacher', 'manage_assignments');
    },
    
    canViewResults: async (): Promise<boolean> => {
      return await sqlDatabase.checkUserPermission('teacher', 'view_student_reports');
    },
    
    canManageClasses: async (): Promise<boolean> => {
      return await sqlDatabase.checkUserPermission('teacher', 'manage_classes');
    },
    
    canManageSubjects: async (): Promise<boolean> => {
      return await sqlDatabase.checkUserPermission('teacher', 'manage_subjects');
    },
    
    // Real-time event listeners
    subscribeToDataUpdates: (callback: () => void) => {
      const interval = setInterval(async () => {
        try {
          await loadScoresFromAPI();
          callback();
        } catch (error) {
          console.error('Error in real-time sync:', error);
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
      await loadStudentFeeBalancesFromAPI();
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
    createFeeStructureAPI,
    getFeeStructuresAPI,
    getPaymentsAPI,
    updatePaymentStatusAPI,
    getFeeBalancesAPI,
    createBatchPaymentsAPI,

    // Affective and Psychomotor API Methods
    addAffectiveDomain: async (affectiveData: any) => {
      try {
        const result = await sqlDatabase.createAffectiveDomain(affectiveData);
        toast.success('Affective domain assessment saved');
        return result;
      } catch (error: any) {
        console.error('Error saving affective domain:', error);
        toast.error('Failed to save affective domain assessment');
        throw error;
      }
    },

    updateAffectiveDomain: async (id: number, affectiveData: any) => {
  try {
    const result = await sqlDatabase.updateAffectiveDomain(id, affectiveData);
    toast.success('Affective domain assessment updated');
    return result;
  } catch (error) {
    console.error('Error updating affective domain:', error);
    toast.error('Failed to update affective domain assessment');
    throw error;
  }
},

    // User Management Methods
    checkUserPermissionAPI,
    getPendingApprovals,
    loadCompiledResultsFromAPI
  };

  // Term change detection and auto-refresh
  const handleTermChange = (newTerm: string, newYear: string) => {
    console.log('🔄 Term change detected, updating context:', { newTerm, newYear });
    // Additional term change handling can be added here
  };

  // Use term change detector to automatically refresh data when term changes
  const { isRefreshing } = useTermChangeDetector({
    currentTerm,
    currentAcademicYear,
    onTermChange: handleTermChange,
    refreshAllData: value.refreshAllData
  });

  // Periodic sync to check for server-side term changes
  useTermSync({
    currentTerm,
    currentAcademicYear,
    refreshAllData: value.refreshAllData
  });

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}
