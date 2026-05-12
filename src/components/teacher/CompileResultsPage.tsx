 import { useState, useMemo, useCallback, useEffect } from "react";
import { Book, BookOpen, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Sparkles, Users, Calendar, Award, Calculator, FileText, TrendingUp, Heart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Save } from "lucide-react";
import { useSchool, Score, Subject, SubjectAssignment } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { api } from "../../services/api";
import { API_CONFIG } from "../../config/api";

const getStudentPhotoCandidates = (s: any): string[] => {
  const raw =
    s?.photoUrl ||
    s?.photo_url ||
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

// Auto-comment generation system
const commentTemplates = {
  excellent: [
    "Outstanding performance! Shows exceptional understanding and mastery of all subjects.",
    "Brilliant academic achievement. Maintains excellent standards across all areas.",
    "Exceptional student who demonstrates outstanding intellectual capacity and diligence.",
    "Remarkable performance! A true academic star with exemplary conduct.",
    "Outstanding achievement! Consistently exceeds expectations in all subjects.",
    "Exceptional work! Demonstrates superior analytical thinking and problem-solving skills.",
    "Brilliant results! Shows remarkable dedication to academic excellence.",
    "Outstanding scholar! Maintains highest standards in all academic pursuits.",
    "Exceptional performance! A model student with outstanding intellectual abilities.",
    "Brilliant achievement! Demonstrates exceptional mastery of course material."
  ],
  veryGood: [
    "Very good performance. Shows strong understanding and consistent effort.",
    "Commendable academic achievement with room for further improvement.",
    "Impressive performance! Demonstrates strong analytical skills and dedication.",
    "Very good result! Shows promise and potential for continued excellence.",
    "Strong academic performance with consistent effort and good understanding.",
    "Excellent work! Displays solid grasp of concepts and good analytical abilities.",
    "Commendable results! Shows strong academic capabilities and dedication.",
    "Very good achievement! Demonstrates consistent effort and understanding.",
    "Strong performance! Shows good command of subject matter and analytical skills.",
    "Impressive work! Displays academic potential and consistent dedication."
  ],
  good: [
    "Good performance. Shows satisfactory understanding and steady progress.",
    "Satisfactory academic achievement with areas for improvement.",
    "Good effort shown. Consistent progress noted throughout the term.",
    "Decent performance! With more effort, could achieve much higher results.",
    "Fair performance showing understanding of core concepts.",
    "Good work! Demonstrates adequate understanding and room for growth.",
    "Satisfactory results! Shows steady progress and basic comprehension.",
    "Decent achievement! Could benefit from additional study and practice.",
    "Fair performance! Shows understanding of fundamental concepts.",
    "Good effort! Demonstrates potential for improvement with dedicated work."
  ],
  average: [
    "Average performance. Needs to put in more effort to improve.",
    "Satisfactory but needs improvement in several areas.",
    "Fair performance. Could benefit from additional study and practice.",
    "Average result. More dedication needed for better performance.",
    "Moderate performance showing need for increased effort.",
    "Fair work! Requires more dedication and consistent study habits.",
    "Average results! Needs to focus more on academic responsibilities.",
    "Satisfactory performance! Could improve with better study methods.",
    "Moderate achievement! Requires increased effort and attention.",
    "Fair work! Needs to develop better study habits and consistency."
  ],
  belowAverage: [
    "Below average performance. Requires significant improvement and attention.",
    "Needs considerable improvement in academic performance and attitude.",
    "Poor performance. Must show more commitment to studies.",
    "Below expected standards. Immediate improvement required.",
    "Unsatisfactory performance requiring urgent attention and support.",
    "Weak performance! Needs serious attention to academic responsibilities.",
    "Below average results! Requires immediate intervention and support.",
    "Poor work! Must demonstrate greater commitment to learning.",
    "Unsatisfactory achievement! Needs comprehensive academic support.",
    "Weak performance! Requires urgent attention to study habits."
  ],
  poor: [
    "Poor performance. Requires immediate intervention and support.",
    "Very poor academic result. Needs serious attention to studies.",
    "Unsatisfactory performance in all aspects. Major improvement needed.",
    "Extremely poor result. Requires comprehensive academic support.",
    "Failing performance. Must seek help and show dramatic improvement.",
    "Very weak performance! Needs immediate academic intervention.",
    "Extremely poor results! Requires comprehensive support and guidance.",
    "Failing work! Must demonstrate complete commitment to improvement.",
    "Very poor achievement! Needs urgent and sustained academic support.",
    "Extremely weak performance! Requires immediate intervention and dedication."
  ]
};

const positionComments = {
  top: [
    "Outstanding class position! Shows exceptional academic ability.",
    "Excellent class ranking! Among the best performers in class.",
    "Brilliant class position! Demonstrates superior academic excellence.",
    "Exceptional ranking! A true academic leader in the class.",
    "Outstanding achievement! Maintains highest academic standards.",
    "Excellent class standing! Shows remarkable intellectual capabilities.",
    "Top position! Demonstrates exceptional mastery of all subjects.",
    "Brilliant ranking! An exemplary student with outstanding abilities."
  ],
  upper: [
    "Good class position. Shows strong academic performance.",
    "Commendable class ranking. Above average performance.",
    "Strong class position! Demonstrates solid academic abilities.",
    "Good ranking! Shows consistent effort and understanding.",
    "Commendable standing! Above average academic achievement.",
    "Strong performance! Well-positioned among high achievers.",
    "Good class ranking! Displays solid academic capabilities.",
    "Commendable position! Shows promise for continued excellence."
  ],
  middle: [
    "Average class position. Room for improvement in ranking.",
    "Fair class position. Could work towards higher ranking.",
    "Moderate class standing. Needs more effort to improve position.",
    "Average ranking! Potential for better academic performance.",
    "Fair position! Could benefit from increased dedication.",
    "Middle ranking! Room for improvement with consistent effort.",
    "Average standing! Needs focus to achieve higher position.",
    "Moderate position! Can improve with better study habits."
  ],
  lower: [
    "Below average class position. Needs significant improvement.",
    "Poor class ranking. Must work harder to improve position.",
    "Low class position. Requires immediate attention to studies.",
    "Weak ranking! Needs substantial improvement in performance.",
    "Poor standing! Must demonstrate greater academic commitment.",
    "Low position! Requires urgent intervention and support.",
    "Weak ranking! Needs comprehensive academic improvement.",
    "Poor position! Must show dramatic improvement in studies."
  ]
};

const constructiveFeedback = {
  excellent: [
    "Continue maintaining excellent standards. Consider advanced studies.",
    "Outstanding work! Explore leadership roles and academic competitions.",
    "Exceptional performance! Consider mentoring other students.",
    "Brilliant achievement! Pursue advanced academic challenges.",
    "Excellent results! Consider participating in academic enrichment programs."
  ],
  veryGood: [
    "Strong performance! With extra effort, could reach excellence.",
    "Very good work! Focus on weak areas to achieve outstanding results.",
    "Commendable achievement! Additional practice could lead to excellence.",
    "Strong results! Target specific areas for improvement.",
    "Very good performance! Consistent effort will lead to top ranking."
  ],
  good: [
    "Good effort! Increase study time for better results.",
    "Satisfactory work! Focus on understanding concepts deeply.",
    "Good performance! Develop better study habits and consistency.",
    "Decent achievement! Seek help in challenging subjects.",
    "Fair work! More dedication will lead to significant improvement."
  ],
  average: [
    "Needs improvement! Develop consistent study routine.",
    "Fair performance! Seek additional help from teachers.",
    "Average work! Focus on fundamentals and practice regularly.",
    "Satisfactory results! Increase study time and concentration.",
    "Moderate achievement! Join study groups and seek tutoring."
  ],
  belowAverage: [
    "Requires immediate attention! Seek help from teachers and tutors.",
    "Poor performance! Develop basic study skills and habits.",
    "Below average work! Attend extra classes and seek counseling.",
    "Weak achievement! Requires comprehensive academic support.",
    "Unsatisfactory results! Must change study approach completely."
  ],
  poor: [
    "Critical situation! Requires intensive academic intervention.",
    "Very poor work! Must seek comprehensive support immediately.",
    "Failing performance! Requires one-on-one tutoring and counseling.",
    "Extremely weak results! Must consider academic probation.",
    "Critical achievement! Requires complete academic rehabilitation."
  ]
};

function generateAutoComment(averageScore: number, position: number, totalStudents: number): string {
  // Generate comment based on specific average score ranges
  if (averageScore >= 90 && averageScore <= 100) {
    return 'An excellent result Keep it up.';
  } else if (averageScore >= 80 && averageScore < 90) {
    return 'A very good result, Keep it up.';
  } else if (averageScore >= 70 && averageScore < 80) {
    return 'A good result, You can do better.';
  } else if (averageScore >= 60 && averageScore < 70) {
    return 'A satisfactory result, you can do better.';
  } else if (averageScore >= 50 && averageScore < 60) {
    return 'A Fair result you have it in you to do better.';
  } else if (averageScore >= 0 && averageScore < 50) {
    return 'Fail';
  } else {
    return 'Fail';
  }
}

function parseAttendedDaysFromRemarks(remarks: unknown): number {
  if (typeof remarks !== 'string') return 0;
  const match = remarks.match(/(\d+)\s*out\s*of\s*(\d+)\s*days/i);
  if (!match) return 0;
  const attended = parseInt(match[1], 10);
  return Number.isFinite(attended) ? attended : 0;
}

function parseAttendanceFromRemarks(remarks: unknown): { attendedDays: number; requiredDays: number } {
  if (typeof remarks !== 'string') return { attendedDays: 0, requiredDays: 0 };
  const match = remarks.match(/(\d+)\s*out\s*of\s*(\d+)\s*days/i);
  if (!match) return { attendedDays: 0, requiredDays: 0 };

  const attended = parseInt(match[1], 10);
  const required = parseInt(match[2], 10);

  return {
    attendedDays: Number.isFinite(attended) ? attended : 0,
    requiredDays: Number.isFinite(required) ? required : 0,
  };
}

function generateMultipleCommentOptions(averageScore: number, position: number, totalStudents: number): string[] {
  const baseComment = generateAutoComment(averageScore, position, totalStudents);
  
  // Generate variations of the base comment for teacher to choose from
  const options: string[] = [baseComment];
  
  // Add some variations based on the base comment
  if (averageScore >= 90) {
    options.push('Excellent performance and outstanding achievement');
    options.push('Excellent work, maintain this standard');
  } else if (averageScore >= 80) {
    options.push('A very good result, keep pushing for excellence');
    options.push('A very good result with room for improvement');
  } else if (averageScore >= 70) {
    options.push('Good result, more effort needed for excellence');
    options.push('Good result, continue working hard');
  } else if (averageScore >= 60) {
    options.push('A satisfaction result, improvement is possible');
    options.push('A satisfaction result, put in more effort');
  } else if (averageScore >= 50) {
    options.push('A fair result, significant improvement needed');
    options.push('A fair result, must work harder');
  } else {
    options.push('Fail, but serious improvement required');
    options.push('Fail, needs dedicated effort');
  }
  
  return options.slice(0, 5);
}

function generatePrincipalComment(averageScore: number): string {
  if (averageScore >= 80) {
    return "Exceptional performance! Keep up the excellent work. You are a role model for others.";
  } else if (averageScore >= 70) {
    return "Very good performance! Continue to work hard and aim for excellence.";
  } else if (averageScore >= 60) {
    return "Good performance! There is room for improvement. Stay focused and dedicated.";
  } else if (averageScore >= 50) {
    return "Fair performance. More effort and dedication needed for better results.";
  } else {
    return "Poor performance. Requires immediate attention and significant improvement.";
  }
}

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
    updateCompiledResult,
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
    addNotification,
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
  const [showCommentOptions, setShowCommentOptions] = useState<boolean>(false);

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
  const [commentOptions, setCommentOptions] = useState<string[]>([]);
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
  const hasClassTeacherAssignments = useMemo(() => {
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
            existingResult.average_score || 0,
            existingResult.position || 1,
            existingResult.total_students || 1
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
  const classStatistics = useMemo(() => {
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

  // Submit result for selected student
  const handleSubmitResult = async () => {
    setIsSubmitting(true);
    try {
      toast.info("Submitting result... Please wait.", { id: "submit-result" });
      
      // 1. COMPREHENSIVE VALIDATION
      if (!selectedStudent || !currentTeacher || !effectiveSelectedClassId) {
        toast.error('Missing required data', { id: "submit-result" });
        return;
      }

      if (!currentTerm || !currentAcademicYear) {
        toast.error('Current term or academic session is not set. Please contact the admin to set it in System Settings.', { id: "submit-result" });
        return;
      }

      // Check if result is already approved
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

      // 2. VALIDATE STUDENT SCORES
      const studentScoresRaw = scores.filter(s => {
        if (String((s as any)?.student_id) !== String((selectedStudent as any)?.id)) return false;
        if (String((s as any)?.term) !== String(currentTerm)) return false;
        if (String((s as any)?.academic_year) !== String(currentAcademicYear)) return false;
        const st = String((s as any)?.status);
        return st === 'Submitted' || st === 'Approved' || st === 'Draft';
      });
      
      if (studentScoresRaw.length === 0) {
        toast.error('No scores found for this student', { id: "submit-result" });
        return;
      }

      // Collapse potential duplicate assignment rows into 1 score per subject_id.
      // Prefer Submitted/Approved over Draft; tie-breaker by highest total.
      const bySubject = new Map<string, any>();
      for (const sc of studentScoresRaw) {
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
        const prevIsFinal = prevStatus === 'Submitted' || prevStatus === 'Approved';
        const nextIsFinal = nextStatus === 'Submitted' || nextStatus === 'Approved';
        if (nextIsFinal && !prevIsFinal) {
          bySubject.set(key, sc);
          continue;
        }
        if (nextIsFinal === prevIsFinal) {
          const prevTotal = Number((prev as any)?.total) || 0;
          const nextTotal = Number((sc as any)?.total) || 0;
          if (nextTotal > prevTotal) {
            bySubject.set(key, sc);
          }
        }
      }

      const studentScores = Array.from(bySubject.values());

      // Check if student has submitted scores for all class subjects
      const registeredSubjectIds = new Set<string>();
      if (Array.isArray(subjectRegistrations)) {
        for (const sr of subjectRegistrations) {
          if (String((sr as any)?.status) !== 'Active') continue;
          if (String((sr as any)?.class_id) !== String(effectiveSelectedClassId)) continue;
          if (String((sr as any)?.term) !== String(currentTerm)) continue;
          if (String((sr as any)?.academic_year) !== String(currentAcademicYear)) continue;
          const sid = (sr as any)?.subject_id;
          if (sid !== undefined && sid !== null && String(sid) !== '') {
            registeredSubjectIds.add(String(sid));
          }
        }
      }

      const requiredSubjectIds = registeredSubjectIds.size > 0
        ? registeredSubjectIds
        : classSubjectIdSet;

      const requiredSubjects = requiredSubjectIds.size;
      const submittedSubjectIds = new Set<string>();
      for (const s of studentScores.filter(s => s.status === 'Submitted' || s.status === 'Approved')) {
        const subId = assignmentIdToSubjectId.get(Number((s as any)?.subject_assignment_id));
        if (subId && requiredSubjectIds.has(String(subId))) {
          submittedSubjectIds.add(String(subId));
        }
      }
      const submittedScores = submittedSubjectIds.size;

      if (submittedScores < requiredSubjects) {
        toast.error(`Student has submitted scores for ${submittedScores}/${requiredSubjects} subjects. All subjects must be submitted before compiling results. Please ensure all scores are entered and submitted in the Score Entry page.`, { id: "submit-result" });
        return;
      }

      // 3. VALIDATE AFFECTIVE AND PSYCHOMOTOR DATA
      const affective = Array.isArray(affectiveDomains) ? affectiveDomains.find(a => 
        a.student_id === selectedStudent.id &&
        String(a.class_id) === String(effectiveSelectedClassId) &&
        a.term === currentTerm &&
        a.academic_year === currentAcademicYear
      ) : undefined;

      const psychomotor = Array.isArray(psychomotorDomains) ? psychomotorDomains.find(p => 
        p.student_id === selectedStudent.id &&
        String(p.class_id) === String(effectiveSelectedClassId) &&
        p.term === currentTerm &&
        p.academic_year === currentAcademicYear
      ) : undefined;

      if (!affective) {
        toast.error('Affective domain assessment is required', { id: "submit-result" });
        return;
      }

      if (!psychomotor) {
        toast.error('Psychomotor domain assessment is required', { id: "submit-result" });
        return;
      }

      // 4. VALIDATE ATTENDANCE DATA
      const attendanceRequirementsForValidation = getAttendanceRequirements();
      const requiredDaysForValidation = attendanceRequirementsForValidation[currentTerm] || 0;
      
      if (requiredDaysForValidation === 0) {
        toast.error('Attendance requirements not set for this term. Please configure attendance settings first.', { id: "submit-result" });
        return;
      }

      const attendanceRows = getAttendanceByStudent(selectedStudent.id, currentAcademicYear, currentTerm);
      const relevantAttendance = Array.isArray(attendanceRows)
        ? attendanceRows.filter(a => String(a.class_id) === String(effectiveSelectedClassId))
        : [];

      const attendedDaysForValidation = relevantAttendance.reduce((max, row) => {
        const parsed = parseAttendedDaysFromRemarks((row as any)?.remarks);
        return parsed > max ? parsed : max;
      }, 0);
      
      if (attendedDaysForValidation === 0) {
        toast.error('Attendance data is required. Please mark attendance for this student in the Mark Attendance page before compiling results.', { id: "submit-result" });
        return;
      }

      // 5. ENHANCE SCORES WITH SUBJECT NAMES
      const enhancedScores = studentScores.map((score: Score) => {
        const assignment = Array.isArray(subjectAssignments) ? subjectAssignments.find((sa: SubjectAssignment) => sa.id === score.subject_assignment_id) : undefined;
        const subject = assignment && Array.isArray(subjects) ? subjects.find((s: Subject) => s.id === assignment.subject_id) : undefined;
        
        return {
          ...score,
          subject_name: subject?.name || assignment?.subject_name || score.subject_name || 'Unknown Subject'
        };
      });

      // 5. ACCURATE SCORE CALCULATION
      const totalScore = studentScores.reduce((sum, score) => {
        const scoreTotal = Number(score.total) || 0;
        return sum + scoreTotal;
      }, 0);
      
      const averageScore = studentScores.length > 0 
        ? Math.round((totalScore / studentScores.length) * 100) / 100 
        : 0;

      // 6. POSITION CALCULATION
      // Use the precomputed class ranking (based on total score) so the position is generated
      // before submission and matches what the teacher sees on the Compile page.
      const completionRow = (studentsCompletion || []).find(s => s.studentId === selectedStudent.id);
      const actualPosition = completionRow?.position || 0;
      const totalStudents = completionRow?.totalStudents || classStudents.length;

      // 7. ATTENDANCE DATA INTEGRATION
      // Note: attendance data already validated above, just integrate it
      const attendanceRequirements = getAttendanceRequirements();
      const requiredDays = attendanceRequirements[currentTerm] || 0;
      const attendedDays = attendedDaysForValidation;
      const timesAbsent = requiredDays - attendedDays;
      const attendanceRate = requiredDays > 0 ? Math.round((attendedDays / requiredDays) * 100) : 0;

      // 8. COMPILE COMPLETE RESULT DATA
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
        times_absent: timesAbsent,
        total_attendance_days: requiredDays,
        term_begin: getTermDates().termStartDate || '',
        term_end: getTermDates().termEndDate || '',
        next_term_begin: getTermDates().nextTermStarts || '',
        class_teacher_name: currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : 'System Administrator',
        class_teacher_comment: customComment || generateAutoComment(averageScore, actualPosition, totalStudents),
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

      // 9. SUBMIT TO BACKEND (authoritative validation + persistence)
      await api.post(API_CONFIG.ENDPOINTS.RESULTS.COMPILE, {
        class_id: Number(effectiveSelectedClassId),
        term: currentTerm,
        academic_year: currentAcademicYear,
        student_results: [compiledData]
      });
      
      // 10. SUCCESS FEEDBACK
      toast.success(
        `✅ Result submitted successfully!\n` +
        `📊 Student: ${selectedStudent.firstName} ${selectedStudent.lastName}\n` +
        `🏆 Position: ${actualPosition}/${totalStudents} in class\n` +
        `📈 Average Score: ${averageScore}%\n` +
        `📅 Attendance Rate: ${attendanceRate}%\n` +
        `⏳ Status: Submitted for admin approval`,
        { id: "submit-result", duration: 8000 }
      );
      
      // 11. CLEANUP AND NAVIGATION
      setCustomComment("");
      setSelectedStudentId(null);
      
      // 12. REFRESH DATA
      await loadCompiledResultsFromAPI(null);
      
    } catch (error) {
      toast.error('Failed to submit result. Please try again.', { id: "submit-result" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        const existingResult = Array.isArray(compiledResults) ? compiledResults.find(cr => 
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
        const existingResult = Array.isArray(compiledResults) ? compiledResults.find(cr => 
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

        let autoComment = '';
        if (averageScore >= 90) {
          autoComment = 'Excellent';
        } else if (averageScore >= 80) {
          autoComment = 'A very good result';
        } else if (averageScore >= 70) {
          autoComment = 'Good result';
        } else if (averageScore >= 60) {
          autoComment = 'A satisfaction result';
        } else if (averageScore >= 50) {
          autoComment = 'A fair result';
        } else {
          autoComment = 'Fail';
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
          class_teacher_comment: generateAutoComment(averageScore, position, classStudents.length),
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
      {!selectedStudentId && (
        <Card className="border-[#0A2540]/10 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-t-xl px-4 py-3">
            <CardTitle className="text-base">Select Class</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-[#0A2540] mb-1 block text-sm">Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={(value) => {
                    const canonical = resolveCanonicalClassId(value) ?? value;
                    setSelectedClassId(canonical);
                  }}
                >
                  <SelectTrigger className="h-9 rounded-lg border-[#0A2540]/20">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classTeacherClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#0A2540] mb-1 block text-sm">Term & Year</Label>
                <div className="h-9 flex items-center px-3 rounded-lg border border-[#0A2540]/20 bg-gray-50">
                  <p className="text-[#0A2540] text-sm">{currentTerm} {currentAcademicYear}</p>
                </div>
              </div>
            </div>

            {selectedClassId && classSubjectIdSet.size > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-900">
                  <strong>{classSubjectIdSet.size} subjects</strong> assigned to this class for {currentTerm} {currentAcademicYear}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student List - Compact */}
      {!selectedStudentId && selectedClassId && (
        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardHeader className="border-b border-[#0A2540]/10 bg-gradient-to-r from-[#0A2540]/5 to-[#1E40AF]/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0A2540] flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#1E40AF]" />
                  Students List
                </h2>
                <p className="text-[#64748B] font-medium">
                  {classStudents.length} students in class
                </p>
              </div>
              <div className="flex gap-3">
                {allSubmitted ? (
                  <Button
                    disabled={true}
                    className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 rounded-xl px-4 py-2 font-semibold"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    All Submitted ({submittedCount})
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitAllResults}
                    disabled={!resultsGenerated || eligibleForSubmission.length === 0}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-4 py-2 font-semibold transition-all transform hover:scale-105"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit All ({eligibleForSubmission.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {classStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold text-base">No students in this class</p>
                <p className="text-gray-400 text-xs sm:text-sm">Students will appear here once they are enrolled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {classStudents.map((student) => {
                  const completion = Array.isArray(studentsCompletion) ? studentsCompletion.find(s => s.studentId === student.id) : undefined;
                  // Don't hide students without completion data - show them with default values

                  return (
                    <div
                      key={student.id}
                      className="p-3 sm:p-4 border border-[#0A2540]/10 rounded-xl hover:border-[#1E40AF]/30 hover:bg-gradient-to-r hover:from-[#0A2540]/5 hover:to-[#1E40AF]/5 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-[#1E40AF] shadow-sm">
                            {student.photo_url ? (
                              <img 
                                src={getStudentPhotoCandidates(student)[0] || ''} 
                                alt={`${student.firstName} ${student.lastName}`}
                                className="w-full h-full object-cover rounded-full"
                                data-candidate-idx={0}
                                onError={(e) => {
                                  handleStudentPhotoError(e, student);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <AvatarFallback className="bg-[#1E40AF] text-white font-bold">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <p className="text-[#0A2540] font-semibold text-sm sm:text-base">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{student.admissionNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                          {/* Scores Progress */}
                          <div className="text-right">
                            <p className="text-xs font-semibold text-[#64748B] mb-1">Scores</p>
                            <div className="flex items-center gap-1">
                              <Badge 
                                variant={completion?.completedSubjects === completion?.totalSubjects ? "default" : "outline"}
                                className={`rounded-full text-xs font-semibold px-2 py-1 ${
                                  completion?.completedSubjects === completion?.totalSubjects 
                                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                                    : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                                }`}
                              >
                                {completion?.completedSubjects || 0}/{completion?.totalSubjects || 0}
                              </Badge>
                            </div>
                          </div>

                          {/* Affective */}
                          <div className="text-center hidden sm:block">
                            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${completion?.hasAffective ? 'text-green-500' : 'text-gray-300'}`} />
                            <p className="text-xs text-gray-500 mt-1 hidden sm:block">Affective</p>
                          </div>

                          {/* Psychomotor */}
                          <div className="text-center hidden sm:block">
                            <Activity className={`w-4 h-4 sm:w-5 sm:h-5 ${completion?.hasPsychomotor ? 'text-green-500' : 'text-gray-300'}`} />
                            <p className="text-xs text-gray-500 mt-1 hidden sm:block">Psychomotor</p>
                          </div>

                          {/* Status */}
                          <div className="text-center">
                            {completion?.isSubmitted ? (
                              <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Submitted</span>
                                <span className="sm:hidden">Sub</span>
                              </Badge>
                            ) : completion?.isRejected ? (
                              <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Resubmit</span>
                                <span className="sm:hidden">Res</span>
                              </Badge>
                            ) : completion?.isComplete ? (
                              <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                                Ready
                              </Badge>
                            ) : (
                              <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <Card className="border-[#0A2540]/10 shadow-lg">
            <CardHeader className="border-b border-[#0A2540]/10 bg-gradient-to-r from-[#10B981]/5 to-[#059669]/5">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-[#0A2540]">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                Subject Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3">
                {(classSubjects || []).map((subject: any) => {
                  const score = (studentResultData?.scores || []).find((s: any) => {
                    const subId = assignmentIdToSubjectId.get(Number((s as any)?.subject_assignment_id));
                    return String(subId || '') === String(subject?.subject_id || '');
                  });

                  return (
                    <div key={subject.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-bold text-[#0A2540]">{subject.name || 'Unknown Subject'}</p>
                          <p className="text-xs text-[#64748B] font-mono">{subject.subject_code || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-center bg-white p-2 rounded-lg border border-gray-200 min-w-[60px]">
                          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">CA1</p>
                          <p className="text-sm sm:text-base font-bold text-[#0A2540]">{score?.ca1 || 0}</p>
                        </div>
                        <div className="text-center bg-white p-2 rounded-lg border border-gray-200 min-w-[60px]">
                          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">CA2</p>
                          <p className="text-sm sm:text-base font-bold text-[#0A2540]">{score?.ca2 || 0}</p>
                        </div>
                        <div className="text-center bg-white p-2 rounded-lg border border-gray-200 min-w-[60px]">
                          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Exam</p>
                          <p className="text-sm sm:text-base font-bold text-[#0A2540]">{score?.exam || 0}</p>
                        </div>
                        <div className="text-center bg-gradient-to-r from-green-100 to-green-200 p-2 rounded-xl border border-green-300 min-w-[60px]">
                          <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Total</p>
                          <p className="text-sm sm:text-base font-bold text-green-600">{score?.total || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Display - Read Only */}
          <Card className="border-[#0A2540]/10 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-3 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4" />
                Attendance Record
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-800">Attendance Ratio:</span>
                    <span className="text-lg font-bold text-indigo-900">
                      {studentAttendance?.ratio || '0/60'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-indigo-700">Attendance Rate:</span>
                    <span className="text-sm font-semibold text-indigo-800">
                      {studentAttendance?.attendanceRate.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 text-center">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Attendance is now managed in the Mark Attendance page
                  </p>
                </div>
                
                {studentResultData?.isSubmitted && !studentResultData?.isRejected && (
                  <p className="text-xs text-gray-600 mt-1">
                    Attendance cannot be modified after result submission.
                  </p>
                )}
                
                {studentResultData?.isRejected && (
                  <p className="text-xs text-orange-600 mt-1">
                    Result was rejected. You can edit and resubmit.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          
          {/* Affective & Psychomotor Display - Read Only */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Affective Domain Display */}
            <Card className="border-[#0A2540]/10 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white px-4 py-3 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2">
                  Affective Domain
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Managed in Student Domains</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'attentiveness', label: 'Attentiveness' },
                    { key: 'honesty', label: 'Honesty' },
                    { key: 'neatness', label: 'Neatness' },
                    { key: 'obedience', label: 'Obedience' },
                    { key: 'sense_of_responsibility', label: 'Sense of Responsibility' }
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">{field.label}</Label>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center ${
                          Number(affectiveData[field.key as keyof typeof affectiveData]) >= 5 
                            ? 'bg-green-100 text-green-800'
                            : Number(affectiveData[field.key as keyof typeof affectiveData]) >= 4 
                            ? 'bg-blue-100 text-blue-800'
                            : Number(affectiveData[field.key as keyof typeof affectiveData]) >= 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {affectiveData[field.key as keyof typeof affectiveData] || 3}
                        </div>
                        <span className="text-xs text-gray-600">
                          {Number(affectiveData[field.key as keyof typeof affectiveData]) >= 5 ? 'Excellent' :
                           Number(affectiveData[field.key as keyof typeof affectiveData]) >= 4 ? 'Very Good' :
                           Number(affectiveData[field.key as keyof typeof affectiveData]) >= 3 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <Heart className="w-3 h-3 inline mr-1" />
                  Update affective domains in Student Domains page
                </div>
              </CardContent>
            </Card>

            {/* Psychomotor Domain Display */}
            <Card className="border-[#0A2540]/10 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white px-4 py-3 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2">
                  Psychomotor Domain
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Managed in Student Domains</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'attention_to_direction', label: 'Attention to Direction' },
                    { key: 'considerate_of_others', label: 'Concern for Others' },
                    { key: 'handwriting', label: 'Handwriting' },
                    { key: 'sport', label: 'Sport' },
                    { key: 'verbal_fluency', label: 'Verbal Fluency' },
                    { key: 'works_well_independently', label: 'Works Well Independently' }
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs font-medium text-gray-700">{field.label}</Label>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center ${
                          Number(psychomotorData[field.key as keyof typeof psychomotorData]) >= 5 
                            ? 'bg-green-100 text-green-800'
                            : Number(psychomotorData[field.key as keyof typeof psychomotorData]) >= 4 
                            ? 'bg-blue-100 text-blue-800'
                            : Number(psychomotorData[field.key as keyof typeof psychomotorData]) >= 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {psychomotorData[field.key as keyof typeof psychomotorData] || 3}
                        </div>
                        <span className="text-xs text-gray-600">
                          {Number(psychomotorData[field.key as keyof typeof psychomotorData]) >= 5 ? 'Excellent' :
                           Number(psychomotorData[field.key as keyof typeof psychomotorData]) >= 4 ? 'Very Good' :
                           Number(psychomotorData[field.key as keyof typeof psychomotorData]) >= 3 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <Activity className="w-3 h-3 inline mr-1" />
                  Update psychomotor domains in Student Domains page
                </div>
              </CardContent>
            </Card>
          </div>

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
                      studentResultData.averageScore,
                      studentsCompletion.find(s => s.studentId === selectedStudent.id)?.position || 0,
                      studentsCompletion.find(s => s.studentId === selectedStudent.id)?.totalStudents || 0
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
                      studentResultData.averageScore,
                      studentsCompletion.find(s => s.studentId === selectedStudent.id)?.position || 0,
                      studentsCompletion.find(s => s.studentId === selectedStudent.id)?.totalStudents || 0
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
