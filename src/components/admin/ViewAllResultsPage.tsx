import { useState, useMemo, useEffect } from "react";
import { Eye, Download, FileSpreadsheet, Search, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { generatePDFFromData as generateStudentResultPdf } from "../../utils/pdfGenerator";

interface ViewAllResultsPageProps {
  onBack?: () => void;
  onViewResult?: (studentId: number, resultId: number) => void;
}

export function ViewAllResultsPage({ onBack: _onBack, onViewResult }: ViewAllResultsPageProps = {}) {
  const {
    compiledResults,
    students,
    classes,
    schoolSettings,
    teachers,
    scores,
    affectiveDomains,
    psychomotorDomains,
  } = useSchool();

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [downloadingIds, setDownloadingIds] = useState<Record<number, boolean>>({});

  const safeCompiledResults = Array.isArray(compiledResults) ? compiledResults : [];

  // Derive academic years from data
  const academicYears = useMemo(() => {
    return [...new Set(safeCompiledResults.map(r => r.academic_year).filter(Boolean))].sort() as string[];
  }, [safeCompiledResults]);

  // Filter results
  const filteredResults = useMemo(() => {
    return safeCompiledResults.filter((result) => {
      if (selectedClass !== "all" && result.class_id !== parseInt(selectedClass, 10)) return false;
      if (selectedStatus !== "all" && result.status !== selectedStatus) return false;
      if (selectedTerm !== "all" && result.term !== selectedTerm) return false;
      if (selectedYear !== "all" && result.academic_year !== selectedYear) return false;
      return true;
    });
  }, [safeCompiledResults, selectedClass, selectedStatus, selectedTerm, selectedYear]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedStatus, selectedTerm, selectedYear]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  // Calculate statistics
  const totalResults = filteredResults.length;
  const approvedResults = filteredResults.filter(r => r.status === 'Approved').length;
  const pendingResults = filteredResults.filter(r => r.status === 'Submitted').length;
  const draftResults = filteredResults.filter(r => r.status === 'Draft').length;

  const handleDownloadResult = async (result: any) => {
    const resultId = Number(result?.id);
    if (!resultId || downloadingIds[resultId]) return;

    const student = students.find((s: any) => Number(s.id) === Number(result.student_id));
    if (!student) {
      toast.error('Student not found');
      return;
    }

    setDownloadingIds(prev => ({ ...prev, [resultId]: true }));
    try {
      const context = { schoolSettings, teachers, classes, scores, affectiveDomains, psychomotorDomains };
      await generateStudentResultPdf(student, result, context, { downloadMethod: 'blob' });
      toast.success('PDF downloaded successfully!');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingIds(prev => {
        const next = { ...prev };
        delete next[resultId];
        return next;
      });
    }
  };

  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      toast.error('No results to export');
      return;
    }

    const headers = ['Student Name', 'Admission No', 'Class', 'Term', 'Academic Year', 'Average', 'Position', 'Status'];
    const rows = filteredResults.map(r => {
      const student = students.find(s => s.id === r.student_id);
      const cls = classes.find(c => c.id === r.class_id);
      const name = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Unknown';
      return [
        `"${name}"`,
        `"${student?.admissionNumber || ''}"`,
        `"${cls?.name || ''}"`,
        `"${r.term || ''}"`,
        `"${r.academic_year || ''}"`,
        r.average_score?.toFixed(2) ?? '',
        r.position != null ? `${r.position}/${r.total_students}` : '',
        r.status || '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredResults.length} results`);
  };

  const isLoading = safeCompiledResults.length === 0;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">View All Results</h1>
        <p className="text-[#6B7280]">Browse and manage all compiled student results</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Total Results</p>
              <FileSpreadsheet className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{totalResults}</p>
            <p className="text-xs text-[#6B7280]">Compiled results</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Approved</p>
              <Download className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{approvedResults}</p>
            <p className="text-xs text-[#10B981]">Ready for distribution</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Pending</p>
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{pendingResults}</p>
            <p className="text-xs text-[#F59E0B]">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Draft</p>
              <AlertCircle className="w-5 h-5 text-[#6B7280]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{draftResults}</p>
            <p className="text-xs text-[#6B7280]">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-[#1F2937] font-semibold">Filters</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[#1F2937] text-sm">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#E5E7EB]">
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[#1F2937] text-sm">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#E5E7EB]">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[#1F2937] text-sm">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#E5E7EB]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[#1F2937] text-sm">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#E5E7EB]">
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1F2937] font-semibold">Compiled Results ({filteredResults.length})</h3>
            <Button
              onClick={handleExportCSV}
              disabled={filteredResults.length === 0}
              className="h-10 px-4 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg shadow-clinical"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
              <span className="ml-3 text-[#6B7280]">Loading results...</span>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F9FAFB]">
                      <TableHead className="text-[#1F2937]">Student</TableHead>
                      <TableHead className="text-[#1F2937]">Admission No.</TableHead>
                      <TableHead className="text-[#1F2937]">Class</TableHead>
                      <TableHead className="text-[#1F2937]">Term</TableHead>
                      <TableHead className="text-[#1F2937]">Year</TableHead>
                      <TableHead className="text-[#1F2937]">Average</TableHead>
                      <TableHead className="text-[#1F2937]">Position</TableHead>
                      <TableHead className="text-[#1F2937]">Status</TableHead>
                      <TableHead className="text-[#1F2937]">Compiled Date</TableHead>
                      <TableHead className="text-[#1F2937]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((result) => {
                      const student = students.find(s => s.id === result.student_id);
                      const cls = classes.find(c => c.id === result.class_id);
                      const isDownloading = downloadingIds[Number(result.id)];

                      return (
                        <TableRow key={result.id} className="border-b border-[#E5E7EB]">
                          <TableCell className="text-[#1F2937] font-medium">
                            {student
                              ? `${student.firstName || ''} ${student.otherName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Unknown'
                              : 'Unknown'}
                          </TableCell>
                          <TableCell className="text-[#1F2937]">{student?.admissionNumber}</TableCell>
                          <TableCell className="text-[#1F2937]">{cls?.name}</TableCell>
                          <TableCell className="text-[#1F2937]">{result.term}</TableCell>
                          <TableCell className="text-[#1F2937]">{result.academic_year}</TableCell>
                          <TableCell className="text-[#1F2937] font-medium">
                            {result.average_score != null ? `${result.average_score.toFixed(2)}%` : '-'}
                          </TableCell>
                          <TableCell className="text-[#1F2937]">
                            {result.position != null ? `${result.position}/${result.total_students}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${
                                result.status === "Approved"
                                  ? "bg-[#10B981] text-white"
                                  : result.status === "Submitted"
                                  ? "bg-[#F59E0B] text-white"
                                  : result.status === "Rejected"
                                  ? "bg-[#EF4444] text-white"
                                  : "bg-[#6B7280] text-white"
                              } border-0`}
                            >
                              {result.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#1F2937]">{result.compiled_date || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => onViewResult ? onViewResult(result.student_id, result.id) : toast.success(`View result ${result.id}`)}
                                className="h-8 px-3 bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg"
                                aria-label={`View result for ${student?.firstName || 'student'}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                onClick={() => handleDownloadResult(result)}
                                disabled={isDownloading}
                                className="h-8 px-3 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg"
                                aria-label={`Download result PDF for ${student?.firstName || 'student'}`}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                {isDownloading ? '...' : 'PDF'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredResults.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-[#6B7280]">
                          No results found matching the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {paginatedResults.length === 0 ? (
                  <div className="text-center py-8 text-[#6B7280]">
                    No results found matching the selected filters
                  </div>
                ) : (
                  paginatedResults.map((result) => {
                    const student = students.find(s => s.id === result.student_id);
                    const cls = classes.find(c => c.id === result.class_id);
                    const isDownloading = downloadingIds[Number(result.id)];

                    return (
                      <div key={result.id} className="border border-gray-100 rounded-xl bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#1F2937] text-sm truncate">
                              {student
                                ? `${student.firstName || ''} ${student.otherName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Unknown'
                                : 'Unknown'}
                            </p>
                            <p className="text-xs text-[#6B7280]">{cls?.name} &bull; {result.term}</p>
                          </div>
                          <Badge className={`${
                            result.status === "Approved"
                              ? "bg-[#10B981] text-white"
                              : result.status === "Submitted"
                              ? "bg-[#F59E0B] text-white"
                              : result.status === "Rejected"
                              ? "bg-[#EF4444] text-white"
                              : "bg-[#6B7280] text-white"
                          } border-0 text-xs shrink-0 ml-2`}>
                            {result.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div>
                            <span className="text-[#6B7280]">Average:</span>
                            <span className="ml-1 font-medium text-[#1F2937]">
                              {result.average_score != null ? `${result.average_score.toFixed(2)}%` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#6B7280]">Position:</span>
                            <span className="ml-1 font-medium text-[#1F2937]">
                              {result.position != null ? `${result.position}/${result.total_students}` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#6B7280]">Year:</span>
                            <span className="ml-1 font-medium text-[#1F2937]">{result.academic_year}</span>
                          </div>
                          <div>
                            <span className="text-[#6B7280]">Adm No:</span>
                            <span className="ml-1 font-medium text-[#1F2937]">{student?.admissionNumber}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <Button
                            onClick={() => onViewResult ? onViewResult(result.student_id, result.id) : toast.success(`View result ${result.id}`)}
                            className="flex-1 h-8 px-3 bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleDownloadResult(result)}
                            disabled={isDownloading}
                            className="flex-1 h-8 px-3 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            {isDownloading ? '...' : 'PDF'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Pagination */}
          {filteredResults.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-[#E5E7EB]">
              <div className="text-sm text-[#6B7280]">
                Showing {Math.min(filteredResults.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredResults.length, currentPage * pageSize)} of {filteredResults.length}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#6B7280] mr-1">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-8 rounded border border-[#E5E7EB] text-sm px-2"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-[#1F2937] min-w-[90px] text-center">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
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
    </div>
  );
}
