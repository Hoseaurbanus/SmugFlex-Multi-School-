import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useSchool } from "../../contexts/SchoolContext";
import { useNotificationService } from "../../contexts/NotificationService";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Filter, Search, User, BookOpen, Calendar, TrendingUp, Eye, MessageSquare, RefreshCw, Wifi } from "lucide-react";

interface ScoreWithDetails {
  id: number;
  student_id: number;
  student_name: string;
  subject_assignment_id: number;
  subject_name: string;
  class_id: number;
  class_name: string;
  teacher_name: string;
  ca1?: number | null | undefined;
  ca2?: number | null | undefined;
  exam?: number | null | undefined;
  total: number;
  grade?: string;
  remark?: string;
  entered_by: number;
  entered_date: string;
  status: 'Draft' | 'Submitted' | 'Rejected' | 'Approved';
  rejection_reason?: string;
  rejected_by?: number;
  rejected_date?: string;
  academic_year?: string;
  term?: string;
}

export function ScoreApprovalPage() {
  const { 
    currentUser, 
    teachers, 
    classes, 
    subjects, 
    subjectAssignments,
    students,
    scores,
    rejectScore,
    approveScore,
    getTeacherClasses,
    currentAcademicYear,
    currentTerm,
    addNotification,
    loadScoresFromAPI
  } = useSchool();

  const { broadcast } = useNotificationService();

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("submitted");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedScoreIds, setSelectedScoreIds] = useState<Set<number>>(new Set());
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedScore, setSelectedScore] = useState<ScoreWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refreshInFlightRef = useRef(false);

  const loadScoresRef = useRef(loadScoresFromAPI);
  useEffect(() => {
    loadScoresRef.current = loadScoresFromAPI;
  }, [loadScoresFromAPI]);

  // Get current teacher data
  const currentTeacher = currentUser ? teachers.find(t => t.id === String(currentUser.linked_id)) : null;
  const [teacherClasses, setTeacherClasses] = useState<Array<{
    classId: number;
    className: string;
    classLevel: string;
    studentCount: number;
    subjects: Array<{
      subjectId: number;
      subjectName: string;
      subjectCode: string;
    }>;
  }>>([]);
  
  useEffect(() => {
    if (!currentTeacher) return;
    
    let isMounted = true;
    getTeacherClasses(Number(currentTeacher.id)).then(classes => {
      if (isMounted) {
        setTeacherClasses(classes);
      }
    }).catch(_error => {
      if (isMounted) {
        // Silent fail for security
      }
    });
    
    return () => { isMounted = false; };
  }, [currentTeacher, getTeacherClasses]);

  const refreshScores = useCallback(async () => {
    if (!currentTeacher) return;
    if (refreshInFlightRef.current) return;
    if (!currentTerm || !currentAcademicYear) return;

    refreshInFlightRef.current = true;
    setIsLoading(true);
    try {
      await loadScoresRef.current(currentTerm, currentAcademicYear);
      setLastRefresh(new Date());
    } catch (error) {
      // Silent fail for security
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [currentTeacher, currentTerm, currentAcademicYear]);

  // Real-time data refresh (reduced polling frequency)
  useEffect(() => {
    refreshScores();

    const interval = setInterval(refreshScores, 120000);
    return () => clearInterval(interval);
  }, [refreshScores]);

  // Listen for real-time notifications
  useEffect(() => {
    const handleNotification = (notification: any) => {
      // Refresh scores when relevant notifications are received
      if (notification.type === 'warning' || notification.type === 'success') {
        if (notification.title?.includes('Score') || notification.message?.includes('score')) {
          setTimeout(async () => {
            await refreshScores();
          }, 1000);
        }
      }
    };
    // Set up notification listener

    return () => {
      // Cleanup listeners
    };
  }, [refreshScores]);

  const handleToggleSelect = (scoreId: number, checked: boolean) => {
    setSelectedScoreIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(scoreId);
      else next.delete(scoreId);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedScoreIds(() => {
      if (!checked) return new Set();
      return new Set(allSelectableIds);
    });
  };

  const handleApproveSelected = async () => {
    if (!currentUser) return;

    const idsToApprove = allSelectableIds.filter(id => selectedScoreIds.has(id));
    if (idsToApprove.length === 0) {
      toast.error('Please select at least one submitted score');
      return;
    }

    setIsLoading(true);
    try {
      for (const scoreId of idsToApprove) {
        await approveScore(scoreId, currentUser.id);
      }

      toast.success(`${idsToApprove.length} score(s) approved`);
      setSelectedScoreIds(new Set());
      await refreshScores();
    } catch (error) {
      toast.error('Failed to approve selected scores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentTeacher) return;

    try {
      await refreshScores();
      toast.success('Scores refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh scores');
    }
  };

  // Enhanced scores with details
  const scoresWithDetails: ScoreWithDetails[] = scores.map(score => {
    const assignment = subjectAssignments.find(sa => sa.id === score.subject_assignment_id);
    const student = students.find(s => s.id === score.student_id);
    const subject = assignment ? subjects.find(sub => sub.id === assignment.subject_id) : null;
    const classInfo = assignment ? classes.find(c => c.id === assignment.class_id) : null;
    const teacher = assignment ? teachers.find(t => t.id === assignment.teacher_id) : null;

    const scoreAny = score as any;
    const resolvedClassId = Number(scoreAny.class_id ?? assignment?.class_id ?? 0);
    const resolvedSubjectName = String(scoreAny.subject_name ?? subject?.name ?? 'Unknown Subject');
    const resolvedClassName = String(scoreAny.class_name ?? classInfo?.name ?? 'Unknown Class');
    const resolvedTeacherName = String(scoreAny.teacher_name ?? (teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher'));
    const resolvedStudentName = student
      ? `${student.firstName} ${student.lastName}`
      : (scoreAny.student_first_name || scoreAny.student_last_name)
        ? `${scoreAny.student_first_name ?? ''} ${scoreAny.student_last_name ?? ''}`.trim()
        : 'Unknown Student';

    return {
      ...score,
      student_name: resolvedStudentName,
      subject_name: resolvedSubjectName,
      class_name: resolvedClassName,
      teacher_name: resolvedTeacherName,
      class_id: resolvedClassId,
      academic_year: score.academic_year || currentAcademicYear || undefined,
      term: score.term || currentTerm || undefined
    };
  });

  // Filter scores based on teacher's classes and selected filters
  const filteredScores = scoresWithDetails.filter(score => {
    const normalizedStatus = String(score.status || '').toLowerCase();

    // Only show scores from classes where current teacher is class teacher.
    // If class-teacher classes haven't loaded yet, don't filter here; backend already scopes the dataset.
    if (teacherClasses.length > 0) {
      const isClassTeacher = teacherClasses.some(tc => tc.classId === score.class_id);
      if (!isClassTeacher) return false;
    }

    // Apply filters
    if (selectedClass !== "all" && score.class_id !== parseInt(selectedClass)) return false;
    if (selectedSubject !== "all" && score.subject_assignment_id !== parseInt(selectedSubject)) return false;
    if (selectedStudentId !== "all" && score.student_id !== parseInt(selectedStudentId)) return false;
    if (selectedStatus === "submitted" && normalizedStatus !== "submitted") return false;
    if (selectedStatus === "rejected" && normalizedStatus !== "rejected") return false;
    if (selectedStatus === "approved" && normalizedStatus !== "approved") return false;
    if (selectedStatus === "all" && !["submitted", "rejected", "approved"].includes(normalizedStatus)) return false;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        score.student_name.toLowerCase().includes(searchLower) ||
        score.subject_name.toLowerCase().includes(searchLower) ||
        score.class_name.toLowerCase().includes(searchLower) ||
        score.teacher_name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const teacherClassIds = useMemo(() => new Set(teacherClasses.map(tc => tc.classId)), [teacherClasses]);

  const eligibleStudents = useMemo(() => {
    return students
      .filter(s => teacherClassIds.has(s.class_id) && s.status === 'Active')
      .map(s => ({
        id: s.id,
        name: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || `Student ${s.id}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, teacherClassIds]);

  const selectedStudentName = useMemo(() => {
    if (selectedStudentId === 'all') return 'All Students';
    const found = eligibleStudents.find(s => s.id === parseInt(selectedStudentId));
    return found?.name ?? 'Selected Student';
  }, [selectedStudentId, eligibleStudents]);

  const submittedFilteredScores = useMemo(
    () => filteredScores.filter(s => s.status === 'Submitted'),
    [filteredScores]
  );

  const allSelectableIds = useMemo(
    () => submittedFilteredScores.map(s => s.id),
    [submittedFilteredScores]
  );

  const selectedCount = useMemo(
    () => allSelectableIds.filter(id => selectedScoreIds.has(id)).length,
    [allSelectableIds, selectedScoreIds]
  );

  const isAllSelected = useMemo(() => {
    if (allSelectableIds.length === 0) return false;
    return allSelectableIds.every(id => selectedScoreIds.has(id));
  }, [allSelectableIds, selectedScoreIds]);

  useEffect(() => {
    // Keep selection consistent with current filters (drop selections not visible anymore)
    setSelectedScoreIds(prev => {
      const allowed = new Set(allSelectableIds);
      const next = new Set<number>();
      prev.forEach(id => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [allSelectableIds]);

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(new Set(
    filteredScores.map(score => ({
      id: score.subject_assignment_id,
      name: score.subject_name
    }))
  ));

  const handleRejectScore = async () => {
    if (!selectedScore || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectScore(selectedScore.id, rejectionReason, currentUser!.id);

      // Send notification to subject teacher
      const subjectAssignment = subjectAssignments.find(sa => sa.id === selectedScore.subject_assignment_id);
      if (subjectAssignment) {
        const subjectTeacher = teachers.find(t => t.id === subjectAssignment.teacher_id);
        if (subjectTeacher) {
          await addNotification({
            title: "Score Rejected - Correction Required",
            message: `Your score for ${selectedScore.student_name} in ${selectedScore.subject_name} (${selectedScore.class_name}) was rejected. Reason: ${rejectionReason}. Please review and resubmit.`,
            type: "warning",
            targetAudience: "teachers",
            sentBy: currentUser!.id,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });

          // Real-time notification
          broadcast({
            id: Date.now(),
            title: "Score Rejected - Correction Required",
            message: `Score for ${selectedScore.student_name} in ${selectedScore.subject_name} was rejected. Please review and resubmit.`,
            type: "warning",
            targetAudience: "teachers",
            sentDate: new Date().toISOString(),
          });
        }
      }

      toast.success(`Score rejected and ${selectedScore.teacher_name} notified`);
      setRejectionReason("");
      setShowRejectDialog(false);
      setSelectedScore(null);
      
      // Trigger real-time refresh
      await refreshScores();
    } catch (error) {
      toast.error("Failed to reject score");
    }
  };

  const handleApproveScore = async (score: ScoreWithDetails) => {
    try {
      await approveScore(score.id, currentUser!.id);
      
      // Send notification to subject teacher
      const subjectAssignment = subjectAssignments.find(sa => sa.id === score.subject_assignment_id);
      if (subjectAssignment) {
        const subjectTeacher = teachers.find(t => t.id === subjectAssignment.teacher_id);
        if (subjectTeacher) {
          await addNotification({
            title: "Score Approved",
            message: `Your score for ${score.student_name} in ${score.subject_name} (${score.class_name}) has been approved.`,
            type: "success",
            targetAudience: "teachers",
            sentBy: currentUser!.id,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });

          // Real-time notification
          broadcast({
            id: Date.now(),
            title: "Score Approved",
            message: `Score for ${score.student_name} in ${score.subject_name} has been approved.`,
            type: "success",
            targetAudience: "teachers",
            sentDate: new Date().toISOString(),
          });
        }
      }
      
      toast.success("Score approved successfully");
      
      // Trigger real-time refresh
      await refreshScores();
    } catch (error) {
      toast.error("Failed to approve score");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Submitted":
        return <Badge className="bg-blue-100 text-blue-800">Pending Review</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "Approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return "text-gray-600";
    switch (grade) {
      case "A": return "text-green-600 font-bold";
      case "B": return "text-blue-600 font-bold";
      case "C": return "text-yellow-600 font-bold";
      case "D": return "text-orange-600 font-bold";
      case "F": return "text-red-600 font-bold";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Score Approval
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Review and approve/reject scores submitted by subject teachers
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Real-time Status */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span>Live</span>
                </>
              )}
              <span className="hidden sm:inline">
                • Last: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            
            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {/* Teacher Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 text-xs text-gray-500">
              {currentTeacher && (
                <>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{currentTeacher.firstName} {currentTeacher.lastName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{currentAcademicYear} - {currentTerm}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-First Filters */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden text-xs"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student, subject, class, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className={`${showFilters ? 'block' : 'hidden'} sm:block space-y-3`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Class
                </Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {teacherClasses.map(cls => (
                      <SelectItem key={cls.classId} value={cls.classId.toString()}>
                        {cls.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Subject
                </Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {uniqueSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Student
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 h-8 text-sm w-full justify-start"
                      type="button"
                    >
                      {selectedStudentName}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2" align="start">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="max-h-56 overflow-auto space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId('all');
                            setStudentSearch('');
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                        >
                          All Students
                        </button>
                        {eligibleStudents
                          .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                          .slice(0, 100)
                          .map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(String(s.id));
                                setStudentSearch('');
                              }}
                              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Status
                </Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Pending Review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col items-start justify-end gap-2">
                <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  {filteredScores.length} scores
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(v) => handleToggleSelectAll(!!v)}
                    disabled={allSelectableIds.length === 0}
                  />
                  <span className="text-xs text-gray-600">Select all submitted</span>
                </div>

                <Button
                  onClick={handleApproveSelected}
                  disabled={isLoading || selectedCount === 0}
                  size="sm"
                  className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve Selected ({selectedCount})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Scores List */}
      <div className="space-y-3">
        {filteredScores.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">No Scores Found</h3>
              <p className="text-gray-600 text-xs">
                No scores match the current filters or no scores have been submitted for review.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredScores.map(score => (
            <Card key={score.id} className="bg-white hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 sm:p-4">
                {/* Compact Layout */}
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {score.status === 'Submitted' && (
                        <Checkbox
                          checked={selectedScoreIds.has(score.id)}
                          onCheckedChange={(v) => handleToggleSelect(score.id, !!v)}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <h3 className="font-medium text-gray-900 text-sm">{score.student_name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {score.class_name}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {score.subject_name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        by {score.teacher_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{score.total}</p>
                        <p className={`text-xs font-medium ${getGradeColor(score.grade)}`}>
                          {score.grade || 'N/A'}
                        </p>
                      </div>
                      {getStatusBadge(score.status)}
                    </div>
                  </div>

                  {/* Compact Score Breakdown */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded p-2 text-center">
                      <p className="text-xs text-blue-600 font-medium">CA 1</p>
                      <p className="text-sm font-bold text-blue-700">{score.ca1}</p>
                    </div>
                    <div className="bg-green-50 rounded p-2 text-center">
                      <p className="text-xs text-green-600 font-medium">CA 2</p>
                      <p className="text-sm font-bold text-green-700">{score.ca2}</p>
                    </div>
                    <div className="bg-purple-50 rounded p-2 text-center">
                      <p className="text-xs text-purple-600 font-medium">Exam</p>
                      <p className="text-sm font-bold text-purple-700">{score.exam}</p>
                    </div>
                  </div>

                  {/* Rejection Details */}
                  {score.status === "Rejected" && score.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-3 h-3 text-red-600" />
                        <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
                      </div>
                      <p className="text-xs text-red-700">{score.rejection_reason}</p>
                      {score.rejected_date && (
                        <p className="text-xs text-red-600 mt-1">
                          Rejected on {new Date(score.rejected_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Teacher's Remark */}
                  {score.remark && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3 text-blue-600" />
                        <p className="text-xs font-medium text-blue-800">Teacher's Remark:</p>
                      </div>
                      <p className="text-xs text-blue-700">{score.remark}</p>
                    </div>
                  )}

                  {/* Compact Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    {score.status === "Submitted" && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => handleApproveScore(score)}
                          className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto h-8 text-xs"
                          size="sm"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedScore(score);
                            setShowRejectDialog(true);
                          }}
                          className="text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto h-8 text-xs"
                          size="sm"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {score.status === "Approved" && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Already Approved</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 w-full sm:w-auto h-8 text-xs"
                      size="sm"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </div>

                  {/* Date Info */}
                  <div className="text-xs text-gray-500 border-t pt-2">
                    Submitted on {score.entered_date && new Date(score.entered_date).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Compact Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
              <XCircle className="w-4 h-4" />
              Reject Score
            </DialogTitle>
            <DialogDescription>Reject this score with an optional reason. The teacher will be notified.</DialogDescription>
          </DialogHeader>
          {selectedScore && (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3 h-3 text-gray-600" />
                  <p className="font-medium text-gray-900 text-sm">{selectedScore.student_name}</p>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-3 h-3 text-gray-600" />
                  <p className="text-xs text-gray-600">{selectedScore.subject_name} - {selectedScore.class_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-gray-600" />
                  <p className="text-sm font-bold text-gray-900">Score: {selectedScore.total}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  Rejection Reason
                </Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this score is being rejected..."
                  className="mt-1 resize-none text-sm"
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={handleRejectScore}
                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto h-8 text-xs"
                  disabled={!rejectionReason.trim()}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject Score
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason("");
                    setSelectedScore(null);
                  }}
                  className="w-full sm:w-auto h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
