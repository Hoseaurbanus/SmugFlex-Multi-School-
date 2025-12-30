import { Book, BookOpen, GraduationCap, ArrowLeft, Plus, X } from 'lucide-react';
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
  const [showForm, setShowForm] = useState(false);
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
            subjectId,
            selectedClass.id,
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
        subjectId,
        selectedClass.id,
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    capacity: "",
    classTeacherId: "",
    status: "Active" as "Active" | "Inactive",
    category: "" as "Primary" | "Secondary" | "",
    level: "",
  });

  // Filter classes
  const filteredClasses = (classes || []).filter((cls: Class) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const handleCreateClass = async () => {
    console.log('=== CREATE CLASS DEBUG ===');
    console.log('Form data:', formData);
    
    if (!formData.name || !formData.capacity || !formData.classTeacherId || !formData.category || !formData.level) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading("create");
    
    const capacity = parseInt(formData.capacity);
    if (capacity > 50) {
      toast.error("Class capacity cannot exceed 50 students");
      setActionLoading(null);
      return;
    }

    const teacher = availableTeachers.find((t: Teacher) => t.id === parseInt(formData.classTeacherId));
    
    const newClass: Omit<Class, 'id'> = {
      name: formData.name,
      level: formData.level,
      category: formData.category,
      capacity: parseInt(formData.capacity),
      currentStudents: 0,
      classTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
      classTeacherId: parseInt(formData.classTeacherId),
      section: formData.section,
      status: formData.status,
      academicYear: '2024/2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('New class object:', newClass);

    try {
      console.log('Calling addClass...');
      const success = await addClass(newClass);
      console.log('addClass result:', success);
      
      if (success) {
        toast.success(`Class "${newClass.name}" created successfully!`);
        resetForm();
        setShowForm(false);
      } else {
        toast.error('Failed to create class - API returned false');
      }
    } catch (error) {
      console.error('Create class error:', error);
      toast.error('Failed to create class');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditClass = async () => {
    if (!selectedClass || !formData.name || !formData.capacity || !formData.classTeacherId || !formData.category || !formData.level) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading("edit");

    const capacity = parseInt(formData.capacity);
    if (capacity > 50) {
      toast.error("Class capacity cannot exceed 50 students");
      setActionLoading(null);
      return;
    }

    const teacher = availableTeachers.find((t: Teacher) => t.id === parseInt(formData.classTeacherId));

    const updatedClass: Partial<Class> = {
      name: formData.name,
      level: formData.level,
      category: formData.category,
      capacity: parseInt(formData.capacity),
      classTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
      classTeacherId: parseInt(formData.classTeacherId),
      section: formData.section,
      status: formData.status,
    };

    try {
      updateClass(selectedClass.id, updatedClass);
      toast.success(`Class "${formData.name}" updated successfully!`);
      resetForm();
      setShowForm(false);
      setIsEditing(false);
      setSelectedClass(null);
    } catch (error) {
      toast.error('Failed to update class');
    } finally {
      setActionLoading(null);
    }
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

  const openEditForm = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      section: (cls.section || "").toString(),
      capacity: cls.capacity.toString(),
      classTeacherId: cls.classTeacherId?.toString() || "",
      status: cls.status,
      category: cls.category,
      level: cls.level,
    });
    setIsEditing(true);
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDeleteDialog = (cls: Class) => {
    setSelectedClass(cls);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      section: "",
      capacity: "",
      classTeacherId: "",
      status: "Active",
      category: "",
      level: "",
    });
    setIsEditing(false);
    setSelectedClass(null);
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
    toast.info('Form cancelled - no changes made');
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
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  await exportClassesToCSV();
                  toast.success("Classes exported to CSV successfully");
                }}
                variant="outline"
                className="rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
              >
                <span className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => {
                  console.log('=== CREATE BUTTON CLICKED ===');
                  console.log('showForm before:', showForm);
                  console.log('viewMode:', viewMode);
                  setShowForm(true);
                  console.log('showForm after:', showForm);
                }}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
              >
                <span className="w-4 h-4 mr-2" />
                Create New Class
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-[#0A2540]/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Classes</p>
                    <p className="text-[#0A2540]">{stats.totalClasses}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#0A2540]/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Active Classes</p>
                    <p className="text-[#0A2540]">{stats.activeClasses}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <span className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#0A2540]/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Students</p>
                    <p className="text-[#0A2540]">{stats.totalStudents}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <span className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#0A2540]/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Avg. Capacity</p>
                    <p className="text-[#0A2540]">{stats.averageCapacity}%</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-[#0A2540]/10">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search classes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl border-[#0A2540]/20"
                  />
                </div>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="rounded-xl border-[#0A2540]/20">
                    <SelectValue placeholder="Class Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Levels</SelectItem>
                    <SelectItem value="Creche">Creche</SelectItem>
                    <SelectItem value="Nursery">Nursery</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="JSS 1">JSS 1</SelectItem>
                    <SelectItem value="JSS 2">JSS 2</SelectItem>
                    <SelectItem value="JSS 3">JSS 3</SelectItem>
                    <SelectItem value="SSS 1">SSS 1</SelectItem>
                    <SelectItem value="SSS 2">SSS 2</SelectItem>
                    <SelectItem value="SSS 3">SSS 3</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="rounded-xl border-[#0A2540]/20">
                    <SelectValue placeholder="School Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    <SelectItem value="Primary">Primary School</SelectItem>
                    <SelectItem value="Secondary">Secondary School</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="rounded-xl border-[#0A2540]/20">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Class Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClasses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <span className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No classes found</p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                >
                  <span className="w-4 h-4 mr-2" />
                  Create First Class
                </Button>
              </div>
            ) : (
              filteredClasses.map((cls: Class) => (
                <Card 
                  key={cls.id} 
                  className="border-[#0A2540]/10 hover:border-[#3B82F6]/30 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleClassClick(cls)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#0A2540] mb-1">{cls.name}</h3>
                        <Badge 
                          variant={cls.category === 'Primary' ? 'default' : 'secondary'} 
                          className="rounded-xl mb-2"
                        >
                          {cls.category === 'Primary' ? '🎓 Primary' : '🎓 Secondary'}
                        </Badge>
                      </div>
                      <Badge 
                        className={`rounded-xl ${
                          cls.status === "Active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {cls.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Level:</span>
                        <span className="font-medium">{cls.level}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Section:</span>
                        <span className="font-medium">{cls.section || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Class Teacher:</span>
                        <span className="font-medium">{cls.classTeacher || 'Not Assigned'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{cls.currentStudents}/{cls.capacity}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-[#0A2540]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (cls.currentStudents / cls.capacity) * 100 >= 90 ? 'bg-red-500' :
                              (cls.currentStudents / cls.capacity) * 100 >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((cls.currentStudents / cls.capacity) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {Math.round((cls.currentStudents / cls.capacity) * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleClassClick(cls);
                        }}
                      >
                        <span className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="rounded-xl"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          openEditForm(cls);
                        }}
                      >
                        <span className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        /* Class Details View */
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleBackToGrid}
                className="rounded-xl border-[#0A2540]/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Classes
              </Button>
              <div>
                <h1 className="text-[#0A2540] text-2xl">{selectedClass?.name}</h1>
                <p className="text-gray-600">Class Details and Subject Management</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Class Information */}
            <Card className="border-[#0A2540]/10">
              <CardHeader>
                <CardTitle className="text-[#0A2540] flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Class Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Class Name:</span>
                  <span className="font-medium">{selectedClass?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Level:</span>
                  <Badge variant="outline" className="rounded-xl">
                    {selectedClass?.level}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category:</span>
                  <Badge 
                    variant={selectedClass?.category === 'Primary' ? 'default' : 'secondary'} 
                    className="rounded-xl"
                  >
                    {selectedClass?.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Section:</span>
                  <span className="font-medium">{selectedClass?.section || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Class Teacher:</span>
                  <span className="font-medium">{selectedClass?.classTeacher || 'Not Assigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enrollment:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{selectedClass?.currentStudents}/{selectedClass?.capacity}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge 
                    className={`rounded-xl ${
                      selectedClass?.status === "Active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedClass?.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Academic Year:</span>
                  <span className="font-medium">{selectedClass?.academicYear}</span>
                </div>
              </CardContent>
            </Card>

            {/* Professional Subject Registration */}
            <Card className="border-[#0A2540]/10 lg:col-span-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5" />
                    <span>Subject Registration Portal</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {currentTerm} • {currentAcademicYear}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  Register subjects for {selectedClass?.name} - {selectedClass?.level}
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Registration Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Registered</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{classRegisteredSubjects.length}</p>
                    <p className="text-xs text-green-600">Subjects active</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Available</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{availableSubjects.length}</p>
                    <p className="text-xs text-blue-600">Subjects to register</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Selected</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{selectedSubjects.length}</p>
                    <p className="text-xs text-purple-600">Pending registration</p>
                  </div>
                </div>

                {/* Registered Subjects Display */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-[#0A2540] flex items-center gap-2">
                      <span className="w-5 h-5 text-green-600" />
                      Registered Subjects
                    </h4>
                    <Badge variant="outline" className="border-green-200 text-green-700">
                      {classRegisteredSubjects.length} Active
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classRegisteredSubjects.length === 0 ? (
                      <div className="col-span-full text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No subjects registered yet</p>
                        <p className="text-sm text-gray-400 mt-1">Select subjects below to register for this class</p>
                      </div>
                    ) : (
                      classRegisteredSubjects.map((reg) => (
                        <div key={reg.id} className="group relative bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-semibold text-green-900">{reg.subject_name}</h5>
                                <Badge className="bg-green-100 text-green-700 text-xs border-green-200">
                                  {reg.subject_code}
                                </Badge>
                              </div>
                              <p className="text-sm text-green-700">{reg.subject_category}</p>
                              <div className="flex items-center gap-1 mt-2">
                                <span className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-green-600">Registered for {currentTerm}</span>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionLoading === `remove-${reg.subject_id}`}
                              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveSubject(reg.subject_id)}
                              title="Remove subject"
                            >
                              {actionLoading === `remove-${reg.subject_id}` ? (
                                <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Subject Selection Interface - Compact Design */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-[#0A2540] flex items-center gap-2">
                      <span className="w-5 h-5 text-blue-600" />
                      Register New Subjects
                    </h4>
                    {registrationPreview.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        {registrationPreview.length} Selected
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto pr-2">
                    {availableSubjects.length === 0 ? (
                      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300">
                        <span className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                        <p className="text-blue-600 font-medium">All subjects registered</p>
                        <p className="text-sm text-blue-500 mt-1">This class has all available subjects registered</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {availableSubjects.map((subject) => {
                          const isSelected = selectedSubjects.includes(subject.id);
                          const isPreviewed = registrationPreview.includes(subject.id);
                          return (
                            <div 
                              key={subject.id} 
                              className={`group relative rounded-lg border-2 p-3 transition-all cursor-pointer hover:shadow-md ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                                  : isPreviewed
                                  ? 'border-blue-300 bg-blue-50/50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`subject-${subject.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked: boolean) => 
                                    handleSubjectSelection(subject.id, checked as boolean)
                                  }
                                  className="w-4 h-4 mt-1 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <label 
                                    htmlFor={`subject-${subject.id}`}
                                    className="font-semibold text-[#0A2540] cursor-pointer hover:text-blue-700 transition-colors text-sm leading-tight block"
                                  >
                                    {subject.name}
                                  </label>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {subject.code}
                                    </Badge>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-600">{subject.category}</span>
                                    {subject.is_core && (
                                      <Badge className="bg-orange-100 text-orange-700 text-xs px-1 py-0 border-orange-200">
                                        Core
                                      </Badge>
                                    )}
                                  </div>
                                  {isPreviewed && (
                                    <div className="flex items-center gap-1 mt-2 text-blue-600">
                                      <Plus className="w-3 h-3" />
                                      <span className="text-xs font-medium">Will Register</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Registration Action */}
                  {selectedSubjects.length > 0 && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Ready to register {selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            These subjects will be available for student results and report cards
                          </p>
                        </div>
                        <Button 
                          onClick={handleRegisterSubjects}
                          disabled={actionLoading === "register-subjects"}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg"
                          size="lg"
                        >
                          {actionLoading === "register-subjects" ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Registering...
                            </>
                          ) : (
                            <>
                              <span className="w-4 h-4 mr-2" />
                              Register Subjects
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students List */}
          <Card className="border-[#0A2540]/10">
            <CardHeader>
              <CardTitle className="text-[#0A2540] flex items-center gap-2">
                <span className="w-5 h-5" />
                Students in {selectedClass?.name} ({classStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No students enrolled in this class yet</p>
                  <p className="text-sm text-gray-400">Students will appear here once they are enrolled</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#0A2540]/5">
                        <TableHead className="text-[#0A2540]">Student ID</TableHead>
                        <TableHead className="text-[#0A2540]">Name</TableHead>
                        <TableHead className="text-[#0A2540]">Gender</TableHead>
                        <TableHead className="text-[#0A2540]">Date of Birth</TableHead>
                        <TableHead className="text-[#0A2540]">Admission Date</TableHead>
                        <TableHead className="text-[#0A2540]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((student) => (
                        <TableRow key={student.id} className="hover:bg-[#0A2540]/5">
                          <TableCell className="text-[#0A2540]">{student.admissionNumber}</TableCell>
                          <TableCell className="text-[#0A2540]">
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-xl">
                              {student.gender}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">{student.date_of_birth}</TableCell>
                          <TableCell className="text-gray-600">{student.admission_date}</TableCell>
                          <TableCell>
                            <Badge 
                              className={`rounded-xl ${
                                student.status === "Active" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Inline Form (for creating/editing classes) */}
      {showForm && viewMode === 'grid' && (
        <>
          {console.log('=== FORM RENDERING ===', { showForm, viewMode })}
          <Card className="border-[#0A2540]/10 shadow-lg">
          <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5">
            <div className="flex items-center justify-between">
              <h3 className="text-[#0A2540]">
                {isEditing ? `Edit Class: ${selectedClass?.name}` : "Create New Class"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelForm}
                className="text-gray-500 hover:text-gray-700 rounded-xl"
              >
                <span className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">School Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: string) => {
                      setFormData({ ...formData, category: value as "Primary" | "Secondary" | "", level: "" });
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue placeholder="Select school category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary">Primary School</SelectItem>
                      <SelectItem value="Secondary">Secondary School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Class Level *</Label>
                  <Select 
                    value={formData.level} 
                    onValueChange={(value: string) => {
                      setFormData({ ...formData, level: value });
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue placeholder="Select class level" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.category === "Primary" && (
                        <>
                          <SelectItem value="Nursery 1">Nursery 1</SelectItem>
                          <SelectItem value="Nursery 2">Nursery 2</SelectItem>
                          <SelectItem value="Primary 1">Primary 1</SelectItem>
                          <SelectItem value="Primary 2">Primary 2</SelectItem>
                          <SelectItem value="Primary 3">Primary 3</SelectItem>
                          <SelectItem value="Primary 4">Primary 4</SelectItem>
                          <SelectItem value="Primary 5">Primary 5</SelectItem>
                          <SelectItem value="Primary 6">Primary 6</SelectItem>
                        </>
                      )}
                      {formData.category === "Secondary" && (
                        <>
                          <SelectItem value="JSS 1">JSS 1</SelectItem>
                          <SelectItem value="JSS 2">JSS 2</SelectItem>
                          <SelectItem value="JSS 3">JSS 3</SelectItem>
                          <SelectItem value="SSS 1">SSS 1</SelectItem>
                          <SelectItem value="SSS 2">SSS 2</SelectItem>
                          <SelectItem value="SSS 3">SSS 3</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Class Name *</Label>
                  <Input
                    placeholder="e.g., JSS 1A, SS 2B, Primary 3A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Section (Optional)</Label>
                  <Input
                    placeholder="e.g., A, B, Morning"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Capacity * (Max: 50)</Label>
                  <Input
                    type="number"
                    placeholder="Maximum number of students (50 max)"
                    value={formData.capacity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value <= 50) {
                        setFormData({ ...formData, capacity: e.target.value });
                      }
                    }}
                    max={50}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                  />
                  <p className="text-xs text-gray-500">Maximum class capacity is 50 students</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Class Teacher *</Label>
                  <Select 
                    value={formData.classTeacherId} 
                    onValueChange={(value: string) => setFormData({ ...formData, classTeacherId: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue placeholder="Select class teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachers.map((teacher: Teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: string) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={isEditing ? handleEditClass : handleCreateClass}
                  disabled={actionLoading === "create" || actionLoading === "edit"}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                >
                  {actionLoading === "create" || actionLoading === "edit" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {isEditing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 mr-2" />
                      {isEditing ? "Update Class" : "Create Class"}
                    </>
                  )}
                </Button>
                <Button 
                  onClick={cancelForm}
                  variant="outline"
                  className="border-[#0A2540]/20 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedClass?.name}"? 
              {selectedClass?.currentStudents && selectedClass.currentStudents > 0 
                ? ` This class has ${selectedClass.currentStudents} students enrolled.`
                : " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={async () => {
                if (selectedClass) {
                  await handleDeleteClass();
                }
              }}
              disabled={actionLoading === "delete"}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {actionLoading === "delete" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Export the desktop component
export function ManageClassesPage() {
  return <ManageClassesPageDesktop />;
}
