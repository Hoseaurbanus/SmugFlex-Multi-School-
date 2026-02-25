import { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { api } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { Plus, Search, Edit, Trash2, BookOpen, Users, X, Check, AlertCircle, Award, Clock, Activity, UserCheck, Calendar, Filter, ChevronDown, ChevronUp, Grid3x3, List, User, Loader2, Save, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';

export function ManageTeacherAssignmentsPage() {
  const {
    teachers,
    classes,
    subjects,
    subjectAssignments,
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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isClassTeacherDialogOpen, setIsClassTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<{ subject_id: number; class_id: number }[]>([]);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>('');
  const [selectedClassIdForAssignments, setSelectedClassIdForAssignments] = useState<number | null>(null);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<any[]>([]);
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
    if (!selectedClass) return subjects;
    
    // Filter subjects based on actual database class levels
    const classLevelSubjects = subjects.filter((subject: any) => {
      const classLevel = selectedClass.level?.toLowerCase();
      const subjectCategory = subject.category?.toLowerCase();
      
      // Handle empty subject categories - include them for appropriate classes
      if (!subjectCategory || subjectCategory === '') {
        // Empty category subjects are for KG and Kindergarten classes
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
      canAssign: true // All subjects can be assigned
    }));
  }, [selectedClassIdForAssignments, subjects, classes]);

  // Filtered teachers for search
  const filteredTeachers = useMemo(() => {
    if (!teachers || !Array.isArray(teachers)) return [];
    
    if (!teacherSearchTerm.trim()) return teachers;
    
    const searchTerm = teacherSearchTerm.toLowerCase();
    return teachers.filter((teacher: any) => 
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
    console.log('handleAddAssignment called:', { subject_id, class_id, currentAssignments: selectedAssignments.length });
    const exists = selectedAssignments.some((a) => a.subject_id === subject_id && a.class_id === class_id);

    if (exists) {
      console.log('Removing existing assignment');
      setSelectedAssignments(selectedAssignments.filter((a) => !(a.subject_id === subject_id && a.class_id === class_id)));
    } else {
      console.log('Adding new assignment');
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
      console.error('Missing term/year data:', { currentAcademicYear, currentTerm });
      return;
    }

    console.log('Saving assignments with:', {
      selectedTeacherId,
      numAssignments: selectedAssignments.length,
      currentAcademicYear,
      currentTerm
    });

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      let successCount = 0;
      let failureCount = 0;

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
          console.log('Creating assignment:', {
            teacherId: selectedTeacherId,
            subjectId: assignment.subject_id,
            classId: assignment.class_id,
            academicYear: currentAcademicYear,
            term: currentTerm
          });

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
            console.error('Failed to create assignment:', assignment);
          }
        } else {
          console.log('Assignment already exists:', assignment);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} assignments created successfully for ${currentTerm} ${currentAcademicYear}`);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        setSelectedAssignments([]);
        setSelectedTeacherId(null);
        setIsAssignDialogOpen(false);
        
        // Refresh data to show new assignments and update counts
        console.log('Refreshing assignments data...');
        await Promise.all([
          loadSubjectAssignmentsFromAPI(),
          loadTeachersFromAPI(), // Refresh to update assignment counts
          loadClassesFromAPI()    // Refresh to update teacher counts
        ]);
      } else if (failureCount === 0) {
        toast.info('All selected assignments already exist');
      } else {
        toast.error(`Failed to create ${failureCount} assignments`);
      }
      
    } catch (error) {
      console.error('Error saving assignments:', error);
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
    console.log('handleAssignClassTeacher called:', { 
      selectedTeacherId, 
      selectedClassForTeacher, 
      teachers: teachers?.length,
      classes: classes?.length 
    });
    
    if (!selectedTeacherId || !selectedClassForTeacher) {
      toast.error('Please select both teacher and class');
      return;
    }

    // Validate current term and academic year
    if (!currentAcademicYear || !currentTerm) {
      toast.error('Current academic year or term is not set. Please refresh the page.');
      console.error('Missing term/year data:', { currentAcademicYear, currentTerm });
      return;
    }

    const teacher = teachers?.find(t => t.id.toString() === selectedTeacherId.toString());
    const cls = classes?.find(c => c.id.toString() === selectedClassForTeacher.toString());

    console.log('Teacher and class found:', { teacher, cls });
    console.log('Selected IDs:', { selectedTeacherId, selectedClassForTeacher: parseInt(selectedClassForTeacher) });
    console.log('Available teachers:', teachers?.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })));
    console.log('Available classes:', classes?.map(c => ({ id: c.id, name: c.name })));

    if (!teacher || !cls) {
      console.error('Teacher or class not found');
      toast.error('Invalid teacher or class selection');
      return;
    }

    try {
      console.log('Making API call to assign class teacher...');
      
      // Create term-specific class teacher assignment
      const response = await api.post(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.CREATE, {
        teacher_id: selectedTeacherId,
        class_id: parseInt(selectedClassForTeacher),
        academic_year: currentAcademicYear,
        term: currentTerm
      });

      console.log('API response:', response);

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
        console.log('Refreshing class teacher assignments data...');
        await Promise.all([
          loadClassTeacherAssignmentsFromAPI(),
          loadTeachersFromAPI(), // Refresh to update assignment counts
          loadClassesFromAPI()    // Refresh to update teacher counts
        ]);

        setSelectedTeacherId(null);
        setSelectedClassForTeacher('');
        setIsClassTeacherDialogOpen(false);
      } else {
        console.error('API response unsuccessful:', response);
        toast.error(response?.message || 'Failed to assign class teacher');
      }
    } catch (error) {
      console.error('Error assigning class teacher:', error);
      toast.error('An error occurred while assigning class teacher');
    }
  };

  const handleRemoveClassTeacher = async (classId: number) => {
    const cls = classes?.find(c => c.id === classId);
    if (!cls || !cls.classTeacherId) return;

    try {
      // Find the assignment ID for current term
      const response = await api.get(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BY_TERM(currentAcademicYear!, currentTerm!));
      
      if (response && response.success) {
        const assignments = (response.data as any[]) || [];
        const assignment = (assignments as any[]).find((a: any) => a.class_id === classId);
        
        if (assignment) {
          // Delete the assignment
          const deleteResponse = await api.delete(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.DELETE(assignment.id));
          
          if (deleteResponse && deleteResponse.success) {
            const teacher = teachers?.find(t => t.id === cls.classTeacherId);
            toast.success(`Class teacher removed from ${cls.name}`);
            
            // Add activity log
            addActivityLog(
              'Class Teacher Removed',
              teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
              `Removed as class teacher from ${cls.name} for ${currentTerm} ${currentAcademicYear}`,
              'class_teacher'
            );

            // Refresh class teacher assignments
            await loadClassTeacherAssignmentsFromAPI();
          } else {
            toast.error('Failed to remove class teacher');
          }
        }
      }
    } catch (error) {
      console.error('Error removing class teacher:', error);
      toast.error('An error occurred while removing class teacher');
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

  // Load class teacher assignments when tab changes or term/year changes
  useEffect(() => {
    const loadClassTeacherData = async () => {
      if (activeTab === 'class-teachers') {
        try {
          const response = await api.get(API_CONFIG.ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BY_TERM(currentAcademicYear!, currentTerm!));
          if (response && response.success) {
            setClassTeacherAssignments((response.data as any[]) || []);
          }
        } catch (error) {
          console.error('Error loading class teacher assignments:', error);
        }
      }
    };

    loadClassTeacherData();
  }, [activeTab, currentAcademicYear, currentTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                Teacher Assignments
              </h1>
              <p className="text-gray-600 mt-1">Manage subject assignments and class teacher roles</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={handleOpenAssignDialog}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 sm:px-6 w-full sm:w-auto flex items-center justify-center gap-2 h-10 sm:h-auto"
                size="sm"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">New Assignment</span>
                <span className="sm:hidden whitespace-nowrap">Assignment</span>
              </Button>
              <Button
                onClick={handleOpenClassTeacherDialog}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200 px-4 sm:px-6 w-full sm:w-auto flex items-center justify-center gap-2 h-10 sm:h-auto"
                size="sm"
              >
                <UserCheck className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Class Teachers</span>
                <span className="sm:hidden whitespace-nowrap">Teachers</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Modern Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAssignments}</p>
                  <p className="text-xs text-green-600 mt-2 flex items-center">
                    <Activity className="w-3 h-3 mr-1" />
                    Active this term
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active Teachers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.uniqueTeachers}</p>
                  <p className="text-xs text-purple-600 mt-2 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    With assignments
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Subjects Covered</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.uniqueSubjects}</p>
                  <p className="text-xs text-orange-600 mt-2 flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    Across curriculum
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Classes Served</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.uniqueClasses}</p>
                  <p className="text-xs text-green-600 mt-2 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    All levels
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Filters and Search */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by teacher, subject, or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                  <SelectTrigger className="w-48 h-12 rounded-xl border-gray-200">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="All Teachers" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="All">All Teachers</SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-48 h-12 rounded-xl border-gray-200">
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4 text-gray-400" />
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
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'} p-2`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'subjects' | 'class-teachers')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 p-1 rounded-xl">
                    <TabsTrigger value="subjects" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm sm:text-base py-2 px-3">
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Subject Assignments</span>
                      <span className="sm:hidden">Subjects</span>
                    </TabsTrigger>
                    <TabsTrigger value="class-teachers" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm sm:text-base py-2 px-3">
                      <UserCheck className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Class Teachers</span>
                      <span className="sm:hidden">Teachers</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                {currentTerm} - {currentAcademicYear}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="subjects" className="m-0">
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] lg:min-w-full">
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
                                  <BookOpen className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-gray-900 font-medium">No assignments found</p>
                                  <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                                </div>
                                <Button
                                  onClick={handleOpenAssignDialog}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create First Assignment
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                    ) : (
                      filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id} className="hover:bg-gray-50 border-b border-gray-100">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
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
                                <BookOpen className="w-4 h-4 text-orange-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{assignment.subject_name}</p>
                                <p className="text-sm text-gray-500">ID: {assignment.subject_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                                <Users className="w-4 h-4 text-green-600" />
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
                              onClick={async () => {
                                try {
                                  console.log('=== DELETE ASSIGNMENT CLICKED ===');
                                  console.log('Assignment data:', {
                                    teacher_id: assignment.teacher_id,
                                    subject_id: assignment.subject_id,
                                    class_id: assignment.class_id,
                                    academic_year: assignment.academic_year,
                                    term: assignment.term
                                  });
                                  
                                  // Handle remove assignment
                                  const success = await removeSubjectAssignmentAPI(
                                    assignment.teacher_id,
                                    assignment.subject_id,
                                    assignment.class_id,
                                    assignment.academic_year,
                                    assignment.term
                                  );
                                  
                                  if (success) {
                                    toast.success('Assignment removed successfully');
                                    // Data is already refreshed in the API function
                                  } else {
                                    toast.error('Failed to remove assignment');
                                  }
                                } catch (error) {
                                  console.error('Error removing assignment:', error);
                                  toast.error('An error occurred while removing assignment');
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px]"
                              aria-label="Delete assignment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              </div>
                ) : (
                  /* Grid View for Subject Assignments */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {filteredAssignments.length === 0 ? (
                      <div className="col-span-full">
                        <Card className="bg-white border-0 shadow-lg rounded-2xl">
                          <CardContent className="p-12 text-center">
                            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-900 font-medium text-lg mb-2">No assignments found</p>
                            <p className="text-gray-500 text-sm mb-6">Try adjusting your search or filters</p>
                            <Button
                              onClick={handleOpenAssignDialog}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Assignment
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      filteredAssignments.map((assignment) => (
                        <Card key={assignment.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
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
                                onClick={async () => {
                                  try {
                                    console.log('=== DELETE ASSIGNMENT CLICKED (GRID) ===');
                                    console.log('Assignment data:', {
                                      teacher_id: assignment.teacher_id,
                                      subject_id: assignment.subject_id,
                                      class_id: assignment.class_id,
                                      academic_year: assignment.academic_year,
                                      term: assignment.term
                                    });
                                    
                                    const success = await removeSubjectAssignmentAPI(
                                      assignment.teacher_id,
                                      assignment.subject_id,
                                      assignment.class_id,
                                      assignment.academic_year,
                                      assignment.term
                                    );
                                    
                                    if (success) {
                                      toast.success('Assignment removed successfully');
                                      // Data is already refreshed in the API function
                                    } else {
                                      toast.error('Failed to remove assignment');
                                    }
                                  } catch (error) {
                                    console.error('Error removing assignment:', error);
                                    toast.error('An error occurred while removing assignment');
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px]"
                                aria-label="Delete assignment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <BookOpen className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{assignment.subject_name}</p>
                                  <p className="text-sm text-gray-500">ID: {assignment.subject_id}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <Users className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{assignment.class_name}</p>
                                  <p className="text-sm text-gray-500">ID: {assignment.class_id}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-800">
                                  {assignment.term}
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-800">
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
              </TabsContent>
              <TabsContent value="class-teachers" className="m-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Class Teacher Assignments</h3>
                      <p className="text-sm text-gray-500">Manage class teachers for {currentTerm} {currentAcademicYear}</p>
                    </div>
                    <Button
                      onClick={() => setIsClassTeacherDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 flex items-center justify-center gap-2 h-10 sm:h-auto w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline whitespace-nowrap">Assign Class Teacher</span>
                      <span className="sm:hidden whitespace-nowrap">Assign Teacher</span>
                    </Button>
                  </div>

                  {classTeacherAssignments.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <UserCheck className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium text-lg mb-2">No class teachers assigned</p>
                      <p className="text-gray-500 text-sm mb-6">Assign class teachers to manage classes</p>
                      <Button
                        onClick={() => setIsClassTeacherDialogOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 flex items-center justify-center gap-2 h-10 sm:h-auto w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline whitespace-nowrap">Assign First Class Teacher</span>
                        <span className="sm:hidden whitespace-nowrap">Assign Teacher</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classTeacherAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{assignment.teacher_name}</p>
                              <p className="text-sm text-gray-500">{assignment.teacher_email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{assignment.class_name}</p>
                              <p className="text-sm text-gray-500">{assignment.class_level}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              {assignment.term}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800">
                              {assignment.academic_year}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveClassTeacher(assignment.class_id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px]"
                              aria-label="Remove class teacher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                      <div className="flex items-center gap-1 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                    {saveStatus === 'saved' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Saved</span>
                      </div>
                    )}
                    {saveStatus === 'error' && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                        className={`p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                          selectedTeacherId === Number(teacher.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {teacher.firstName} {teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-500">ID: {teacher.id}</p>
                          </div>
                          {selectedTeacherId === teacher.id && (
                            <Check className="w-4 h-4 text-blue-600" />
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search classes..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                        className={`p-3 cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-b-0 ${
                          selectedClassIdForAssignments === cls.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {cls.name?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
                            <p className="text-xs text-gray-500">{cls.level}</p>
                          </div>
                          {selectedClassIdForAssignments === cls.id && (
                            <Check className="w-4 h-4 text-green-600" />
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
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-semibold">📚</span>
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Subjects for {
                          classes?.find(c => c.id === selectedClassIdForAssignments)?.name || 'Selected Class'
                        }</p>
                        <p className="text-xs mt-1">
                          Showing subjects available for this specific class. Assignments will be saved for {currentTerm} {currentAcademicYear}.
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
                              <div className="p-1 bg-blue-100 rounded">
                                <BookOpen className="w-3 h-3 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{subject.name}</p>
                                <p className="text-xs text-gray-500">{subject.code} • {subject.category}</p>
                              </div>
                              {subject.is_core && (
                                <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs ml-2">
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
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    {selectedAssignments.length} assignment{selectedAssignments.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssignments.map((assignment, index) => {
                      const subject = subjects?.find(s => s.id === assignment.subject_id);
                      const cls = classes?.find(c => c.id === assignment.class_id);
                      return (
                        <Badge key={index} className="bg-blue-100 text-blue-800">
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs mr-2">
                    T:{selectedTeacherId} A:{selectedAssignments.length}
                  </div>
                )}
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Assignments ({selectedAssignments.length})
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Class Teacher Dialog */}
        <Dialog open={isClassTeacherDialogOpen} onOpenChange={setIsClassTeacherDialogOpen}>
          <DialogContent className="max-w-md">
<DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">Assign Class Teacher</DialogTitle>
              <DialogDescription>Assign a class teacher to manage this class. This will update the class teacher information.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-6">
              {/* Teacher Selection with Search */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Teacher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
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
                        className={`p-3 cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-b-0 ${
                          selectedTeacherId === Number(teacher.id) ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {teacher.firstName} {teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-500">ID: {teacher.id}</p>
                          </div>
                          {selectedTeacherId === teacher.id && (
                            <Check className="w-4 h-4 text-green-600" />
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search classes..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
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
                        className={`p-3 cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-b-0 ${
                          selectedClassForTeacher === cls.id.toString() ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {cls.name?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
                            <p className="text-xs text-gray-500">{cls.level}</p>
                          </div>
                          {selectedClassForTeacher === cls.id.toString() && (
                            <Check className="w-4 h-4 text-green-600" />
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
                className="bg-green-600 hover:bg-green-700 text-white px-6"
              >
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs mr-2">
                    T:{selectedTeacherId} C:{selectedClassForTeacher}
                  </div>
                )}
                Assign Class Teacher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
