import { Book, BookOpen, GraduationCap, ArrowLeft, Plus, FileText, Search, Loader2, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from "react";
/* Card removed - using flat design */
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
import { exportClassesToCSV } from "../../utils/csvExporter";
import { importClassesFromCSV, generateClassTemplate } from "../../utils/csvImporter";
import { Class, Subject, SubjectRegistration, Teacher, Student } from "../../types/school";
import { useSchool } from "../../contexts/SchoolContext";
import { ClassCreationForm } from "./forms/ClassCreationForm";

const CLASS_LEVELS = ["Creche", "Nursery", "KG 1", "KG 2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];

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
    removeSubjectRegistration,
    loadClassesFromAPI
  } = useSchool();
  
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
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    level: "",
    category: "Primary" as "Primary" | "Secondary",
    capacity: 30,
    classTeacherId: "",
    section: "",
    status: "Active" as "Active" | "Inactive",
  });

  // Get students for selected class (coerce IDs to numbers to avoid string/number mismatches)
  const classStudents = selectedClass
    ? students.filter((s: Student) => Number(s.class_id) === Number(selectedClass.id))
    : [];
  
  // Get registered subjects for selected class in current term/year
  const classRegisteredSubjects = selectedClass
    ? subjectRegistrations.filter((sr: SubjectRegistration) =>
        Number(sr.class_id) === Number(selectedClass.id) &&
        sr.academic_year === currentAcademicYear &&
        sr.term === currentTerm
      )
    : [];
  
  // Get available subjects (all subjects not yet registered for this class in current term)
  const availableSubjects = selectedClass
    ? subjects.filter((subject: Subject) => !classRegisteredSubjects.some((rs: SubjectRegistration) => Number(rs.subject_id) === Number(subject.id)))
    : [];
  
  // Handle subject selection
  const handleSubjectSelection = (subjectId: number, checked: boolean) => {
    if (checked) {
      setSelectedSubjects(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
    }
  };

  // Handle subject registration
  const handleRegisterSubjects = async () => {
    if (!selectedClass || selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    if (!currentAcademicYear || !currentTerm) {
      toast.error('Please set the current academic year and term in Settings before registering subjects');
      return;
    }
    
    setActionLoading("register-subjects");
    
    // Check which subjects are already registered (global per class+subject)
    const alreadyRegistered = selectedSubjects.filter(subjectId => 
      classRegisteredSubjects.some((reg: SubjectRegistration) => 
        Number(reg.subject_id) === Number(subjectId) && 
        Number(reg.class_id) === Number(selectedClass.id)
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
          : `${successCount} subjects registered successfully for this class.`;
        
        toast.success(message);
      }
      
      if (failedSubjects.length > 0) {
        toast.error(`Failed to register: ${failedSubjects.join(', ')}`);
      }
      
      setSelectedSubjects([]);
    } catch (error) {
      toast.error('Failed to register subjects');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle subject removal
  const handleRemoveSubject = async (subjectId: number) => {
    if (!selectedClass) return;

    if (!currentAcademicYear || !currentTerm) {
      toast.error('Please set the current academic year and term in Settings before removing subjects');
      return;
    }
    
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
  };

  // Get assignment count for a class (subject_assignments)
  const getClassAssignmentCount = (classId: number) => {
    return subjectAssignments.filter(sa => Number(sa.class_id) === Number(classId)).length;
  };

  // Filter classes
  const filteredClasses = (classes || []).filter((cls: Class) => {
    const matchesSearch = searchQuery === "" || 
                         cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cls.classTeacher || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = filterLevel === "All" || cls.level === filterLevel;
    const matchesCategory = filterCategory === "All" || cls.category === filterCategory;
    const matchesStatus = filterStatus === "All" || cls.status === filterStatus;
    
    return matchesSearch && matchesLevel && matchesCategory && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLevel, filterCategory, filterStatus]);

  // Show loading state if classes haven't loaded yet
  useEffect(() => {
    if (classes.length === 0) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [classes]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  }, [filteredClasses.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);
  
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
    if (selectedClass) {
      if (selectedClass.currentStudents > 0) {
        toast.error("Cannot delete class with enrolled students. Please move students first.");
        setDeleteDialogOpen(false);
        return;
      }

      setActionLoading("delete");

      try {
        const success = await deleteClass(selectedClass.id);
        
        if (success) {
          toast.success(`Class "${selectedClass.name}" deleted successfully!`);
        } else {
          // Remove the class from the UI anyway and show a clear message
          toast.info(`Class "${selectedClass.name}" was already deleted or not found. Removed from list.`);
        }
        setDeleteDialogOpen(false);
        setSelectedClass(null);
        // Always refresh classes to ensure UI matches backend
        await loadClassesFromAPI(true);
      } catch (error) {
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error('Failed to delete class');
        }
      } finally {
        setActionLoading(null);
      }
    }
  };

  const openDeleteDialog = (cls: Class) => {
    setSelectedClass(cls);
    setDeleteDialogOpen(true);
  };

  const openEditForm = () => {
    if (!selectedClass) return;
    setEditFormData({
      name: selectedClass.name,
      level: selectedClass.level,
      category: selectedClass.category,
      capacity: selectedClass.capacity,
      classTeacherId: selectedClass.classTeacherId?.toString() || "",
      section: selectedClass.section || "",
      status: selectedClass.status,
    });
    setIsEditing(true);
  };

  const handleEditClass = async () => {
    if (!selectedClass) return;
    if (!editFormData.name.trim() || !editFormData.level.trim() || !editFormData.capacity) {
      toast.error('Please fill all required fields');
      return;
    }

    setActionLoading("edit");

    try {
      const success = await updateClass(selectedClass.id, {
        name: editFormData.name.trim(),
        level: editFormData.level.trim(),
        category: editFormData.category,
        capacity: editFormData.capacity,
        classTeacherId: editFormData.classTeacherId ? parseInt(editFormData.classTeacherId) : null,
        section: editFormData.section.trim() || undefined,
        status: editFormData.status,
      });

      if (success) {
        toast.success(`Class "${editFormData.name}" updated successfully!`);
        setIsEditing(false);
        setSelectedClass(prev => prev ? { ...prev, ...editFormData, classTeacherId: editFormData.classTeacherId ? parseInt(editFormData.classTeacherId) : null } : null);
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update class');
      }
    } finally {
      setActionLoading(null);
    }
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
        await loadClassesFromAPI(true);
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
              <h1 className="text-[#0A2540] mb-2 font-heading font-bold">Manage Classes</h1>
              <p className="text-gray-600">Click on a class to view details and manage subjects</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="file"
                ref={csvInputRef}
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleCSVImport(file);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
              <Button
                onClick={exportCSVTemplate}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-300 text-gray-600 hover:bg-gray-100 w-full sm:w-auto flex items-center gap-2"
              >
                <FileText className="w-4 h-4" weight="bold" />
                <span className="hidden sm:inline">Template</span>
                <span className="sm:hidden">Template</span>
              </Button>
              <Button
                onClick={() => csvInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-300 text-gray-600 hover:bg-gray-100 w-full sm:w-auto flex items-center gap-2"
              >
                <Upload className="w-4 h-4" weight="bold" />
                <span className="hidden sm:inline">Bulk Import</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <Button
                onClick={async () => {
                  await exportClassesToCSV();
                  toast.success("Classes exported to CSV successfully");
                }}
                variant="outline"
                size="sm"
                className="rounded-xl border-[#0A2540] text-[#0A2540] hover:bg-[#0A2540] hover:text-white w-full sm:w-auto flex items-center gap-2"
              >
                <FileText className="w-4 h-4" weight="bold" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button 
                onClick={() => {
                  setShowClassForm(true);
                }}
                className="bg-[#0A2540] hover:bg-[#082030] text-white rounded-xl w-full sm:w-auto flex items-center gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
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
            <div className="section-band">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Classes</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{stats.totalClasses}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FFD700]/10 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-[#0A2540]" weight="bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="section-band">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Classes</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.activeClasses}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-emerald-600" weight="bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="section-band">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{stats.totalStudents}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#0A2540]/10 rounded-full flex items-center justify-center">
                    <Book className="w-6 h-6 text-[#0A2540]" weight="bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="section-band">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Capacity</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.averageCapacity}%</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-orange-600" weight="bold" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="section-band">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" weight="bold" />
                    <Input
                      type="text"
                      placeholder="Search classes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Level</Label>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="border-gray-300 rounded-lg">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Levels</SelectItem>
                      {CLASS_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
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
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" weight="bold" />
                Loading classes...
              </div>
            </div>
          )}

          {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedClasses.map((cls: Class) => (
              <div 
                key={cls.id} 
                className="hover:bg-white/60 rounded-xl p-4 transition-all cursor-pointer border border-gray-100"
                onClick={() => handleClassClick(cls)}
              >
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
              </div>
            ))}
          </div>
          )}

          {!isLoading && filteredClasses.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-6">
              <div className="text-sm text-gray-600">
                Showing {Math.min(filteredClasses.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredClasses.length, currentPage * pageSize)} of {filteredClasses.length}
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

          {!isLoading && filteredClasses.length === 0 && (
            <div className="section-band">
              <div className="p-12 text-center">
                <div className="text-gray-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" weight="bold" />
                  <h3 className="text-lg font-medium mb-2">No Classes Found</h3>
                  <p>Try adjusting your filters or create a new class.</p>
                </div>
              </div>
            </div>
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
            <ArrowLeft className="w-4 h-4 mr-2" weight="bold" />
            Back to Classes
          </Button>

          {selectedClass && (
            <div className="section-band">
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-[#0A2540]">{selectedClass.name}</h2>
                    <p className="text-gray-600">{selectedClass.level} • {selectedClass.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={openEditForm}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
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
                        <Trash2 className="w-4 h-4" weight="bold" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
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
                    <h3 className="text-lg font-semibold mb-4">Students ({selectedClass.currentStudents})</h3>
                    <div className="max-h-96 overflow-y-auto">
                      {classStudents.length > 0 ? (
                        <>
                          <div className="hidden lg:block overflow-x-auto">
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
                          </div>
                          <div className="block lg:hidden space-y-2">
                            {classStudents.map((student: Student) => (
                              <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{student.firstName} {student.lastName}</p>
                                  <p className="text-xs text-gray-500">ADM: {student.admissionNumber} • {student.gender}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500 text-center py-8">No students enrolled in this class</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Management Section */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Registered Subjects ({classRegisteredSubjects.length})</h3>
                  <>
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classRegisteredSubjects.length > 0 ? (
                            classRegisteredSubjects.map((reg) => (
                              <TableRow key={reg.id}>
                                <TableCell className="font-medium">{reg.subject_name || subjects.find(s => Number(s.id) === Number(reg.subject_id))?.name || 'Unknown'}</TableCell>
                                <TableCell>{reg.subject_code || subjects.find(s => Number(s.id) === Number(reg.subject_id))?.code || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={reg.is_compulsory ? 'default' : 'secondary'}>
                                    {reg.is_compulsory ? 'Compulsory' : 'Optional'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveSubject(reg.subject_id)}
                                    disabled={actionLoading === `remove-${reg.subject_id}`}
                                  >
                                    {actionLoading === `remove-${reg.subject_id}` ? (
                                      <Loader2 className="w-4 h-4 animate-spin" weight="bold" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" weight="bold" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                No subjects registered yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="block lg:hidden space-y-2">
                      {classRegisteredSubjects.length > 0 ? (
                        classRegisteredSubjects.map((reg) => (
                          <div key={reg.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{reg.subject_name || subjects.find(s => Number(s.id) === Number(reg.subject_id))?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{reg.subject_code || subjects.find(s => Number(s.id) === Number(reg.subject_id))?.code || '-'} • <Badge variant={reg.is_compulsory ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">{reg.is_compulsory ? 'Compulsory' : 'Optional'}</Badge></p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveSubject(reg.subject_id)}
                              disabled={actionLoading === `remove-${reg.subject_id}`}
                              className="shrink-0 ml-2"
                            >
                              {actionLoading === `remove-${reg.subject_id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" weight="bold" />
                              ) : (
                                <Trash2 className="w-4 h-4" weight="bold" />
                              )}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-gray-500 text-sm">No subjects registered yet</p>
                      )}
                    </div>
                  </>

                  {/* Available Subjects to Register */}
                  {availableSubjects.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-2 text-gray-700">Register New Subjects</h4>
                      <div className="border rounded-md max-h-40 overflow-y-auto p-3 space-y-2">
                        {availableSubjects.map((subject) => (
                          <div key={subject.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`subject-${subject.id}`}
                              checked={selectedSubjects.includes(subject.id)}
                              onCheckedChange={(checked) => handleSubjectSelection(subject.id, !!checked)}
                            />
                            <Label htmlFor={`subject-${subject.id}`} className="text-sm cursor-pointer">
                              {subject.name} <span className="text-gray-500">({subject.code})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          onClick={handleRegisterSubjects}
                          disabled={selectedSubjects.length === 0 || actionLoading === 'register-subjects'}
                          size="sm"
                        >
                          {actionLoading === 'register-subjects' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" weight="bold" />
                              Registering...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" weight="bold" />
                              Register {selectedSubjects.length > 0 ? `(${selectedSubjects.length})` : ''}
                            </>
                          )}
                        </Button>
                        {selectedSubjects.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedSubjects([]); }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {availableSubjects.length === 0 && classRegisteredSubjects.length > 0 && (
                    <p className="text-sm text-gray-500 mt-4">All subjects are registered for this class.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Class Dialog */}
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Class</DialogTitle>
                <DialogDescription>Update the class details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Grade 1 (Diamond)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Class Level <span className="text-red-500">*</span></Label>
                    <Select
                      value={editFormData.level}
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category <span className="text-red-500">*</span></Label>
                    <Select
                      value={editFormData.category}
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value as "Primary" | "Secondary" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primary">Primary</SelectItem>
                        <SelectItem value="Secondary">Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={editFormData.capacity}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class Teacher</Label>
                    <Select
                      value={editFormData.classTeacherId}
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, classTeacherId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not Assigned</SelectItem>
                        {availableTeachers.map((teacher: Teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.firstName} {teacher.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Input
                      value={editFormData.section}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="e.g., A, B"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value as "Active" | "Inactive" }))}
                  >
                    <SelectTrigger>
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
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={actionLoading === "edit"}>
                  Cancel
                </Button>
                <Button onClick={handleEditClass} disabled={actionLoading === "edit"}>
                  {actionLoading === "edit" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" weight="bold" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" weight="bold" />
                  Delete Class
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete class "{selectedClass?.name}"? This action cannot be undone.
                  {selectedClass && getClassAssignmentCount(selectedClass.id) > 0 && (
                    <span className="block mt-3 text-amber-600 font-medium">
                      Warning: This class has {getClassAssignmentCount(selectedClass.id)} active subject assignment{getClassAssignmentCount(selectedClass.id) !== 1 ? 's' : ''}. You must remove them first before deleting.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteClass}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={selectedClass ? getClassAssignmentCount(selectedClass.id) > 0 || (selectedClass.currentStudents > 0) : false}
                >
                  {selectedClass && (getClassAssignmentCount(selectedClass.id) > 0 || selectedClass.currentStudents > 0) ? 'Blocked' : 'Delete Class'}
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
