import { Settings, BarChart, Book, Database, LayoutDashboard, Link, BookOpen, BarChart3, GraduationCap, Plus, FileText, Users, Calendar, DollarSign, Bell, MessageSquare } from 'lucide-react';
import React, { useState, useEffect, memo } from 'react';
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
// Regular imports for dashboard pages
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
import { FeeManagementPage } from "./admin/FeeManagementPage";
import { NotificationSystemPage } from "./admin/NotificationSystemPage";
import { NotificationArchivesPage } from "./admin/NotificationArchivesPage";
import { ViewNotificationsPage } from "./shared/ViewNotificationsPage";
import { SystemSettingsPage } from "./admin/SystemSettingsPage";
import { useSchool } from "../contexts/SchoolContext";
import { useNotificationListener } from "../contexts/NotificationService";
import { toast } from "sonner";


const sidebarItems = [
  // Main Dashboard
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
  
  // User Management - Consolidated
  { icon: <Plus className="w-5 h-5" />, label: "Register User", id: "register-user" },
  { icon: <Users className="w-5 h-5" />, label: "Manage Users", id: "manage-users" },
  
  // Student Management
  { icon: <GraduationCap className="w-5 h-5" />, label: "Manage Students", id: "manage-students" },
  { icon: <Link className="w-5 h-5" />, label: "Link Student-Parent", id: "link-student-parent" },
  
  // Academic Management
  { icon: <BookOpen className="w-5 h-5" />, label: "Manage Classes", id: "manage-classes" },
  { icon: <Book className="w-5 h-5" />, label: "Manage Subjects", id: "manage-subjects" },
  { icon: <FileText className="w-5 h-5" />, label: "Teacher Assignments", id: "teacher-assignments" },
  { icon: <BarChart3 className="w-5 h-5" />, label: "Promotion System", id: "promotion-system" },
  
  // Results Management
  { icon: <Database className="w-5 h-5" />, label: "Results Management", id: "results-management" },
      
  // Timetable
  { icon: <Calendar className="w-5 h-5" />, label: "Exam Timetable", id: "exam-timetable" },
  
  // Financial Management
  { icon: <DollarSign className="w-5 h-5" />, label: "Fee Management", id: "fee-management" },
  
  // Communication & Settings
  { icon: <Bell className="w-5 h-5" />, label: "Send Notifications", id: "send-notifications" },
  { icon: <MessageSquare className="w-5 h-5" />, label: "View Messages", id: "view-messages" },
  { icon: <Database className="w-5 h-5" />, label: "Data Backup", id: "data-backup" },
  { icon: <Settings className="w-5 h-5" />, label: "Settings", id: "settings" },
];

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { students, teachers, compiledResults, getPendingApprovals, currentUser, checkUserPermissionAPI, currentAcademicYear, currentTerm, loadCompiledResultsFromAPI, notifications, addNotification } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  // Get admin name from currentUser username (since User interface doesn't have firstName/lastName)
  const adminName = currentUser ? currentUser.username : 'Administrator';

    
  // Force refresh compiled results on component mount
  useEffect(() => {
    let isMounted = true;
    const refreshData = async () => {
      if (isMounted) {
        await loadCompiledResultsFromAPI();
        setRefreshKey(prev => prev + 1);
      }
    };
    
    refreshData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Remove loadCompiledResultsFromAPI from dependencies to prevent infinite loops
  
  // Real-time notification listener for admins
  useNotificationListener(currentUser?.role, currentUser?.id);

  // Get real statistics
  const activeStudents = students.filter(s => s && s.status && s.status === 'Active').length;
  const activeTeachers = teachers.filter(t => t && t.status && t.status === 'Active').length;
  const pendingResults = getPendingApprovals().length;
  // Get unread notifications for admin (targets 'all')
  const unreadNotifications = notifications.filter(n => 
    !n.isRead && n.targetAudience === 'all'
  );

  // Permission checks - for admin, all permissions are granted
  const hasAdminRole = currentUser?.role === 'admin';
  const canManageUsers = hasAdminRole || (currentUser ? checkUserPermissionAPI(currentUser.role, 'create_users') : false);
  const canManageStudents = hasAdminRole || (currentUser ? checkUserPermissionAPI(currentUser.role, 'create_students') : false);
  const canManageAcademics = hasAdminRole || (currentUser ? checkUserPermissionAPI(currentUser.role, 'manage_classes') : false);
  const canManageFinancial = hasAdminRole || (currentUser ? checkUserPermissionAPI(currentUser.role, 'manage_fees') : false);
  const canViewReports = hasAdminRole || (currentUser ? checkUserPermissionAPI(currentUser.role, 'view_student_reports') : false);
  const canManageSystem = hasAdminRole || (currentUser ? checkUserPermissionAPI(currentUser.role, 'manage_settings') : false);

  // Notification dialog state
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      toast.success("Logged out successfully");
      onLogout();
    } else {
      setActiveItem(id);
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
          userName={adminName}
          userRole="System Admin"
          notificationCount={unreadNotifications.length}
          notifications={notifications}
          onLogout={onLogout}
          onNotificationClick={() => setActiveItem('view-messages')}
          onMarkAsRead={(id) => {}}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">Welcome, {adminName}</h1>
                <p className="text-[#6B7280]">System Overview & Management</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => {
                    toast.success("Opening Student Management");
                    setActiveItem('manage-students');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Total Students</p>
                      <span className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{activeStudents}</p>
                    <p className="text-xs text-[#10B981]">Active students</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => {
                    toast.success("Opening User Management");
                    setActiveItem('manage-users');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Teaching Staff</p>
                      <GraduationCap className="w-5 h-5 text-[#10B981] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{activeTeachers}</p>
                    <p className="text-xs text-[#10B981]">Active teachers</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => {
                    toast.success("Opening Results Management");
                    setActiveItem('results-management');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Pending Results</p>
                      <span className="w-5 h-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{pendingResults}</p>
                    <p className="text-xs text-[#F59E0B]">{pendingResults > 0 ? 'Awaiting approval' : 'All approved'}</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => {
                    toast.success("Opening Notifications");
                    setActiveItem('view-messages');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Notifications</p>
                      <span className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{unreadNotifications.length}</p>
                    <p className="text-xs text-[#6B7280]">Unread messages</p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Session */}
              <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="bg-[#3B82F6] rounded-t-lg p-4 border-b border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Active Session & Term</h3>
                    <Badge className="bg-[#10B981] text-white border-0 text-xs">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                      <p className="text-[#6B7280] mb-1 text-sm">Academic Session</p>
                      <p className="text-[#1F2937] font-medium">{currentAcademicYear}</p>
                    </div>
                    <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                      <p className="text-[#6B7280] mb-1 text-sm">Current Term</p>
                      <p className="text-[#1F2937] font-medium">{currentTerm}</p>
                    </div>
                    <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                      <p className="text-[#6B7280] mb-1 text-sm">Status</p>
                      <p className="text-[#10B981] font-medium">In Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Info */}
              <Card className="rounded-lg bg-gradient-to-r from-[#3B82F6]/10 to-[#2563EB]/5 border border-[#3B82F6]/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 text-[#3B82F6] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-[#1F2937] font-medium mb-2">Quick Actions Available</p>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                          <p className="text-[#6B7280] text-sm">Use floating buttons (bottom right) for quick access to:</p>
                          <ul className="text-xs text-[#1F2937] mt-2 space-y-1">
                            <li>• Register New User</li>
                            <li>• Add Student</li>
                            <li>• Results Management</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                          <p className="text-[#6B7280] text-sm">Use sidebar menu to:</p>
                          <ul className="text-xs text-[#1F2937] mt-2 space-y-1">
                            <li>• Manage all users</li>
                            <li>• Configure classes & subjects</li>
                            <li>• Set teacher assignments</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                          <p className="text-[#6B7280] text-sm">System features:</p>
                          <ul className="text-xs text-[#1F2937] mt-2 space-y-1">
                            <li>• Real-time notifications</li>
                            <li>• Student promotion</li>
                            <li>• Results approval workflow</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
                <Button 
                  onClick={() => {
                    toast.success("Opening User Registration");
                    setActiveItem("register-user");
                  }}
                  className="w-12 h-12 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] shadow-lg hover:shadow-xl transition-all hover-lift"
                  title="Register User"
                >
                  <Plus className="w-5 h-5 text-white" />
                </Button>
                <Button 
                  onClick={() => {
                    toast.success("Opening Results Management");
                    setActiveItem("results-management");
                  }}
                  className="w-12 h-12 rounded-lg bg-[#10B981] hover:bg-[#059669] shadow-lg hover:shadow-xl transition-all hover-lift"
                  title="Results Management"
                >
                  <Database className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          )}

          {activeItem === "register-user" && (
            <RegisterUserPage />
          )}
          {activeItem === "manage-students" && (
            <ManageStudentsPage />
          )}
          {activeItem === "manage-users" && (
            <ManageUsersPage />
          )}
          {activeItem === "manage-classes" && (
            <ManageClassesPage />
          )}
          {activeItem === "manage-subjects" && (
            <ManageSubjectsPage />
          )}
          {activeItem === "teacher-assignments" && (
            <ManageTeacherAssignmentsPage />
          )}
          {activeItem === "promotion-system" && (
            <PromotionSystemPage />
          )}
          {activeItem === "link-student-parent" && (
            <LinkStudentParentPage />
          )}
          {activeItem === "fee-management" && (
            <FeeManagementPage />
          )}
          {activeItem === "send-notifications" && (
            <NotificationSystemPage />
          )}
          {activeItem === "view-messages" && (
            <ViewNotificationsPage />
          )}
          {activeItem === "activity-logs" && (
            <ActivityLogsPage />
          )}
          {activeItem === "data-backup" && (
            <DataBackupPage />
          )}
          {activeItem === "settings" && (
            <SystemSettingsPage />
          )}
          {activeItem === "attendance-reports" && (
            <AttendanceReportsPage />
          )}
          {activeItem === "exam-timetable" && (
            <ExamTimetablePage />
          )}
          {activeItem === "results-management" && (
            <ResultsManagementPage />
          )}
                    
          {!["dashboard", "register-user", "manage-students", "manage-users", "manage-classes", "manage-subjects", "teacher-assignments", "promotion-system", "link-student-parent", "fee-management", "send-notifications", "view-messages", "activity-logs", "data-backup", "settings", "attendance-reports", "exam-timetable", "results-management"].includes(activeItem) && (
            <div className="space-y-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-md w-full">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-lg bg-[#3B82F6] flex items-center justify-center mx-auto mb-4">
                      {sidebarItems.find(item => item.id === activeItem)?.icon}
                    </div>
                    <h3 className="text-[#1F2937] mb-3 font-semibold">
                      {sidebarItems.find(item => item.id === activeItem)?.label}
                    </h3>
                    <p className="text-[#6B7280]">
                      This section contains the functionality for {sidebarItems.find(item => item.id === activeItem)?.label.toLowerCase()}.
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
        <DialogHeader className="sr-only">
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>View system notifications and updates.</DialogDescription>
        </DialogHeader>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <ViewNotificationsPage />
        </DialogContent>
      </Dialog>
    </div>
  );
}
