import { LogOut, Book, LayoutDashboard, BookOpen, FileSpreadsheet, Users, MessageSquare, Calendar, PenTool, Award, Heart, Activity } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScoreEntryPage } from "./teacher/ScoreEntryPage";
import { CompileResultsPage } from "./teacher/CompileResultsPage";
import { ClassListPage } from "./teacher/ClassListPage";
import { MarkAttendancePage } from "./teacher/MarkAttendancePage";
import { DomainsPage } from "./teacher/DomainsPage";
import { MessageParentsPage } from "./teacher/MessageParentsPage";
import { ScoreApprovalPage } from "./teacher/ScoreApprovalPage";
import { ViewExamTimetablePage } from "./shared/ViewExamTimetablePage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { ViewNotificationsPage } from "./shared/ViewNotificationsPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useSchool } from "../contexts/SchoolContext";
import { useNotificationListener } from "../contexts/NotificationService";
import { connectionMonitor } from "../utils/connectionMonitor";
import { toast } from "sonner";

interface TeacherDashboardProps {
  onLogout: () => void;
}

export function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const {
    currentUser,
    teachers,
    classes,
    getTeacherAssignments,
    getTeacherClasses,
    getTeacherResponsibilities,
    getUnreadNotifications,
    getActivityLogs,
    subjectAssignments,
    classTeacherAssignments,
    currentTerm,
    currentAcademicYear,
    loadSubjectAssignmentsFromAPI,
    loadClassTeacherAssignmentsFromAPI,
    loadStudentsFromAPI,
    loadClassesFromAPI,
    loadTeachersFromAPI,
    loadNotificationsFromAPI,
    loadScoresFromAPI,
    loadAssignmentsFromAPI,
    loadAttendancesFromAPI,
  } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);
  
  // Notification dialog state
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  
  // Real-time notification listener for teachers
  useNotificationListener(currentUser?.role, currentUser?.id);

  // Connection monitoring for teachers
  useEffect(() => {
    let isMounted = true;
    
    const checkConnection = () => {
      if (!isMounted) return;
      
      // Reduced connection monitoring toasts - only show critical issues
      if (!connectionMonitor.isHealthy()) {
        // Only show warning if connection is critically bad
        connectionMonitor.forceReconnect().then(success => {
          if (isMounted && !success) {
            toast.error('Connection failed. Please refresh the page.');
          }
        }).catch(error => {
          if (isMounted) {
            // Silent fail for security
          }
        });
      }
    };
    
    // Check connection every 2 minutes
    const interval = setInterval(checkConnection, 120000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Get current teacher data - Defensive check for teachers being an array
  const currentTeacher =
    currentUser && Array.isArray(teachers) && teachers.length > 0
      ? teachers.find(t => String(t?.id) === String(currentUser.linked_id))
      : null;
  const teacherId = currentUser?.role === 'teacher'
    ? (Number(currentUser.linked_id) || (currentTeacher ? Number(currentTeacher.id) : null))
    : (currentTeacher ? Number(currentTeacher.id) : null);
  
  // Memoize responsibilities calculation to prevent excessive re-calculations
  const responsibilities = useMemo(() => {
    if (!teacherId || !classes || classes.length === 0) {
      return {
        isClassTeacher: false,
        assignedClassesCount: 0,
        totalStudentsCount: 0,
        subjectsCount: 0,
        classTeacherClassesCount: 0,
        canEnterScores: false,
        canCompileResults: false,
        canViewResults: false,
        canManageAttendance: false,
        departments: []
      };
    }
    
    return getTeacherResponsibilities(Number(teacherId));
  }, [teacherId, classes, getTeacherResponsibilities]);
  
  type TeacherClassInfo = {
    classId: number;
    className: string;
    classLevel: string;
    studentCount: number;
    subjects: Array<{
      subjectId: number;
      subjectName: string;
      subjectCode: string;
    }>;
  };

  // Memoize teacher classes calculation
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassInfo[]>([]);

  const visibleTeacherClasses = useMemo<TeacherClassInfo[]>(() => {
    return (teacherClasses || []).filter((tc) => {
      const studentCount = Number(tc?.studentCount ?? 0);
      const subjectsCount = Array.isArray(tc?.subjects) ? tc.subjects.length : 0;
      return studentCount > 0 || subjectsCount > 0;
    });
  }, [teacherClasses]);
  
  useEffect(() => {
    if (!teacherId) return;
    if (!currentTerm || !currentAcademicYear) return;
    
    let isMounted = true;

    const load = async () => {
      try {
        await Promise.all([
          loadSubjectAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
          loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
        ]);

        const classes = await getTeacherClasses(Number(teacherId));
        if (isMounted) {
          setTeacherClasses(classes);
        }
      } catch (error) {
        if (isMounted) {
          // Silent fail for security
        }
      }
    };

    load();
    
    return () => { isMounted = false; };
  }, [teacherId, currentTerm, currentAcademicYear, getTeacherClasses, loadSubjectAssignmentsFromAPI, loadClassTeacherAssignmentsFromAPI]);

  const computeTeacherClasses = useCallback(async () => {
    if (!teacherId) return;
    try {
      const computed = await getTeacherClasses(Number(teacherId));
      setTeacherClasses(computed);
    } catch (e) {
      // Silent fail for security
    }
  }, [teacherId, getTeacherClasses]);

  const lastTeacherClassesSyncRef = useRef<string>('');

  useEffect(() => {
    if (activeItem !== 'dashboard') return;
    if (!teacherId) return;
    if (!currentTerm || !currentAcademicYear) return;

    const key = [
      teacherId,
      currentAcademicYear,
      currentTerm,
      (classes || []).length,
      (subjectAssignments || []).length,
      (classTeacherAssignments || []).length,
    ].join('|');

    if (lastTeacherClassesSyncRef.current === key) return;
    lastTeacherClassesSyncRef.current = key;

    computeTeacherClasses();
  }, [activeItem, teacherId, currentTerm, currentAcademicYear, classes, subjectAssignments, classTeacherAssignments, computeTeacherClasses]);

  const refreshData = useCallback(async () => {
    if (!teacherId) return;
    if (!currentTerm || !currentAcademicYear) return;

    setIsWelcomeLoading(true);
    try {
      await Promise.allSettled([
        loadStudentsFromAPI(),
        loadTeachersFromAPI(),
        loadClassesFromAPI(true),
        loadNotificationsFromAPI(),
        loadScoresFromAPI(currentTerm, currentAcademicYear),
        loadAssignmentsFromAPI(),
        loadAttendancesFromAPI(),
        loadSubjectAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
        loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 0));

      try {
        const refreshedClasses = await getTeacherClasses(Number(teacherId));
        setTeacherClasses(refreshedClasses);
      } catch (e) {
        // Silent fail for security
      } finally {
        setIsWelcomeLoading(false);
      }
    } catch (e) {
      setIsWelcomeLoading(false);
    }
  }, [teacherId, currentTerm, currentAcademicYear, loadStudentsFromAPI, loadTeachersFromAPI, loadClassesFromAPI, loadNotificationsFromAPI, loadScoresFromAPI, loadAssignmentsFromAPI, loadAttendancesFromAPI, loadSubjectAssignmentsFromAPI, loadClassTeacherAssignmentsFromAPI, getTeacherClasses]);

  const didInitialRefreshRef = useRef(false);

  useEffect(() => {
    if (didInitialRefreshRef.current) return;
    if (!currentUser || currentUser.role !== 'teacher') return;
    if (activeItem !== 'dashboard') return;
    if (!teacherId) return;
    if (!currentTerm || !currentAcademicYear) return;

    didInitialRefreshRef.current = true;
    (async () => {
      await refreshData();
    })();
  }, [activeItem, currentAcademicYear, currentTerm, currentUser, refreshData, teacherId]);

  useEffect(() => {
    if (activeItem !== 'dashboard') return;
    const intervalId = window.setInterval(() => {
      refreshData();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeItem, refreshData]);
  
  // Memoize class teacher status calculation
  const isClassTeacherDirect = useMemo(() => {
    if (!teacherId || !classTeacherAssignments || !Array.isArray(classTeacherAssignments) || classTeacherAssignments.length === 0) {
      return false;
    }
    
    return classTeacherAssignments.some((cta: any) => 
      String(cta.teacher_id) === String(teacherId) && 
      cta.academic_year === currentAcademicYear && 
      cta.term === currentTerm
    );
  }, [teacherId, classTeacherAssignments, currentAcademicYear, currentTerm]);
  
  // Memoize class teacher classes count
  const classTeacherClassesCount = useMemo(() => {
    return visibleTeacherClasses.filter((tc: any) => 
      classTeacherAssignments && Array.isArray(classTeacherAssignments) && classTeacherAssignments.some((cta: any) => 
        String(cta.teacher_id) === String(teacherId) && 
        String(cta.class_id) === String(tc.classId) &&
        cta.status === 'Active' &&
        cta.academic_year === currentAcademicYear &&
        cta.term === currentTerm
      )
    ).length;
  }, [visibleTeacherClasses, classTeacherAssignments, currentAcademicYear, currentTerm]);
  
  const isClassTeacher = isClassTeacherDirect;
  const teacherName = currentTeacher
    ? `${currentTeacher.firstName} ${currentTeacher.lastName}`
    : ((currentUser as any)?.firstName && (currentUser as any)?.lastName
        ? `${(currentUser as any).firstName} ${(currentUser as any).lastName}`
        : ((currentUser as any)?.name ? String((currentUser as any).name) : 'Teacher'));
  
  // Get unread notifications count
  const unreadNotifications = getUnreadNotifications();

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <Users className="w-5 h-5" />, label: "Class List", id: "class-list", classTeacherOnly: true },
    { icon: <PenTool className="w-5 h-5" />, label: "Enter Scores", id: "enter-scores" },
    { icon: <FileSpreadsheet className="w-5 h-5" />, label: "Compile Results", id: "compile-results", classTeacherOnly: true },
    { icon: <Award className="w-5 h-5" />, label: "Approve Scores", id: "approve-scores", classTeacherOnly: true },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Message Parents", id: "message-parents" },
    { icon: <Calendar className="w-5 h-5" />, label: "Change Password", id: "change-password" },
    { icon: <Calendar className="w-5 h-5" />, label: "Exam Timetable", id: "exam-timetable" },
    { icon: <Calendar className="w-5 h-5" />, label: "Mark Attendance", id: "mark-attendance", classTeacherOnly: true },
    { icon: <Heart className="w-5 h-5" />, label: "Student Domains", id: "domains", classTeacherOnly: true },
    { icon: <LogOut className="w-5 h-5" />, label: "Logout", id: "logout" },
  ].filter(item => !item.classTeacherOnly || isClassTeacher);

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      toast.success("Logged out successfully");
      onLogout();
    } else {
      // Reduced navigation toasts - only show for important actions
      const importantActions = ["logout"];
      
      if (!importantActions.includes(id)) {
        // Silent navigation for most items
        setActiveItem(id);
      } else {
        setActiveItem(id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={teacherName}
          userRole={isClassTeacher ? "Class Teacher" : "Subject Teacher"}
          notificationCount={unreadNotifications.length}
          onLogout={onLogout}
          onNotificationClick={() => setNotificationDialogOpen(true)}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6">
              <div className="mb-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-[#1F2937] mb-2">Teacher Dashboard</h1>
                    <p className="text-[#6B7280]">
                      {isClassTeacher 
                        ? `Welcome, ${teacherName} (Class Teacher). Manage your class and student assessments.`
                        : `Welcome, ${teacherName} (Subject Teacher). Enter scores for your assigned subjects.`
                      }
                    </p>
                    {(currentTerm || currentAcademicYear) && (
                      <div className="mt-2">
                        <Badge variant="outline">
                          {(currentTerm ? String(currentTerm) : '').trim()}
                          {currentTerm && currentAcademicYear ? ' • ' : ''}
                          {(currentAcademicYear ? String(currentAcademicYear) : '').trim()}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await refreshData();
                        toast.success('Dashboard refreshed');
                      } catch (e) {
                        toast.error('Failed to refresh dashboard');
                      }
                    }}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Classes Assigned</p>
                      <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{isWelcomeLoading ? '...' : visibleTeacherClasses.length}</p>
                    <p className="text-xs text-[#6B7280]">Total classes</p>
                  </CardContent>
                </Card>

                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Total Students</p>
                      <span className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{isWelcomeLoading ? '...' : visibleTeacherClasses.reduce((total: number, tc: any) => total + (tc.studentCount || 0), 0)}</p>
                    <p className="text-xs text-[#6B7280]">Across all classes</p>
                  </CardContent>
                </Card>

                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Class Teacher Role</p>
                      <span className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{isWelcomeLoading ? '...' : classTeacherClassesCount}</p>
                    <p className="text-xs text-[#6B7280]">Classes managed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats Row */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Subject Assignments</p>
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{isWelcomeLoading ? '...' : visibleTeacherClasses.reduce((total: number, tc: any) => total + (tc.subjects?.length || 0), 0)}</p>
                    <p className="text-xs text-[#6B7280]">Subjects teaching</p>
                  </CardContent>
                </Card>

                <Card className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Class Teacher Status</p>
                      <span className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{isClassTeacher ? 'Active' : 'Not Assigned'}</p>
                    <p className="text-xs text-[#6B7280]">
                      {isClassTeacher ? 'Managing classes' : 'No class teacher role'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-5 border-b border-[#E5E7EB]">
                  <h3 className="text-[#1F2937]">Your Classes & Subjects</h3>
                </CardHeader>
                <CardContent className="space-y-3 p-5 pt-5">
                  {visibleTeacherClasses.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                      <p className="text-[#6B7280]">No class assignments yet</p>
                    </div>
                  ) : (
                    visibleTeacherClasses.map((classInfo: any) => (
                      <div key={classInfo.classId} className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[#1F2937] font-medium">{classInfo.className}</p>
                            <p className="text-[#6B7280] text-sm">{classInfo.classLevel} • {classInfo.studentCount} students</p>
                          </div>
                          <Badge className="bg-[#3B82F6] text-white border-0 text-xs">
                            {classInfo.subjects.length} subjects
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-[#374151] mb-3">Assigned Subjects:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {classInfo.subjects.map((subject: any) => (
                              <div key={subject.subjectId} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#F3F4F6] to-[#E5E7EB] border border-[#D1D5DB] rounded-lg hover:from-[#E5E7EB] hover:to-[#D1D5DB] transition-colors">
                                <div className="w-2 h-2 bg-[#3B82F6] rounded-full flex-shrink-0"></div>
                                <span className="text-sm font-medium text-[#1F2937] truncate">{subject.subjectName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            onClick={() => setActiveItem("class-list")}
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-[#E5E7EB] text-[#6B7280]"
                          >
                            <span className="w-4 h-4 mr-1" />
                            View Students
                          </Button>
                          {classInfo.subjects.length > 0 && (
                            <Button 
                              onClick={() => setActiveItem("enter-scores")}
                              size="sm"
                              className="bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg"
                            >
                              <span className="w-4 h-4 mr-1" />
                              Enter Scores
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeItem === "class-list" && <ClassListPage />}
          {activeItem === "enter-scores" && <ScoreEntryPage />}
          {activeItem === "compile-results" && <CompileResultsPage />}
          {activeItem === "approve-scores" && <ScoreApprovalPage />}
          {activeItem === "message-parents" && <MessageParentsPage />}
          {activeItem === "change-password" && <ChangePasswordPage />}
          {activeItem === "exam-timetable" && <ViewExamTimetablePage userRole="teacher" />}
          {activeItem === "mark-attendance" && <MarkAttendancePage />}
          {activeItem === "domains" && <DomainsPage />}
          
          {!["dashboard", "class-list", "enter-scores", "compile-results", "approve-scores", "message-parents", "change-password", "mark-attendance", "domains", "exam-timetable"].includes(activeItem) && (
            <div className="space-y-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-md w-full">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#3B82F6] flex items-center justify-center mx-auto mb-4 text-white">
                      {Array.isArray(sidebarItems) && sidebarItems.find(item => item.id === activeItem)?.icon}
                    </div>
                    <h3 className="text-[#1F2937] mb-3">
                      {Array.isArray(sidebarItems) && sidebarItems.find(item => item.id === activeItem)?.label}
                    </h3>
                    <p className="text-[#6B7280]">
                      This section contains the functionality for {Array.isArray(sidebarItems) && sidebarItems.find(item => item.id === activeItem)?.label?.toLowerCase()}.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>View system notifications and updates.</DialogDescription>
          </DialogHeader>
          <ViewNotificationsPage />
        </DialogContent>
      </Dialog>
    </div>
  );
}