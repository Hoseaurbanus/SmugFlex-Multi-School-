/**
 * API Configuration
 * Graceland Royal Academy School Management System
 */

export const API_CONFIG = {
  // Base URL - change this to match your server
  BASE_URL: (() => {
    if (typeof window === 'undefined') {
      return (import.meta as any).env?.VITE_API_BASE_URL || 'https://gracelandroyalacademy.com.ng/api';
    }

    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (isLocal) {
      return `${window.location.origin}/api`;
    }

    return (import.meta as any).env?.VITE_API_BASE_URL || `${window.location.origin}/api`;
  })(),
  
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
