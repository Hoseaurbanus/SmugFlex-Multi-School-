import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import DashboardWelcome from "./admin/DashboardWelcome";
import { RegisterUserPage } from "./admin/RegisterUserPage";
import { ManageUsersPage } from "./admin/ManageUsersPage";
import { ManageStudentsPage } from "./admin/ManageStudentsPage";
import { LinkStudentParentPage } from "./admin/LinkStudentParentPage";
import { ManageClassesPage } from "./admin/ManageClassesPage";
import { ManageSubjectsPage } from "./admin/ManageSubjectsPage";
import { ManageTeacherAssignmentsPage } from "./admin/ManageTeacherAssignmentsPage";
import { PromotionSystemPage } from "./admin/PromotionSystemPage";
import { ResultsManagementPage } from "./admin/ResultsManagementPage";
import { AttendanceReportsPage } from "./admin/AttendanceReportsPage";
import { ExamTimetablePage } from "./admin/ExamTimetablePage";
import { DataBackupPage } from "./admin/DataBackupPage";
import { ActivityLogsPage } from "./admin/ActivityLogsPage";
import { NotificationSystemPage } from "./admin/NotificationSystemPage";
import { NotificationArchivesPage } from "./admin/NotificationArchivesPage";
import { ViewNotificationsPage } from "./shared/ViewNotificationsPage";
import { SystemSettingsPage } from "./admin/SystemSettingsPage";
import { CbtExamListPage } from "./cbt/CbtExamListPage";
import { useSchool } from "../contexts/SchoolContext";
import { useNotificationListener } from "../contexts/NotificationService";
import { toast } from "sonner";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  GraduationCap,
  Link,
  BookOpen,
  Library,
  FileText,
  BarChart3,
  Database,
  CalendarDays,
  Monitor,
  Bell,
  MessageSquare,
  HardDrive,
  Settings,
} from "lucide-react";

const sidebarSections = [
  { label: 'Overview', ids: ['dashboard'] },
  { label: 'Management', ids: ['register-user', 'manage-users', 'manage-students', 'link-student-parent'] },
  { label: 'Academics', ids: ['manage-classes', 'manage-subjects', 'teacher-assignments', 'promotion-system', 'results-management', 'exam-timetable', 'cbt-exams'] },
  { label: 'Communication', ids: ['send-notifications', 'view-messages'] },
  { label: 'System', ids: ['data-backup', 'settings'] },
];

const sidebarItems = [
  { icon: <LayoutDashboard className="w-[18px] h-[18px]" />, label: "Dashboard", id: "dashboard" },
  { icon: <UserPlus className="w-[18px] h-[18px]" />, label: "Register User", id: "register-user" },
  { icon: <Users className="w-[18px] h-[18px]" />, label: "Manage Users", id: "manage-users" },
  { icon: <GraduationCap className="w-[18px] h-[18px]" />, label: "Manage Students", id: "manage-students" },
  { icon: <Link className="w-[18px] h-[18px]" />, label: "Link Student-Parent", id: "link-student-parent" },
  { icon: <BookOpen className="w-[18px] h-[18px]" />, label: "Manage Classes", id: "manage-classes" },
  { icon: <Library className="w-[18px] h-[18px]" />, label: "Manage Subjects", id: "manage-subjects" },
  { icon: <FileText className="w-[18px] h-[18px]" />, label: "Teacher Assignments", id: "teacher-assignments" },
  { icon: <BarChart3 className="w-[18px] h-[18px]" />, label: "Promotion System", id: "promotion-system" },
  { icon: <Database className="w-[18px] h-[18px]" />, label: "Results Management", id: "results-management" },
  { icon: <CalendarDays className="w-[18px] h-[18px]" />, label: "Exam Timetable", id: "exam-timetable" },
  { icon: <Monitor className="w-[18px] h-[18px]" />, label: "CBT Exams", id: "cbt-exams" },
  { icon: <Bell className="w-[18px] h-[18px]" />, label: "Send Notifications", id: "send-notifications" },
  { icon: <MessageSquare className="w-[18px] h-[18px]" />, label: "View Messages", id: "view-messages" },
  { icon: <HardDrive className="w-[18px] h-[18px]" />, label: "Data Backup", id: "data-backup" },
  { icon: <Settings className="w-[18px] h-[18px]" />, label: "Settings", id: "settings" },
];

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const {
    students,
    teachers,
    compiledResults,
    getPendingApprovals,
    currentUser,
    checkUserPermissionAPI,
    currentAcademicYear,
    currentTerm,
    loadCompiledResultsFromAPI,
    loadStudentsFromAPI,
    loadTeachersFromAPI,
    loadClassesFromAPI,
    loadNotificationsFromAPI,
    loadSchoolSettings,
    notifications,
    schoolSettings,
    addNotification
  } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const adminName = currentUser ? (currentUser.first_name || currentUser.username) : 'Administrator';
  const schoolDisplayName = schoolSettings.school_name || currentUser?.school_name || 'School';

  const refreshData = async () => {
    await Promise.allSettled([
      loadStudentsFromAPI(),
      loadTeachersFromAPI(),
      loadClassesFromAPI(true),
      loadNotificationsFromAPI(),
      loadCompiledResultsFromAPI(null, currentTerm, currentAcademicYear),
      loadSchoolSettings(),
    ]);
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => { if (isMounted) await refreshData(); };
    run();
    return () => { isMounted = false; };
  }, []);

  useNotificationListener(currentUser?.role, currentUser?.id);

  const activeStudents = (students || []).filter(s => s && s.status === 'Active').length;
  const activeTeachers = (teachers || []).filter(t => t && t.status === 'Active').length;
  const pendingResults = getPendingApprovals().length;
  const unreadNotifications = (notifications || []).filter(n => !n.isRead && n.targetAudience === 'all');

  const handleItemClick = (id: string) => {
    if (id === "logout") { toast.success("Logged out successfully"); onLogout(); }
    else { setActiveItem(id); }
  };

  const validPageIds = ["dashboard", "register-user", "manage-students", "manage-users", "manage-classes", "manage-subjects", "teacher-assignments", "promotion-system", "link-student-parent", "send-notifications", "view-messages", "activity-logs", "data-backup", "settings", "attendance-reports", "exam-timetable", "cbt-exams", "results-management"];

  return (
    <div className="min-h-screen dashboard-bg">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        sections={sidebarSections}
        schoolName={schoolDisplayName}
      />

      <div className="lg:pl-[var(--sidebar-width,256px)]">
        <DashboardTopBar
          userName={adminName}
          userRole="Administrator"
          schoolName={schoolDisplayName}
          notificationCount={unreadNotifications.length}
          notifications={notifications}
          onLogout={onLogout}
          onNotificationClick={() => setActiveItem('view-messages')}
          onMarkAsRead={(id) => {}}
          aria-label="Top navigation bar"
        />

        <main className="p-4 sm:p-5 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            {activeItem === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <DashboardWelcome
                  adminName={adminName}
                  schoolName={schoolDisplayName}
                  currentAcademicYear={currentAcademicYear}
                  currentTerm={currentTerm}
                  activeStudents={activeStudents}
                  activeTeachers={activeTeachers}
                  pendingResults={pendingResults}
                  unreadCount={unreadNotifications.length}
                  notifications={notifications}
                  onNavigate={handleItemClick}
                  onRefresh={refreshData}
                />
              </motion.div>
            )}

            {/* Sub-pages */}
            {activeItem === "register-user" && <motion.div key="register-user" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><RegisterUserPage /></motion.div>}
            {activeItem === "manage-students" && <motion.div key="manage-students" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ManageStudentsPage /></motion.div>}
            {activeItem === "manage-users" && <motion.div key="manage-users" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ManageUsersPage /></motion.div>}
            {activeItem === "manage-classes" && <motion.div key="manage-classes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ManageClassesPage /></motion.div>}
            {activeItem === "manage-subjects" && <motion.div key="manage-subjects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ManageSubjectsPage /></motion.div>}
            {activeItem === "teacher-assignments" && <motion.div key="teacher-assignments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ManageTeacherAssignmentsPage /></motion.div>}
            {activeItem === "promotion-system" && <motion.div key="promotion-system" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><PromotionSystemPage /></motion.div>}
            {activeItem === "link-student-parent" && <motion.div key="link-student-parent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><LinkStudentParentPage /></motion.div>}
            {activeItem === "send-notifications" && <motion.div key="send-notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><NotificationSystemPage /></motion.div>}
            {activeItem === "view-messages" && <motion.div key="view-messages" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ViewNotificationsPage /></motion.div>}
            {activeItem === "activity-logs" && <motion.div key="activity-logs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ActivityLogsPage /></motion.div>}
            {activeItem === "data-backup" && <motion.div key="data-backup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><DataBackupPage /></motion.div>}
            {activeItem === "settings" && <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><SystemSettingsPage /></motion.div>}
            {activeItem === "attendance-reports" && <motion.div key="attendance-reports" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><AttendanceReportsPage /></motion.div>}
            {activeItem === "exam-timetable" && <motion.div key="exam-timetable" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ExamTimetablePage /></motion.div>}
            {activeItem === "cbt-exams" && <motion.div key="cbt-exams" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><CbtExamListPage /></motion.div>}
            {activeItem === "results-management" && <motion.div key="results-management" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><ResultsManagementPage /></motion.div>}

            {!validPageIds.includes(activeItem) && (
              <motion.div
                key="not-found"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center min-h-[400px]"
              >
                <div className="text-center">
                  <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Coming Soon</h2>
                  <p className="text-sm text-muted-foreground">This section is under development.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
