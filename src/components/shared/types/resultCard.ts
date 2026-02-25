export interface StudentResultCardProps {
  result: any;
  student?: any;
  studentClass?: any;
  detailedScores?: any[];
  currentUser?: any;
  showActions?: boolean;
  onApprovePrint?: (resultId: number) => void;
  onDownload?: (resultId: number) => void;
  onPrint?: (resultId: number) => void;
}

export interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId: number;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  parentGuardian?: string;
  status: string;
}

export interface ClassData {
  id: number;
  name: string;
  code: string;
  level: string;
  category: string;
  department?: string;
  description?: string;
  isCore: boolean;
  status: string;
  classTeacherId?: number;
  classTeacher?: string;
  studentCount?: number;
}

export interface SubjectData {
  id: number;
  name: string;
  code: string;
  category: string;
  department?: string;
  description?: string;
  isCore: boolean;
  status: string;
}

export interface TeacherData {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  qualification?: string;
  specialization?: string;
  department?: string;
  employeeId?: string;
  status: string;
}

export interface ScoreData {
  id: number;
  studentId: number;
  assignmentId: number;
  subjectId: number;
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
  grade?: string;
  remark?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: number;
}

export interface CompiledResultData {
  id: number;
  studentId: number;
  classId: number;
  academicYear: string;
  term: string;
  totalScore: number;
  averageScore: number;
  position: number;
  grade: string;
  remark: string;
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    percentage: number;
  };
  affectiveDomain: {
    grade: string;
    remark: string;
  };
  psychomotorDomain: {
    grade: string;
    remark: string;
  };
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  compiledBy?: number;
  compiledAt?: string;
  approvedBy?: number;
  approvedAt?: string;
}

export interface UserData {
  id: number;
  username: string;
  role: 'admin' | 'teacher' | 'parent' | 'accountant';
  linkedId: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  token?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | PaginatedData<T>;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedData<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
