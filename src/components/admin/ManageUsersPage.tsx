import { Settings, Calculator, GraduationCap, KeyRound, User, CheckCircle, Edit, Trash2, Eye, Plus, Download, FileText, Search, Key, UserX, UserCheck } from 'lucide-react';
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
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
  AlertDialogAction,
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
import { Switch } from "../ui/switch";
import { useSchool, Teacher, Parent, Accountant, User as UserType } from "../../contexts/SchoolContext";
import { User as UserIcon } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function ManageUsersPage() {
  const { users, teachers, parents, accountants, classes, setUsers, setTeachers, setParents, setAccountants, createUserAPI, updateUserAPI, deleteUserAPI, updateUserStatusAPI, resetUserPasswordAPI, loadUsersFromAPI, loadTeachersFromAPI, loadParentsFromAPI, loadAccountantsFromAPI, deleteTeacherAPI, deleteParentAPI, deleteAccountantAPI, updateTeacherStatusAPI, updateParentStatusAPI, updateAccountantStatusAPI } = useSchool();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Teacher dialogs
  const [showTeacherViewDialog, setShowTeacherViewDialog] = useState(false);
  const [showTeacherEditDialog, setShowTeacherEditDialog] = useState(false);
  
  // Parent dialogs
  const [showParentViewDialog, setShowParentViewDialog] = useState(false);
  const [showParentEditDialog, setShowParentEditDialog] = useState(false);
  
  // Accountant dialogs
  const [showAccountantViewDialog, setShowAccountantViewDialog] = useState(false);
  const [showAccountantEditDialog, setShowAccountantEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [selectedAccountant, setSelectedAccountant] = useState<Accountant | null>(null);
  const [resetViaEmail, setResetViaEmail] = useState(true);
  const [resetViaSMS, setResetViaSMS] = useState(false);
  const [resetParentToDefault, setResetParentToDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherActionLoading, setTeacherActionLoading] = useState<string | null>(null);
  const [parentActionLoading, setParentActionLoading] = useState<string | null>(null);
  const [accountantActionLoading, setAccountantActionLoading] = useState<string | null>(null);

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

  const getUserFullName = (user: UserType): string => {
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
  const filteredTeachers = useMemo(() => {
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
  const filteredParents = useMemo(() => {
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
  const filteredAccountants = useMemo(() => {
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
        const method = resetViaEmail && resetViaSMS 
          ? "Email & SMS" 
          : resetViaEmail 
          ? "Email" 
          : resetViaSMS 
          ? "SMS" 
          : "not sent";
        
        toast.success(
          `Password reset successfully for ${selectedUser.username}. New password: ${newPassword}`
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
      role: user.role,
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

  const handleResendCredentials = (user: UserType) => {
    toast.success(`Credentials resent to ${user.email}`);
  };

  const handleBulkImport = () => {
    toast.info("CSV import functionality");
  };

  const handleExport = () => {
    toast.success("User list exported");
  };

  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  const confirmCreateUser = async () => {
    setIsLoading(true);
    try {
      const newUser = await createUserAPI(createFormData);
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
      case "admin": return "bg-[#DC3545]";
      case "teacher": return "bg-[#1E90FF]";
      case "accountant": return "bg-[#FFC107]";
      case "parent": return "bg-[#28A745]";
      default: return "bg-[#C0C8D3]";
    }
  };

  // Handler functions for teachers, parents, and accountants
  const handleViewTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherViewDialog(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherEditDialog(true);
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (window.confirm(`Are you sure you want to delete teacher ${teacher.firstName} ${teacher.lastName}? This action cannot be undone.`)) {
      setTeacherActionLoading(`delete-${teacher.id}`);
      try {
        const success = await deleteTeacherAPI(Number(teacher.id));
        if (success) {
          toast.success(`Teacher ${teacher.firstName} ${teacher.lastName} deleted successfully`);
          // Data will automatically refresh due to API call
        }
      } catch (error) {
        toast.error('Failed to delete teacher');
      } finally {
        setTeacherActionLoading(null);
      }
    }
  };

  const handleViewParent = (parent: Parent) => {
    setSelectedParent(parent);
    setShowParentViewDialog(true);
  };

  const handleEditParent = (parent: Parent) => {
    setSelectedParent(parent);
    setShowParentEditDialog(true);
  };

  const handleDeleteParent = async (parent: Parent) => {
    if (window.confirm(`Are you sure you want to delete parent ${parent.firstName} ${parent.lastName}? This action cannot be undone.`)) {
      try {
        const success = await deleteParentAPI(parent.id);
        if (success) {
          toast.success(`Parent ${parent.firstName} ${parent.lastName} deleted successfully`);
          // Data will automatically refresh due to API call
        }
      } catch (error) {
        toast.error('Failed to delete parent');
      }
    }
  };

  const handleViewAccountant = (accountant: Accountant) => {
    setSelectedAccountant(accountant);
    setShowAccountantViewDialog(true);
  };

  const handleEditAccountant = (accountant: Accountant) => {
    setSelectedAccountant(accountant);
    setShowAccountantEditDialog(true);
  };

  const handleDeleteAccountant = async (accountant: Accountant) => {
    if (window.confirm(`Are you sure you want to delete accountant ${accountant.firstName} ${accountant.lastName}? This action cannot be undone.`)) {
      try {
        const success = await deleteAccountantAPI(accountant.id);
        if (success) {
          toast.success(`Accountant ${accountant.firstName} ${accountant.lastName} deleted successfully`);
          // Data will automatically refresh due to API call
        }
      } catch (error) {
        toast.error('Failed to delete accountant');
      }
    }
  };

  // Status toggle handlers
  const handleToggleTeacherStatus = async (teacher: Teacher) => {
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

  const handleToggleParentStatus = async (parent: Parent) => {
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

  const handleToggleAccountantStatus = async (accountant: Accountant) => {
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
    <div className="p-6 space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading user data...</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Create and manage system users with role-based access</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={handleCreateUser}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-full sm:w-auto flex items-center gap-2"
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-xs font-medium">Total Users</p>
                <p className="text-lg font-bold text-blue-900">{stats.users.total}</p>
              </div>
              <UserIcon className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-xs font-medium">Active Users</p>
                <p className="text-lg font-bold text-green-900">{stats.users.active}</p>
              </div>
              <span className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-xs font-medium">Inactive Users</p>
                <p className="text-lg font-bold text-orange-900">{stats.users.inactive}</p>
              </div>
              <Settings className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-xs font-medium">Admin Users</p>
                <p className="text-lg font-bold text-purple-900">{stats.users.admin}</p>
              </div>
              <Settings className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
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
        <Card className="border-gray-200">
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
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-3 flex items-center justify-center text-sm text-gray-500">
              <span className="bg-gray-100 px-3 py-2 rounded-lg">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </CardContent>
        </Card>

          {/* Users Table */}
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Users ({filteredUsers.length})</h3>
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
                            <Badge className={user.status === "Active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-red-100 text-red-800 border-0 text-xs"}>
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
                                <Edit className="w-3 h-3" />
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
                                className={`h-8 w-8 p-0 ${user.status === 'Active' ? 'border-gray-300 hover:bg-gray-100' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                                type="button"
                              >
                                {user.status === 'Active' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
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
          </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new system user with role-based access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={createFormData.username}
                onChange={(e) => setCreateFormData({...createFormData, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                placeholder={`Default: ${createFormData.role}123`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use default password: <code>{createFormData.role}123</code>
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={createFormData.firstName}
                  onChange={(e) => setCreateFormData({...createFormData, firstName: e.target.value})}
                  placeholder="First name"
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={createFormData.lastName}
                  onChange={(e) => setCreateFormData({...createFormData, lastName: e.target.value})}
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={createFormData.phone}
                onChange={(e) => setCreateFormData({...createFormData, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            
            {/* Teacher Specific Fields */}
            {createFormData.role === 'teacher' && (
              <>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={createFormData.gender} onValueChange={(value: any) => setCreateFormData({...createFormData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    value={createFormData.qualification}
                    onChange={(e) => setCreateFormData({...createFormData, qualification: e.target.value})}
                    placeholder="e.g., B.Ed, M.Sc, Ph.D"
                  />
                </div>
                
                <div>
                  <Label htmlFor="specialization">Specialization (comma-separated)</Label>
                  <Input
                    id="specialization"
                    value={createFormData.specialization.join(', ')}
                    onChange={(e) => setCreateFormData({...createFormData, specialization: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                    placeholder="e.g., Mathematics, Physics, Chemistry"
                  />
                </div>
                
                <div>
                  <Label htmlFor="departmentId">Department</Label>
                  <Select value={createFormData.departmentId} onValueChange={(value: any) => setCreateFormData({...createFormData, departmentId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select department</SelectItem>
                      <SelectItem value="1">Sciences</SelectItem>
                      <SelectItem value="2">Mathematics</SelectItem>
                      <SelectItem value="3">Languages</SelectItem>
                      <SelectItem value="4">Social Sciences</SelectItem>
                      <SelectItem value="5">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isClassTeacher"
                    checked={createFormData.isClassTeacher}
                    onChange={(e) => setCreateFormData({...createFormData, isClassTeacher: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isClassTeacher">Class Teacher</Label>
                </div>

                {createFormData.isClassTeacher && (
                  <div>
                    <Label htmlFor="assignedClass">Assigned Class *</Label>
                    <Select value={createFormData.assignedClassId?.toString() || ""} onValueChange={(value: string) => setCreateFormData({...createFormData, assignedClassId: parseInt(value)})}>
                      <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {classes.filter((c: any) => c.status === 'Active' && !c.class_teacher_id).map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                            {cls.name}
                          </SelectItem>
                        ))}
                        {classes.filter((c: any) => c.status === 'Active' && c.class_teacher_id).length > 0 && (
                          <div className="px-2 py-1 text-xs text-gray-500 border-t">
                            Classes with teachers are hidden
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            
            {/* Parent Specific Fields */}
            {createFormData.role === 'parent' && (
              <>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={createFormData.address}
                    onChange={(e) => setCreateFormData({...createFormData, address: e.target.value})}
                    placeholder="Enter home address"
                  />
                </div>
                
                <div>
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    value={createFormData.alternatePhone}
                    onChange={(e) => setCreateFormData({...createFormData, alternatePhone: e.target.value})}
                    placeholder="Alternate contact number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    value={createFormData.occupation}
                    onChange={(e) => setCreateFormData({...createFormData, occupation: e.target.value})}
                    placeholder="Enter occupation"
                  />
                </div>
              </>
            )}
            
            {/* Accountant Specific Fields */}
            {createFormData.role === 'accountant' && (
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={createFormData.department}
                  onChange={(e) => setCreateFormData({...createFormData, department: e.target.value})}
                  placeholder="e.g., Finance, Accounts, Bursary"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={createFormData.role} onValueChange={(value: any) => setCreateFormData({...createFormData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={createFormData.status} onValueChange={(value: any) => setCreateFormData({...createFormData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCreateUser} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Photo Display */}
            {selectedUser && (
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{getUserFullName(selectedUser)}</h3>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                  <Badge className={getRoleBadgeColor(selectedUser.role)}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            {/* Complete Name Fields */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Complete Name</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input
                    id="edit-firstName"
                    value={editFormData.first_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                    placeholder="First name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-otherName">Other Name</Label>
                  <Input
                    id="edit-otherName"
                    value={editFormData.other_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, other_name: e.target.value})}
                    placeholder="Middle/other name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-lastName">Last Name *</Label>
                  <Input
                    id="edit-lastName"
                    value={editFormData.last_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Primary Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    placeholder="Primary phone number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-alternatePhone">Alternate Phone</Label>
                  <Input
                    id="edit-alternatePhone"
                    value={editFormData.alternatePhone || ''}
                    onChange={(e) => setEditFormData({...editFormData, alternatePhone: e.target.value})}
                    placeholder="Alternate phone number"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                  placeholder="Residential address"
                />
              </div>
            </div>
            
            {/* Role and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={editFormData.role} onValueChange={(value: any) => setEditFormData({...editFormData, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editFormData.status} onValueChange={(value: any) => setEditFormData({...editFormData, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Role-specific fields */}
            {editFormData.role === 'teacher' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Teacher Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-employeeId">Employee ID</Label>
                    <Input
                      id="edit-employeeId"
                      value={editFormData.employee_id || ''}
                      onChange={(e) => setEditFormData({...editFormData, employee_id: e.target.value})}
                      placeholder="Employee ID"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-gender">Gender</Label>
                    <Select value={editFormData.gender || ''} onValueChange={(value: any) => setEditFormData({...editFormData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-qualification">Qualification</Label>
                    <Input
                      id="edit-qualification"
                      value={editFormData.qualification || ''}
                      onChange={(e) => setEditFormData({...editFormData, qualification: e.target.value})}
                      placeholder="e.g., B.Ed, M.Sc, Ph.D"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      value={editFormData.department || ''}
                      onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                      placeholder="e.g., Mathematics, Science, Arts"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {editFormData.role === 'accountant' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Accountant Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-employeeId">Employee ID</Label>
                    <Input
                      id="edit-employeeId"
                      value={editFormData.employee_id || ''}
                      onChange={(e) => setEditFormData({...editFormData, employee_id: e.target.value})}
                      placeholder="Employee ID"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      value={editFormData.department || ''}
                      onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                      placeholder="e.g., Finance, Accounts, Bursary"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {editFormData.role === 'parent' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Parent Information</h4>
                <div>
                  <Label htmlFor="edit-occupation">Occupation</Label>
                  <Input
                    id="edit-occupation"
                    value={editFormData.occupation || ''}
                    onChange={(e) => setEditFormData({...editFormData, occupation: e.target.value})}
                    placeholder="Parent's occupation"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEditUser} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for {selectedUser?.username}? 
              A temporary password will be generated and shown to you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-email"
                checked={resetViaEmail}
                onCheckedChange={(checked: boolean) => setResetViaEmail(checked)}
              />
              <Label htmlFor="reset-email">Send via Email</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-sms"
                checked={resetViaSMS}
                onCheckedChange={(checked: boolean) => setResetViaSMS(checked)}
              />
              <Label htmlFor="reset-sms">Send via SMS</Label>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={confirmResetPassword} disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate/Activate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.status === 'Active' ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedUser?.status === 'Active' ? 'deactivate' : 'activate'} {selectedUser?.username}? 
              {selectedUser?.status === 'Active' ? ' The user will not be able to access the system.' : ' The user will regain access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmDeactivate}
              disabled={isLoading}
              className={selectedUser?.status === 'Active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isLoading ? 'Processing...' : (selectedUser?.status === 'Active' ? 'Deactivate User' : 'Activate User')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.username}? This action cannot be undone.
              <br /><br />
              <strong>Warning:</strong> This will permanently remove the user and all their associated data from the system.
              {selectedUser?.role === 'teacher' && ' This includes all teacher records, subject assignments, and related data.'}
              {selectedUser?.role === 'parent' && ' This includes all parent records and student links.'}
              {selectedUser?.role === 'accountant' && ' This includes all accountant records and financial data.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmDelete} 
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Username</Label>
              <p className="text-sm">{selectedUser?.username}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm">{selectedUser?.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Role</Label>
              <Badge variant={selectedUser?.role === 'admin' ? 'destructive' : 'secondary'}>
                {selectedUser?.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant={selectedUser?.status === 'Active' ? 'default' : 'secondary'}>
                {selectedUser?.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Last Login</Label>
              <p className="text-sm">{selectedUser?.last_login || 'Never'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Created At</Label>
              <p className="text-sm">{new Date(selectedUser?.created_at || '').toLocaleDateString()}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
