import { Settings, Calculator, GraduationCap, KeyRound, User, CheckCircle, Edit, Trash2, Eye, Plus, Download, FileText } from 'lucide-react';
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
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

  const [editFormData, setEditFormData] = useState<Partial<UserType>>({
    username: '',
    email: '',
    role: 'teacher' as 'admin' | 'teacher' | 'accountant' | 'parent',
    status: 'Active' as 'Active' | 'Inactive'
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

  // Filter users - optimized with useMemo
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    return users.filter((user: UserType) => {
      const matchesSearch = 
        (user.username?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus = filterStatus === "all" || user.status === filterStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  // Filter teachers - optimized with useMemo
  const filteredTeachers = useMemo(() => {
    if (!teachers || teachers.length === 0) return [];
    
    return teachers.filter(teacher => {
      const matchesSearch = 
        (teacher.firstName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (teacher.lastName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (teacher.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (teacher.employeeId?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      const matchesStatus = filterStatus === "all" || teacher.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [teachers, searchTerm, filterStatus]);

  // Filter parents - optimized with useMemo
  const filteredParents = useMemo(() => {
    if (!parents || parents.length === 0) return [];
    
    return parents.filter(parent => {
      const matchesSearch = 
        (parent.firstName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (parent.lastName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (parent.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (parent.phone?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      const matchesStatus = filterStatus === "all" || parent.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [parents, searchTerm, filterStatus]);

  // Filter accountants - optimized with useMemo
  const filteredAccountants = useMemo(() => {
    if (!accountants || accountants.length === 0) return [];
    
    return accountants.filter(accountant => {
      const matchesSearch = 
        (accountant.firstName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (accountant.lastName?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (accountant.email?.toLowerCase() || '').includes((searchTerm || '').toLowerCase()) ||
        (accountant.employeeId?.toLowerCase() || '').includes((searchTerm || '').toLowerCase());
      
      const matchesStatus = filterStatus === "all" || accountant.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [accountants, searchTerm, filterStatus]);

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
    setShowResetDialog(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const newPassword = await resetUserPasswordAPI(selectedUser.id);
      
      if (newPassword) {
        const method = resetViaEmail && resetViaSMS 
          ? "Email & SMS" 
          : resetViaEmail 
          ? "Email" 
          : resetViaSMS 
          ? "SMS" 
          : "not sent";
        
        toast.success(`Password reset successfully for ${selectedUser.username}. New password: ${newPassword}`);
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

  const handleEdit = (user: UserType) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
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
      toast.success(`User ${selectedUser.username} deleted successfully`);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      // Optimistic update - remove user from local state immediately
      setUsers(users.filter(user => user.id !== selectedUser.id));
      // Then refresh in background
      await loadUsersFromAPI();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Refresh data on error to restore correct state
      await loadUsersFromAPI();
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const currentStatus = selectedUser.status;
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await updateUserStatusAPI(selectedUser.id, newStatus);
      toast.success(`User ${selectedUser.username} ${newStatus.toLowerCase()}d successfully`);
      setShowDeactivateDialog(false);
      setSelectedUser(null);
      // Optimistic update - update user status in local state immediately
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, status: newStatus }
          : user
      ));
      // Then refresh in background
      await loadUsersFromAPI();
    } catch (error) {
      console.error('Deactivate user error:', error);
      toast.error(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Refresh data on error to restore correct state
      await loadUsersFromAPI();
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
      toast.success("User created successfully");
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
      // Optimistic update - add new user to local state immediately if we have the data
      if (newUser) {
        setUsers([newUser, ...users]);
      }
      // Then refresh in background to get complete data
      await loadUsersFromAPI();
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
      toast.success("User updated successfully");
      setShowEditDialog(false);
      setSelectedUser(null);
      // Optimistic update - update user in local state immediately
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...editFormData }
          : user
      ));
      // Then refresh in background to get complete data
      await loadUsersFromAPI();
    } catch (error) {
      toast.error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Refresh data on error to restore correct state
      await loadUsersFromAPI();
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
      {!isLoading && (
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
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>
      )}

      {/* Statistics Cards */}
      {!isLoading && (
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
      )}

      {/* Tabs */}
      {!isLoading && (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserIcon className="w-3 h-3" />
            Users ({stats.users.total})
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="w-3 h-3" />
            Teachers ({stats.teachers.total})
          </TabsTrigger>
          <TabsTrigger value="parents" className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3" />
            Parents ({stats.parents.total})
          </TabsTrigger>
          <TabsTrigger value="accountants" className="flex items-center gap-2">
            <Calculator className="w-3 h-3" />
            Accountants ({stats.accountants.total})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab Content */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              {/* Primary Filters */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <UserIcon className="w-3 h-3 mr-2" />
                  Primary Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <UserIcon className="w-3 h-3" />
                  </span>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by username, email..."
                      className="pl-10 rounded-xl border-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <span className="bg-gray-100 px-3 py-2 rounded-lg">
                      {filteredUsers.length} of {users.length} users
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Filters */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Settings className="w-3 h-3 mr-2" />
                  Secondary Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="rounded-xl border-gray-300">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="rounded-xl border-gray-300">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-gray-900">{stats.users.teacher}</div>
                    <div className="text-xs text-gray-600">Teachers</div>
                  </div>
                </div>
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
                      filteredUsers.map((user: UserType) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {user.username}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
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
                                onClick={() => handleView(user)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleEdit(user)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-50 text-blue-600"
                                title="Edit User"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleResetPassword(user)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-orange-300 hover:bg-orange-50 text-orange-600"
                                title="Reset Password"
                              >
                                <KeyRound className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeactivate(user)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 ${user.status === 'Active' ? 'border-red-300 hover:bg-red-50 text-red-600' : 'border-green-300 hover:bg-green-50 text-green-600'}`}
                                title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                              >
                                <Settings className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(user);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-300 hover:bg-red-50 text-red-600"
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Tab Content */}
        <TabsContent value="teachers" className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Teachers ({filteredTeachers.length})</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Employee ID</TableHead>
                      <TableHead className="text-gray-700">Email</TableHead>
                      <TableHead className="text-gray-700">Phone</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No teachers found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeachers.map((teacher) => (
                        <TableRow key={teacher.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{teacher.employeeId}</TableCell>
                          <TableCell className="text-gray-600">{teacher.email}</TableCell>
                          <TableCell className="text-gray-600">{teacher.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <Badge className={teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {teacher.status}
                              </Badge>
                              <Switch
                                checked={teacher.status === 'Active'}
                                onCheckedChange={() => handleToggleTeacherStatus(teacher)}
                                className="ml-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => handleViewTeacher(teacher)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleEditTeacher(teacher)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-50 text-blue-600"
                                title="Edit Teacher"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTeacher(teacher);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-300 hover:bg-red-50 text-red-600"
                                title="Delete Teacher"
                                type="button"
                              >
                                <span className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parents Tab Content */}
        <TabsContent value="parents" className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Parents ({filteredParents.length})</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Email</TableHead>
                      <TableHead className="text-gray-700">Phone</TableHead>
                      <TableHead className="text-gray-700">Address</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No parents found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredParents.map((parent) => (
                        <TableRow key={parent.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {parent.firstName} {parent.lastName}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{parent.email}</TableCell>
                          <TableCell className="text-gray-600">{parent.phone || 'N/A'}</TableCell>
                          <TableCell className="text-gray-600">{parent.address || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <Badge className={parent.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {parent.status}
                              </Badge>
                              <Switch
                                checked={parent.status === 'Active'}
                                onCheckedChange={() => handleToggleParentStatus(parent)}
                                className="ml-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => handleViewParent(parent)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleEditParent(parent)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-50 text-blue-600"
                                title="Edit Parent"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteParent(parent);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-300 hover:bg-red-50 text-red-600"
                                title="Delete Parent"
                                type="button"
                              >
                                <span className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accountants Tab Content */}
        <TabsContent value="accountants" className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Accountants ({filteredAccountants.length})</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Employee ID</TableHead>
                      <TableHead className="text-gray-700">Email</TableHead>
                      <TableHead className="text-gray-700">Phone</TableHead>
                      <TableHead className="text-gray-700">Department</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccountants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No accountants found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccountants.map((accountant) => (
                        <TableRow key={accountant.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {accountant.firstName} {accountant.lastName}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{accountant.employeeId}</TableCell>
                          <TableCell className="text-gray-600">{accountant.email}</TableCell>
                          <TableCell className="text-gray-600">{accountant.phone || 'N/A'}</TableCell>
                          <TableCell className="text-gray-600">{accountant.department || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <Badge className={accountant.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {accountant.status}
                              </Badge>
                              <Switch
                                checked={accountant.status === 'Active'}
                                onCheckedChange={() => handleToggleAccountantStatus(accountant)}
                                className="ml-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => handleViewAccountant(accountant)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-100"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleEditAccountant(accountant)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-50 text-blue-600"
                                title="Edit Accountant"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteAccountant(accountant);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-300 hover:bg-red-50 text-red-600"
                                title="Delete Accountant"
                                type="button"
                              >
                                <span className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Create User Dialog */}
      {!isLoading && (
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
      )}

      {/* Edit User Dialog */}
      {!isLoading && (
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editFormData.username}
                onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-role">Role</Label>
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
      )}

      {/* Reset Password Dialog */}
      {!isLoading && (
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
      )}

      {/* Deactivate/Activate Dialog */}
      {!isLoading && (
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
      )}

      {/* Delete User Dialog */}
      {!isLoading && (
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
      )}

      {/* View User Dialog */}
      {!isLoading && (
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
      )}
    </div>
  );
}
