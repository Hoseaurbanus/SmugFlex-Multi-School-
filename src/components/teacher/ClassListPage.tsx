import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Student as SchoolStudent } from '../../types/school';
import { useSchool } from '../../contexts/SchoolContext';
import { API_CONFIG } from '../../config/api';
import {
  Users, User, Phone, Mail, Download, Search, Trophy, Target, Eye,
  MoreVertical, MessageSquare, FileText, ChevronLeft, ChevronRight,
  UserCheck, AlertCircle, RefreshCw, Medal, GraduationCap
} from 'lucide-react';
import { toast } from "sonner";
import { CapacitorHelper } from "../../utils/capacitorHelper";

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
    const availableClasses = classTeacherClasses.length > 0 ? classTeacherClasses : classes;
    const firstAvailableClass = availableClasses[0];
    return firstAvailableClass?.id || classes[0]?.id || 1;
  });
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<ExtendedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  const availableClasses = effectiveTeacherClasses.length > 0 ? effectiveTeacherClasses : classes;

  const effectiveSelectedClassId = useMemo(() => {
    const canonical = resolveCanonicalClassId(selectedClassId);
    return canonical ?? selectedClassId;
  }, [selectedClassId, classes, allStudents]);

  const selectedClass = availableClasses.find((c: any) => String(c.id) === String(effectiveSelectedClassId)) ||
    availableClasses.find((c: any) => allStudents.some((s: any) => String(s.class_id) === String(c.id))) ||
    availableClasses[0];

  const students: ExtendedStudent[] = useMemo(() => {
    if (!selectedClass) return [];
    
    return allStudents
      .filter(s => {
        const isSameClass = String(s.class_id) === String(effectiveSelectedClassId);
        const status = String((s as any)?.status ?? '').trim().toLowerCase();
        const isActive = status === '' || status === 'active';
        return isSameClass && isActive;
      })
      .map((student, index) => {
        const parent = parents.find(p => p.id === student.parent_id);
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
          position: index + 1,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((student, index) => ({ ...student, position: index + 1 }));
  }, [allStudents, effectiveSelectedClassId, parents, compiledResults, selectedClass, currentTerm, currentAcademicYear]);

  const filteredStudents = (students || []).filter(student => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`;
    const matchesSearch = 
      (fullName && fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.parentName && student.parentName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Clamp current page when data refresh reduces total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  const classStats = {
    totalStudents: students?.length || 0,
    maleCount: students?.filter(s => s.gender === 'Male').length || 0,
    femaleCount: students?.filter(s => s.gender === 'Female').length || 0,
    averageAttendance: students?.length ? students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length : 0,
    averageScore: students?.length ? students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length : 0,
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStudentFullName = (student: any) => {
    const firstName = student?.firstName || '';
    const lastName = student?.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Student';
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
    try {
      const escapeCsv = (val: any) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const headers = ['Student ID', 'Name', 'Gender', 'DOB', 'Parent Name', 'Parent Phone', 'Parent Email', 'Attendance %', 'Average Score', 'Position'];
      const rows = filteredStudents.map(s => [
        escapeCsv(s.admissionNumber),
        escapeCsv(`${s.firstName} ${s.lastName}`),
        escapeCsv(s.gender),
        escapeCsv(s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB') : ''),
        escapeCsv(s.parentName),
        escapeCsv(s.parentPhone),
        escapeCsv(s.parentEmail),
        escapeCsv(s.attendance),
        escapeCsv(s.averageScore.toFixed(1)),
        escapeCsv(s.position),
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      await CapacitorHelper.downloadCSV(csvContent, `${selectedClass?.name || 'class'}-class-list-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`Exported ${filteredStudents.length} students`);
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 70) return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Excellent', bar: 'from-emerald-400 to-emerald-600' };
    if (score >= 50) return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Good', bar: 'from-amber-400 to-amber-600' };
    return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Needs Improvement', bar: 'from-red-400 to-red-600' };
  };

  const getAttendanceColor = (pct: number) => {
    if (pct >= 90) return { bar: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600' };
    if (pct >= 75) return { bar: 'from-amber-400 to-amber-600', text: 'text-amber-600' };
    return { bar: 'from-red-400 to-red-600', text: 'text-red-600' };
  };

  const getPositionBadge = (pos: number) => {
    if (pos === 1) return { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: Trophy, iconColor: 'text-amber-500' };
    if (pos === 2) return { bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Medal, iconColor: 'text-slate-400' };
    if (pos === 3) return { bg: 'bg-orange-100 text-orange-700 border-orange-200', icon: Medal, iconColor: 'text-orange-500' };
    return { bg: 'bg-slate-50 text-slate-500 border-slate-100', icon: null, iconColor: '' };
  };

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {isLoading && (
        <Card className="border-slate-200">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-slate-600 text-sm">Loading class data...</p>
          </CardContent>
        </Card>
      )}

      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 mb-3 text-sm">{error}</p>
            <Button onClick={() => window.location.reload()} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-indigo-600 flex-shrink-0" />
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-slate-800">
                  {selectedClass?.name || 'No Class Assigned'}
                </h1>
                <p className="text-xs md:text-sm text-slate-500">
                  {classStats.totalStudents} student{classStats.totalStudents !== 1 ? 's' : ''} • Class List
                </p>
              </div>
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
                <SelectTrigger className="w-full sm:w-44 h-9 text-sm border-slate-200 rounded-lg">
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
            <Card className="border-slate-200">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700 mb-1">No Classes Assigned</h3>
                <p className="text-slate-500 text-sm">Contact the administrator to get class teacher assignments.</p>
              </CardContent>
            </Card>
          )}

          {teacherClasses.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Card className="border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">Total Students</p>
                        <p className="text-slate-800 font-bold text-lg">{classStats.totalStudents}</p>
                      </div>
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">Male</p>
                        <p className="text-slate-800 font-bold text-lg">{classStats.maleCount}</p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">Female</p>
                        <p className="text-slate-800 font-bold text-lg">{classStats.femaleCount}</p>
                      </div>
                      <div className="bg-pink-100 p-2 rounded-lg">
                        <UserCheck className="w-4 h-4 text-pink-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">Avg Attendance</p>
                        <p className={`font-bold text-lg ${classStats.averageAttendance >= 75 ? 'text-emerald-600' : classStats.averageAttendance >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {classStats.averageAttendance.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <Target className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">Class Average</p>
                        <p className={`font-bold text-lg ${classStats.averageScore >= 70 ? 'text-emerald-600' : classStats.averageScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {classStats.averageScore.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-amber-100 p-2 rounded-lg">
                        <Trophy className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200">
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search name, ID, or parent..."
                        className="pl-9 h-9 text-sm border-slate-200 rounded-lg"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {['all', 'Male', 'Female'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGenderFilter(g)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            genderFilter === g
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {g === 'all' ? 'All' : g}
                        </button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToCSV}
                        className="h-9 text-xs border-slate-200 text-slate-600 rounded-lg"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {paginatedStudents.length === 0 ? (
                <Card className="border-slate-200">
                  <CardContent className="p-8 text-center">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No students found</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paginatedStudents.map((student) => {
                    const perf = getPerformanceColor(student.averageScore);
                    const attColor = getAttendanceColor(student.attendance);
                    const posBadge = getPositionBadge(student.position);
                    const PosIcon = posBadge.icon;

                    return (
                      <Card key={student.id} className="border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all group">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${posBadge.bg}`}>
                                {PosIcon ? <PosIcon className={`w-4 h-4 ${posBadge.iconColor}`} /> : `#${student.position}`}
                              </div>
                            </div>
                            <Avatar className="w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold">
                              <AvatarImage
                                src={getStudentAvatarCandidates(student)[0]}
                                alt={getStudentFullName(student)}
                                className="object-cover rounded-lg"
                                onError={(e) => handleAvatarImageError(e, student)}
                              />
                              <AvatarFallback className="bg-transparent text-xs rounded-lg">
                                {getInitials(getStudentFullName(student))}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{getStudentFullName(student)}</p>
                                  <p className="text-xs text-slate-400 font-mono">{student.admissionNumber}</p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="w-4 h-4 text-slate-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-lg border-slate-200">
                                    <DropdownMenuItem onClick={() => setSelectedStudent(student)} className="text-sm cursor-pointer">
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-sm cursor-pointer">
                                      <MessageSquare className="w-4 h-4 mr-2" />
                                      Message Parent
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-sm cursor-pointer">
                                      <FileText className="w-4 h-4 mr-2" />
                                      View Result
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                                  student.gender === 'Male'
                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                    : 'bg-pink-50 text-pink-600 border-pink-200'
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                                  {student.gender}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${perf.badge}`}>
                                  {student.averageScore.toFixed(1)}%
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Attendance</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full bg-gradient-to-r ${attColor.bar}`}
                                        style={{ width: `${student.attendance}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-semibold ${attColor.text}`}>{student.attendance}%</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Performance</p>
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${perf.badge}`}>
                                    {perf.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {filteredStudents.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
                    >
                      <SelectTrigger className="h-8 w-20 text-xs border-slate-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="h-8 w-8 p-0 border-slate-200 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {getPageNumbers().map((page, i) =>
                        page === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 p-0 text-xs rounded-lg ${
                              currentPage === page
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            {page}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="h-8 w-8 p-0 border-slate-200 rounded-lg"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
                <DialogContent className="max-w-lg rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="text-slate-800 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-600" />
                      Student Details
                    </DialogTitle>
                    <DialogDescription>
                      {selectedStudent && getStudentFullName(selectedStudent)}
                    </DialogDescription>
                  </DialogHeader>
                  {selectedStudent && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-lg font-semibold">
                          <AvatarImage
                            src={getStudentAvatarCandidates(selectedStudent)[0]}
                            alt={getStudentFullName(selectedStudent)}
                            className="object-cover rounded-xl"
                            onError={(e) => handleAvatarImageError(e, selectedStudent)}
                          />
                          <AvatarFallback className="bg-transparent rounded-xl">
                            {getInitials(getStudentFullName(selectedStudent))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-slate-800 font-semibold">{getStudentFullName(selectedStudent)}</h3>
                          <p className="text-sm text-slate-500 font-mono">{selectedStudent.admissionNumber}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-xs font-medium border ${
                            selectedStudent.gender === 'Male'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-pink-50 text-pink-600 border-pink-200'
                          }`}>
                            {selectedStudent.gender}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 mb-0.5">Position</p>
                          <p className="text-slate-800 font-semibold">{selectedStudent.position} / {students.length}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 mb-0.5">Date of Birth</p>
                          <p className="text-slate-800 font-semibold">
                            {selectedStudent.date_of_birth
                              ? new Date(selectedStudent.date_of_birth).toLocaleDateString('en-GB')
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          <p className="text-xs text-emerald-600 mb-0.5">Average Score</p>
                          <p className="text-emerald-700 font-bold text-lg">{selectedStudent.averageScore.toFixed(1)}%</p>
                          <span className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-medium border ${getPerformanceColor(selectedStudent.averageScore).badge}`}>
                            {getPerformanceColor(selectedStudent.averageScore).label}
                          </span>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                          <p className="text-xs text-amber-600 mb-0.5">Attendance Rate</p>
                          <p className="text-amber-700 font-bold text-lg">{selectedStudent.attendance}%</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Parent / Guardian</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700">{selectedStudent.parentName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700">{selectedStudent.parentPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700 truncate">{selectedStudent.parentEmail}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs border-slate-200 rounded-lg">
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs border-slate-200 rounded-lg">
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          View Result
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}
        </>
      )}
    </div>
  );
}
