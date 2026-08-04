import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useSchool } from "../../contexts/SchoolContext";
import { StudentResultCardProps } from './types/resultCard';
import { API_CONFIG } from "../../config/api";
import { formatPositionWithSuffix } from "../../utils/position";
import { generateQrDataUrl } from "../../utils/qrCode";

// Add print styles
const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  .print-content, .print-content * {
    visibility: visible;
  }
  .print-content {
    position: absolute;
    left: 0;
    top: 0;
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    border: none;
    overflow: hidden;
  }
  @page {
    size: A4;
    margin: 0;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
}

@media screen and (max-width: 640px) {
  .print-container {
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 12px !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  .print-content {
    position: static !important;
    left: auto !important;
    top: auto !important;
    width: 100% !important;
    height: auto !important;
    padding: 0 !important;
  }

  .print-table {
    width: 100% !important;
    font-size: 10px !important;
  }

  .print-table th,
  .print-table td {
    padding: 4px !important;
    font-size: 10px !important;
  }
}
`;

const fetchScoresByTerm = async (term: string, academicYear: string): Promise<any[]> => {
  const token = localStorage.getItem('jwt_token');
  const endpoint = `${API_CONFIG.BASE_URL}/results/scores/by-term?term=${encodeURIComponent(String(term))}&academic_year=${encodeURIComponent(String(academicYear))}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const json = await response.json();
  const rows = (json as any)?.data;
  return Array.isArray(rows) ? rows : [];
};

const StudentResultCardInner = ({
  student: propStudent,
  studentClass: propStudentClass,
  result,
  detailedScores: propDetailedScores,
  showActions = false,
  onDownload,
  currentUser
}: StudentResultCardProps) => {
  const { schoolSettings, students, classes, teachers, scores, subjectAssignments, subjects, affectiveDomains, psychomotorDomains, compiledResults, loadCompiledResultsFromAPI, loadScoresFromAPI, loadSubjectAssignmentsFromAPI, loadSubjectsFromAPI, loadAffectiveDomainsFromAPI, loadPsychomotorDomainsFromAPI, getClassTeacher } = useSchool();
  const [_showDetails, _setShowDetails] = useState(false);
  const [detailedScoresData, setDetailedScoresData] = useState<any[]>([]);
  const [signatureResumptionDate, setSignatureResumptionDate] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    const term = String((result as any)?.term ?? '').trim();
    const academicYear = String((result as any)?.academic_year ?? '').trim();
    if (term !== 'Third Term' || !academicYear) return;

    // Ensure we have all Approved compiled results for the session year so
    // promotion status (session average + attendance) can be computed.
    loadCompiledResultsFromAPI?.('Approved', null, academicYear);
  }, [(result as any)?.term, (result as any)?.academic_year]);

  useEffect(() => {
    let isMounted = true;
    const loadSignatureResumptionDate = async () => {
      try {
        const academicYear = String((result as any)?.academic_year || '');

        const term = String((result as any)?.term || '');
        if (!academicYear || !term) return;

        const token = localStorage.getItem('jwt_token');
        const query = new URLSearchParams({ academic_year: academicYear, term });
        const response = await fetch(`${API_CONFIG.BASE_URL}/signature_settings.php?${query.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const json = await response.json();
        const date = String((json as any)?.data?.resumption_date ?? '').trim();
        const normalized = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : date;
        if (isMounted) setSignatureResumptionDate(normalized);
      } catch {
        if (isMounted) setSignatureResumptionDate('');
      }
    };

    loadSignatureResumptionDate();
    return () => {
      isMounted = false;
    };
  }, [(result as any)?.academic_year, (result as any)?.term]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const studentId = Number((result as any)?.student_id ?? (propStudent as any)?.id ?? 0);
        const resultId = Number((result as any)?.id ?? 0);
        const term = String((result as any)?.term ?? '').trim();
        const academicYear = String((result as any)?.academic_year ?? '').trim();
        const averageScoreRaw = (result as any)?.average_score ?? (result as any)?.averageScore ?? '';
        const averageScore = String(averageScoreRaw).trim();

        if (!studentId || !resultId || !term || !academicYear) {
          if (!cancelled) setQrCodeDataUrl('');
          return;
        }

        const payload = JSON.stringify({
          result_id: resultId,
          student_id: studentId,
          term,
          academic_year: academicYear,
          average_score: averageScore,
        });

        const url = await generateQrDataUrl(payload, 220);
        if (!cancelled) setQrCodeDataUrl(url);
      } catch {
        if (!cancelled) setQrCodeDataUrl('');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [result, propStudent]);

  // Add print styles to document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Handle print function
  const handlePrint = () => {
    window.print();
  };

  // Load detailed scores when component mounts or result changes
  useEffect(() => {
    if (result && result.student_id) {
      loadDetailedScores();
      loadDomainData();
    }
  }, [result]); // Remove scores from dependencies to prevent infinite loop

  // Load affective and psychomotor domain data
  const loadDomainData = async () => {
    if (!result || !result.student_id) return;

    try {
      // Ensure domain data is loaded
      await Promise.all([
        affectiveDomains.length === 0 && loadAffectiveDomainsFromAPI(),
        psychomotorDomains.length === 0 && loadPsychomotorDomainsFromAPI()
      ]);
    } catch (error) {
      // Silently handle domain data loading error in production
    }
  };

  // Get student's affective domain data
  const getStudentAffectiveData = () => {
    if (!result || !result.student_id) return {} as any;

    // Prefer domain data already embedded in the compiled result payload.
    // This is required for parent accounts because parents are not allowed
    // to query the domain tables directly.
    if ((result as any)?.affective && typeof (result as any).affective === 'object') {
      return (result as any).affective as any;
    }
    
    const safeAffectiveDomains = Array.isArray(affectiveDomains) ? affectiveDomains : [];
    const studentAffective = safeAffectiveDomains.find(domain => 
      domain.student_id === result.student_id &&
      domain.academic_year === result.academic_year &&
      domain.term === result.term
    );
    
    return studentAffective || {} as any;
  };

  // Get student's psychomotor domain data
  const getStudentPsychomotorData = () => {
    if (!result || !result.student_id) return {} as any;

    // Prefer domain data already embedded in the compiled result payload.
    // This is required for parent accounts because parents are not allowed
    // to query the domain tables directly.
    if ((result as any)?.psychomotor && typeof (result as any).psychomotor === 'object') {
      return (result as any).psychomotor as any;
    }
    
    const safePsychomotorDomains = Array.isArray(psychomotorDomains) ? psychomotorDomains : [];
    const studentPsychomotor = safePsychomotorDomains.find(domain => 
      domain.student_id === result.student_id &&
      domain.academic_year === result.academic_year &&
      domain.term === result.term
    );
    
    return studentPsychomotor || {} as any;
  };

  const loadDetailedScores = async () => {
    if (!result || !result.student_id) return;

    try {
      const termToUse = (result as any)?.term ?? null;
      const yearToUse = (result as any)?.academic_year ?? null;

      const safeScoresBefore = Array.isArray(scores) ? scores : [];
      const safeAssignmentsBefore = Array.isArray(subjectAssignments) ? subjectAssignments : [];

      const hasScoresForTermYear = !!(termToUse && yearToUse) && safeScoresBefore.some((s: any) =>
        String((s as any)?.term) === String(termToUse) && String((s as any)?.academic_year) === String(yearToUse)
      );

      const hasAssignmentsForTermYear = !!(termToUse && yearToUse) && safeAssignmentsBefore.some((sa: any) =>
        String((sa as any)?.term) === String(termToUse) && String((sa as any)?.academic_year) === String(yearToUse)
      );

      // Ensure all necessary data is loaded
      await Promise.all([
        (!hasScoresForTermYear) && loadScoresFromAPI(termToUse, yearToUse),
        (!hasAssignmentsForTermYear) && loadSubjectAssignmentsFromAPI(false, termToUse, yearToUse),
        subjects.length === 0 && loadSubjectsFromAPI()
      ]);

      const safeTeachers = Array.isArray(teachers) ? teachers : [];
      const safeSubjectAssignments = Array.isArray(subjectAssignments) ? subjectAssignments : [];
      const safeSubjects = Array.isArray(subjects) ? subjects : [];
      const safeScores = Array.isArray(scores) ? scores : [];

      // Filter scores for this student, class, term, and academic year
      let studentScores = safeScores.filter(score => 
        score.student_id === result.student_id &&
        score.academic_year === result.academic_year &&
        score.term === result.term
      );

      // For parent view: if context hasn't populated yet (state timing), fetch directly as fallback.
      if ((!propDetailedScores || propDetailedScores.length === 0) && (!result.scores || result.scores.length === 0) && studentScores.length === 0) {
        const term = String((result as any)?.term || '').trim();
        const year = String((result as any)?.academic_year || '').trim();
        if (term && year) {
          const rows = await fetchScoresByTerm(term, year);
          studentScores = rows
            .filter((r: any) => Number(r?.student_id) === Number((result as any)?.student_id))
            .map((score: any) => ({
              ...score,
              subject_name: score.subject_name || 'Unknown Subject',
              subject_teacher: score.teacher_name || score.subject_teacher || 'Not Assigned',
              class_average: score.class_average || 0,
              class_minimum: score.class_minimum || 0,
              class_maximum: score.class_maximum || 0,
              first_ca: score.first_ca ?? score.ca1 ?? 0,
              second_ca: score.second_ca ?? score.ca2 ?? 0,
              exams: score.exams ?? score.exam ?? 0,
              total: score.total ?? 0,
            }))
            .sort((a: any, b: any) => String(a.subject_name).localeCompare(String(b.subject_name)));
        }
      }

      // Enhance scores with subject information and calculate class statistics
      studentScores = studentScores.map(score => {
        const subjectAssignment = safeSubjectAssignments.find(sa => sa.id === score.subject_assignment_id);
        const subject = subjectAssignment ? safeSubjects.find(s => s.id === subjectAssignment.subject_id) : null;
        const teacher = subjectAssignment ? safeTeachers.find(t => t.id === subjectAssignment.teacher_id) : null;

        // Calculate class statistics for this subject
        const classScores = safeScores.filter(s => {
          const assignment = safeSubjectAssignments.find(sa => sa.id === s.subject_assignment_id);
          return assignment && 
                 assignment.subject_id === subjectAssignment?.subject_id &&
                 s.academic_year === result.academic_year &&
                 s.term === result.term &&
                 s.total > 0;
        });

        const validScores = classScores.map(cs => cs.total || 0);
        const classAverage = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
        const classMinimum = validScores.length > 0 ? Math.min(...validScores) : 0;
        const classMaximum = validScores.length > 0 ? Math.max(...validScores) : 0;

        return {
          ...score,
          subject_name: subject ? subject.name : score.subject_name || 'Unknown Subject',
          subject_teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned',
          class_average: parseFloat(classAverage.toFixed(2)),
          class_minimum: classMinimum,
          class_maximum: classMaximum
        };
      }).sort((a, b) => a.subject_name.localeCompare(b.subject_name));

      // If we have detailedScores in props, use them, otherwise use result.scores or filtered scores
      if (propDetailedScores && propDetailedScores.length > 0) {
        setDetailedScoresData(propDetailedScores);
      } else if (result.scores && result.scores.length > 0) {
        // Enhance result scores with subject information too
        const enhancedResultScores = result.scores.map((score: any) => {
          const subjectAssignment = safeSubjectAssignments.find(sa => sa.id === score.subject_assignment_id);
          const subject = subjectAssignment ? safeSubjects.find(s => s.id === subjectAssignment.subject_id) : null;
          const teacher = subjectAssignment ? safeTeachers.find(t => t.id === subjectAssignment.teacher_id) : null;

          // Calculate class statistics for this subject
          const classScores = safeScores.filter(s => {
            const assignment = safeSubjectAssignments.find(sa => sa.id === s.subject_assignment_id);
            return assignment && 
                   assignment.subject_id === subjectAssignment?.subject_id &&
                   s.academic_year === result.academic_year &&
                   s.term === result.term &&
                   s.total > 0;
          });

          const validScores = classScores.map(cs => cs.total || 0);
          const classAverage = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
          const classMinimum = validScores.length > 0 ? Math.min(...validScores) : 0;
          const classMaximum = validScores.length > 0 ? Math.max(...validScores) : 0;
          
          return {
            ...score,
            subject_name: subject ? subject.name : score.subject_name || 'Unknown Subject',
            subject_teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned',
            class_average: parseFloat(classAverage.toFixed(2)),
            class_minimum: classMinimum,
            class_maximum: classMaximum
          };
        }).sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
        setDetailedScoresData(enhancedResultScores);
      } else {
        setDetailedScoresData(studentScores);
      }
    } catch (error) {
      // Silently handle detailed scores loading error in production
      setDetailedScoresData([]);
    }
  };

  // Use props or find from context if not provided
  const safeStudents = Array.isArray(students) ? students : [];
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const _safeSubjectAssignments = Array.isArray(subjectAssignments) ? subjectAssignments : [];
  const _safeSubjects = Array.isArray(subjects) ? subjects : [];
  const _safeScores = Array.isArray(scores) ? scores : [];
  
  const studentData = propStudent || safeStudents.find(s => String((s as any).id) === String((result as any)?.student_id));

  const resolvedClassId =
    (result as any)?.class_id ??
    (result as any)?.classId ??
    (studentData as any)?.class_id ??
    (studentData as any)?.classId;

  const studentClassData =
    propStudentClass ||
    safeClasses.find(c => String((c as any).id) === String(resolvedClassId));

  const classNameForPosition = (studentClassData as any)?.name || '';
  const shouldShowPosition = classNameForPosition &&
    !['CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)', 'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)', 'KG 2 (PEARL)'].includes(String(classNameForPosition).toUpperCase());

  const studentDobText =
    (studentData as any)?.date_of_birth ||
    (studentData as any)?.dateOfBirth ||
    '';

  const totalStudentsInClass = (() => {
    const fromResult =
      (result as any)?.total_students ??
      (result as any)?.totalStudents ??
      (studentData as any)?.total_students ??
      (studentData as any)?.totalStudents;
    const numericFromResult = Number(fromResult);
    if (Number.isFinite(numericFromResult) && numericFromResult > 0) {
      return numericFromResult;
    }

    return safeStudents.filter((s: any) => {
      const sClassId = (s as any)?.class_id ?? (s as any)?.classId;
      if (resolvedClassId === undefined || resolvedClassId === null || resolvedClassId === '') return false;
      if (Number(sClassId) !== Number(resolvedClassId)) return false;
      const status = String((s as any)?.status || '').toLowerCase();
      if (status === 'inactive') return false;
      return true;
    }).length;
  })();

  const classTextForSection = String(
    (studentClassData as any)?.level ||
      (studentClassData as any)?.section ||
      (studentClassData as any)?.name ||
      ''
  ).toLowerCase();

  const isSecondarySection =
    (studentClassData as any)?.category === 'Secondary' ||
    classTextForSection.includes('jss') ||
    classTextForSection.includes('ss');

  const signatureTitle = isSecondarySection ? 'PRINCIPAL' : 'HEAD TEACHER';
  const signatureName = isSecondarySection
    ? ((schoolSettings as any)?.principal_name || '_________________')
    : ((schoolSettings as any)?.head_teacher_name || '_________________');
  const signatureComment = isSecondarySection
    ? ((schoolSettings as any)?.principal_comment || 'Principal comment will appear here.')
    : ((schoolSettings as any)?.head_teacher_comment || 'Head teacher comment will appear here.');
  const signatureImageUrl = isSecondarySection
    ? (schoolSettings as any)?.principal_signature
    : (schoolSettings as any)?.head_teacher_signature;

  const resolvedStudentName =
    (studentData as any)?.fullName ||
    [
      (studentData as any)?.firstName,
      (studentData as any)?.otherName,
      (studentData as any)?.lastName
    ]
      .filter((p: any) => String(p || '').trim() !== '')
      .join(' ')
      .trim();

  // Get class teacher name
  const getClassTeacherName = () => {
    // First priority: Use the teacher name from compiled results (stored in database)
    if (result?.class_teacher_name && result.class_teacher_name.trim() !== '') {
      return result.class_teacher_name;
    }
    
    // Second priority: The class teacher name is already loaded in the class data as 'classTeacher'
    if (studentClassData?.classTeacher) {
      return studentClassData.classTeacher;
    }
    
    // Third priority: If class_teacher_id exists, find the teacher
    if (studentClassData?.classTeacherId) {
      const classTeacher = safeTeachers.find((t: any) => t.id === studentClassData.classTeacherId);
      if (classTeacher) {
        return `${classTeacher.firstName} ${classTeacher.lastName}`;
      }
    }
    
    // Fourth priority: Get the assigned class teacher for this class (fallback)
    if (studentClassData?.id) {
      const assignedClassTeacher = getClassTeacher(studentClassData.id);
      if (assignedClassTeacher) {
        return `${assignedClassTeacher.firstName} ${assignedClassTeacher.lastName}`;
      }
    }
    
    // Final fallback: Return placeholder
    return '_________________';
  };

  // Calculate grade based on score - matching your design scale
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', remark: 'Excellent' };
    if (score >= 80) return { grade: 'B', remark: 'Very Good' };
    if (score >= 70) return { grade: 'C', remark: 'Good' };
    if (score >= 60) return { grade: 'D', remark: 'Satisfactory' };
    if (score >= 50) return { grade: 'E', remark: 'Fair' };
    return { grade: 'F', remark: 'Fail' };
  };

  // Get affective domain remark
  const getAffectiveRemark = (score: number) => {
    if (score === 5) return 'Excellent';
    if (score === 4) return 'Very Good';
    if (score === 3) return 'Good';
    if (score === 2) return 'Fair';
    return 'Poor';
  };

  const resolveDomainScoreText = (value: any): string => {
    if (value === 0 || value === '0') return '0';
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value);
  };

  const resolveDomainRemark = (value: any): string => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return getAffectiveRemark(n);
  };

  // Helper function to convert database field names to complete readable names
  const getDomainName = (key: string): string => {
    // Affective domain mappings
    const affectiveMappings: Record<string, string> = {
      'attentiveness': 'Attentiveness',
      'honesty': 'Honesty',
      'neatness': 'Neatness',
      'obedience': 'Obedience',
      'sense_of_responsibility': 'Sense of Responsibility'
    };

    // Psychomotor domain mappings
    const psychomotorMappings: Record<string, string> = {
      'attention_to_direction': 'Attention to Direction',
      'considerate_of_others': 'Considerate of Others',
      'handwriting': 'Handwriting',
      'sports': 'Sports',
      'verbal_fluency': 'Verbal Fluency',
      'works_well_independently': 'Works Well Independently'
    };

    // Return the mapped name or format the key as fallback
    return affectiveMappings[key] || psychomotorMappings[key] || key.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
  };

  // Check if user can download/print (admin only or approved for parents)
  const _canDownloadPrint = currentUser?.role === 'admin' || result.print_approved;

  const getStudentPhotoCandidates = (s: any): string[] => {
    const raw =
      s?.photo_url ||
      s?.photoUrl ||
      s?.photoURL ||
      s?.passportPhoto ||
      s?.passport_photo ||
      s?.passport;

    if (!raw || typeof raw !== 'string') return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return [trimmed];

    let apiOrigin = '';
    try {
      apiOrigin = API_CONFIG?.BASE_URL ? new URL(API_CONFIG.BASE_URL).origin : '';
    } catch {
      apiOrigin = '';
    }
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

    const candidates = [
      appOrigin ? `${appOrigin}${normalizedPath}` : '',
      apiOrigin ? `${apiOrigin}${normalizedPath}` : '',
      trimmed,
    ].filter(Boolean);

    return Array.from(new Set(candidates));
  };

  const handleStudentPhotoError = (e: React.SyntheticEvent<HTMLImageElement>, s: any) => {
    const img = e.currentTarget;
    const candidates = getStudentPhotoCandidates(s);
    const idx = Number(img.dataset.candidateIdx || '0');
    const nextIdx = idx + 1;
    if (nextIdx < candidates.length) {
      img.dataset.candidateIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };

  const sessionPromotion = (() => {
    try {
      const term = String((result as any)?.term ?? '');
      const academicYear = String((result as any)?.academic_year ?? '');
      const studentId = Number((result as any)?.student_id ?? (propStudent as any)?.id ?? 0);
      if (term !== 'Third Term' || !academicYear || !studentId) return null;

      const TERMS = ['First Term', 'Second Term', 'Third Term'];
      const sessionResults = (compiledResults || []).filter((r: any) =>
        Number(r.student_id) === studentId &&
        String(r.academic_year) === academicYear &&
        r.status === 'Approved' &&
        TERMS.includes(String(r.term))
      );

      const termAverages = sessionResults
        .map((r: any) => {
          const raw = (r as any)?.average_score;
          const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
          return Number.isFinite(n) ? n : 0;
        })
        .filter((n: number) => Number.isFinite(n));

      const termCount = termAverages.length;
      const sessionAverage = termCount > 0
        ? termAverages.reduce((a: number, b: number) => a + b, 0) / termCount
        : 0;

      const totalPresent = sessionResults.reduce((sum: number, r: any) => sum + (Number(r.times_present) || 0), 0);
      const totalDays = sessionResults.reduce((sum: number, r: any) => sum + (Number(r.total_attendance_days) || 0), 0);
      const sessionAttendancePct = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;

      const status = (sessionAverage >= 50 && sessionAttendancePct >= 50) ? 'Promoted' : 'Repeated';
      return { termCount, sessionAverage, sessionAttendancePct, status };
    } catch {
      return null;
    }
  })();

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
            orientation: portrait;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', serif;
            font-size: 10pt;
            line-height: 1.2;
            width: 100%;
            height: 100vh;
            overflow: hidden;
          }
          
          .print-container {
            width: 100%;
            max-width: 190mm;
            min-height: 277mm;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
            padding: 4mm;
            background: white;
          }
          
          .print-header {
            page-break-after: auto;
            page-break-inside: avoid;
          }
          
          .print-table {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-section {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-affective-psychomotor {
            page-break-inside: avoid;
            display: flex !important;
            gap: 2mm !important;
          }
          
          .print-watermark {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 140mm !important;
            height: 140mm !important;
            opacity: 0.12 !important;
            z-index: 0 !important;
            pointer-events: none !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }
          
          .print-content {
            position: relative !important;
            z-index: 1 !important;
          }
          
          table {
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
          
          td, th {
            page-break-inside: avoid !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        }
      `}</style>
      
      <div className="print-container bg-white no-print" style={{ 
        fontFamily: '"Times New Roman", serif',
        width: '210mm',
        height: '297mm',
        margin: '0 auto',
        padding: '8mm',
        boxSizing: 'border-box',
        backgroundColor: 'white',
        overflow: 'hidden',
        position: 'relative',
        border: '3px double #2c3e50',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
      }}>
      
      <div className="print-content" style={{ 
        position: 'absolute', 
        left: '-8mm',
        top: '-8mm',
        width: '210mm',
        height: '297mm',
        zIndex: 1,
        // allow absolute overlays like QR code without affecting layout
        overflow: 'hidden',
        textRendering: 'geometricPrecision',
        fontSmooth: 'always',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        WebkitTextStroke: '0.01px transparent',
        textShadow: '0 0 0.01px rgba(0,0,0,0.01)',
        letterSpacing: '0.01px',
        lineHeight: '1.1',
        fontWeight: '500',
        backgroundColor: 'white',
        padding: '8mm',
        boxSizing: 'border-box'
      }}>
      {/* School Header */}
      <div className="print-header" style={{ textAlign: 'center', marginBottom: '3mm', padding: '2mm 0' }}>
        <div style={{ marginBottom: '1mm' }}>
          <img 
            src={schoolSettings.school_logo_url || ''} 
            alt="School Logo" 
            style={{ 
              width: '18mm', 
              height: '18mm', 
              display: 'block', 
              margin: '0 auto', 
              borderRadius: '50%', 
              border: '2px solid #2c3e50', 
              objectFit: 'cover',
              backgroundColor: '#ffffff',
              imageRendering: 'auto',
              WebkitImageRendering: 'auto'
            } as React.CSSProperties} 
            onError={(e) => {
              // Try alternative logo path on error
              const target = e.target as HTMLImageElement;
              target.src = schoolSettings.school_logo_url || '';
            }}
          />
        </div>
        <h1 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0.5mm 0', textTransform: 'uppercase', color: '#2c3e50', letterSpacing: '1px', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_name || 'SCHOOL NAME'}</h1>
        <p style={{ fontSize: '8pt', margin: '0.3mm 0', fontStyle: 'italic', color: '#555', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_address || 'SCHOOL ADDRESS'}</p>
        <p style={{ fontSize: '8pt', margin: '0.3mm 0', color: '#555', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_email || 'school@email.com'}</p>
        <p style={{ fontSize: '8pt', margin: '0.3mm 0', color: '#555', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_phone || '+234-800-000-0000'}</p>
        <div style={{ marginTop: '1mm', borderBottom: '2px solid #2c3e50', width: '80%', margin: '1mm auto 0' }}></div>
      </div>

      {/* Student Information Section with Photo */}
      <div className="print-section" style={{ marginBottom: '2mm', display: 'flex', gap: '1mm', justifyContent: 'center', alignItems: 'stretch' }}>
        <div style={{ width: '75%' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #2c3e50',
            backgroundColor: '#f8f9fa',
            height: '18mm',
            pageBreakInside: 'avoid'
          }}>
            <tbody>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt', width: '15%' }}>Name:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', width: '35%' }}>{resolvedStudentName ? resolvedStudentName.toUpperCase() : 'STUDENT NAME'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt', width: '15%' }}>Session:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', width: '35%' }}>{result.academic_year || '2024/2025'}</td>
              </tr>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Admission No:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{(studentData as any)?.admissionNumber || 'N/A'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Term:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{result.term || 'THIRD TERM'}</td>
              </tr>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Class:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{(studentClassData as any)?.name || 'CLASS NAME'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Gender:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{(studentData as any)?.gender || 'MALE'}</td>
              </tr>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Attendance:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{result.times_present || 0} / {result.total_attendance_days || 0} days</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Total in Class:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{totalStudentsInClass}</td>
              </tr>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Date of Birth:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentDobText}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Next Term Begins:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>
                  {(() => {
                    const compiledNext = String((result as any)?.next_term_begin ?? '').trim();
                    const compiledNextValid = compiledNext !== '' && compiledNext !== '0000-00-00' && compiledNext !== '0000-00-00 00:00:00';
                    return (
                      signatureResumptionDate ||
                      (compiledNextValid ? compiledNext : '') ||
                      ''
                    );
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ width: '25%' }}>
          <div className="border border-black" style={{ width: '25mm', height: '30mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {(studentData as any)?.photo_url || (studentData as any)?.photoUrl ? (
              <img
                src={getStudentPhotoCandidates(studentData)[0] || ''}
                alt="Student Photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                data-candidate-idx={0}
                onError={(e) => handleStudentPhotoError(e, studentData)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9pt', color: '#666' }}>No Photo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Title */}
      <div style={{ textAlign: 'center', marginBottom: '1mm', padding: '1mm 0' }}>
        <h2 style={{ fontSize: '13pt', fontWeight: 'bold', textDecoration: 'underline', margin: '0.5mm 0', textTransform: 'uppercase', color: '#2c3e50', letterSpacing: '2px', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
          {result.term || 'THIRD TERM'} RESULT SHEET
        </h2>
      </div>

      {/* Result Table */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1mm' }}>
        <table className="print-table" style={{ 
          fontSize: '7pt', 
          width: '95%',
          borderCollapse: 'collapse',
          border: '2px solid #2c3e50',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid',
          pageBreakAfter: 'auto',
          textRendering: 'geometricPrecision',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
            <th className="border border-black" style={{ padding: '0.6mm', width: '3%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>SN</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '16%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>SUBJECT</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>1st CA</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>2nd CA</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Exams</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Total</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '5%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Grd</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '8%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Remark</th>
                      </tr>
        </thead>
        <tbody>
          {detailedScoresData && detailedScoresData.length > 0 ? (
            detailedScoresData.map((score: any, index: number) => {
              const gradeInfo = getGrade(score.total || 0);
              return (
                <tr key={index}>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{index + 1}</td>
                  <td className="border border-black" style={{ padding: '0.4mm', fontSize: '7pt' }}>{score.subject_name || 'Subject'}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{(score.first_ca ?? score.ca1 ?? 0)}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{(score.second_ca ?? score.ca2 ?? 0)}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{(score.exams ?? score.exam ?? 0)}</td>
                  <td className="border border-black text-center font-bold" style={{ padding: '0.4mm', textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>{score.total || 0}</td>
                  <td className="border border-black text-center font-bold" style={{ padding: '0.4mm', textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>{gradeInfo.grade}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '4pt' }}>{gradeInfo.remark}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="border border-black p-2 text-center text-gray-500" style={{ padding: '1.5mm', fontSize: '7pt' }}>
                No scores available
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Score Summary */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1mm' }}>
        <table className="print-table" style={{ 
          marginTop: '0.8mm', 
          fontSize: '6pt',
          width: '95%',
          borderCollapse: 'collapse',
          border: '2px solid #2c3e50',
          backgroundColor: '#f8f9fa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid'
        }}>
        <tbody>
          <tr>
            <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>TOTAL:</b> {result.total_score || '0.00'}</td>
            <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>AVG:</b> {result.average_score || '0.00'}</td>
            <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>CLASS AVG:</b> {result.class_average || '0.00'}</td>
            {shouldShowPosition ? (
              <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>POS:</b> {formatPositionWithSuffix(result.position)}</td>
            ) : (
              <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>GRADE:</b> {getGrade(Number(result.average_score || 0)).grade}</td>
            )}
          </tr>
        </tbody>
      </table>
      </div>

      {/* Signature Section - Split Layout */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2mm', marginBottom: '1.5mm', gap: '2mm' }}>
        {/* Class Teacher Section - Left Side */}
        <div className="border border-black p-1" style={{ 
          padding: '2mm', 
          fontSize: '6pt',
          width: '47%',
          minHeight: '25mm',
          border: '2px solid #2c3e50',
          backgroundColor: '#f8f9fa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid',
          overflow: 'visible'
        }}>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', fontWeight: 'bold', color: '#2c3e50' }}>
            CLASS TEACHER
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt' }}>
            <b>Name:</b> {getClassTeacherName()}
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', whiteSpace: 'pre-wrap', wordWrap: 'break-word', maxWidth: '100%', overflow: 'visible', lineHeight: '1.2' }}>
            <b>Comment:</b> {
              result?.class_teacher_comment || result?.comment || 'Teacher comment will appear here.'
            }
          </p>
        </div>

        {/* Principal/Head Teacher Section - Right Side */}
        <div className="border border-black p-1" style={{ 
          padding: '2mm', 
          fontSize: '6pt',
          width: '47%',
          minHeight: '30mm',
          border: '2px solid #2c3e50',
          backgroundColor: '#f8f9fa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid',
          overflow: 'visible'
        }}>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', fontWeight: 'bold', color: '#2c3e50' }}>
            {signatureTitle}
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt' }}>
            <b>Name:</b> {signatureName}
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', whiteSpace: 'pre-wrap', wordWrap: 'break-word', maxWidth: '100%', overflow: 'visible', lineHeight: '1.2' }}>
            <b>Comment:</b> {signatureComment}
          </p>
          <div style={{ 
            height: '8mm', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative'
          }}>
            {signatureImageUrl ? (
              <img 
                src={signatureImageUrl} 
                alt={`${signatureTitle} Signature`} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '6mm', 
                  objectFit: 'contain' 
                }} 
              />
            ) : (
              <span style={{ color: '#999', fontSize: '4pt' }}></span>
            )}
          </div>
        </div>
      </div>

      {/* Affective and Psychomotor Domains */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2mm', marginBottom: '1mm', alignItems: 'flex-start' }}>
        {/* Affective Areas */}
        <div style={{ width: '48%' }}>
          <div className="text-center mb-1">
            <h3 className="font-bold underline" style={{ fontSize: '10pt', marginBottom: '0.5mm', color: '#2c3e50', letterSpacing: '1px' }}>AFFECTIVE</h3>
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid black',
            fontSize: '6pt',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            pageBreakInside: 'avoid',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1a252f', color: 'white' }}>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '50%' }}>QUALITY</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '20%' }}>SCORE</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '30%' }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const affectiveData = getStudentAffectiveData();
                return (
                  <>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('attentiveness')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(affectiveData.attentiveness ?? result.affective?.attentiveness)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(affectiveData.attentiveness ?? result.affective?.attentiveness)}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('honesty')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(affectiveData.honesty ?? result.affective?.honesty)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(affectiveData.honesty ?? result.affective?.honesty)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('neatness')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(affectiveData.neatness ?? result.affective?.neatness)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(affectiveData.neatness ?? result.affective?.neatness)}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('obedience')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(affectiveData.obedience ?? result.affective?.obedience)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(affectiveData.obedience ?? result.affective?.obedience)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('sense_of_responsibility')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(affectiveData.sense_of_responsibility ?? result.affective?.sense_of_responsibility)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(affectiveData.sense_of_responsibility ?? result.affective?.sense_of_responsibility)}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Psychomotor Skills */}
        <div style={{ width: '48%' }}>
          <div className="text-center mb-1">
            <h3 className="font-bold underline" style={{ fontSize: '10pt', marginBottom: '0.5mm', color: '#2c3e50', letterSpacing: '1px' }}>PSYCHOMOTOR</h3>
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid black',
            fontSize: '7pt',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            pageBreakInside: 'avoid',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1a252f', color: 'white' }}>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '50%' }}>SKILL</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '20%' }}>SCORE</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '30%' }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const psychomotorData = getStudentPsychomotorData();
                return (
                  <>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('attention_to_direction')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(psychomotorData.attention_to_direction ?? result.psychomotor?.attention_to_direction)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(psychomotorData.attention_to_direction ?? result.psychomotor?.attention_to_direction)}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('considerate_of_others')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(psychomotorData.considerate_of_others ?? result.psychomotor?.considerate_of_others)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(psychomotorData.considerate_of_others ?? result.psychomotor?.considerate_of_others)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('handwriting')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(psychomotorData.handwriting ?? result.psychomotor?.handwriting)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(psychomotorData.handwriting ?? result.psychomotor?.handwriting)}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('sports')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(psychomotorData.sports ?? result.psychomotor?.sports)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(psychomotorData.sports ?? result.psychomotor?.sports)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('verbal_fluency')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(psychomotorData.verbal_fluency ?? result.psychomotor?.verbal_fluency)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(psychomotorData.verbal_fluency ?? result.psychomotor?.verbal_fluency)}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('works_well_independently')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainScoreText(psychomotorData.works_well_independently ?? (result as any)?.psychomotor?.works_well_independently ?? (result as any)?.psychomotor?.independent_work)}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{resolveDomainRemark(psychomotorData.works_well_independently ?? (result as any)?.psychomotor?.works_well_independently ?? (result as any)?.psychomotor?.independent_work)}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {qrCodeDataUrl ? (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1mm' }}>
          <div
            style={{
              width: '20mm',
              height: '20mm',
              backgroundColor: '#ffffff',
              padding: '0mm',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={qrCodeDataUrl}
              alt="Result QR"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
      ) : null}

      {sessionPromotion && (
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <div className="text-sm font-semibold text-gray-900">
              Promotion Status: <span className={sessionPromotion.status === 'Promoted' ? 'text-green-700' : 'text-red-700'}>{sessionPromotion.status}</span>
            </div>
            <div className="text-xs text-gray-700">
              Session Avg: {sessionPromotion.sessionAverage.toFixed(1)}% ({sessionPromotion.termCount} term{sessionPromotion.termCount === 1 ? '' : 's'})
            </div>
            <div className="text-xs text-gray-700">
              Session Attendance: {sessionPromotion.sessionAttendancePct.toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  
  {/* Action Buttons - Outside Print View */}
  {showActions && (
    <div className="no-print" style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px', padding: '10px' }}>
      <Button 
        onClick={handlePrint}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        style={{ marginRight: '8px' }}
      >
        Print Result (Ctrl+P)
      </Button>
      {onDownload && (
        <Button 
          onClick={() => onDownload(result.id)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Download PDF
        </Button>
      )}
    </div>
  )}
 </>
);
};

export const StudentResultCard = React.memo(StudentResultCardInner);