import { Settings, User, Pencil, Trash2, Eye, Plus, FileText, Search, Key, UserMinus, UserCheck } from 'lucide-react';
import { useState, useEffect, useMemo } from "react";
import { CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
// @ts-ignore - TypeScript language service caching issue
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Teacher, Parent, Accountant, User as UserType } from "../../types/school";
import { useSchool } from "../../contexts/SchoolContext";
import { User as UserIcon } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { CreateUserSheet } from "./manage-users/CreateUserSheet";
import { EditUserDialog } from "./manage-users/EditUserDialog";
import { ViewUserDialog } from "./manage-users/ViewUserDialog";
import { ResetPasswordDialog, DeactivateDialog, DeleteUserDialog } from "./manage-users/ConfirmationDialogs";

export function ManageUsersPage() {
  const { users, teachers, parents, accountants, classes, setTeachers, setParents, setAccountants, createUserAPI, updateUserAPI, deleteUserAPI, updateUserStatusAPI, resetUserPasswordAPI, loadUsersFromAPI, loadTeachersFromAPI, loadParentsFromAPI, loadAccountantsFromAPI, deleteTeacherAPI, deleteParentAPI, deleteAccountantAPI, updateTeacherStatusAPI, updateParentStatusAPI, updateAccountantStatusAPI } = useSchool();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [_activeTab, setActiveTab] = useState("users");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Teacher dialogs
  const [_showTeacherViewDialog, setShowTeacherViewDialog] = useState(false);
  const [_showTeacherEditDialog, setShowTeacherEditDialog] = useState(false);
  
  // Parent dialogs
  const [_showParentViewDialog, setShowParentViewDialog] = useState(false);
  const [_showParentEditDialog, setShowParentEditDialog] = useState(false);
  
  // Accountant dialogs
  const [_showAccountantViewDialog, setShowAccountantViewDialog] = useState(false);
  const [_showAccountantEditDialog, setShowAccountantEditDialog] = useState(false);
  const [showDeleteTeacherDialog, setShowDeleteTeacherDialog] = useState(false);
  const [showDeleteParentDialog, setShowDeleteParentDialog] = useState(false);
  const [showDeleteAccountantDialog, setShowDeleteAccountantDialog] = useState(false);
  const [deleteTeacherTarget, setDeleteTeacherTarget] = useState<Teacher | null>(null);
  const [deleteParentTarget, setDeleteParentTarget] = useState<Parent | null>(null);
  const [deleteAccountantTarget, setDeleteAccountantTarget] = useState<Accountant | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [_selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [_selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [_selectedAccountant, setSelectedAccountant] = useState<Accountant | null>(null);
  const [resetViaEmail, setResetViaEmail] = useState(true);
  const [resetViaSMS, setResetViaSMS] = useState(false);
  const [_resetParentToDefault, setResetParentToDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherActionLoading, setTeacherActionLoading] = useState<string | null>(null);
  const [_parentActionLoading, _setParentActionLoading] = useState<string | null>(null);
  const [_accountantActionLoading, _setAccountantActionLoading] = useState<string | null>(null);

  // Form states
  const [createFormData, setCreateFormData] = useState({
    username: '',
    password: '',
    role: 'teacher',
    linkedId: 0,
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    occupation: '',
    status: 'Active',
    // Teacher specific fields
    gender: '',
    qualification: '',
    specialization: [] as string[],
    isClassTeacher: false,
    assignedClassId: null as number | null,
    departmentId: '',
    // Parent specific fields
    alternatePhone: '',
    // Accountant specific fields
    department: ''
  });
  
  const [createUsernameValidation, setCreateUsernameValidation] = useState<{
    isValid: boolean;
    message: string;
    isChecking: boolean;
  }>({ isValid: true, message: '', isChecking: false });

  const checkCreateUsernameAvailability = (username: string) => {
    if (!username.trim()) {
      setCreateUsernameValidation({ isValid: true, message: '', isChecking: false });
      return;
    }
    setCreateUsernameValidation({ isValid: false, message: 'Checking...', isChecking: true });
    const normalized = username.trim().toLowerCase();
    const exists = (users || []).some((u: any) => String(u?.username || '').toLowerCase() === normalized);
    if (exists) {
      setCreateUsernameValidation({ isValid: false, message: 'Username already taken', isChecking: false });
    } else {
      setCreateUsernameValidation({ isValid: true, message: 'Username available', isChecking: false });
    }
  };

  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    role: 'teacher' as 'admin' | 'teacher' | 'accountant' | 'parent',
    status: 'Active' as 'Active' | 'Inactive',
    first_name: '',
    last_name: '',
    other_name: '',
    phone: '',
    employee_id: '',
    department: '',
    address: '',
    gender: '',
    qualification: '',
    specialization: [] as string[],
    isClassTeacher: false,
    assignedClassId: null as number | null,
    departmentId: '',
    alternatePhone: '',
    occupation: ''
  });

  // Load all data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadUsersFromAPI(),
          loadTeachersFromAPI(),
          loadParentsFromAPI(),
          loadAccountantsFromAPI()
        ]);
      } catch (error) {
        toast.error('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  const getUserFullName = (user: any): string => {
    const anyUser = user as any;
    const dn = (anyUser?.display_name || '').toString().trim();
    if (dn) return dn;
    const parts = [anyUser?.first_name, anyUser?.other_name, anyUser?.last_name]
      .map((p: any) => (p ?? '').toString().trim())
      .filter(Boolean);
    return parts.length ? parts.join(' ') : (user.username || '');
  };

  const handleRoleNav = (role: string) => {
    setActiveTab('users');
    setFilterRole(role);
  };

  // Filter users - optimized with useMemo
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    return users.filter((user: UserType) => {
      const s = (searchTerm || '').toLowerCase().trim();
      const name = ((user as any).display_name || `${(user as any).first_name || ''} ${(user as any).last_name || ''}` || user.username || '').toString().toLowerCase();
      const email = (user.email || '').toString().toLowerCase();
      const phone = (((user as any).phone ?? '') as any).toString().toLowerCase();

      const matchesSearch = !s || name.includes(s) || email.includes(s) || phone.includes(s);
      
      const matchesRole = filterRole === "all" || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  }, [filteredUsers.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Filter teachers - optimized with useMemo
  const _filteredTeachers = useMemo(() => {
    if (!teachers || teachers.length === 0) return [];
    
    return teachers.filter(teacher => {
      const matchesSearch = 
        (teacher.firstName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (teacher.lastName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (teacher.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (teacher.employeeId?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      return matchesSearch;
    });
  }, [teachers, searchTerm]);

  // Filter parents - optimized with useMemo
  const _filteredParents = useMemo(() => {
    if (!parents || parents.length === 0) return [];
    
    return parents.filter(parent => {
      const matchesSearch = 
        (parent.firstName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (parent.lastName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (parent.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (parent.phone?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      return matchesSearch;
    });
  }, [parents, searchTerm]);

  // Filter accountants - optimized with useMemo
  const _filteredAccountants = useMemo(() => {
    if (!accountants || accountants.length === 0) return [];
    
    return accountants.filter(accountant => {
      const matchesSearch = 
        (accountant.firstName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (accountant.lastName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (accountant.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (accountant.employeeId?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      return matchesSearch;
    });
  }, [accountants, searchTerm]);

  // Statistics calculations - optimized with useMemo
  const stats = useMemo(() => {
    const totalUsers = users?.length || 0;
    const totalTeachers = teachers?.length || 0;
    const totalParents = parents?.length || 0;
    const totalAccountants = accountants?.length || 0;
    const activeUsers = users?.filter(user => user.status === 'Active').length || 0;
    const inactiveUsers = users?.filter(user => user.status === 'Inactive').length || 0;
    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admin: users?.filter((u: UserType) => u.role === 'admin').length || 0,
        teacher: users?.filter((u: UserType) => u.role === 'teacher').length || 0,
        accountant: users?.filter((u: UserType) => u.role === 'accountant').length || 0,
        parent: users?.filter((u: UserType) => u.role === 'parent').length || 0,
      },
      teachers: {
        total: totalTeachers,
        active: teachers?.filter(t => t.status === 'Active').length || 0,
        inactive: teachers?.filter(t => t.status === 'Inactive').length || 0,
      },
      parents: {
        total: totalParents,
        active: parents?.filter(p => p.status === 'Active').length || 0,
        inactive: parents?.filter(p => p.status === 'Inactive').length || 0,
      },
      accountants: {
        total: totalAccountants,
        active: accountants?.filter(a => a.status === 'Active').length || 0,
        inactive: accountants?.filter(a => a.status === 'Inactive').length || 0,
      }
    };
  }, [users, teachers, parents, accountants]);

  // Handler functions
  const handleResetPassword = async (user: UserType) => {
    setSelectedUser(user);
    setResetParentToDefault(false);
    setShowResetDialog(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const requestedPassword = selectedUser.role === 'parent' ? 'parent123' : undefined;

      const newPassword = await resetUserPasswordAPI(selectedUser.id, requestedPassword);
      
      if (newPassword) {
        const _method = resetViaEmail && resetViaSMS 
          ? "Email & SMS" 
          : resetViaEmail 
          ? "Email" 
          : resetViaSMS 
          ? "SMS" 
          : "not sent";
        
        toast.success(
          `Password reset successfully for ${selectedUser.username}`
        );
      }
    } catch (error) {
      toast.error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setShowResetDialog(false);
      setSelectedUser(null);
    }
  };

  const handleDeactivate = (user: UserType) => {
    setSelectedUser(user);
    setShowDeactivateDialog(true);
  };

  const confirmDeactivate = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      const currentStatus = selectedUser.status;
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await updateUserStatusAPI(selectedUser.id, newStatus);

      setShowDeactivateDialog(false);
      setSelectedUser(null);

      toast.success(`User ${selectedUser.username} ${newStatus.toLowerCase()}d successfully`);
    } catch (error) {
      toast.error(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: UserType) => {
    setSelectedUser(user);
    const anyUser = user as any;
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role as 'admin' | 'teacher' | 'accountant' | 'parent',
      status: user.status,
      first_name: anyUser.first_name || '',
      last_name: anyUser.last_name || '',
      other_name: anyUser.other_name || '',
      phone: anyUser.phone || '',
      employee_id: anyUser.employee_id || '',
      department: anyUser.department || '',
      address: anyUser.address || '',
      gender: anyUser.gender || '',
      qualification: anyUser.qualification || '',
      specialization: anyUser.specialization || [],
      isClassTeacher: anyUser.isClassTeacher || false,
      assignedClassId: anyUser.assignedClassId || null,
      departmentId: anyUser.departmentId || '',
      alternatePhone: anyUser.alternatePhone || '',
      occupation: anyUser.occupation || ''
    });
    setShowEditDialog(true);
  };

  const handleDelete = (user: UserType) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      await deleteUserAPI(selectedUser.id);

      // Close dialogs first
      setShowDeleteDialog(false);
      setSelectedUser(null);
      
      toast.success(`User ${selectedUser.username} deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // The API function already handles reloading on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (user: UserType) => {
    setSelectedUser(user);
    setShowViewDialog(true);
  };

  const _handleResendCredentials = (user: UserType) => {
    toast.success(`Credentials resent to ${user.email}`);
  };

  const _handleBulkImport = () => {
    toast.info("CSV import functionality");
  };

  const handleExport = () => {
    toast.success("User list exported");
  };

  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  const confirmCreateUser = async () => {
    if (!createFormData.username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!createFormData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!createFormData.lastName.trim()) {
      toast.error('Last name is required');
      return;
    }
    if (!createFormData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (createFormData.role === 'teacher' && !createFormData.gender) {
      toast.error('Gender is required for teachers');
      return;
    }
    if (createFormData.role === 'parent') {
      if (!createFormData.address.trim()) {
        toast.error('Address is required for parents');
        return;
      }
      if (!createFormData.occupation.trim()) {
        toast.error('Occupation is required for parents');
        return;
      }
    }
    setIsLoading(true);
    try {
      const newUser = await createUserAPI(createFormData as any);
      if (!newUser || !(newUser as any).id) {
        throw new Error('User was not created');
      }

      // Close dialog and reset form
      setShowCreateDialog(false);
      setCreateFormData({
        username: '',
        password: '',
        role: 'teacher',
        linkedId: 0,
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        occupation: '',
        status: 'Active',
        gender: '',
        qualification: '',
        specialization: [] as string[],
        isClassTeacher: false,
        assignedClassId: null as number | null,
        departmentId: '',
        alternatePhone: '',
        department: ''
      });
      setCreateUsernameValidation({ isValid: true, message: '', isChecking: false });
      
      // Show success toast
      toast.success("User created successfully");
      
      // The API function already reloads users, no need to call again
    } catch (error) {
      toast.error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEditUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      await updateUserAPI(selectedUser.id, editFormData);

      // Close dialogs first
      setShowEditDialog(false);
      setSelectedUser(null);
      
      // Show success toast
      toast.success("User updated successfully");
      
      // The API function already reloads users, no need to call again
    } catch (error) {
      toast.error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // The API function already handles reloading on error
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-[#EF4444]";
      case "teacher": return "bg-[#0A2540]";
      case "accountant": return "bg-[#F59E0B]";
      case "parent": return "bg-[#10B981]";
      default: return "bg-[#C0C8D3]";
    }
  };

  // Handler functions for teachers, parents, and accountants
  const _handleViewTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherViewDialog(true);
  };

  const _handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherEditDialog(true);
  };

  const _handleDeleteTeacher = (teacher: Teacher) => {
    setDeleteTeacherTarget(teacher);
    setShowDeleteTeacherDialog(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!deleteTeacherTarget) return;
    setTeacherActionLoading(`delete-${deleteTeacherTarget.id}`);
    try {
      const success = await deleteTeacherAPI(Number(deleteTeacherTarget.id));
      if (success) {
        toast.success(`Teacher ${deleteTeacherTarget.firstName} ${deleteTeacherTarget.lastName} deleted successfully`);
      }
    } catch (error) {
      toast.error('Failed to delete teacher');
    } finally {
      setTeacherActionLoading(null);
      setShowDeleteTeacherDialog(false);
      setDeleteTeacherTarget(null);
    }
  };

  const _handleViewParent = (parent: Parent) => {
    setSelectedParent(parent);
    setShowParentViewDialog(true);
  };

  const _handleEditParent = (parent: Parent) => {
    setSelectedParent(parent);
    setShowParentEditDialog(true);
  };

  const _handleDeleteParent = (parent: Parent) => {
    setDeleteParentTarget(parent);
    setShowDeleteParentDialog(true);
  };

  const confirmDeleteParent = async () => {
    if (!deleteParentTarget) return;
    try {
      const success = await deleteParentAPI(deleteParentTarget.id);
      if (success) {
        toast.success(`Parent ${deleteParentTarget.firstName} ${deleteParentTarget.lastName} deleted successfully`);
      }
    } catch (error) {
      toast.error('Failed to delete parent');
    } finally {
      setShowDeleteParentDialog(false);
      setDeleteParentTarget(null);
    }
  };

  const _handleViewAccountant = (accountant: Accountant) => {
    setSelectedAccountant(accountant);
    setShowAccountantViewDialog(true);
  };

  const _handleEditAccountant = (accountant: Accountant) => {
    setSelectedAccountant(accountant);
    setShowAccountantEditDialog(true);
  };

  const _handleDeleteAccountant = (accountant: Accountant) => {
    setDeleteAccountantTarget(accountant);
    setShowDeleteAccountantDialog(true);
  };

  const confirmDeleteAccountant = async () => {
    if (!deleteAccountantTarget) return;
    try {
      const success = await deleteAccountantAPI(deleteAccountantTarget.id);
      if (success) {
        toast.success(`Accountant ${deleteAccountantTarget.firstName} ${deleteAccountantTarget.lastName} deleted successfully`);
      }
    } catch (error) {
      toast.error('Failed to delete accountant');
    } finally {
      setShowDeleteAccountantDialog(false);
      setDeleteAccountantTarget(null);
    }
  };

  // Status toggle handlers
  const _handleToggleTeacherStatus = async (teacher: Teacher) => {
    const newStatus = teacher.status === 'Active' ? 'Inactive' : 'Active';
    const actionKey = `status-${teacher.id}`;
    
    setTeacherActionLoading(actionKey);
    
    // Optimistic update - update UI immediately
    setTeachers(teachers.map(t => 
      t.id === teacher.id 
        ? { ...t, status: newStatus }
        : t
    ));
    
    try {
      const success = await updateTeacherStatusAPI(Number(teacher.id), newStatus);
      if (success) {
        toast.success(`Teacher ${teacher.firstName} ${teacher.lastName} status updated to ${newStatus}`);
      } else {
        // Revert on failure
        setTeachers(teachers.map(t => 
          t.id === teacher.id 
            ? { ...t, status: teacher.status }
            : t
        ));
        toast.error('Failed to update teacher status');
      }
    } catch (error) {
      // Revert on error
      setTeachers(teachers.map(t => 
        t.id === teacher.id 
          ? { ...t, status: teacher.status }
          : t
      ));
      toast.error('Failed to update teacher status');
    } finally {
      setTeacherActionLoading(null);
    }
  };

  const _handleToggleParentStatus = async (parent: Parent) => {
    const newStatus = parent.status === 'Active' ? 'Inactive' : 'Active';
    
    // Optimistic update - update UI immediately
    setParents(parents.map(p => 
      p.id === parent.id 
        ? { ...p, status: newStatus }
        : p
    ));
    
    try {
      const success = await updateParentStatusAPI(parent.id, newStatus);
      if (success) {
        toast.success(`Parent ${parent.firstName} ${parent.lastName} status updated to ${newStatus}`);
      } else {
        // Revert on failure
        setParents(parents.map(p => 
          p.id === parent.id 
            ? { ...p, status: parent.status }
            : p
        ));
        toast.error('Failed to update parent status');
      }
    } catch (error) {
      // Revert on error
      setParents(parents.map(p => 
        p.id === parent.id 
          ? { ...p, status: parent.status }
          : p
      ));
      toast.error('Failed to update parent status');
    }
  };

  const _handleToggleAccountantStatus = async (accountant: Accountant) => {
    const newStatus = accountant.status === 'Active' ? 'Inactive' : 'Active';
    
    // Optimistic update - update UI immediately
    setAccountants(accountants.map(a => 
      a.id === accountant.id 
        ? { ...a, status: newStatus }
        : a
    ));
    
    try {
      const success = await updateAccountantStatusAPI(accountant.id, newStatus);
      if (success) {
        toast.success(`Accountant ${accountant.firstName} ${accountant.lastName} status updated to ${newStatus}`);
      } else {
        // Revert on failure
        setAccountants(accountants.map(a => 
          a.id === accountant.id 
            ? { ...a, status: accountant.status }
            : a
        ));
        toast.error('Failed to update accountant status');
      }
    } catch (error) {
      // Revert on error
      setAccountants(accountants.map(a => 
        a.id === accountant.id 
          ? { ...a, status: accountant.status }
          : a
      ));
      toast.error('Failed to update accountant status');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2540] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading user data...</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900">User Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Create and manage system users with role-based access</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={handleCreateUser}
            className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl w-full sm:w-auto flex items-center gap-2"
            size="sm"
            disabled={isLoading}
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">New User</span>
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-xl w-full sm:w-auto flex items-center gap-2"
            size="sm"
            disabled={isLoading}
            type="button"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="section-band border-[#0A2540]/20 bg-[#0A2540]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#0A2540] text-xs font-medium">Total Users</p>
                <p className="text-lg font-bold text-[#0A2540]">{stats.users.total}</p>
              </div>
              <UserIcon className="w-6 h-6 text-[#0A2540]" />
            </div>
          </CardContent>
        </div>
        
        <div className="section-band border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 text-xs font-medium">Active Users</p>
                <p className="text-lg font-bold text-emerald-900">{stats.users.active}</p>
              </div>
              <span className="w-6 h-6 text-emerald-500" />
            </div>
          </CardContent>
        </div>
        
        <div className="section-band border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-xs font-medium">Inactive Users</p>
                <p className="text-lg font-bold text-orange-900">{stats.users.inactive}</p>
              </div>
              <Settings className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </div>
        
        <div className="section-band border-[#0A2540]/20 bg-[#0A2540]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#0A2540] text-xs font-medium">Admin Users</p>
                <p className="text-lg font-bold text-[#0A2540]">{stats.users.admin}</p>
              </div>
              <Settings className="w-6 h-6 text-[#0A2540]" />
            </div>
          </CardContent>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          onClick={() => handleRoleNav('all')}
          variant={filterRole === 'all' ? 'default' : 'outline'}
          className="rounded-xl"
          type="button"
        >
          All ({stats.users.total})
        </Button>
        <Button
          onClick={() => handleRoleNav('teacher')}
          variant={filterRole === 'teacher' ? 'default' : 'outline'}
          className="rounded-xl"
          type="button"
        >
          Teachers ({stats.users.teacher})
        </Button>
        <Button
          onClick={() => handleRoleNav('parent')}
          variant={filterRole === 'parent' ? 'default' : 'outline'}
          className="rounded-xl"
          type="button"
        >
          Parents ({stats.users.parent})
        </Button>
        <Button
          onClick={() => handleRoleNav('accountant')}
          variant={filterRole === 'accountant' ? 'default' : 'outline'}
          className="rounded-xl"
          type="button"
        >
          Accountants ({stats.users.accountant})
        </Button>
      </div>

      {/* Users Table - Always show users filtered by role buttons */}
      <div className="space-y-4">

        {/* Filters */}
        <div className="section-band border-gray-100">
            <CardContent className="p-6">
            {/* Search only - role filter handled by navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-[#0A2540] focus:ring-[#0A2540]/20"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <span className="bg-gray-100 px-3 py-2 rounded-lg">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </CardContent>
        </div>

          {/* Users Table - Desktop */}
        <div className="section-band border-gray-100 hidden lg:block">
          <CardHeader className="border-b border-gray-100">
            <h3 className="text-lg font-heading font-semibold text-gray-900">Users ({filteredUsers.length})</h3>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700">User</TableHead>
                      <TableHead className="text-gray-700">Role</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700">Last Login</TableHead>
                      <TableHead className="text-gray-700 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No users found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((user: UserType) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {getUserFullName(user)}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}{(user as any).phone ? ` • ${(user as any).phone}` : ''}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRoleBadgeColor(user.role)} text-white border-0 capitalize text-xs`}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={user.status === "Active" ? "bg-emerald-100 text-emerald-800 border-0 text-xs" : "bg-red-100 text-red-800 border-0 text-xs"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-xs">
                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleView(user); }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="View Details"
                                type="button"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(user); }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="Edit User"
                                type="button"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResetPassword(user); }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="Reset Password"
                                type="button"
                              >
                                <Key className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeactivate(user); }}
                                size="sm"
                                variant={user.status === 'Active' ? 'outline' : 'default'}
                                className={`h-8 w-8 p-0 ${user.status === 'Active' ? 'border-gray-300 hover:bg-gray-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                                type="button"
                              >
                                {user.status === 'Active' ? <UserMinus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              </Button>
                              <Button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(user); }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-600 border-red-300 hover:bg-red-50"
                                title="Delete User"
                                type="button"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredUsers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(filteredUsers.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredUsers.length, currentPage * pageSize)} of {filteredUsers.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) || 20)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                        <SelectItem value="100">100 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-gray-700 min-w-[90px] text-center">
                      Page {currentPage} / {totalPages}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {/* Users Card View - Mobile */}
          <div className="section-band border-gray-100 block lg:hidden">
            <CardHeader className="border-b border-gray-100 px-4 py-3 sm:p-6">
              <h3 className="text-lg font-heading font-semibold text-gray-900">Users ({filteredUsers.length})</h3>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found matching your criteria
                </div>
              ) : (
                paginatedUsers.map((user: UserType) => (
                  <div key={user.id} className="border border-gray-100 rounded-xl bg-white">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {getUserFullName(user)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {user.email}{(user as any).phone ? ` • ${(user as any).phone}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge className={`${getRoleBadgeColor(user.role)} text-white border-0 capitalize text-xs`}>
                            {user.role}
                          </Badge>
                          <Badge className={user.status === "Active" ? "bg-emerald-100 text-emerald-800 border-0 text-xs" : "bg-red-100 text-red-800 border-0 text-xs"}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleView(user); }}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                          title="View Details"
                          type="button"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(user); }}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                          title="Edit User"
                          type="button"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResetPassword(user); }}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                          title="Reset Password"
                          type="button"
                        >
                          <Key className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeactivate(user); }}
                          size="sm"
                          variant={user.status === 'Active' ? 'outline' : 'default'}
                          className={`h-8 w-8 p-0 ${user.status === 'Active' ? 'border-gray-300 hover:bg-gray-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                          title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          type="button"
                        >
                          {user.status === 'Active' ? <UserMinus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        </Button>
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(user); }}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 border-red-300 hover:bg-red-50"
                          title="Delete User"
                          type="button"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                ))
              )}
              {filteredUsers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(filteredUsers.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredUsers.length, currentPage * pageSize)} of {filteredUsers.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) || 20)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                        <SelectItem value="100">100 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-gray-700 min-w-[90px] text-center">
                      Page {currentPage} / {totalPages}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
      </div>

      {/* Create User Sheet - Mobile-first full screen design */}
      <CreateUserSheet
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        formData={createFormData}
        onFormDataChange={setCreateFormData}
        usernameValidation={createUsernameValidation}
        isLoading={isLoading}
        classes={classes}
        onCreate={confirmCreateUser}
        onCheckUsername={checkCreateUsernameAvailability}
      />

      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        selectedUser={selectedUser as any}
        formData={editFormData as any}
        onFormDataChange={setEditFormData as any}
        isLoading={isLoading}
        getUserFullName={getUserFullName}
        getRoleBadgeColor={getRoleBadgeColor}
        onUpdate={confirmEditUser}
      />

      <ResetPasswordDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        username={selectedUser?.username || ''}
        resetViaEmail={resetViaEmail}
        resetViaSMS={resetViaSMS}
        isLoading={isLoading}
        onEmailChange={setResetViaEmail}
        onSMSChange={setResetViaSMS}
        onConfirm={confirmResetPassword}
      />

      <DeactivateDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        userStatus={selectedUser?.status || ''}
        username={selectedUser?.username || ''}
        isLoading={isLoading}
        onConfirm={confirmDeactivate}
      />

      <DeleteUserDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        username={selectedUser?.username || ''}
        role={selectedUser?.role || ''}
        isLoading={isLoading}
        onConfirm={confirmDelete}
      />

      {/* Delete Teacher Dialog */}
      <AlertDialog open={showDeleteTeacherDialog} onOpenChange={setShowDeleteTeacherDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete teacher {deleteTeacherTarget?.firstName} {deleteTeacherTarget?.lastName}? This action cannot be undone.
              <br /><br />
              <strong>Warning:</strong> This will permanently remove the teacher and all their associated data including subject assignments and class associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={teacherActionLoading === `delete-${deleteTeacherTarget?.id}`}>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmDeleteTeacher}
              disabled={teacherActionLoading === `delete-${deleteTeacherTarget?.id}`}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {teacherActionLoading === `delete-${deleteTeacherTarget?.id}` ? 'Deleting...' : 'Delete Teacher'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Parent Dialog */}
      <AlertDialog open={showDeleteParentDialog} onOpenChange={setShowDeleteParentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete parent {deleteParentTarget?.firstName} {deleteParentTarget?.lastName}? This action cannot be undone.
              <br /><br />
              <strong>Warning:</strong> This will permanently remove the parent and all their associated data including student links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmDeleteParent}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Parent
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Accountant Dialog */}
      <AlertDialog open={showDeleteAccountantDialog} onOpenChange={setShowDeleteAccountantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Accountant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete accountant {deleteAccountantTarget?.firstName} {deleteAccountantTarget?.lastName}? This action cannot be undone.
              <br /><br />
              <strong>Warning:</strong> This will permanently remove the accountant and all their associated financial data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmDeleteAccountant}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Accountant
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewUserDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        selectedUser={selectedUser as any}
      />
    </div>
  );
}
