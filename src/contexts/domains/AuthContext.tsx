// AuthContext - Focused auth/domain wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { User, Teacher, Parent, Accountant } from '../../types/school';

interface AuthDomain {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (identity: string, password: string, role: string) => Promise<User | null>;
  studentLogin: (admissionNumber: string, className: string) => Promise<User | null>;
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
  updateTeacher: (id: number, teacher: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: number) => Promise<void>;
  updateParent: (id: number, parent: Partial<Parent>) => Promise<void>;
  deleteParent: (id: number) => Promise<void>;
  updateAccountant: (id: number, accountant: Partial<Accountant>) => Promise<void>;
  deleteAccountant: (id: number) => Promise<void>;
}

const AuthContext = createContext<AuthDomain | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: AuthDomain = {
    currentUser: school.currentUser,
    users: school.users,
    isLoading: school.isLoading,
    login: school.login,
    studentLogin: school.studentLogin,
    logout: school.logout,
    setCurrentUser: school.setCurrentUser,
    changePassword: school.changePassword,
    createUser: school.createUser,
    updateUser: school.updateUser,
    deleteUser: school.deleteUser,
    updateUserStatus: school.updateUserStatus,
    resetUserPassword: school.resetUserPassword,
    getUserPermissions: school.getUserPermissions,
    createUserAPI: school.createUserAPI,
    updateUserAPI: school.updateUserAPI,
    deleteUserAPI: school.deleteUserAPI,
    updateUserStatusAPI: school.updateUserStatusAPI,
    resetUserPasswordAPI: school.resetUserPasswordAPI,
    getUserPermissionsAPI: school.getUserPermissionsAPI,
    checkUserPermissionAPI: school.checkUserPermissionAPI,
    updateTeacher: school.updateTeacher,
    deleteTeacher: school.deleteTeacher,
    updateParent: school.updateParent,
    deleteParent: school.deleteParent,
    updateAccountant: school.updateAccountant,
    deleteAccountant: school.deleteAccountant,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthDomain {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
