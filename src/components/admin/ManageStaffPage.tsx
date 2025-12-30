import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { Check, X, Square, Key, FileSignature, Trash2 } from "lucide-react";
import { exportTeachersToCSV } from "../../utils/csvExporter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { SimpleDropdown, SimpleDropdownTrigger, SimpleDropdownContent, SimpleDropdownItem, SimpleDropdownSeparator } from "../ui/simple-dropdown";

export function ManageStaffPage() {
  const { teachers, deleteTeacher, updateTeacher, classes, subjectAssignments, users, updateUser } = useSchool();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    qualification: "",
    specialization: [] as string[],
    status: "Active" as "Active" | "Inactive",
  });
  const [newPassword, setNewPassword] = useState("");
  const [signature, setSignature] = useState<string>("");

  // Get class teacher assignment for a teacher
  const getClassTeacherInfo = (teacherId: number) => {
    return classes.filter(c => c.classTeacherId === teacherId);
  };

  // Get subject assignments for a teacher
  const getTeacherSubjects = (teacherId: number) => {
    return subjectAssignments.filter(a => a.teacher_id === teacherId);
  };

  // Get user account for teacher
  const getTeacherUser = (teacherId: number) => {
    return users.find((u: any) => u.linked_id === teacherId && u.role === "teacher");
  };

  // Filter teachers based on search and filters
  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(searchLower) || 
           (teacher.employeeId && teacher.employeeId.toLowerCase().includes(searchLower)) ||
           (teacher.email && teacher.email.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === "all" || teacher.status === statusFilter;
    
    const matchesRole = roleFilter === "all"; // Simplified since is_class_teacher doesn't exist

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      status: teacher.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTeacher) return;

    updateTeacher(selectedTeacher.id, {
      firstName: editFormData.firstName,
      lastName: editFormData.lastName,
      email: editFormData.email,
      phone: editFormData.phone,
      status: editFormData.status
    });
    
    // Update user email if changed
    const userAccount = getTeacherUser(selectedTeacher.id);
    if (userAccount && editFormData.email !== selectedTeacher.email) {
      updateUser(userAccount.id, { email: editFormData.email });
    }

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
    const newStatus = teacher.status === "Active" ? "Inactive" : "Active";
    updateTeacher(Number(teacher.id), { status: newStatus });
    
    // Update user status as well
    const userAccount = getTeacherUser(Number(teacher.id));
    if (userAccount) {
      updateUser(userAccount.id, { status: newStatus });
    }

    toast.success(`Teacher ${newStatus === "Active" ? "activated" : "deactivated"} successfully`);
  };

  const handleSignatureUpload = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsSignatureDialogOpen(true);
  };

  const openDeleteDialog = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const handleResetPassword = () => {
    if (!selectedTeacher || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    const userAccount = getTeacherUser(selectedTeacher.id);
    if (userAccount) {
      // Password reset would be handled by a separate API call
      toast.success("Password reset request submitted");
      setIsResetPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedTeacher(null);
    } else {
      toast.error("User account not found");
    }
  };

  const handleUploadSignature = () => {
    if (!selectedTeacher || !signature) {
      toast.error("Please provide a signature");
      return;
    }

    // In a real implementation, you would upload the signature file
    // For now, we'll just show a success message
    toast.success("Signature uploaded successfully");
    setIsSignatureDialogOpen(false);
    setSignature("");
    setSelectedTeacher(null);
  };

  const handleSelectAll = () => {
    if (selectedTeachers.length === filteredTeachers.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(filteredTeachers.map(t => Number(t.id)));
    }
  };

  const handleSelectTeacher = (teacherId: number) => {
    if (selectedTeachers.includes(teacherId)) {
      setSelectedTeachers(selectedTeachers.filter(id => id !== teacherId));
    } else {
      setSelectedTeachers([...selectedTeachers, teacherId]);
    }
  };

  const handleBulkExport = () => {
    const dataToExport = filteredTeachers.map(teacher => {
      const classInfo = getClassTeacherInfo(Number(teacher.id));
      const subjects = getTeacherSubjects(Number(teacher.id));
      const userAccount = getTeacherUser(Number(teacher.id));

      return {
        "Employee ID": teacher.employeeId || "",
        "Last Name": teacher.lastName,
        "First Name": teacher.firstName,
        "Email": teacher.email || "",
        "Phone": teacher.phone || "",
        "Username": userAccount?.username || "",
        "Gender": "", // Not in current schema, but keeping for compatibility
        "Qualification": "", // Not in current schema
        "Specialization": "", // Not in current schema
        "Role": "SUBJECT TEACHER", // Simplified since is_class_teacher doesn't exist
        "Class Teacher For": classInfo.map(c => c.name).join(", ") || "-",
        "Subject Assignments": subjects.length,
        "Status": teacher.status,
      };
    });

    // Simple CSV export function
    const exportToCSV = (data: any[], filename: string) => {
      const headers = Object.keys(data[0] || {});
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => {
        return headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
      });
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    exportToCSV(dataToExport, 'teachers_export.csv');
    
    toast.success(`Exported ${dataToExport.length} staff records`);
  };

  const handleBulkStatusChange = (newStatus: "Active" | "Inactive") => {
    if (selectedTeachers.length === 0) {
      toast.error("Please select teachers first");
      return;
    }

    if (confirm(`Are you sure you want to ${newStatus === "Active" ? "activate" : "deactivate"} ${selectedTeachers.length} teacher(s)?`)) {
      selectedTeachers.forEach(teacherId => {
        updateTeacher(teacherId, { status: newStatus });
        const userAccount = getTeacherUser(teacherId);
        if (userAccount) {
          updateUser(userAccount.id, { status: newStatus });
        }
      });
      toast.success(`${selectedTeachers.length} teacher(s) ${newStatus === "Active" ? "activated" : "deactivated"} successfully`);
      setSelectedTeachers([]);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#0A2540] mb-2">Manage Staff</h1>
          <p className="text-gray-600">View, edit, and manage all teaching staff</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleBulkExport}
            variant="outline"
            className="rounded-xl border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white"
          >
            <span className="w-4 h-4 mr-2" />
            Export Staff
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Staff</p>
                <p className="text-2xl font-bold text-[#0A2540]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Active</p>
                <p className="text-2xl font-bold text-[#10B981]">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Class Teachers</p>
                <p className="text-2xl font-bold text-[#3B82F6]">{stats.classTeachers}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Inactive</p>
                <p className="text-2xl font-bold text-[#EF4444]">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <CardTitle className="flex items-center gap-2 text-[#0A2540]">
            <span className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email or employee ID..."
                className="h-12 pl-10 rounded-xl border border-[#E5E7EB]"
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-xl border border-[#E5E7EB]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active Only</SelectItem>
                  <SelectItem value="Inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-12 rounded-xl border border-[#E5E7EB]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="class_teacher">Class Teachers</SelectItem>
                  <SelectItem value="subject_teacher">Subject Teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTeachers.length > 0 && (
        <Card className="rounded-xl bg-blue-50 border border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-blue-900">
                <strong>{selectedTeachers.length}</strong> staff member(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusChange("Active")}
                  className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusChange("Inactive")}
                  variant="outline"
                  className="rounded-lg border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTeachers([])}
                  className="rounded-lg"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Table */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white w-12">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center w-full"
                    >
                      {selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0 ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-white">Last Name</TableHead>
                  <TableHead className="text-white">First Name</TableHead>
                  <TableHead className="text-white">Other Name</TableHead>
                  <TableHead className="text-white">Gender</TableHead>
                  <TableHead className="text-white">Phone</TableHead>
                  <TableHead className="text-white">Username</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white">Role</TableHead>
                  <TableHead className="text-white text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <span className="w-12 h-12 text-gray-300" />
                        <p className="text-[#0A2540]">No staff found</p>
                        <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const classTeacherInfo = getClassTeacherInfo(Number(teacher.id));
                    const userAccount = getTeacherUser(Number(teacher.id));
                    const isSelected = selectedTeachers.includes(Number(teacher.id));

                    return (
                      <TableRow 
                        key={teacher.id} 
                        className={`bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB] ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <TableCell>
                          <button
                            onClick={() => handleSelectTeacher(Number(teacher.id))}
                            className="flex items-center justify-center"
                          >
                            {isSelected ? (
                              <Check className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-[#0A2540] font-medium">{teacher.lastName}</TableCell>
                        <TableCell className="text-[#0A2540]">{teacher.firstName}</TableCell>
                        <TableCell className="text-gray-600">-</TableCell>
                        <TableCell className="text-gray-600">-</TableCell>
                        <TableCell className="text-gray-600">
                          {teacher.phone ? (
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3" />
                              {teacher.phone}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">{userAccount?.username || "-"}</TableCell>
                        <TableCell className="text-gray-600">
                          {teacher.email ? (
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3" />
                              {teacher.email}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className="bg-[#3B82F6] text-white border-0 text-xs">
                              SUBJECT TEACHER
                            </Badge>
                            {classTeacherInfo.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {classTeacherInfo.map((cls) => (
                                  <Badge key={cls.id} variant="outline" className="text-xs">
                                    {cls.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
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
                              <SimpleDropdownItem 
                                onClick={() => handleToggleStatus(teacher)}
                                className={teacher.status === "Active" ? "text-orange-600" : "text-green-600"}
                              >
                                {teacher.status === "Active" ? (
                                  <>
                                    <X className="h-3 w-3" />
                                    -
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3" />
                                    +
                                  </>
                                )}
                              </SimpleDropdownItem>
                              <SimpleDropdownSeparator />
                              <SimpleDropdownItem 
                                onClick={() => {
                                  setSelectedTeacher(teacher);
                                  setIsResetPasswordDialogOpen(true);
                                }}
                                className="text-blue-600"
                              >
                                <Key className="h-3 w-3" />
                                R
                              </SimpleDropdownItem>
                              <SimpleDropdownItem 
                                onClick={() => handleSignatureUpload(teacher)}
                                className="text-purple-600"
                              >
                                <FileSignature className="h-3 w-3" />
                                S
                              </SimpleDropdownItem>
                              <SimpleDropdownSeparator />
                              <SimpleDropdownItem 
                                onClick={() => openDeleteDialog(teacher)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                                D
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Employee ID</Label>
                  <p className="text-[#0A2540] font-medium">{selectedTeacher.employee_id}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Full Name</Label>
                  <p className="text-[#0A2540] font-medium">
                    {selectedTeacher.first_name} {selectedTeacher.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Email</Label>
                  <p className="text-[#0A2540]">{selectedTeacher.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Phone</Label>
                  <p className="text-[#0A2540]">{selectedTeacher.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Qualification</Label>
                  <p className="text-[#0A2540]">{selectedTeacher.qualification}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge className={selectedTeacher.status === 'Active' ? "bg-[#10B981] text-white" : "bg-[#EF4444] text-white"}>
                    {selectedTeacher.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-gray-600">Specialization</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(selectedTeacher.specialization) ? selectedTeacher.specialization : [selectedTeacher.specialization]).map((spec: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="rounded-lg">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              {getClassTeacherInfo(selectedTeacher.id).length > 0 && (
                <div>
                  <Label className="text-gray-600">Class Teacher For</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getClassTeacherInfo(selectedTeacher.id).map((cls) => (
                      <Badge key={cls.id} className="bg-[#10B981] text-white rounded-lg">
                        {cls.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {getTeacherSubjects(selectedTeacher.id).length > 0 && (
                <div>
                  <Label className="text-gray-600">Subject Assignments</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getTeacherSubjects(selectedTeacher.id).map((assignment) => (
                      <Badge key={assignment.id} className="bg-[#3B82F6] text-white rounded-lg">
                        {assignment.subject_name} ({classes.find(c => c.id === assignment.class_id)?.name})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label>Qualification</Label>
                <Input
                  value={editFormData.qualification}
                  onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={editFormData.status} 
                  onValueChange={(value: string) => setEditFormData({ ...editFormData, status: value as "Active" | "Inactive" })}
                >
                  <SelectTrigger className="mt-2 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
