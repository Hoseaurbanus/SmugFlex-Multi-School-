// Permissions System for SMugFlex 2.0
// Defines all available permissions and role-based access control

// All available permissions in the system
export const ALL_PERMISSIONS = [
  // User management
  'create_users', 'read_users', 'update_users', 'delete_users',
  
  // Student management
  'create_students', 'read_students', 'update_students', 'delete_students',
  
  // Teacher management
  'create_teachers', 'read_teachers', 'update_teachers', 'delete_teachers',
  
  // Parent management
  'create_parents', 'read_parents', 'update_parents', 'delete_parents',
  
  // Class management
  'manage_classes', 'create_classes', 'read_classes', 'update_classes', 'delete_classes',
  
  // Subject management
  'manage_subjects', 'create_subjects', 'read_subjects', 'update_subjects', 'delete_subjects',
  
  // Fee management
  'manage_fees', 'create_fees', 'read_fees', 'update_fees', 'delete_fees',
  
  // Reports
  'view_reports', 'view_student_reports', 'view_financial_reports',
  
  // Assignments
  'link_students', 'assign_subjects', 'manage_assignments',
  
  // Exams & CBT
  'manage_exams', 'create_exams', 'read_exams', 'update_exams', 'delete_exams',
  
  // Timetable
  'manage_timetable', 'create_timetable', 'read_timetable', 'update_timetable',
  
  // Notifications
  'manage_notifications', 'create_notifications', 'send_notifications',
  
  // Settings
  'manage_settings', 'update_school_settings',
  
  // Attendance
  'manage_attendance', 'mark_attendance', 'read_attendance',
  
  // Results
  'manage_results', 'enter_scores', 'compile_results', 'approve_results',
  
  // Payments
  'manage_payments', 'create_payments', 'verify_payments', 'view_payments',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

// Default permissions for each role
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'create_users', 'read_users', 'update_users', 'delete_users',
    'create_students', 'read_students', 'update_students', 'delete_students',
    'create_teachers', 'read_teachers', 'update_teachers', 'delete_teachers',
    'create_parents', 'read_parents', 'update_parents', 'delete_parents',
    'manage_classes', 'create_classes', 'read_classes', 'update_classes', 'delete_classes',
    'manage_subjects', 'create_subjects', 'read_subjects', 'update_subjects', 'delete_subjects',
    'manage_fees', 'create_fees', 'read_fees', 'update_fees', 'delete_fees',
    'view_reports', 'view_student_reports', 'view_financial_reports',
    'link_students', 'assign_subjects', 'manage_assignments',
    'manage_exams', 'create_exams', 'read_exams', 'update_exams', 'delete_exams',
    'manage_timetable', 'create_timetable', 'read_timetable', 'update_timetable',
    'manage_notifications', 'create_notifications', 'send_notifications',
    'manage_settings', 'update_school_settings',
    'manage_attendance', 'mark_attendance', 'read_attendance',
    'manage_results', 'enter_scores', 'compile_results', 'approve_results',
    'manage_payments', 'create_payments', 'verify_payments', 'view_payments',
  ],
  teacher: [
    'read_students', 'update_students',
    'read_teachers',
    'read_classes', 'update_classes',
    'read_subjects', 'update_subjects',
    'manage_assignments',
    'read_exams', 'create_exams', 'update_exams',
    'read_timetable',
    'manage_attendance', 'mark_attendance', 'read_attendance',
    'enter_scores', 'compile_results',
    'create_notifications',
    'view_student_reports',
  ],
  accountant: [
    'read_students', 'read_teachers', 'read_parents',
    'manage_fees', 'create_fees', 'read_fees', 'update_fees',
    'manage_payments', 'create_payments', 'verify_payments', 'view_payments',
    'view_reports', 'view_financial_reports',
  ],
  parent: [
    'read_students',
    'view_student_reports',
    'read_attendance',
  ],
  student: [
    'read_students',
    'view_student_reports',
    'read_attendance',
    'read_assignments', 'submit_assignments',
  ],
};

/**
 * Check if a role has a specific permission
 * Uses role-based defaults. Can be extended to check database-stored permissions.
 */
export function checkPermission(role: string, permission: string): boolean {
  const rolePermissions = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  return ROLE_DEFAULT_PERMISSIONS[role] || [];
}

/**
 * Check if the current user is a super admin
 */
export function isSuperAdmin(): boolean {
  try {
    const userStr = localStorage.getItem('super_admin_user');
    const token = localStorage.getItem('super_admin_token');
    return !!(userStr && token);
  } catch {
    return false;
  }
}
