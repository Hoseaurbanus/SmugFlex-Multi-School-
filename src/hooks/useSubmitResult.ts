import { useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { API_CONFIG } from '../config/api';
import { generateAutoComment } from '../utils/commentGenerators';
import { parseAttendedDaysFromRemarks } from '../utils/commentGenerators';
import type { Student, Teacher, Score, SubjectAssignment, Subject, CompiledResult, AffectiveDomain, PsychomotorDomain, Attendance } from '../types/school';

interface UseSubmitResultParams {
  selectedStudent: Student | null;
  currentTeacher: Teacher | null;
  effectiveSelectedClassId: string | number | null;
  currentTerm: string | null;
  currentAcademicYear: string | null;
  compiledResults: CompiledResult[];
  scores: Score[];
  subjectRegistrations: Array<{ subject_id: number; class_id: number; term: string; academic_year: string; status: string }>;
  assignmentIdToSubjectId: Map<number, string | number>;
  classSubjectIdSet: Set<string | number>;
  affectiveDomains: AffectiveDomain[];
  psychomotorDomains: PsychomotorDomain[];
  getAttendanceRequirements: () => Record<string, number>;
  getAttendanceByStudent: (studentId: number, academicYear: string, term: string) => Attendance[];
  subjectAssignments: SubjectAssignment[];
  subjects: Subject[];
  studentsCompletion: Array<{
    studentId: number;
    position: number;
    totalStudents: number;
    isComplete: boolean;
    isSubmitted: boolean;
    isRejected: boolean;
    averageScore: number;
  }>;
  classStudents: Student[];
  customComment: string;
  currentUser: { id: number } | null;
  loadCompiledResultsFromAPI: (statusParam?: string | null, termParam?: string | null, academicYearParam?: string | null) => Promise<boolean>;
  getTermDates: () => { termStartDate: string; termEndDate: string; nextTermStarts: string };
  setIsSubmitting: (v: boolean) => void;
  setCustomComment: (v: string) => void;
  setSelectedStudentId: (v: number | null) => void;
}

export function useSubmitResult(params: UseSubmitResultParams) {
  const {
    selectedStudent, currentTeacher, effectiveSelectedClassId, currentTerm, currentAcademicYear,
    compiledResults, scores, subjectRegistrations, assignmentIdToSubjectId, classSubjectIdSet,
    affectiveDomains, psychomotorDomains, getAttendanceRequirements, getAttendanceByStudent,
    subjectAssignments, subjects, studentsCompletion, classStudents, customComment,
    currentUser, loadCompiledResultsFromAPI, getTermDates, setIsSubmitting, setCustomComment,
    setSelectedStudentId,
  } = params;

  const handleSubmitResult = useCallback(async () => {
    setIsSubmitting(true);
    try {
      toast.info("Submitting result... Please wait.", { id: "submit-result" });
      
      if (!selectedStudent || !currentTeacher || !effectiveSelectedClassId) {
        toast.error('Missing required data', { id: "submit-result" });
        return;
      }

      if (!currentTerm || !currentAcademicYear) {
        toast.error('Current term or academic session is not set. Please contact the admin to set it in System Settings.', { id: "submit-result" });
        return;
      }

      const existingApprovedResult = Array.isArray(compiledResults) ? compiledResults.find(cr => 
        cr.student_id === selectedStudent.id &&
        cr.class_id === Number(effectiveSelectedClassId) &&
        cr.term === currentTerm &&
        cr.academic_year === currentAcademicYear &&
        cr.status === 'Approved'
      ) : undefined;

      if (existingApprovedResult) {
        toast.error('This result has already been approved and cannot be modified.', { id: "submit-result" });
        return;
      }

      const studentScoresRaw = scores.filter(s => {
        if (String(s?.student_id) !== String(selectedStudent?.id)) return false;
        if (String(s?.term) !== String(currentTerm)) return false;
        if (String(s?.academic_year) !== String(currentAcademicYear)) return false;
        const st = String(s?.status);
        return st === 'Submitted' || st === 'Approved' || st === 'Draft';
      });
      
      if (studentScoresRaw.length === 0) {
        toast.error('No scores found for this student', { id: "submit-result" });
        return;
      }

      const bySubject = new Map<string, Score>();
      for (const sc of studentScoresRaw) {
        const subId = assignmentIdToSubjectId.get(Number(sc?.subject_assignment_id));
        if (!subId) continue;
        const key = String(subId);
        const prev = bySubject.get(key);
        if (!prev) {
          bySubject.set(key, sc);
          continue;
        }
        const prevStatus = String(prev?.status || '');
        const nextStatus = String(sc?.status || '');
        const prevIsFinal = prevStatus === 'Submitted' || prevStatus === 'Approved';
        const nextIsFinal = nextStatus === 'Submitted' || nextStatus === 'Approved';
        if (nextIsFinal && !prevIsFinal) {
          bySubject.set(key, sc);
          continue;
        }
        if (nextIsFinal === prevIsFinal) {
          const prevTotal = Number(prev?.total) || 0;
          const nextTotal = Number(sc?.total) || 0;
          if (nextTotal > prevTotal) {
            bySubject.set(key, sc);
          }
        }
      }

      const studentScores = Array.from(bySubject.values());

      const registeredSubjectIds = new Set<string>();
      if (Array.isArray(subjectRegistrations)) {
        for (const sr of subjectRegistrations) {
          if (String(sr?.status) !== 'Active') continue;
          if (String(sr?.class_id) !== String(effectiveSelectedClassId)) continue;
          if (String(sr?.term) !== String(currentTerm)) continue;
          if (String(sr?.academic_year) !== String(currentAcademicYear)) continue;
          const sid = sr?.subject_id;
          if (sid !== undefined && sid !== null && String(sid) !== '') {
            registeredSubjectIds.add(String(sid));
          }
        }
      }

      const requiredSubjectIds = registeredSubjectIds.size > 0 ? registeredSubjectIds : classSubjectIdSet;
      const requiredSubjects = requiredSubjectIds.size;
      const submittedSubjectIds = new Set<string>();
      for (const s of studentScores.filter(s => s.status === 'Submitted' || s.status === 'Approved')) {
        const subId = assignmentIdToSubjectId.get(Number(s?.subject_assignment_id));
        if (subId && requiredSubjectIds.has(String(subId))) {
          submittedSubjectIds.add(String(subId));
        }
      }

      if (submittedSubjectIds.size < requiredSubjects) {
        toast.error(`Student has submitted scores for ${submittedSubjectIds.size}/${requiredSubjects} subjects. All subjects must be submitted before compiling results.`, { id: "submit-result" });
        return;
      }

      const affective = Array.isArray(affectiveDomains) ? affectiveDomains.find(a => 
        a.student_id === selectedStudent.id &&
        String(a.class_id) === String(effectiveSelectedClassId) &&
        a.term === currentTerm && a.academic_year === currentAcademicYear
      ) : undefined;

      const psychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(p => 
        p.student_id === selectedStudent.id &&
        String(p.class_id) === String(effectiveSelectedClassId) &&
        p.term === currentTerm && p.academic_year === currentAcademicYear
      ) : undefined;

      if (!affective) { toast.error('Affective domain assessment is required', { id: "submit-result" }); return; }
      if (!psychomotor) { toast.error('Psychomotor domain assessment is required', { id: "submit-result" }); return; }

      const attendanceRequirements = getAttendanceRequirements();
      const requiredDays = attendanceRequirements[currentTerm] || 0;
      if (requiredDays === 0) {
        toast.error('Attendance requirements not set for this term.', { id: "submit-result" });
        return;
      }

      const attendanceRows = getAttendanceByStudent(selectedStudent.id, currentAcademicYear, currentTerm);
      const relevantAttendance = Array.isArray(attendanceRows)
        ? attendanceRows.filter(a => String(a.class_id) === String(effectiveSelectedClassId))
        : [];
      const attendedDays = relevantAttendance.reduce((max, row) => {
        const parsed = parseAttendedDaysFromRemarks(row?.remarks);
        return parsed > max ? parsed : max;
      }, 0);
      
      if (attendedDays === 0) {
        toast.error('Attendance data is required.', { id: "submit-result" });
        return;
      }

      const enhancedScores = studentScores.map((score: Score) => {
        const assignment = Array.isArray(subjectAssignments) ? subjectAssignments.find((sa: SubjectAssignment) => sa.id === score.subject_assignment_id) : undefined;
        const subject = assignment && Array.isArray(subjects) ? subjects.find((s: Subject) => s.id === assignment.subject_id) : undefined;
        return { ...score, subject_name: subject?.name || assignment?.subject_name || score.subject_name || 'Unknown Subject' };
      });

      const totalScore = studentScores.reduce((sum, score) => sum + (Number(score.total) || 0), 0);
      const averageScore = studentScores.length > 0 ? Math.round((totalScore / studentScores.length) * 100) / 100 : 0;

      const completionRow = (studentsCompletion || []).find(s => s.studentId === selectedStudent.id);
      const actualPosition = completionRow?.position || 0;
      const totalStudents = completionRow?.totalStudents || classStudents.length;

      const compiledData = {
        student_id: selectedStudent.id,
        class_id: Number(effectiveSelectedClassId),
        term: currentTerm,
        academic_year: currentAcademicYear,
        scores: enhancedScores,
        affective: affective || null,
        psychomotor: psychomotor || null,
        total_score: totalScore,
        average_score: averageScore,
        class_average: averageScore,
        position: actualPosition,
        total_students: totalStudents,
        times_present: attendedDays,
        times_absent: requiredDays - attendedDays,
        total_attendance_days: requiredDays,
        term_begin: getTermDates().termStartDate || '',
        term_end: getTermDates().termEndDate || '',
        next_term_begin: getTermDates().nextTermStarts || '',
        class_teacher_name: currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : 'System Administrator',
        class_teacher_comment: customComment || generateAutoComment(averageScore),
        principal_name: 'Dr. Ibrahim Musa',
        principal_comment: '',
        principal_signature: '',
        compiled_by: currentUser?.id || 1,
        compiled_date: new Date().toISOString(),
        status: 'Submitted' as const,
        approved_by: null,
        approved_date: null,
        rejection_reason: null,
        print_approved: 0
      };

      await api.post(API_CONFIG.ENDPOINTS.RESULTS.COMPILE, {
        class_id: Number(effectiveSelectedClassId),
        term: currentTerm,
        academic_year: currentAcademicYear,
        student_results: [compiledData]
      });
      
      toast.success(
        `Result submitted successfully! Student: ${selectedStudent.firstName} ${selectedStudent.lastName}, Position: ${actualPosition}/${totalStudents}, Average: ${averageScore}%`,
        { id: "submit-result", duration: 8000 }
      );
      
      setCustomComment("");
      setSelectedStudentId(null);
      await loadCompiledResultsFromAPI(null);
      
    } catch {
      toast.error('Failed to submit result. Please try again.', { id: "submit-result" });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedStudent, currentTeacher, effectiveSelectedClassId, currentTerm, currentAcademicYear,
    compiledResults, scores, subjectRegistrations, assignmentIdToSubjectId, classSubjectIdSet,
    affectiveDomains, psychomotorDomains, getAttendanceRequirements, getAttendanceByStudent,
    subjectAssignments, subjects, studentsCompletion, classStudents, customComment,
    currentUser, loadCompiledResultsFromAPI, getTermDates, setIsSubmitting, setCustomComment,
    setSelectedStudentId,
  ]);

  return { handleSubmitResult };
}
