import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from 'sonner';
import { Save, Edit, Check, X, AlertTriangle, Users, BookOpen, Calculator } from 'lucide-react';

export function ScoreEntryPage() {
  const {
    currentUser,
    teachers,
    students,
    classes,
    subjects,
    getTeacherAssignments,
    scores,
    addScore,
    updateScore,
    approveScore,
    submitScores,
    loadScoresFromAPI,
    currentTerm,
    currentAcademicYear,
    subjectAssignments,
    addNotification,
    compiledResults
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [scoresData, setScoresData] = useState<Record<number, { ca1: string; ca2: string; exam: string }>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [lastSavedData, setLastSavedData] = useState<Record<number, { ca1: string; ca2: string; exam: string }>>({});
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm);
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear);

  // Check if selected class is CRECHE (Onyx)
  const isCrecheClass = useMemo(() => {
    return selectedClassId === '1'; // CRECHE (Onyx) has ID = 1
  }, [selectedClassId]);

  // Get current teacher
  const currentTeacher = currentUser ? teachers.find(t => t.id === String(currentUser.linked_id)) : null;
  const teacherAssignments = currentTeacher ? getTeacherAssignments(Number(currentTeacher.id)) : [];

    
  // For Score Entry, we only want classes where teacher has subject assignments
  // NOT classes where teacher is class teacher

  // Get unique classes from subject assignments ONLY
  const assignedClasses = useMemo(() => {
    const classMap = new Map();
    
    // Only add classes from subject assignments (not class teacher assignments)
    teacherAssignments.forEach(assignment => {
      if (!classMap.has(assignment.class_id)) {
        // Use class_name from assignment first, fallback to classes array
        const className = assignment.class_name || 
                         classes.find(c => c.id === assignment.class_id)?.name || 
                         'Unknown Class';
        
        classMap.set(assignment.class_id, {
          id: assignment.class_id,
          name: className
        });
      }
    });
    
    const result = Array.from(classMap.values());
    return result;
  }, [teacherAssignments, currentTeacher, classes]);

  // Get subjects for selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    
    // Filter assignments for selected class and create unique subjects list
    const subjectsForClass = teacherAssignments.filter(a => String(a.class_id) === selectedClassId);
    
    if (subjectsForClass.length === 0) {
      toast.warning(`No subject assignments found for teacher ${currentTeacher?.id} in class ${selectedClassId}`);
      return [];
    }
    
    // Create unique subjects map to avoid duplicates
    const uniqueSubjects = new Map();
    subjectsForClass.forEach(assignment => {
      const subjectKey = assignment.subject_id;
      if (!uniqueSubjects.has(subjectKey)) {
        uniqueSubjects.set(subjectKey, {
          id: assignment.subject_id,
          subject_id: assignment.subject_id,
          subject_name: assignment.subject_name || 'Unknown Subject',
          name: assignment.subject_name || 'Unknown Subject' // Add name property for compatibility
        });
      }
    });
    
    const result = Array.from(uniqueSubjects.values());
    return result;
  }, [selectedClassId, teacherAssignments, currentTeacher]);

  // Get students for selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter(s => String(s.class_id) === selectedClassId && s.status === 'Active')
      .sort((a, b) => {
        const firstNameA = (a.firstName || '').toLowerCase();
        const firstNameB = (b.firstName || '').toLowerCase();
        if (firstNameA !== firstNameB) {
          return firstNameA.localeCompare(firstNameB);
        }
        // If first names are the same, sort by last name
        const lastNameA = (a.lastName || '').toLowerCase();
        const lastNameB = (b.lastName || '').toLowerCase();
        return lastNameA.localeCompare(lastNameB);
      });
  }, [selectedClassId, students]);

  // Filter existing scores based on current selection
  const existingScores = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId || !teacherAssignments.length) return [];
    
    const assignment = teacherAssignments.find(
      a => a.subject_id === Number(selectedSubjectId) && a.class_id === Number(selectedClassId)
    );
    
    if (!assignment) return [];
    
    // Filter scores for current assignment, term, and year
    const filteredScores = scores.filter(s => 
      s.subject_assignment_id === assignment.id &&
      s.term === selectedTerm &&
      s.academic_year === selectedYear
    );
    
    // Show all scores including submitted ones - they should persist until admin changes term/session
    return filteredScores.map(score => ({
      ...score,
      student: students.find(s => s.id === score.student_id)
    }));
  }, [selectedSubjectId, selectedClassId, teacherAssignments, scores, selectedTerm, selectedYear]);

  // Load existing scores into form when component mounts or selection changes
  useEffect(() => {
    const loadedScores: Record<number, { ca1: string; ca2: string; exam: string }> = {};
    
    // Load ALL existing scores (approved, pending, and rejected)
    existingScores.forEach((score: any) => {
      loadedScores[score.student_id] = {
        ca1: (score.ca1 || '').toString(),
        ca2: (score.ca2 || '').toString(),
        exam: (score.exam || '').toString()
      };
    });
    
    setScoresData(loadedScores);
    
    // Auto-enable edit mode if there are rejected scores
    const rejectedScores = existingScores.filter(s => s.status === 'Rejected');
    const hasRejectedScores = rejectedScores.length > 0;
    if (hasRejectedScores && !isEditMode) {
      setIsEditMode(true);
      toast.info("Edit mode enabled. Some scores were rejected and need correction.");
    }
  }, [existingScores]);

  // Refresh scores data when component mounts or when selection changes
  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      loadScoresFromAPI();
    }
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear]);

  // Auto-save functionality - ENABLED with automatic submission
  const autoSaveScores = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      return;
    }

    // Check if data has changed since last save
    const dataChanged = JSON.stringify(scoresData) !== JSON.stringify(lastSavedData);
    if (!dataChanged) {
      return;
    }

    const assignment = teacherAssignments.find(
      a => a.subject_id === Number(selectedSubjectId) && a.class_id === Number(selectedClassId)
    );

    if (!assignment) {
      return;
    }

    // Only save non-empty scores
    const validScores: Record<number, { ca1: string; ca2: string; exam: string }> = {};
    let hasValidScores = false;

    Object.entries(scoresData).forEach(([studentId, data]) => {
      if (data.ca1 || data.ca2 || data.exam) {
        validScores[Number(studentId)] = data;
        hasValidScores = true;
      }
    });

    if (!hasValidScores) {
      return;
    }

    try {
      setAutoSaveStatus('Auto-submitting...');
      
      // Save each score as SUBMITTED (not draft)
      const savePromises: Promise<number | void>[] = [];
      
      Object.entries(validScores).forEach(([studentId, data]: [string, any]) => {
        const studentIdNum = Number(studentId);
        const existingScore = existingScores.find((s: any) => s.student_id === studentIdNum);
        
        // Calculate totals and statistics
        const allValidScores = Object.values(validScores);
        const allTotals = allValidScores.map(scoreData => {
          if (isCrecheClass) {
            return parseFloat(scoreData.exam) || 0;
          } else {
            return (parseFloat(scoreData.ca1) || 0) + (parseFloat(scoreData.ca2) || 0) + (parseFloat(scoreData.exam) || 0);
          }
        });

        const classMax = Math.max(...allTotals);
        const classMin = Math.min(...allTotals);
        const classAverage = allTotals.reduce((sum, t) => sum + t, 0) / allTotals.length;

        const totalScore = isCrecheClass 
          ? (parseFloat(data.exam) || 0)
          : ((parseFloat(data.ca1) || 0) + (parseFloat(data.ca2) || 0) + (parseFloat(data.exam) || 0));
        
        const grade = getGrade(totalScore);
        const remark = getRemark(totalScore);
        
        const scoreData = {
          student_id: studentIdNum,
          subject_assignment_id: assignment.id,
          subject_name: assignment.subject_name || 'Unknown Subject',
          ca1: isCrecheClass ? 0 : (parseFloat(data.ca1) || 0),
          ca2: isCrecheClass ? 0 : (parseFloat(data.ca2) || 0),
          exam: parseFloat(data.exam) || 0,
          total: totalScore,
          class_average: Math.round(classAverage * 100) / 100,
          class_min: classMin,
          class_max: classMax,
          grade,
          remark,
          entered_by: currentUser?.id || 0,
          entered_date: new Date().toISOString(),
          term: selectedTerm as 'First Term' | 'Second Term' | 'Third Term',
          academic_year: selectedYear,
          status: 'Submitted' as const // ALWAYS submit, never save as draft
        };

        if (existingScore) {
          // Update existing score with proper locking logic and feedback
          // Allow updates if: (1) Edit mode active, (2) Score not submitted yet, OR (3) Results not admin-approved
          if (isEditMode || existingScore.status === 'Draft' || existingScore.status === 'Rejected' || !isLocked) {
            savePromises.push(updateScore(existingScore.id, scoreData));
            console.log(`Updating score for student ${studentIdNum} - allowed`);
          } else {
            console.log(`Score update blocked for student ${studentIdNum} - results are admin-approved`);
            // Provide user feedback for blocked updates
            const student = classStudents.find(s => s.id === studentIdNum);
            toast.error(`Cannot update score for ${student?.firstName} ${student?.lastName}: Results have been approved by admin`, {
              id: `blocked-update-${studentIdNum}`,
              duration: 5000
            });
          }
        } else {
          // Create new score
          savePromises.push(addScore(scoreData));
        }
      });

      await Promise.all(savePromises);
      setLastSavedData({ ...scoresData });
      setAutoSaveStatus('Auto-submitted');
      
      // Provide success feedback
      const updatedCount = savePromises.length;
      if (updatedCount > 0) {
        toast.success(`${updatedCount} score(s) auto-submitted successfully!`, {
          id: 'auto-submit-success',
          duration: 3000
        });
      }
      
      // Clear status after 2 seconds
      setTimeout(() => setAutoSaveStatus(''), 2000);
      
      // Refresh scores to show updated status
      await loadScoresFromAPI();
      
    } catch (error) {
      setAutoSaveStatus('Auto-submit failed');
      setTimeout(() => setAutoSaveStatus(''), 3000);
    }
  }, [scoresData, lastSavedData, selectedClassId, selectedSubjectId, selectedTerm, selectedYear, currentTeacher, teacherAssignments, existingScores, currentUser, isEditMode, isCrecheClass]);

    // Auto-refresh scores for real-time updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await loadScoresFromAPI();
      } catch (error) {
        console.error('Error auto-refreshing scores:', error);
      }
    }, 30000); // Changed from 5000 to 30000 to reduce frequency

    return () => clearInterval(interval);
  }, [selectedClassId, selectedSubjectId]); // Remove loadScoresFromAPI from dependencies

  // Auto-save on data change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoSaveScores();
    }, 2000); // Auto-submit after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [autoSaveScores]);

  // Get class and subject details
  const selectedClass = classes.find(c => c.id === Number(selectedClassId));
  const selectedAssignment = teacherAssignments.find(
    a => a.subject_id === Number(selectedSubjectId) && a.class_id === Number(selectedClassId)
  );

  // Calculate statistics
  const statistics = useMemo(() => {
    const totals = classStudents.map(student => {
      const data = scoresData[student.id];
      if (!data) return 0;
      
      if (isCrecheClass) {
        // CRECHE (Onyx): Only exam score matters
        return parseFloat(data.exam) || 0;
      } else {
        // Other classes: Standard calculation
        if (!data.ca1 || !data.ca2 || !data.exam) return 0;
        return (parseFloat(data.ca1) || 0) + (parseFloat(data.ca2) || 0) + (parseFloat(data.exam) || 0);
      }
    }).filter(t => t > 0);

    // Find student with highest score
    const highestScorer = classStudents.reduce((highest, student) => {
      const studentTotal = isCrecheClass 
        ? (parseFloat(scoresData[student.id]?.exam) || 0)
        : ((parseFloat(scoresData[student.id]?.ca1) || 0) + 
           (parseFloat(scoresData[student.id]?.ca2) || 0) + 
           (parseFloat(scoresData[student.id]?.exam) || 0));
      const highestTotal = highest ? (isCrecheClass
        ? (parseFloat(scoresData[highest.id]?.exam) || 0)
        : ((parseFloat(scoresData[highest.id]?.ca1) || 0) + 
           (parseFloat(scoresData[highest.id]?.ca2) || 0) + 
           (parseFloat(scoresData[highest.id]?.exam) || 0))) : 0;
      return studentTotal > highestTotal ? student : highest;
    }, null as typeof classStudents[0] | null);

    if (totals.length === 0) {
      return { average: 0, max: 0, min: 0, highestScorer: null };
    }

    return {
      average: (totals || []).length > 0 ? (totals.reduce((sum, t) => sum + t, 0) / (totals || []).length).toFixed(2) : '0.00',
      max: Math.max(...totals).toFixed(2),
      min: Math.min(...totals).toFixed(2),
      highestScorer
    };
  }, [scoresData, classStudents, isCrecheClass]);

  // Check if locked - only lock if admin has APPROVED scores or compiled results
  // Class teacher submission (Submitted status) does NOT lock scores
  // Only admin approval (Approved status) locks scores
  const isLocked = useMemo(() => {
    // Always allow editing in edit mode (after admin rejection)
    if (isEditMode) {
      console.log('Edit mode active - scores unlocked');
      return false;
    }
    
    // Check if any individual scores are approved by admin
    const hasApprovedScores = existingScores.some(s => s.status === 'Approved');
    
    // Also check if compiled results are approved by admin
    const hasApprovedCompiledResults = compiledResults.some((cr: any) => 
      cr.class_id === Number(selectedClassId) &&
      cr.term === selectedTerm &&
      cr.academic_year === selectedYear &&
      cr.status === 'Approved'
    );
    
    // Allow editing if there are rejected scores (admin rejected, needs correction)
    const hasRejectedScores = existingScores.some(s => s.status === 'Rejected');
    
    // Lock only if: (1) Any scores are approved AND (2) No rejected scores
    const locked = (hasApprovedScores || hasApprovedCompiledResults) && !hasRejectedScores;
    
    console.log('Score Lock Status Analysis:', {
      selectedClass: selectedClass?.name,
      selectedSubject: selectedAssignment?.subject_name,
      selectedTerm,
      selectedYear,
      isEditMode,
      hasApprovedScores,
      hasApprovedCompiledResults,
      hasRejectedScores,
      existingScoresCount: existingScores.length,
      approvedScoresCount: existingScores.filter(s => s.status === 'Approved').length,
      rejectedScoresCount: existingScores.filter(s => s.status === 'Rejected').length,
      compiledResultsCount: compiledResults.length,
      approvedCompiledResultsCount: compiledResults.filter((cr: any) => 
        cr.class_id === Number(selectedClassId) &&
        cr.term === selectedTerm &&
        cr.academic_year === selectedYear &&
        cr.status === 'Approved'
      ).length,
      finalLockedStatus: locked,
      lockReason: locked 
        ? 'Admin approved scores/compiled results - scores locked' 
        : hasRejectedScores 
        ? 'Rejected scores found - editing allowed'
        : (hasApprovedScores || hasApprovedCompiledResults)
        ? 'Admin approved - scores locked'
        : 'No admin approval - editing allowed'
    });
    
    return locked;
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear, isEditMode, existingScores, compiledResults, selectedClass, selectedAssignment]);

  // Check if there are any submitted scores to show status
  const hasSubmittedScores = useMemo(() => {
    return existingScores.some(s => s.status === 'Submitted');
  }, [existingScores]);

  // Initialize scores data when component loads or selection changes
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
    // Reset edit mode when selection changes
    setIsEditMode(false);
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedYear]);

  // Load existing scores when they change (but don't overwrite user input)
  useEffect(() => {
    if (existingScores.length > 0) {
      setScoresData(prev => {
        const updated = { ...prev };
        existingScores.forEach(score => {
          // Only load existing scores if user hasn't entered anything yet
          if (!prev[score.student_id] || 
              (!prev[score.student_id].ca1 && !prev[score.student_id].ca2 && !prev[score.student_id].exam)) {
            updated[score.student_id] = {
              ca1: score.ca1?.toString() || "",
              ca2: score.ca2?.toString() || "",
              exam: score.exam?.toString() || ""
            };
          }
        });
        console.log('Updated scoresData (preserving user input):', updated);
        return updated;
      });
    }
  }, [existingScores]); // Trigger when existingScores array changes

  // Debug: Force reload scores when component mounts
  useEffect(() => {
    console.log('ScoreEntryPage mounted, reloading scores from database...');
    // This will trigger the existingScores to update
    const reloadScores = async () => {
      try {
        await loadScoresFromAPI();
      } catch (error) {
        console.error('Failed to reload scores:', error);
      }
    };
    reloadScores();
  }, []); // Only run once on mount

  const handleScoreChange = (studentId: number, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    const numValue = parseFloat(value);
    let maxValue: number;
    
    if (isCrecheClass) {
      if (field !== 'exam') {
        toast.error(`CRECHE (Onyx) only allows exam scores`);
        return;
      }
      maxValue = 200;
    } else {
      maxValue = field === 'exam' ? 60 : 20;
    }
    
    if (value && (isNaN(numValue) || numValue < 0 || numValue > maxValue)) {
      toast.error(`${field.toUpperCase()} must be between 0 and ${maxValue}`);
      return;
    }

    setScoresData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  
  // Calculate score
  const calculateScore = useCallback((ca1: string, ca2: string, exam: string) => {
    if (isCrecheClass) {
      const examNum = parseFloat(exam) || 0;
      return { total: examNum.toFixed(2) };
    }
    const ca1Num = parseFloat(ca1) || 0;
    const ca2Num = parseFloat(ca2) || 0;
    const examNum = parseFloat(exam) || 0;
    return { total: (ca1Num + ca2Num + examNum).toFixed(2) };
  }, [isCrecheClass]);

  const getGrade = useCallback((total: string | number) => {
    const score = parseFloat(total.toString()) || 0;
    if (isCrecheClass) {
      if (score >= 150) return 'A';
      if (score >= 120) return 'B';
      if (score >= 100) return 'C';
      if (score >= 80) return 'D';
      if (score >= 60) return 'E';
      return 'F';
    }
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    if (score >= 30) return 'E';
    return 'F';
  }, [isCrecheClass]);

  const getRemark = useCallback((total: string | number) => {
    const score = parseFloat(total.toString()) || 0;
    if (isCrecheClass) {
      if (score >= 150) return 'Outstanding';
      if (score >= 120) return 'Excellent';
      if (score >= 100) return 'Very Good';
      if (score >= 80) return 'Good';
      if (score >= 60) return 'Fair';
      return 'Needs Improvement';
    }
    if (score >= 70) return 'Excellent';
    if (score >= 60) return 'Very Good';
    if (score >= 50) return 'Good';
    if (score >= 40) return 'Pass';
    if (score >= 30) return 'Fair';
    return 'Fail';
  }, [isCrecheClass]);

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      // Entering edit mode - show a message
      toast.info("Edit mode enabled. You can now modify submitted scores.");
    }
  };

  // Submit scores (Process Result)
  const handleSubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      toast.error("Please select class and subject");
      return;
    }

    const hasAnyScores = classStudents.some(student => {
      const data = scoresData[student.id];
      if (isCrecheClass) {
        return data && data.exam;
      }
      return data && (data.ca1 || data.ca2 || data.exam);
    });

    if (!hasAnyScores) {
      toast.error("Please enter scores for at least one student");
      return;
    }

    const assignment = teacherAssignments.find(
      a => a.subject_id === Number(selectedSubjectId) && a.class_id === Number(selectedClassId)
    );

    if (!assignment) {
      toast.error("Assignment not found");
      return;
    }

    const participatingStudents = classStudents.filter(student => {
      const data = scoresData[student.id];
      if (isCrecheClass) {
        return data && data.exam;
      }
      return data && (data.ca1 || data.ca2 || data.exam);
    });

    if (participatingStudents.length === 0) {
      toast.error("Please enter scores for at least one student");
      return;
    }

    const allTotals = participatingStudents.map(student => {
      const data = scoresData[student.id];
      if (!data) return 0;
      return isCrecheClass 
        ? parseFloat(data.exam) || 0
        : parseFloat(calculateScore(data.ca1, data.ca2, data.exam).total) || 0;
    });

    const classMax = Math.max(...allTotals);
    const classMin = Math.min(...allTotals);
    const classAverage = allTotals.reduce((sum, t) => sum + t, 0) / allTotals.length;

    const savePromises: Promise<number | void>[] = [];
    
    for (const student of participatingStudents) {
      const data = scoresData[student.id];
      let totalScore: number;
      
      if (isCrecheClass) {
        totalScore = parseFloat(data.exam) || 0;
      } else {
        totalScore = (parseFloat(data.ca1) || 0) + (parseFloat(data.ca2) || 0) + (parseFloat(data.exam) || 0);
      }
      
      const grade = getGrade(totalScore);
      const remark = getRemark(totalScore);
      
      const existingScore = existingScores.find(s => s.student_id === student.id);
      const scoreData = {
        student_id: student.id,
        subject_assignment_id: assignment.id,
        subject_name: assignment.subject_name || 'Unknown Subject',
        ca1: isCrecheClass ? 0 : (parseFloat(data.ca1) || 0),
        ca2: isCrecheClass ? 0 : (parseFloat(data.ca2) || 0),
        exam: parseFloat(data.exam) || 0,
        total: totalScore,
        class_average: Math.round(classAverage * 100) / 100,
        class_min: classMin,
        class_max: classMax,
        grade,
        remark,
        entered_by: currentUser?.id || 0,
        entered_date: new Date().toISOString(),
        term: selectedTerm as 'First Term' | 'Second Term' | 'Third Term',
        academic_year: selectedYear,
        status: isEditMode ? 'Submitted' : 'Submitted' as const
      };

      if (existingScore) {
        savePromises.push(updateScore(existingScore.id, scoreData));
      } else {
        savePromises.push(addScore(scoreData));
      }
    }

    try {
      await Promise.all(savePromises);
      
      if (isEditMode) {
        toast.success(`Scores updated successfully! ${participatingStudents.length} student(s) scores updated in database in real-time.`);
      } else {
        toast.success(`Scores submitted successfully! ${participatingStudents.length} student(s) scores saved to database in real-time.`);
      }
      
      await loadScoresFromAPI();
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'Failed to submit scores';
      
      if (errorMessage.includes('Access denied') || errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
        toast.error('Access denied: You can only submit scores for your own assignments.');
      } else {
        toast.error(`Failed to submit scores: ${errorMessage}`);
      }
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!selectedClassId || !selectedSubjectId || classStudents.length === 0) {
      toast.error("Please select class and subject with students");
      return;
    }

    // Different CSV headers for CRECHE vs other classes
    const csvHeader = isCrecheClass 
      ? `S/No,Reg ID,Student Name,Exams[100+],Total [100+]\n`
      : `S/No,Reg ID,Student Name,1st CA[20],2nd CA[20],Exams[60],Total [100]\n`;
    
    let csv = csvHeader;
    
    classStudents.forEach((student, index) => {
      const data = scoresData[student.id] || { ca1: '', ca2: '', exam: '' };
      const total = data.ca1 && data.ca2 && data.exam ? calculateScore(data.ca1, data.ca2, data.exam).total : 
                   data.exam ? calculateScore('', '', data.exam).total : '';
      
      if (isCrecheClass) {
        csv += `${index + 1},${student.admissionNumber},"${student.firstName} ${student.lastName}",${data.exam || ''},${total}\n`;
      } else {
        csv += `${index + 1},${student.admissionNumber},"${student.firstName} ${student.lastName}",${data.ca1 || ''},${data.ca2 || ''},${data.exam || ''},${total}\n`;
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

  // Resubmit rejected scores
  const handleResubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      toast.error("Please select class and subject");
      return;
    }

    const assignment = teacherAssignments.find(
      a => a.subject_id === Number(selectedSubjectId) && a.class_id === Number(selectedClassId)
    );

    if (!assignment) {
      toast.error("Assignment not found");
      return;
    }

    // Get only the rejected scores that have been modified
    const rejectedScores = existingScores.filter(s => s.status === 'Rejected');
    const modifiedRejectedScores = rejectedScores.filter(score => {
      const data = scoresData[score.student_id];
      if (!data) return false;
      
      const originalTotal = score.total;
      const newTotal = parseFloat(calculateScore(data.ca1, data.ca2, data.exam).total) || 0;
      
      // Check if any score values have changed
      return (
        (data.ca1 && parseFloat(data.ca1) !== score.ca1) ||
        (data.ca2 && parseFloat(data.ca2) !== score.ca2) ||
        (data.exam && parseFloat(data.exam) !== score.exam) ||
        newTotal !== originalTotal
      );
    });

    if (modifiedRejectedScores.length === 0) {
      toast.error("Please make corrections to at least one rejected score");
      return;
    }

    // Calculate class statistics for modified scores
    const allTotals = modifiedRejectedScores.map(score => {
      const data = scoresData[score.student_id];
      if (!data) return 0;
      return parseFloat(calculateScore(data.ca1, data.ca2, data.exam).total) || 0;
    });

    const classMax = Math.max(...allTotals);
    const classMin = Math.min(...allTotals);
    const classAverage = allTotals.reduce((sum, t) => sum + t, 0) / allTotals.length;

    // Update the rejected scores
    let resubmittedCount = 0;
    const updatePromises: Promise<void>[] = [];

    for (const score of modifiedRejectedScores) {
      const data = scoresData[score.student_id];
      if (!data) continue;

      const totalScore = parseFloat(calculateScore(data.ca1, data.ca2, data.exam).total) || 0;
      const grade = getGrade(totalScore);
      const remark = getRemark(totalScore);

      const scoreData = {
        ...score,
        ca1: parseFloat(data.ca1) || 0,
        ca2: parseFloat(data.ca2) || 0,
        exam: parseFloat(data.exam) || 0,
        total: totalScore,
        class_average: Math.round(classAverage * 100) / 100,
        class_min: classMin,
        class_max: classMax,
        grade,
        remark,
        entered_date: new Date().toISOString(),
        status: 'Submitted' as const,
        rejection_reason: undefined,
        rejected_by: undefined,
        rejected_date: undefined
      };

      updatePromises.push(updateScore(score.id, scoreData));
      resubmittedCount++;
    }

    try {
      console.log('Attempting to resubmit', resubmittedCount, 'rejected scores...');
      await Promise.all(updatePromises);
      console.log('All rejected scores resubmitted successfully');
      
      toast.success(`Rejected scores resubmitted successfully! ${resubmittedCount} score(s) corrected and sent for review.`);
      
      // Clear the scores data for resubmitted scores
      const newScoresData = { ...scoresData };
      modifiedRejectedScores.forEach(score => {
        delete newScoresData[score.student_id];
      });
      setScoresData(newScoresData);
      
      // Switch back to normal mode after resubmission
      setIsEditMode(false);
    } catch (error: unknown) {
      console.error('Error resubmitting scores:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to resubmit scores: ${errorMessage}`);
    }
  };

  const validateScore = useCallback((score: string, max: number, name: string) => {
    if (!score || score === '') return '';
    const num = parseFloat(score);
    if (isNaN(num) || num < 0 || num > max) {
      toast.error(`${name} must be between 0 and ${max}`);
      return null;
    }
    return num.toString();
  }, []);

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
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

        // Validate header - different for CRECHE vs other classes
        const header = lines[0].trim();
        const expectedCrecheHeader = 'S/No,Reg ID,Student Name,Exams[100+],Total [100+]';
        const expectedStandardHeader = 'S/No,Reg ID,Student Name,1st CA[20],2nd CA[20],Exams[60],Total [100]';
        
        if (isCrecheClass) {
          if (header !== expectedCrecheHeader) {
            toast.error("Invalid CSV format for CRECHE (Onyx). Please use the exported template format.");
            return;
          }
        } else {
          if (header !== expectedStandardHeader) {
            toast.error("Invalid CSV format. Please use the exported template format.");
            return;
          }
        }

        // Skip header
        const dataLines = lines.slice(1);
        let importedCount = 0;
        let errorCount = 0;
        const updatedScores: Record<number, { ca1: string; ca2: string; exam: string }> = {};

        dataLines.forEach((line, index) => {
          try {
            // Handle CSV with quoted strings and proper escaping
            const parts = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            parts.push(current.trim());

            const expectedColumns = isCrecheClass ? 5 : 7;
            if (parts.length < expectedColumns) {
              console.warn(`Line ${index + 2}: Insufficient columns (${parts.length} found, ${expectedColumns} expected)`);
              errorCount++;
              return;
            }

            let sno, regId, name, ca1, ca2, exam, total;
            
            if (isCrecheClass) {
              [sno, regId, name, exam, total] = parts.map(p => p.replace(/^"|"$/g, '').trim());
              ca1 = '';
              ca2 = '';
            } else {
              [sno, regId, name, ca1, ca2, exam, total] = parts.map(p => p.replace(/^"|"$/g, '').trim());
            }
            
            // Find student by registration number
            const student = classStudents.find(s => s.admissionNumber === regId);
            if (!student) {
              console.warn(`Line ${index + 2}: Student with Reg ID '${regId}' not found`);
              errorCount++;
              return;
            }

            let cleanCa1 = '', cleanCa2 = '', cleanExam = '';
            
            if (isCrecheClass) {
              // CRECHE: Only validate exam score
              const examResult = validateScore(exam, 200, 'Exam');
              cleanExam = examResult !== null ? examResult : '';
              if (examResult === null) {
                errorCount++;
                return;
              }
            } else {
              // Other classes: Validate all scores
              const ca1Result = validateScore(ca1, 20, '1st CA');
              const ca2Result = validateScore(ca2, 20, '2nd CA');
              const examResult = validateScore(exam, 60, 'Exam');
              
              cleanCa1 = ca1Result !== null ? ca1Result : '';
              cleanCa2 = ca2Result !== null ? ca2Result : '';
              cleanExam = examResult !== null ? examResult : '';

              if (ca1Result === null || ca2Result === null || examResult === null) {
                errorCount++;
                return;
              }
            }

            // Validate total if provided
            if (total && total !== '') {
              let expectedTotal: string;
              
              if (isCrecheClass) {
                expectedTotal = cleanExam ? cleanExam : '';
              } else {
                expectedTotal = cleanCa1 && cleanCa2 && cleanExam 
                  ? (parseFloat(cleanCa1) + parseFloat(cleanCa2) + parseFloat(cleanExam)).toFixed(2)
                  : '';
              }
              
              if (expectedTotal && Math.abs(parseFloat(total) - parseFloat(expectedTotal)) > 0.01) {
                console.warn(`Line ${index + 2}: Total mismatch (expected: ${expectedTotal}, provided: ${total})`);
                // Don't fail import for total mismatch, just warn
              }
            }

            updatedScores[student.id] = {
              ca1: cleanCa1 || '',
              ca2: cleanCa2 || '',
              exam: cleanExam || ''
            };
            importedCount++;
          } catch (error) {
            console.error(`Line ${index + 2}: Error processing line - ${error}`);
            errorCount++;
          }
        });

        // Update scores data in batch
        setScoresData(prev => ({ ...prev, ...updatedScores }));

        // Show results
        if (importedCount > 0) {
          toast.success(`Successfully imported ${importedCount} student scores`);
        }
        if (errorCount > 0) {
          toast.warning(`${errorCount} entries had errors and were skipped. Check console for details.`);
        }
        if (importedCount === 0 && errorCount === 0) {
          toast.info("No valid student records found in CSV");
        }
      } catch (error) {
        console.error('CSV import error:', error);
        toast.error('Failed to process CSV file. Please check file format.');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] p-6">
      {/* Header Section */}
      <div className="mb-6">
        {/* Edit Mode Indicator */}
        {isEditMode && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-3 h-3 mr-2 text-amber-600" />
              <span className="text-amber-800 font-medium text-sm">Edit Mode Enabled</span>
              <span className="ml-2 text-amber-600 text-xs">- You can modify submitted scores</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[#2563EB] mb-1">✏️ STUDENTS ASSESSMENT SCORE</h2>
            <p className="text-[#6B7280]">
              {currentTerm.toUpperCase()} - {currentAcademicYear}
            </p>
          </div>
          
                    
          <div className="flex gap-3">
            <Button
              onClick={() => {
                toast.success("Refreshing scores from database");
                loadScoresFromAPI();
              }}
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg"
              disabled={!selectedClassId || !selectedSubjectId}
            >
              <Users className="w-3 h-3 mr-2" />
              Refresh Scores
            </Button>
            
            <Button
              onClick={() => {
                toast.success("Exporting scores to Excel");
                handleExportExcel();
              }}
              className="bg-[#06B6D4] hover:bg-[#0891B2] text-white rounded-lg"
              disabled={!selectedClassId || !selectedSubjectId}
            >
              <Save className="w-3 h-3 mr-2" />
              Export to Excel
            </Button>
            
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportExcel}
                className="hidden"
                disabled={!selectedClassId || !selectedSubjectId}
                id="csv-upload-input"
              />
              <Button
                type="button"
                className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg"
                disabled={!selectedClassId || !selectedSubjectId}
                onClick={() => {
                  toast.success("Opening CSV file selector");
                  document.getElementById('csv-upload-input')?.click();
                }}
              >
                <BookOpen className="w-3 h-3 mr-2" />
                Import CSV File
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Section */}
      <Card className="mb-6 rounded-xl bg-white border border-[#E5E7EB]">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Select Class</Label>
              <Select value={selectedClassId} onValueChange={(value: string) => {
                setSelectedClassId(value);
                setSelectedSubjectId("");
              }}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue placeholder="Choose a class">
                    {selectedClassId ? assignedClasses.find(c => c.id.toString() === selectedClassId)?.name || "Choose class" : "Choose a class"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assignedClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Display selected class name */}
              {selectedClassId && (
                <div className="mt-1 text-sm text-gray-600">
                  Selected: {assignedClasses.find(c => c.id.toString() === selectedClassId)?.name}
                </div>
              )}
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Select Subject</Label>
              <Select 
                value={selectedSubjectId} 
                onValueChange={setSelectedSubjectId}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]" disabled={!selectedClassId}>
                  <SelectValue placeholder="Choose a subject">
                    {selectedSubjectId ? availableSubjects.find(s => s.subject_id.toString() === selectedSubjectId)?.subject_name || "Choose subject" : "Choose a subject"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject.subject_id} value={subject.subject_id.toString()}>
                      {subject.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Display selected subject name */}
              {selectedSubjectId && (
                <div className="mt-1 text-sm text-gray-600">
                  Selected: {availableSubjects.find(s => s.subject_id.toString() === selectedSubjectId)?.subject_name}
                </div>
              )}
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Select Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue placeholder="Choose term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue placeholder="Choose year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                  <SelectItem value="2026/2027">2026/2027</SelectItem>
                  <SelectItem value="2027/2028">2027/2028</SelectItem>
                  <SelectItem value="2028/2029">2028/2029</SelectItem>
                  <SelectItem value="2029/2030">2029/2030</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {selectedClassId && selectedSubjectId && classStudents.length > 0 ? (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-lg">
          <CardHeader className="border-b border-[#E5E7EB] bg-white p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">GRA</span>
                </div>
                <h1 className="text-[#1F2937] mb-1">Graceland Royal Academy</h1>
                <p className="text-[#6B7280] text-sm">Student's Assessment Score - {selectedTerm.toUpperCase()} - {selectedYear}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-[#F9FAFB] p-4 rounded-lg">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Class Name</p>
                <p className="text-sm text-[#1F2937]">{selectedClass?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Subject</p>
                <p className="text-sm text-[#1F2937]">{selectedAssignment?.subject_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Average Score</p>
                <p className="text-sm text-[#1F2937]">{statistics.average}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Max:</p>
                <p className="text-sm text-[#1F2937]">{statistics.max}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Min:</p>
                <p className="text-sm text-[#1F2937]">{statistics.min}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Highest Scorer</p>
                <p className="text-sm text-[#1F2937] font-semibold text-green-600">
                  {statistics.highestScorer ? 
                    `${statistics.highestScorer.firstName} ${statistics.highestScorer.lastName}` : 
                    '-'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#6B7280] mb-1">Teacher</p>
                <p className="text-sm text-[#1F2937]">{currentTeacher ? `${currentTeacher.firstName || ''} ${currentTeacher.lastName || ''}`.toUpperCase() : 'TEACHER'}</p>
              </div>
            </div>

            {/* Auto-save Status */}
            {autoSaveStatus && (
              <div className="mt-4 flex items-center justify-center">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  autoSaveStatus === 'All changes saved' 
                    ? 'bg-green-100 text-green-700' 
                    : autoSaveStatus === 'Saving...'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <span className="w-4 h-4" />
                  {autoSaveStatus}
                </div>
              </div>
            )}

            {/* Lock Status Indicator */}
            {isLocked && (
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                  <span className="w-4 h-4" />
                  Scores locked - Admin has approved results
                </div>
              </div>
            )}

            {/* Freeze Status Indicator */}
            {hasSubmittedScores && !isLocked && (
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                  <span className="w-4 h-4" />
                  Scores submitted - Editing allowed until admin approval
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {/* Rejected Scores Alert */}
            {existingScores.some(s => s.status === 'Rejected') && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Rejected Scores Found
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>You have {existingScores.filter(s => s.status === 'Rejected').length} rejected score(s) that need correction. Make the necessary changes and click "Resubmit Corrected Scores".</p>
                      {existingScores.filter(s => s.status === 'Rejected').map(score => (
                        <div key={score.id} className="mt-2 p-2 bg-white rounded border border-red-200">
                          <p className="font-medium">{students.find(s => s.id === score.student_id)?.firstName} {students.find(s => s.id === score.student_id)?.lastName}</p>
                          {score.rejection_reason && (
                            <p className="text-xs text-gray-600 mt-1">Reason: {score.rejection_reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Rejected Scores Message */}
            {!existingScores.some(s => s.status === 'Rejected') && existingScores.length > 0 && selectedClassId && selectedSubjectId && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 m-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      No Rejected Scores
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Great! All your scores for this class and subject have been approved.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="text-left p-2 text-xs text-[#1F2937]">S/No.</th>
                    <th className="text-left p-2 text-xs text-[#1F2937]">Reg ID</th>
                    <th className="text-left p-2 text-xs text-[#1F2937]">Student Name</th>
                    {!isCrecheClass && (
                      <>
                        <th className="text-center p-2 text-xs text-[#1F2937]">1st CA[20]</th>
                        <th className="text-center p-2 text-xs text-[#1F2937]">2nd CA[20]</th>
                      </>
                    )}
                    <th className="text-center p-2 text-xs text-[#1F2937]">
                      {isCrecheClass ? 'Exams[100+]' : 'Exams[60]'}
                    </th>
                    <th className="text-center p-2 text-xs text-[#1F2937]">Total [{isCrecheClass ? '100+' : '100'}]</th>
                    <th className="text-center p-2 text-xs text-[#1F2937]">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => {
                    const data = scoresData[student.id] || { ca1: '', ca2: '', exam: '' };
                    const studentScore = existingScores.find(s => s.student_id === student.id);
                    
                    // Check if this specific student's score should be locked
                    // Allow editing for all scores until results are compiled and submitted to admin
                    // Only lock when results have been compiled and submitted (isLocked handles this)
                    const isStudentLocked = isLocked;
                    
                    // Always show submitted scores in input fields to avoid confusion
                    // Keep them visible but locked until results are compiled and submitted
                    const displayData = studentScore ? {
                      ca1: studentScore.ca1.toString(),
                      ca2: studentScore.ca2.toString(),
                      exam: studentScore.exam.toString()
                    } : data;
                    
                    // Debug logging for score display
                    console.log(`=== SCORE DISPLAY DEBUG ===`);
                    console.log(`Student: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
                    console.log(`studentScore:`, studentScore);
                    console.log(`scoresData[${student.id}]:`, data);
                    console.log(`displayData:`, displayData);
                    console.log(`studentScore status:`, studentScore?.status);
                    
                    const { total } = calculateScore(displayData.ca1, displayData.ca2, displayData.exam);
                    const hasScore = displayData.ca1 || displayData.ca2 || displayData.exam;
                    
                    // Debug logging for first few students
                    if (index < 3) {
                      console.log(`Student ${index + 1} lock debug:`, {
                        studentId: student.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        scoreStatus: studentScore?.status || 'No score',
                        hasScore: !!studentScore,
                        isEditMode,
                        isStudentLocked,
                        canEdit: !isStudentLocked
                      });
                    }

                    return (
                      <tr key={student.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-2 text-xs text-[#6B7280]">{index + 1}</td>
                        <td className="p-2 text-xs text-[#1F2937]">{student.admissionNumber}</td>
                        <td className="p-2 text-xs text-[#2563EB]">
                          {student.firstName} {student.lastName} {student.otherName || ''}
                        </td>
                        {!isCrecheClass && (
                          <>
                            <td className="p-1 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="20"
                                value={displayData.ca1}
                                onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                                className="w-16 mx-auto text-center rounded-lg border-[#E5E7EB] text-xs"
                                disabled={isStudentLocked}
                                placeholder="0"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="20"
                                value={displayData.ca2}
                                onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                                className="w-16 mx-auto text-center rounded-lg border-[#E5E7EB] text-xs"
                                disabled={isStudentLocked}
                                placeholder="0"
                              />
                            </td>
                          </>
                        )}
                        <td className="p-1 text-center">
                          <Input
                            type="number"
                            min="0"
                            max={isCrecheClass ? "150" : "60"}
                            value={displayData.exam}
                            onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                            className="w-16 mx-auto text-center rounded-lg border-[#E5E7EB] text-xs"
                            disabled={isStudentLocked}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <span className={`text-xs ${hasScore ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
                            {hasScore ? total : '0'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`text-xs font-bold ${
                            parseFloat(total) >= 70 ? 'text-green-600' : 
                            parseFloat(total) >= 60 ? 'text-blue-600' : 
                            parseFloat(total) >= 50 ? 'text-yellow-600' : 
                            parseFloat(total) >= 40 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {getGrade(total)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <Button
                variant="outline"
                className="rounded-lg border-[#E5E7EB] text-[#6B7280]"
                onClick={() => {
                  toast.success("Resetting score entry form");
                  // Reset form
                  setScoresData({});
                  setIsEditMode(false);
                }}
              >
                Cancel
              </Button>
              
              {existingScores.some(s => s.status === 'Rejected') && !isEditMode ? (
                <Button
                  onClick={() => {
                    toast.success("Enabling edit mode for rejected scores");
                    toggleEditMode();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Enable Edit Mode
                </Button>
              ) : existingScores.some(s => s.status === 'Rejected') && isEditMode ? (
                <Button
                  onClick={() => {
                    toast.success("Resubmitting corrected scores");
                    handleResubmit();
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  disabled={isLocked || !selectedClassId || !selectedSubjectId}
                >
                  <Check className="w-3 h-3 mr-2" />
                  Resubmit Corrected Scores
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    toast.success(isEditMode ? "Updating scores" : "Submitting scores");
                    handleSubmit();
                  }}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg"
                  disabled={isLocked || !selectedClassId || !selectedSubjectId}
                >
                  {isEditMode ? <Check className="w-3 h-3 mr-2" /> : <Check className="w-3 h-3 mr-2" />}
                  {isEditMode ? 'Update Scores' : 'Submit'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl bg-white border border-[#E5E7EB]">
          <CardContent className="p-12 text-center">
            <p className="text-[#6B7280] mb-2">Please select a class and subject to begin</p>
            <p className="text-sm text-[#9CA3AF]">Your assigned classes and subjects will appear in the dropdowns above</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-[#6B7280]">Graceland Royal Academy</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Techvibes International Limited © - 2025</p>
      </div>
    </div>
  );
}
