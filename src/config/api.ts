/**
 * API Configuration
 * SMugFlex 2.0 Multi-School Management Platform
 */

const DEFAULT_PRODUCTION_API_BASE_URL = 'https://smug.site.gracelandroyalacademy.com.ng/api';

const getApiBaseUrl = () => {
  const configuredBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (isLocal) {
    return `${window.location.origin}/api`;
  }

  return DEFAULT_PRODUCTION_API_BASE_URL;
};

export const API_CONFIG = {
  // Base URL - points the Vercel frontend to the cPanel backend in production
  BASE_URL: getApiBaseUrl(),
  
  // API Version
  VERSION: 'v1',
  
  // Request timeout in milliseconds - increased for slow server
  TIMEOUT: 30000,
  
  // Retry attempts for failed requests
  RETRY_ATTEMPTS: 2,
  
  // Authentication
  AUTH: {
    TOKEN_KEY: 'jwt_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    USER_KEY: 'current_user'
  },
  
  // Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/auth/login',
      STUDENT_LOGIN: '/auth/student-login',
      LOGOUT: '/auth/logout',
      PROFILE: '/auth/profile',
      CHANGE_PASSWORD: '/auth/change-password',
      REFRESH_TOKEN: '/auth/refresh-token'
    },
    
    // Users
    USERS: {
      LIST: '/users',
      DETAIL: (id: number) => `/users/${id}`,
      CREATE: '/users',
      UPDATE: (id: number) => `/users/${id}`,
      DELETE: (id: number) => `/users/${id}`
    },
    
    // Class Teacher Assignments
    CLASS_TEACHER_ASSIGNMENTS: {
      LIST: '/class_teacher_assignments',
      CREATE: '/class_teacher_assignments',
      DELETE: (id: number) => `/class_teacher_assignments?id=${id}`,
      BY_TERM: (academicYear: string, term: string) => `/class_teacher_assignments?academic_year=${academicYear}&term=${term}`
    },
    
    // Students
    STUDENTS: {
      LIST: '/students',
      DETAIL: (id: number) => `/students/${id}`,
      CREATE: '/students',
      UPDATE: (id: number) => `/students/${id}`,
      DELETE: (id: number) => `/students/${id}`,
      BY_CLASS: (classId: number) => `/students/by-class/${classId}`,
      PROMOTE: '/students/promote'
    },
    
    // Teachers
    TEACHERS: {
      LIST: '/teachers',
      DETAIL: (id: number) => `/teachers/${id}`,
      CREATE: '/teachers',
      UPDATE: (id: number) => `/teachers/${id}`,
      DELETE: (id: number) => `/teachers/${id}`,
      ASSIGNMENTS: (id: number) => `/teachers/assignments/${id}`,
      STUDENTS: (id: number) => `/teachers/students/${id}`
    },
    
    // Classes
    CLASSES: {
      LIST: '/classes',
      DETAIL: (id: number) => `/classes/${id}`,
      CREATE: '/classes',
      UPDATE: (id: number) => `/classes/${id}`,
      DELETE: (id: number) => `/classes/${id}`,
      STUDENTS: (id: number) => `/classes/students/${id}`,
      SUBJECTS: (id: number) => `/classes/subjects/${id}`,
      STATISTICS: (id: number) => `/classes/statistics/${id}`,
      BY_LEVEL: (level: string) => `/classes/by-level/${level}`
    },
    
    // Parents
    PARENTS: {
      LIST: '/parents',
      DETAIL: (id: number) => `/parents/${id}`,
      CREATE: '/parents',
      UPDATE: (id: number) => `/parents/${id}`,
      DELETE: (id: number) => `/parents/${id}`,
      CHILDREN: (id: number) => `/parents/children/${id}`,
      LINK: (id: number) => `/parents/link/${id}`,
      UNLINK: (parentId: number, studentId: number) => `/parents/unlink/${parentId}/${studentId}`
    },
    
    // Subjects
    SUBJECTS: {
      LIST: '/subjects',
      DETAIL: (id: number) => `/subjects/${id}`,
      CREATE: '/subjects',
      UPDATE: (id: number) => `/subjects/${id}`,
      DELETE: (id: number) => `/subjects/${id}`,
      BY_CATEGORY: (category: string) => `/subjects/category/${category}`,
      ASSIGNMENTS: '/subjects/assignments',
      ASSIGN: '/subjects/assign',
      UPDATE_ASSIGNMENT: (id: number) => `/subjects/assignment/${id}`,
      DELETE_ASSIGNMENT: (id: number) => `/subjects/assignment/${id}`
    },
    
    // Results
    RESULTS: {
      SCORES: (assignmentId: number) => `/results/scores/${assignmentId}`,
      UPSERT_SCORES: '/results/scores',
      SUBMIT: (assignmentId: number) => `/results/submit/${assignmentId}`,
      STUDENT_RESULTS: (studentId: number) => `/results/student/${studentId}`,
      COMPILE: '/results/compile',
      COMPILED: '/results/compiled',
      PENDING_APPROVALS: '/results/pending-approvals',
      APPROVE: (resultId: number) => `/results/approve/${resultId}`
    },
    
    // Payments
    PAYMENTS: {
      LIST: '/payments',
      DETAIL: (id: number) => `/payments/${id}`,
      CREATE: '/payments',
      VERIFY: (id: number) => `/payments/verify/${id}`,
      STUDENT_HISTORY: (studentId: number) => `/payments/student/${studentId}/history`,
      STUDENT_BALANCE: (studentId: number) => `/payments/student/${studentId}/balance`,
      REPORTS: '/payments/reports'
    },
    
    // Tenant / School Registration
    TENANT: {
      REGISTER: '/schools/register',
      PUBLIC_INFO: '/schools/public-info',
      PROFILE: '/schools/profile',
      LOGO: '/schools/logo',
      CHECK_SUFFIX: '/schools/check-suffix'
    },

    // Super Admin
    SUPER_ADMIN: {
      LOGIN: '/super-admin/login',
      SCHOOLS: '/super-admin/schools',
      SCHOOL_DETAIL: (id: number) => `/super-admin/schools/${id}`,
      PENDING: '/super-admin/schools/pending',
      APPROVE: (id: number) => `/super-admin/schools/${id}/approve`,
      REJECT: (id: number) => `/super-admin/schools/${id}/reject`,
      ACTIVATE: (id: number) => `/super-admin/schools/${id}/activate`,
      DEACTIVATE: (id: number) => `/super-admin/schools/${id}/deactivate`,
      SUSPEND: (id: number) => `/super-admin/schools/${id}/suspend`,
      DELETE: (id: number) => `/super-admin/schools/${id}/delete`,
      EXTEND_ACCESS: (id: number) => `/super-admin/schools/${id}/extend-access`,
      SET_PLAN: (id: number) => `/super-admin/schools/${id}/set-plan`,
      RESET_ADMIN_PASSWORD: (id: number) => `/super-admin/schools/${id}/reset-admin-password`,
      STATS: '/super-admin/stats',
      ACTIVITY_LOGS: '/super-admin/activity-logs',
      EDIT_SCHOOL: (id: number) => `/super-admin/schools/${id}`,
      CREDENTIALS: (id: number) => `/super-admin/schools/${id}/credentials`,
      MODULES: (id: number) => `/super-admin/schools/${id}/modules`,
      CREATE_SCHOOL: '/super-admin/schools',
    },

    // Attendance
    ATTENDANCE: {
      LIST: '/attendance',
      BY_DATE: (date: string) => `/attendance/${date}`,
      MARK: '/attendance',
      STUDENT_SUMMARY: (studentId: number) => `/attendance/student/${studentId}`,
      CLASS_SUMMARY: (classId: number) => `/attendance/class/${classId}`,
      REPORTS: '/attendance/reports'
    },
    
    // Notifications
    NOTIFICATIONS: {
      LIST: '/notifications',
      DETAIL: (id: number) => `/notifications/${id}`,
      CREATE: '/notifications',
      MARK_READ: (id: number) => `/notifications/${id}`,
      DELETE: (id: number) => `/notifications/${id}`,
      UNREAD_COUNT: '/notifications/unread-count',
      USER_NOTIFICATIONS: '/notifications/user',
      BROADCAST: '/notifications/broadcast',
      MARK_ALL_READ: '/notifications/mark-all-read'
    },
    
    // Assignments
    ASSIGNMENTS: {
      LIST: '/assignments',
      DETAIL: (id: number) => `/assignments/${id}`,
      CREATE: '/assignments',
      UPDATE: (id: number) => `/assignments/${id}`,
      DELETE: (id: number) => `/assignments/${id}`,
      SUBMISSIONS: (assignmentId: number) => `/assignments/submissions/${assignmentId}`,
      SUBMIT: (assignmentId: number) => `/assignments/submit/${assignmentId}`,
      GRADE: (submissionId: number) => `/assignments/grade/${submissionId}`
    },
    
    // Reports
    REPORTS: {
      STUDENT_REPORT: '/reports/student',
      CLASS_PERFORMANCE: '/reports/class',
      FINANCIAL: '/reports/financial',
      ATTENDANCE: '/reports/attendance'
    },

    // CBT/Exam
    CBT: {
      EXAMS: '/cbt/exams',
      EXAM_DETAIL: (id: number) => `/cbt/exams/${id}`,
      CREATE_EXAM: '/cbt/exams',
      UPDATE_EXAM: (id: number) => `/cbt/exams/${id}`,
      DELETE_EXAM: (id: number) => `/cbt/exams/${id}`,
      PUBLISH_EXAM: (id: number) => `/cbt/exams/publish/${id}`,
      QUESTIONS: (examId: number) => `/cbt/questions/${examId}`,
      QUESTION_DETAIL: (examId: number, questionId: number) => `/cbt/questions/${examId}/${questionId}`,
      UPDATE_QUESTION: (examId: number, questionId: number) => `/cbt/questions/${examId}/${questionId}`,
      DELETE_QUESTION: (examId: number, questionId: number) => `/cbt/questions/${examId}/${questionId}`,
      REORDER: (examId: number) => `/cbt/questions-reorder/${examId}`,
      QUESTION_BANK: '/cbt/question-bank',
      QUESTION_BANK_ITEM: (id: number) => `/cbt/question-bank/${id}`,
      IMPORT_BANK: (examId: number) => `/cbt/import-bank/${examId}`,
      START_ATTEMPT: (examId: number) => `/cbt/start/${examId}`,
      SAVE_ANSWER: (attemptId: number) => `/cbt/save-answer/${attemptId}`,
      SUBMIT_ATTEMPT: (attemptId: number) => `/cbt/submit/${attemptId}`,
      ATTEMPTS: '/cbt/attempts',
      MY_ATTEMPTS: '/cbt/attempts/mine',
      ATTEMPT_DETAIL: (attemptId: number) => `/cbt/attempts/${attemptId}`,
      STUDENT_EXAMS: '/cbt/student-exams',
      RESULTS: (examId: number) => `/cbt/results/${examId}`,
      FEED_SCORES: (examId: number) => `/cbt/feed-scores/${examId}`,
      DELETE_SCORES: (examId: number) => `/cbt/scores/${examId}`,
      // Question extensions
      BULK_IMPORT: (examId: number) => `/cbt/bulk-import/${examId}`,
      UPLOAD_IMAGE: '/cbt/upload-image',
      GENERATE_QUESTIONS: '/cbt/generate-questions'
    }
  }
};

// Helper function to build full URLs
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

// Helper function to set auth token
export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem(API_CONFIG.AUTH.TOKEN_KEY, token);
  } catch (error) {
    // Silent fail for security
  }
};

// Helper function to remove auth token
export const removeAuthToken = (): void => {
  try {
    localStorage.removeItem(API_CONFIG.AUTH.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.AUTH.REFRESH_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.AUTH.USER_KEY);
    // Legacy key cleanup
    localStorage.removeItem('currentUser');
  } catch (error) {
    // Silent fail for security
  }
};

// Helper function to get current user
export const getCurrentUser = (): any | null => {
  try {
    const userStr = localStorage.getItem(API_CONFIG.AUTH.USER_KEY);
    if (userStr) return JSON.parse(userStr);

    // Legacy fallback (older builds stored current user under a different key)
    const legacyUserStr = localStorage.getItem('currentUser');
    return legacyUserStr ? JSON.parse(legacyUserStr) : null;
  } catch (error) {
    // Clear corrupted data
    localStorage.removeItem(API_CONFIG.AUTH.USER_KEY);
    localStorage.removeItem('currentUser');
    return null;
  }
};

// Helper function to set current user
export const setCurrentUser = (user: any): void => {
  try {
    localStorage.setItem(API_CONFIG.AUTH.USER_KEY, JSON.stringify(user));
    // Keep legacy key in sync so older codepaths don't see stale roles
    localStorage.setItem('currentUser', JSON.stringify(user));
  } catch (error) {
    // Silent fail for security
  }
};

export default API_CONFIG;
