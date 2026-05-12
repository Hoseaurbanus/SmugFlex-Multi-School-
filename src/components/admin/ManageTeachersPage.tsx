import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { SimpleDropdown, SimpleDropdownTrigger, SimpleDropdownContent, SimpleDropdownItem, SimpleDropdownSeparator } from "../ui/simple-dropdown";
import { useSchool } from "../../contexts/SchoolContext";
import { Key, ImageIcon, Power } from "lucide-react";
import { exportTeachersToCSV } from "../../utils/csvExporter";
import { importTeachersFromCSV, generateTeacherTemplate } from "../../utils/csvImporter";
import { toast } from "sonner";
import { useAdminPageOptimizations } from "../../utils/adminOptimizations";

export function ManageTeachersPage() {
  const { teachers, deleteTeacher, updateTeacher, classes, subjectAssignments, users, updateUser, currentUser } = useSchool();
  
  // Permission and optimization hooks
  const { 
    hasAccess, 
    loading: permissionLoading, 
    loadWithCache, 
    createDebouncedSearch,
    createMemoizedFilter,
    batchLoad,
    clearCache 
  } = useAdminPageOptimizations('ManageTeachersPage', currentUser);

  // Show loading state while checking permissions
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <span className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You do not have permission to access the Teacher Management page.
              Please contact your administrator if you believe this is an error.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isUploadSignatureDialogOpen, setIsUploadSignatureDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [isQuickImportDialogOpen, setIsQuickImportDialogOpen] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    otherName: "",
    email: "",
    phone: "",
    qualification: "",
    specialization: [] as string[],
    gender: "",
  });

  // Get class teacher assignment for a teacher
  const getClassTeacherInfo = (teacherId: number) => {
    const teacherClasses = classes.filter(c => c.classTeacherId === teacherId);
    return teacherClasses;
  };

  // Get subject assignments for a teacher
  const getTeacherSubjects = (teacherId: number) => {
    return subjectAssignments.filter(a => a.teacher_id === teacherId);
  };

  // Get user account for teacher
  const getTeacherUser = (teacherId: number) => {
    return users.find((u: any) => u.linked_id === teacherId && u.role === 'teacher');
  };

  // Optimized filtering with memoization
  const filteredTeachers = useMemo(() => {
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return [];
    }

    // Create memoized filter function
    const filterFn = (teacher: any, query: string) => {
      const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
      const searchLower = query.toLowerCase();
      return fullName.includes(searchLower) || 
             teacher.employee_id.toLowerCase().includes(searchLower) ||
             teacher.email.toLowerCase().includes(searchLower);
    };

    // Use memoized filter for better performance
    const memoizedFilter = createMemoizedFilter(teachers, filterFn);
    return memoizedFilter(searchTerm);
  }, [teachers, searchTerm, createMemoizedFilter]);

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      otherName: teacher.other_name || "",
      email: teacher.email,
      phone: teacher.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      gender: teacher.gender || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTeacher) return;

    updateTeacher(selectedTeacher.id, editFormData);
    toast.success(`Teacher ${editFormData.firstName} ${editFormData.lastName} updated successfully`);
    setIsEditDialogOpen(false);
    setSelectedTeacher(null);
  };

  const handleDelete = (teacherId: number, teacherName: string) => {
    if (confirm(`Are you sure you want to delete ${teacherName}? This action cannot be undone.`)) {
      deleteTeacher(teacherId);
      toast.success(`Teacher ${teacherName} deleted successfully`);
    }
  };

  const handleView = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsViewDialogOpen(true);
  };

  const handleToggleStatus = (teacher: any) => {
    const newStatus = teacher.status === 'Active' ? 'Inactive' : 'Active';
    updateTeacher(teacher.id, { status: newStatus });
    
    // Also update user account status
    const user = getTeacherUser(teacher.id);
    if (user) {
      updateUser(user.id, { status: newStatus });
    }
    
    toast.success(`Teacher ${teacher.firstName} ${teacher.lastName} ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
  };

  const handleResetPassword = () => {
    if (!selectedTeacher) return;
    
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Update user password
    const user = getTeacherUser(selectedTeacher.id);
    if (user) {
      updateUser(user.id, { password_hash: newPassword });
      toast.success(`Password reset successfully for ${selectedTeacher.first_name} ${selectedTeacher.last_name}`);
    } else {
      toast.error("User account not found");
    }

    setNewPassword("");
    setConfirmPassword("");
    setIsResetPasswordDialogOpen(false);
    setSelectedTeacher(null);
  };

  const handleSignatureUpload = () => {
    if (!selectedTeacher || !signatureFile) {
      toast.error("Please select a signature file");
      return;
    }

    // In a real app, you would upload the file to a server
    // For now, we'll just simulate it
    const reader = new FileReader();
    reader.onloadend = () => {
      const signatureDataUrl = reader.result as string;
      updateTeacher(selectedTeacher.id, { signature: signatureDataUrl } as any);
      toast.success("Signature uploaded successfully");
      setIsUploadSignatureDialogOpen(false);
      setSignatureFile(null);
      setSelectedTeacher(null);
    };
    reader.readAsDataURL(signatureFile);
  };

  const handleQuickImportGRAStaff = () => {
    // This imports the 17 staff members from Graceland Royal Academy
    const graStaff = [
      { lastName: "AHMED", firstName: "HASSANA", otherName: "SOYA", gender: "FEMALE", phone: "", username: "hassana2@gra", email: "", role: "CLASS TEACHER" },
      { lastName: "CHRIS", firstName: "RHEMA", otherName: "", gender: "FEMALE", phone: "", username: "rhema1@gra", email: "cr@gmail.com", role: "CLASS TEACHER" },
      { lastName: "Dike", firstName: "Stella", otherName: "Onyeka", gender: "FEMALE", phone: "8068651255", username: "stella1@gra", email: "kachidike4@gmail.com", role: "MEDICAL OFFICER" },
      { lastName: "DIMAS", firstName: "AFODIA", otherName: "", gender: "FEMALE", phone: "8114700334", username: "afodia1@gra", email: "dimasafodia@gmail.com", role: "CLASS TEACHER" },
      { lastName: "DONALD", firstName: "DESMOND", otherName: "", gender: "MALE", phone: "", username: "desmond2@gra", email: "dd@gmaill.com", role: "SUBJECT TEACHER" },
      { lastName: "GAYUS", firstName: "RUTH", otherName: "", gender: "FEMALE", phone: "8139935554", username: "ruth3@gra", email: "ruthgayus1092@gmail.com", role: "CLASS TEACHER" },
      { lastName: "HABILA", firstName: "SUZAN", otherName: "SADAH", gender: "FEMALE", phone: "8146283749", username: "suzan4@gra", email: "habilasuzan5@gmail.com", role: "CLASS TEACHER" },
      { lastName: "ISHAYA", firstName: "RAHAB", otherName: "", gender: "FEMALE", phone: "8133183072", username: "rahab1@gra", email: "rahagodiyaishaya@gmail.com", role: "CLASS TEACHER" },
      { lastName: "KUDI", firstName: "RAPTURE", otherName: "", gender: "FEMALE", phone: "8107197847", username: "rapture1@gra", email: "rapture@gmail.com", role: "CLASS TEACHER" },
      { lastName: "LUCKY", firstName: "OMOLARA", otherName: "", gender: "FEMALE", phone: "8063147667", username: "omolara1@gra", email: "osanyingbemiomolara@gmail.com", role: "CLASS TEACHER" },
      { lastName: "MAINA", firstName: "MARKUS", otherName: "WAYAS", gender: "MALE", phone: "7061575194", username: "markus1@gra", email: "makozzzz8@gmail.com", role: "CLASS TEACHER" },
      { lastName: "OROGUN", firstName: "GLORY EJIRO", otherName: "", gender: "FEMALE", phone: "7017575614", username: "gloryejiro1@gra", email: "gloryorogun94@gmail.com", role: "CLASS TEACHER" },
      { lastName: "SAIDU", firstName: "SHEBA", otherName: "YOLA", gender: "FEMALE", phone: "7048530493", username: "sheba1@gra", email: "shebayola@gmail.com", role: "SUBJECT TEACHER" },
      { lastName: "SOLOMON", firstName: "PIPDOK", otherName: "KWARSON", gender: "MALE", phone: "7037573891", username: "pipdok1@gra", email: "solomonpipdok@gmail.com", role: "SUBJECT TEACHER" },
      { lastName: "TALI", firstName: "HAUYIRAH", otherName: "", gender: "MALE", phone: "8167175146", username: "hauyirah1@gra", email: "hauyirahtali@gmail.com", role: "SUBJECT TEACHER" },
      { lastName: "YUNUSA", firstName: "YOHANNA", otherName: "", gender: "MALE", phone: "", username: "yohanna2@gra", email: "", role: "SUBJECT TEACHER" },
      { lastName: "YUNUSA", firstName: "NORA", otherName: "", gender: "FEMALE", phone: "7032808483", username: "nora1@gra", email: "yunusanora32@gmail.com", role: "CLASS TEACHER" },
    ];

    toast.info(`Ready to import ${graStaff.length} staff members from Graceland Royal Academy Gombe. Please use the Register User page to add these teachers individually.`);
    setIsQuickImportDialogOpen(false);
    
    // Copy to clipboard for easy pasting
    const staffText = graStaff.map(s => 
      `${s.firstName} ${s.lastName}${s.otherName ? ' ' + s.otherName : ''} - ${s.username} - ${s.email || 'No email'} - ${s.phone || 'No phone'}`
    ).join('\n');
    
    navigator.clipboard.writeText(staffText).then(() => {
      toast.success("Staff list copied to clipboard!");
    }).catch(error => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const exportCSVTemplate = () => {
    const template = generateTeacherTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_import_template.csv';
    a.click();
    toast.success("CSV template downloaded");
  };

  const handleCSVImport = async (file: File) => {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    setIsImporting(true);
    setImportProgress({ processed: 0, total: 0 });

    try {
      const result = await importTeachersFromCSV(
        file,
        (processed, total) => {
          setImportProgress({ processed, total });
        }
      );
      
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`);
        }
      
      if (result.imported.length > 0) {
        toast.success(`${result.imported.length} teachers imported successfully to database`);
        setCSVFile(null);
        if (csvInputRef.current) {
          csvInputRef.current.value = '';
        }
        setIsBulkImportDialogOpen(false);
        
        // Refresh teachers data from database
        window.location.reload();
      } else {
        toast.error("No valid teachers found in CSV file");
      }
    } catch (error) {
      toast.error("Failed to import CSV file to database");
      } finally {
      setIsImporting(false);
      setImportProgress({ processed: 0, total: 0 });
    }
  };

  // Calculate statistics
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.status === 'Active').length,
    classTeachers: 0, // Not available in current schema
    inactive: teachers.filter(t => t.status === 'Inactive').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#1F2937] mb-2">Manage Teachers</h1>
          <p className="text-[#6B7280]">View, edit, and manage all teaching staff</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={async () => {
              await exportTeachersToCSV();
              toast.success("Teachers exported to CSV successfully");
            }}
            variant="outline"
            className="rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
          >
            <span className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => setIsBulkImportDialogOpen(true)}
            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Bulk Import CSV
          </Button>
          <Button
            onClick={() => setIsQuickImportDialogOpen(true)}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Import GRA Staff
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 rounded-xl">
        <span className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Note:</strong> To add new teachers, please use the "Register User" page from the main menu. This page is for viewing and managing existing teachers only.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Total Teachers</p>
            <p className="text-[#1F2937]">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Active Teachers</p>
            <p className="text-[#10B981]">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Class Teachers</p>
            <p className="text-[#3B82F6]">{stats.classTeachers}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Inactive</p>
            <p className="text-[#EF4444]">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          {/* Primary Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#0A2540] mb-3 flex items-center">
              <span className="w-4 h-4 mr-2" />
              Primary Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email or employee ID..."
                  className="pl-10 rounded-xl border-[#0A2540]/20"
                />
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <span className="bg-gray-100 px-3 py-2 rounded-lg">
                  {filteredTeachers.length} of {teachers.length} teachers
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Filters */}
          <div>
            <h3 className="text-sm font-semibold text-[#0A2540] mb-3 flex items-center">
              <span className="w-4 h-4 mr-2" />
              Secondary Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold text-[#0A2540]">{stats.active}</div>
                <div className="text-xs text-gray-600">Active Teachers</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold text-blue-600">{stats.classTeachers}</div>
                <div className="text-xs text-gray-600">Class Teachers</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold text-orange-600">{stats.inactive}</div>
                <div className="text-xs text-gray-600">Inactive Teachers</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h3 className="text-[#1F2937]">Teachers ({filteredTeachers.length})</h3>
              <p className="text-[#6B7280] text-sm">All teaching staff records</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Select</TableHead>
                  <TableHead className="text-white">Last Name</TableHead>
                  <TableHead className="text-white">First Name</TableHead>
                  <TableHead className="text-white">Other Name</TableHead>
                  <TableHead className="text-white">Gender</TableHead>
                  <TableHead className="text-white">Phone</TableHead>
                  <TableHead className="text-white">Username</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white">Role</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <span className="w-12 h-12 text-[#9CA3AF]" />
                        <p className="text-[#1F2937]">No teachers found</p>
                        <p className="text-[#6B7280] text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const classTeacherInfo = getClassTeacherInfo(Number(teacher.id));
                    const user = getTeacherUser(Number(teacher.id));
                    return (
                      <TableRow key={teacher.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <TableCell>
                          <input type="checkbox" className="w-4 h-4 rounded border-[#E5E7EB]" />
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{teacher.lastName}</TableCell>
                        <TableCell className="text-[#1F2937]">{teacher.firstName}</TableCell>
                        <TableCell className="text-[#6B7280] text-sm">-</TableCell>
                        <TableCell className="text-[#6B7280] text-sm">-</TableCell>
                        <TableCell className="text-[#6B7280] text-sm">{teacher.phone || "-"}</TableCell>
                        <TableCell className="text-[#6B7280] text-sm">{user?.username || "-"}</TableCell>
                        <TableCell className="text-[#6B7280] text-sm">{teacher.email || "-"}</TableCell>
                        <TableCell>
                          <Badge className={classTeacherInfo.length > 0 ? "bg-[#10B981] text-white border-0" : "bg-[#3B82F6] text-white border-0"}>
                            {classTeacherInfo.length > 0 ? "CLASS TEACHER" : "SUBJECT TEACHER"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <SimpleDropdown>
                            <SimpleDropdownTrigger>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg">
                                <span className="h-3 w-3" />
                              </Button>
                            </SimpleDropdownTrigger>
                            <SimpleDropdownContent>
                            <SimpleDropdownItem onClick={() => handleView(teacher)}>
                              <span className="h-3 w-3" />
                              V
                            </SimpleDropdownItem>
                            <SimpleDropdownItem onClick={() => handleEdit(teacher)}>
                              <span className="h-3 w-3" />
                              E
                            </SimpleDropdownItem>
                            <SimpleDropdownSeparator />
                            <SimpleDropdownItem onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsResetPasswordDialogOpen(true);
                            }}>
                              <Key className="h-3 w-3" />
                              R
                            </SimpleDropdownItem>
                            <SimpleDropdownItem onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsUploadSignatureDialogOpen(true);
                            }}>
                              <ImageIcon className="h-3 w-3" />
                              S
                            </SimpleDropdownItem>
                            <SimpleDropdownSeparator />
                            <SimpleDropdownItem 
                              onClick={() => handleToggleStatus(teacher)}
                              className={teacher.status === 'Active' ? 'text-orange-600' : 'text-green-600'}
                            >
                              <Power className="h-3 w-3" />
                              {teacher.status === 'Active' ? 'Off' : 'On'}
                            </SimpleDropdownItem>
                          </SimpleDropdownContent>
                        </SimpleDropdown>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Teacher Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Teacher Details</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              View complete information about this teacher
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Employee ID</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.employeeId}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Status</Label>
                  <Badge className={selectedTeacher.status === 'Active' ? "bg-[#10B981] text-white" : "bg-[#EF4444] text-white"}>
                    {selectedTeacher.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">First Name</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.firstName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Last Name</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.lastName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Email</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Phone</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Qualification</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.qualification}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Specialization</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.specialization.join(', ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#6B7280]">Class Teacher Assignments</Label>
                <div className="flex flex-wrap gap-2">
                  {getClassTeacherInfo(selectedTeacher.id).map((cls) => (
                    <Badge key={cls.id} className="bg-[#10B981] text-white">
                      {cls.name}
                    </Badge>
                  ))}
                  {getClassTeacherInfo(selectedTeacher.id).length === 0 && (
                    <span className="text-[#9CA3AF] text-sm">No class teacher assignments</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#6B7280]">Subject Assignments</Label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {getTeacherSubjects(selectedTeacher.id).map((assignment) => (
                    <div key={assignment.id} className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#1F2937]">{assignment.subject_name}</p>
                          <p className="text-sm text-[#6B7280]">{assignment.class_name}</p>
                        </div>
                        <Badge className="bg-[#3B82F6] text-white text-xs">
                          {assignment.term}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {getTeacherSubjects(selectedTeacher.id).length === 0 && (
                    <p className="text-[#9CA3AF] text-sm">No subject assignments</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsViewDialogOpen(false)}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Edit Teacher</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Update teacher information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#1F2937]">First Name</Label>
                <Input
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Last Name</Label>
                <Input
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Other Name</Label>
                <Input
                  value={editFormData.otherName}
                  onChange={(e) => setEditFormData({ ...editFormData, otherName: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Gender</Label>
                <Select value={editFormData.gender} onValueChange={(value: string) => setEditFormData({ ...editFormData, gender: value })}>
                  <SelectTrigger className="rounded-xl border-[#E5E7EB]">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Email</Label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Phone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[#1F2937]">Qualification</Label>
                <Input
                  value={editFormData.qualification}
                  onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="max-w-md rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Reset Password</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              {selectedTeacher && `Reset password for ${selectedTeacher.firstName} ${selectedTeacher.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#1F2937]">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1F2937]">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsResetPasswordDialogOpen(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl"
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Signature Dialog */}
      <Dialog open={isUploadSignatureDialogOpen} onOpenChange={setIsUploadSignatureDialogOpen}>
        <DialogContent className="max-w-md rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Upload Staff Signature</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              {selectedTeacher && `Upload signature for ${selectedTeacher.firstName} ${selectedTeacher.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#1F2937]">Select Signature Image</Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              {signatureFile && (
                <p className="text-sm text-[#6B7280]">Selected: {signatureFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsUploadSignatureDialogOpen(false);
                setSignatureFile(null);
              }}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSignatureUpload}
              className="bg-[#06B6D4] hover:bg-[#0891B2] text-white rounded-xl"
            >
              Upload Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import CSV Dialog */}
      <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Bulk Import Teachers</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Import multiple teachers from a CSV file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50 rounded-xl">
              <span className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>CSV Format:</strong> Last Name, First Name, Other Name, Gender, Phone, Email, Role, Qualification, Specialization
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="text-[#1F2937]">Select CSV File</Label>
              <Input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCSVFile(e.target.files?.[0] || null)}
                className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
              />
              {csvFile && (
                <p className="text-sm text-[#6B7280]">Selected: {csvFile.name}</p>
              )}
            </div>

            <Button
              onClick={exportCSVTemplate}
              variant="outline"
              className="w-full rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              <span className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsBulkImportDialogOpen(false);
                setCSVFile(null);
              }}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => csvInputRef.current?.click()}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Import Teachers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Import GRA Staff Dialog */}
      <Dialog open={isQuickImportDialogOpen} onOpenChange={setIsQuickImportDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl bg-white border border-[#E5E7EB] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Import Graceland Royal Academy Staff</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Quick import of 17 staff members from GRA Gombe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-green-200 bg-green-50 rounded-xl">
              <span className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                This will prepare the data for 17 teachers. You'll still need to register them individually through the Register User page to create their accounts.
              </AlertDescription>
            </Alert>
            
            <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] max-h-64 overflow-y-auto">
              <p className="text-[#1F2937] mb-2">Staff List Preview:</p>
              <ul className="text-sm text-[#6B7280] space-y-1">
                <li>1. AHMED HASSANA SOYA (CLASS TEACHER)</li>
                <li>2. CHRIS RHEMA (CLASS TEACHER)</li>
                <li>3. Dike Stella Onyeka (MEDICAL OFFICER)</li>
                <li>4. DIMAS AFODIA (CLASS TEACHER)</li>
                <li>5. DONALD DESMOND (SUBJECT TEACHER)</li>
                <li>6. GAYUS RUTH (CLASS TEACHER)</li>
                <li>7. HABILA SUZAN SADAH (CLASS TEACHER)</li>
                <li>8. ISHAYA RAHAB (CLASS TEACHER)</li>
                <li>9. KUDI RAPTURE (CLASS TEACHER)</li>
                <li>10. LUCKY OMOLARA (CLASS TEACHER)</li>
                <li>11. MAINA MARKUS WAYAS (CLASS TEACHER)</li>
                <li>12. OROGUN GLORY EJIRO (CLASS TEACHER)</li>
                <li>13. SAIDU SHEBA YOLA (SUBJECT TEACHER)</li>
                <li>14. SOLOMON PIPDOK KWARSON (SUBJECT TEACHER)</li>
                <li>15. TALI HAUYIRAH (SUBJECT TEACHER)</li>
                <li>16. YUNUSA YOHANNA (SUBJECT TEACHER)</li>
                <li>17. YUNUSA NORA (CLASS TEACHER)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsQuickImportDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickImportGRAStaff}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Copy Staff List to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
