 import { useState, useMemo, useCallback, useEffect } from "react";
import { BookOpen, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Sparkles, Users, Calendar, Calculator, FileText, Heart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Alert, AlertDescription } from "../ui/alert";
import { Score, Subject, SubjectAssignment } from "../../types/school";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { api } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { getStudentPhotoCandidates, handleStudentPhotoError } from "../../utils/studentPhoto";
import { generateAutoComment, parseAttendedDaysFromRemarks, parseAttendanceFromRemarks } from "../../utils/commentGenerators";
import { useSubmitResult } from "../../hooks/useSubmitResult";
import { StudentListCard } from "./compile-results/StudentListCard";
import { ClassSelectionCard } from "./compile-results/ClassSelectionCard";
import { DomainDisplay } from "./compile-results/DomainDisplay";
import { SubjectScoresCard } from "./compile-results/SubjectScoresCard";
import { AttendanceDisplayCard } from "./compile-results/AttendanceDisplayCard";

export function CompileResultsPage() {
  const {
    currentUser,
    teachers,
    students,
    classes,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    subjects,
    currentTerm,
    currentAcademicYear,
    subjectAssignments,
    subjectRegistrations,
    attendances,
    loadScoresFromAPI,
    loadAffectiveDomainsFromAPI,
    loadPsychomotorDomainsFromAPI,
    loadAttendancesFromAPI,
    loadCompiledResultsFromAPI,
    refreshClassData,
    canViewResults,
    canManageScores,
    updateAffectiveDomain,
    updatePsychomotorDomain,
    createAffectiveDomain,
    createPsychomotorDomain,
    getAttendanceByStudent,
    addAttendance,
    updateAttendance,
    getAttendanceRequirements,
    loadAttendanceRequirements,
    classTeacherAssignments,
    getTermDates,
    loadClassTeacherAssignmentsFromAPI,
    loadSubjectAssignmentsFromAPI
  } = useSchool();

  useEffect(() => {
    const loadAssignments = async () => {
      if (!currentTerm || !currentAcademicYear) return;
      try {
        await Promise.all([
          loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
          loadSubjectAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
        ]);
      } catch (error) {
        // Silent fail for security
      }
    };

    loadAssignments();
  }, [currentTerm, currentAcademicYear, loadClassTeacherAssignmentsFromAPI, loadSubjectAssignmentsFromAPI]);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [customComment, setCustomComment] = useState<string>("");
  const [_showCommentOptions, _setShowCommentOptions] = useState<boolean>(false);

  const resolveCanonicalClassId = (classId: any): string | null => {
    if (!classId) return null;
    const baseClass = (classes || []).find((c: any) => String(c.id) === String(classId));
    if (!baseClass) return String(classId);

    const siblings = (classes || []).filter((c: any) =>
      String(c.name).trim().toLowerCase() === String(baseClass.name).trim().toLowerCase() &&
      String(c.level).trim().toLowerCase() === String(baseClass.level).trim().toLowerCase()
    );

    if (siblings.length <= 1) return String(baseClass.id);

    const best = siblings
      .map((c: any) => ({
        id: c.id,
        count: (students || []).filter((s: any) => String(s.class_id) === String(c.id)).length,
      }))
      .sort((a: any, b: any) => b.count - a.count)[0];

    return best?.id ? String(best.id) : String(baseClass.id);
  };

  const effectiveSelectedClassId = useMemo(() => {
    return resolveCanonicalClassId(selectedClassId) ?? selectedClassId;
  }, [selectedClassId, classes, students]);
  const [_commentOptions, _setCommentOptions] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [resultsGenerated, setResultsGenerated] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    
  // Affective and Psychomotor form states
  const [affectiveData, setAffectiveData] = useState({
    attentiveness: 3,
    attentiveness_remark: '',
    honesty: 3,
    honesty_remark: '',
    neatness: 3,
    neatness_remark: '',
    obedience: 3,
    obedience_remark: '',
    sense_of_responsibility: 3,
    sense_of_responsibility_remark: ''
  });
  
  const [psychomotorData, setPsychomotorData] = useState({
    attention_to_direction: 3,
    attention_to_direction_remark: '',
    considerate_of_others: 3,
    considerate_of_others_remark: '',
    handwriting: 3,
    handwriting_remark: '',
    sports: 3,
    sports_remark: '',
    verbal_fluency: 3,
    verbal_fluency_remark: '',
    works_well_independently: 3,
    works_well_independently_remark: ''
  });

  // Refresh data function with optimized class-specific refresh
  const refreshData = useCallback(async () => {
    if (!selectedClassId || !currentTerm || !currentAcademicYear) {
      return;
    }

    try {
      
      await loadAttendanceRequirements();

      await refreshClassData(Number(selectedClassId));
      
      // Load scores data
      await loadScoresFromAPI(currentTerm, currentAcademicYear);
      await loadPsychomotorDomainsFromAPI(currentTerm, currentAcademicYear);
      
      // Load attendance data
      await loadAttendancesFromAPI();
      
      // Load compiled results to get latest rejection status
      await loadCompiledResultsFromAPI(null);
      
      setLastRefresh(new Date());
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  }, [selectedClassId, refreshClassData, loadScoresFromAPI, loadAttendancesFromAPI, loadCompiledResultsFromAPI]);

  // Ensure domains are loaded for the selected term/session
  useEffect(() => {
    if (!selectedClassId) return;
    loadAffectiveDomainsFromAPI(currentTerm, currentAcademicYear);
    loadPsychomotorDomainsFromAPI(currentTerm, currentAcademicYear);
  }, [selectedClassId, currentTerm, currentAcademicYear]);

  // Auto-refresh compiled results to check for admin rejections and new scores
  useEffect(() => {
    if (!selectedClassId || !currentTerm || !currentAcademicYear) return;

    let isActive = true;
    let timeoutId: number | null = null;
    let errorCount = 0;

    const tick = async () => {
      if (!isActive) return;
      try {
        const ok = await loadCompiledResultsFromAPI(null);
        errorCount = ok ? 0 : Math.min(errorCount + 1, 6);
      } catch (error) {
        errorCount = Math.min(errorCount + 1, 6);
      } finally {
        if (!isActive) return;
        const base = 30000; // 30s normal refresh
        const delay = base * Math.pow(2, errorCount); // backoff up to ~32min
        timeoutId = window.setTimeout(tick, delay);
      }
    };

    // Start after a short delay to avoid stampeding on mount
    timeoutId = window.setTimeout(tick, 2000);

    return () => {
      isActive = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [selectedClassId, currentTerm, currentAcademicYear, loadCompiledResultsFromAPI]);

  // Attendance requirements monitoring (disabled to prevent console spam)
  // useEffect(() => {
  //   let previousRequirements = JSON.stringify(getAttendanceRequirements());
    
  //   const checkAttendanceRequirements = () => {
  //     const currentRequirements = JSON.stringify(getAttendanceRequirements());
      
  //     // If requirements changed, refresh data and recalculate
  //     if (currentRequirements !== previousRequirements) {
  //       // Attendance requirements changed, refreshing data
  //       previousRequirements = currentRequirements;
        
  //       // Refresh compiled results to get updated calculations
  //       loadCompiledResultsFromAPI().then(() => {
  //         toast.info('Attendance requirements updated - calculations refreshed');
  //       });
  //     }
  //   };
    
  //   const interval = setInterval(checkAttendanceRequirements, 2000); // Check every 2 seconds
    
  //   return () => clearInterval(interval);
  // }, [getAttendanceRequirements, loadCompiledResultsFromAPI]);

  // Refresh when window gains focus (in case admin rejected in another tab)
  useEffect(() => {
    const handleFocus = async () => {
      try {
        await loadCompiledResultsFromAPI(null);
      } catch (error) {
        // Silent fail for security
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadCompiledResultsFromAPI]);

  // Refresh when tab becomes visible (helps reflect admin reject/approve in real time)
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await loadCompiledResultsFromAPI(null);
      } catch (error) {
        // Silent fail for security
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadCompiledResultsFromAPI]);

  // Manual refresh function for testing
  const handleManualRefresh = async () => {
    try {
      toast.info('Refreshing data...');
      await loadCompiledResultsFromAPI(null);
      await loadScoresFromAPI();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  // Generate Results function
  const handleGenerateResults = async () => {
    setIsGenerating(true);
    try {
      toast.info("Generating results... Please wait.", { id: "generate-results" });
      
      // 1. VALIDATION: Check required data
      if (!selectedClassId || !currentTeacher) {
        toast.error('Please select a class and ensure teacher is assigned', { id: "generate-results" });
        return;
      }

      const attendanceRequirements = getAttendanceRequirements();
      if (!currentTerm || !currentAcademicYear) {
        toast.error('Current term or academic session is not set. Please contact the admin to set it in System Settings.', { id: "generate-results" });
        return;
      }

      const requiredDays = attendanceRequirements[currentTerm] || 0;
      
      if (requiredDays === 0) {
        toast.error('Attendance requirements not set for current term. Please configure attendance settings.', { id: "generate-results" });
        return;
      }

      // 2. SCORES: Refresh latest score data
      toast.info("Refreshing score data...", { id: "generate-results" });
      await loadScoresFromAPI();
      
      // 3. AFFECTIVE/PSYCHOMOTOR: Ensure data is loaded
      await loadAffectiveDomainsFromAPI();
      await loadPsychomotorDomainsFromAPI();
      
      // 4. COMPILED RESULTS: Refresh to get latest data
      await loadCompiledResultsFromAPI(null);
      
      // 5. FORCE RECALCULATION: Update resultsGenerated flag to trigger position recalculation
      setResultsGenerated(true);
      
      // 6. VALIDATION SUMMARY: Report results
      const totalStudents = classStudents.length;
      const studentsWithScores = studentsCompletion.filter(s => s.totalScore > 0).length;
      const studentsComplete = studentsCompletion.filter(s => s.isComplete).length;
      
      toast.success(
        `Results generated successfully!\n` +
        `Scores: ${studentsWithScores}/${totalStudents} students\n` +
        `Complete: ${studentsComplete}/${totalStudents} students\n` +
        `(Attendance is now managed separately in Mark Attendance page)`,
        { id: "generate-results" }
      );
      
    } catch (error) {
      toast.error('Failed to generate results. Please try again.', { id: "generate-results" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-refresh when component mounts (only once per class change)
  useEffect(() => {
    if (selectedClassId) {
      refreshData();
    }
  }, [selectedClassId]); // Only run when class changes

  // Periodic score refresh to ensure latest data
  useEffect(() => {
    if (!selectedClassId) return;

    const interval = setInterval(async () => {
      try {
        await loadScoresFromAPI();
        // Scores refreshed automatically
      } catch (error) {
        // Silent fail for security
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedClassId]); // Remove loadScoresFromAPI from dependencies

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (currentUser?.role === 'teacher') {
        const hasResultsPermission = await canViewResults();
        const hasScoresPermission = await canManageScores();
        
        if (!hasResultsPermission) {
          toast.error('You do not have permission to view results');
          return;
        }
        
        if (!hasScoresPermission) {
          toast.error('You do not have permission to manage scores');
          return;
        }
      }
      
      // Attendance requirements will be loaded by other components
    };
    
    checkPermissions();
  }, [currentUser, canViewResults, canManageScores]); // Remove loadAttendanceRequirements from dependencies

  // Get current teacher
  const currentTeacher = currentUser ? teachers.find(t => String(t.id) === String(currentUser.linked_id)) : null;
  // Check if teacher has class teacher assignments
  const _hasClassTeacherAssignments = useMemo(() => {
    if (!currentTeacher) return false;
    return classes.some((c: any) => {
      const assignment = classTeacherAssignments.find((cta: any) => 
        String(cta.teacher_id) === String(currentTeacher.id) && 
        String(cta.class_id) === String(c.id) &&
        cta.academic_year === currentAcademicYear && 
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return !!assignment;
    });
  }, [currentTeacher, classes, classTeacherAssignments, currentAcademicYear, currentTerm]);

  // Only show classes where teacher is assigned as class teacher
  const classTeacherClasses = useMemo(() => {
    if (!currentTeacher) {
      return [];
    }
    
    return classes.filter((c: any) => {
      const assignment = classTeacherAssignments.find((cta: any) => 
        String(cta.teacher_id) === String(currentTeacher.id) && 
        String(cta.class_id) === String(c.id) &&
        cta.academic_year === currentAcademicYear && 
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return !!assignment;
    });
  }, [currentTeacher, classes, classTeacherAssignments, currentAcademicYear, currentTerm]);

  // Get students in selected class
  const classStudents = useMemo(() => {
    if (!effectiveSelectedClassId) return [];
    const filtered = students
      .filter(s => {
        const isSameClass = String(s.class_id) === String(effectiveSelectedClassId);
        const status = String((s as any)?.status ?? '').trim().toLowerCase();
        const isActive = status === '' || status === 'active';
        return isSameClass && isActive;
      });
    const byId = new Map<number, any>();
    for (const s of filtered) {
      const idNum = Number((s as any)?.id);
      if (Number.isFinite(idNum)) {
        byId.set(idNum, s);
      }
    }
    return Array.from(byId.values()).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [effectiveSelectedClassId, students]);

  // Check if generate results should be enabled
  const canGenerateResults = useMemo(() => {
    if (!selectedClassId || !currentTeacher || isGenerating || resultsGenerated) {
      return false;
    }
    
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = currentTerm ? (attendanceRequirements[currentTerm] || 0) : 0;
    
    // Check if attendance requirements are set
    if (requiredDays === 0) {
      return false;
    }
    
    // Check if there are students in the class
    if (classStudents.length === 0) {
      return false;
    }
    
    return true;
  }, [selectedClassId, currentTeacher, isGenerating, resultsGenerated, classStudents.length, currentTerm]);

  // Get all registered subjects for the class (these are the subjects that should appear in results)
  const classSubjects = useMemo(() => {
    if (!effectiveSelectedClassId) return [];
    
    // Get subject assignments directly for this class, term, and academic year
    const subjectAssignmentsForClass = subjectAssignments.filter(
      sa => String(sa.class_id) === String(effectiveSelectedClassId) &&
            sa.term === currentTerm &&
            sa.academic_year === currentAcademicYear &&
            sa.status === 'Active'
    );
    
    // Map assignments to subject objects with proper names
    const mappedSubjects = subjectAssignmentsForClass.map(assignment => {
      return {
        id: assignment.id, // Use assignment ID for score matching
        subject_id: assignment.subject_id,
        name: assignment.subject_name || 'Unknown Subject',
        subject_code: '', // Not available in SubjectAssignment interface
        category: '', // Not available in SubjectAssignment interface
        teacher_name: assignment.teacher_name || '',
        class_name: assignment.class_name || ''
      };
    });

    // De-dupe subjects by subject_id for correct subject count display.
    // If the backend has duplicate subject assignments for the same subject in the same class/session,
    // we should still treat it as ONE subject for compilation completeness.
    const bySubjectId = new Map<string, any>();
    for (const s of mappedSubjects) {
      const key = String((s as any)?.subject_id ?? (s as any)?.id);
      if (!bySubjectId.has(key)) {
        bySubjectId.set(key, s);
      }
    }

    return Array.from(bySubjectId.values());
  }, [effectiveSelectedClassId, subjectAssignments, currentTerm, currentAcademicYear]);

  // Build a stable mapping of assignment_id -> subject_id for this class/session.
  // This lets us count completed subjects by unique subject_id even if there are duplicate score rows.
  const assignmentIdToSubjectId = useMemo(() => {
    if (!effectiveSelectedClassId) return new Map<number, string>();
    const rows = subjectAssignments.filter(
      sa => String(sa.class_id) === String(effectiveSelectedClassId) &&
            sa.term === currentTerm &&
            sa.academic_year === currentAcademicYear &&
            sa.status === 'Active'
    );
    const m = new Map<number, string>();
    for (const sa of rows) {
      const idNum = Number((sa as any)?.id);
      if (Number.isFinite(idNum)) {
        m.set(idNum, String((sa as any)?.subject_id ?? ''));
      }
    }
    return m;
  }, [effectiveSelectedClassId, subjectAssignments, currentTerm, currentAcademicYear]);

  const classAssignmentIdSet = useMemo(() => {
    return new Set<number>(Array.from(assignmentIdToSubjectId.keys()));
  }, [assignmentIdToSubjectId]);

  const classSubjectIdSet = useMemo(() => {
    return new Set<string>(Array.from(assignmentIdToSubjectId.values()).filter(Boolean));
  }, [assignmentIdToSubjectId]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return classStudents.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, classStudents]);

  // Calculate attendance data for selected student
  const studentAttendance = useMemo(() => {
    if (!selectedStudent || !selectedClassId) return null;
    
    // Get attendance data from attendances table (not compiled results)
    const attendance = Array.isArray(attendances) ? attendances.find((a: any) => 
      a.student_id === selectedStudent.id && 
      String(a.class_id) === String(selectedClassId) &&
      a.term === currentTerm &&
      a.academic_year === currentAcademicYear
    ) : undefined;
    
    if (attendance) {
      const attendanceRequirements = getAttendanceRequirements();
      const requiredDaysFromSettings = currentTerm ? (attendanceRequirements[currentTerm] || 0) : 0;
      const parsed = parseAttendanceFromRemarks((attendance as any)?.remarks);
      const attendedDays = parsed.attendedDays;
      const requiredDays = requiredDaysFromSettings || parsed.requiredDays || 0;
      
      return {
        requiredDays,
        attendedDays,
        attendanceRate: requiredDays > 0 ? (attendedDays / requiredDays) * 100 : 0,
        ratio: `${attendedDays}/${requiredDays}`,
        timesAbsent: requiredDays - attendedDays,
      };
    }
    
    // Fallback if no attendance found
    const attendanceRequirements = getAttendanceRequirements();
    const requiredDays = currentTerm ? (attendanceRequirements[currentTerm] || 0) : 0;
    
    return {
      requiredDays,
      attendedDays: 0,
      attendanceRate: 0,
      ratio: `0/${requiredDays}`,
      timesAbsent: requiredDays,
    };
  }, [selectedStudent, selectedClassId, currentTerm, currentAcademicYear, attendances, getAttendanceRequirements]);

  // Reset affective and psychomotor data when student changes
  useEffect(() => {
    if (selectedStudent && selectedClassId) {
      // Load existing affective data
      const existingAffective = Array.isArray(affectiveDomains) ? affectiveDomains.find(
        ad => ad.student_id === selectedStudent.id && 
             String(ad.class_id) === String(selectedClassId) &&
             ad.term === currentTerm &&
             ad.academic_year === currentAcademicYear
      ) : null;
      
      if (existingAffective) {
        setAffectiveData({
          attentiveness: existingAffective.attentiveness || 3,
          attentiveness_remark: existingAffective.attentiveness_remark || '',
          honesty: existingAffective.honesty || 3,
          honesty_remark: existingAffective.honesty_remark || '',
          neatness: existingAffective.neatness || 3,
          neatness_remark: existingAffective.neatness_remark || '',
          obedience: existingAffective.obedience || 3,
          obedience_remark: existingAffective.obedience_remark || '',
          sense_of_responsibility: existingAffective.sense_of_responsibility || 3,
          sense_of_responsibility_remark: existingAffective.sense_of_responsibility_remark || ''
        });
      } else {
        // Reset to defaults
        setAffectiveData({
          attentiveness: 3,
          attentiveness_remark: '',
          honesty: 3,
          honesty_remark: '',
          neatness: 3,
          neatness_remark: '',
          obedience: 3,
          obedience_remark: '',
          sense_of_responsibility: 3,
          sense_of_responsibility_remark: ''
        });
      }
      
      // Load existing psychomotor data
      const existingPsychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(
        pd => pd.student_id === selectedStudent.id && 
             String(pd.class_id) === String(selectedClassId) &&
             pd.term === currentTerm &&
             pd.academic_year === currentAcademicYear
      ) : null;
      
      if (existingPsychomotor) {
        setPsychomotorData({
          attention_to_direction: existingPsychomotor.attention_to_direction || 3,
          attention_to_direction_remark: existingPsychomotor.attention_to_direction_remark || '',
          considerate_of_others: existingPsychomotor.considerate_of_others || 3,
          considerate_of_others_remark: existingPsychomotor.considerate_of_others_remark || '',
          handwriting: existingPsychomotor.handwriting || 3,
          handwriting_remark: existingPsychomotor.handwriting_remark || '',
          sports: existingPsychomotor.sports || 3,
          sports_remark: existingPsychomotor.sports_remark || '',
          verbal_fluency: existingPsychomotor.verbal_fluency || 3,
          verbal_fluency_remark: existingPsychomotor.verbal_fluency_remark || '',
          works_well_independently: existingPsychomotor.works_well_independently || 3,
          works_well_independently_remark: existingPsychomotor.works_well_independently_remark || ''
        });
      } else {
        // Reset to defaults
        setPsychomotorData({
          attention_to_direction: 3,
          attention_to_direction_remark: '',
          considerate_of_others: 3,
          considerate_of_others_remark: '',
          handwriting: 3,
          handwriting_remark: '',
          sports: 3,
          sports_remark: '',
          verbal_fluency: 3,
          verbal_fluency_remark: '',
          works_well_independently: 3,
          works_well_independently_remark: ''
        });
      }
      
      // Load existing attendance data from compiled result
      const existingResult = Array.isArray(compiledResults) ? compiledResults.find(cr => 
        cr.student_id === selectedStudent.id &&
        cr.class_id === Number(selectedClassId) &&
        cr.term === currentTerm &&
        cr.academic_year === currentAcademicYear
      ) : null;
      
      if (existingResult) {
        // Load existing class teacher comment but always validate it's correct for current average
        if (existingResult.class_teacher_comment) {
          // Always generate the expected comment for current average
          const expectedComment = generateAutoComment(
            existingResult.average_score || 0
          );
          
          // Only use existing comment if it's not generic and matches expected
          if (existingResult.class_teacher_comment !== 'Submitted successfully' && 
              !existingResult.class_teacher_comment.includes('fake') &&
              !existingResult.class_teacher_comment.includes('undefined') &&
              existingResult.class_teacher_comment === expectedComment) {
            setCustomComment(existingResult.class_teacher_comment);
          } else {
            setCustomComment(expectedComment);
          }
        } else {
          // Reset comment when no existing result
          setCustomComment("");
        }
      } else {
        // Reset comment when no existing result
        setCustomComment("");
      }
    }
  }, [selectedStudent?.id, selectedClassId, affectiveDomains, psychomotorDomains, compiledResults, currentTerm, currentAcademicYear]);

  // Calculate all students' completion status and positions
  const studentsCompletion = useMemo(() => {
    if (!classStudents.length) {
      return [];
    }

    const attendanceRequirements = getAttendanceRequirements();
    const requiredDaysFromSettings = currentTerm ? (attendanceRequirements[currentTerm] || 0) : 0;
    const safeAttendances = Array.isArray(attendances) ? attendances : [];

    const getAttendanceInfoForStudent = (studentId: number) => {
      if (!effectiveSelectedClassId || !currentTerm || !currentAcademicYear) {
        return { attendedDays: 0, requiredDays: 0 };
      }
      const attendanceRow = safeAttendances.find((a: any) =>
        String((a as any)?.student_id) === String(studentId) &&
        String((a as any)?.class_id) === String(effectiveSelectedClassId) &&
        String((a as any)?.term) === String(currentTerm) &&
        String((a as any)?.academic_year) === String(currentAcademicYear)
      );

      if (attendanceRow) {
        const parsed = parseAttendanceFromRemarks((attendanceRow as any)?.remarks);
        const attendedDays = parsed.attendedDays;
        const requiredDays = requiredDaysFromSettings || parsed.requiredDays || 0;
        return { attendedDays, requiredDays };
      }

      return { attendedDays: 0, requiredDays: requiredDaysFromSettings || 0 };
    };

    
    const studentsData = classStudents.map(student => {
      // Get all scores for this student
      const studentScores = scores.filter(s => String((s as any)?.student_id) === String(student.id));
      
      // Filter for relevant scores that match current class subjects
      // This prevents mixing scores from other classes
      const relevantScoresRaw = studentScores.filter(s =>
        (s.status === 'Submitted' || s.status === 'Approved' || s.status === 'Draft') &&
        s.term === currentTerm &&
        s.academic_year === currentAcademicYear &&
        classAssignmentIdSet.has(Number((s as any)?.subject_assignment_id))
      );

      // Collapse potential duplicate assignment rows into 1 score per subject_id.
      // If duplicates exist, prefer a Submitted score; otherwise Draft; tie-breaker by highest total.
      const bySubject = new Map<string, any>();
      for (const sc of relevantScoresRaw) {
        const subId = assignmentIdToSubjectId.get(Number((sc as any)?.subject_assignment_id));
        if (!subId) continue;
        const key = String(subId);
        const prev = bySubject.get(key);
        if (!prev) {
          bySubject.set(key, sc);
          continue;
        }
        const prevStatus = String((prev as any)?.status || '');
        const nextStatus = String((sc as any)?.status || '');
        const prevIsSubmitted = prevStatus === 'Submitted';
        const nextIsSubmitted = nextStatus === 'Submitted';
        if (nextIsSubmitted && !prevIsSubmitted) {
          bySubject.set(key, sc);
          continue;
        }
        if (nextIsSubmitted === prevIsSubmitted) {
          const prevTotal = Number((prev as any)?.total) || 0;
          const nextTotal = Number((sc as any)?.total) || 0;
          if (nextTotal > prevTotal) {
            bySubject.set(key, sc);
          }
        }
      }
      const relevantScores = Array.from(bySubject.values());
      
      const affective = Array.isArray(affectiveDomains) ? affectiveDomains.find(a => 
        a.student_id === student.id &&
        String(a.class_id) === String(selectedClassId) &&
        a.term === currentTerm &&
        a.academic_year === currentAcademicYear
      ) : undefined;

      const psychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(p => 
        p.student_id === student.id &&
        String(p.class_id) === String(selectedClassId) &&
        p.term === currentTerm &&
        p.academic_year === currentAcademicYear
      ) : undefined;

      const existingResult = Array.isArray(compiledResults) ? compiledResults.find(r =>
        r.student_id === student.id &&
        r.class_id === Number(selectedClassId) &&
        r.term === currentTerm &&
        r.academic_year === currentAcademicYear
      ) : undefined;

      // Count completed subjects by UNIQUE subject_id.
      const submittedSubjectIds = new Set<string>();
      for (const rs of relevantScores) {
        const st = String((rs as any)?.status);
        if (st !== 'Submitted' && st !== 'Approved') continue;
        const subId = assignmentIdToSubjectId.get(Number((rs as any)?.subject_assignment_id));
        if (subId) {
          submittedSubjectIds.add(String(subId));
        }
      }
      const completedSubjects = submittedSubjectIds.size;
      const totalSubjects = classSubjectIdSet.size;
      const hasAffective = affective !== undefined;
      const hasPsychomotor = psychomotor !== undefined;
      // Check attendance from compiled results (primary source) or attendance table (per student)
      const attendanceInfo = getAttendanceInfoForStudent(Number((student as any)?.id));
      const hasAttendance = (existingResult && Number((existingResult as any)?.times_present) > 0) ||
        (attendanceInfo.attendedDays > 0);
      const isSubmitted = existingResult?.status === 'Submitted' || existingResult?.status === 'Approved';
      const isRejected = existingResult?.status === 'Rejected';

      // Calculate total score from relevant scores
      const totalScore = relevantScores.reduce((sum, s) => {
        const scoreTotal = Number(s.total) || 0;
        return sum + scoreTotal;
      }, 0);
      
      // Debug: Show calculation for first student
      if (student.id === classStudents[0]?.id) {
        // Score debug processed
      }
      
      // Calculate average score from relevant scores
      const averageScore = relevantScores.length > 0 
        ? Math.round((totalScore / relevantScores.length) * 100) / 100 
        : 0;

      
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        completedSubjects,
        totalSubjects,
        hasAffective,
        hasPsychomotor,
        isSubmitted,
        isRejected,
        averageScore,
        totalScore,
        isComplete: isSubmitted || (completedSubjects === totalSubjects && hasAffective && hasPsychomotor && hasAttendance),
        studentScores: relevantScores
      };
    });

    // Calculate positions based on total scores - ALL students with submitted scores
    const studentsWithScores = studentsData
      .filter(student => student.totalScore > 0) // Include all students with scores
      .sort((a, b) => Number(b.totalScore) - Number(a.totalScore)); // Sort by highest total first

    // Assign positions to all students with scores
    let currentPosition = 1;
    const positionedStudents = studentsWithScores.map((student, index) => {
      if (index > 0 && Number(student.totalScore) < Number(studentsWithScores[index - 1].totalScore)) {
        currentPosition = index + 1;
      }
      const positionedStudent = {
        ...student,
        position: currentPosition,
        totalStudents: studentsData.length // Total students in class
      };
      return positionedStudent;
    });

    // For students without scores, assign position at the end
    const studentsWithoutScores = studentsData
      .filter(student => student.totalScore === 0)
      .map(student => ({
        ...student,
        position: studentsWithScores.length + 1,
        totalStudents: studentsData.length // Total students in class
      }));

    const finalResult = [...positionedStudents, ...studentsWithoutScores];
    
    return finalResult;
  }, [
    classStudents,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    effectiveSelectedClassId,
    selectedClassId,
    currentTerm,
    currentAcademicYear,
    resultsGenerated,
    classAssignmentIdSet,
    classSubjectIdSet,
    assignmentIdToSubjectId,
    attendances,
    getAttendanceRequirements,
  ]);

  // Calculate submit button state
  const eligibleForSubmission = (studentsCompletion || []).filter(s => s.isComplete && (!s.isSubmitted || s.isRejected));
  const allSubmitted = (studentsCompletion || []).filter(s => s.isComplete).every(s => s.isSubmitted && !s.isRejected);
  const submittedCount = (studentsCompletion || []).filter(s => s.isSubmitted && !s.isRejected).length;

  // Get student's result data
  const studentResultData = useMemo(() => {
    if (!selectedStudent) return null;
    
    // Get all scores for this student (less restrictive filtering)
    const studentScores = scores.filter(s => s.student_id === selectedStudent.id);
    
    // Filter for relevant scores that match current class subjects
    const relevantScoresRaw = studentScores.filter(s => 
      (s.status === 'Submitted' || s.status === 'Approved' || s.status === 'Draft') &&
      s.term === currentTerm &&
      s.academic_year === currentAcademicYear &&
      classAssignmentIdSet.has(Number((s as any)?.subject_assignment_id))
    );

    // Collapse potential duplicate assignment rows into 1 score per subject_id.
    const bySubject = new Map<string, any>();
    for (const sc of relevantScoresRaw) {
      const subId = assignmentIdToSubjectId.get(Number((sc as any)?.subject_assignment_id));
      if (!subId) continue;
      const key = String(subId);
      const prev = bySubject.get(key);
      if (!prev) {
        bySubject.set(key, sc);
        continue;
      }
      const prevStatus = String((prev as any)?.status || '');
      const nextStatus = String((sc as any)?.status || '');
      const prevIsSubmitted = prevStatus === 'Submitted';
      const nextIsSubmitted = nextStatus === 'Submitted';
      if (nextIsSubmitted && !prevIsSubmitted) {
        bySubject.set(key, sc);
        continue;
      }
      if (nextIsSubmitted === prevIsSubmitted) {
        const prevTotal = Number((prev as any)?.total) || 0;
        const nextTotal = Number((sc as any)?.total) || 0;
        if (nextTotal > prevTotal) {
          bySubject.set(key, sc);
        }
      }
    }

    const relevantScores = Array.from(bySubject.values());

    const affective = Array.isArray(affectiveDomains) ? affectiveDomains.find(a => 
      a.student_id === selectedStudent.id &&
      String(a.class_id) === String(selectedClassId) &&
      a.term === currentTerm &&
      a.academic_year === currentAcademicYear
    ) : undefined;

    const psychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(p => 
      p.student_id === selectedStudent.id &&
      String(p.class_id) === String(selectedClassId) &&
      p.term === currentTerm &&
      p.academic_year === currentAcademicYear
    ) : undefined;

    const existingResult = Array.isArray(compiledResults) ? compiledResults.find(
      cr => cr.student_id === selectedStudent.id &&
           String(cr.class_id) === String(selectedClassId) &&
           cr.term === currentTerm &&
           cr.academic_year === currentAcademicYear
    ) : undefined;

    const isSubmitted = existingResult?.status === 'Submitted' || existingResult?.status === 'Approved';
    const isRejected = existingResult?.status === 'Rejected';

    // Debug logging
    // Student result debug processed

    // Calculate totals using same logic as studentsCompletion
    const totalScoreRaw = relevantScores.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const totalScore = totalScoreRaw > 0 ? parseFloat(totalScoreRaw.toPrecision(3)) : 0;
    const averageScore = relevantScores.length > 0 
      ? Math.round((totalScore / relevantScores.length) * 100) / 100 
      : 0;

    // Get student's position from studentsCompletion (now calculated by total score)
    const studentCompletionData = studentsCompletion.find(s => s.studentId === selectedStudent.id);
    const position = studentCompletionData?.position || 0;
    const totalStudents = studentCompletionData?.totalStudents || 0;

    // Check completion - use individual student validation
    const completedSubjectIds = new Set<string>();
    for (const rs of relevantScores) {
      const st = String((rs as any)?.status);
      if (st !== 'Submitted' && st !== 'Approved') continue;
      const subId = assignmentIdToSubjectId.get(Number((rs as any)?.subject_assignment_id));
      if (subId) {
        completedSubjectIds.add(String(subId));
      }
    }

    const isComplete = 
      completedSubjectIds.size === classSubjectIdSet.size &&
      affective !== undefined &&
      psychomotor !== undefined &&
      (
        (studentAttendance && studentAttendance.attendedDays > 0) || 
        (existingResult && existingResult.times_present > 0)
      ); // Add attendance requirement

    // Debug logging
    // Individual student validation processed

    return {
      student: selectedStudent,
      scores: relevantScores, // Use relevant scores
      affective: affective,
      psychomotor: psychomotor,
      studentAttendance: studentAttendance,
      totalScore,
      averageScore,
      position,
      totalStudents,
      subjectsCompleted: completedSubjectIds.size,
      totalSubjects: classSubjectIdSet.size,
      isComplete,
      existingResult,
      isSubmitted,
      isRejected
    };
  }, [selectedStudent, scores, classSubjects, affectiveDomains, psychomotorDomains, compiledResults, selectedClassId, currentTerm, currentAcademicYear, studentsCompletion, resultsGenerated]);

  // Validation variables for submit button
  const hasAllScores = (studentResultData?.scores?.length ?? 0) > 0;
  const hasAffective = !!studentResultData?.affective;
  const hasPsychomotor = !!studentResultData?.psychomotor;
  const hasAttendance = studentAttendance && studentAttendance.attendedDays > 0;
  const canSubmit = hasAllScores && hasAffective && hasPsychomotor && hasAttendance && !studentResultData?.isSubmitted && studentResultData?.existingResult?.status !== 'Approved';

  // Calculate class statistics
  const _classStatistics = useMemo(() => {
    const validStudents = studentsCompletion.filter(s => s.averageScore > 0);
    const scores = validStudents.map(s => s.averageScore);
    
    if (scores.length === 0) {
      return {
        classAverage: 0,
        highestScore: 0,
        lowestScore: 0,
        totalStudents: 0
      };
    }

    return {
      classAverage: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      totalStudents: validStudents.length
    };
  }, [studentsCompletion]);

  // Submit result for selected student (extracted to hook)
  const { handleSubmitResult } = useSubmitResult({
    selectedStudent,
    currentTeacher: currentTeacher ?? null,
    effectiveSelectedClassId,
    currentTerm,
    currentAcademicYear,
    compiledResults,
    scores,
    subjectRegistrations,
    assignmentIdToSubjectId,
    classSubjectIdSet,
    affectiveDomains,
    psychomotorDomains,
    getAttendanceRequirements,
    getAttendanceByStudent,
    subjectAssignments,
    subjects,
    studentsCompletion,
    classStudents,
    customComment,
    currentUser,
    loadCompiledResultsFromAPI,
    getTermDates,
    setIsSubmitting,
    setCustomComment,
    setSelectedStudentId,
  });

  const handleSubmitAllResults = async () => {
    if (!effectiveSelectedClassId || !currentTeacher) {
      toast.error("Please select a class");
      return;
    }

    const term = currentTerm;
    const academicYear = currentAcademicYear;

    if (!term || !academicYear) {
      toast.error('Current term or academic session is not set. Please contact the admin to set it in System Settings.');
      return;
    }

    // Check if current teacher is the class teacher for this class
    const selectedClass = Array.isArray(classes) ? classes.find(c => c.id === Number(effectiveSelectedClassId)) : undefined;
    if (!selectedClass || selectedClass.classTeacherId !== currentTeacher.id) {
      toast.error("Only the class teacher can compile results for this class");
      return;
    }

    // Check if there are any results to submit (only non-submitted or rejected ones)
    const eligibleResults = (studentsCompletion || []).filter(s => s.isComplete && (!s.isSubmitted || s.isRejected));
    if (eligibleResults.length === 0) {
      toast.info("All eligible results have already been submitted");
      return;
    }

    try {
      toast.info("Saving attendance, psychomotor, and affectives data...");
      
      // Save attendance, psychomotor, and affectives data for all students first
      for (const studentComp of studentsCompletion || []) {
        if (!studentComp.isComplete) continue;
        
        const student = classStudents.find(s => s.id === studentComp.studentId);
        if (!student) continue;

        // Get existing result for this student
        const _existingResult = Array.isArray(compiledResults) ? compiledResults.find(cr => 
          cr.student_id === student.id &&
          cr.class_id === Number(effectiveSelectedClassId) &&
          cr.term === term &&
          cr.academic_year === academicYear
        ) : undefined;

        const bulkAttendanceRows = getAttendanceByStudent(student.id, academicYear, term);
        const bulkRelevantAttendance = Array.isArray(bulkAttendanceRows)
          ? bulkAttendanceRows.filter(a => String(a.class_id) === String(effectiveSelectedClassId))
          : [];

        const attendedDaysForBulk = bulkRelevantAttendance.reduce((max, row) => {
          const parsed = parseAttendedDaysFromRemarks((row as any)?.remarks);
          return parsed > max ? parsed : max;
        }, 0);

        // Save attendance data to attendance table
        const bulkRequiredDays = getAttendanceRequirements()[term] || 0;
        const attendancePayload = {
          student_id: student.id,
          class_id: Number(effectiveSelectedClassId),
          term,
          academic_year: academicYear,
          date: new Date().toISOString().split('T')[0], // Current date
          status: 'Present' as const,
          marked_by: currentUser?.id || 1,
          marked_date: new Date().toISOString(),
          remarks: `Attended ${attendedDaysForBulk || 0} out of ${bulkRequiredDays} days`
        };
        
        const existingAttendance = Array.isArray(attendances) ? attendances.find(a => 
          a.student_id === student.id &&
          a.class_id === Number(effectiveSelectedClassId) &&
          a.term === term &&
          a.academic_year === academicYear
        ) : undefined;
        
        if (existingAttendance) {
          await updateAttendance(existingAttendance.id, attendancePayload);
        } else {
          await addAttendance(attendancePayload);
        }

        // Save affective data if it has been modified
        const affectivePayload = {
          student_id: student.id,
          class_id: Number(effectiveSelectedClassId),
          term,
          academic_year: academicYear,
          ...affectiveData,
          entered_by: currentUser?.id
        };
        
        const existingAffective = Array.isArray(affectiveDomains) ? affectiveDomains.find(a => 
          a.student_id === student.id &&
          a.class_id === Number(effectiveSelectedClassId) &&
          a.term === term &&
          a.academic_year === academicYear
        ) : undefined;
        
        if (existingAffective) {
          await updateAffectiveDomain(existingAffective.id, affectivePayload);
        } else {
          await createAffectiveDomain(affectivePayload);
        }

        // Save psychomotor data if it has been modified
        const psychomotorPayload = {
          student_id: student.id,
          class_id: Number(effectiveSelectedClassId),
          term: currentTerm,
          academic_year: currentAcademicYear,
          ...psychomotorData,
          entered_by: currentUser?.id
        };
        
        const existingPsychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(p => 
          p.student_id === student.id &&
          p.class_id === Number(effectiveSelectedClassId) &&
          p.term === currentTerm &&
          p.academic_year === currentAcademicYear
        ) : undefined;
        
        if (existingPsychomotor) {
          await updatePsychomotorDomain(existingPsychomotor.id, psychomotorPayload);
        } else {
          await createPsychomotorDomain(psychomotorPayload);
        }
      }

      // Refresh data to get the latest saved records
      await loadAffectiveDomainsFromAPI();
      await loadPsychomotorDomainsFromAPI();
      await loadAttendancesFromAPI(); // Refresh attendance data
      
      toast.success("All data saved successfully!");
      
      // Now proceed with generating and submitting results
      let submittedCount = 0;

      const bulkCompiledRows: any[] = [];
      
      for (const studentComp of studentsCompletion || []) {
        if (!studentComp.isComplete) continue;
        
        const student = classStudents.find(s => s.id === studentComp.studentId);
        if (!student) continue;

        // Get existing result for this student
        const _existingResult = Array.isArray(compiledResults) ? compiledResults.find(cr => 
          cr.student_id === student.id &&
          cr.class_id === Number(effectiveSelectedClassId) &&
          cr.term === currentTerm &&
          cr.academic_year === currentAcademicYear
        ) : undefined;

        const studentScores = scores.filter(s => {
          if (s.student_id !== student.id) return false;
          if (s.term !== term) return false;
          if (s.academic_year !== academicYear) return false;
          return classSubjects.some((cs: any) => cs && Number(cs.id) === Number(s.subject_assignment_id));
        });

        // Get the freshly saved affective and psychomotor data
        const affective = Array.isArray(affectiveDomains) ? affectiveDomains.find(a => 
          a.student_id === student.id &&
          a.class_id === Number(effectiveSelectedClassId) &&
          a.term === term &&
          a.academic_year === academicYear
        ) : undefined;

        const psychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(p => 
          p.student_id === student.id &&
          p.class_id === Number(effectiveSelectedClassId) &&
          p.term === term &&
          p.academic_year === academicYear
        ) : undefined;

        const totalScore = studentScores.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const averageScore = Math.round((totalScore / (studentScores || []).length) * 100) / 100;

        // Calculate class average - ONLY include students with complete submissions
        const allAverages = studentsCompletion
          .filter(s => s.isComplete && s.averageScore > 0)
          .map(s => s.averageScore);
        const classAverage = Math.round(((allAverages || []).reduce((sum, a) => sum + a, 0) / (allAverages || []).length) * 100) / 100;

        // Calculate position
        const sortedStudents = [...allAverages].sort((a, b) => b - a);
        const position = sortedStudents.indexOf(averageScore) + 1;

        let _autoComment = '';
        if (averageScore >= 90) {
          _autoComment = 'Excellent';


        } else if (averageScore >= 80) {
          _autoComment = 'A very good result';
        } else if (averageScore >= 70) {
          _autoComment = 'Good result';
        } else if (averageScore >= 60) {
          _autoComment = 'A satisfaction result';
        } else if (averageScore >= 50) {
          _autoComment = 'A fair result';
        } else {
          _autoComment = 'Fail';
        }

        const submitAttendanceRows = getAttendanceByStudent(student.id, academicYear, term);
        const submitRelevantAttendance = Array.isArray(submitAttendanceRows)
          ? submitAttendanceRows.filter(a => String(a.class_id) === String(effectiveSelectedClassId))
          : [];

        const attendedDaysForSubmit = submitRelevantAttendance.reduce((max, row) => {
          const parsed = parseAttendedDaysFromRemarks((row as any)?.remarks);
          return parsed > max ? parsed : max;
        }, 0);

        const compiledData = {
          student_id: student.id,
          class_id: Number(effectiveSelectedClassId),
          term,
          academic_year: academicYear,
          scores: studentScores,
          affective: affective || null,
          psychomotor: psychomotor || null,
          total_score: totalScore,
          average_score: averageScore,
          class_average: classAverage,
          position: position,
          total_students: classStudents.length,
          times_present: attendedDaysForSubmit,
          times_absent: 0, // Will be calculated as required - present
          total_attendance_days: getAttendanceRequirements()[term] || 0,
          term_begin: getTermDates().termStartDate || '',
          term_end: getTermDates().termEndDate || '',
          next_term_begin: getTermDates().nextTermStarts || '',
          class_teacher_name: currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : 'System Administrator',
          class_teacher_comment: generateAutoComment(averageScore),
          principal_name: 'Dr. Ibrahim Musa',
          principal_comment: '',
          principal_signature: '',
          compiled_by: currentUser?.id || 0,
          compiled_date: new Date().toISOString(),
          status: 'Submitted' as const,
          approved_by: null,
          approved_date: null,
          rejection_reason: null,
          print_approved: 0
        };

        bulkCompiledRows.push(compiledData);
        submittedCount++;
      }

      if (bulkCompiledRows.length === 0) {
        toast.info('No eligible results to submit');
        return;
      }

      // Submit all compiled rows in a single backend request
      await api.post(API_CONFIG.ENDPOINTS.RESULTS.COMPILE, {
        class_id: Number(effectiveSelectedClassId),
        term,
        academic_year: academicYear,
        student_results: bulkCompiledRows
      });

      await loadCompiledResultsFromAPI(null);
      await loadScoresFromAPI();

      // Notify admin
      toast.success(`Successfully submitted ${submittedCount} results for approval`);
      toast.success(`${submittedCount} results submitted to admin for approval!`);
      
    } catch (error) {
      toast.error('Failed to submit results. Please try again.', { id: "submit-all-results" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] p-4 space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E40AF] mb-1 flex items-center gap-2">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#1E40AF]" />
            Compile Results
          </h1>
          <p className="text-[#64748B] text-sm sm:font-medium">
            {selectedStudentId 
              ? "Review and compile student result" 
              : "Select a class to view students and compile their results"}
          </p>
          {lastRefresh && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            className="flex items-center gap-2 border-[#1E40AF]/30 text-[#1E40AF] hover:bg-[#1E40AF]/10 rounded-xl transition-all text-sm px-3 py-2"
          >
            <Calculator className="w-4 h-4" />
            Refresh Data
          </Button>
          <Button
            onClick={handleGenerateResults}
            disabled={!canGenerateResults}
            title={
              !selectedClassId ? "Please select a class" :
              !currentTeacher ? "Teacher not assigned" :
              resultsGenerated ? "Results already generated" :
              isGenerating ? "Generating results..." :
              "Generate class results"
            }
            className={`${
              resultsGenerated 
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
                : canGenerateResults
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {resultsGenerated ? 'Results Generated' : 'Generate Results'}
              </>
            )}
          </Button>
          {selectedStudentId && (
            <>
              {!canSubmit && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
                  <div className="font-medium mb-1">Cannot submit result - Missing requirements:</div>
                  <div className="space-y-1">
                    {!hasAllScores && (
                      <div>• Subject scores: Student must have scores for all assigned subjects</div>
                    )}
                    {!hasAffective && (
                      <div>• Affective domains: Must be assessed in Student Domains page</div>
                    )}
                    {!hasPsychomotor && (
                      <div>• Psychomotor domains: Must be assessed in Student Domains page</div>
                    )}
                    {!hasAttendance && (
                      <div>• Attendance data: Must be marked in Mark Attendance page</div>
                    )}
                    {studentResultData?.isSubmitted && (
                      <div>• Result already submitted: Wait for admin approval or resubmit if rejected</div>
                    )}
                    {studentResultData?.existingResult?.status === 'Approved' && (
                      <div>• Result already approved: Cannot modify approved results</div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Complete all missing items before submitting for approval.
                  </div>
                </div>
              )}
              <Button
                onClick={handleSubmitResult}
                disabled={isSubmitting || !canSubmit}
                className="bg-[#10B981] hover:bg-[#059669] active:bg-[#047857] text-white rounded-lg px-4 h-8 text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg active:shadow-xl flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canSubmit ? (studentResultData?.existingResult?.status === 'Approved' ? 'This result has been approved and cannot be modified' : 'Complete all requirements (scores, attendance, affective & psychomotor domains) before submitting') : ''}
              >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Submit
                </>
              )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Class Selection - Compact */}
      <ClassSelectionCard
        selectedStudentId={selectedStudentId}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        classTeacherClasses={classTeacherClasses}
        currentTerm={currentTerm}
        currentAcademicYear={currentAcademicYear}
        classSubjectIdSet={classSubjectIdSet}
      />

      {/* Student List - Compact */}
      <StudentListCard
        selectedClassId={selectedClassId}
        classStudents={classStudents}
        studentsCompletion={studentsCompletion}
        resultsGenerated={resultsGenerated}
        allSubmitted={allSubmitted}
        submittedCount={submittedCount}
        eligibleForSubmission={eligibleForSubmission}
        onSelectStudent={setSelectedStudentId}
        onSubmitAll={handleSubmitAllResults}
      />

      {/* Selected Student Detail View */}
      {selectedStudentId && selectedStudent && studentResultData && (
        <div className="space-y-4">
          {/* Back Button */}
          <Button
            onClick={() => {
              setSelectedStudentId(null);
              setCustomComment("");
            }}
            variant="outline"
            className="flex items-center gap-2 border-[#1E40AF]/30 text-[#1E40AF] hover:bg-[#1E40AF]/10 rounded-xl transition-all px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Button>

          {/* Student Info Card */}
          <Card className="border-[#0A2540]/10 shadow-lg">
            <CardHeader className="border-b border-[#0A2540]/10 bg-gradient-to-r from-[#0A2540]/5 to-[#1E40AF]/5">
              <CardTitle className="flex items-center gap-4 text-lg font-bold text-[#0A2540]">
                <Avatar className="w-12 h-12 border-2 border-[#1E40AF] shadow-lg">
                  {selectedStudent.photo_url ? (
                    <img 
                      src={getStudentPhotoCandidates(selectedStudent)[0] || ''} 
                      alt={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                      className="w-full h-full object-cover rounded-full"
                      data-candidate-idx={0}
                      onError={(e) => {
                        handleStudentPhotoError(e, selectedStudent);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <AvatarFallback className="bg-[#1E40AF] text-white font-bold text-lg">
                      {selectedStudent.firstName.charAt(0)}{selectedStudent.lastName.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-lg font-bold text-[#0A2540]">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                  <p className="text-sm text-[#64748B] font-mono font-medium">{selectedStudent.admissionNumber}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-xs font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Class</p>
                  <p className="text-[#0A2540] font-bold text-sm">{selectedStudent.className}</p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-xs font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Gender</p>
                  <p className="text-[#0A2540] font-bold text-sm">{selectedStudent.gender}</p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-xs font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Term</p>
                  <p className="text-[#0A2540] font-bold text-sm">{currentTerm}</p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-xs font-semibold text-[#64748B] mb-1 uppercase tracking-wider">Year</p>
                  <p className="text-[#0A2540] font-bold text-sm">{currentAcademicYear}</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Subjects</p>
                  <p className="text-base sm:text-lg text-blue-900 font-bold">
                    {studentResultData.subjectsCompleted}/{studentResultData.totalSubjects}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <p className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-base sm:text-lg text-purple-900 font-bold">{studentResultData.totalScore}</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                  <p className="text-xs font-bold text-green-900 uppercase tracking-wider mb-1">Average</p>
                  <p className="text-base sm:text-lg text-green-900 font-bold">{studentResultData.averageScore}%</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                  <p className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-1">Position</p>
                  <p className="text-base sm:text-lg text-orange-900 font-bold">
                    {studentResultData.position > 0 ? `${studentResultData.position}/${studentResultData.totalStudents}` : 'N/A'}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                  <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Attendance</p>
                  <p className="text-base sm:text-lg text-indigo-900 font-bold">
                    {studentAttendance?.ratio || '0/0'}
                  </p>
                  <p className="text-xs sm:text-sm text-indigo-700 font-semibold">
                    {studentAttendance?.attendanceRate.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rejection Notice */}
          {studentResultData?.isRejected && (
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Result Rejected</h3>
                    <p className="text-xs text-red-700 mb-2">
                      This result was rejected by the administrator. Please review and make necessary corrections before resubmitting.
                    </p>
                    {studentResultData?.existingResult?.rejection_reason && (
                      <div className="bg-red-100 border border-red-200 rounded p-2">
                        <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
                        <p className="text-xs text-red-700">{studentResultData.existingResult.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subject Scores */}
          <SubjectScoresCard
            classSubjects={classSubjects}
            scores={studentResultData?.scores || []}
            assignmentIdToSubjectId={assignmentIdToSubjectId}
          />

          {/* Attendance Display - Read Only */}
          <AttendanceDisplayCard
            studentAttendance={studentAttendance}
            isSubmitted={!!studentResultData?.isSubmitted}
            isRejected={!!studentResultData?.isRejected}
          />

          
          {/* Affective & Psychomotor Display - Read Only */}
          <DomainDisplay
            affectiveData={affectiveData}
            psychomotorData={psychomotorData}
          />

          {/* Class Teacher Comment - Compact */}
          <Card className="border-[#0A2540]/10 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white px-4 py-3 rounded-t-xl">
              <CardTitle className="text-base">Class Teacher Comment</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Automatic Comment Header - Only show if no existing result */}
              {!studentResultData?.existingResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    <Sparkles className="w-4 h-4 mr-1 inline" />
                    Automatic Comment Generated
                  </p>
                  <p className="text-xs text-blue-700">
                    Based on student's average score. You can add a custom comment below to override.
                  </p>
                </div>
              )}

              {/* Auto-comment preview - Only show if no existing result */}
              {selectedStudent && studentResultData && !studentResultData.existingResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 mb-1">Auto-generated Comment:</p>
                  <p className="text-xs text-green-700">
                    {generateAutoComment(
                      studentResultData.averageScore
                    )}
                  </p>
                </div>
              )}

              {/* Automatic Class Teacher Comment */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Class Teacher Comment (Automatically Generated)
                </Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    {selectedStudent && studentResultData && generateAutoComment(
                      studentResultData.averageScore
                    )}
                  </p>
                </div>
                {studentResultData?.isSubmitted && !studentResultData?.isRejected && (
                  <p className="text-xs text-gray-600 mt-1">
                    This result has been submitted and cannot be edited.
                  </p>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Position and performance summary - Compact */}
          {selectedStudent && (
            <div className="mb-4">
              {/* Status Indicator */}
              {studentResultData?.existingResult && (
                <Alert className={`mb-4 ${
                  studentResultData.existingResult.status === 'Rejected' 
                    ? 'bg-red-50 border-red-200' 
                    : studentResultData.existingResult.status === 'Approved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  {studentResultData.existingResult.status === 'Rejected' && (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Result Rejected by Admin</strong>
                        {studentResultData.existingResult.rejection_reason && (
                          <p className="text-sm mt-1">Reason: {studentResultData.existingResult.rejection_reason}</p>
                        )}
                        <p className="text-sm mt-2">You can now edit and resubmit this result.</p>
                      </AlertDescription>
                    </>
                  )}
                  {studentResultData.existingResult.status === 'Approved' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Result Approved</strong> - This result has been approved and published.
                      </AlertDescription>
                    </>
                  )}
                  {studentResultData.existingResult.status === 'Submitted' && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Result Pending Approval</strong> - This result is waiting for admin approval.
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
