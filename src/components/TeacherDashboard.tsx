import { LogOut, LayoutDashboard, BookOpen, FileSpreadsheet, Users, MessageSquare, Calendar, PenTool, Award, Heart, Monitor, AlertCircle, RefreshCw, BarChart3, GraduationCap, ClipboardCheck } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef, Component, type ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
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
import { CbtExamListPage } from "./cbt/CbtExamListPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useSchool } from "../contexts/SchoolContext";
import { useNotificationListener } from "../contexts/NotificationService";
import { connectionMonitor } from "../utils/connectionMonitor";
import { toast } from "sonner";

/* ── Welcome sub-components (inline to avoid module issues) ── */

function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return count;
}

function MiniSparkline({ color, data }: { color: string; data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LiveDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return <span className="text-muted-foreground text-sm font-medium">{dateStr} &middot; {timeStr}</span>;
}

const sparkData: Record<string, number[]> = {
  Classes: [3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9],
  Students: [18, 22, 20, 28, 25, 32, 30, 38, 35, 42, 40, 48],
  Subjects: [4, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10],
  Role: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'Class Teacher': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

interface TeacherDashboardProps {
  onLogout: () => void;
}

class TeacherDashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] p-6">
          <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">The teacher dashboard could not be displayed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{this.state.error?.message || 'An unexpected error occurred while loading the dashboard.'}</p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const {
    currentUser,
    teachers,
    classes,
    getTeacherClasses,
    getTeacherResponsibilities,
    getUnreadNotifications,
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
    loadAttendancesFromAPI,
    schoolSettings,
  } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  
  useNotificationListener(currentUser?.role, currentUser?.id);

  useEffect(() => {
    let isMounted = true;
    const checkConnection = () => {
      if (!isMounted) return;
      if (!connectionMonitor.isHealthy()) {
        connectionMonitor.forceReconnect().then(success => {
          if (isMounted && !success) { toast.error('Connection failed. Please refresh the page.'); }
        }).catch(() => {});
      }
    };
    const interval = setInterval(checkConnection, 120000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const currentTeacher =
    currentUser && Array.isArray(teachers) && teachers.length > 0
      ? teachers.find(t => String(t?.id) === String(currentUser.linked_id))
      : null;
  const teacherId = currentUser?.role === 'teacher'
    ? (Number(currentUser.linked_id) || (currentTeacher ? Number(currentTeacher.id) : null))
    : (currentTeacher ? Number(currentTeacher.id) : null);
  
  const _responsibilities = useMemo(() => {
    if (!teacherId || !classes || classes.length === 0) {
      return { isClassTeacher: false, assignedClassesCount: 0, totalStudentsCount: 0, subjectsCount: 0, classTeacherClassesCount: 0, canEnterScores: false, canCompileResults: false, canViewResults: false, canManageAttendance: false, departments: [] };
    }
    return getTeacherResponsibilities(Number(teacherId));
  }, [teacherId, classes, getTeacherResponsibilities]);
  
  type TeacherClassInfo = {
    classId: number;
    className: string;
    classLevel: string;
    studentCount: number;
    subjects: Array<{ subjectId: number; subjectName: string; subjectCode: string; }>;
  };

  const [teacherClasses, setTeacherClasses] = useState<TeacherClassInfo[]>([]);

  const visibleTeacherClasses = useMemo<TeacherClassInfo[]>(() => {
    return (teacherClasses || []).filter((tc) => {
      const studentCount = Number(tc?.studentCount ?? 0);
      const subjectsCount = Array.isArray(tc?.subjects) ? tc.subjects.length : 0;
      const isClassTeacherClass = classTeacherAssignments.some((cta: any) =>
        String(cta.teacher_id) === String(teacherId) &&
        String(cta.class_id) === String(tc.classId) &&
        cta.academic_year === currentAcademicYear &&
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return studentCount > 0 || subjectsCount > 0 || isClassTeacherClass;
    });
  }, [teacherClasses, classTeacherAssignments, currentAcademicYear, currentTerm, teacherId]);
  
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
        // Allow React state to settle before reading updated state
        await new Promise((resolve) => setTimeout(resolve, 0));
        const classes = await getTeacherClasses(Number(teacherId));
        if (isMounted) { setTeacherClasses(classes); setDashboardLoadError(null); }
      } catch (error) {
        if (isMounted) { setDashboardLoadError('Failed to load dashboard data. Check your connection and try again.'); }
      }
    };
    load();
    return () => { isMounted = false; };
  }, [teacherId, currentTerm, currentAcademicYear, getTeacherClasses, loadSubjectAssignmentsFromAPI, loadClassTeacherAssignmentsFromAPI]);

  const computeTeacherClasses = useCallback(async () => {
    if (!teacherId) return;
    try { const computed = await getTeacherClasses(Number(teacherId)); setTeacherClasses(computed); } catch (e) {}
  }, [teacherId, getTeacherClasses]);

  const lastTeacherClassesSyncRef = useRef<string>('');

  useEffect(() => {
    if (activeItem !== 'dashboard') return;
    if (!teacherId) return;
    if (!currentTerm || !currentAcademicYear) return;
    const key = [teacherId, currentAcademicYear, currentTerm, (classes || []).length, (subjectAssignments || []).length, (classTeacherAssignments || []).length].join('|');
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
        loadStudentsFromAPI(), loadTeachersFromAPI(), loadClassesFromAPI(true),
        loadNotificationsFromAPI(), loadScoresFromAPI(currentTerm, currentAcademicYear),
        loadAttendancesFromAPI(),
        loadSubjectAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
        loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      try { const refreshedClasses = await getTeacherClasses(Number(teacherId)); setTeacherClasses(refreshedClasses); } catch (e) {}
      finally { setIsWelcomeLoading(false); }
    } catch (e) { setIsWelcomeLoading(false); }
  }, [teacherId, currentTerm, currentAcademicYear, loadStudentsFromAPI, loadTeachersFromAPI, loadClassesFromAPI, loadNotificationsFromAPI, loadScoresFromAPI, loadAttendancesFromAPI, loadSubjectAssignmentsFromAPI, loadClassTeacherAssignmentsFromAPI, getTeacherClasses]);

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (activeItem !== 'dashboard') return;
    const intervalId = window.setInterval(() => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      refreshData().finally(() => { isRefreshingRef.current = false; });
    }, 120000);
    return () => window.clearInterval(intervalId);
  }, [activeItem, refreshData]);

  const isClassTeacherDirect = useMemo(() => {
    if (!teacherId || !classTeacherAssignments || !Array.isArray(classTeacherAssignments) || classTeacherAssignments.length === 0) return false;
    return classTeacherAssignments.some((cta: any) => 
      String(cta.teacher_id) === String(teacherId) && 
      cta.academic_year === currentAcademicYear && 
      cta.term === currentTerm &&
      cta.status === 'Active'
    );
  }, [teacherId, classTeacherAssignments, currentAcademicYear, currentTerm]);
  
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
  }, [visibleTeacherClasses, classTeacherAssignments, currentAcademicYear, currentTerm, teacherId]);
  
  const isClassTeacher = isClassTeacherDirect;
  const teacherName = currentTeacher
    ? `${currentTeacher.firstName} ${currentTeacher.lastName}`
    : ((currentUser as any)?.firstName && (currentUser as any)?.lastName
        ? `${(currentUser as any).firstName} ${(currentUser as any).lastName}`
        : ((currentUser as any)?.name ? String((currentUser as any).name) : 'Teacher'));
  
  const unreadNotifications = getUnreadNotifications() || [];

  const sidebarSections = [
    { label: 'Overview', ids: ['dashboard'] },
    { label: 'Teaching', ids: ['class-list', 'enter-scores', 'compile-results', 'approve-scores', 'mark-attendance', 'domains'] },
    { label: 'Communication', ids: ['message-parents'] },
    { label: 'Account', ids: ['change-password', 'exam-timetable', 'cbt-exams', 'logout'] },
  ];

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <Users className="w-5 h-5" />, label: "Class List", id: "class-list", classTeacherOnly: true },
    { icon: <PenTool className="w-5 h-5" />, label: "Enter Scores", id: "enter-scores" },
    { icon: <FileSpreadsheet className="w-5 h-5" />, label: "Compile Results", id: "compile-results", classTeacherOnly: true },
    { icon: <Award className="w-5 h-5" />, label: "Approve Scores", id: "approve-scores", classTeacherOnly: true },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Message Parents", id: "message-parents" },
    { icon: <Calendar className="w-5 h-5" />, label: "Change Password", id: "change-password" },
    { icon: <Calendar className="w-5 h-5" />, label: "Exam Timetable", id: "exam-timetable" },
    { icon: <Monitor className="w-5 h-5" />, label: "CBT Exams", id: "cbt-exams" },
    { icon: <Calendar className="w-5 h-5" />, label: "Mark Attendance", id: "mark-attendance", classTeacherOnly: true },
    { icon: <Heart className="w-5 h-5" />, label: "Student Domains", id: "domains", classTeacherOnly: true },
    { icon: <LogOut className="w-5 h-5" />, label: "Logout", id: "logout" },
  ].filter(item => !item.classTeacherOnly || isClassTeacher);

  const handleItemClick = (id: string) => {
    if (id === "logout") { toast.success("Logged out successfully"); onLogout(); }
    else { setActiveItem(id); }
  };

  const totalStudents = visibleTeacherClasses.reduce((total: number, tc: any) => total + (tc.studentCount || 0), 0);
  const subjectsTeaching = visibleTeacherClasses.reduce((total: number, tc: any) => total + (tc.subjects?.length || 0), 0);
  const animClasses = useAnimatedCounter(visibleTeacherClasses.length);
  const animStudents = useAnimatedCounter(totalStudents);
  const animSubjects = useAnimatedCounter(subjectsTeaching);
  const animRole = useAnimatedCounter(classTeacherClassesCount);
  const animatedValues = [animClasses, animStudents, animSubjects, animRole];

  const stats = [
    { icon: BookOpen, label: "Classes", animated: visibleTeacherClasses.length, color: "#6366F1", gradient: "from-indigo-500 to-indigo-600", trend: `${visibleTeacherClasses.length} assigned`, action: "class-list" },
    { icon: Users, label: "Students", animated: totalStudents, color: "#10B981", gradient: "from-emerald-500 to-emerald-600", trend: `${totalStudents} total`, action: "class-list" },
    { icon: BarChart3, label: "Subjects", animated: subjectsTeaching, color: "#F97316", gradient: "from-orange-500 to-amber-500", trend: `${subjectsTeaching} teaching`, action: "enter-scores" },
    { icon: GraduationCap, label: "Class Teacher", animated: classTeacherClassesCount, color: "#EC4899", gradient: "from-pink-500 to-rose-500", trend: isClassTeacher ? "Active" : "N/A", action: "class-list" },
  ];

  const quickActions = [
    { icon: PenTool, label: "Enter Scores", action: "enter-scores", gradient: "from-indigo-500 to-indigo-600" },
    { icon: Users, label: "Class List", action: "class-list", gradient: "from-emerald-500 to-teal-500" },
    { icon: ClipboardCheck, label: "Attendance", action: "mark-attendance", gradient: "from-orange-500 to-amber-500" },
    { icon: Heart, label: "Domains", action: "domains", gradient: "from-pink-500 to-rose-500" },
  ];

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; };

  return (
    <TeacherDashboardErrorBoundary>
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        sections={sidebarSections}
        schoolName={schoolSettings.school_name || currentUser?.school_name || 'School'}
      />

      <div className="lg:pl-[var(--sidebar-width,256px)]">
        <DashboardTopBar
          userName={teacherName}
          userRole={isClassTeacher ? "Class Teacher" : "Subject Teacher"}
          notificationCount={unreadNotifications.length}
          onLogout={onLogout}
          onNotificationClick={() => setNotificationDialogOpen(true)}
          schoolName={schoolSettings.school_name || currentUser?.school_name || 'School'}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6 sm:space-y-8">
              {dashboardLoadError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{dashboardLoadError}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => { setDashboardLoadError(null); await refreshData(); }} className="text-destructive border-destructive/20 hover:bg-destructive/10 ml-4 flex-shrink-0">
                    <RefreshCw className="w-4 h-4 mr-1" /> Retry
                  </Button>
                </div>
              )}

              {/* ── HERO ── */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-white to-indigo-50/50 border border-border p-6 sm:p-8 lg:p-10">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/[0.04] blur-[80px]" />
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-pink-500/[0.04] blur-[60px]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/[0.02] blur-[100px]" />
                </div>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #6366F1 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium mb-1"><LiveDateTime /></p>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground tracking-tight">
                      {getGreeting()},{" "}
                      <span className="bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">{teacherName}</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      {isClassTeacher ? "Manage your class and student assessments." : "Enter scores for your assigned subjects."}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-heading font-semibold border border-indigo-100">
                        <GraduationCap className="w-3 h-3" />
                        {isClassTeacher ? "Class Teacher" : "Subject Teacher"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-heading font-semibold">
                        <Calendar className="w-3 h-3" />
                        {currentAcademicYear} &middot; {currentTerm}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={async () => { setDashboardLoadError(null); try { await refreshData(); toast.success('Dashboard refreshed'); } catch (e) { toast.error('Failed to refresh dashboard'); } }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white text-sm font-heading font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-shadow cursor-pointer flex-shrink-0 border-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isWelcomeLoading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* ── STAT CARDS ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  const animVal = animatedValues[i];
                  return (
                    <button
                      key={stat.label}
                      onClick={() => setActiveItem(stat.action)}
                      className="group relative overflow-hidden rounded-2xl bg-white border border-border p-4 sm:p-5 text-left cursor-pointer transition-shadow duration-300 hover:shadow-xl"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 30%, ${stat.color}08 0%, transparent 70%)` }} />
                      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`} style={{ boxShadow: `0 4px 14px ${stat.color}25` }}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <MiniSparkline color={stat.color} data={sparkData[stat.label] ?? sparkData.Role} />
                        </div>
                        <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground tabular-nums">{isWelcomeLoading ? '...' : animVal.toLocaleString()}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                          <span className="text-[11px] font-heading font-semibold px-1.5 py-0.5 rounded-md" style={{ color: stat.color, backgroundColor: `${stat.color}10` }}>{stat.trend}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── BOTTOM GRID ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-border p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.label} onClick={() => setActiveItem(item.action)} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-border cursor-pointer transition-all duration-200">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-xs font-heading font-semibold text-muted-foreground group-hover:text-foreground transition-colors text-center">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Academic Session */}
                <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  <div className="p-5 sm:p-6">
                    <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Academic Session</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-heading font-bold text-foreground">{currentAcademicYear}</p>
                          <p className="text-sm text-muted-foreground">{currentTerm}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-sm font-heading font-semibold text-emerald-600">In Progress</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Your Classes */}
                <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-heading font-semibold text-foreground">Your Classes</h3>
                      {visibleTeacherClasses.length > 0 && (
                        <button onClick={() => setActiveItem("class-list")} className="text-xs font-heading font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                          View all <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                    </div>
                    {visibleTeacherClasses.length > 0 ? (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {visibleTeacherClasses.slice(0, 4).map((cls: any) => (
                          <div key={cls.classId} onClick={() => setActiveItem("class-list")} className="group flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border cursor-pointer transition-all duration-200">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-heading font-semibold text-foreground truncate">{cls.className}</p>
                                <p className="text-[11px] text-muted-foreground">{cls.classLevel} &middot; {cls.studentCount} students &middot; {cls.subjects.length} subjects</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">No classes assigned yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeItem === "class-list" && <ClassListPage />}
          {activeItem === "enter-scores" && <ScoreEntryPage />}
          {activeItem === "compile-results" && <CompileResultsPage />}
          {activeItem === "approve-scores" && <ScoreApprovalPage />}
          {activeItem === "message-parents" && <MessageParentsPage />}
          {activeItem === "change-password" && <ChangePasswordPage />}
          {activeItem === "exam-timetable" && <ViewExamTimetablePage userRole="teacher" />}
          {activeItem === "cbt-exams" && <CbtExamListPage />}
          {activeItem === "mark-attendance" && <MarkAttendancePage />}
          {activeItem === "domains" && <DomainsPage />}
          
          {!["dashboard", "class-list", "enter-scores", "compile-results", "approve-scores", "message-parents", "change-password", "mark-attendance", "domains", "exam-timetable", "cbt-exams"].includes(activeItem) && (
            <div className="space-y-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-md w-full">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#3B82F6] flex items-center justify-center mx-auto mb-4 text-white">
                      {Array.isArray(sidebarItems) && sidebarItems.find(item => item.id === activeItem)?.icon}
                    </div>
                    <h3 className="text-[#1F2937] mb-3">{Array.isArray(sidebarItems) && sidebarItems.find(item => item.id === activeItem)?.label}</h3>
                    <p className="text-[#6B7280]">This section contains the functionality for {Array.isArray(sidebarItems) && sidebarItems.find(item => item.id === activeItem)?.label?.toLowerCase()}.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

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
    </TeacherDashboardErrorBoundary>
  );
}
