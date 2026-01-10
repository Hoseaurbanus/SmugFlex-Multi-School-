import { Book, BookOpen, GraduationCap, ArrowLeft, Plus, X, FileText } from 'lucide-react';
import { useState, useRef, useMemo, useEffect, lazy, Suspense, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { SimpleDropdown, SimpleDropdownItem, SimpleDropdownSeparator } from "../ui/simple-dropdown";
import { exportClassesToCSV } from "../../utils/csvExporter";
import { importClassesFromCSV, generateClassTemplate } from "../../utils/csvImporter";
import { useSchool, Class, Subject, SubjectRegistration, Teacher, Student } from "../../contexts/SchoolContext";
import { ClassCreationForm } from "./forms/ClassCreationForm";

function ManageClassesPageDesktop() {
  const { 
    teachers, 
    students, 
    classes, 
    subjects, 
    subjectRegistrations, 
    subjectAssignments,
    currentTerm,
    currentAcademicYear,
    addClass, 
    updateClass, 
    deleteClass,
    registerSubjectForClass,
    removeSubjectRegistration
  } = useSchool();
  
  // Debug: Monitor classes data changes
  useEffect(() => {
    console.log('=== MANAGE CLASSES PAGE DEBUG ===');
    console.log('Classes data changed:', classes.length, 'classes');
    console.log('Classes data:', classes);
  }, [classes]);
  
  // Get active teachers from context
  const availableTeachers = teachers.filter((t: Teacher) => t.status === 'Active');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showClassForm, setShowClassForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'details'>('grid');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [registrationPreview, setRegistrationPreview] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get students for selected class
  const classStudents = selectedClass ? students.filter((s: Student) => s.class_id === selectedClass.id) : [];
  
  // Get registered subjects for selected class
  const classRegisteredSubjects = selectedClass ? subjectRegistrations.filter(
    (sr: SubjectRegistration) => sr.class_id === selectedClass.id && 
           sr.term === currentTerm && 
           sr.academic_year === currentAcademicYear
  ) : [];
  
  // Debug: Log subject registration filtering
  useEffect(() => {
    if (selectedClass) {
      console.log('=== SUBJECT REGISTRATION DEBUG ===');
      console.log('Selected class:', selectedClass.name, 'ID:', selectedClass.id);
      console.log('Current term:', currentTerm);
      console.log('Current academic year:', currentAcademicYear);
      console.log('Total subject registrations:', subjectRegistrations.length);
      console.log('Subject registrations for this class:', subjectRegistrations.filter(sr => sr.class_id === selectedClass.id));
      console.log('Filtered registrations for current term/year:', classRegisteredSubjects);
      console.log('Filtered registrations count:', classRegisteredSubjects.length);
    }
  }, [selectedClass, subjectRegistrations, currentTerm, currentAcademicYear]);
  
  // Get available subjects (all subjects not yet registered for this class)
  const availableSubjects = selectedClass ? subjects.filter(
    (subject: Subject) => !classRegisteredSubjects.some((rs: SubjectRegistration) => rs.subject_id === subject.id)
  ) : [];
  
  // Handle subject selection with preview
  const handleSubjectSelection = (subjectId: number, checked: boolean) => {
    if (checked) {
      const newSelection = [...selectedSubjects, subjectId];
      setSelectedSubjects(newSelection);
      setRegistrationPreview(newSelection);
    } else {
      const newSelection = selectedSubjects.filter(id => id !== subjectId);
      setSelectedSubjects(newSelection);
      setRegistrationPreview(newSelection);
    }
  };

  // Handle subject registration
  const handleRegisterSubjects = async () => {
    if (!selectedClass || selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    
    setActionLoading("register-subjects");
    
    // Check which subjects are already registered
    const alreadyRegistered = selectedSubjects.filter(subjectId => 
      classRegisteredSubjects.some((reg: SubjectRegistration) => 
        reg.subject_id === subjectId && 
        reg.class_id === selectedClass.id &&
        reg.academic_year === currentAcademicYear &&
        reg.term === currentTerm
      )
    );
    
    const newSubjects = selectedSubjects.filter(subjectId => !alreadyRegistered.includes(subjectId));
    
    if (alreadyRegistered.length > 0) {
      const subjectNames = alreadyRegistered.map(id => {
        const subject = subjects.find(s => s.id === id);
        return subject?.name || 'Unknown';
      });
      toast.warning(`Subjects already registered: ${subjectNames.join(', ')}`);
    }
    
    if (newSubjects.length === 0) {
      toast.info('No new subjects to register');
      setSelectedSubjects([]);
      setRegistrationPreview([]);
      setActionLoading(null);
      return;
    }
    
    let successCount = 0;
    const failedSubjects = [];
    
    try {
      for (const subjectId of newSubjects) {
        try {
          const success = await registerSubjectForClass(
            selectedClass.id,
            subjectId,
            currentAcademicYear,
            currentTerm,
            true
          );
          
          if (success) {
            successCount++;
          } else {
            const subject = subjects.find(s => s.id === subjectId);
            failedSubjects.push(subject?.name || 'Unknown');
          }
        } catch (error) {
          const subject = subjects.find(s => s.id === subjectId);
          failedSubjects.push(subject?.name || 'Unknown');
        }
      }
      
      if (successCount > 0) {
        const message = failedSubjects.length > 0 
          ? `${successCount} subjects registered successfully. ${failedSubjects.length} failed.`
          : `${successCount} subjects registered successfully for ${currentTerm} ${currentAcademicYear}`;
        
        toast.success(message);
      }
      
      if (failedSubjects.length > 0) {
        toast.error(`Failed to register: ${failedSubjects.join(', ')}`);
      }
      
      setSelectedSubjects([]);
      setRegistrationPreview([]);
    } catch (error) {
      toast.error('Failed to register subjects');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle subject removal
  const handleRemoveSubject = async (subjectId: number) => {
    if (!selectedClass) return;
    
    setActionLoading(`remove-${subjectId}`);
    
    try {
      const success = await removeSubjectRegistration(
        selectedClass.id,
        subjectId,
        currentAcademicYear,
        currentTerm
      );
      
      if (success) {
        toast.success('Subject removed successfully');
      } else {
        toast.error('Failed to remove subject');
      }
    } catch (error) {
      toast.error('Failed to remove subject');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle class click for details view
  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls);
    setViewMode('details');
  };
  
  // Handle back to grid view
  const handleBackToGrid = () => {
    setViewMode('grid');
    setSelectedClass(null);
    setSelectedSubjects([]);
    setRegistrationPreview([]);
  };

  // Filter classes
  const filteredClasses = (classes || []).filter((cls: Class) => {
    const matchesSearch = searchQuery === "" || 
                         cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cls.classTeacher || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Map levels to categories for filtering
    const getCategoryFromLevel = (level: string) => {
      if (level === 'Primary' || level === 'Nursery' || level === 'Creche') return 'Primary';
      if (level.includes('JSS') || level.includes('SSS')) return 'Secondary';
      return 'Primary'; // Default fallback
    };
    
    const classCategory = getCategoryFromLevel(cls.level);
    
    const matchesLevel = filterLevel === "All" || cls.level === filterLevel;
    const matchesCategory = filterCategory === "All" || classCategory === filterCategory;
    const matchesStatus = filterStatus === "All" || cls.status === filterStatus;
    
    // Debug logging
    console.log('=== CLASS FILTER DEBUG ===');
    console.log('Class:', cls.name, 'Level:', cls.level, 'Status:', cls.status);
    console.log('Filters - Search:', searchQuery, 'Level:', filterLevel, 'Category:', filterCategory, 'Status:', filterStatus);
    console.log('Matches - Search:', matchesSearch, 'Level:', matchesLevel, 'Category:', matchesCategory, 'Status:', matchesStatus);
    console.log('Class Category:', classCategory);
    
    return matchesSearch && matchesLevel && matchesCategory && matchesStatus;
  });
  
  console.log('=== FILTERED CLASSES DEBUG ===');
  console.log('Total classes:', classes.length);
  console.log('Filtered classes:', filteredClasses.length);
  console.log('Classes array:', classes);

  // Statistics
  const stats = {
    totalClasses: (classes || []).length,
    activeClasses: (classes || []).filter(c => c.status === "Active").length,
    totalStudents: (classes || []).reduce((sum, c) => sum + c.currentStudents, 0),
    averageCapacity: (classes || []).length > 0 ? Math.round((classes || []).reduce((sum, c) => sum + (c.currentStudents / c.capacity * 100), 0) / (classes || []).length) : 0,
  };

  const handleCreateClassSuccess = () => {
    // Refresh classes data is handled by the form
    setShowClassForm(false);
  };

  const handleCreateClassClose = () => {
    setShowClassForm(false);
  };

  const handleDeleteClass = async () => {
    console.log('=== DELETE CLASS DEBUG ===');
    console.log('Selected class:', selectedClass);
    
    if (selectedClass) {
      if (selectedClass.currentStudents > 0) {
        toast.error("Cannot delete class with enrolled students. Please move students first.");
        setDeleteDialogOpen(false);
        return;
      }

      setActionLoading("delete");

      try {
        console.log('Calling deleteClass for ID:', selectedClass.id);
        const success = await deleteClass(selectedClass.id);
        console.log('deleteClass result:', success);
        
        if (success) {
          toast.success(`Class "${selectedClass.name}" deleted successfully!`);
          setDeleteDialogOpen(false);
          setSelectedClass(null);
        } else {
          toast.error('Failed to delete class - API returned false');
        }
      } catch (error) {
        console.error('Delete class error:', error);
        toast.error('Failed to delete class');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const openDeleteDialog = (cls: Class) => {
    setSelectedClass(cls);
    setDeleteDialogOpen(true);
  };

  const exportCSVTemplate = () => {
    const template = generateClassTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class_import_template.csv';
    a.click();
    toast.success("CSV template downloaded");
  };

  const handleCSVImport = async (file: File) => {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const result = await importClassesFromCSV(file);
      
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`);
        }
      
      if (result.valid.length > 0) {
        // Here you would typically send the valid data to your API
        // For now, we'll just show success message
        toast.success(`${result.valid.length} classes imported successfully`);
        
        // Refresh classes data
        window.location.reload();
      } else {
        toast.error("No valid classes found in CSV file");
      }
    } catch (error) {
      toast.error("Failed to import CSV file");
      }
  };

  return (
    <div className="p-6 space-y-6">
      {viewMode === 'grid' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0A2540] mb-2">Manage Classes</h1>
              <p className="text-gray-600">Click on a class to view details and manage subjects</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={async () => {
                  await exportClassesToCSV();
                  toast.success("Classes exported to CSV successfully");
                }}
                variant="outline"
                size="sm"
                className="rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white w-full sm:w-auto flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button 
                onClick={() => {
                  console.log('=== CREATE BUTTON CLICKED ===');
                  setShowClassForm(true);
                }}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl w-full sm:w-auto flex items-center gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create New Class</span>
                <span className="sm:hidden">New Class</span>
              </Button>
            </div>
          </div>

          {/* Class Creation Form Dialog */}
          {showClassForm && (
            <Dialog open={showClassForm} onOpenChange={setShowClassForm}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Class</DialogTitle>
                  <DialogDescription>Fill in the details to create a new class. Class name must be unique.</DialogDescription>
                </DialogHeader>
                <ClassCreationForm 
                  onClose={handleCreateClassClose}
                  onSuccess={handleCreateClassSuccess}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-[#0A2540]/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Classes</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{stats.totalClasses}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#0A2540]/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Classes</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeClasses}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#0A2540]/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{stats.totalStudents}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Book className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#0A2540]/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Capacity</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.averageCapacity}%</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-[#0A2540]/10 shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Search</Label>
                  <Input
                    type="text"
                    placeholder="Search classes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-gray-300 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Level</Label>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="border-gray-300 rounded-lg">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Levels</SelectItem>
                      <SelectItem value="Creche">Creche</SelectItem>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="KG 1">KG 1</SelectItem>
                      <SelectItem value="KG 2">KG 2</SelectItem>
                      <SelectItem value="Grade 1">Grade 1</SelectItem>
                      <SelectItem value="Grade 2">Grade 2</SelectItem>
                      <SelectItem value="Grade 3">Grade 3</SelectItem>
                      <SelectItem value="Grade 4">Grade 4</SelectItem>
                      <SelectItem value="Grade 5">Grade 5</SelectItem>
                      <SelectItem value="JSS 1">JSS 1</SelectItem>
                      <SelectItem value="JSS 2">JSS 2</SelectItem>
                      <SelectItem value="JSS 3">JSS 3</SelectItem>
                      <SelectItem value="SSS 1">SSS 1</SelectItem>
                      <SelectItem value="SSS 2">SSS 2</SelectItem>
                      <SelectItem value="SSS 3">SSS 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="border-gray-300 rounded-lg">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="border-gray-300 rounded-lg">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((cls: Class) => (
              <Card 
                key={cls.id} 
                className="border-[#0A2540]/10 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleClassClick(cls)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-[#0A2540]">{cls.name}</h3>
                    <Badge variant={cls.status === 'Active' ? 'default' : 'secondary'}>
                      {cls.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Level:</span>
                      <span className="text-sm font-medium">{cls.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Teacher:</span>
                      <span className="text-sm font-medium">{cls.classTeacher || 'Not Assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Students:</span>
                      <span className="text-sm font-medium">{cls.currentStudents}/{cls.capacity}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClasses.length === 0 && (
            <Card className="border-[#0A2540]/10 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="text-gray-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Classes Found</h3>
                  <p>Try adjusting your filters or create a new class.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Details View - Keep existing implementation */
        <div>
          <Button
            onClick={handleBackToGrid}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Button>

          {selectedClass && (
            <Card className="border-[#0A2540]/10 shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0A2540]">{selectedClass.name}</h2>
                    <p className="text-gray-600">{selectedClass.level} • {selectedClass.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openDeleteDialog(selectedClass)}
                      variant="destructive"
                      size="sm"
                      disabled={actionLoading === "delete"}
                    >
                      {actionLoading === "delete" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <span className="w-4 h-4 mr-2" />
                          Delete Class
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Class Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600">Class Teacher:</span>
                        <p className="font-medium">{selectedClass.classTeacher || 'Not Assigned'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <p className="font-medium">{selectedClass.capacity} students</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Students:</span>
                        <p className="font-medium">{selectedClass.currentStudents} students</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={selectedClass.status === 'Active' ? 'default' : 'secondary'}>
                          {selectedClass.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Students ({classStudents.length})</h3>
                    <div className="max-h-96 overflow-y-auto">
                      {classStudents.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Admission No</TableHead>
                              <TableHead>Gender</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classStudents.map((student: Student) => (
                              <TableRow key={student.id}>
                                <TableCell>{student.firstName} {student.lastName}</TableCell>
                                <TableCell>{student.admissionNumber}</TableCell>
                                <TableCell>{student.gender}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-gray-500 text-center py-8">No students enrolled in this class</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Class</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete class "{selectedClass?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteClass}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Class
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export default ManageClassesPageDesktop;
export { ManageClassesPageDesktop as ManageClassesPage };
