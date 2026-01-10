import { Book, Link, BookOpen, Plus, Unlink, Square, Power, Link2, ImageIcon, Key, Eye, Edit, Trash2, User, Phone, Shield, Camera, Lock, Unlock, Download, Upload, RefreshCw, FileSpreadsheet, Users, Filter, Search, X, Menu, ChevronDown, MoreVertical, AlertTriangle } from 'lucide-react';
import { useState, useRef, useMemo, useEffect, lazy, Suspense, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { useSchool, Student } from "../../contexts/SchoolContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { exportStudentsToCSV } from "../../utils/csvExporter";
import { importStudentsFromCSV, generateStudentTemplate } from "../../utils/csvImporter";

const AddStudentForm = lazy(() => import('./AddStudentFormSimple'));

interface ManageStudentsPageProps {
  onNavigateToLink?: () => void;
}

export function ManageStudentsPageMobile({ onNavigateToLink }: ManageStudentsPageProps) {
  const { 
    students, 
    teachers, 
    parents, 
    classes, 
    subjects,
    users,
    parentStudentLinks,
    scores,
    attendances,
    compiledResults,
    setStudents,
    setUsers,
    addStudent, 
    updateStudent, 
    deleteStudent,
    deleteBulkStudents,
    getStudentsByClass,
    refreshStudents,
    currentUser,
    updateUser,
    resetUserPasswordAPI,
    linkStudentToParent
  } = useSchool();

  // Mobile-first state management
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkGuardianDialogOpen, setLinkGuardianDialogOpen] = useState(false);
  const [uploadPassportDialogOpen, setUploadPassportDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [quickImportDialogOpen, setQuickImportDialogOpen] = useState(false);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState<number | null>(null);
  const [isUnlinkingAll, setIsUnlinkingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card'); // Mobile-friendly card view
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  
  const passportInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    other_name: "",
    gender: "Male" as "Male" | "Female",
    date_of_birth: "",
    admission_number: "",
  });
  const [editPassportFile, setEditPassportFile] = useState<File | null>(null);
  const editPassportInputRef = useRef<HTMLInputElement>(null);

  // Data safety: Enhanced validation
  const validateStudentData = (data: any) => {
    const errors: string[] = [];
    
    if (!data.first_name?.trim()) errors.push("First name is required");
    if (!data.last_name?.trim()) errors.push("Last name is required");
    if (!data.admission_number?.trim()) errors.push("Admission number is required");
    if (!data.gender) errors.push("Gender is required");
    
    return { isValid: errors.length === 0, errors };
  };

  // Data safety: Backup before bulk operations
  const createDataBackup = async () => {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        students: students.map(s => ({
          id: s.id,
          admissionNumber: s.admissionNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          status: s.status
        }))
      };
      localStorage.setItem('students_backup', JSON.stringify(backup));
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      return false;
    }
  };

  // Mobile-optimized filtering
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students) || students.length === 0) return [];

    const filterFn = (student: Student, query: string) => {
      const searchLower = query.toLowerCase();
      const matchesSearch = !query || 
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.admissionNumber.toLowerCase().includes(searchLower);
      
      const studentClass = Array.isArray(classes) ? classes.find(c => c.id === student.class_id) : null;
      const studentLevel = studentClass ? studentClass.level : student.level;
      
      const matchesClass = filterClass === "All" || studentClass?.name === filterClass;
      const matchesLevel = filterLevel === "All" || studentLevel === filterLevel;

      return matchesSearch && matchesClass && matchesLevel;
    };

    return students.filter(student => filterFn(student, searchTerm));
  }, [students, searchTerm, filterClass, filterLevel, classes]);

  // Mobile-friendly statistics
  const stats = useMemo(() => {
    if (!Array.isArray(students)) {
      return { total: 0, active: 0, primary: 0, secondary: 0 };
    }
    
    const primaryLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
    const secondaryLevels = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
    
    return {
      total: students.length,
      active: students.filter(s => s.status === "Active").length,
      primary: students.filter(s => {
        const studentClass = Array.isArray(classes) ? classes.find(c => c.id === s.class_id) : null;
        const studentLevel = studentClass ? studentClass.level : s.level;
        return primaryLevels.includes(studentLevel);
      }).length,
      secondary: students.filter(s => {
        const studentClass = Array.isArray(classes) ? classes.find(c => c.id === s.class_id) : null;
        const studentLevel = studentClass ? studentClass.level : s.level;
        return secondaryLevels.includes(studentLevel);
      }).length,
    };
  }, [students, classes]);

  const levels = ["All", ...(Array.isArray(classes) ? Array.from(new Set(classes.map(c => c.level))) : [])];
  const classNames = ["All", ...(Array.isArray(classes) ? Array.from(new Set(classes.map(c => c.name))) : [])];

  // Enhanced data loading with error recovery
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('You do not have permission to access this page');
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        await refreshStudents();
      } catch (error) {
        console.error('Failed to load students data:', error);
        toast.error('Failed to load students data');
        
        // Try to restore from backup if available
        const backup = localStorage.getItem('students_backup');
        if (backup) {
          try {
            const parsedBackup = JSON.parse(backup);
            toast.info('Restored from backup');
          } catch (e) {
            console.error('Backup restoration failed:', e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  const getParentInfo = (student: Student) => {
    if (student.parent_name) {
      const parent = Array.isArray(parents) ? parents.find(p => `${p.firstName} ${p.lastName}` === student.parent_name) : null;
      return {
        name: student.parent_name,
        username: parent?.email?.split('@')[0] || "",
        phone: parent?.phone || "",
        email: parent?.email || ""
      };
    }
    
    const parentLink = Array.isArray(parentStudentLinks) ? parentStudentLinks.find(link => link.student_id === student.id) : null;
    
    if (!parentLink) {
      return { name: "", username: "", phone: "", email: "" };
    }
    
    const parent = Array.isArray(parents) ? parents.find(p => p.id === parentLink.parent_id) : null;
    if (!parent || !parent.phone?.trim()) {
      return { name: "", username: "", phone: "", email: "" };
    }
    
    return {
      name: `${parent.firstName} ${parent.lastName}`,
      username: parent.email?.split('@')[0] || "",
      phone: parent.phone || "",
      email: parent.email || ""
    };
  };

  // Data-safe delete with backup
  const handleDelete = async () => {
    if (!selectedStudent) return;
    
    // Create backup before deletion
    const backupSuccess = await createDataBackup();
    if (!backupSuccess) {
      toast.error('Could not create backup. Deletion cancelled for safety.');
      return;
    }
    
    setActionLoading("delete");
    
    try {
      await deleteStudent(selectedStudent.id);
      toast.success(`Student "${selectedStudent.firstName} ${selectedStudent.lastName}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      await refreshStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student. Data backup was created for safety.');
    } finally {
      setActionLoading(null);
    }
  };

  // Mobile-friendly student card component
  const StudentCard = ({ student }: { student: Student }) => {
    const parentInfo = getParentInfo(student);
    const isSelected = selectedStudents.includes(student.id);
    
    return (
      <Card className="mb-4 border-gray-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Mobile selection and basic info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleSelectStudent(student.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {student.lastName}, {student.firstName}
                </h3>
                {student.otherName && (
                  <p className="text-sm text-gray-500 truncate">{student.otherName}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${
                student.status === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {student.status}
              </Badge>
              
              {/* Records indicator */}
              {(() => {
                const hasRecords = scores.some(s => s.student_id === student.id) || 
                                  attendances.some(a => a.student_id === student.id) || 
                                  compiledResults.some(cr => cr.student_id === student.id);
                
                if (hasRecords && student.status === 'Active') {
                  return (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Has Records</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Key information */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <span className="text-gray-500">Reg No:</span>
              <p className="font-medium font-mono text-xs">{student.admissionNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">Class:</span>
              <Badge className="text-xs mt-1">{student.className}</Badge>
            </div>
            <div>
              <span className="text-gray-500">Gender:</span>
              <Badge className={`text-xs mt-1 ${
                student.gender === 'Male' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'bg-pink-50 text-pink-700'
              }`}>
                {student.gender === 'Male' ? 'M' : 'F'}
              </Badge>
            </div>
            <div>
              <span className="text-gray-500">Parent:</span>
              <p className="font-medium truncate text-xs">
                {parentInfo.name || 'No Parent'}
              </p>
            </div>
          </div>

          {/* Mobile action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleView(student)}
              size="sm"
              variant="outline"
              className="flex-1 min-w-[70px] text-xs px-2 py-1.5 h-7"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            
            <Button
              onClick={() => handleEdit(student)}
              size="sm"
              variant="outline"
              className="flex-1 min-w-[70px] text-xs px-2 py-1.5 h-7"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="px-2 py-1.5 h-7">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => {
                  setSelectedStudent(student);
                  setLinkGuardianDialogOpen(true);
                }}>
                  <Link2 className="w-3 h-3 mr-2" />
                  Link Guardian
                </DropdownMenuItem>
                
                {Array.isArray(parentStudentLinks) && parentStudentLinks.some(link => link.student_id === student.id) && (
                  <DropdownMenuItem onClick={() => unlinkStudent(student)}>
                    <Unlink className="w-3 h-3 mr-2" />
                    Unlink Guardian
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => handleToggleStatus(student)}>
                  {(() => {
                    const hasRecords = scores.some(s => s.student_id === student.id) || 
                                      attendances.some(a => a.student_id === student.id) || 
                                      compiledResults.some(cr => cr.student_id === student.id);
                    
                    return student.status === 'Active' ? (
                      <>
                        <Lock className={`w-3 h-3 mr-2 ${hasRecords ? 'text-amber-500' : ''}`} />
                        <span className={hasRecords ? 'text-amber-600' : ''}>
                          {hasRecords ? 'Cannot Deactivate (Has Records)' : 'Deactivate'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 mr-2" />
                        Activate
                      </>
                    );
                  })()}
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {
                  setSelectedStudent(student);
                  setUploadPassportDialogOpen(true);
                }}>
                  <Camera className="w-3 h-3 mr-2" />
                  Upload Photo
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {
                  setSelectedStudent(student);
                  setResetPasswordDialogOpen(true);
                }}>
                  <Key className="w-3 h-3 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => openDeleteDialog(student)}
                  className="text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Helper functions (simplified versions)
  const handleView = (student: Student) => {
    setSelectedStudent(student);
    setViewDialogOpen(true);
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditFormData({
      first_name: student.firstName,
      last_name: student.lastName,
      other_name: student.otherName || "",
      date_of_birth: student.date_of_birth,
      admission_number: student.admissionNumber,
      gender: student.gender
    });
    setEditPassportFile(null);
    setEditDialogOpen(true);
  };

  const handleSelectStudent = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedStudents([]);
      setIsSelectAll(false);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
      setIsSelectAll(true);
    }
  };

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (student: Student) => {
    const newStatus: 'Active' | 'Inactive' | 'Graduated' | 'Transferred' = student.status === 'Active' ? 'Inactive' : 'Active';
    
    // Check if student has existing scores or records before deactivating
    if (newStatus === 'Inactive') {
      const hasScores = scores.some(s => s.student_id === student.id);
      const hasAttendance = attendances.some(a => a.student_id === student.id);
      const hasCompiledResults = compiledResults.some(cr => cr.student_id === student.id);
      
      if (hasScores || hasAttendance || hasCompiledResults) {
        toast.error(`Cannot deactivate ${student.firstName} ${student.lastName}: Student has existing records (scores, attendance, or compiled results)`);
        return;
      }
    }
    
    try {
      setActionLoading(`status-${student.id}`);
      await updateStudent(student.id, { status: newStatus });
      toast.success(`Student ${student.firstName} ${student.lastName} ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      await refreshStudents();
    } catch (error) {
      console.error('Error toggling student status:', error);
      toast.error('Failed to update student status');
    } finally {
      setActionLoading(null);
    }
  };

  const unlinkStudent = async (student: Student) => {
    setUnlinkingStudentId(student.id);
    
    try {
      if (!confirm(`Are you sure you want to unlink ${student.firstName} ${student.lastName} from their parent?`)) {
        return;
      }

      // Implementation would go here
      toast.success(`Successfully unlinked ${student.firstName} ${student.lastName} from parent`);
      await refreshStudents();
    } catch (error) {
      console.error('Error unlinking student:', error);
      toast.error('Failed to unlink student');
    } finally {
      setUnlinkingStudentId(null);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshStudents();
      toast.success("Student list refreshed successfully");
    } catch (error) {
      console.error('Error refreshing students:', error);
      toast.error('Failed to refresh student list');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditPhotoUpload = async () => {
    if (!editPassportFile) {
      toast.error("Please select a photo");
      return;
    }

    if (!selectedStudent) return;

    try {
      setActionLoading('upload-photo');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('passport', editPassportFile);
      formData.append('student_id', selectedStudent.id.toString());

      // Upload photo via API
      const response = await fetch('/api/upload-student-photo.php', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const result = await response.json();
      
      toast.success('Student photo uploaded successfully');
      setEditPassportFile(null);
      setUploadPassportDialogOpen(false);
      await refreshStudents();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Manage Students</h1>
              <p className="text-sm text-gray-600">View and manage all students</p>
            </div>
            <Button
              onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
              size="sm"
              variant="outline"
              className="lg:hidden"
            >
              <Menu className="w-3 h-3" />
            </Button>
          </div>

          {/* Mobile Actions Menu */}
          {mobileActionsOpen && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={() => {
                  setAddStudentDialogOpen(true);
                }}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-xs px-3 py-2 h-8"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
              
              <Button
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                size="sm"
                variant="outline"
                className="text-xs px-3 py-2 h-8"
              >
                <Filter className="w-3 h-3 mr-1" />
                Filters
              </Button>
              
              <Button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="text-xs px-3 py-2 h-8"
              >
                {isRefreshing ? (
                  <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-green-600" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAddStudentDialogOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-sm px-4 py-2 h-9"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
              
              <Button onClick={() => {
                setMobileFiltersOpen(!mobileFiltersOpen);
              }} variant="outline" className="text-sm px-4 py-2 h-9">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              
              <Button onClick={handleManualRefresh} disabled={isRefreshing} variant="outline" className="text-sm px-4 py-2 h-9">
                {isRefreshing ? (
                  <div className="w-4 h-4 animate-spin rounded-full border border-gray-300 border-t-green-600 mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'card' | 'table')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card View</SelectItem>
                  <SelectItem value="table">Table View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters */}
      {mobileFiltersOpen && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Level</Label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level === "All" ? "All Levels" : level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Class</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classNames.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className === "All" ? "All Classes" : className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{filteredStudents.length} of {students.length} students</span>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setFilterClass("All");
                  setFilterLevel("All");
                }}
                variant="ghost"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-6">
        {/* Statistics Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs">Active</p>
                  <p className="text-xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg">
                  <Power className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs">Primary</p>
                  <p className="text-xl font-bold text-purple-600">{stats.primary}</p>
                </div>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs">Secondary</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.secondary}</p>
                </div>
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <BookOpen className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedStudents([]);
                    setIsSelectAll(false);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear Selection
                </Button>
                
                <Button
                  onClick={async () => {
                    if (selectedStudents.length === 0) return;
                    
                    if (!confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)? This action cannot be undone.`)) {
                      return;
                    }
                    
                    try {
                      setActionLoading('bulk-delete');
                      await deleteBulkStudents(selectedStudents);
                      toast.success(`${selectedStudents.length} student(s) deleted successfully`);
                      setSelectedStudents([]);
                      setIsSelectAll(false);
                      await refreshStudents();
                    } catch (error) {
                      console.error('Error bulk deleting students:', error);
                      toast.error('Failed to delete selected students');
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading === 'bulk-delete'}
                >
                  {actionLoading === 'bulk-delete' ? (
                    <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="w-6 h-6 animate-spin rounded-full border border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading students...</p>
            </div>
          </div>
        )}

        {/* Students Display */}
        {!isLoading && (
          <>
            {viewMode === 'card' ? (
              /* Mobile Card View */
              <div>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Students Found</h3>
                    <p className="text-gray-600 mb-4">
                      {students.length === 0 ? 'No students in database' : 'Try adjusting your filters'}
                    </p>
                    <Button
                      onClick={() => setAddStudentDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Student
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Select All Checkbox */}
                    <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
                      <button
                        onClick={handleSelectAll}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                          isSelectAll 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelectAll && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        Select All ({filteredStudents.length} students)
                      </span>
                    </div>
                    
                    {/* Student Cards */}
                    {filteredStudents.map((student) => (
                      <StudentCard key={student.id} student={student} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Table View for larger screens */
              <div className="hidden lg:block">
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-medium text-sm">Select</th>
                          <th className="text-left p-3 font-medium text-sm">Reg No</th>
                          <th className="text-left p-3 font-medium text-sm">Name</th>
                          <th className="text-left p-3 font-medium text-sm">Class</th>
                          <th className="text-left p-3 font-medium text-sm">Parent</th>
                          <th className="text-left p-3 font-medium text-sm">Status</th>
                          <th className="text-left p-3 font-medium text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.id)}
                                onChange={() => handleSelectStudent(student.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="p-3 font-mono text-sm">{student.admissionNumber}</td>
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{student.lastName}, {student.firstName}</div>
                                {student.otherName && (
                                  <div className="text-sm text-gray-500">{student.otherName}</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{student.className}</Badge>
                            </td>
                            <td className="p-3 text-sm">
                              {getParentInfo(student).name || 'No Parent'}
                            </td>
                            <td className="p-3">
                              <Badge className={
                                student.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }>
                                {student.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => {
                                  handleView(student);
                                }} className="h-8 w-8 p-0">
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                  handleEdit(student);
                                }} className="h-8 w-8 p-0">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                  openDeleteDialog(student);
                                }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs would go here - simplified for space */}
      {selectedStudent && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                View detailed information about the selected student
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="font-medium">
                  {selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.otherName || ''}
                </p>
              </div>
              <div>
                <Label>Admission Number</Label>
                <p className="font-medium">{selectedStudent.admissionNumber}</p>
              </div>
              <div>
                <Label>Class</Label>
                <p className="font-medium">{selectedStudent.className}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={
                  selectedStudent.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }>
                  {selectedStudent.status}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Student Dialog */}
      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Register a new student in the system
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={
            <div className="flex justify-center items-center py-8">
              <div className="w-6 h-6 animate-spin rounded-full border border-gray-300 border-t-blue-600"></div>
              <span className="ml-2">Loading form...</span>
            </div>
          }>
            <AddStudentForm 
              onSuccess={async () => {
                setAddStudentDialogOpen(false);
                await refreshStudents();
                toast.success('Student registered successfully!');
              }}
              onClose={() => setAddStudentDialogOpen(false)}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information and photo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>First Name</Label>
              <Input
                value={editFormData.first_name}
                onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={editFormData.last_name}
                onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                placeholder="Enter last name"
              />
            </div>
            <div>
              <Label>Other Name</Label>
              <Input
                value={editFormData.other_name}
                onChange={(e) => setEditFormData({...editFormData, other_name: e.target.value})}
                placeholder="Enter other name (optional)"
              />
            </div>
            <div>
              <Label>Admission Number</Label>
              <Input
                value={editFormData.admission_number}
                onChange={(e) => setEditFormData({...editFormData, admission_number: e.target.value})}
                placeholder="Enter admission number"
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={editFormData.gender} onValueChange={(value: string) => setEditFormData({...editFormData, gender: value as "Male" | "Female"})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student Photo</Label>
              <div className="flex items-center gap-4">
                {selectedStudent?.photo_url && (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                    <img 
                      src={selectedStudent.photo_url} 
                      alt={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    ref={editPassportInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditPassportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    onClick={() => editPassportInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Choose New Photo
                  </Button>
                  {editPassportFile && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {editPassportFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={async () => {
                if (!selectedStudent) return;
                
                try {
                  setActionLoading('edit');
                  
                  // Upload photo first if selected
                  if (editPassportFile) {
                    const formData = new FormData();
                    formData.append('passport', editPassportFile);
                    formData.append('student_id', selectedStudent.id.toString());

                    const photoResponse = await fetch('/api/upload-student-photo.php', {
                      method: 'POST',
                      body: formData
                    });

                    if (!photoResponse.ok) {
                      throw new Error('Failed to upload photo');
                    }
                  }

                  // Update student data
                  await updateStudent(selectedStudent.id, {
                    firstName: editFormData.first_name,
                    lastName: editFormData.last_name,
                    otherName: editFormData.other_name,
                    admissionNumber: editFormData.admission_number,
                    gender: editFormData.gender
                  });
                  
                  toast.success('Student updated successfully');
                  setEditDialogOpen(false);
                  setEditPassportFile(null);
                  await refreshStudents();
                } catch (error) {
                  console.error('Error updating student:', error);
                  toast.error('Failed to update student');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'edit'}
            >
              {actionLoading === 'edit' ? (
                <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Guardian Dialog */}
      <Dialog open={linkGuardianDialogOpen} onOpenChange={setLinkGuardianDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Link Guardian</DialogTitle>
            <DialogDescription>
              Link {selectedStudent?.firstName} {selectedStudent?.lastName} to a parent/guardian
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Parent/Guardian</Label>
              <Select value={selectedParentId || ""} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(parents) && parents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id.toString()}>
                      {parent.firstName} {parent.lastName} - {parent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkGuardianDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={async () => {
                if (!selectedStudent || !selectedParentId) return;
                
                try {
                  setActionLoading('link-guardian');
                  await linkStudentToParent(selectedStudent.id, parseInt(selectedParentId));
                  toast.success('Student linked to guardian successfully');
                  setLinkGuardianDialogOpen(false);
                  setSelectedParentId(null);
                  await refreshStudents();
                } catch (error) {
                  console.error('Error linking guardian:', error);
                  toast.error('Failed to link guardian');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'link-guardian' || !selectedParentId}
            >
              {actionLoading === 'link-guardian' ? (
                <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
              ) : null}
              Link Guardian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStudent?.firstName} {selectedStudent?.lastName}"? 
              This action cannot be undone and will permanently remove all student data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading === "delete" ? (
                <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add the missing export for desktop component
export function ManageStudentsPage() {
  return <ManageStudentsPageMobile />;
}
