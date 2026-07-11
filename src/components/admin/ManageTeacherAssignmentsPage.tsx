import { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { api } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { Plus, MagnifyingGlass, PencilSimple, Trash, BookOpen, Users, X, Check, Warning, Trophy, Clock, Lightning, UserCheck, Calendar, Funnel, CaretDown, CaretUp, SquaresFour, List, User, CircleNotch, FloppyDisk, FileText } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function ManageTeacherAssignmentsPage() {
  const {
    teachers,
    classes,
    subjects,
    subjectAssignments,
    classTeacherAssignments,
    assignSubjectToTeacherAPI,
    removeSubjectAssignmentAPI,
    currentAcademicYear,
    currentTerm,
    updateClass,
    updateTeacher,
    getTeacherAssignments,
    loadSubjectAssignmentsFromAPI,
    loadClassTeacherAssignmentsFromAPI,
    loadTeachersFromAPI,
    loadClassesFromAPI,
    validateClassTeacherAssignment,
    loadCurrentTermAndYear,
    subjectRegistrations,
    loadSubjectRegistrationsFromAPI,
  } = useSchool();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'subjects' | 'class-teachers'>('subjects');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isClassTeacherDialogOpen, setIsClassTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<{ subject_id: number; class_id: number }[]>([]);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>('');
  const [selectedClassIdForAssignments, setSelectedClassIdForAssignments] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<Array<{
    id: string;
    action: string;
    teacherName: string;
    details: string;
    timestamp: Date;
    type: 'assignment' | 'class_teacher' | 'removal';
  }>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<'subject' | 'class-teacher' | null>(null);
  const [confirmDeleteDetails, setConfirmDeleteDetails] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');

  // Map of valid subject/class combinations (filtered by current term and academic year)
  // Key format: `${class_id}-${subject_id}`
  const subjectRegistrationMap = useMemo(() => {
    const map = new Map<string, boolean>();

    if (!subjectRegistrations || !Array.isArray(subjectRegistrations)) return map;

    subjectRegistrations
      .filter((sr: any) =>
        sr.status === 'Active' &&
        sr.academic_year === currentAcademicYear &&
        sr.term === currentTerm
      )
      .forEach((sr: any) => {
        map.set(`${sr.class_id}-${sr.subject_id}`, true);
      });

    return map;
  }, [subjectRegistrations, currentAcademicYear, currentTerm]);

  // Subjects available for the currently selected class (based on database structure)
  const availableSubjectsForSelectedClass = useMemo(() => {
    if (!subjects) return [];
    
    // Get selected class to determine level
    const selectedClass = classes?.find(c => c.id === selectedClassIdForAssignments);
    if (!selectedClass) return [];
    
    // Filter subjects based on actual database class levels
    const classLevelSubjects = subjects.filter((subject: any) => {
      const classLevel = selectedClass.level?.toLowerCase();
      const subjectCategory = subject.category?.toLowerCase();
      
      // Only show subjects registered for this class in the current term
      if (!subjectRegistrationMap.has(`${selectedClass.id}-${subject.id}`)) return false;
      
      // Handle empty subject categories - include them for appropriate classes
      if (!subjectCategory || subjectCategory === '') {
        return classLevel.includes('kg') || classLevel.includes('kindergarten') || classLevel.includes('grade k');
      }
      
      // Exact category match
      if (subjectCategory === classLevel) return true;
      
      // Creche classes
      if (classLevel === 'creche' && subjectCategory === 'creche') return true;
      
      // KG/Kindergarten classes
      if ((classLevel.includes('kg') || classLevel.includes('kindergarten')) && subjectCategory === 'nursery') return true;
      
      // Primary classes (Grade 1, Grade 2, etc.)
      if (classLevel.includes('grade') && subjectCategory === 'primary') return true;
      
      // JSS classes (JSS 1, JSS 2, etc.)
      if (classLevel.includes('jss') && subjectCategory === 'jss') return true;
      
      // SS classes (if any exist)
      if (classLevel.includes('ss') && subjectCategory === 'ss') return true;
      
      // General subjects for all classes
      if (subjectCategory === 'general') return true;
      
      return false;
    });
    
    return classLevelSubjects.map((subject: any) => ({
      ...subject,
      canAssign: true
    }));
  }, [selectedClassIdForAssignments, subjects, classes, subjectRegistrationMap]);

  // Filtered teachers for search
  const filteredTeachers = useMemo(() => {
    if (!teachers || !Array.isArray(teachers)) return [];
    
    const activeTeachers = teachers.filter((t: any) => t.status === 'Active');
    
    if (!teacherSearchTerm.trim()) return activeTeachers;
    
    const searchTerm = teacherSearchTerm.toLowerCase();
    return activeTeachers.filter((teacher: any) => 
      teacher.firstName?.toLowerCase().includes(searchTerm) ||
      teacher.lastName?.toLowerCase().includes(searchTerm) ||
      `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm) ||
      teacher.id?.toString().includes(searchTerm)
    );
  }, [teachers, teacherSearchTerm]);

  // Filtered classes for search
  const filteredClasses = useMemo(() => {
    if (!classes || !Array.isArray(classes)) return [];
    
    if (!classSearchTerm.trim()) return classes;
    
    const searchTerm = classSearchTerm.toLowerCase();
    return classes.filter((cls: any) => 
      cls.name?.toLowerCase().includes(searchTerm) ||
      cls.level?.toLowerCase().includes(searchTerm) ||
      cls.id?.toString().includes(searchTerm)
    );
  }, [classes, classSearchTerm]);

  // Statistics
  const stats = {
    totalAssignments: subjectAssignments ? subjectAssignments.filter(a => a.status === 'Active').length : 0,
    uniqueTeachers: subjectAssignments ? new Set(subjectAssignments.map(a => a.teacher_id)).size : 0,
    uniqueSubjects: subjectAssignments ? new Set(subjectAssignments.map(a => a.subject_id)).size : 0,
    uniqueClasses: subjectAssignments ? new Set(subjectAssignments.map(a => a.class_id)).size : 0,
    classTeachersWithAssignments: classes ? classes.filter(c => c.classTeacherId).length : 0,
  };

  // Filter assignments
  const filteredAssignments = subjectAssignments ? subjectAssignments.filter(assignment => {
    const matchesSearch = searchQuery === '' || 
      assignment.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.class_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeacher = filterTeacher === 'All' || assignment.teacher_id === parseInt(filterTeacher);
    const matchesClass = filterClass === 'All' || assignment.class_id === parseInt(filterClass);
    
    return matchesSearch && matchesTeacher && matchesClass && assignment.status === 'Active';
  }) : [];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTeacher, filterClass, activeTab]);

  const paginatedCounts = useMemo(() => {
    const total = activeTab === 'subjects' ? filteredAssignments.length : classTeacherAssignments.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return { total, totalPages };
  }, [activeTab, filteredAssignments.length, classTeacherAssignments.length, pageSize]);

  useEffect(() => {
    if (currentPage > paginatedCounts.totalPages) setCurrentPage(paginatedCounts.totalPages);
  }, [currentPage, paginatedCounts.totalPages]);

  const paginatedFilteredAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, currentPage, pageSize]);

  const paginatedClassTeacherAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return classTeacherAssignments.slice(start, start + pageSize);
  }, [classTeacherAssignments, currentPage, pageSize]);

  // Execute deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId || !confirmDeleteType) return;

    setRemovingAssignmentId(confirmDeleteId);

    try {
      if (confirmDeleteType === 'subject') {
        const assignment = subjectAssignments?.find(a => String(a.id) === confirmDeleteId);
        if (!assignment) {
          toast.error('Assignment not found');
          return;
        }
        const success = await removeSubjectAssignmentAPI(
          assignment.teacher_id,
          assignment.subject_id,
          assignment.class_id,
          assignment.academic_year,
          assignment.term
        );
        if (success) {
          toast.success('Assignment removed successfully');
        } else {
          toast.error('Failed to remove assignment');
        }
      } else {
        const assignment = classTeacherAssignments?.find((a: any) => String(a.id) === confirmDeleteId);
        if (!assignment) {
          toast.error('Assignment not found');
          return;
        }
        await handleRemoveClassTeacher(assignment);
      }
    } catch (error) {
      toast.error('An error occurred while removing assignment');
    } finally {
      setRemovingAssignmentId(null);
      setConfirmDeleteId(null);
      setConfirmDeleteType(null);
      setConfirmDeleteDetails('');
    }
  };

  // Add activity log
  const addActivityLog = (action: string, teacherName: string, details: string, type: 'assignment' | 'class_teacher' | 'removal') => {
    const newLog = {
      id: Date.now().toString(),
      action,
      teacherName,
      details,
      timestamp: new Date(),
      type
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 10)); // Keep only last 10 logs
  };

  // Handle assignment dialog
  const handleOpenAssignDialog = () => {
    setSelectedAssignments([]);
    setSelectedTeacherId(null);
    setSelectedClassIdForAssignments(null);
    setTeacherSearchTerm('');
    setClassSearchTerm('');
    setIsAssignDialogOpen(true);
  };

  const handleAddAssignment = (subject_id: number, class_id: number) => {
    const exists = selectedAssignments.some((a) => a.subject_id === subject_id && a.class_id === class_id);

    if (exists) {
      setSelectedAssignments(selectedAssignments.filter((a) => !(a.subject_id === subject_id && a.class_id === class_id)));
    } else {
      setSelectedAssignments([...selectedAssignments, { subject_id, class_id }]);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedTeacherId || selectedAssignments.length === 0) {
      toast.error('Please select a teacher and at least one assignment');
      return;
    }

    // Validate current term and academic year
    if (!currentAcademicYear || !currentTerm) {
      toast.error('Current academic year or term is not set. Please refresh the page.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;

      for (const assignment of selectedAssignments) {
        // Check if assignment already exists
        const exists = subjectAssignments?.some(
          (a) =>
            a.teacher_id === selectedTeacherId &&
            a.subject_id === assignment.subject_id &&
            a.class_id === assignment.class_id &&
            a.term === currentTerm &&
            a.academic_year === currentAcademicYear
        );

        if (!exists) {
          const success = await assignSubjectToTeacherAPI(
            selectedTeacherId!,
            assignment.subject_id,
            assignment.class_id,
            currentAcademicYear!,
            currentTerm!
          );

          if (success) {
            successCount++;
            const teacher = teachers?.find(t => t.id === selectedTeacherId);
            const subject = subjects?.find(s => s.id === assignment.subject_id);
            const cls = classes?.find(c => c.id === assignment.class_id);
            
            addActivityLog(
              'Subject Assigned',
              `${teacher?.firstName} ${teacher?.lastName}`,
              `${subject?.name} assigned to ${cls?.name}`,
              'assignment'
            );
          } else {
            failureCount++;
          }
        } else {
          skippedCount++;
        }
      }

      if (successCount > 0) {
        let message = `${successCount} assignment${successCount > 1 ? 's' : ''} created successfully for ${currentTerm} ${currentAcademicYear}`;
        if (skippedCount > 0) message += ` (${skippedCount} already exist${skippedCount > 1 ? 'ed' : 'ed'} and ${skippedCount > 1 ? 'were' : 'was'} skipped)`;
        toast.success(message);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        setSelectedAssignments([]);
        setSelectedTeacherId(null);
        setIsAssignDialogOpen(false);
        
        // Refresh data to show new assignments and update counts
        await Promise.all([
          loadSubjectAssignmentsFromAPI(),
          loadTeachersFromAPI(), // Refresh to update assignment counts
          loadClassesFromAPI()    // Refresh to update teacher counts
        ]);
      } else if (failureCount === 0 && skippedCount > 0) {
        toast.info(`All ${skippedCount} selected assignment${skippedCount > 1 ? 's' : ''} already exist`);
      } else if (failureCount === 0) {
        toast.info('All selected assignments already exist');
      } else {
        toast.error(`Failed to create ${failureCount} assignment${failureCount > 1 ? 's' : ''}`);
      }
      
    } catch (error) {
      toast.error('Failed to save assignments. Please try again.');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle class teacher dialog
  const handleOpenClassTeacherDialog = () => {
    setSelectedTeacherId(null);
    setSelectedClassForTeacher('');
    setTeacherSearchTerm('');
    setClassSearchTerm('');
    setIsClassTeacherDialogOpen(true);
  };

  const handleAssignClassTeacher = async () => {
    
    if (!selectedTeacherId || !selectedClassForTeacher) {
      toast.error('Please select both teacher and class');
      return;
    }

    // Validate current term and academic year
    if (!currentAcademicYear || !currentTerm) {
      toast.error('Current academic year or term is not set. Please refresh the page.');
      return;
    }

    const teacher = teachers?.find(t => t.id.toString() === selectedTeacherId.toString());
    const cls = classes?.find(c => c.id.toString() === selectedClassForTeacher.toString());

    if (!teacher || !cls) {
      toast.error('Invalid teacher or class selection');
      return;
    }

    const classIdNumber = parseInt(selectedClassForTeacher);
    const alreadyAssigned = (classTeacherAssignments || []).some((a: any) =>
      String(a.teacher_id) === String(selectedTeacherId) &&
      String(a.class_id) === String(classIdNumber) &&
      String(a.term) === String(currentTerm) &&
      String(a.academic_year) === String(currentAcademicYear) &&
      String(a.status || 'Active') === 'Active'
    );

    if (alreadyAssigned) {
      toast.info(`This class teacher assignment already exists for ${currentTerm} ${currentAcademicYear}`);
      return;
    }

    try {
      // Create term-specific class teacher assignment
      const response = await api.post(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.CREATE, {
        teacher_id: selectedTeacherId,
        class_id: classIdNumber,
        academic_year: currentAcademicYear,
        term: currentTerm
      });

      if (response && response.success) {
        toast.success(`${teacher.firstName} ${teacher.lastName} assigned as class teacher of ${cls.name} for ${currentTerm} ${currentAcademicYear}`);
        
        // Add activity log
        addActivityLog(
          'Class Teacher Assigned',
          `${teacher.firstName} ${teacher.lastName}`,
          `Assigned as class teacher to ${cls.name} for ${currentTerm} ${currentAcademicYear}`,
          'class_teacher'
        );

        // Refresh data to show new assignments and update counts
        await Promise.all([
          loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
          loadTeachersFromAPI(), // Refresh to update assignment counts
          loadClassesFromAPI()    // Refresh to update teacher counts
        ]);

        setSelectedTeacherId(null);
        setSelectedClassForTeacher('');
        setIsClassTeacherDialogOpen(false);
      } else {
        toast.error(response?.message || 'Failed to assign class teacher');
      }
    } catch (error) {
      const message = String((error as any)?.message || '');
      if (message.toLowerCase().includes('duplicate entry') || message.toLowerCase().includes('unique_assignment')) {
        toast.info(`This class teacher assignment already exists for ${currentTerm} ${currentAcademicYear}`);
        return;
      }
      toast.error('An error occurred while assigning class teacher');
    }
  };

  const handleRemoveClassTeacher = async (assignment: any) => {
    if (!assignment?.id) {
      toast.error('Unable to remove class teacher: missing assignment id');
      return;
    }
    if (!currentAcademicYear || !currentTerm) {
      toast.error('Current academic year or term is not set. Please refresh the page.');
      return;
    }

    try {
      setRemovingAssignmentId(String(assignment.id));
      const deleteResponse = await api.delete(
        API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.DELETE(assignment.id)
      );

      if (deleteResponse && deleteResponse.success) {
        toast.success(`Class teacher removed from ${assignment.class_name}`);

        addActivityLog(
          'Class Teacher Removed',
          assignment.teacher_name || 'Unknown',
          `Removed as class teacher from ${assignment.class_name} for ${currentTerm} ${currentAcademicYear}`,
          'class_teacher'
        );

        await Promise.all([
          loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
          loadTeachersFromAPI(),
          loadClassesFromAPI(),
        ]);
      } else {
        toast.error(deleteResponse?.message || 'Failed to remove class teacher');
      }
    } catch (error) {
      toast.error('An error occurred while removing class teacher');
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Ensure current term and year are loaded
        await loadCurrentTermAndYear();
        
        await Promise.all([
          loadSubjectAssignmentsFromAPI(),
          loadClassTeacherAssignmentsFromAPI(),
          loadTeachersFromAPI(),
          loadClassesFromAPI(),
          loadSubjectRegistrationsFromAPI(),
        ]);
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const reloadForTermYear = async () => {
      if (!currentAcademicYear || !currentTerm) return;
      try {
        await Promise.all([
          loadSubjectAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
          loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
          loadSubjectRegistrationsFromAPI(),
        ]);
      } catch (error) {
        // Silent fail for security
      }
    };

    reloadForTermYear();
  }, [currentAcademicYear, currentTerm]);

  // Reload class teacher assignments when tab changes to refresh data
  useEffect(() => {
    if (activeTab === 'class-teachers' && currentAcademicYear && currentTerm) {
      loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear).catch(() => {});
    }
  }, [activeTab, currentAcademicYear, currentTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#0A2540]/5">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-heading font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-[#0A2540] rounded-lg">
                  <UserCheck weight="bold" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                Teacher Assignments
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm">Manage subject assignments and class teacher roles</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={handleOpenAssignDialog}
                className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 sm:px-6 w-full sm:w-auto flex items-center justify-center gap-2 h-10 sm:h-auto"
                size="sm"
              >
                <Plus weight="bold" className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">New Assignment</span>
                <span className="sm:hidden whitespace-nowrap">Assignment</span>
              </Button>
              <Button
                onClick={handleOpenClassTeacherDialog}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200 px-4 sm:px-6 w-full sm:w-auto flex items-center justify-center gap-2 h-10 sm:h-auto"
                size="sm"
              >
                <UserCheck weight="bold" className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Class Teachers</span>
                <span className="sm:hidden whitespace-nowrap">Teachers</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <CircleNotch weight="bold" className="w-10 h-10 text-[#0A2540] animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading teacher assignments...</p>
          </div>
        ) : (<>
        
        {/* Modern Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Assignments</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stats.totalAssignments}</p>
                  <p className="text-[10px] sm:text-xs text-emerald-600 mt-1 sm:mt-2 flex items-center">
                    <Lightning weight="bold" className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    Active this term
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-[#0A2540]/10 rounded-xl">
                  <BookOpen weight="bold" className="w-4 h-4 sm:w-6 sm:h-6 text-[#0A2540]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Active Teachers</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stats.uniqueTeachers}</p>
                  <p className="text-[10px] sm:text-xs text-[#0A2540] mt-1 sm:mt-2 flex items-center">
                    <Users weight="bold" className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    With assignments
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-[#0A2540]/10 rounded-xl">
                  <Users weight="bold" className="w-4 h-4 sm:w-6 sm:h-6 text-[#0A2540]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Subjects Covered</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stats.uniqueSubjects}</p>
                  <p className="text-[10px] sm:text-xs text-orange-600 mt-1 sm:mt-2 flex items-center">
                    <Trophy weight="bold" className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    Across curriculum
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-xl">
                  <Trophy weight="bold" className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Classes Served</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stats.uniqueClasses}</p>
                  <p className="text-[10px] sm:text-xs text-emerald-600 mt-1 sm:mt-2 flex items-center">
                    <Calendar weight="bold" className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                    All levels
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-100 rounded-xl">
                  <Calendar weight="bold" className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Filters and Search */}
        <Card className="bg-white border border-gray-100 shadow-lg rounded-2xl mb-6 sm:mb-8">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by teacher, subject, or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 sm:h-12 rounded-xl border-gray-200 focus:border-[#0A2540] focus:ring-[#0A2540]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                  <SelectTrigger className="w-full lg:w-48 h-10 rounded-xl border-gray-200">
                    <div className="flex items-center gap-2">
                      <User weight="bold" className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="All Teachers" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="All">All Teachers</SelectItem>
                    {teachers?.filter(t => t.status === 'Active').map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                    {teachers?.filter(t => t.status !== 'Active').length > 0 && (
                      <div className="px-2 py-1.5 text-xs text-gray-400 italic border-t border-gray-100 mt-1 pt-2">
                        Inactive teachers are hidden
                      </div>
                    )}
                  </SelectContent>
                </Select>

                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-full lg:w-48 h-10 rounded-xl border-gray-200">
                    <div className="flex items-center gap-2">
                      <SquaresFour weight="bold" className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="All Classes" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="All">All Classes</SelectItem>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex bg-gray-100 rounded-xl p-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`rounded-lg ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} p-2`}
                  >
                    <List weight="bold" className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} p-2`}
                  >
                    <SquaresFour weight="bold" className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <Card className="bg-white border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#0A2540]/5 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'subjects' | 'class-teachers')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 p-1 rounded-xl">
                    <TabsTrigger value="subjects" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm sm:text-base py-2 px-3">
                      <BookOpen weight="bold" className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Subject Assignments</span>
                      <span className="sm:hidden">Subjects</span>
                    </TabsTrigger>
                    <TabsTrigger value="class-teachers" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm sm:text-base py-2 px-3">
                      <UserCheck weight="bold" className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Class Teachers</span>
                      <span className="sm:hidden">Teachers</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Badge className="bg-[#0A2540]/10 text-[#0A2540] px-3 py-1">
                {currentTerm} - {currentAcademicYear}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="subjects" className="m-0">
                {viewMode === 'table' ? (
                  <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                      <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                          <TableHead className="text-gray-700 font-semibold">Teacher</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Subject</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Class</TableHead>
                          <TableHead className="text-gray-700 font-semibold">Term</TableHead>
                          <TableHead className="text-gray-700 font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.length === 0 ? (
                          <TableRow className="hover:bg-gray-50">
                            <TableCell colSpan={5} className="text-center py-16">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-gray-100 rounded-full">
                                  <BookOpen weight="bold" className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-gray-900 font-medium">No assignments found</p>
                                  <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                                </div>
                                <Button onClick={handleOpenAssignDialog} className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white">
                                  <Plus weight="bold" className="w-4 h-4 mr-2" />
                                  Create First Assignment
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                    ) : (
                      paginatedFilteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id} className="hover:bg-gray-50 border-b border-gray-100">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#0A2540] to-[#0A2540]/80 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{assignment.teacher_name}</p>
                                <p className="text-sm text-gray-500">ID: {assignment.teacher_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                                <BookOpen weight="bold" className="w-4 h-4 text-orange-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{assignment.subject_name}</p>
                                <p className="text-sm text-gray-500">ID: {assignment.subject_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                                <Users weight="bold" className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{assignment.class_name}</p>
                                <p className="text-sm text-gray-500">ID: {assignment.class_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-gray-50 whitespace-nowrap">
                              {assignment.term}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirmDeleteId(String(assignment.id));
                                setConfirmDeleteType('subject');
                                setConfirmDeleteDetails(`${assignment.subject_name} - ${assignment.class_name} (${assignment.teacher_name})`);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px]"
                              aria-label="Delete assignment"
                            >
                              <Trash weight="bold" className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block lg:hidden">
                    {filteredAssignments.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-12 px-4">
                        <div className="p-3 bg-gray-100 rounded-full">
                          <BookOpen weight="bold" className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-medium text-sm">No assignments found</p>
                        <p className="text-gray-500 text-xs">Try adjusting your search or filters</p>
                        <Button onClick={handleOpenAssignDialog} className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-8 text-xs" size="sm">
                          <Plus weight="bold" className="w-3 h-3 mr-1" />
                          Create Assignment
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {paginatedFilteredAssignments.map((assignment) => (
                          <div key={assignment.id} className="p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-[#0A2540] to-[#0A2540]/80 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">{assignment.teacher_name}</p>
                                  <p className="text-xs text-gray-500">{assignment.teacher_id}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setConfirmDeleteId(String(assignment.id));
                                  setConfirmDeleteType('subject');
                                  setConfirmDeleteDetails(`${assignment.subject_name} - ${assignment.class_name} (${assignment.teacher_name})`);
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 h-8 w-8 flex-shrink-0"
                              >
                                <Trash weight="bold" className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs py-0 px-1.5 h-5">
                                {assignment.subject_name}
                              </Badge>
                              <span className="text-gray-300 text-xs">/</span>
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs py-0 px-1.5 h-5">
                                {assignment.class_name}
                              </Badge>
                              <span className="text-gray-300 text-xs">/</span>
                              <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs py-0 px-1.5 h-5">
                                {assignment.term}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                   </>
                ) : (
                  /* Grid View for Subject Assignments */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {filteredAssignments.length === 0 ? (
                      <div className="col-span-full">
                        <Card className="bg-white border border-gray-100 shadow-lg rounded-2xl">
                          <CardContent className="p-12 text-center">
                            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <BookOpen weight="bold" className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-900 font-medium text-lg mb-2">No assignments found</p>
                            <p className="text-gray-500 text-sm mb-6">Try adjusting your search or filters</p>
                            <Button
                              onClick={handleOpenAssignDialog}
                              className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white"
                            >
                              <Plus weight="bold" className="w-4 h-4 mr-2" />
                              Create First Assignment
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      paginatedFilteredAssignments.map((assignment) => (
                        <Card key={assignment.id} className="bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#0A2540] to-[#0A2540]/80 rounded-full flex items-center justify-center text-white font-semibold">
                                  {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{assignment.teacher_name}</p>
                                  <p className="text-sm text-gray-500">ID: {assignment.teacher_id}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setConfirmDeleteId(String(assignment.id));
                                  setConfirmDeleteType('subject');
                                  setConfirmDeleteDetails(`${assignment.subject_name} - ${assignment.class_name} (${assignment.teacher_name})`);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px]"
                                aria-label="Delete assignment"
                              >
                                <Trash weight="bold" className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <BookOpen weight="bold" className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{assignment.subject_name}</p>
                                  <p className="text-sm text-gray-500">ID: {assignment.subject_id}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                  <Users weight="bold" className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{assignment.class_name}</p>
                                  <p className="text-sm text-gray-500">ID: {assignment.class_id}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#0A2540]/10 text-[#0A2540]">
                                  {assignment.term}
                                </Badge>
                                <Badge className="bg-[#0A2540]/10 text-[#0A2540]">
                                  {assignment.academic_year}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}

                {/* Pagination for Subject Assignments */}
                {paginatedCounts.total > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-6 px-3 sm:px-6 pb-4">
                    <div className="text-xs sm:text-sm text-gray-600">
                      Showing {Math.min(paginatedCounts.total, (currentPage - 1) * pageSize + 1)}-{Math.min(paginatedCounts.total, currentPage * pageSize)} of {paginatedCounts.total}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) || 20)}>
                        <SelectTrigger className="w-[100px] sm:w-[140px] h-8 sm:h-9">
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
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        Previous
                      </Button>
                      <div className="text-xs sm:text-sm text-gray-700 min-w-[70px] sm:min-w-[90px] text-center">
                        Page {currentPage} / {paginatedCounts.totalPages}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= paginatedCounts.totalPages}
                        onClick={() => setCurrentPage(p => Math.min(paginatedCounts.totalPages, p + 1))}
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="class-teachers" className="m-0">
                <div className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-heading font-bold text-gray-900">Class Teacher Assignments</h3>
                      <p className="text-xs sm:text-sm text-gray-500">Manage class teachers for {currentTerm} {currentAcademicYear}</p>
                    </div>
                    <Button
                      onClick={() => setIsClassTeacherDialogOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 flex items-center justify-center gap-2 h-9 sm:h-auto w-full sm:w-auto text-sm"
                    >
                      <Plus weight="bold" className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline whitespace-nowrap">Assign Class Teacher</span>
                      <span className="sm:hidden whitespace-nowrap">Assign Teacher</span>
                    </Button>
                  </div>

                  {classTeacherAssignments.length === 0 ? (
                    <div className="text-center py-10 sm:py-16">
                      <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                        <UserCheck weight="bold" className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium text-sm sm:text-lg mb-1">No class teachers assigned</p>
                      <p className="text-gray-500 text-xs sm:text-sm mb-4">Assign class teachers to manage classes</p>
                      <Button
                        onClick={() => setIsClassTeacherDialogOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 flex items-center justify-center gap-2 h-9 sm:h-auto w-full sm:w-auto text-sm"
                      >
                        <Plus weight="bold" className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline whitespace-nowrap">Assign First Class Teacher</span>
                        <span className="sm:hidden whitespace-nowrap">Assign Teacher</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-4">
                      {paginatedClassTeacherAssignments.map((assignment) => (
                        <div key={assignment.id} className="p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0A2540] rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                                {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{assignment.teacher_name}</p>
                                <p className="text-xs text-gray-500 truncate hidden sm:block">{assignment.teacher_email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs whitespace-nowrap hidden sm:inline-flex">
                                {assignment.class_name}
                              </Badge>
                              <span className="text-gray-300 text-xs hidden sm:inline">/</span>
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs whitespace-nowrap">
                                {assignment.term}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setConfirmDeleteId(String(assignment.id));
                                  setConfirmDeleteType('class-teacher');
                                  setConfirmDeleteDetails(`${assignment.teacher_name} - ${assignment.class_name}`);
                                }}
                                disabled={removingAssignmentId === String(assignment.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 h-8 w-8"
                              >
                                <Trash weight="bold" className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1.5 sm:hidden">
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                              {assignment.class_name}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {paginatedCounts.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-4 sm:mt-6">
                      <div className="text-xs sm:text-sm text-gray-600">
                        Showing {Math.min(paginatedCounts.total, (currentPage - 1) * pageSize + 1)}-{Math.min(paginatedCounts.total, currentPage * pageSize)} of {paginatedCounts.total}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) || 20)}>
                          <SelectTrigger className="w-[100px] sm:w-[140px] h-8 sm:h-9">
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
                          className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                        >
                          Previous
                        </Button>
                        <div className="text-xs sm:text-sm text-gray-700 min-w-[70px] sm:min-w-[90px] text-center">
                          Page {currentPage} / {paginatedCounts.totalPages}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= paginatedCounts.totalPages}
                          onClick={() => setCurrentPage(p => Math.min(paginatedCounts.totalPages, p + 1))}
                          className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) { setConfirmDeleteId(null); setConfirmDeleteType(null); setConfirmDeleteDetails(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Warning weight="bold" className="w-5 h-5 text-red-600" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this {confirmDeleteType === 'subject' ? 'subject assignment' : 'class teacher assignment'}?
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-900">
                  {confirmDeleteDetails}
                </div>
                <div className="mt-2 text-xs text-amber-600">
                  {confirmDeleteType === 'subject'
                    ? 'This will remove the teacher from this subject for the current term. Scores already entered will prevent deletion.'
                    : 'This will remove the class teacher from this class for the current term.'}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash weight="bold" className="w-4 h-4 mr-2" />
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </>)}
        
        {/* Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Create Subject Assignments</DialogTitle>
                  <DialogDescription>
                    Assign subjects to teachers for specific classes
                  </DialogDescription>
                </div>
                {saveStatus !== 'idle' && (
                  <div className="flex items-center gap-2">
                    {saveStatus === 'saving' && (
                      <div className="flex items-center gap-1 text-[#0A2540]">
                        <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                    {saveStatus === 'saved' && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Check weight="bold" className="w-4 h-4" />
                        <span className="text-sm">Saved</span>
                      </div>
                    )}
                    {saveStatus === 'error' && (
                      <div className="flex items-center gap-1 text-red-600">
                        <Warning weight="bold" className="w-4 h-4" />
                        <span className="text-sm">Error</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
            
            <div className="space-y-6 mt-6">
              {/* Teacher Selection with Search */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Teacher</Label>
                <div className="relative">
                  <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-[#0A2540] focus:ring-[#0A2540]"
                  />
                </div>
                <div className="mt-2 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                  {filteredTeachers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No teachers found
                    </div>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        onClick={() => {
                          setSelectedTeacherId(Number(teacher.id));
                          setTeacherSearchTerm(`${teacher.firstName} ${teacher.lastName}`);
                        }}
                        className={`p-3 cursor-pointer hover:bg-[#0A2540]/5 border-b border-gray-100 last:border-b-0 ${
                          selectedTeacherId === Number(teacher.id) ? 'bg-[#0A2540]/5 border-l-4 border-l-[#0A2540]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#0A2540] to-[#0A2540]/80 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {teacher.firstName} {teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-500">ID: {teacher.id}</p>
                          </div>
                          {selectedTeacherId === teacher.id && (
                            <Check weight="bold" className="w-4 h-4 text-[#0A2540]" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Class Selection with Search */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Class</Label>
                <div className="relative">
                  <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search classes..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-[#0A2540] focus:ring-[#0A2540]"
                  />
                </div>
                <div className="mt-2 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                  {filteredClasses.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No classes found
                    </div>
                  ) : (
                    filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassIdForAssignments(cls.id);
                          setClassSearchTerm(cls.name);
                        }}
                        className={`p-3 cursor-pointer hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 ${
                          selectedClassIdForAssignments === cls.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0A2540] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {cls.name?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
                            <p className="text-xs text-gray-500">{cls.level}</p>
                          </div>
                          {selectedClassIdForAssignments === cls.id && (
                            <Check weight="bold" className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Subject-Class Matrix */}
              {selectedTeacherId && selectedClassIdForAssignments && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-4 block">
                    Select Subjects for {
                      classes?.find(c => c.id === selectedClassIdForAssignments)?.name || 'Selected Class'
                    }
                  </Label>
                  
                  {/* Subject Selection Info */}
                  <div className="mb-4 p-3 bg-[#0A2540]/5 rounded-lg border border-[#0A2540]/20">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-[#0A2540]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[#0A2540] text-xs font-semibold">i</span>
                      </div>
                      <div className="text-sm text-[#0A2540]">
                        <p className="font-medium">Registered Subjects for {
                          classes?.find(c => c.id === selectedClassIdForAssignments)?.name || 'Selected Class'
                        }</p>
                        <p className="text-xs mt-1">
                          Only <strong>registered</strong> subjects are shown. Assignments will be saved for {currentTerm} {currentAcademicYear}.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      {availableSubjectsForSelectedClass.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No subjects available for {
                            classes?.find(c => c.id === selectedClassIdForAssignments)?.name || 'this class'
                          }
                        </div>
                      )}

                      {availableSubjectsForSelectedClass.map((subject: any) => {
                        const isSelected = selectedAssignments.some(
                          (a) =>
                            a.subject_id === subject.id &&
                            a.class_id === selectedClassIdForAssignments
                        );

                        return (
                          <div
                            key={subject.id}
                            className="flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                            onClick={() =>
                              handleAddAssignment(subject.id, selectedClassIdForAssignments)
                            }
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-[#0A2540]/10 rounded">
                                <BookOpen weight="bold" className="w-3 h-3 text-[#0A2540]" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{subject.name}</p>
                                <p className="text-xs text-gray-500">{subject.code} • {subject.category}</p>
                              </div>
                              {subject.is_core && (
                                <Badge variant="outline" className="bg-[#0A2540]/10 text-[#0A2540] text-xs ml-2">
                                  Core
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                className="w-3 h-3"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Assignments Summary */}
              {selectedAssignments.length > 0 && (
                <div className="p-4 bg-[#0A2540]/5 rounded-xl">
                  <p className="text-sm font-medium text-[#0A2540] mb-2">
                    {selectedAssignments.length} assignment{selectedAssignments.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssignments.map((assignment, index) => {
                      const subject = subjects?.find(s => s.id === assignment.subject_id);
                      const cls = classes?.find(c => c.id === assignment.class_id);
                      return (
                        <Badge key={index} className="bg-[#0A2540]/10 text-[#0A2540]">
                          {subject?.name} → {cls?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAssignments}
                disabled={!selectedTeacherId || selectedAssignments.length === 0 || isSaving}
                className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white px-6"
              >
                {isSaving ? (
                  <>
                    <CircleNotch weight="bold" className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FloppyDisk weight="bold" className="w-4 h-4 mr-2" />
                    Save Assignments ({selectedAssignments.length})
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Class Teacher Dialog */}
        <Dialog open={isClassTeacherDialogOpen} onOpenChange={setIsClassTeacherDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
<DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">Assign Class Teacher</DialogTitle>
              <DialogDescription>Assign a class teacher to manage this class. This will update the class teacher information.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-6">
              {/* Teacher Selection with Search */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Teacher</Label>
                <div className="relative">
                  <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="mt-2 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                  {filteredTeachers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No teachers found
                    </div>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        onClick={() => {
                          setSelectedTeacherId(Number(teacher.id));
                          setTeacherSearchTerm(`${teacher.firstName} ${teacher.lastName}`);
                        }}
                        className={`p-3 cursor-pointer hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 ${
                          selectedTeacherId === Number(teacher.id) ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0A2540] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {teacher.firstName} {teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-500">ID: {teacher.id}</p>
                          </div>
                          {selectedTeacherId === teacher.id && (
                            <Check weight="bold" className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Class Selection with Search */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Class</Label>
                <div className="relative">
                  <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search classes..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="mt-2 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                  {filteredClasses.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No classes found
                    </div>
                  ) : (
                    filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassForTeacher(cls.id.toString());
                          setClassSearchTerm(cls.name);
                        }}
                        className={`p-3 cursor-pointer hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 ${
                          selectedClassForTeacher === cls.id.toString() ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0A2540] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {cls.name?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
                            <p className="text-xs text-gray-500">{cls.level}</p>
                          </div>
                          {selectedClassForTeacher === cls.id.toString() && (
                            <Check weight="bold" className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setIsClassTeacherDialogOpen(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignClassTeacher}
                disabled={!selectedTeacherId || !selectedClassForTeacher}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
              >
                Assign Class Teacher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
