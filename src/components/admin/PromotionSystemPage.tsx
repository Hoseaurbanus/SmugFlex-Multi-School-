import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { useActivityLogs } from "../../contexts/domains/IndependentActivityLogContext";
import { GraduationCap, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { ProgressionRulesPanel } from "./promotion-system/ProgressionRulesPanel";
import { StudentPromotionTable } from "./promotion-system/StudentPromotionTable";
import { ConfirmPromotionDialog } from "./promotion-system/ConfirmPromotionDialog";
import { ManualPromotionDialog } from "./promotion-system/ManualPromotionDialog";
import { ManualClassChangeDialog } from "./promotion-system/ManualClassChangeDialog";

const PROMOTION_STATUSES = [
  'Promoted', 'Repeated', 'Transferred', 'On Hold',
  'Withdrawn', 'Pending Approval', 'Conditional', 'Manual'
] as const;

type PromotionStatus = typeof PROMOTION_STATUSES[number];

export function PromotionSystemPage() {
  const {
    students,
    classes,
    compiledResults,
    currentTerm,
    currentAcademicYear,
    currentUser,
    refreshStudents
  } = useSchool() as {
    students: any[],
    classes: any[],
    compiledResults: any[],
    currentTerm: string,
    currentAcademicYear: string,
    currentUser: any,
    refreshStudents: Function
  };
  const { addActivityLog } = useActivityLogs();

  const [selectedSourceClass, setSelectedSourceClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [promotionMapping, setPromotionMapping] = useState<{ [studentId: number]: number }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const getNextAcademicYear = (year: string) => {
    const match = (year || '').match(/^(\d{4})\/(\d{4})$/);
    if (!match) return year;
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return year;
    return `${start + 1}/${end + 1}`;
  };

  const [newAcademicYear, setNewAcademicYear] = useState(() => getNextAcademicYear(currentAcademicYear));
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionProgress, setPromotionProgress] = useState(0);
  const [promotionHistory, setPromotionHistory] = useState<any[]>([]);
  const [manualOverride, setManualOverride] = useState<{ [studentId: number]: PromotionStatus }>({});
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [selectedStudentForManual, setSelectedStudentForManual] = useState<any>(null);
  const [demotionClassId, setDemotionClassId] = useState<number | null>(null);
  const [progressionRules, setProgressionRules] = useState<any[]>([]);
  const [classCapacity, setClassCapacity] = useState<{ [classId: number]: { current: number; max: number } }>({});
  const [promotionErrors, setPromotionErrors] = useState<{ [studentId: number]: string }>({});
  const [newRuleFromClassId, setNewRuleFromClassId] = useState<number | null>(null);
  const [newRuleToClassId, setNewRuleToClassId] = useState<number | null>(null);
  const [newRuleIsActive, setNewRuleIsActive] = useState(true);
  const [ruleActionLoading, setRuleActionLoading] = useState(false);
  const [_ruleAlertMessage, setRuleAlertMessage] = useState<string | null>(null);
  const [showManualClassChangeDialog, setShowManualClassChangeDialog] = useState(false);
  const [manualClassChangeReason, setManualClassChangeReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isThirdTerm = String(currentTerm) === 'Third Term';

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadProgressionRules(),
        loadPromotionHistory()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [currentAcademicYear]);

  useEffect(() => {
    setNewAcademicYear(getNextAcademicYear(currentAcademicYear));
  }, [currentAcademicYear]);

  useEffect(() => {
    loadClassCapacity();
  }, [classes]);

  useEffect(() => {
    loadProgressionRules();
  }, []);

  const loadProgressionRules = async () => {
    try {
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`${API_CONFIG.BASE_URL}/progression/rules?academic_year=${encodeURIComponent(currentAcademicYear)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setProgressionRules(data.data || []);
      } else {
        setProgressionRules([]);
        toast.error('Progression rules unavailable - using default behavior');
      }
    } catch (error) {
      setProgressionRules([]);
      toast.error('Progression rules unavailable - using default behavior');
    }
  };

  const loadClassCapacity = () => {
    const capacity: { [classId: number]: { current: number; max: number } } = {};
    classes.forEach(cls => {
      capacity[cls.id] = {
        current: cls.currentStudents || 0,
        max: cls.capacity || 50
      };
    });
    setClassCapacity(capacity);
  };

  const loadPromotionHistory = async () => {
    try {
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`${API_CONFIG.BASE_URL}/student/promotion-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setPromotionHistory(data.data || []);
      } else {
        setPromotionHistory([]);
      }
    } catch (error) {
      setPromotionHistory([]);
    }
  };

  const createProgressionRule = async () => {
    if (!newRuleFromClassId || !newRuleToClassId) {
      toast.error('Please select both source and destination classes');
      return;
    }
    if (newRuleFromClassId === newRuleToClassId) {
      toast.error('Source and destination class cannot be the same');
      return;
    }
    setRuleActionLoading(true);
    setRuleAlertMessage(null);
    try {
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`${API_CONFIG.BASE_URL}/progression/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          from_class_id: newRuleFromClassId,
          to_class_id: newRuleToClassId,
          academic_year: currentAcademicYear,
          is_active: newRuleIsActive,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create progression rule');
      toast.success('Progression rule created successfully');
      setNewRuleFromClassId(null);
      setNewRuleToClassId(null);
      setNewRuleIsActive(true);
      await loadProgressionRules();
    } catch (error: any) {
      toast.error(error.message || 'Unable to create progression rule');
    } finally {
      setRuleActionLoading(false);
    }
  };

  const updateProgressionRuleStatus = async (ruleId: number, active: boolean) => {
    setRuleActionLoading(true);
    try {
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`/api/progression/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update progression rule');
      toast.success('Progression rule updated');
      await loadProgressionRules();
    } catch (error: any) {
      toast.error(error.message || 'Unable to update rule');
    } finally {
      setRuleActionLoading(false);
    }
  };

  const deleteProgressionRule = async (ruleId: number) => {
    if (!window.confirm('Delete this progression rule?')) return;
    setRuleActionLoading(true);
    try {
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`/api/progression/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to delete progression rule');
      toast.success('Progression rule deleted');
      await loadProgressionRules();
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete rule');
    } finally {
      setRuleActionLoading(false);
    }
  };

  const classStudents = useMemo(() => {
    return selectedSourceClass
      ? students.filter((s: any) => s.class_id === Number(selectedSourceClass) && s.status === 'Active')
      : [];
  }, [selectedSourceClass, students]);

  const studentsWithStatus = useMemo(() => {
    const TERMS = ['First Term', 'Second Term', 'Third Term'];
    return classStudents.map((student: any) => {
      let promotionStatus: PromotionStatus = "Repeated";
      const sessionResults = compiledResults.filter((r: any) =>
        Number(r.student_id) === Number(student.id) &&
        r.status === 'Approved' &&
        String(r.academic_year) === String(currentAcademicYear) &&
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
      const averageScore = termCount > 0
        ? termAverages.reduce((a: number, b: number) => a + b, 0) / termCount
        : 0;
      const totalPresent = sessionResults.reduce((sum: number, r: any) => sum + (Number(r.times_present) || 0), 0);
      const totalDays = sessionResults.reduce((sum: number, r: any) => sum + (Number(r.total_attendance_days) || 0), 0);
      const attendance = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;
      const thirdTermResult = sessionResults
        .filter((r: any) => String(r.term) === 'Third Term')
        .sort((a: any, b: any) => new Date(b.compiled_date).getTime() - new Date(a.compiled_date).getTime())[0];
      if (manualOverride[student.id]) {
        promotionStatus = manualOverride[student.id];
      } else if (averageScore >= 50 && attendance >= 50) {
        promotionStatus = "Promoted";
      } else {
        promotionStatus = "Repeated";
      }
      return {
        ...student,
        averageScore,
        attendance,
        promotionStatus,
        position: thirdTermResult?.position || 0,
        totalStudents: thirdTermResult?.total_students || 0,
        termCount,
      };
    });
  }, [classStudents, compiledResults, manualOverride, currentAcademicYear, currentTerm]);

  const filteredStudents = useMemo(() => {
    return studentsWithStatus.filter((student: any) => {
      const matchesSearch =
        (student.firstName && student.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.lastName && student.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === "All" || student.promotionStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [studentsWithStatus, searchQuery, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSourceClass, searchQuery, filterStatus]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  }, [filteredStudents.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const summary = useMemo(() => ({
    totalStudents: filteredStudents.length,
    toPromote: filteredStudents.filter((s: any) => s.promotionStatus === "Promoted").length,
    onTrial: filteredStudents.filter((s: any) => s.promotionStatus === "Conditional").length,
    toRepeat: filteredStudents.filter((s: any) => s.promotionStatus === "Repeated").length,
    pending: filteredStudents.filter((s: any) => s.averageScore === 0).length,
    onHold: filteredStudents.filter((s: any) => s.promotionStatus === "On Hold").length,
    withdrawn: filteredStudents.filter((s: any) => s.promotionStatus === "Withdrawn").length,
    pendingApproval: filteredStudents.filter((s: any) => s.promotionStatus === "Pending Approval").length,
    manual: filteredStudents.filter((s: any) => s.promotionStatus === "Manual").length,
  }), [filteredStudents]);

  const handleSelectStudent = (studentId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
    } else {
      setSelectedStudents((prev) => prev.filter((id: number) => id !== studentId));
      const newMapping = { ...promotionMapping };
      delete newMapping[studentId];
      setPromotionMapping(newMapping);
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents(filteredStudents.filter((s: any) => s.promotionStatus === "Promoted").map((s: any) => s.id));
    } else {
      setSelectedStudents([]);
      setPromotionMapping({});
      setPromotionErrors({});
    }
  };

  const handleSetDestinationClass = (studentId: number, classId: number) => {
    const validation = validatePromotion(studentId, classId);
    if (!validation.valid) {
      setPromotionErrors({ ...promotionErrors, [studentId]: validation.message });
      toast.error(validation.message);
      return;
    }
    const newErrors = { ...promotionErrors };
    delete newErrors[studentId];
    setPromotionErrors(newErrors);
    setPromotionMapping({ ...promotionMapping, [studentId]: classId });
  };

  const handleManualPromotion = (student: any) => {
    setSelectedStudentForManual(student);
    setShowManualDialog(true);
  };

  const handleManualClassChange = (student: any) => {
    setSelectedStudentForManual(student);
    setShowManualClassChangeDialog(true);
  };

  const confirmManualClassChange = async () => {
    if (!selectedStudentForManual || !manualClassChangeReason) {
      toast.error('Please provide a reason for the manual class change');
      return;
    }
    try {
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`${API_CONFIG.BASE_URL}/student/manual-class-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student_id: selectedStudentForManual.id,
          from_class_id: selectedStudentForManual.class_id,
          to_class_id: demotionClassId,
          reason: manualClassChangeReason,
          academic_year: currentAcademicYear
        })
      });
      if (response.ok) {
        toast.success('Manual class change completed successfully');
        await refreshStudents();
        setShowManualClassChangeDialog(false);
        setManualClassChangeReason('');
        setDemotionClassId(null);
        setSelectedStudentForManual(null);
      } else {
        throw new Error('Failed to complete manual class change');
      }
    } catch (error) {
      toast.error('Failed to complete manual class change');
    }
  };

  const confirmManualPromotion = (action: PromotionStatus, targetClassId?: number) => {
    if (!selectedStudentForManual) return;
    if (action === 'Promoted' || action === 'Repeated') {
      setManualOverride({ ...manualOverride, [selectedStudentForManual.id]: action });
      if (action === 'Promoted') {
        setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
      } else if (action === 'Repeated' && targetClassId) {
        setPromotionMapping({ ...promotionMapping, [selectedStudentForManual.id]: targetClassId });
        setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
      } else if (action === 'Repeated') {
        setPromotionMapping({ ...promotionMapping, [selectedStudentForManual.id]: selectedStudentForManual.class_id });
        setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
      }
      toast.success(`Manual ${action} status set for ${selectedStudentForManual.firstName} ${selectedStudentForManual.lastName}`);
    } else {
      setManualOverride({ ...manualOverride, [selectedStudentForManual.id]: action });
      setPromotionMapping({ ...promotionMapping, [selectedStudentForManual.id]: selectedStudentForManual.class_id });
      setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
      toast.success(`Manual ${action} status set for ${selectedStudentForManual.firstName} ${selectedStudentForManual.lastName}`);
    }
    setShowManualDialog(false);
    setSelectedStudentForManual(null);
    setDemotionClassId(null);
  };

  const getNextClasses = useMemo(() => {
    return (currentClassId: number) => {
      const rules = progressionRules.filter((rule: any) => rule.from_class_id === currentClassId);
      const validClasses = classes.filter((cls: any) => rules.some((rule: any) => rule.to_class_id === cls.id));
      if (validClasses.length === 0) {
        const currentClass = classes.find((cls: any) => cls.id === currentClassId);
        return currentClass ? [{ ...currentClass, isGraduation: true }] : [];
      }
      return validClasses;
    };
  }, [progressionRules, classes]);

  const getDemotionClasses = useMemo(() => {
    return (currentClassId: number) => {
      const rules = progressionRules.filter((rule: any) => rule.to_class_id === currentClassId);
      return classes.filter((cls: any) => rules.some((rule: any) => rule.from_class_id === cls.id));
    };
  }, [progressionRules, classes]);

  const validatePromotion = (studentId: number, toClassId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    if (!student) return { valid: false, message: 'Student not found' };
    const studentStatus: PromotionStatus = manualOverride[studentId] || 'Promoted';
    if (studentStatus === 'Repeated') {
      const sameClass = (student.class_id === toClassId);
      const validDemotion = progressionRules.some((rule: any) =>
        rule.to_class_id === student.class_id && rule.from_class_id === toClassId
      );
      if (!sameClass && !validDemotion) return { valid: false, message: 'Invalid repeat/demotion path' };
    } else if (studentStatus === 'Manual') {
      // Manual overrides allow admin to choose any class.
    } else {
      if (student.class_id === toClassId) {
        const hasRules = progressionRules.some((rule: any) => rule.from_class_id === student.class_id);
        if (hasRules) return { valid: false, message: 'Same class not allowed when progression path exists' };
      } else {
        const validPath = progressionRules.some((rule: any) =>
          rule.from_class_id === student.class_id && rule.to_class_id === toClassId
        );
        if (!validPath) return { valid: false, message: 'Invalid progression path' };
      }
    }
    return { valid: true, message: 'Valid promotion path' };
  };

  const handlePromoteStudents = () => {
    if (!isThirdTerm) {
      toast.error("Promotion can only be done at the end of the session (Third Term)");
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error("Please select students to promote");
      return;
    }
    if (selectedStudents.length > 50) {
      toast.error("Maximum 50 students can be processed at once");
      return;
    }
    const missingDestination = selectedStudents.filter((id: number) => !promotionMapping[id]);
    if (missingDestination.length > 0) {
      toast.error("Please set destination class for all selected students");
      return;
    }
    const invalidPromotions = selectedStudents.filter((id: number) => {
      const validation = validatePromotion(id, promotionMapping[id]);
      if (!validation.valid) {
        setPromotionErrors({ ...promotionErrors, [id]: validation.message });
        return true;
      }
      return false;
    });
    if (invalidPromotions.length > 0) {
      toast.error("Some promotions have validation errors. Please fix them before proceeding.");
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmPromotion = async () => {
    setIsPromoting(true);
    setPromotionProgress(0);
    try {
      const promotions = selectedStudents.map((studentId: number) => {
        const student = students.find((s: any) => s.id === studentId);
        const studentData = studentsWithStatus.find((s: any) => s.id === studentId);
        return {
          student_id: studentId,
          from_class_id: student?.class_id,
          to_class_id: promotionMapping[studentId],
          from_academic_year: currentAcademicYear,
          status: studentData?.promotionStatus || 'Promoted',
          override_reason: manualOverride[studentId] ? 'Manual override set by admin' : undefined
        };
      });
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`${API_CONFIG.BASE_URL}/student/promote-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ promotions, to_academic_year: newAcademicYear })
      });
      if (!response.ok) throw new Error('Failed to promote students');
      const result = await response.json();
      setPromotionProgress(100);
      if (result.data) {
        const { processed_students, failed_students, failed_details } = result.data;
        if (failed_students > 0) {
          toast.warning(`${processed_students} students processed, ${failed_students} failed`);
          failed_details?.forEach((error: any) => toast.error(`Student ${error.student_id}: ${error.error}`));
        } else {
          toast.success(`Successfully promoted ${processed_students} students!`);
        }
      } else {
        toast.success(`Successfully promoted ${selectedStudents.length} students!`);
      }
      if (currentUser) {
        addActivityLog({
          id: 0, timestamp: new Date().toISOString(), actor: currentUser.username, actor_role: 'Admin',
          action: 'Promote Students', target: `${selectedStudents.length} students promoted`,
          ip_address: 'System', status: 'Success',
          details: `Promoted ${selectedStudents.length} students from ${classes.find((c: any) => c.id === Number(selectedSourceClass))?.name} to ${newAcademicYear}`,
        });
      }
      await refreshStudents();
      await loadPromotionHistory();
      loadClassCapacity();
      setShowConfirmDialog(false);
      setSelectedStudents([]);
      setPromotionMapping({});
      setPromotionErrors({});
      setManualOverride({});
    } catch (error) {
      toast.error("Failed to promote students. Please try again.");
    } finally {
      setIsPromoting(false);
      setPromotionProgress(0);
    }
  };

  const exportPromotionList = () => {
    const headers = ['Student Name', 'Admission No', 'Current Class', 'Average Score', 'Position', 'Attendance', 'Status', 'Next Class', 'Manual Override'];
    const rows = filteredStudents.map((s: any) => {
      const nextClass = promotionMapping[s.id] ? classes.find((c: any) => c.id === promotionMapping[s.id])?.name : '-';
      return [
        `${s.firstName} ${s.lastName}`, s.admissionNumber, s.className,
        s.averageScore.toFixed(1), `${s.position}/${s.totalStudents}`,
        `${s.attendance.toFixed(0)}%`, s.promotionStatus, nextClass || '-',
        manualOverride[s.id] ? 'Yes' : 'No'
      ];
    });
    const csvContent = [headers, ...rows].map((row: any[]) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Promotion list exported successfully");
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-[#0A2540] rounded-xl">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-gray-900">Student Promotion System</h1>
            <p className="text-gray-600">Manage student promotions to next academic session</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-[#0A2540] border-gray-200">
              {currentAcademicYear} - {currentTerm}
            </Badge>
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#0A2540] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Promotion History Summary */}
      {promotionHistory.length > 0 && (
        <Card className="border border-gray-100 shadow-xl bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0A2540]" />
                Recent Promotion Activity
              </h3>
              <Badge variant="outline" className="text-[#0A2540]">
                {promotionHistory.length} promotions this session
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promotionHistory.slice(0, 3).map((promo: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{promo.first_name} {promo.last_name}</p>
                    <p className="text-xs text-gray-500">{promo.from_class_name} → {promo.to_class_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(promo.promotion_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {selectedSourceClass && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg"><Users className="w-5 h-5 text-[#0A2540]" /></div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">In selected class</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
                <p className="text-gray-600 text-sm font-medium">Promote</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{summary.toPromote}</p>
              <p className="text-xs text-gray-500 mt-1">Ready for promotion</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
                <p className="text-gray-600 text-sm font-medium">Conditional</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{summary.onTrial}</p>
              <p className="text-xs text-gray-500 mt-1">Need improvement</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
                <p className="text-gray-600 text-sm font-medium">Repeat</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.toRepeat}</p>
              <p className="text-xs text-gray-500 mt-1">To repeat class</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                <p className="text-gray-600 text-sm font-medium">Other</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{summary.onHold + summary.withdrawn + summary.pendingApproval + summary.manual}</p>
              <p className="text-xs text-gray-500 mt-1">Special cases</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-xl bg-white">
        <CardHeader className="pb-4">
          <h3 className="text-lg font-heading font-bold text-gray-900">Promotion Settings</h3>
          <p className="text-sm text-gray-600">Configure promotion parameters and filter students</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">New Academic Year</Label>
              <Select value={newAcademicYear} onValueChange={setNewAcademicYear}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="2025/2026" className="text-gray-900">2025/2026</SelectItem>
                  <SelectItem value="2026/2027" className="text-gray-900">2026/2027</SelectItem>
                  <SelectItem value="2027/2028" className="text-gray-900">2027/2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Source Class *</Label>
              <Select value={selectedSourceClass} onValueChange={setSelectedSourceClass}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                  <SelectValue placeholder="Select source class" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {classes.filter((c: any) => c.status === 'Active').map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name} ({students.filter((s: any) => s.class_id === cls.id && s.status === 'Active').length} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="All" className="text-gray-900">All Students</SelectItem>
                  <SelectItem value="Promoted" className="text-gray-900">Promoted Only</SelectItem>
                  <SelectItem value="Conditional" className="text-gray-900">Conditional Only</SelectItem>
                  <SelectItem value="Repeated" className="text-gray-900">Repeated Only</SelectItem>
                  <SelectItem value="On Hold" className="text-gray-900">On Hold Only</SelectItem>
                  <SelectItem value="Withdrawn" className="text-gray-900">Withdrawn Only</SelectItem>
                  <SelectItem value="Pending Approval" className="text-gray-900">Pending Approval Only</SelectItem>
                  <SelectItem value="Manual" className="text-gray-900">Manual Override Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Search Student</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name or Admission No..."
                  className="h-12 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProgressionRulesPanel
        progressionRules={progressionRules}
        classes={classes}
        currentAcademicYear={currentAcademicYear}
        newRuleFromClassId={newRuleFromClassId}
        newRuleToClassId={newRuleToClassId}
        newRuleIsActive={newRuleIsActive}
        ruleActionLoading={ruleActionLoading}
        onSetFromClassId={setNewRuleFromClassId}
        onSetToClassId={setNewRuleToClassId}
        onSetActive={setNewRuleIsActive}
        onCreateRule={createProgressionRule}
        onUpdateStatus={updateProgressionRuleStatus}
        onDeleteRule={deleteProgressionRule}
        onRefresh={loadProgressionRules}
      />

      <StudentPromotionTable
        selectedSourceClass={selectedSourceClass}
        filteredStudents={filteredStudents}
        paginatedStudents={paginatedStudents}
        selectedStudents={selectedStudents}
        promotionMapping={promotionMapping}
        promotionErrors={promotionErrors}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        classes={classes}
        classCapacity={classCapacity}
        getNextClasses={getNextClasses}
        onSelectStudent={handleSelectStudent}
        onSelectAll={handleSelectAll}
        onSetDestinationClass={handleSetDestinationClass}
        onHandleManualPromotion={handleManualPromotion}
        onHandleManualClassChange={handleManualClassChange}
        onHandlePromoteStudents={handlePromoteStudents}
        onExportPromotionList={exportPromotionList}
        isPromoting={isPromoting}
        onSetCurrentPage={setCurrentPage}
        onSetPageSize={setPageSize}
      />

      <ConfirmPromotionDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedCount={selectedStudents.length}
        newAcademicYear={newAcademicYear}
        isPromoting={isPromoting}
        promotionProgress={promotionProgress}
        onConfirm={confirmPromotion}
      />

      <ManualPromotionDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        selectedStudent={selectedStudentForManual}
        demotionClassId={demotionClassId}
        demotionClasses={selectedStudentForManual ? getDemotionClasses(selectedStudentForManual.class_id) : []}
        onSetDemotionClassId={setDemotionClassId}
        onConfirmManualPromotion={confirmManualPromotion}
        onCancel={() => {
          setShowManualDialog(false);
          setSelectedStudentForManual(null);
          setDemotionClassId(null);
        }}
      />

      <ManualClassChangeDialog
        open={showManualClassChangeDialog}
        onOpenChange={setShowManualClassChangeDialog}
        selectedStudent={selectedStudentForManual}
        classes={classes}
        classCapacity={classCapacity}
        demotionClassId={demotionClassId}
        manualClassChangeReason={manualClassChangeReason}
        onSetDemotionClassId={setDemotionClassId}
        onSetManualClassChangeReason={setManualClassChangeReason}
        onConfirm={confirmManualClassChange}
        onCancel={() => {
          setShowManualClassChangeDialog(false);
          setManualClassChangeReason('');
          setDemotionClassId(null);
          setSelectedStudentForManual(null);
        }}
      />
    </div>
  );
}
