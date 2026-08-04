import { ArrowLeft, Download, Eye, CheckSquare } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from "react";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { StudentResultCard } from "../shared/StudentResultCard";
import { ViewAllResultsPage } from "./ViewAllResultsPage";
import { ViewResultSheetsPage } from "./ViewResultSheetsPage";
import { FullPageResultView } from "../shared/FullPageResultView";

import { CumulativeResultSheet } from "../CumulativeResultSheet";
import { shouldShowPosition as checkShouldShowPosition, getGrade } from "../../utils/classHelpers";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { API_CONFIG } from "../../config/api";
import { formatPositionWithSuffix } from "../../utils/position";
import { generatePDFFromData as generateStudentResultPdf, generateCumulativePDF } from "../../utils/pdfGenerator";
import { ResultRowCard } from "./results-management/ResultRowCard";
import { ResultsFilterBar } from "./results-management/ResultsFilterBar";
import { ResultsPagination } from "./results-management/ResultsPagination";
import { CumulativeResultsTab } from "./results-management/CumulativeResultsTab";
import { BulkActionsBar } from "./results-management/BulkActionsBar";

type ViewMode = "management" | "viewAll" | "viewSheets";

class ResultsManagementErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch(_error: unknown) {
    // Silent fail for security
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="mb-4">
              <h3 className="text-red-700">Results Management Error</h3>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-700">
                The page encountered an error and could not render.
              </div>
              <div className="text-xs text-gray-500 break-words">{this.state.message}</div>
              <div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

class FullPageErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch() {
    // silent
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 max-w-lg w-full">
            <div className="mb-4">
              <h3 className="text-red-700">Error Loading Result</h3>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-700">
                The result could not be displayed due to an error.
              </div>
              <div className="text-xs text-gray-500 break-words bg-gray-50 p-2 rounded border">
                {this.state.message}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button variant="default" onClick={this.props.onClose}>
                  Back to Results
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ResultsManagementPage() {
  const {
    currentUser,
    students,
    teachers,
    classes,
    subjects,
    subjectAssignments,
    compiledResults,
    getPendingApprovals: _getPendingApprovals,
    approveCompiledResult,
    getCompiledResultsByYearAndTerm,
    getAllAcademicYears,
    loadCompiledResultsFromAPI,
    loadClassesFromAPI,
    currentTerm,
    currentAcademicYear,
    updateCompiledResult,
    deleteCompiledResult,
    addNotification,
    scores,
    affectiveDomains,
    psychomotorDomains,
    schoolSettings,
    loadSchoolSettings,
    cumulativeResults,
    loadCumulativeResultsFromAPI,
    compileCumulativeResults,
    loadingCumulative,
  } = useSchool();

  if (!currentUser) {
    return (
      <div className="p-4">
        <div className="section-band">
          <div className="mb-4">
            <h3>Results Management</h3>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-700">You must be logged in to view this page.</div>
            <div className="text-xs text-gray-500">If you just logged in, refresh the page.</div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Ref for PDF generation
  const resultCardRef = useRef<HTMLDivElement>(null);

  const downloadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [downloadingResultIds, setDownloadingResultIds] = useState<Record<number, boolean>>({});

  const [isClosingFullPageView, setIsClosingFullPageView] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const closeFullPageView = () => {
    setIsClosingFullPageView(true);
    setFullPageView(null);
    window.setTimeout(() => setIsClosingFullPageView(false), 250);
  };

  // Direct PDF Download function - Generate from data instead of DOM
  const handleDownloadStudentPDF = async (student: any, result: any) => {
    const resultId = Number(result?.id);
    if (resultId && downloadingResultIds[resultId]) {
      return;
    }

    if (resultId) {
      // Mark as queued immediately so repeated clicks for the same row don't
      // enqueue duplicate downloads while still allowing other rows to be clicked.
      setDownloadingResultIds(prev => ({ ...prev, [resultId]: true }));
    }

    // Queue downloads so the browser always treats each save as a deliberate
    // user-triggered download and we don't overlap jsPDF/file operations.
    // Overlapping downloads can cause later clicks to appear to do nothing
    // until a hard refresh.
    const doDownload = async () => {
      try {
        const context = {
          schoolSettings,
          teachers,
          classes,
          scores,
          affectiveDomains,
          psychomotorDomains,
        };

        await generateStudentResultPdf(student, result, context, {
          downloadMethod: 'blob',
        });
        toast.success('PDF downloaded successfully!');
      } catch (error) {
        toast.error('Failed to generate PDF. Please try again.');
      } finally {
        setDownloadingResultIds(prev => {
          const next = { ...prev };
          delete next[resultId];
          return next;
        });
      }
    };

    downloadQueueRef.current = downloadQueueRef.current.then(doDownload, doDownload);
    await downloadQueueRef.current;
  };

  // Note: _generatePDFFromData removed — unused dead code (~1138 lines).
  // PDF generation is handled by generateStudentResultPdf utility and StudentResultSheet component.

  // Dead PDF code removed

  // Bulk selection state
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [bulkComment, setBulkComment] = useState("");
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  // const { broadcast } = useNotificationService();

  const [viewMode, setViewMode] = useState<ViewMode>("management");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm ?? "");
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear ?? "");
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [fullPageView, setFullPageView] = useState<{ studentId: number; resultId: number } | null>(null);
  const [_principalComment, _setPrincipalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);

  // Keep selected term/year in sync with system settings once they load.
  // This prevents the page from getting stuck with empty filters on first mount.
  useEffect(() => {
    if (!selectedTerm && currentTerm) {
      setSelectedTerm(currentTerm);
    }
    if (!selectedYear && currentAcademicYear) {
      setSelectedYear(currentAcademicYear);
    }
  }, [currentTerm, currentAcademicYear, selectedTerm, selectedYear]);

  const resultSheetRef = useRef<HTMLDivElement>(null);

  // Optimized academic years loading with memoization
  const loadAcademicYears = useMemo(() => async () => {
    try {
      const years = await getAllAcademicYears();
      if (years) {
        setAcademicYears(years);
      }
    } catch (error) {
      // Silent fail for security
    }
  }, [getAllAcademicYears]);

  // Optimized data loading with caching and real-time updates
  useEffect(() => {
    let isMounted = true;
    let lastUpdate = 0;
    const CACHE_DURATION = 30000; // Reduced to 30 seconds for fresher data
    let refreshInterval: NodeJS.Timeout;
    
    const loadData = async (forceRefresh = false) => {
      const now = Date.now();
      
      // Skip if not enough time passed and not forcing refresh
      if (!forceRefresh && (now - lastUpdate) < CACHE_DURATION) {
        return;
      }
      
      lastUpdate = now;
      
      try {
        // Load all data in parallel for better performance
        await Promise.all([
          loadCompiledResultsFromAPI(null),
          loadAcademicYears(),
          loadSchoolSettings()
        ]);
      } catch (error) {
        if (isMounted) {
          // Silent fail for security
        }
      }
    };
    
    // Initial load
    loadData(true);
    
    // Set up smart refresh - only when window is focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        loadData(true);
      }
    };
    
    // Set up periodic refresh with longer interval
    refreshInterval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        loadData();
      }
    }, 30000); // Refresh every 30 seconds
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadCompiledResultsFromAPI, loadAcademicYears, loadSchoolSettings, loadClassesFromAPI]);

  // Debounced loading for year/term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedYear && selectedTerm) {
        loadResultsForYearAndTerm(false);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedTerm]);

  // Optimized historical results loading with caching
  const loadResultsForYearAndTerm = async (_forceRefresh: boolean) => {
    const currentYear = currentAcademicYear ?? '';
    const currentSelectedYear = selectedYear ?? '';
    const currentSelectedTerm = selectedTerm ?? '';
    const currentSystemTerm = currentTerm ?? '';

    if (currentSelectedYear === currentYear && currentSelectedTerm === currentSystemTerm) {
      // Load current session results normally
      await loadCompiledResultsFromAPI(null);
    } else {
      // Load historical results
      try {
        const results = await getCompiledResultsByYearAndTerm(selectedYear, selectedTerm);
        setHistoricalResults(results);
      } catch (error) {
        setHistoricalResults([]);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        loadAcademicYears(),
        loadSchoolSettings(),
        loadClassesFromAPI(),
      ]);

      await loadResultsForYearAndTerm(true);
      toast.success('Refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    }
  };

  // Filter results based on active tab (must be called before early returns)
  const filteredResults = useMemo(() => {
    const normalize = (v: any) => String(v ?? '').trim().toLowerCase();
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };
    const getResultTerm = (r: any) => r?.term ?? r?.Term;
    const getResultYear = (r: any) => r?.academic_year ?? r?.academicYear ?? r?.session ?? r?.Session;
    const getResultClassId = (r: any) => r?.class_id ?? r?.classId ?? r?.class ?? r?.classID;

    // Use historical results if not current term/year, otherwise use compiledResults
    const currentYear = currentAcademicYear ?? '';
    const currentSystemTerm = currentTerm ?? '';
    const isCurrentSession = selectedYear === currentYear && selectedTerm === currentSystemTerm;

    let allResults = isCurrentSession 
      ? compiledResults 
      : historicalResults;

    const selectedTermNorm = normalize(selectedTerm);
    const selectedYearNorm = normalize(selectedYear);

    let results = allResults.filter((r: any) => {
      const resultTermNorm = normalize(getResultTerm(r));
      const resultYearNorm = normalize(getResultYear(r));
      const resultClassId = getResultClassId(r);

      const matchesTerm = resultTermNorm === selectedTermNorm;
      const matchesYear = resultYearNorm === selectedYearNorm;
      const matchesClass =
        selectedClassId === 'all' || String(resultClassId ?? '') === String(selectedClassId);

      return matchesTerm && matchesYear && matchesClass;
    });

    // Filter by status based on tab
    if (activeTab === "pending") {
      results = results.filter((r: any) => r.status === "Submitted");
    } else if (activeTab === "approved") {
      results = results.filter((r: any) => r.status === "Approved");
    } else if (activeTab === "rejected") {
      results = results.filter((r: any) => r.status === "Rejected");
    } else if (activeTab === "all") {
      // Show all results EXCEPT rejected ones
      results = results.filter((r: any) => r.status !== "Rejected");
    }

    // Search filter
    if (searchQuery) {
      results = results.filter((r: any) => {
        const rStudentId = toNum(r?.student_id);
        const student = students.find((s: any) => toNum(s?.id) === rStudentId);
        if (!student) return false;
        const query = searchQuery.toLowerCase();
        return (
          (student.firstName && student.firstName.toLowerCase().includes(query)) ||
          (student.lastName && student.lastName.toLowerCase().includes(query)) ||
          (student.admissionNumber && student.admissionNumber.toLowerCase().includes(query))
        );
      });
    }

    return results;
  }, [compiledResults, historicalResults, selectedTerm, selectedYear, selectedClassId, activeTab, searchQuery, students, currentTerm, currentAcademicYear]);

  const tabCounts = useMemo(() => {
    const normalize = (v: any) => String(v ?? '').trim().toLowerCase();
    const getResultTerm = (r: any) => r?.term ?? r?.Term;
    const getResultYear = (r: any) => r?.academic_year ?? r?.academicYear ?? r?.session ?? r?.Session;

    const currentYear = currentAcademicYear ?? '';
    const currentSystemTerm = currentTerm ?? '';
    const isCurrentSession = selectedYear === currentYear && selectedTerm === currentSystemTerm;
    const allResults = isCurrentSession ? compiledResults : historicalResults;

    const selectedTermNorm = normalize(selectedTerm);
    const selectedYearNorm = normalize(selectedYear);
    const base = (Array.isArray(allResults) ? allResults : []).filter((r: any) => {
      const resultTermNorm = normalize(getResultTerm(r));
      const resultYearNorm = normalize(getResultYear(r));
      return resultTermNorm === selectedTermNorm && resultYearNorm === selectedYearNorm;
    });

    return {
      pending: base.filter((r: any) => r.status === 'Submitted').length,
      approved: base.filter((r: any) => r.status === 'Approved').length,
      rejected: base.filter((r: any) => r.status === 'Rejected').length,
      all: base.filter((r: any) => r.status !== 'Rejected').length,
    };
  }, [compiledResults, historicalResults, selectedTerm, selectedYear, currentTerm, currentAcademicYear]);

  // Get students with results
  const studentsWithResults = useMemo(() => {
    return filteredResults
      .map((result: any) => {
        const student = students.find((s: any) => Number(s.id) === Number(result.student_id));
        return student ? { ...student, result } : null;
      })
      .filter(Boolean);
  }, [filteredResults, students]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedClassId, selectedTerm, selectedYear]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(studentsWithResults.length / pageSize));
  }, [studentsWithResults.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedStudentsWithResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return studentsWithResults.slice(start, start + pageSize);
  }, [studentsWithResults, currentPage, pageSize]);

  // Get selected result
  const selectedResultData = useMemo(() => {
    if (!selectedResult) return null;
    return compiledResults.find((r: any) => r.id === selectedResult);
  }, [selectedResult, compiledResults]);

  const selectedStudent = useMemo(() => {
    if (!selectedResultData) return null;
    return students.find((s: any) => s.id === selectedResultData.student_id);
  }, [selectedResultData, students]);

  // If viewing other pages, render them (after all hooks have been called)
  if (viewMode === "viewAll") {
    return (
      <div className="space-y-6">
        <ViewAllResultsPage
          onBack={() => setViewMode("management")}
          onViewResult={(studentId, resultId) => {
            setFullPageView({ studentId, resultId });
          }}
        />
      </div>
    );
  }

  if (viewMode === "viewSheets") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setViewMode("management")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Management
          </Button>
          <h1 className="text-[#0A2540] font-heading font-bold">View Result Sheets</h1>
        </div>
        <ViewResultSheetsPage />
      </div>
    );
  }

  // Match parent behavior: when full page view is open, render it as the only page.
  // This prevents click-through / immediate re-open issues and makes Back reliable.
  if (fullPageView) {
    return (
      <FullPageErrorBoundary onClose={closeFullPageView}>
        <FullPageResultView
          studentId={fullPageView.studentId}
          resultId={fullPageView.resultId}
          onClose={closeFullPageView}
        />
      </FullPageErrorBoundary>
    );
  }

  // Handle approve
  const _handleApprove = async (resultId: number) => {
    const result = compiledResults.find((r: any) => r.id === resultId);
    if (!result) return;

    try {
      // First update with print_approved
      await updateCompiledResult(resultId, {
        principal_signature: "", // Can add signature upload later
        print_approved: 1, // Set print approval to true
      });

      // Then approve using the proper approval function
      await approveCompiledResult(resultId);
      
      // Refresh
      await loadCompiledResultsFromAPI(null);
      
      const student = students.find((s: any) => s.id === result.student_id);
      toast.success(`Result approved for ${student?.firstName} ${student?.lastName || 'Student'}`);
    } catch (error) {
      toast.error('Failed to approve result');
    }
  };

  // Handle reject
  const _handleReject = async (resultId: number) => {
    const reason = (rejectionReason || '').trim();
    await updateCompiledResult(resultId, {
      status: "Rejected",
      rejection_reason: reason,
    });

    // Refresh data to ensure UI updates
    await loadCompiledResultsFromAPI(null);

    const result = compiledResults.find((r) => r.id === resultId);
    const student = students.find((s) => s.id === result?.student_id);
    
    if (student && result) {
      const notificationData = {
        title: "Result Rejected ⚠",
        message: `${student.firstName} ${student.lastName}'s result for ${result.term} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
        type: "warning" as const,
        targetAudience: "all" as const,
        sentBy: currentUser!.id,
      };
      
      // Create real database notification
      await addNotification({
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        targetAudience: notificationData.targetAudience,
        sentBy: notificationData.sentBy,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: []
      });

      // Notify class teacher specifically
      const classInfo = classes.find((c: any) => c.id === result.class_id);
      if (classInfo?.classTeacherId) {
        const classTeacher = teachers.find((t: any) => t.id === classInfo.classTeacherId);
        if (classTeacher) {
          const teacherNotification = {
            title: "Result Rejected - Action Required",
            message: `Result for ${student.firstName} ${student.lastName} (${classInfo.name}) was rejected.${reason ? ` Reason: ${reason}.` : ''} Please review and resubmit.`,
            type: "warning" as const,
            targetAudience: "teachers" as const,
            sentBy: currentUser!.id,
          };
          // Create real database notification for teacher
          await addNotification({
            title: teacherNotification.title,
            message: teacherNotification.message,
            type: teacherNotification.type,
            targetAudience: teacherNotification.targetAudience,
            sentBy: teacherNotification.sentBy,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
          
          toast.info(`Notification sent to ${classTeacher.firstName} ${classTeacher.lastName}`);
        }
      }
    }

    toast.warning("Result rejected");
    setRejectionReason("");
    setSelectedResult(null);
  };

  // Handle delete
  const _handleDelete = (resultId: number) => {
    if (window.confirm("Are you sure you want to delete this result? This action cannot be undone.")) {
      (async () => {
        try {
          await deleteCompiledResult(resultId);
          toast.success("Result deleted successfully");
          setSelectedResult(null);
        } catch (error) {
          toast.error('Failed to delete result');
        }
      })();
    }
  };

  // Handle print with improved PDF generation - only for approved results
  const _handlePrint = async () => {
    // Check if result is approved before allowing print
    if (!selectedResultData || selectedResultData.status !== "Approved") {
      toast.error("Only approved results can be printed");
      return;
    }

    if (resultSheetRef.current) {
      try {
        // Create a new window for printing
        const printWindow = window.open("", "_blank", "width=800,height=600");
        if (!printWindow) {
          toast.error("Please allow popups to print result sheets");
          return;
        }

        // Get the content with proper CSS
        const content = resultSheetRef.current.innerHTML;
        const printCSS = `
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            @media print {
              body { 
                margin: 0; 
                font-size: 8pt;
                line-height: 0.9;
              }
              .print-container {
                width: 190mm !important;
                height: 277mm !important;
                overflow: hidden !important;
                page-break-after: always;
              }
              img {
                max-width: 100% !important;
                height: auto !important;
              }
            }
          </style>
        `;

        // Write the complete HTML document
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Result Sheet - ${selectedStudent?.firstName || 'Student'} ${selectedStudent?.lastName || ''}</title>
            ${printCSS}
          </head>
          <body>
            ${content}
          </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          toast.success("Result sheet printed successfully");
        }, 1000);

      } catch (error) {
        toast.error("Failed to print result sheet. Please try again.");
      }
    }
  };


  // Bulk selection handlers
  const handleSelectResult = (resultId: number) => {
    setSelectedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  const handleSelectAll = () => {
    const selectableIds = filteredResults.map((r: any) => r.id);
    const selectedSet = new Set(selectedResults);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id: number) => selectedSet.has(id));
    setSelectedResults(allSelected ? [] : selectableIds);
  };

  // Keep selections aligned with current filters/tab; avoid approving hidden/unrelated results.
  useEffect(() => {
    setSelectedResults([]);
  }, [activeTab, selectedClassId, selectedTerm, selectedYear, searchQuery]);

  // Bulk approve function
  const handleBulkApprove = async () => {
    if (selectedResults.length === 0) return;

    const isCurrentSession = selectedYear === currentAcademicYear && selectedTerm === currentTerm;
    if (!isCurrentSession) {
      toast.error('Bulk approval is only available for the current Term/Session. Switch filters back to Current.');
      return;
    }

    // Only approve what is currently visible/filtered (safety).
    const filteredIdSet = new Set(filteredResults.map((r: any) => r.id));
    const idsToApprove = selectedResults.filter(id => filteredIdSet.has(id));
    if (idsToApprove.length === 0) {
      toast.error('No selected results match the current filters.');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const resultId of idsToApprove) {
        try {
          // Ensure print approval flag is set, then run the canonical approval flow.
          await updateCompiledResult(resultId, {
            principal_signature: "",
            print_approved: 1,
          });
          await approveCompiledResult(resultId);
          successCount++;
        } catch (e) {
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Approved ${successCount} results successfully!`);
      } else if (successCount > 0) {
        toast.warning(`Approved ${successCount} results. Failed to approve ${failCount}.`);
      } else {
        toast.error('Failed to approve selected results');
      }
      setSelectedResults([]);
      setBulkComment("");
      setShowBulkApproveDialog(false);
      await loadCompiledResultsFromAPI(null);
    } catch (error) {
      toast.error('Failed to approve some results');
    }
  };

  // Bulk reject function
  const handleBulkReject = async () => {
    const reason = (bulkRejectionReason || '').trim();

    for (const resultId of selectedResults) {
      const result = compiledResults.find((r) => r.id === resultId);
      const student = students.find((s) => s.id === result?.student_id);
      
      await updateCompiledResult(resultId, {
        status: "Rejected",
        rejection_reason: reason,
      });

      // Notify class teacher for correction
      if (student && result) {
        const classInfo = classes.find((c: any) => c.id === result.class_id);
        if (classInfo?.classTeacherId) {
          const classTeacher = teachers.find((t: any) => t.id === classInfo.classTeacherId);
          if (classTeacher) {
            // Create notification for teacher
            const teacherNotification = {
              title: "Result Rejected - Action Required",
              message: `Result for ${student.firstName} ${student.lastName} (${classInfo.name}) was rejected.${reason ? ` Reason: ${reason}.` : ''} Please review and resubmit.`,
              type: "warning" as const,
              targetAudience: "teachers" as const,
              sentBy: currentUser!.id,
              sentDate: new Date().toISOString(),
            };
            
            // Create real database notification
            await addNotification({
              title: teacherNotification.title,
              message: teacherNotification.message,
              type: teacherNotification.type,
              targetAudience: teacherNotification.targetAudience,
              sentBy: teacherNotification.sentBy,
              sentDate: teacherNotification.sentDate,
              isRead: false,
              readBy: []
            });
            
            toast.info(`Notification sent to ${classTeacher.firstName} ${classTeacher.lastName}`);
          }
        }
      }
    }

    toast.warning(`Rejected ${selectedResults.length} results! Teachers notified for corrections.`);
    setSelectedResults([]);
    setBulkRejectionReason("");
    setShowBulkRejectDialog(false);
    await loadCompiledResultsFromAPI(null);
  };

  return (
    <ResultsManagementErrorBoundary>
      <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-w-full overflow-x-hidden">
      {/* Compact Header - Mobile Responsive */}
      <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-heading font-bold text-gray-900">Results Management</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Approve and manage student results</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2 h-8 text-xs"
            >
              <span className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <ResultsFilterBar
        selectedYear={selectedYear}
        selectedTerm={selectedTerm}
        selectedClassId={selectedClassId}
        searchQuery={searchQuery}
        academicYears={academicYears}
        classes={classes}
        filteredResultsCount={filteredResults.length}
        currentAcademicYear={currentAcademicYear}
        currentTerm={currentTerm}
        onYearChange={setSelectedYear}
        onTermChange={setSelectedTerm}
        onClassChange={setSelectedClassId}
        onSearchChange={setSearchQuery}
      />

      {/* Compact Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-2 sm:grid-cols-${selectedTerm === "Third Term" ? '5' : '4'} bg-gray-50 rounded-lg p-1 h-8 sm:h-9 gap-1`}>
          <TabsTrigger value="pending" className="rounded-md text-xs data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800">
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">P</span>
            ({tabCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-md text-xs data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
            <span className="hidden sm:inline">Approved</span>
            <span className="sm:hidden">A</span>
            ({tabCounts.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-md text-xs data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
            <span className="hidden sm:inline">Rejected</span>
            <span className="sm:hidden">R</span>
            ({tabCounts.rejected})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-md text-xs data-[state=active]:bg-[#0A2540]/10 data-[state=active]:text-[#0A2540]">
            <span className="hidden sm:inline">All</span>
            <span className="sm:hidden">All</span>
            ({tabCounts.all})
          </TabsTrigger>
          {selectedTerm === "Third Term" && (
            <TabsTrigger value="cumulative" className="rounded-md text-xs data-[state=active]:bg-[#0A2540]/10 data-[state=active]:text-[#0A2540]">
              <span className="hidden sm:inline">Cumulative</span>
              <span className="sm:hidden">C</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Main tabs content (Pending/Approved/Rejected/All) */}
        {activeTab !== "cumulative" && (
          <TabsContent value={activeTab} className="mt-4">
          {/* Compact Bulk Actions */}
          {activeTab === "pending" && filteredResults.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedResults.length}
              totalCount={filteredResults.length}
              onSelectAll={handleSelectAll}
              onApprove={() => setShowBulkApproveDialog(true)}
              onReject={() => setShowBulkRejectDialog(true)}
            />
          )}

          {/* Compact Results List */}
          <div className="section-band">
            <div className="mb-4 bg-gray-50 border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-medium text-gray-700">
                {activeTab === "pending" && "Pending Approval"}
                {activeTab === "approved" && "Approved Results"}
                {activeTab === "rejected" && "Rejected Results"}
                {activeTab === "all" && "All Results"}
                <span className="ml-2 text-xs text-gray-500">({filteredResults.length})</span>
              </h3>
            </div>
            <div className="p-4">
              {studentsWithResults.length === 0 ? (
                <div className="text-center py-8">
                  <span className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No results found</p>
                  <p className="text-xs text-gray-400">
                    {activeTab === "pending" && "No results pending approval"}
                    {activeTab === "approved" && "No approved results"}
                    {activeTab === "rejected" && "No rejected results"}
                    {activeTab === "all" && "No results available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedStudentsWithResults.map((studentData) => (
                    <ResultRowCard
                      key={studentData!.id}
                      studentData={studentData!}
                      activeTab={activeTab}
                      isSelected={selectedResults.includes(studentData!.result.id)}
                      isDownloading={!!downloadingResultIds[Number(studentData!.result.id)]}
                      isClosingFullPageView={isClosingFullPageView}
                      resultCardRef={resultCardRef}
                      onSelect={handleSelectResult}
                      onView={(sid, rid) => {
                        if (isClosingFullPageView) return;
                        setFullPageView({ studentId: sid, resultId: rid });
                      }}
                      onDownload={handleDownloadStudentPDF}
                      onSetSelectedResult={setSelectedResult}
                    />
                  ))}
                </div>
              )}

              {studentsWithResults.length > 0 && (
                <ResultsPagination
                  totalItems={studentsWithResults.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                  onPageSizeChange={(s) => setPageSize(s)}
                />
              )}
              </div>
            </div>
        </TabsContent>
        )}

        {/* Cumulative tab content */}
        {activeTab === "cumulative" && (
          <TabsContent value="cumulative" className="mt-4">
            <CumulativeResultsTab
              selectedYear={selectedYear}
              selectedClassId={selectedClassId}
              currentUser={currentUser}
              loadingCumulative={loadingCumulative}
              cumulativeResults={cumulativeResults}
              students={students}
              classes={classes}
              schoolSettings={schoolSettings}
              onCompile={async () => {
                if (!selectedClassId || selectedClassId === "all") {
                  toast.error('Please select a specific class first');
                  return;
                }
                const classId = Number(selectedClassId);
                if (!classId) {
                  toast.error('Invalid class selected');
                  return;
                }
                toast.loading('Compiling cumulative results...');
                const result = await compileCumulativeResults(classId, selectedYear);
                toast.dismiss();
                if (result.success) {
                  toast.success(result.message);
                  await loadCumulativeResultsFromAPI(classId, selectedYear);
                } else {
                  toast.error(result.message);
                }
              }}
              checkShouldShowPosition={checkShouldShowPosition}
              getGrade={getGrade}
              formatPositionWithSuffix={formatPositionWithSuffix}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Bulk Approve Dialog */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-emerald-600">Bulk Approve Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to approve {selectedResults.length} result(s). This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleBulkApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <span className="w-4 h-4 mr-2" />
                Approve {selectedResults.length} Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkApproveDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Bulk Reject Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to reject {selectedResults.length} result(s). This action cannot be undone.
            </p>
            <div>
              <Label className="text-sm font-medium">Rejection Reason</Label>
              <Textarea
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleBulkReject}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <span className="w-4 h-4 mr-2" />
                Reject {selectedResults.length} Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkRejectDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </ResultsManagementErrorBoundary>
  );
}


