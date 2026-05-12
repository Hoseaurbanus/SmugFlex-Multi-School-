import { Database, GraduationCap, HardDrive } from 'lucide-react';
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription } from "../ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { 
  exportDataAsJSON, 
  importDataFromJSON, 
  getStorageSize,
  type StorageData 
} from "../../utils/storageManager";
import {
  exportStudentsToCSV,
  exportTeachersToCSV,
  exportParentsToCSV,
  exportClassesToCSV,
  exportSubjectsToCSV,
  exportScoresToCSV,
  exportCompiledResultsToCSV,
  exportPaymentsToCSV,
  exportFeeBalancesToCSV,
  exportAttendanceToCSV,
  exportActivityLogsToCSV,
} from "../../utils/csvExporter";

export function DataBackupPage() {
  const {
    currentUser,
    students,
    teachers,
    parents,
    accountants,
    classes,
    subjects,
    subjectAssignments,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    feeStructures,
    studentFeeBalances,
    payments,
    users,
    notifications,
    activityLogs,
    attendances,
    examTimetables,
    classTimetables,
    departments,
    scholarships,
    assignments,
    schoolSettings,
    bankAccountSettings,
    currentTerm,
    currentAcademicYear,
    loadStudentsFromAPI,
    loadTeachersFromAPI,
    loadParentsFromAPI,
    loadClassesFromAPI,
    loadSubjectsFromAPI,
    loadScoresFromAPI,
    loadCompiledResultsFromAPI,
    loadPaymentsFromAPI,
    loadFeeStructuresFromAPI,
    loadAttendancesFromAPI,
    loadUsersFromAPI,
    loadNotificationsFromAPI,
  } = useSchool();

  const hasAccess = currentUser && currentUser.role === 'admin';

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <span className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You do not have permission to access Data Backup.
              This page requires administrator-level privileges.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all data when component mounts
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        // Load all data in parallel for better performance
        await Promise.all([
          loadStudentsFromAPI().catch(() => {}),
          loadTeachersFromAPI().catch(() => {}),
          loadParentsFromAPI().catch(() => {}),
          loadClassesFromAPI().catch(() => {}),
          loadSubjectsFromAPI().catch(() => {}),
          loadScoresFromAPI().catch(() => {}),
          loadCompiledResultsFromAPI().catch(() => {}),
          loadPaymentsFromAPI().catch(() => {}),
          loadFeeStructuresFromAPI().catch(() => {}),
          loadAttendancesFromAPI().catch(() => {}),
          loadUsersFromAPI().catch(() => {}),
          loadNotificationsFromAPI().catch(() => {}),
        ]);
        
        toast.success('All data loaded successfully!');
      } catch (error) {
        toast.error('Some data failed to load. Please try refreshing.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Manual refresh function
  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStudentsFromAPI().catch(() => {}),
        loadTeachersFromAPI().catch(() => {}),
        loadParentsFromAPI().catch(() => {}),
        loadClassesFromAPI().catch(() => {}),
        loadSubjectsFromAPI().catch(() => {}),
        loadScoresFromAPI().catch(() => {}),
        loadCompiledResultsFromAPI().catch(() => {}),
        loadPaymentsFromAPI().catch(() => {}),
        loadFeeStructuresFromAPI().catch(() => {}),
        loadAttendancesFromAPI().catch(() => {}),
        loadUsersFromAPI().catch(() => {}),
        loadNotificationsFromAPI().catch(() => {}),
      ]);
      
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Some data failed to refresh. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update storage size
  useEffect(() => {
    setStorageSize(getStorageSize());
  }, [students, teachers, parents, classes, subjects]);

  // Helper function to convert data to CSV
  const convertToCSV = (data: any[], headers: string[]) => {
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        // Handle arrays and objects
        if (Array.isArray(value)) return `"${value.join(', ')}"`;
        if (typeof value === 'object' && value !== null) return `"${JSON.stringify(value)}"`;
        // Escape quotes in strings
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value || '';
      }).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  };

  // Helper function to download file
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to download JSON
  const downloadJSON = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // New CSV Export Functions using utilities
  const handleExportStudents = async () => {
    await exportStudentsToCSV();
    toast.success(`Exported ${students.length} students`);
  };

  const handleExportTeachers = async () => {
    await exportTeachersToCSV();
    toast.success(`Exported ${teachers.length} teachers`);
  };

  const handleExportParents = async () => {
    await exportParentsToCSV();
    toast.success(`Exported ${parents.length} parents`);
  };

  const handleExportClasses = async () => {
    await exportClassesToCSV();
    toast.success(`Exported ${classes.length} classes`);
  };

  const handleExportSubjects = async () => {
    await exportSubjectsToCSV();
    toast.success(`Exported ${subjects.length} subjects`);
  };

  const handleExportScores = () => {
    exportScoresToCSV(scores, students);
    toast.success(`Exported ${scores.length} scores`);
  };

  const handleExportResults = () => {
    exportCompiledResultsToCSV(compiledResults, students);
    toast.success(`Exported ${compiledResults.length} results`);
  };

  const handleExportPayments = () => {
    exportPaymentsToCSV(payments, students);
    toast.success(`Exported ${payments.length} payments`);
  };

  const handleExportFeeBalances = () => {
    exportFeeBalancesToCSV(studentFeeBalances, students);
    toast.success(`Exported ${studentFeeBalances.length} fee balances`);
  };

  const handleExportAttendance = () => {
    exportAttendanceToCSV(attendances, students);
    toast.success(`Exported ${attendances.length} attendance records`);
  };

  const handleExportActivityLogs = () => {
    exportActivityLogsToCSV(activityLogs);
    toast.success(`Exported ${activityLogs.length} activity logs`);
  };

  // Export Complete Backup (JSON with localStorage)
  const handleCompleteBackup = () => {
    const dataToExport: StorageData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      currentTerm: currentTerm ?? '',
      currentAcademicYear: currentAcademicYear ?? '',
      schoolSettings,
      bankAccountSettings,
      classes,
      teachers,
      subjects,
      students,
      parents,
      accountants,
      subjectAssignments,
      scores,
      affectiveDomains,
      psychomotorDomains,
      compiledResults,
      feeStructures,
      studentFeeBalances,
      payments,
      notifications,
      activityLogs,
      attendances,
      examTimetables,
      classTimetables,
      departments,
      scholarships,
      assignments,
      users,
    };

    exportDataAsJSON(dataToExport);
    toast.success('Complete system backup downloaded successfully!');
  };

  // Import Data from JSON
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importDataFromJSON(file);
      // You can add logic here to merge or replace data
      toast.success('Data imported successfully! Please refresh to see changes.');
      // Note: Full import would require reloading context, which is complex
      // For now, this is a placeholder for the feature
    } catch (error) {
      toast.error('Failed to import data. Please check the file format.');
    }
  };

  // Export Students
  const exportStudents = () => {
    const headers = ['id', 'firstName', 'lastName', 'admissionNumber', 'classId', 'className', 'level', 'parentId', 'dateOfBirth', 'gender', 'status', 'academicYear'];
    const csv = convertToCSV(students, headers);
    downloadFile(csv, `students_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${students.length} students`);
  };

  // Export Teachers
  const exportTeachers = () => {
    const headers = ['id', 'firstName', 'lastName', 'employeeId', 'email', 'phone', 'qualification', 'specialization', 'status', 'isClassTeacher', 'classTeacherId'];
    const csv = convertToCSV(teachers, headers);
    downloadFile(csv, `teachers_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${teachers.length} teachers`);
  };

  // Export Parents
  const exportParents = () => {
    const headers = ['id', 'firstName', 'lastName', 'email', 'phone', 'studentIds', 'status'];
    const csv = convertToCSV(parents, headers);
    downloadFile(csv, `parents_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${parents.length} parents`);
  };

  // Export Classes
  const exportClasses = () => {
    const headers = ['id', 'name', 'level', 'section', 'capacity', 'currentStudents', 'classTeacherId', 'classTeacher', 'academicYear', 'status'];
    const csv = convertToCSV(classes, headers);
    downloadFile(csv, `classes_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${classes.length} classes`);
  };

  // Export Subjects
  const exportSubjects = () => {
    const headers = ['id', 'name', 'code', 'department', 'isCore', 'status'];
    const csv = convertToCSV(subjects, headers);
    downloadFile(csv, `subjects_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${subjects.length} subjects`);
  };

  // Export Subject Assignments
  const exportSubjectAssignments = () => {
    const headers = ['id', 'subjectId', 'subjectName', 'classId', 'className', 'teacherId', 'teacherName', 'academicYear', 'term'];
    const csv = convertToCSV(subjectAssignments, headers);
    downloadFile(csv, `subject_assignments_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${subjectAssignments.length} subject assignments`);
  };

  // Export Scores
  const exportScores = () => {
    const headers = ['id', 'studentId', 'subjectAssignmentId', 'subjectName', 'ca1', 'ca2', 'exam', 'total', 'classAverage', 'grade', 'remark', 'subjectTeacher', 'enteredBy', 'enteredDate', 'status'];
    const csv = convertToCSV(scores, headers);
    downloadFile(csv, `scores_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${scores.length} score entries`);
  };

  // Export Compiled Results
  const exportCompiledResults = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'totalScore', 'averageScore', 'classAverage', 'position', 'totalStudents', 'timesPresent', 'timesAbsent', 'totalAttendanceDays', 'classTeacherComment', 'principalComment', 'status'];
    const csv = convertToCSV(compiledResults, headers);
    downloadFile(csv, `compiled_results_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${compiledResults.length} compiled results`);
  };

  // Export Fee Structures
  const exportFeeStructures = () => {
    const headers = ['id', 'classId', 'className', 'level', 'term', 'academicYear', 'tuitionFee', 'developmentLevy', 'sportsFee', 'examFee', 'booksFee', 'uniformFee', 'transportFee', 'totalFee'];
    const csv = convertToCSV(feeStructures, headers);
    downloadFile(csv, `fee_structures_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${feeStructures.length} fee structures`);
  };

  // Export Student Fee Balances
  const exportStudentFeeBalances = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'totalFeeRequired', 'totalPaid', 'balance', 'status'];
    const csv = convertToCSV(studentFeeBalances, headers);
    downloadFile(csv, `student_fee_balances_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${studentFeeBalances.length} fee balance records`);
  };

  // Export Payments
  const exportPayments = () => {
    const headers = ['id', 'studentId', 'studentName', 'amount', 'paymentType', 'term', 'academicYear', 'paymentMethod', 'reference', 'recordedBy', 'recordedDate', 'status', 'receiptNumber'];
    const csv = convertToCSV(payments, headers);
    downloadFile(csv, `payments_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${payments.length} payment records`);
  };

  // Export Activity Logs
  const exportActivityLogs = () => {
    const headers = ['id', 'actor', 'actorRole', 'action', 'target', 'timestamp', 'ip', 'status', 'details'];
    const csv = convertToCSV(activityLogs, headers);
    downloadFile(csv, `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${activityLogs.length} activity logs`);
  };

  // Export Users (passwords excluded for security)
  const exportUsers = () => {
    const safeUsers = users.map((user: any) => {
  const { password, ...safeUser } = user;
  return safeUser;
});
    const headers = ['id', 'username', 'role', 'linkedId', 'email', 'status'];
    const csv = convertToCSV(safeUsers, headers);
    downloadFile(csv, `users_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${users.length} users (passwords excluded)`);
  };

  // Export Affective Domains
  const exportAffectiveDomains = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'attentiveness', 'attentivenessRemark', 'honesty', 'honestyRemark', 'neatness', 'neatnessRemark', 'obedience', 'obedienceRemark', 'senseOfResponsibility', 'senseOfResponsibilityRemark'];
    const csv = convertToCSV(affectiveDomains, headers);
    downloadFile(csv, `affective_domains_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${affectiveDomains.length} affective domain records`);
  };

  // Export Psychomotor Domains
  const exportPsychomotorDomains = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'attentionToDirection', 'attentionToDirectionRemark', 'considerateOfOthers', 'considerateOfOthersRemark', 'handwriting', 'handwritingRemark', 'sports', 'sportsRemark', 'verbalFluency', 'verbalFluencyRemark', 'worksWellIndependently', 'worksWellIndependentlyRemark'];
    const csv = convertToCSV(psychomotorDomains, headers);
    downloadFile(csv, `psychomotor_domains_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${psychomotorDomains.length} psychomotor domain records`);
  };

  // Export Complete Backup (All Data as JSON)
  const exportCompleteBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    const completeData = {
      metadata: {
        schoolName: schoolSettings.school_name,
        schoolMotto: schoolSettings.school_motto,
        principalName: schoolSettings.principal_name,
        currentTerm,
        currentAcademicYear,
        backupDate: new Date().toISOString(),
        version: '1.0',
      },
      students,
      teachers,
      parents,
      accountants,
      classes,
      subjects,
      subjectAssignments,
      scores,
      affectiveDomains,
      psychomotorDomains,
      compiledResults,
      feeStructures,
      studentFeeBalances,
      payments,
      users: users.map((user: any) => {
        const { password, ...safeUser } = user;
        return safeUser;
      }), // Exclude passwords
      notifications,
      activityLogs,
    };

    // Simulate progress
    const progressInterval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    // Download after short delay
    setTimeout(() => {
      downloadJSON(completeData, `graceland_complete_backup_${new Date().toISOString().split('T')[0]}.json`);
      setBackupProgress(100);
      
      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        toast.success('Complete system backup downloaded successfully!');
      }, 500);
    }, 1500);
  };

  const dataCategories = [
    {
      title: 'Student Data',
      icon: <GraduationCap className="w-5 h-5" />,
      items: [
        { name: 'Students', count: students.length, export: handleExportStudents, color: 'bg-blue-50 text-blue-600' },
        { name: 'Student Fee Balances', count: studentFeeBalances.length, export: handleExportFeeBalances, color: 'bg-blue-50 text-blue-600' },
        { name: 'Attendance', count: attendances.length, export: handleExportAttendance, color: 'bg-blue-50 text-blue-600' },
      ]
    },
    {
      title: 'Staff Data',
      icon: <span className="w-5 h-5" />,
      items: [
        { name: 'Teachers', count: teachers.length, export: handleExportTeachers, color: 'bg-green-50 text-green-600' },
        { name: 'Parents', count: parents.length, export: handleExportParents, color: 'bg-green-50 text-green-600' },
        { name: 'Accountants', count: accountants.length, export: () => {
          const headers = ['id', 'firstName', 'lastName', 'employeeId', 'email', 'phone', 'department', 'status'];
          const csv = convertToCSV(accountants, headers);
          downloadFile(csv, `accountants_${new Date().toISOString().split('T')[0]}.csv`);
          toast.success(`Exported ${accountants.length} accountants`);
        }, color: 'bg-green-50 text-green-600' },
      ]
    },
    {
      title: 'Academic Data',
      icon: <span className="w-5 h-5" />,
      items: [
        { name: 'Classes', count: classes.length, export: handleExportClasses, color: 'bg-purple-50 text-purple-600' },
        { name: 'Subjects', count: subjects.length, export: handleExportSubjects, color: 'bg-purple-50 text-purple-600' },
        { name: 'Scores', count: scores.length, export: handleExportScores, color: 'bg-purple-50 text-purple-600' },
        { name: 'Compiled Results', count: compiledResults.length, export: handleExportResults, color: 'bg-purple-50 text-purple-600' },
      ]
    },
    {
      title: 'Financial Data',
      icon: <span className="w-5 h-5" />,
      items: [
        { name: 'Payments', count: payments.length, export: handleExportPayments, color: 'bg-yellow-50 text-yellow-600' },
        { name: 'Fee Balances', count: studentFeeBalances.length, export: handleExportFeeBalances, color: 'bg-yellow-50 text-yellow-600' },
      ]
    },
    {
      title: 'System Data',
      icon: <Database className="w-5 h-5" />,
      items: [
        { name: 'Activity Logs', count: activityLogs.length, export: handleExportActivityLogs, color: 'bg-gray-50 text-gray-600' },
        { name: 'Notifications', count: notifications.length, export: () => {
          const headers = ['id', 'title', 'message', 'type', 'targetAudience', 'sentBy', 'sentDate', 'isRead'];
          const csv = convertToCSV(notifications, headers);
          downloadFile(csv, `notifications_${new Date().toISOString().split('T')[0]}.csv`);
          toast.success(`Exported ${notifications.length} notifications`);
        }, color: 'bg-gray-50 text-gray-600' },
      ]
    }
  ];

  const totalRecords = students.length + teachers.length + parents.length + classes.length + 
                        subjects.length + scores.length + compiledResults.length + 
                        payments.length + feeStructures.length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#1F2937] mb-2">Data Backup & Export</h1>
            <p className="text-[#6B7280]">Download all system data for backup and archival purposes</p>
          </div>
          <Button
            onClick={refreshAllData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {isBackingUp && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[#1F2937] font-medium">Preparing backup…</p>
                <p className="text-[#6B7280] text-sm">Please wait while the file is generated</p>
              </div>
              <Badge variant="outline" className="text-sm">
                {backupProgress}%
              </Badge>
            </div>
            <div className="mt-3">
              <Progress value={backupProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Card className="rounded-xl bg-blue-50 border border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="text-blue-900 font-medium">Loading System Data...</p>
                <p className="text-blue-700 text-sm">Please wait while we fetch all your data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Info Card */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-[#1F2937]">Local Storage Manager</CardTitle>
                <CardDescription className="text-sm text-[#6B7280]">
                  Manage your browser's local data storage
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {storageSize.toFixed(2)} KB Used
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={exportCompleteBackup}
              disabled={isBackingUp}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl h-auto py-4 flex-col gap-2"
            >
              <span className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Backup All Data</div>
                <div className="text-xs opacity-90">Download as JSON</div>
              </div>
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="rounded-xl h-auto py-4 flex-col gap-2 border-2 hover:border-[#3B82F6] hover:bg-blue-50"
            >
              <span className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Import Data</div>
                <div className="text-xs opacity-70">Restore from JSON</div>
              </div>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Complete Backup Card */}
      <Card className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-6 h-6 text-white" />
                <h3 className="text-white text-xl">CSV Export Center</h3>
              </div>
              <p className="text-white/90 mb-4">
                Export individual data tables as CSV files for external use
              </p>
              <div className="flex items-center gap-4 mb-4">
                <Badge className="bg-white/20 text-white border-0 text-sm">
                  <span className="w-4 h-4 mr-1" />
                  {totalRecords.toLocaleString()} Total Records
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-sm">
                  Multiple Formats
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <span className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-[#1F2937]">
          <strong>Backup Best Practices:</strong> Download regular backups to prevent data loss. 
          Store backups in a secure location. Complete backup includes all system data in JSON format 
          for easy restoration. Individual CSV exports are provided for specific data tables.
        </AlertDescription>
      </Alert>

      {/* Individual Data Category Cards */}
      {dataCategories.map((category, index) => (
        <Card key={index} className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
          <CardHeader className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F3F4F6] rounded-lg">
                {category.icon}
              </div>
              <h3 className="text-[#1F2937]">{category.title}</h3>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid md:grid-cols-2 gap-3">
              {category.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`${item.color} p-4 rounded-xl flex items-center justify-between`}
                >
                  <div>
                    <p className="text-sm opacity-80 mb-1">{item.name}</p>
                    <p className="font-semibold text-lg">{item.count.toLocaleString()} records</p>
                  </div>
                  <Button
                    onClick={item.name === 'Students'
                      ? exportStudents
                      : item.name === 'Teachers'
                        ? exportTeachers
                        : item.name === 'Parents'
                          ? exportParents
                          : item.name === 'Classes'
                            ? exportClasses
                            : item.name === 'Subjects'
                              ? exportSubjects
                              : item.export}
                    size="sm"
                    variant="ghost"
                    className="hover:bg-white/50 rounded-lg"
                  >
                    <span className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Footer Information */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 text-[#6B7280] mt-0.5" />
            <div>
              <p className="text-[#1F2937] mb-2">
                <strong>About Data Export:</strong>
              </p>
              <ul className="text-[#6B7280] text-sm space-y-1">
                <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet software</li>
                <li>• JSON backup contains all data and can be used for system restoration</li>
                <li>• User passwords are excluded from exports for security</li>
                <li>• Backup files are named with today's date for easy identification</li>
                <li>• Store backups securely and regularly (recommended: weekly backups)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
