import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Progress } from "../ui/progress";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { GraduationCap, Users, TrendingUp, AlertTriangle, Download, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { CapacitorHelper } from "../../utils/capacitorHelper";

// Enhanced promotion status types matching database
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
    addActivityLog,
    currentUser,
    refreshStudents
  } = useSchool() as {
    students: any[],
    classes: any[],
    compiledResults: any[],
    currentTerm: string,
    currentAcademicYear: string,
    addActivityLog: Function,
    currentUser: any,
    refreshStudents: Function
  };

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

  // Load progression rules and promotion history on component mount and when dependencies change
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

  // Load class capacity when classes data changes
  useEffect(() => {
    loadClassCapacity();
  }, [classes]);

  // Load progression rules when component mounts
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
        // Fallback to empty array - page will still work
        setProgressionRules([]);
        toast.error('Progression rules unavailable - using default behavior');
      }
    } catch (error) {
      // Fallback to empty array
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
        // Fallback to empty array
        setPromotionHistory([]);
        // Don't show error toast for 404 - this endpoint might not exist yet
      }
    } catch (error) {
      // Fallback to empty array
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
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create progression rule');
      }

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
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update progression rule');
      }

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
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete progression rule');
      }

      toast.success('Progression rule deleted');
      await loadProgressionRules();
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete rule');
    } finally {
      setRuleActionLoading(false);
    }
  };

  // Get students in selected class
  const classStudents = useMemo(() => {
    const classStudentsList = selectedSourceClass
      ? students.filter((s: any) => s.class_id === Number(selectedSourceClass) && s.status === 'Active')
      : [];
    return classStudentsList;
  }, [selectedSourceClass, students]);

  // Get latest results for each student to determine promotion status
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

      // Check for manual override first
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

  // Apply filters
  const filteredStudents = useMemo(() => {
    const filtered = studentsWithStatus.filter((student: any) => {
      const matchesSearch = 
        (student.firstName && student.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.lastName && student.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = 
        filterStatus === "All" || 
        student.promotionStatus === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
    return filtered;
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

  // Calculate summary
  const summary = useMemo(() => {
    const summaryData = {
      totalStudents: filteredStudents.length,
      toPromote: filteredStudents.filter((s: any) => s.promotionStatus === "Promoted").length,
      onTrial: filteredStudents.filter((s: any) => s.promotionStatus === "Conditional").length,
      toRepeat: filteredStudents.filter((s: any) => s.promotionStatus === "Repeated").length,
      pending: filteredStudents.filter((s: any) => s.averageScore === 0).length,
      onHold: filteredStudents.filter((s: any) => s.promotionStatus === "On Hold").length,
      withdrawn: filteredStudents.filter((s: any) => s.promotionStatus === "Withdrawn").length,
      pendingApproval: filteredStudents.filter((s: any) => s.promotionStatus === "Pending Approval").length,
      manual: filteredStudents.filter((s: any) => s.promotionStatus === "Manual").length,
    };
    return summaryData;
  }, [filteredStudents]);

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
      const promotableStudents = filteredStudents
      .filter((s: any) => s.promotionStatus === "Promoted")
      .map((s: any) => s.id);
      setSelectedStudents(promotableStudents);
    } else {
      setSelectedStudents([]);
      setPromotionMapping({});
      setPromotionErrors({});
    }
  };

  const handleSetDestinationClass = (studentId: number, classId: number) => {
    // Validate promotion before setting
    const validation = validatePromotion(studentId, classId);
    if (!validation.valid) {
      setPromotionErrors({
        ...promotionErrors,
        [studentId]: validation.message
      });
      toast.error(validation.message);
      return;
    }

    // Clear any previous error
    const newErrors = { ...promotionErrors };
    delete newErrors[studentId];
    setPromotionErrors(newErrors);

    setPromotionMapping({
      ...promotionMapping,
      [studentId]: classId,
    });
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
    if (selectedStudentForManual) {
      if (action === 'Promoted' || action === 'Repeated') {
        // Set promotion status
        setManualOverride({
          ...manualOverride,
          [selectedStudentForManual.id]: action,
        });
        
        // Set destination class
        if (action === 'Promoted') {
          setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
        } else if (action === 'Repeated' && targetClassId) {
          // For demotion, set the target class in promotion mapping
          setPromotionMapping({
            ...promotionMapping,
            [selectedStudentForManual.id]: targetClassId,
          });
          setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
        } else if (action === 'Repeated') {
          // Repeat in the same class
          setPromotionMapping({
            ...promotionMapping,
            [selectedStudentForManual.id]: selectedStudentForManual.class_id,
          });
          setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
        }
        
        toast.success(`Manual ${action} status set for ${selectedStudentForManual.firstName} ${selectedStudentForManual.lastName}`);
      } else {
        // Other statuses — keep in batch so they get persisted to student_promotions
        setManualOverride({
          ...manualOverride,
          [selectedStudentForManual.id]: action,
        });

        // Set destination to current class (no class move, but status gets recorded)
        setPromotionMapping({
          ...promotionMapping,
          [selectedStudentForManual.id]: selectedStudentForManual.class_id,
        });
        setSelectedStudents((prev) => prev.includes(selectedStudentForManual.id) ? prev : [...prev, selectedStudentForManual.id]);
        toast.success(`Manual ${action} status set for ${selectedStudentForManual.firstName} ${selectedStudentForManual.lastName}`);
      }
      
      // Reset states
      setShowManualDialog(false);
      setSelectedStudentForManual(null);
      setDemotionClassId(null);
    }
  };

  // Dynamic progression rules from database
  const getNextClasses = useMemo(() => {
    return (currentClassId: number) => {
      const rules = progressionRules.filter((rule: any) => rule.from_class_id === currentClassId);
      const validClasses = classes.filter((cls: any) => rules.some((rule: any) => rule.to_class_id === cls.id));
      // If no progression rules exist from this class, it's a terminal/graduating class
      if (validClasses.length === 0) {
        const currentClass = classes.find((cls: any) => cls.id === currentClassId);
        return currentClass ? [{ ...currentClass, isGraduation: true }] : [];
      }
      return validClasses;
    };
  }, [progressionRules, classes]);

  // Dynamic demotion rules (reverse of progression)
  const getDemotionClasses = useMemo(() => {
    return (currentClassId: number) => {
      const rules = progressionRules.filter((rule: any) => rule.to_class_id === currentClassId);
      return classes.filter((cls: any) => rules.some((rule: any) => rule.from_class_id === cls.id));
    };
  }, [progressionRules, classes]);

  // Validate promotion path and capacity
  const validatePromotion = (studentId: number, toClassId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    if (!student) return { valid: false, message: 'Student not found' };

    const studentStatus: PromotionStatus = manualOverride[studentId] || 'Promoted';

    if (studentStatus === 'Repeated') {
      const sameClass = (student.class_id === toClassId);
      const validDemotion = progressionRules.some((rule: any) =>
        rule.to_class_id === student.class_id &&
        rule.from_class_id === toClassId
      );
      if (!sameClass && !validDemotion) {
        return { valid: false, message: 'Invalid repeat/demotion path' };
      }
    } else if (studentStatus === 'Manual') {
      // Manual overrides allow admin to choose any class.
    } else {
      // Check progression path
      if (student.class_id === toClassId) {
        // Same class destination — only valid if this is a terminal class (no progression rules)
        const hasRules = progressionRules.some((rule: any) => rule.from_class_id === student.class_id);
        if (hasRules) {
          return { valid: false, message: 'Same class not allowed when progression path exists' };
        }
      } else {
        const validPath = progressionRules.some((rule: any) => 
          rule.from_class_id === student.class_id && 
          rule.to_class_id === toClassId
        );
        if (!validPath) {
          return { valid: false, message: 'Invalid progression path' };
        }
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

    // Check batch size limit
    if (selectedStudents.length > 50) {
      toast.error("Maximum 50 students can be processed at once");
      return;
    }

    // Check if all selected students have destination classes
    const missingDestination = selectedStudents.filter((id: number) => !promotionMapping[id]);
    if (missingDestination.length > 0) {
      toast.error("Please set destination class for all selected students");
      return;
    }

    // Validate all promotions
    const invalidPromotions = selectedStudents.filter((id: number) => {
      const validation = validatePromotion(id, promotionMapping[id]);
      if (!validation.valid) {
        setPromotionErrors({
          ...promotionErrors,
          [id]: validation.message
        });
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
      // Prepare promotion data for API
      const promotions = selectedStudents.map((studentId: number) => {
        const student = students.find((s: any) => s.id === studentId);
        const fromClassId = student?.class_id;
        const toClassId = promotionMapping[studentId];
        const studentData = studentsWithStatus.find((s: any) => s.id === studentId);
        
        return {
          student_id: studentId,
          from_class_id: fromClassId,
          to_class_id: toClassId,
          from_academic_year: currentAcademicYear,
          status: studentData?.promotionStatus || 'Promoted',
          override_reason: manualOverride[studentId] ? 'Manual override set by admin' : undefined
        };
      });

      // Call the API
      const token = localStorage.getItem(API_CONFIG.AUTH.TOKEN_KEY);
      const response = await fetch(`${API_CONFIG.BASE_URL}/student/promote-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          promotions: promotions,
          to_academic_year: newAcademicYear
        })
      });

      if (!response.ok) {
        throw new Error('Failed to promote students');
      }

      const result = await response.json();
      
      // Update progress
      setPromotionProgress(100);
      
      // Handle detailed response from enhanced API
      if (result.data) {
        const { processed_students, failed_students, failed_details } = result.data;
        
        if (failed_students > 0) {
          toast.warning(`${processed_students} students processed, ${failed_students} failed`);
          // Show error details
          failed_details?.forEach((error: any) => {
            toast.error(`Student ${error.student_id}: ${error.error}`);
          });
        } else {
          toast.success(`Successfully promoted ${processed_students} students!`);
        }
      } else {
        toast.success(`Successfully promoted ${selectedStudents.length} students!`);
      }
      // Log activity
      if (currentUser) {
        addActivityLog({
          id: 0,
          timestamp: new Date().toISOString(),
          actor: currentUser.username,
          actor_role: 'Admin',
          action: 'Promote Students',
          target: `${selectedStudents.length} students promoted`,
          ip_address: 'System',
          status: 'Success',
          details: `Promoted ${selectedStudents.length} students from ${classes.find((c: any) => c.id === Number(selectedSourceClass))?.name} to ${newAcademicYear}`,
        });
      }

      // Refresh data
      await refreshStudents();
      await loadPromotionHistory();
      loadClassCapacity();
      
      // Reset states
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

  const getStatusBadge = (status: PromotionStatus, studentId: number) => {
    const isManualOverride = manualOverride[studentId];
    const hasError = promotionErrors[studentId];
    const badgeClass = isManualOverride ? "ring-2 ring-orange-300" : hasError ? "ring-2 ring-red-300" : "";
    
    switch (status) {
      case "Promoted":
        return <Badge className={`bg-emerald-500 text-white border-0 ${badgeClass}`}><CheckCircle className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Promoted</Badge>;
      case "Conditional":
        return <Badge className={`bg-yellow-500 text-white border-0 ${badgeClass}`}><Clock className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Conditional</Badge>;
      case "Repeated":
        return <Badge className={`bg-red-500 text-white border-0 ${badgeClass}`}><XCircle className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Repeated</Badge>;
      case "On Hold":
        return <Badge className={`bg-orange-500 text-white border-0 ${badgeClass}`}><AlertTriangle className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}On Hold</Badge>;
      case "Withdrawn":
        return <Badge className={`bg-gray-500 text-white border-0 ${badgeClass}`}><XCircle className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Withdrawn</Badge>;
      case "Pending Approval":
        return <Badge className={`bg-[#0A2540] text-white border-0 ${badgeClass}`}><Clock className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Pending Approval</Badge>;
      case "Manual":
        return <Badge className={`bg-[#0A2540] text-white border-0 ${badgeClass}`}><Settings className="w-3 h-3 mr-1" />Manual</Badge>;
      case "Transferred":
        return <Badge className={`bg-[#0A2540] text-white border-0 ${badgeClass}`}><TrendingUp className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Transferred</Badge>;
      default:
        return <Badge className={`bg-gray-500 text-white border-0 ${badgeClass}`}><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const exportPromotionList = async () => {
    const headers = ['Student Name', 'Admission No', 'Current Class', 'Average Score', 'Position', 'Attendance', 'Status', 'Next Class', 'Manual Override'];
    const rows = filteredStudents.map((s: any) => {
      const nextClass = promotionMapping[s.id] ? classes.find((c: any) => c.id === promotionMapping[s.id])?.name : '-';
      const isManual = manualOverride[s.id] ? 'Yes' : 'No';
      return [
        `${s.firstName} ${s.lastName}`,
        s.admissionNumber,
        s.className,
        s.averageScore.toFixed(1),
        `${s.position}/${s.totalStudents}`,
        `${s.attendance.toFixed(0)}%`,
        s.promotionStatus,
        nextClass || '-',
        isManual
      ];
    });
    
    const csvContent = [headers, ...rows].map((row: any[]) => row.join(',')).join('\n');
    await CapacitorHelper.downloadCSV(csvContent, `promotion-list-${new Date().toISOString().split('T')[0]}.csv`);
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
                    <p className="text-sm font-medium text-gray-900">
                      {promo.first_name} {promo.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {promo.from_class_name} → {promo.to_class_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(promo.promotion_date).toLocaleDateString()}
                    </p>
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
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="w-5 h-5 text-[#0A2540]" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">In selected class</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Promote</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{summary.toPromote}</p>
              <p className="text-xs text-gray-500 mt-1">Ready for promotion</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Conditional</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{summary.onTrial}</p>
              <p className="text-xs text-gray-500 mt-1">Need improvement</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Repeat</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.toRepeat}</p>
              <p className="text-xs text-gray-500 mt-1">To repeat class</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
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

      {/* Progression Rule Management */}
      <Card className="border border-gray-100 shadow-xl bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-[#0A2540]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-gray-900">Progression Rules</h3>
                <p className="text-sm text-gray-600">Manage valid class progression paths for {currentAcademicYear}.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Badge variant="outline" className="text-[#0A2540] border-gray-200">
                {currentAcademicYear}
              </Badge>
              <Button
                onClick={loadProgressionRules}
                disabled={ruleActionLoading}
                variant="outline"
                className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Refresh Rules
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">From Class</Label>
              <Select value={newRuleFromClassId ? newRuleFromClassId.toString() : ''} onValueChange={(value) => setNewRuleFromClassId(value ? Number(value) : null)}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                  <SelectValue placeholder="Select source class" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {classes.filter((c: any) => c.status === 'Active').map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">To Class</Label>
              <Select value={newRuleToClassId ? newRuleToClassId.toString() : ''} onValueChange={(value) => setNewRuleToClassId(value ? Number(value) : null)}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                  <SelectValue placeholder="Select destination class" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {classes.filter((c: any) => c.status === 'Active').map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Rule Active</Label>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={newRuleIsActive}
                  onCheckedChange={(checked: boolean) => setNewRuleIsActive(checked)}
                  className="border-gray-300"
                />
                <span className="text-sm text-gray-700">Active</span>
              </div>
              <Button
                onClick={createProgressionRule}
                disabled={ruleActionLoading}
                className="w-full h-12 bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
              >
                Add Rule
              </Button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="text-gray-700 font-semibold">From Class</TableHead>
                  <TableHead className="text-gray-700 font-semibold">To Class</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Academic Year</TableHead>
                  <TableHead className="text-gray-700 font-semibold text-center">Active</TableHead>
                  <TableHead className="text-gray-700 font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressionRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      No progression rules found for this academic year.
                    </TableCell>
                  </TableRow>
                ) : (
                  progressionRules.map((rule: any) => (
                    <TableRow key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <TableCell>{rule.from_class_name || `#${rule.from_class_id}`}</TableCell>
                      <TableCell>{rule.to_class_name || `#${rule.to_class_id}`}</TableCell>
                      <TableCell>{rule.academic_year}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={rule.is_active ? 'bg-emerald-500 text-white border-0' : 'bg-gray-300 text-gray-700 border-0'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button
                          onClick={() => updateProgressionRuleStatus(rule.id, rule.is_active ? false : true)}
                          disabled={ruleActionLoading}
                          variant="outline"
                          className="h-9 px-3 text-sm border-gray-200"
                        >
                          {rule.is_active ? 'Disable' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => deleteProgressionRule(rule.id)}
                          disabled={ruleActionLoading}
                          variant="destructive"
                          className="h-9 px-3 text-sm"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card view for progression rules */}
          <div className="md:hidden space-y-3 p-4">
            {progressionRules.length === 0 ? (
              <p className="text-center py-12 text-gray-500">No progression rules found for this academic year.</p>
            ) : (
              progressionRules.map((rule: any) => (
                <div key={rule.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{rule.from_class_name || `#${rule.from_class_id}`} → {rule.to_class_name || `#${rule.to_class_id}`}</p>
                    <Badge className={rule.is_active ? 'bg-emerald-500 text-white border-0' : 'bg-gray-300 text-gray-700 border-0'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{rule.academic_year}</p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => updateProgressionRuleStatus(rule.id, rule.is_active ? false : true)}
                      disabled={ruleActionLoading}
                      variant="outline"
                      className="h-9 px-3 text-sm border-gray-200 flex-1"
                    >
                      {rule.is_active ? 'Disable' : 'Activate'}
                    </Button>
                    <Button
                      onClick={() => deleteProgressionRule(rule.id)}
                      disabled={ruleActionLoading}
                      variant="destructive"
                      className="h-9 px-3 text-sm flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {selectedSourceClass ? (
        <Card className="border border-gray-100 shadow-xl bg-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-[#0A2540]" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-gray-900">Students for Promotion</h3>
                  <p className="text-sm text-gray-600">{filteredStudents.length} students found</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={exportPromotionList}
                  variant="outline"
                  className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export List
                </Button>
                <Button
                  onClick={handlePromoteStudents}
                  disabled={selectedStudents.length === 0 || isPromoting}
                  className="h-10 bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl shadow-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isPromoting ? 'Processing...' : `Promote Selected (${selectedStudents.length})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-gray-700 font-semibold">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.filter((s: any) => s.promotionStatus === "Promoted").length}
                        onCheckedChange={handleSelectAll}
                        className="border-gray-300"
                      />
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">Student</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Adm. No</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Average</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Position</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Attendance</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Destination Class</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-gray-900 font-medium mb-1">No students found</p>
                          <p className="text-gray-500 text-sm">
                            {selectedSourceClass ? 'No active students in this class' : 'Please select a source class'}
                          </p>
                          {students.length === 0 && (
                            <p className="text-orange-600 text-xs mt-2">No student data available - check database connection</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((student: any) => {
                      const nextClasses = getNextClasses(student.class_id);
                      return (
                        <TableRow key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked: boolean) => handleSelectStudent(student.id, checked)}
                              disabled={student.promotionStatus === "Repeated"}
                              className="border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900 font-medium">{student.firstName} {student.lastName}</p>
                              <p className="text-xs text-gray-500">{student.className}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{student.admissionNumber}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${student.averageScore >= 50 ? 'text-emerald-600' : student.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {student.averageScore.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-gray-600">
                            {student.position > 0 ? `${student.position}/${student.totalStudents}` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${student.attendance >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {student.attendance.toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(student.promotionStatus, student.id)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManualPromotion(student)}
                                className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                Manual
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {selectedStudents.includes(student.id) ? (
                              <div className="space-y-2">
                                <Select
                                  value={promotionMapping[student.id]?.toString() || ''}
                                  onValueChange={(value: string) => handleSetDestinationClass(student.id, Number(value))}
                                >
                                  <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white text-gray-900">
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-200">
                                    {nextClasses.map((cls: any) => {
                                      const capacity = classCapacity[cls.id];
                                      const isFull = capacity && capacity.current >= capacity.max;
                                      return (
                                        <SelectItem 
                                          key={cls.id} 
                                          value={cls.id.toString()} 
                                          className={`text-gray-900 ${isFull && !cls.isGraduation ? 'text-red-600 bg-red-50' : cls.isGraduation ? 'text-emerald-600 bg-emerald-50 font-medium' : ''}`}
                                          onClick={() => {
                                            if (isFull && !cls.isGraduation) {
                                              toast.error('Class is at full capacity');
                                            }
                                          }}
                                        >
                                          {cls.isGraduation ? `Graduate — ${cls.name}` : `${cls.name} (${capacity?.current || 0}/${capacity?.max || 40}) ${isFull ? '(FULL)' : ''}`}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {promotionErrors[student.id] && (
                                  <p className="text-xs text-red-600">{promotionErrors[student.id]}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManualPromotion(student)}
                                className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                Manual
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManualClassChange(student)}
                                className="h-7 px-2 text-xs border-gray-200 text-[#0A2540] hover:bg-gray-50"
                              >
                                Change Class
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card view for students */}
            <div className="md:hidden space-y-3 p-4">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-900 font-medium mb-1">No students found</p>
                  <p className="text-gray-500 text-sm">
                    {selectedSourceClass ? 'No active students in this class' : 'Please select a source class'}
                  </p>
                </div>
              ) : (
                paginatedStudents.map((student: any) => {
                  const nextClasses = getNextClasses(student.class_id);
                  return (
                    <div key={student.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked: boolean) => handleSelectStudent(student.id, checked)}
                            disabled={student.promotionStatus === "Repeated"}
                            className="border-gray-300 mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-gray-500">{student.className} • {student.admissionNumber}</p>
                          </div>
                        </div>
                        {getStatusBadge(student.promotionStatus, student.id)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                          <p className="text-xs text-gray-500">Average</p>
                          <p className={`text-sm font-semibold ${student.averageScore >= 50 ? 'text-emerald-600' : student.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {student.averageScore.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                          <p className="text-xs text-gray-500">Position</p>
                          <p className="text-sm font-semibold text-gray-700">
                            {student.position > 0 ? `${student.position}/${student.totalStudents}` : '-'}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                          <p className="text-xs text-gray-500">Attendance</p>
                          <p className={`text-sm font-semibold ${student.attendance >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {student.attendance.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      {selectedStudents.includes(student.id) && (
                        <div className="space-y-2">
                          <Select
                            value={promotionMapping[student.id]?.toString() || ''}
                            onValueChange={(value: string) => handleSetDestinationClass(student.id, Number(value))}
                          >
                            <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white text-gray-900">
                              <SelectValue placeholder="Select destination class" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              {nextClasses.map((cls: any) => {
                                const capacity = classCapacity[cls.id];
                                const isFull = capacity && capacity.current >= capacity.max;
                                return (
                                  <SelectItem
                                    key={cls.id}
                                    value={cls.id.toString()}
                                    className={`text-gray-900 ${isFull && !cls.isGraduation ? 'text-red-600 bg-red-50' : cls.isGraduation ? 'text-emerald-600 bg-emerald-50 font-medium' : ''}`}
                                    onClick={() => {
                                      if (isFull && !cls.isGraduation) {
                                        toast.error('Class is at full capacity');
                                      }
                                    }}
                                  >
                                    {cls.isGraduation ? `Graduate — ${cls.name}` : `${cls.name} (${capacity?.current || 0}/${capacity?.max || 40}) ${isFull ? '(FULL)' : ''}`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {promotionErrors[student.id] && (
                            <p className="text-xs text-red-600">{promotionErrors[student.id]}</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualPromotion(student)}
                          className="h-8 px-3 text-xs border-orange-200 text-orange-600 hover:bg-orange-50 flex-1"
                        >
                          Manual
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualClassChange(student)}
                          className="h-8 px-3 text-xs border-gray-200 text-[#0A2540] hover:bg-gray-50 flex-1"
                        >
                          Change Class
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {filteredStudents.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredStudents.length, currentPage * pageSize)} of {filteredStudents.length}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) || 20)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Rows" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-gray-700 min-w-[90px] text-center">
                    Page {currentPage} / {totalPages}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-100 shadow-xl bg-white">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <GraduationCap className="w-8 h-8 text-[#0A2540]" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">Select a Source Class</h3>
              <p className="text-gray-600 max-w-md">
                Choose a class from the dropdown above to view students eligible for promotion. 
                The system will automatically analyze student performance and recommend promotion actions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gray-100 rounded-full">
                <GraduationCap className="w-5 h-5 text-[#0A2540]" />
              </div>
              <AlertDialogTitle className="text-gray-900 text-lg">Confirm Student Promotion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600">
              You are about to promote <span className="font-semibold text-gray-900">{selectedStudents.length}</span> student(s) to the <span className="font-semibold text-gray-900">{newAcademicYear}</span> academic year.
              <br /><br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Update their class assignments</li>
                <li>Update academic year records</li>
                <li>Create promotion history entries</li>
                <li>Log this activity for audit purposes</li>
              </ul>
              <br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isPromoting && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Processing promotion...</span>
                <span className="text-sm text-gray-900">{promotionProgress}%</span>
              </div>
              <Progress value={promotionProgress} className="h-2" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isPromoting}
              className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPromotion}
              disabled={isPromoting}
              className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white"
            >
              {isPromoting ? 'Processing...' : 'Confirm Promotion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Manual Promotion Dialog */}
      <AlertDialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-lg rounded-2xl">
          <AlertDialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-gray-900 text-xl font-semibold">Manual Promotion Override</AlertDialogTitle>
                <p className="text-sm text-gray-600 mt-1">Override automatic promotion criteria</p>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="text-gray-700">
            <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {selectedStudentForManual?.firstName} {selectedStudentForManual?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedStudentForManual?.admissionNumber} • {selectedStudentForManual?.className}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Average:</span>
                      <span className={`ml-1 font-semibold ${
                        selectedStudentForManual?.averageScore >= 50 ? 'text-emerald-600' : 
                        selectedStudentForManual?.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {selectedStudentForManual?.averageScore?.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Attendance:</span>
                      <span className={`ml-1 font-semibold ${
                        selectedStudentForManual?.attendance >= 75 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {selectedStudentForManual?.attendance?.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Promotion Options */}
              <div>
                <h4 className="text-sm font-heading font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Promotion Options
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => confirmManualPromotion("Promoted")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Promote
                  </Button>
                  <Button
                    onClick={() => confirmManualPromotion("Conditional")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Conditional
                  </Button>
                  <Button
                    onClick={() => confirmManualPromotion("Repeated")}
                    className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Repeat
                  </Button>
                  <Button
                    onClick={() => confirmManualPromotion("On Hold")}
                    className="bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    On Hold
                  </Button>
                  <Button
                    onClick={() => confirmManualPromotion("Withdrawn")}
                    className="bg-gray-600 hover:bg-gray-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Withdrawn
                  </Button>
                  <Button
                    onClick={() => confirmManualPromotion("Pending Approval")}
                    className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Pending Approval
                  </Button>
                </div>
              </div>
              
              {/* Demotion Options */}
              <div>
                <h4 className="text-sm font-heading font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Demotion Options
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => confirmManualPromotion("Repeated")}
                    className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Repeat
                  </Button>
                  <div className="flex gap-2">
                    <Select
                      value={demotionClassId?.toString() || ''}
                      onValueChange={(value: string) => setDemotionClassId(Number(value))}
                    >
                      <SelectTrigger className="h-12 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-orange-500 focus:ring-orange-500">
                        <SelectValue placeholder="Demote to..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 rounded-xl">
                        {selectedStudentForManual && getDemotionClasses(selectedStudentForManual.class_id).map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900 hover:bg-orange-50">
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => confirmManualPromotion("Repeated", demotionClassId || undefined)}
                      disabled={!demotionClassId}
                      className="bg-orange-600 hover:bg-orange-700 text-white h-12 px-4 rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Repeat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter className="pt-4">
            <Button
              onClick={() => {
                setShowManualDialog(false);
                setSelectedStudentForManual(null);
                setDemotionClassId(null);
              }}
              variant="outline"
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 h-11 rounded-xl"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Manual Class Change Dialog */}
      <AlertDialog open={showManualClassChangeDialog} onOpenChange={setShowManualClassChangeDialog}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-lg rounded-2xl">
          <AlertDialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-full">
                <Settings className="w-6 h-6 text-[#0A2540]" />
              </div>
              <div>
                <AlertDialogTitle className="text-gray-900 text-xl font-semibold">Manual Class Change</AlertDialogTitle>
                <p className="text-sm text-gray-600 mt-1">Change student class anytime (Admin Override)</p>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="text-gray-700">
            <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {selectedStudentForManual?.firstName} {selectedStudentForManual?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedStudentForManual?.admissionNumber} • {selectedStudentForManual?.className}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Target Class</Label>
                <Select
                  value={demotionClassId?.toString() || ''}
                  onValueChange={(value: string) => setDemotionClassId(Number(value))}
                >
                  <SelectTrigger className="h-12 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-[#0A2540] focus:ring-[#0A2540]">
                    <SelectValue placeholder="Select target class" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 rounded-xl">
                    {classes.filter(c => c.status === 'Active' && c.id !== selectedStudentForManual?.class_id).map(cls => {
                      const capacity = classCapacity[cls.id];
                      const isFull = capacity && capacity.current >= capacity.max;
                      return (
                        <SelectItem 
                          key={cls.id} 
                          value={cls.id.toString()} 
                          className={`text-gray-900 ${isFull ? 'text-red-600 bg-red-50' : ''}`}
                          onClick={() => {
                            if (isFull) {
                              toast.error('Class is at full capacity');
                            }
                          }}
                        >
                          {cls.name} ({capacity?.current || 0}/{capacity?.max || 40}) {isFull ? '(FULL)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Reason for Change *</Label>
                <textarea
                  value={manualClassChangeReason}
                  onChange={(e) => setManualClassChangeReason(e.target.value)}
                  placeholder="Enter reason for manual class change..."
                  className="w-full h-24 px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540] resize-none"
                />
              </div>
            </div>
          </div>
          
          <AlertDialogFooter className="pt-4">
            <Button
              onClick={() => {
                setShowManualClassChangeDialog(false);
                setManualClassChangeReason('');
                setDemotionClassId(null);
                setSelectedStudentForManual(null);
              }}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 h-11 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmManualClassChange}
              disabled={!demotionClassId || !manualClassChangeReason}
              className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-11 rounded-xl disabled:opacity-50"
            >
              Change Class
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
