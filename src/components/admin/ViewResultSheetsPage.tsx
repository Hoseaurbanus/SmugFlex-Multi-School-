import { useState, useMemo, useRef } from "react";
import { Search, FileText, Eye, Printer, Download, BarChart3, AlertCircle, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { StudentResultSheet } from "../StudentResultSheet";
import { CumulativeResultSheet } from "../CumulativeResultSheet";
import { useSchool } from "../../contexts/SchoolContext";
import { generatePDFFromData as generateStudentResultPdf, generateCumulativePDF } from "../../utils/pdfGenerator";
import { shouldShowPosition as checkShouldShowPosition } from "../../utils/classHelpers";
import { toast } from "sonner";

type ViewMode = "term" | "cumulative";

export function ViewResultSheetsPage() {
  const {
    students,
    classes,
    compiledResults,
    schoolSettings,
    teachers,
    scores,
    affectiveDomains,
    psychomotorDomains,
    currentTerm,
    currentAcademicYear,
    cumulativeResults,
    loadCumulativeResultsFromAPI,
    compileCumulativeResults,
    currentUser,
    loadingCumulative,
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm ?? "");
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("term");

  const resultSheetRef = useRef<HTMLDivElement>(null);
  const cumulativeResultSheetRef = useRef<HTMLDivElement>(null);

  const safeCompiledResults = Array.isArray(compiledResults) ? compiledResults : [];

  const academicYears = useMemo(() => {
    const years = [...new Set(safeCompiledResults.map(r => r.academic_year).filter(Boolean))].sort() as string[];
    if (currentAcademicYear && !years.includes(currentAcademicYear)) {
      years.unshift(currentAcademicYear);
    }
    return years;
  }, [safeCompiledResults, currentAcademicYear]);

  // Handle print using native browser print with enhanced styling
  const handlePrint = () => {
    if (resultSheetRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Get the result sheet content
        const resultSheetContent = resultSheetRef.current.innerHTML;
        
        // Create comprehensive print styles
        const printStyles = `
          <style>
            @page {
              size: A4;
              margin: 0.5in;
            }
            
            @media print {
              body {
                margin: 0;
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .bg-white {
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .text-green-600 {
                color: #16a34a !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .border-b-2 {
                border-bottom: 2px solid #16a34a !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .border-gray-800 {
                border: 1px solid #1f2937 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .border-r {
                border-right: 1px solid #1f2937 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .bg-gray-100 {
                background: #f3f4f6 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .font-bold {
                font-weight: bold !important;
              }
              
              .text-center {
                text-align: center !important;
              }
              
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              
              td, th {
                padding: 4px !important;
                font-size: 10px !important;
                vertical-align: top !important;
              }
              
              .grid {
                display: block !important;
              }
              
              .col-span-2, .col-span-5, .col-span-12 {
                display: block !important;
                width: 100% !important;
              }
              
              .w-24, .w-20 {
                width: 96px !important;
                height: 112px !important;
                margin: 0 auto 8px !important;
                display: block !important;
              }
              
              .mb-6 {
                margin-bottom: 1rem !important;
              }
              
              .mb-2 {
                margin-bottom: 0.5rem !important;
              }
              
              .mb-1 {
                margin-bottom: 0.25rem !important;
              }
              
              .py-1 {
                padding: 2px 0 !important;
              }
              
              .p-1 {
                padding: 4px !important;
              }
              
              .p-2 {
                padding: 8px !important;
              }
              
              .text-sm {
                font-size: 12px !important;
              }
              
              .text-xs {
                font-size: 10px !important;
              }
              
              .text-2xl {
                font-size: 24px !important;
              }
              
              .gap-4 {
                margin-bottom: 1rem !important;
              }
              
              /* Ensure images don't break */
              img {
                max-width: 100% !important;
                height: auto !important;
                page-break-inside: avoid;
              }
              
              /* Avoid page breaks in important sections */
              .border {
                page-break-inside: avoid;
              }
              
              table {
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
              }
              
              /* Footer styling */
              .text-gray-500 {
                color: #6b7280 !important;
              }
              
              .italic {
                font-style: italic !important;
              }
            }
          </style>
        `;
        
        // Write the complete HTML with enhanced styling
        printWindow.document.write('<html><head><title>Result Sheet - Graceland Royal Academy</title>');
        printWindow.document.write(printStyles);
        printWindow.document.write('</head><body>');
        printWindow.document.write(resultSheetContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          toast.success("Result sheet printed successfully with original design preserved");
        }, 500);
      }
    }
  };


  // Filter approved results
  const approvedResults = useMemo(() => {
    return safeCompiledResults.filter(
      (r) =>
        r.status === "Approved" &&
        r.term === selectedTerm &&
        r.academic_year === selectedYear &&
        (selectedClassId === "" || selectedClassId === "all" || r.class_id === Number(selectedClassId))
    );
  }, [safeCompiledResults, selectedTerm, selectedYear, selectedClassId]);

  // Get students with approved results (term mode)
  const studentsWithResults = useMemo(() => {
    return approvedResults
      .map((result) => {
        const student = students.find((s) => s.id === result.student_id);
        if (!student) return null;
        return {
          ...student,
          result,
        };
      })
      .filter((s) => s !== null)
      .filter((s) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          (s!.firstName && s!.firstName.toLowerCase().includes(query)) ||
          (s!.lastName && s!.lastName.toLowerCase().includes(query)) ||
          (s!.admissionNumber && s!.admissionNumber.toLowerCase().includes(query))
        );
      });
  }, [approvedResults, students, searchQuery]);

  // Get students with cumulative results (cumulative mode)
  const cumulativeStudentsWithResults = useMemo(() => {
    let crs = cumulativeResults;
    if (selectedClassId && selectedClassId !== "all") {
      crs = crs.filter((cr) => cr.class_id === Number(selectedClassId));
    }
    if (selectedYear) {
      crs = crs.filter((cr) => cr.academic_year === selectedYear);
    }
    return crs
      .map((cr) => {
        const student = students.find((s) => s.id === cr.student_id);
        if (!student) return null;
        return { ...student, result: cr };
      })
      .filter((s) => s !== null)
      .filter((s) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          (s!.firstName && s!.firstName.toLowerCase().includes(query)) ||
          (s!.lastName && s!.lastName.toLowerCase().includes(query)) ||
          (s!.admissionNumber && s!.admissionNumber.toLowerCase().includes(query))
        );
      });
  }, [cumulativeResults, students, searchQuery, selectedClassId, selectedYear]);

  const displayedStudents = viewMode === "cumulative" ? cumulativeStudentsWithResults : studentsWithResults;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#0A2540] mb-2">View Result Sheets</h1>
        <p className="text-gray-600">
          View and download approved result sheets for students
        </p>
      </div>

      {/* Filters */}
      <Card className="border-[#0A2540]/10">
        <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filter Results
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label className="text-[#0A2540] mb-2 block">Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#0A2540] mb-2 block">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#0A2540] mb-2 block">Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#0A2540] mb-2 block">Search Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name or Admission No"
                  className="h-12 pl-10 rounded-xl border-[#0A2540]/20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Results</p>
                <p className="text-[#0A2540] text-3xl font-bold">
                  {approvedResults.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Filtered Students</p>
                <p className="text-[#0A2540] text-3xl font-bold">
                  {displayedStudents.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{viewMode === "cumulative" ? "Session" : "Term & Year"}</p>
                <p className="text-[#0A2540] font-bold">{viewMode === "cumulative" ? selectedYear : selectedTerm}</p>
                <p className="text-gray-600 text-sm">{viewMode === "cumulative" ? "Cumulative" : selectedYear}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      {selectedTerm === "Third Term" && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-[#0A2540]/10 p-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3B82F6]" />
            <span className="text-sm font-medium text-[#0A2540]">View:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "term" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("term")}
              className={viewMode === "term" ? "bg-[#3B82F6]" : ""}
            >
              Term Results
            </Button>
            <Button
              variant={viewMode === "cumulative" ? "default" : "outline"}
              size="sm"
              disabled={loadingCumulative}
              onClick={() => {
                setViewMode("cumulative");
                const classId = selectedClassId && selectedClassId !== "all" ? Number(selectedClassId) : undefined;
                if (classId) loadCumulativeResultsFromAPI(classId, selectedYear);
              }}
              className={viewMode === "cumulative" ? "bg-[#3B82F6]" : ""}
            >
              {loadingCumulative ? 'Loading...' : 'Cumulative'}
            </Button>
          </div>
        </div>
      )}

      {/* Student List */}
      <Card className="border-[#0A2540]/10">
        <CardHeader className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-t-xl">
          <CardTitle>{viewMode === "cumulative" ? "Cumulative Results" : "Approved Result Sheets"}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {displayedStudents.length === 0 && loadingCumulative && viewMode === "cumulative" ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading cumulative results...</p>
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{viewMode === "cumulative" ? 'No cumulative results found' : 'No approved results found'}</p>
              <p className="text-gray-500 text-sm">
                {viewMode === "cumulative" ? 'Try changing the filters or compile cumulative results for the class' : 'Try changing the filters or wait for results to be approved'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedStudents.map((studentData) => {
            // Check if class should show position (not for early childhood classes)
            const shouldShowPosition = checkShouldShowPosition(studentData!.className);

            return (
              <div
                key={studentData!.id}
                className="p-4 border border-[#0A2540]/10 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">
                          {studentData!.firstName[0]}{studentData!.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {studentData!.firstName} {studentData!.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {studentData!.admissionNumber} • {studentData!.className || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Average</p>
                        <p className="text-[#0A2540] font-bold text-lg">
                          {studentData!.result.average_score}%
                        </p>
                      </div>

                      {shouldShowPosition && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Position</p>
                          <Badge className="bg-green-100 text-green-800 border-green-300 rounded-xl">
                            {studentData!.result.position || '-'}
                          </Badge>
                        </div>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                            onClick={() => setSelectedStudent(studentData!.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {viewMode === "cumulative" ? "View Cumulative" : "View Sheet"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {viewMode === "cumulative" ? "Cumulative Result" : "Result Sheet"} - {studentData!.firstName}{" "}
                              {studentData!.lastName}
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4">
                            {viewMode === "cumulative" ? (
                              <CumulativeResultSheet
                                ref={cumulativeResultSheetRef}
                                studentId={studentData!.id}
                                academicYear={selectedYear}
                              />
                            ) : (
                              <StudentResultSheet
                                ref={resultSheetRef}
                                studentId={studentData!.id}
                                term={selectedTerm}
                                academicYear={selectedYear}
                              />
                            )}

                            <div className="flex gap-3 justify-end border-t pt-4">
                              {viewMode === "cumulative" && (
                                <Button
                                  disabled={loadingCumulative}
                                  onClick={async () => {
                                    const cr = cumulativeResults.find(
                                      r => r.student_id === studentData!.id && r.academic_year === selectedYear
                                    );
                                    if (!cr) { toast.error('Cumulative result data not found'); return; }
                                    try {
                                      await generateCumulativePDF(studentData!, cr, schoolSettings, classes, selectedYear);
                                      toast.success('PDF downloaded');
                                    } catch { toast.error('Failed to generate PDF'); }
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  {loadingCumulative ? 'Loading...' : 'Download PDF'}
                                </Button>
                              )}
                              <Button
                                onClick={() => {
                                  const ref = viewMode === "cumulative" ? cumulativeResultSheetRef : resultSheetRef;
                                  if (ref.current) {
                                    const pw = window.open('', '_blank');
                                    if (pw) {
                                      pw.document.write(`<html><head><title>${viewMode === "cumulative" ? "Cumulative Result" : "Result Sheet"}</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{border-collapse:collapse;width:100%}td,th{padding:4px;font-size:10px}.bg-white{background:white!important}</style></head><body>${ref.current.innerHTML}</body></html>`);
                                      pw.document.close();
                                      setTimeout(() => { pw.print(); pw.close(); }, 500);
                                    }
                                  }
                                }}
                                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
              </div>
            </div>
            );
          })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}