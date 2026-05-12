import { useState, useEffect } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { useNotificationService } from '../../contexts/NotificationService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { API_CONFIG } from '../../config/api';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  BarChart3, 
  Zap, 
  RotateCcw, 
  XSquare, 
  CheckSquare, 
  RefreshCw
} from 'lucide-react';

export function MarkAttendancePage() {
  const {
    currentUser,
    teachers,
    classes,
    students,
    getStudentsByClass,
    addAttendance,
    getAttendancesByDate,
    getTeacherAssignments,
    classTeacherAssignments,
    currentTerm,
    currentAcademicYear,
    parentStudentLinks,
    addNotification,
    getAttendanceRequirements,
    loadAttendanceRequirements,
    getAttendancesByStudent,
    loadAttendancesFromAPI,
    compiledResults,
    loadCompiledResultsFromAPI,
    updateAttendance,
    updateCompiledResult,
    attendances,
    loadClassTeacherAssignmentsFromAPI
  } = useSchool();

  const { broadcast } = useNotificationService();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [studentAttendanceInput, setStudentAttendanceInput] = useState<{
    [studentId: number]: number; // Number of days present
  }>({});
  const [remarks, setRemarks] = useState<{ [studentId: number]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const getStudentPhotoCandidates = (student: any): string[] => {
    const rawUrl =
      student?.photoUrl ||
      student?.photo_url ||
      student?.photoURL ||
      student?.passportPhoto ||
      student?.passport_photo ||
      student?.passport;

    if (!rawUrl || typeof rawUrl !== 'string') return [];
    const trimmed = rawUrl.trim();
    if (!trimmed) return [];

    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return [trimmed];

    let apiOrigin = '';
    try {
      const apiBase = API_CONFIG?.BASE_URL || '';
      apiOrigin = apiBase ? new URL(apiBase).origin : '';
    } catch {
      apiOrigin = '';
    }

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

    const candidates: string[] = [];
    if (appOrigin) candidates.push(`${appOrigin}${normalizedPath}`);
    if (apiOrigin) candidates.push(`${apiOrigin}${normalizedPath}`);
    candidates.push(trimmed);

    return Array.from(new Set(candidates)).filter(Boolean);
  };

  const handleStudentPhotoError = (e: React.SyntheticEvent<HTMLImageElement>, student: any) => {
    const img = e.currentTarget;
    const candidates = getStudentPhotoCandidates(student);
    const idx = Number(img.dataset.candidateIdx || '0');
    const nextIdx = idx + 1;
    if (nextIdx < candidates.length) {
      img.dataset.candidateIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };

  const getInitials = (student: any) => {
    const a = String(student?.firstName || '').trim();
    const b = String(student?.lastName || '').trim();
    return `${a[0] || ''}${b[0] || ''}`.toUpperCase() || '??';
  };

  // Load attendance requirements on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (currentTerm && currentAcademicYear) {
          await loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear);
        }
        await loadAttendanceRequirements();
        await loadAttendancesFromAPI();
        await loadCompiledResultsFromAPI();
      } catch (error) {
        // Silently continue with empty data
      }
    };
    loadData();
  }, [currentTerm, currentAcademicYear, loadClassTeacherAssignmentsFromAPI, loadAttendanceRequirements, loadAttendancesFromAPI, loadCompiledResultsFromAPI]);

  // Get current teacher's classes - ONLY as class teacher
  const currentTeacher = teachers.find(t => t.id === currentUser?.linked_id);
  const teacherClasses = classes.filter((c: any) => {
    const assignment = classTeacherAssignments.find((cta: any) => 
      String(cta.teacher_id) === String(currentUser?.linked_id) && 
      String(cta.class_id) === String(c.id) &&
      cta.academic_year === currentAcademicYear && 
      cta.term === currentTerm &&
      cta.status === 'Active'
    );
    return !!assignment;
  });

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
        count: (students || []).filter((s: any) => String(s.class_id) === String(c.id)).length,
      }))
      .sort((a: any, b: any) => b.count - a.count)[0];

    return best?.id ? Number(best.id) : (Number(baseClass.id) || null);
  };

  const effectiveSelectedClassId = resolveCanonicalClassId(selectedClassId) ?? selectedClassId;

  // Enhanced validation - teacher must be assigned as class teacher
  if (!currentTerm || !currentAcademicYear) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">Term/Session Not Set</h3>
            <p className="text-xs text-gray-600 mb-4">
              Current term or academic session is not set. Please contact the administrator to set it in System Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No Class Assignment</h3>
            <p className="text-xs text-gray-600 mb-4">
              You are not assigned as a class teacher for any class. Only class teachers can mark attendance.
            </p>
            <p className="text-xs text-gray-500">
              Please contact the administrator to get assigned as a class teacher.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const classStudents = effectiveSelectedClassId
    ? (students || []).filter(s => {
        const isSameClass = String(s.class_id) === String(effectiveSelectedClassId);
        const status = String((s as any)?.status ?? '').trim().toLowerCase();
        const isActive = status === '' || status === 'active';
        return isSameClass && isActive;
      })
    : [];

  // Load existing attendance data when class is selected
  useEffect(() => {
    if (selectedClassId > 0 && classStudents.length > 0) {
      try {
        const existingAttendanceData: { [studentId: number]: number } = {};
        const existingRemarks: { [studentId: number]: string } = {};
        
        classStudents.forEach(student => {
          // Check compiled results first (primary source)
          const compiledResult = compiledResults.find(cr => 
            cr.student_id === student.id &&
            String(cr.class_id) === String(selectedClassId) &&
            cr.term === currentTerm &&
            cr.academic_year === currentAcademicYear
          );
          
          if (compiledResult && compiledResult.times_present > 0) {
            existingAttendanceData[student.id] = compiledResult.times_present;
            
            // Create remarks from compiled result data
            const totalDays = compiledResult.total_attendance_days || getAttendanceRequirements()[currentTerm || 'First Term'] || 0;
            existingRemarks[student.id] = `${compiledResult.times_present} out of ${totalDays} days`;
          } else {
            // Fallback to attendance table
            const studentAttendances = attendances.filter(a => 
              a.student_id === student.id &&
              String(a.class_id) === String(selectedClassId) &&
              a.term === currentTerm &&
              a.academic_year === currentAcademicYear
            );
            
            if (studentAttendances.length > 0) {
              const latestAttendance = studentAttendances[studentAttendances.length - 1];
              const remarksText = latestAttendance.remarks || '';
              const daysMatch = remarksText.match(/(\d+)\s*out of\s*(\d+)/);
              
              if (daysMatch) {
                existingAttendanceData[student.id] = parseInt(daysMatch[1]) || 0;
                existingRemarks[student.id] = remarksText;
              }
            }
          }
        });
        
        setStudentAttendanceInput(existingAttendanceData);
        setRemarks(existingRemarks);
      } catch (error) {
        setStudentAttendanceInput({});
        setRemarks({});
      }
    }
  }, [selectedClassId, classStudents, currentTerm, currentAcademicYear, compiledResults, getAttendancesByStudent, getAttendanceRequirements]);

  const existingAttendance = getAttendancesByDate(new Date().toISOString().split('T')[0]);
  const isAlreadyMarked = existingAttendance.some(
    a => String(a.class_id) === String(selectedClassId) && a.term === currentTerm && a.academic_year === currentAcademicYear
  );

  // Handle attendance days input change with real-time save
  const handleAttendanceDaysChange = async (studentId: number, days: string) => {
    const daysNum = parseInt(days) || 0;
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = attendanceRequirements[currentTerm as any] || 0;

    if (!currentTerm || !currentAcademicYear) {
      toast.error('Current term or academic session is not set. Please contact the admin to set it in System Settings.');
      return;
    }
    
    // Check if attendance requirements are set
    if (requiredDays === 0) {
      return;
    }
    
    // Validate against required days
    if (daysNum < 0 || daysNum > requiredDays) {
      // Show brief error feedback
      const input = document.querySelector(`input[student-id="${studentId}"]`) as HTMLInputElement;
      if (input) {
        input.classList.add('border-red-500');
        setTimeout(() => input.classList.remove('border-red-500'), 2000);
      }
      return;
    }
    
    // Update local state immediately for UI responsiveness
    setStudentAttendanceInput(prev => ({
      ...prev,
      [studentId]: daysNum
    }));
    
    // Update remarks
    setRemarks(prev => ({
      ...prev,
      [studentId]: `${daysNum} out of ${requiredDays} days`
    }));
    
    // Save to database immediately
    try {
      // First save to attendance table
      // IMPORTANT: The live `attendance` table schema only supports:
      // id, student_id, class_id, date, status, marked_by, marked_date, term, academic_year, remarks
      // Any extra fields will cause a 500 from /api/database/query.
      const attendancePayload = {
        student_id: studentId,
        class_id: Number(selectedClassId),
        date: new Date().toISOString().split('T')[0],
        status: (daysNum === requiredDays ? 'Present' : daysNum > 0 ? 'Late' : 'Absent') as 'Present' | 'Absent' | 'Late' | 'Excused',
        marked_by: currentUser?.id || 1,
        marked_date: new Date().toISOString(),
        term: currentTerm,
        academic_year: currentAcademicYear,
        remarks: `${daysNum} out of ${requiredDays} days`
      };
      
      // Check if attendance record exists
      const existingAttendance = attendances.find(a => 
        a.student_id === studentId &&
        String(a.class_id) === String(selectedClassId) &&
        a.term === currentTerm &&
        a.academic_year === currentAcademicYear
      );
      
      if (existingAttendance) {
        await updateAttendance(existingAttendance.id, attendancePayload);
      } else {
        await addAttendance(attendancePayload);
      }
      
      // Also update compiled results if they exist
      const compiledResult = compiledResults.find(cr => 
        cr.student_id === studentId &&
        String(cr.class_id) === String(selectedClassId) &&
        cr.term === currentTerm &&
        cr.academic_year === currentAcademicYear
      );
      
      if (compiledResult) {
        // Check if results are already approved
        if (compiledResult.status === 'Approved') {
          const student = classStudents.find(s => s.id === studentId);
          toast.error(`Cannot update attendance for ${student?.firstName} ${student?.lastName}: Results have been approved by admin`, {
            id: `blocked-attendance-${studentId}`,
            duration: 5000
          });
          return;
        }
        
        await updateCompiledResult(compiledResult.id, {
          times_present: daysNum,
          times_absent: requiredDays - daysNum,
          total_attendance_days: requiredDays
        });
      }
      
    } catch (error) {
      // Silent fail for security
    }
  };

  // Handle remark change
  const handleRemarkChange = (studentId: number, remark: string) => {
    setRemarks(prev => ({
      ...prev,
      [studentId]: remark
    }));
  };

  // Quick actions with real-time save
  const handleMarkAllPresent = async () => {
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = attendanceRequirements[currentTerm || 'First Term'] || 0;
    
    const allPresent: { [studentId: number]: number } = {};
    classStudents.forEach(student => {
      allPresent[student.id] = requiredDays;
    });
    setStudentAttendanceInput(allPresent);
    
    // Save all to database
    for (const student of classStudents) {
      await handleAttendanceDaysChange(student.id, requiredDays.toString());
    }
    
    toast.success('All students marked as full attendance');
  };

  const handleMarkAllZero = async () => {
    const allZero: { [studentId: number]: number } = {};
    classStudents.forEach(student => {
      allZero[student.id] = 0;
    });
    setStudentAttendanceInput(allZero);
    
    // Save all to database
    for (const student of classStudents) {
      await handleAttendanceDaysChange(student.id, '0');
    }
    
    toast.success('All students marked as zero attendance');
  };

  const handleClearAll = () => {
    setStudentAttendanceInput({});
    setRemarks({});
  };

  const handleSubmit = async () => {
    // Since we're saving in real-time, this just shows a summary
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = attendanceRequirements[currentTerm || 'First Term'] || 0;
    
    const totalStudents = classStudents.length;
    const studentsWithAttendance = Object.keys(studentAttendanceInput).length;
    const totalDaysPresent = Object.values(studentAttendanceInput).reduce((sum, days) => sum + days, 0);
    
    toast.success(
      `Attendance Summary:\n` +
      `Total Students: ${totalStudents}\n` +
      `Recorded: ${studentsWithAttendance}/${totalStudents}\n` +
      `Total Days Present: ${totalDaysPresent}\n` +
      `(Data is saved automatically as you type)`
    );
  };

  // Calculate attendance percentage for a student based on input
  const calculateAttendancePercentage = (studentId: number): number => {
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = attendanceRequirements[currentTerm || 'First Term'] || 0;
    
    if (requiredDays === 0) return 0;

    const daysPresent = studentAttendanceInput[studentId] || 0;
    return Math.round((daysPresent / requiredDays) * 100);
  };

  // Get total school days for the term from school settings
  const getTotalSchoolDays = (): number => {
    const attendanceRequirements = getAttendanceRequirements();
    return attendanceRequirements[currentTerm || 'First Term'] || 0;
  };

  // Get present days count for a student from input
  const getPresentDays = (studentId: number): number => {
    return studentAttendanceInput[studentId] || 0;
  };

  // Send notifications to parents for students with low attendance
  const sendAttendanceNotifications = async () => {
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = attendanceRequirements[currentTerm || 'First Term'] || 0;
    
    const lowAttendanceStudents = classStudents.filter(student => {
      const daysPresent = studentAttendanceInput[student.id] || 0;
      const attendanceRate = requiredDays > 0 ? (daysPresent / requiredDays) * 100 : 0;
      return attendanceRate < 75; // Notify if attendance is below 75%
    });

    for (const student of lowAttendanceStudents) {
      const daysPresent = studentAttendanceInput[student.id] || 0;
      const attendanceRate = requiredDays > 0 ? Math.round((daysPresent / requiredDays) * 100) : 0;
      
      // Find parent linked to this student
      const parentLink = parentStudentLinks.find(link => link.student_id === student.id);
      if (parentLink) {
        const notificationMessage = `Low attendance alert for ${student.firstName} ${student.lastName}: ${attendanceRate}% (${daysPresent}/${requiredDays} days) for ${currentTerm}. Please contact the school.`;
        
        addNotification({
          targetAudience: 'parents',
          type: 'warning',
          title: 'Low Attendance Alert',
          message: notificationMessage,
          sentBy: currentUser?.id || 0,
          sentDate: new Date().toISOString(),
          isRead: false,
          readBy: []
        });

        // Real-time broadcast
        broadcast({
          id: Date.now(),
          type: 'warning',
          title: 'Low Attendance Alert',
          message: notificationMessage,
          targetAudience: 'parents',
          sentDate: new Date().toISOString()
        });
      }
    }
  };

  const getStatusColor = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      case 'Late': return 'text-yellow-600 bg-yellow-50';
      case 'Excused': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    switch (status) {
      case 'Present': return <CheckCircle className="w-4 h-4" />;
      case 'Absent': return <XCircle className="w-4 h-4" />;
      case 'Late': return <Clock className="w-4 h-4" />;
      case 'Excused': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // Get attendance requirements from school settings
  const attendanceRequirements = getAttendanceRequirements();
  const requiredDays = attendanceRequirements[currentTerm || 'First Term'] || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Mark Attendance
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Record term attendance - Automatically synced with compile results
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {currentTeacher && `${currentTeacher.firstName} ${currentTeacher.lastName}`}
            </div>
            <div className="text-xs text-gray-500">
              {currentTerm} • {currentAcademicYear}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Requirements Info */}
      {requiredDays > 0 ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {currentTerm} Attendance Requirements
                </p>
                <p className="text-xs text-blue-700">
                  {requiredDays} days required for full attendance credit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Attendance Requirements Not Set
                </p>
                <p className="text-xs text-yellow-700">
                  Please configure attendance requirements for {currentTerm} in school settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Summary */}
      {showSummary && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                Attendance marked successfully! Data synced with compile results.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Section */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Class Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs font-medium">Select Class *</Label>
              <Select
                value={selectedClassId.toString()}
                onValueChange={(value) => {
                  const rawId = Number(value);
                  const canonicalId = resolveCanonicalClassId(rawId) ?? rawId;
                  setSelectedClassId(canonicalId);
                  setStudentAttendanceInput({});
                  setRemarks({});
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Choose class..." />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.currentStudents || 0} Students
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isAlreadyMarked && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-800">
                    Term attendance already exists for this class. Submitting will update existing records.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {selectedClassId > 0 && classStudents.length > 0 && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleMarkAllPresent}
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={classStudents.length === 0}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Mark All Full Attendance
              </Button>
              <Button
                onClick={handleMarkAllZero}
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={classStudents.length === 0}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Mark All Zero
              </Button>
              <Button
                onClick={handleClearAll}
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={classStudents.length === 0}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      {selectedClassId > 0 && classStudents.length > 0 && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students - {classStudents.length} Total
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {classStudents.map(student => {
                const daysPresent = studentAttendanceInput[student.id] || 0;
                const attendanceRate = requiredDays > 0 ? Math.round((daysPresent / requiredDays) * 100) : 0;
                
                return (
                  <div key={student.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-blue-100 text-blue-600">
                          <AvatarImage
                            src={getStudentPhotoCandidates(student)[0] || ''}
                            alt={`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'}
                            className="object-cover"
                            data-candidate-idx={0}
                            onError={(e) => handleStudentPhotoError(e, student)}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                            {getInitials(student)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {student.admissionNumber} • {student.gender}
                          </p>
                        </div>
                      </div>
                      
                      {/* Attendance Rate Badge */}
                      <div className="flex flex-col items-end">
                        <Badge 
                          variant={attendanceRate >= 75 ? "default" : attendanceRate >= 50 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {attendanceRate}% Attendance
                        </Badge>
                        <span className="text-xs text-gray-500 mt-1">
                          {daysPresent}/{requiredDays} days
                        </span>
                      </div>
                    </div>

                    {/* Attendance Days Input */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 block mb-1">
                          Days Present (max: {requiredDays})
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={requiredDays}
                          student-id={student.id.toString()}
                          value={studentAttendanceInput[student.id] || ''}
                          onChange={(e) => handleAttendanceDaysChange(student.id, e.target.value)}
                          placeholder={requiredDays > 0 ? "Enter days present..." : "Configure attendance requirements first"}
                          className="w-full text-sm"
                          disabled={requiredDays === 0}
                        />
                      </div>
                      
                      {/* Quick Fill Buttons */}
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleAttendanceDaysChange(student.id, '0')}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-2"
                          disabled={requiredDays === 0}
                        >
                          0
                        </Button>
                        <Button
                          onClick={() => handleAttendanceDaysChange(student.id, Math.floor(requiredDays * 0.5).toString())}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-2"
                          disabled={requiredDays === 0}
                        >
                          ½
                        </Button>
                        <Button
                          onClick={() => handleAttendanceDaysChange(student.id, requiredDays.toString())}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-2"
                          disabled={requiredDays === 0}
                        >
                          Full
                        </Button>
                      </div>
                    </div>

                    {/* Remarks */}
                    {daysPresent < requiredDays && (
                      <div className="mt-2">
                        <Input
                          type="text"
                          placeholder={`Add remarks for ${attendanceRate < 75 ? 'low attendance' : 'partial attendance'}...`}
                          value={remarks[student.id] || ''}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          className="w-full text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <XSquare className="w-3 h-3 mr-1" />
                Clear All
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={Object.keys(studentAttendanceInput).length !== classStudents.length || isLoading}
                className="h-8 text-xs"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Submit Attendance
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedClassId === 0 && (
        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Class Selected</h3>
            <p className="text-sm text-gray-600">Please select a class to begin marking attendance</p>
          </CardContent>
        </Card>
      )}

      {selectedClassId > 0 && classStudents.length === 0 && (
        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
            <p className="text-sm text-gray-600">This class has no students enrolled</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
