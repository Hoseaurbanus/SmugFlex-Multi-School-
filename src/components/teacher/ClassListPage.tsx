import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSchool, Student as SchoolStudent } from '../../contexts/SchoolContext';
import { API_CONFIG } from '../../config/api';
import { Users, User, Phone, Mail, Download, Search, Trophy, Target, TrendingUp } from 'lucide-react';

interface ExtendedStudent extends SchoolStudent {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  attendance: number;
  averageScore: number;
  position: number;
}

export function ClassListPage() {
  const { 
    classes, 
    students: allStudents, 
    parents, 
    currentUser, 
    teachers, 
    getTeacherAssignments,
    classTeacherAssignments,
    compiledResults,
    currentTerm,
    currentAcademicYear,
    loadStudentsFromAPI,
    loadParentsFromAPI,
    loadCompiledResultsFromAPI,
    loadClassesFromAPI,
    loadClassTeacherAssignmentsFromAPI
  } = useSchool();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number>(() => {
    const currentTeacher = currentUser ? teachers.find(t => String(t.id) === String(currentUser.linked_id)) : null;
    const classTeacherClasses = classes.filter((c: any) => {
      const assignment = classTeacherAssignments.find((cta: any) => 
        String(cta.teacher_id) === String(currentTeacher?.id) && 
        String(cta.class_id) === String(c.id) &&
        cta.academic_year === currentAcademicYear && 
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return !!assignment;
    });
    // Fallback to all classes if no class teacher assignments
    const availableClasses = classTeacherClasses.length > 0 ? classTeacherClasses : classes;
    const firstAvailableClass = availableClasses[0];
    return firstAvailableClass?.id || classes[0]?.id || 1;
  });
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<ExtendedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLoadKeyRef = useRef<string>('');
  const didNormalizeSelectedClassRef = useRef<boolean>(false);

  const resolveCanonicalClassId = (classId: any): number | null => {
    if (!classId) return null;
    const baseClass = (classes || []).find((c: any) => String(c.id) === String(classId));
    if (!baseClass) return Number(classId) || null;

    const siblings = (classes || []).filter((c: any) =>
      String(c.name).trim().toLowerCase() === String(baseClass.name).trim().toLowerCase() &&
      String(c.level).trim().toLowerCase() === String(baseClass.level).trim().toLowerCase()
    );

    if (siblings.length <= 1) return Number(baseClass.id) || null;

    const best = siblings
      .map((c: any) => ({
        id: c.id,
        count: (allStudents || []).filter((s: any) => String(s.class_id) === String(c.id)).length,
      }))
      .sort((a: any, b: any) => b.count - a.count)[0];

    return best?.id ? Number(best.id) : (Number(baseClass.id) || null);
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      const loadKey = `${String(currentTerm ?? '')}__${String(currentAcademicYear ?? '')}`;
      if (lastLoadKeyRef.current === loadKey && (classes?.length || 0) > 0 && (allStudents?.length || 0) > 0) {
        return;
      }
      lastLoadKeyRef.current = loadKey;

      setIsLoading(true);
      setError(null);
      try {
        // Load all necessary data in parallel
        await Promise.all([
          currentTerm && currentAcademicYear
            ? loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear)
            : Promise.resolve(true),
          loadStudentsFromAPI(),
          loadParentsFromAPI(),
          loadCompiledResultsFromAPI(),
          loadClassesFromAPI()
        ]);
      } catch (error) {
        setError('Failed to load class data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentTerm, currentAcademicYear, loadClassTeacherAssignmentsFromAPI, loadStudentsFromAPI, loadParentsFromAPI, loadCompiledResultsFromAPI, loadClassesFromAPI]);

  // Refresh data when class changes (optional)
  useEffect(() => {
    if (selectedClassId && !isLoading) {
      const refreshData = async () => {
        try {
          await Promise.all([
            loadStudentsFromAPI(),
            loadCompiledResultsFromAPI()
          ]);
        } catch (error) {
          // Silent fail for security
        }
      };

      refreshData();
    }
  }, [selectedClassId, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (didNormalizeSelectedClassRef.current) return;
    const canonical = resolveCanonicalClassId(selectedClassId);
    if (canonical && canonical !== selectedClassId) {
      didNormalizeSelectedClassRef.current = true;
      setSelectedClassId(canonical);
      return;
    }
    didNormalizeSelectedClassRef.current = true;
  }, [isLoading, selectedClassId, classes, allStudents]);

  // Get teacher's classes based on class teacher assignment only
  const currentTeacher = currentUser ? teachers.find(t => String(t.id) === String(currentUser.linked_id)) : null;
  const teacherClasses = classes.filter((c: any) => {
    const assignment = classTeacherAssignments.find((cta: any) => 
      String(cta.teacher_id) === String(currentTeacher?.id) && 
      String(cta.class_id) === String(c.id) &&
      cta.academic_year === currentAcademicYear && 
      cta.term === currentTerm &&
      cta.status === 'Active'
    );
    return !!assignment;
  });

  const effectiveTeacherClasses = useMemo(() => {
    const seen = new Set<string>();
    return (teacherClasses || []).map((c: any) => {
      const canonicalId = resolveCanonicalClassId(c.id);
      const canonicalClass = (classes || []).find((cc: any) => String(cc.id) === String(canonicalId)) || c;
      return canonicalClass;
    }).filter((c: any) => {
      const key = String(c.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [teacherClasses, classes, allStudents]);

  // Fallback: If teacher has no class teacher assignments, show all classes
  const availableClasses = effectiveTeacherClasses.length > 0 ? effectiveTeacherClasses : classes;

  // Get current class - from available classes, but prefer one with students
  const effectiveSelectedClassId = useMemo(() => {
    const canonical = resolveCanonicalClassId(selectedClassId);
    return canonical ?? selectedClassId;
  }, [selectedClassId, classes, allStudents]);

  const selectedClass = availableClasses.find((c: any) => String(c.id) === String(effectiveSelectedClassId)) ||
    availableClasses.find((c: any) => allStudents.some((s: any) => String(s.class_id) === String(c.id))) ||
    availableClasses[0];

  // Get students from selected class with extended data
  const students: ExtendedStudent[] = useMemo(() => {
    if (!selectedClass) return []; // Return empty if no class is selected
    
    return allStudents
      .filter(s => {
        const isSameClass = String(s.class_id) === String(effectiveSelectedClassId);
        const status = String((s as any)?.status ?? '').trim().toLowerCase();
        const isActive = status === '' || status === 'active';
        return isSameClass && isActive;
      })
      .map((student, index) => {
        const parent = parents.find(p => p.id === student.parent_id);
        // Filter compiled results for current student, term, academic year, and approved status
        const studentResults = compiledResults.filter(r => 
          r.student_id === student.id && 
          r.status === 'Approved' &&
          r.term === currentTerm &&
          r.academic_year === currentAcademicYear
        );
        const averageScore = studentResults.length > 0 
          ? studentResults.reduce((sum, r) => sum + (r.average_score || 0), 0) / studentResults.length 
          : 0;
        
        return {
          ...student,
          parentName: parent ? `${parent.firstName} ${parent.lastName}` : 'N/A',
          parentPhone: parent?.phone || 'N/A',
          parentEmail: parent?.email || 'N/A',
          attendance: studentResults.length > 0 ? (() => {
            const r: any = studentResults[0];
            const timesPresent = Number(r?.times_present ?? r?.timesPresent ?? 0);
            const totalDays = Number(r?.total_attendance_days ?? r?.totalAttendanceDays ?? 0);
            if (!Number.isFinite(timesPresent) || !Number.isFinite(totalDays) || totalDays <= 0) return 0;
            return Math.round((timesPresent / totalDays) * 100);
          })() : 0,
          averageScore: averageScore || 0,
          position: index + 1, // Will be recalculated based on scores
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((student, index) => ({ ...student, position: index + 1 }));
  }, [allStudents, effectiveSelectedClassId, parents, compiledResults, selectedClass, currentTerm, currentAcademicYear]);

  const handleViewDetails = (student: any) => {
    setSelectedStudent(student);
  };

  const filteredStudents = (students || []).filter(student => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`;
    const matchesSearch = 
      (fullName && fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.parentName && student.parentName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
    
    return matchesSearch && matchesGender;
  });

  const classStats = {
    totalStudents: students?.length || 0,
    maleCount: students?.filter(s => s.gender === 'Male').length || 0,
    femaleCount: students?.filter(s => s.gender === 'Female').length || 0,
    averageAttendance: students?.length ? students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length : 0,
    averageScore: students?.length ? students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length : 0,
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStudentFullName = (student: any) => {
    const firstName = student?.firstName || '';
    const lastName = student?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Student';
    return fullName;
  };

  const getStudentAvatarSrc = (student: any): string | undefined => {
    const rawUrl =
      student?.photoUrl ||
      student?.photo_url ||
      student?.photoURL ||
      student?.passportPhoto ||
      student?.passport_photo ||
      student?.passport;

    if (!rawUrl) return undefined;
    if (typeof rawUrl !== 'string') return undefined;

    const trimmed = rawUrl.trim();
    if (!trimmed) return undefined;

    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 200) {
      return `data:image/jpeg;base64,${trimmed}`;
    }

    return trimmed;
  };

  const getStudentAvatarCandidates = (student: any): string[] => {
    const base = getStudentAvatarSrc(student);
    if (!base) return [];

    if (/^data:image\//i.test(base) || /^https?:\/\//i.test(base)) {
      return [base];
    }

    let apiOrigin = '';
    try {
      const apiBase = API_CONFIG?.BASE_URL || '';
      apiOrigin = apiBase ? new URL(apiBase).origin : '';
    } catch {
      apiOrigin = '';
    }

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = String(base || '').trim();
    const normalizedPath = path.startsWith('/') ? path : `/${path.replace(/^\/+/, '')}`;

    const candidates: string[] = [];

    if (appOrigin) candidates.push(`${appOrigin}${normalizedPath}`);
    if (apiOrigin) candidates.push(`${apiOrigin}${normalizedPath}`);

    candidates.push(path);

    return Array.from(new Set(candidates)).filter(Boolean);
  };

  const handleAvatarImageError = (e: React.SyntheticEvent<HTMLImageElement>, student: any) => {
    const img = e.currentTarget;
    const candidates = getStudentAvatarCandidates(student);
    const idx = Number(img.dataset.candidateIdx || '0');
    const nextIdx = idx + 1;
    if (nextIdx < candidates.length) {
      img.dataset.candidateIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };

  const exportToCSV = () => {
    const headers = ['Student ID', 'Name', 'Gender', 'DOB', 'Parent Name', 'Parent Phone', 'Parent Email', 'Attendance %', 'Average Score', 'Position'];
    const rows = filteredStudents.map(s => [
      s.admissionNumber, `${s.firstName} ${s.lastName}`, s.gender, new Date(s.date_of_birth).toLocaleDateString('en-GB'), s.parentName, s.parentPhone, s.parentEmail, s.attendance, s.averageScore, s.position
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass?.name || 'class'}-class-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Loading State */}
      {isLoading && (
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2540] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading class data...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
      <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Class List - {selectedClass?.name || 'No Class Assigned'}</h1>
          <p className="text-gray-600">Manage and view your class students</p>
        </div>
        {teacherClasses.length > 0 && (
          <Select
            value={selectedClassId.toString()}
            onValueChange={(value: string) => {
              const rawId = Number(value);
              const canonicalId = resolveCanonicalClassId(rawId) ?? rawId;
              setSelectedClassId(canonicalId);
            }}
          >
            <SelectTrigger className="w-48 border-[#0A2540]/20 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {effectiveTeacherClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {teacherClasses.length === 0 && (
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6 text-center">
            <span className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#0A2540] mb-2">No Classes Assigned</h3>
            <p className="text-gray-600">You haven't been assigned any classes yet. Please contact the administrator.</p>
          </CardContent>
        </Card>
      )}

      {teacherClasses.length > 0 && (
      <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Students</p>
                <p className="text-[#0A2540] text-lg sm:text-xl font-bold">{classStats.totalStudents}</p>
              </div>
              <div className="bg-blue-100 p-2 sm:p-3 rounded-xl">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Male</p>
                <p className="text-[#0A2540] text-lg sm:text-xl font-bold">{classStats.maleCount}</p>
              </div>
              <div className="bg-indigo-100 p-2 sm:p-3 rounded-xl">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Female</p>
                <p className="text-[#0A2540] text-lg sm:text-xl font-bold">{classStats.femaleCount}</p>
              </div>
              <div className="bg-pink-100 p-2 sm:p-3 rounded-xl">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Avg Attendance</p>
                <p className="text-[#0A2540] text-lg sm:text-xl font-bold">{classStats.averageAttendance.toFixed(1)}%</p>
              </div>
              <div className="bg-green-100 p-2 sm:p-3 rounded-xl">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">Class Average</p>
                <p className="text-[#0A2540] text-lg sm:text-xl font-bold">{classStats.averageScore.toFixed(1)}%</p>
              </div>
              <div className="bg-yellow-100 p-2 sm:p-3 rounded-xl">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, ID, or parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#0A2540]/20 focus:border-[#FFD700] rounded-xl text-sm sm:text-base"
              />
            </div>

            {/* Gender Filter */}
            <div className="sm:col-span-1">
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="border-[#0A2540]/20 rounded-xl text-sm sm:text-base">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Button */}
            <div className="sm:col-span-1">
              <Button 
                onClick={exportToCSV}
                className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl w-full sm:w-auto text-sm sm:text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export Class List</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-[#0A2540]/10 shadow-lg">
        <CardHeader className="border-b border-[#0A2540]/10 bg-gradient-to-r from-[#0A2540]/5 to-[#1E40AF]/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-[#0A2540] font-semibold">Students ({(filteredStudents || []).length})</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                {classStats.totalStudents} Total
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                {filteredStudents?.length || 0} Filtered
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile View - Card Layout */}
          <div className="block lg:hidden">
            {(filteredStudents || []).length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No students found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters or search criteria</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                    {/* Student Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          student.position === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                          student.position === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
                          student.position === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {student.position}
                        </div>
                        <Avatar className="h-10 w-10 bg-gradient-to-br from-[#0A2540] to-[#1E40AF] text-white font-semibold">
                          <AvatarImage
                            src={getStudentAvatarCandidates(student)[0]}
                            alt={getStudentFullName(student)}
                            className="object-cover"
                            onError={(e) => handleAvatarImageError(e, student)}
                          />
                          <AvatarFallback className="bg-transparent text-sm">
                            {getInitials(getStudentFullName(student))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[#0A2540] font-semibold text-sm">{getStudentFullName(student)}</p>
                          <p className="text-xs text-gray-500 font-mono">{student.admissionNumber}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(student)}
                        className="text-[#0A2540] hover:text-white hover:bg-gradient-to-r hover:from-[#0A2540] hover:to-[#1E40AF] rounded-xl transition-all duration-200"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Student Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Gender</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          student.gender === 'Male' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-pink-100 text-pink-800 border border-pink-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                          }`} />
                          {student.gender}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Attendance</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                student.attendance >= 90 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                student.attendance >= 75 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                'bg-gradient-to-r from-red-400 to-red-600'
                              }`}
                              style={{ width: `${student.attendance}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#0A2540]">{student.attendance}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Parent</p>
                        <p className="text-[#0A2540] font-medium text-xs truncate">{student.parentName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Performance</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#0A2540]">{student.averageScore.toFixed(1)}%</span>
                          <Badge 
                            className={`rounded-full text-xs font-semibold ${
                              student.averageScore >= 70 ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                              student.averageScore >= 50 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                              'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                            }`}
                          >
                            {student.averageScore >= 70 ? 'Excellent' :
                             student.averageScore >= 50 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{student.parentPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 truncate">{student.parentEmail}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop View - Table Layout */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#0A2540]/8 to-[#1E40AF]/8 border-b border-[#0A2540]/10">
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Position</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Student</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Gender</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Parent/Guardian</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Attendance</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider">Performance</TableHead>
                  <TableHead className="text-[#0A2540] font-semibold text-sm uppercase tracking-wider text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredStudents || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500 font-medium">No students found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your filters or search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-gradient-to-r hover:from-[#0A2540]/3 hover:to-[#1E40AF]/3 transition-all duration-200 border-b border-gray-100">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            student.position === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                            student.position === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
                            student.position === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {student.position}
                          </div>
                          {student.position <= 3 && (
                            <Trophy className={`w-4 h-4 ${
                              student.position === 1 ? 'text-yellow-500' :
                              student.position === 2 ? 'text-gray-400' :
                              'text-orange-600'
                            }`} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 bg-gradient-to-br from-[#0A2540] to-[#1E40AF] text-white font-semibold">
                            <AvatarImage
                              src={getStudentAvatarCandidates(student)[0]}
                              alt={getStudentFullName(student)}
                              className="object-cover"
                              onError={(e) => handleAvatarImageError(e, student)}
                            />
                            <AvatarFallback className="bg-transparent">
                              {getInitials(getStudentFullName(student))}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[#0A2540] font-semibold">{getStudentFullName(student)}</p>
                            <p className="text-sm text-gray-500 font-mono">{student.admissionNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          student.gender === 'Male' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-pink-100 text-pink-800 border border-pink-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                          }`} />
                          {student.gender}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="text-[#0A2540] font-medium">{student.parentName}</p>
                          <p className="text-xs text-gray-500">Guardian</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm group">
                            <Phone className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-gray-600 group-hover:text-blue-600 transition-colors">{student.parentPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm group">
                            <Mail className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-gray-600 group-hover:text-blue-600 transition-colors truncate max-w-[180px]">{student.parentEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="bg-gray-200 rounded-full h-3 w-20 relative overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  student.attendance >= 90 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                  student.attendance >= 75 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                  'bg-gradient-to-r from-red-400 to-red-600'
                                }`}
                                style={{ width: `${student.attendance}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#0A2540]">{student.attendance}%</p>
                            <p className="text-xs text-gray-500">Attendance</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#0A2540]">{student.averageScore.toFixed(1)}%</p>
                            <Badge 
                              className={`rounded-full text-xs font-semibold ${
                                student.averageScore >= 70 ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                                student.averageScore >= 50 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                                'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                              }`}
                            >
                              {student.averageScore >= 70 ? 'Excellent' :
                               student.averageScore >= 50 ? 'Good' : 'Needs Improvement'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(student)}
                          className="text-[#0A2540] hover:text-white hover:bg-gradient-to-r hover:from-[#0A2540] hover:to-[#1E40AF] rounded-xl transition-all duration-200 group"
                        >
                          <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      </>
      )}

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Student Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedStudent && getStudentFullName(selectedStudent)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 bg-[#0A2540] text-white text-xl">
                <AvatarImage
                  src={selectedStudent ? getStudentAvatarCandidates(selectedStudent)[0] : undefined}
                  alt={selectedStudent ? getStudentFullName(selectedStudent) : 'Student'}
                  className="object-cover"
                  onError={(e) => selectedStudent && handleAvatarImageError(e, selectedStudent)}
                />
                <AvatarFallback className="bg-[#0A2540] text-white">
                  {selectedStudent && getInitials(getStudentFullName(selectedStudent))}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-[#0A2540]">{selectedStudent && getStudentFullName(selectedStudent)}</h3>
                <p className="text-gray-600">{selectedStudent?.admissionNumber}</p>
                <Badge variant="secondary" className="mt-1 rounded-xl">{selectedStudent?.gender}</Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <p className="text-gray-600 text-sm">Date of Birth</p>
                <p className="text-[#0A2540]">{selectedStudent && new Date(selectedStudent.date_of_birth).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Academic Year</p>
                <p className="text-[#0A2540]">{selectedStudent?.academic_year || '2024/2025'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Class Position</p>
                <p className="text-[#0A2540]">{selectedStudent?.position} / {students.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <Badge className="bg-green-100 text-green-800 rounded-xl">Active</Badge>
              </div>
            </div>

            {/* Performance */}
            <div className="space-y-2">
              <h4 className="text-[#0A2540]">Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-gray-600 text-sm">Average Score</p>
                  <p className="text-[#0A2540] text-xl">{selectedStudent?.averageScore.toFixed(1)}%</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-gray-600 text-sm">Attendance Rate</p>
                  <p className="text-[#0A2540] text-xl">{selectedStudent?.attendance}%</p>
                </div>
              </div>
            </div>

            {/* Parent/Guardian Info */}
            <div className="space-y-2">
              <h4 className="text-[#0A2540]">Parent/Guardian Information</h4>
              <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Name</p>
                  <p className="text-[#0A2540]">{selectedStudent?.parentName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-[#0A2540]">{selectedStudent?.parentPhone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-[#0A2540]">{selectedStudent?.parentEmail}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Class</p>
                  <p className="text-[#0A2540]">{selectedStudent?.className}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}