import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from 'sonner';
import { ClipboardList, Loader2 } from 'lucide-react';
import logger from "../../utils/logger";
import { api } from "../../services/api";
import { ScoreEntryToolbar } from "./score-entry/ScoreEntryToolbar";
import { ScoreEntryFilters } from "./score-entry/ScoreEntryFilters";
import { ScoreEntryInfoBar } from "./score-entry/ScoreEntryInfoBar";
import { ScoreEntryTable } from "./score-entry/ScoreEntryTable";
import { calculateTotal } from "./score-entry/scoreConfig";

export function ScoreEntryPage() {
  const {
    currentUser,
    teachers,
    students,
    classes,
    getTeacherAssignments,
    scores,
    loadScoresFromAPI,
    currentTerm,
    currentAcademicYear,
    compiledResults,
    cbtAttempts,
    loadCbtAttemptsFromAPI,
    cbtExams,
    loadCbtExamsFromAPI,
    schoolSettings,
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [scoresData, setScoresData] = useState<Record<number, { ca1: string; ca2: string; exam: string }>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [lastSavedData, setLastSavedData] = useState<Record<number, { ca1: string; ca2: string; exam: string }>>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastManualSave, setLastManualSave] = useState<number>(0);
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm || '');
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear || '');
  const [cbtOverride, setCbtOverride] = useState<Record<number, boolean>>({});
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  const cbtScoresByStudent = useMemo(() => {
    if (!selectedSubjectId || !selectedTerm || !selectedYear) return {} as Record<number, { slot: string; score: number; max: number; percentage: number }>;
    const relevantExams = cbtExams.filter((e: any) =>
      String(e.subject_id) === String(selectedSubjectId) &&
      e.feed_into_scores && e.status === 'Active' && e.published
    );
    const examIds = new Set(relevantExams.map((e: any) => e.id));
    const result: Record<number, { slot: string; score: number; max: number; percentage: number }> = {};
    cbtAttempts.forEach((a: any) => {
      if (examIds.has(a.exam_id) && (a.status === 'submitted' || a.status === 'scored')) {
        if (!result[a.student_id]) {
          result[a.student_id] = {
            slot: relevantExams.find((e: any) => e.id === a.exam_id)?.score_slot || 'first_test',
            score: a.score,
            max: a.max_score,
            percentage: a.percentage
          };
        }
      }
    });
    return result;
  }, [selectedSubjectId, selectedTerm, selectedYear, cbtExams, cbtAttempts]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      loadCbtExamsFromAPI();
      loadCbtAttemptsFromAPI();
    }
  }, [selectedClassId, selectedSubjectId]);

  const isCrecheClass = useMemo(() => {
    const selectedClass = classes.find(c => String(c.id) === selectedClassId);
    const name = (selectedClass?.name || '').toString().trim().toLowerCase();
    const level = (selectedClass?.level || '').toString().trim().toLowerCase();
    const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
    const nName = normalize(name);
    const nLevel = normalize(level);
    return nName.includes('creche') || nLevel.includes('creche');
  }, [selectedClassId, classes]);

  const currentTeacher = currentUser ? teachers.find(t => String(t.id) === String(currentUser.linked_id)) : null;
  const teacherAssignments = currentTeacher ? getTeacherAssignments(Number(currentTeacher.id)) : [];

  const assignedClasses = useMemo(() => {
    const classMap = new Map();
    teacherAssignments.forEach(assignment => {
      if (!classMap.has(assignment.class_id)) {
        const className = assignment.class_name ||
          classes.find(c => c.id === assignment.class_id)?.name ||
          'Unknown Class';
        classMap.set(assignment.class_id, { id: assignment.class_id, name: className });
      }
    });
    return Array.from(classMap.values());
  }, [teacherAssignments, currentTeacher, classes]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const subjectsForClass = teacherAssignments.filter(a => String(a.class_id) === selectedClassId);
    const uniqueSubjects = new Map();
    subjectsForClass.forEach(assignment => {
      const subjectKey = assignment.subject_id;
      if (!uniqueSubjects.has(subjectKey)) {
        uniqueSubjects.set(subjectKey, {
          id: assignment.subject_id,
          subject_id: assignment.subject_id,
          subject_name: assignment.subject_name || 'Unknown Subject',
          name: assignment.subject_name || 'Unknown Subject',
        });
      }
    });
    return Array.from(uniqueSubjects.values());
  }, [selectedClassId, teacherAssignments, currentTeacher]);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const filtered = students.filter(s => String(s.class_id) === selectedClassId && s.status === 'Active');
    const byId = new Map<number, any>();
    for (const s of filtered) {
      const idNum = Number((s as any)?.id);
      if (Number.isFinite(idNum)) byId.set(idNum, s);
    }
    return Array.from(byId.values()).sort((a, b) => {
      const firstNameA = (a.firstName || '').toLowerCase();
      const firstNameB = (b.firstName || '').toLowerCase();
      if (firstNameA !== firstNameB) return firstNameA.localeCompare(firstNameB);
      const lastNameA = (a.lastName || '').toLowerCase();
      const lastNameB = (b.lastName || '').toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    });
  }, [selectedClassId, students]);

  const existingScores = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId || !teacherAssignments.length) return [];
    const assignment = teacherAssignments.find(
      a => String(a.subject_id) === String(selectedSubjectId) && String(a.class_id) === String(selectedClassId)
    );
    if (!assignment) return [];
    const filteredScores = scores.filter(s =>
      s.subject_assignment_id === assignment.id &&
      s.term === selectedTerm &&
      s.academic_year === selectedYear
    );
    return filteredScores.map(score => ({
      ...score,
      student: students.find(s => s.id === score.student_id)
    }));
  }, [selectedSubjectId, selectedClassId, teacherAssignments, scores, selectedTerm, selectedYear]);

  // Merge DB scores into local state without overwriting user input
  useEffect(() => {
    setScoresData(prev => {
      const updated = { ...prev };
      existingScores.forEach((score: any) => {
        const current = updated[score.student_id] || { ca1: '', ca2: '', exam: '' };
        updated[score.student_id] = {
          ca1: current.ca1 !== '' ? current.ca1 : (score.ca1 ?? '').toString(),
          ca2: current.ca2 !== '' ? current.ca2 : (score.ca2 ?? '').toString(),
          exam: current.exam !== '' ? current.exam : (score.exam ?? '').toString()
        };
      });
      return updated;
    });
    const rejectedScores = existingScores.filter(s => s.status === 'Rejected');
    if (rejectedScores.length > 0 && !isEditMode) {
      setIsEditMode(true);
      toast.info("Edit mode enabled. Some scores were rejected and need correction.");
    }
  }, [existingScores]);

  // Load scores when selection changes
  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      const doLoad = async () => {
        setIsLoadingScores(true);
        await loadScoresFromAPI(selectedTerm, selectedYear);
        setIsLoadingScores(false);
      };
      doLoad();
    }
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear]);

  // Batch save scores in a single API call
  const batchSaveScores = useCallback(async (
    assignmentId: number,
    _assignmentSubjectName: string,
    status: 'Draft' | 'Submitted',
    studentIds: number[]
  ) => {
    const scoresPayload = studentIds.map(studentId => {
      const data = scoresData[studentId];
      if (!data) return null;
      const row: any = { student_id: studentId };
      if (!isCrecheClass) {
        if (data.ca1 !== '' && data.ca1 != null) row.ca1 = parseFloat(data.ca1) || 0;
        if (data.ca2 !== '' && data.ca2 != null) row.ca2 = parseFloat(data.ca2) || 0;
      }
      if (data.exam !== '' && data.exam != null) row.exam = parseFloat(data.exam) || 0;
      row.status = status;
      return row;
    }).filter(Boolean);

    if (scoresPayload.length === 0) return;

    const response = await api.post('/results/scores', {
      assignment_id: assignmentId,
      scores: scoresPayload,
    });

    if (!response || response.success !== true) {
      throw new Error(response?.error || 'Failed to save scores');
    }
  }, [scoresData, isCrecheClass]);

  // Auto-save with batch optimization
  const autoSaveScores = useCallback(async () => {
    if (isAutoSaving || isEditMode) return;

    setIsAutoSaving(true);
    try {
      setAutoSaveStatus('Auto-saving...');

      const dataChanged = JSON.stringify(scoresData) !== JSON.stringify(lastSavedData);
      if (!dataChanged) {
        setIsAutoSaving(false);
        return;
      }

      const assignment = teacherAssignments.find(
        a => String(a.subject_id) === String(selectedSubjectId) && String(a.class_id) === String(selectedClassId)
      );
      if (!assignment) {
        setIsAutoSaving(false);
        return;
      }

      const dirtyStudentIds = Object.entries(scoresData)
        .filter(([_, data]) => data.ca1 !== '' || data.ca2 !== '' || data.exam !== '')
        .map(([id]) => Number(id));

      if (dirtyStudentIds.length > 0) {
        await batchSaveScores(assignment.id, assignment.subject_name || '', 'Draft', dirtyStudentIds);
      }

      setLastSavedData(scoresData);
      await loadScoresFromAPI(selectedTerm, selectedYear);
      setAutoSaveStatus('Auto-saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (error) {
      logger.error('Auto-save error:', { selectedClassId, selectedSubjectId, error }, 'ScoreEntryPage');
      setAutoSaveStatus('Save failed');
      toast.error('Auto-save failed. Please try manual save.');
    } finally {
      setIsAutoSaving(false);
    }
  }, [scoresData, lastSavedData, isAutoSaving, isEditMode, selectedClassId, selectedSubjectId, selectedTerm, selectedYear, teacherAssignments, existingScores, isCrecheClass, batchSaveScores, loadScoresFromAPI]);

  // Auto-refresh scores
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await loadScoresFromAPI(selectedTerm, selectedYear);
      } catch (error) {
        logger.error('Error auto-refreshing scores:', { selectedClassId, selectedSubjectId, error }, 'ScoreEntryPage');
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear]);

  // Auto-save debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => { autoSaveScores(); }, 2000);
    return () => clearTimeout(timeoutId);
  }, [autoSaveScores]);

  // Block auto-save after manual save
  useEffect(() => {
    if (lastManualSave === 0) return;
    const timeout = setTimeout(() => setLastManualSave(0), 5000);
    return () => clearTimeout(timeout);
  }, [lastManualSave]);

  const selectedClass = classes.find(c => String(c.id) === String(selectedClassId));
  const selectedAssignment = teacherAssignments.find(
    a => String(a.subject_id) === String(selectedSubjectId) && String(a.class_id) === String(selectedClassId)
  );

  // Statistics computed from local state
  const statistics = useMemo(() => {
    const totals = classStudents.map(student => {
      const data = scoresData[student.id];
      if (!data) return 0;
      if (isCrecheClass) return parseFloat(data.exam) || 0;
      if (!data.ca1 || !data.ca2 || !data.exam) return 0;
      return (parseFloat(data.ca1) || 0) + (parseFloat(data.ca2) || 0) + (parseFloat(data.exam) || 0);
    }).filter(t => t > 0);

    const highestScorer = classStudents.reduce((highest, student) => {
      const studentTotal = isCrecheClass
        ? (parseFloat(scoresData[student.id]?.exam) || 0)
        : ((parseFloat(scoresData[student.id]?.ca1) || 0) + (parseFloat(scoresData[student.id]?.ca2) || 0) + (parseFloat(scoresData[student.id]?.exam) || 0));
      const highestTotal = highest
        ? (isCrecheClass ? (parseFloat(scoresData[highest.id]?.exam) || 0) : ((parseFloat(scoresData[highest.id]?.ca1) || 0) + (parseFloat(scoresData[highest.id]?.ca2) || 0) + (parseFloat(scoresData[highest.id]?.exam) || 0)))
        : 0;
      return studentTotal > highestTotal ? student : highest;
    }, null as typeof classStudents[0] | null);

    if (totals.length === 0) return { average: '0.00', max: '0.00', min: '0.00', highestScorer: null };
    return {
      average: (totals.reduce((sum, t) => sum + t, 0) / totals.length).toFixed(2),
      max: Math.max(...totals).toFixed(2),
      min: Math.min(...totals).toFixed(2),
      highestScorer
    };
  }, [scoresData, classStudents, isCrecheClass]);

  const isLocked = useMemo(() => {
    if (isEditMode) return false;
    const hasApprovedScores = existingScores.some(s => s.status === 'Approved');
    const hasApprovedCompiledResults = compiledResults.some((cr: any) =>
      String(cr.class_id) === String(selectedClassId) &&
      cr.term === selectedTerm &&
      cr.academic_year === selectedYear &&
      cr.status === 'Approved'
    );
    const hasRejectedScores = existingScores.some(s => s.status === 'Rejected');
    return (hasApprovedScores || hasApprovedCompiledResults) && !hasRejectedScores;
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear, isEditMode, existingScores, compiledResults]);

  const hasSubmittedScores = useMemo(() => {
    return existingScores.some(s => s.status === 'Submitted');
  }, [existingScores]);

  // Initialize scores on selection change
  useEffect(() => {
    const initialData: Record<number, { ca1: string; ca2: string; exam: string }> = {};
    classStudents.forEach(student => {
      const existingScore = existingScores.find(s => s.student_id === student.id);
      initialData[student.id] = {
        ca1: existingScore?.ca1?.toString() || "",
        ca2: existingScore?.ca2?.toString() || "",
        exam: existingScore?.exam?.toString() || ""
      };
    });
    setScoresData(initialData);
    setLastSavedData(initialData);
    setIsEditMode(false);
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear]);

  // Refresh scores on mount
  useEffect(() => {
    const reloadScores = async () => {
      setIsLoadingScores(true);
      try {
        await loadScoresFromAPI(selectedTerm, selectedYear);
      } catch (error) {
        logger.error('Failed to reload scores:', { selectedClassId, selectedSubjectId, error }, 'ScoreEntryPage');
      }
      setIsLoadingScores(false);
    };
    reloadScores();
  }, []);

  useEffect(() => {
    logger.info('ScoreEntryPage initialized', { currentUser: currentUser?.id, currentTerm, currentAcademicYear }, 'ScoreEntryPage');
  }, [currentUser, currentTerm, currentAcademicYear]);

  // Sync term/year from context when they load asynchronously, without overriding user's manual selection
  useEffect(() => {
    if (currentTerm && !selectedTerm) setSelectedTerm(currentTerm);
    if (currentAcademicYear && !selectedYear) setSelectedYear(currentAcademicYear);
  }, [currentTerm, currentAcademicYear, selectedTerm, selectedYear]);

  const handleScoreChange = (studentId: number, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    if (isLocked) return;
    if (value === '') {
      setScoresData(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
      return;
    }
    const numValue = parseFloat(value);
    let maxValue: number;
    if (isCrecheClass) {
      if (field !== 'exam') {
        toast.error(`${selectedClass?.name || 'Class'} only allows exam scores`);
        return;
      }
      maxValue = 100;
    } else {
      maxValue = field === 'exam' ? 60 : 20;
    }
    if (!isNaN(numValue)) {
      if (numValue < 0) {
        toast.error(`${field.toUpperCase()} cannot be negative`);
        return;
      }
      if (isCrecheClass && field === 'exam' && numValue > 100) {
        toast.error(`${field.toUpperCase()} cannot exceed 100`);
        return;
      }
      if (numValue > maxValue) {
        toast.error(`${field.toUpperCase()} cannot exceed ${maxValue}`);
        return;
      }
    }
    setScoresData(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const validateScoreValues = useCallback(() => {
    const invalidScores = classStudents.filter(student => {
      const data = scoresData[student.id];
      if (!data) return false;
      if (isCrecheClass) {
        if (data.exam === '' || data.exam == null) return false;
        const exam = parseFloat(data.exam);
        if (Number.isNaN(exam)) return true;
        return exam < 0 || exam > 100;
      }
      if (data.ca1 !== '' && data.ca1 != null) {
        const ca1 = parseFloat(data.ca1);
        if (Number.isNaN(ca1) || ca1 < 0 || ca1 > 20) return true;
      }
      if (data.ca2 !== '' && data.ca2 != null) {
        const ca2 = parseFloat(data.ca2);
        if (Number.isNaN(ca2) || ca2 < 0 || ca2 > 20) return true;
      }
      if (data.exam !== '' && data.exam != null) {
        const exam = parseFloat(data.exam);
        if (Number.isNaN(exam) || exam < 0 || exam > 60) return true;
      }
      return false;
    });
    if (invalidScores.length > 0) {
      const studentNames = invalidScores.map(s => `${s.firstName} ${s.lastName}`).join(', ');
      toast.error(`Cannot submit: Invalid score values for ${invalidScores.length} student(s): ${studentNames}`);
      return false;
    }
    return true;
  }, [classStudents, scoresData, isCrecheClass]);

  const validateScore = useCallback((score: string, max: number, name: string) => {
    if (!score || score === '') return '';
    const num = parseFloat(score);
    if (isNaN(num) || num < 0 || num > max) {
      toast.error(`${name} must be between 0 and ${max}`);
      return null;
    }
    return num.toString();
  }, []);

  // Submit scores with batch save
  const submitScoresForApproval = async () => {
    if (!validateScoreValues()) return;
    const assignment = teacherAssignments.find(
      a => String(a.subject_id) === String(selectedSubjectId) && String(a.class_id) === String(selectedClassId)
    );
    if (!assignment) {
      toast.error('Assignment not found');
      return;
    }

    const participatingStudents = classStudents.filter(student => {
      const data = scoresData[student.id];
      if (!data) return false;
      if (isCrecheClass) return data.exam !== '' && data.exam != null;
      return (data.ca1 !== '' && data.ca1 != null) || (data.ca2 !== '' && data.ca2 != null) || (data.exam !== '' && data.exam != null);
    });

    if (participatingStudents.length === 0) {
      toast.error("Please enter scores for at least one student");
      return;
    }

    try {
      const studentIds = participatingStudents.map(s => s.id);
      await batchSaveScores(assignment.id, assignment.subject_name || '', 'Submitted', studentIds);
      setLastManualSave(Date.now());
      toast.success(`Scores submitted successfully! ${participatingStudents.length} student(s) scores saved.`);
      await loadScoresFromAPI(selectedTerm, selectedYear);
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'Failed to submit scores';
      if (errorMessage.includes('Access denied') || errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
        toast.error('Access denied: You can only submit scores for your own assignments.');
      } else {
        toast.error(`Failed to submit scores: ${errorMessage}`);
      }
    }
  };

  const handleExportExcel = () => {
    if (!selectedClassId || !selectedSubjectId || classStudents.length === 0) {
      toast.error("Please select class and subject with students");
      return;
    }
    const csvHeader = isCrecheClass
      ? `S/No,Reg ID,Student Name,Exams[100+],Total [100+]\n`
      : `S/No,Reg ID,Student Name,1st CA[20],2nd CA[20],Exams[60],Total [100]\n`;
    let csv = csvHeader;
    classStudents.forEach((student, index) => {
      const data = scoresData[student.id] || { ca1: '', ca2: '', exam: '' };
      const { total } = calculateTotal(data.ca1, data.ca2, data.exam, isCrecheClass);
      if (isCrecheClass) {
        csv += `${index + 1},${student.admissionNumber},"${student.firstName} ${student.lastName}",${data.exam || ''},${total.toFixed(2)}\n`;
      } else {
        csv += `${index + 1},${student.admissionNumber},"${student.firstName} ${student.lastName}",${data.ca1 || ''},${data.ca2 || ''},${data.exam || ''},${total.toFixed(2)}\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAssignment?.class_name || 'Class'} - ${selectedAssignment?.subject_name || 'Subject'}_${currentTerm}_${currentAcademicYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("CSV file exported successfully!");
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isLocked) {
      toast.error("Cannot import: Scores are locked. Admin has approved results.");
      event.target.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error("CSV file must contain header and at least one student record");
          return;
        }

        const header = lines[0].trim();
        const expectedCrecheHeader = 'S/No,Reg ID,Student Name,Exams[100+],Total [100+]';
        const expectedStandardHeader = 'S/No,Reg ID,Student Name,1st CA[20],2nd CA[20],Exams[60],Total [100]';

        if (isCrecheClass) {
          if (header !== expectedCrecheHeader) {
            toast.error("Invalid CSV format for CRECHE. Please use the exported template format.");
            return;
          }
        } else {
          if (header !== expectedStandardHeader) {
            toast.error("Invalid CSV format. Please use the exported template format.");
            return;
          }
        }

        const dataLines = lines.slice(1);
        let importedCount = 0;
        let errorCount = 0;
        const updatedScores: Record<number, { ca1: string; ca2: string; exam: string }> = {};

        dataLines.forEach((line, _idx) => {
          try {
            const parts = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') { inQuotes = !inQuotes; }
              else if (char === ',' && !inQuotes) { parts.push(current.trim()); current = ''; }
              else { current += char; }
            }
            parts.push(current.trim());

            const expectedColumns = isCrecheClass ? 5 : 7;
            if (parts.length < expectedColumns) { errorCount++; return; }

            let sno, regId, name, ca1, ca2, exam, total;
            if (isCrecheClass) {
              [sno, regId, name, exam, total] = parts.map(p => p.replace(/^"|"$/g, '').trim());
              ca1 = ''; ca2 = '';
            } else {
              [sno, regId, name, ca1, ca2, exam, total] = parts.map(p => p.replace(/^"|"$/g, '').trim());
            }

            const student = classStudents.find(s => s.admissionNumber === regId);
            if (!student) { errorCount++; return; }

            let cleanCa1 = '', cleanCa2 = '', cleanExam = '';
            if (isCrecheClass) {
              const examResult = validateScore(exam, 100, 'Exam');
              cleanExam = examResult !== null ? examResult : '';
              if (examResult === null) { errorCount++; return; }
            } else {
              const ca1Result = validateScore(ca1, 20, '1st CA');
              const ca2Result = validateScore(ca2, 20, '2nd CA');
              const examResult = validateScore(exam, 60, 'Exam');
              cleanCa1 = ca1Result !== null ? ca1Result : '';
              cleanCa2 = ca2Result !== null ? ca2Result : '';
              cleanExam = examResult !== null ? examResult : '';
              if (ca1Result === null || ca2Result === null || examResult === null) { errorCount++; return; }
            }

            updatedScores[student.id] = { ca1: cleanCa1 || '', ca2: cleanCa2 || '', exam: cleanExam || '' };
            importedCount++;
          } catch { errorCount++; }
        });

        setScoresData(prev => ({ ...prev, ...updatedScores }));
        if (importedCount > 0) toast.success(`Successfully imported ${importedCount} student scores`);
        if (errorCount > 0) toast.warning(`${errorCount} entries had errors and were skipped.`);
        if (importedCount === 0 && errorCount === 0) toast.info("No valid student records found in CSV");
      } catch {
        toast.error('Failed to process CSV file. Please check file format.');
      }
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleResubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      toast.error("Please select class and subject");
      return;
    }
    const assignment = teacherAssignments.find(
      a => String(a.subject_id) === String(selectedSubjectId) && String(a.class_id) === String(selectedClassId)
    );
    if (!assignment) { toast.error("Assignment not found"); return; }

    const rejectedScores = existingScores.filter(s => s.status === 'Rejected');
    const modifiedRejectedScores = rejectedScores.filter(score => {
      const data = scoresData[score.student_id];
      if (!data) return false;
      return (
        (data.ca1 && parseFloat(data.ca1) !== (score.ca1 ?? 0)) ||
        (data.ca2 && parseFloat(data.ca2) !== (score.ca2 ?? 0)) ||
        (data.exam && parseFloat(data.exam) !== (score.exam ?? 0))
      );
    });

    if (modifiedRejectedScores.length === 0) {
      toast.error("Please make corrections to at least one rejected score");
      return;
    }

    try {
      const studentIds = modifiedRejectedScores.map(s => s.student_id);
      await batchSaveScores(assignment.id, assignment.subject_name || '', 'Submitted', studentIds);
      setLastManualSave(Date.now());
      toast.success(`Rejected scores resubmitted successfully! ${modifiedRejectedScores.length} score(s) corrected.`);
      setIsEditMode(false);
      await loadScoresFromAPI(selectedTerm, selectedYear);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to resubmit scores: ${errorMessage}`);
    }
  };

  const toggleEditMode = () => setIsEditMode(!isEditMode);

  const hasRejectedScores = existingScores.some(s => s.status === 'Rejected');
  const allDraft = existingScores.every(s => s.status === 'Draft');
  const showSubmitButton = existingScores.some((s: any) => s.status === 'Submitted');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        {isEditMode && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <span className="text-amber-600 text-sm font-medium">Edit Mode Enabled — You can modify submitted scores</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Students Assessment Score</h2>
              <p className="text-xs text-slate-500">{selectedTerm?.toUpperCase() || ''} — {selectedYear || ''}</p>
            </div>
          </div>

          <ScoreEntryToolbar
            onRefresh={() => {
              toast.success("Refreshing scores from database");
              setIsLoadingScores(true);
              loadScoresFromAPI(selectedTerm, selectedYear).finally(() => setIsLoadingScores(false));
            }}
            onExport={handleExportExcel}
            onImport={handleImportExcel}
            disabled={!selectedClassId || !selectedSubjectId}
            isLocked={isLocked}
            fileInputId="csv-upload-input"
          />
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <ScoreEntryFilters
            selectedClassId={selectedClassId}
            selectedSubjectId={selectedSubjectId}
            selectedTerm={selectedTerm}
            selectedYear={selectedYear}
            assignedClasses={assignedClasses}
            availableSubjects={availableSubjects}
            onClassChange={(value) => { setSelectedClassId(value); setSelectedSubjectId(""); }}
            onSubjectChange={setSelectedSubjectId}
            onTermChange={setSelectedTerm}
            onYearChange={setSelectedYear}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      {selectedClassId && selectedSubjectId ? (
        isLoadingScores ? (
          <Card className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading scores...</p>
            </CardContent>
          </Card>
        ) : classStudents.length > 0 ? (
          <Card className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 p-4 sm:p-6">
              <ScoreEntryInfoBar
                selectedClass={selectedClass || null}
                selectedAssignment={selectedAssignment || null}
                statistics={statistics}
                currentTeacher={currentTeacher ?? null}
                autoSaveStatus={autoSaveStatus}
                isLocked={isLocked}
                hasSubmittedScores={hasSubmittedScores}
                existingScores={existingScores}
                students={students}
                isEditMode={isEditMode}
              />
            </CardHeader>

            <CardContent className="p-0">
              <ScoreEntryTable
                classStudents={classStudents}
                scoresData={scoresData}
                existingScores={existingScores}
                isLocked={isLocked}
                isCrecheClass={isCrecheClass}
                isEditMode={isEditMode}
                onScoreChange={handleScoreChange}
                cbtScoresByStudent={cbtScoresByStudent}
                cbtOverride={cbtOverride}
                onCbtOverride={(studentId, value) => setCbtOverride(prev => ({ ...prev, [studentId]: value }))}
                onToggleEditMode={toggleEditMode}
                onResubmit={handleResubmit}
                onSubmit={submitScoresForApproval}
                hasRejectedScores={hasRejectedScores}
                allDraft={allDraft}
                showSubmitButton={showSubmitButton}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 mb-2">No students found for this class</p>
              <p className="text-xs text-slate-400">Ensure students are assigned and active</p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="rounded-xl bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Select a class and subject to begin</p>
            <p className="text-xs text-slate-400">Your assigned classes and subjects will appear in the dropdowns above</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">{schoolSettings.school_name || 'School'} © — {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
