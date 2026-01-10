import { BarChart, BarChart3, ArrowLeft } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "../ui/dialog";
import schoolLogo from "../../assets/images/school-logo.jpg";
import { Input } from "../ui/input";
import { StudentResultCard } from "../shared/StudentResultCard";
import { FullPageResultView } from "../shared/FullPageResultView";
import { ResultSheetViewerButton } from "./ResultSheetViewer";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { generateAdminPDF } from '../../utils/adminPdfGenerator';

type ViewMode = "management" | "viewAll" | "viewSheets";

export function ResultsManagementPage() {
  const {
    currentUser,
    students,
    teachers,
    classes,
    subjects,
    subjectAssignments,
    compiledResults,
    getPendingApprovals,
    approveCompiledResult,
    getCompiledResultsByYearAndTerm,
    getAllAcademicYears,
    loadCompiledResultsFromAPI,
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
  } = useSchool();
  
  // Ref for PDF generation
  const resultCardRef = useRef<HTMLDivElement>(null);

  // Direct PDF Download function - Generate from data instead of DOM
  const handleDownloadStudentPDF = async (student: any, result: any) => {
    try {
      console.log('=== DIRECT PDF DOWNLOAD STARTED ===');
      console.log('Student:', student.firstName, student.lastName);
      console.log('Student ID:', student.id);
      console.log('Result ID:', result.id);
      console.log('Student data:', student);
      console.log('Result data:', result);
      console.log('School settings available:', !!schoolSettings);
      
      // Pass the complete context including school settings and domain data
      const context = {
        schoolSettings: schoolSettings,
        teachers: teachers,
        classes: classes,
        scores: scores,
        affectiveDomains: affectiveDomains,
        psychomotorDomains: psychomotorDomains
      };
      
      console.log('Context being passed to PDF:', context);
      
      // Generate PDF directly from compiled result data with full context
      await generateAdminPDF(student, result, context);
      
      console.log('=== DIRECT PDF COMPLETED SUCCESSFULLY ===');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('=== DIRECT PDF GENERATION FAILED ===');
      console.error('Error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  // Bulk selection state
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
        
        const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkComment, setBulkComment] = useState("");
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  // const { broadcast } = useNotificationService();

  const [viewMode, setViewMode] = useState<ViewMode>("management");
      const [activeTab, setActiveTab] = useState("pending");
    const [selectedClassId, setSelectedClassId] = useState<string>("all");
      const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm);
        const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear);
        const [academicYears, setAcademicYears] = useState<string[]>([]);
      const [searchQuery, setSearchQuery] = useState("");
      
      const [selectedResult, setSelectedResult] = useState<number | null>(null);
        const [fullPageView, setFullPageView] = useState<{ studentId: number; resultId: number } | null>(null);
      
      const [principalComment, setPrincipalComment] = useState("");

    const [rejectionReason, setRejectionReason] = useState("");
    const [historicalResults, setHistoricalResults] = useState<any[]>([]);
    
    const resultSheetRef = useRef<HTMLDivElement>(null);
    // Optimized academic years loading with memoization
  const loadAcademicYears = useMemo(() => async () => {
      try {
      const years = await getAllAcademicYears();
          if (years) {
        setAcademicYears(years);
          }
      } catch (error) {
        console.error('Failed to load academic years:', error);
      }
    }, [getAllAcademicYears]);
      // Load school settings
  useEffect(() => {
    loadSchoolSettings();
  }, [loadSchoolSettings]);
    // Load compiled results
  useEffect(() => {
        loadCompiledResultsFromAPI();
  }, [loadCompiledResultsFromAPI]);
      // Update results when filters change
  useEffect(() => {
    if (selectedYear && selectedTerm) {
      getCompiledResultsByYearAndTerm(selectedYear, selectedTerm).then(results => {
        console.log('Results updated for filters:', { selectedYear, selectedTerm, count: results?.length });
      });
    }
  }, [selectedYear, selectedTerm, getCompiledResultsByYearAndTerm]);
        // Memoized filtered results
  const filteredResults = useMemo(() => {
    // Use compiledResults for current term/year, or load historical data
    let results = compiledResults;
    
    if (selectedYear !== currentAcademicYear || selectedTerm !== currentTerm) {
      // For historical data, we'd need to load it separately
      // For now, filter from compiledResults
      results = compiledResults.filter(r => r.academic_year === selectedYear && r.term === selectedTerm);
    }
    
    return results.filter(result => {
      // Search filter
      if (searchQuery) {
        const student = students.find(s => s.id === result.student_id);
        if (student && (
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${student.lastName} ${student.firstName}`.toLowerCase().includes(searchQuery.toLowerCase())
        )) {
          return true;
        }
        return false;
      }
      
      // Class filter
      if (selectedClassId !== "all") {
        return result.class_id === parseInt(selectedClassId);
      }
      
      return true;
    });
  }, [selectedYear, selectedTerm, currentAcademicYear, currentTerm, searchQuery, selectedClassId, students, compiledResults]);

    // Handle bulk selection
  const handleSelectAll = () => {
    if (filteredResults.length === selectedResults.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(filteredResults.map(r => r.id));
    }
  };
    
    // Handle individual result selection
  const handleSelectResult = (resultId: number) => {
      setSelectedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };
        // Handle bulk approval
  const handleBulkApprove = async () => {
      try {
      for (const resultId of selectedResults) {
        await approveCompiledResult(resultId);
      }
      
      toast.success(`Successfully approved ${selectedResults.length} result(s)`);
      setSelectedResults([]);
      setShowBulkActions(false);
      loadCompiledResultsFromAPI();
    } catch (error) {
      console.error('Bulk approval failed:', error);
      toast.error('Failed to approve some results. Please try again.');
    }
  };
      // Handle bulk rejection
  const handleBulkReject = async () => {
        
        try {
      for (const resultId of selectedResults) {
        await updateCompiledResult(resultId, { 
          status: 'Rejected', 
          rejection_reason: bulkRejectionReason,
          approved_by: null,
          approved_date: null
        });
      }
      
      toast.success(`Successfully rejected ${selectedResults.length} result(s)`);
      setSelectedResults([]);
      setShowBulkActions(false);
      setBulkRejectionReason("");
      loadCompiledResultsFromAPI();
    } catch (error) {
      console.error('Bulk rejection failed:', error);
      toast.error('Failed to reject some results. Please try again.');
    }
  };
        
        // Handle individual result approval
  const handleApprove = async (resultId: number) => {
          try {
      await approveCompiledResult(resultId);
      toast.success('Result approved successfully');
      loadCompiledResultsFromAPI();
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Failed to approve result. Please try again.');
    }
  };
    
    // Handle individual result rejection
  const handleReject = async (resultId: number) => {
        try {
      await updateCompiledResult(resultId, { 
        status: 'Rejected',
        rejection_reason: rejectionReason,
        approved_by: null,
        approved_date: null
      });
      toast.success('Result rejected successfully');
      setRejectionReason("");
      loadCompiledResultsFromAPI();
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject result. Please try again.');
    }
  };
      // Handle result deletion
  const handleDelete = async (resultId: number) => {

    try {
      await deleteCompiledResult(resultId);
      toast.success('Result deleted successfully');
      loadCompiledResultsFromAPI();
    } catch (error) {
      console.error('Deletion failed:', error);
      toast.error('Failed to delete result. Please try again.');
    }
  };
    // Generate PDF for approved result
  const handleGeneratePDF = async (studentId: number, resultId: number) => {
    
    try {
      const student = students.find(s => s.id === studentId);
      const result = compiledResults.find(r => r.id === resultId);
      
      if (!student || !result) {
        toast.error('Student or result not found');
        return;
      }
      
      // Use the shared admin PDF generator with full context
      const context = {
        schoolSettings: schoolSettings,
        teachers: teachers,
        classes: classes,
        scores: scores,
        affectiveDomains: affectiveDomains,
        psychomotorDomains: psychomotorDomains
      };
      
      await generateAdminPDF(student, result, context);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };
    
    // Get student class information
  const getStudentClass = (studentId: number, classId: number) => {
    return classes.find(c => c.id === classId);
  };
      
      // Get class teacher name
  const getClassTeacherName = (classId: number) => {
        const classInfo = classes.find(c => c.id === classId);
    if (classInfo?.classTeacherId) {
      const teacher = teachers.find(t => t.id === classInfo.classTeacherId);
      return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not assigned';
    }
    return 'Not assigned';
  };
    
    // Render the main component
  return (
          <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results Management</h1>
          <p className="text-gray-600">Review and manage student results</p>
        </div>
        <button
          onClick={() => setShowBulkActions(!showBulkActions)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showBulkActions ? 'Cancel Bulk Actions' : 'Bulk Actions'}
        </button>
      </div>
          {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Terms</option>
              <option value="FIRST TERM">First Term</option>
              <option value="SECOND TERM">Second Term</option>
              <option value="THIRD TERM">Third Term</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
      <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    
    {/* Bulk Actions */}
      {showBulkActions && selectedResults.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {selectedResults.length} result{selectedResults.length > 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve All
              </button>
              <button
                onClick={() => setShowBulkRejectDialog(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}
    
    {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year/Term
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
    {filteredResults.map((result) => {
                const student = students.find(s => s.id === result.student_id);
                const classInfo = classes.find(c => c.id === result.class_id);
                
                return (
                  <tr key={result.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedResults.includes(result.id)}
                        onChange={() => handleSelectResult(result.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student?.firstName} {student?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student?.admissionNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {classInfo?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.academic_year} - {result.term}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.status === 'Approved' 
                          ? 'bg-green-100 text-green-800'
                          : result.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGeneratePDF(result.student_id, result.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          PDF
                        </button>
                        {result.status === 'Submitted' && (
                          <>
                            <button
                              onClick={() => handleApprove(result.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(result.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(result.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ViewAllResultsPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button onClick={onBack || (() => {})} variant="outline" className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Management
        </Button>
        <h2 className="text-2xl font-bold">All Results</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">View all results functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ViewResultSheetsPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button onClick={onBack || (() => {})} variant="outline" className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Management
        </Button>
        <h2 className="text-2xl font-bold">Result Sheets</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">View result sheets functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
