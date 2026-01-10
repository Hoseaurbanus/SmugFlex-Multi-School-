import { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { StudentResultSheet } from '../StudentResultSheet';
import { toast } from 'sonner';

export function ApproveResultsPage() {
  const {
    currentUser,
    students,
    teachers,
    classes,
    subjectAssignments,
    compiledResults,
    affectiveDomains,
    psychomotorDomains,
    getPendingApprovals,
    approveCompiledResult,
    getCompiledResultsByYearAndTerm,
    currentTerm,
    currentAcademicYear,
  } = useSchool();

  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPDFSheet, setShowPDFSheet] = useState(false);
  const [selectedClassLevel, setSelectedClassLevel] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

  // Load compiled results for current term and academic year
  useEffect(() => {
    if (currentTerm && currentAcademicYear) {
      getCompiledResultsByYearAndTerm(currentAcademicYear, currentTerm);
    }
  }, [currentTerm, currentAcademicYear]);

  // Memoize filtered results to prevent excessive re-calculations
  const pendingResults = useMemo(() => getPendingApprovals(), [compiledResults, currentTerm, currentAcademicYear]);
  const approvedResults = useMemo(() => compiledResults.filter((r) => 
    r.status === 'Approved' && 
    r.term === currentTerm && 
    r.academic_year === currentAcademicYear
  ), [compiledResults, currentTerm, currentAcademicYear]);
  const rejectedResults = useMemo(() => compiledResults.filter((r) => 
    r.status === 'Rejected' && 
    r.term === currentTerm && 
    r.academic_year === currentAcademicYear
  ), [compiledResults, currentTerm, currentAcademicYear]);

  const [filterStatus, setFilterStatus] = useState<'Submitted' | 'Approved' | 'Rejected'>('Submitted');

  // Get unique school levels from real data (Primary, Secondary)
  const schoolLevels = Array.from(new Set(classes.map(c => c.level))).filter(Boolean).sort();

  // Filter classes by selected school level
  const filteredClasses = selectedClassLevel === 'all' 
    ? classes 
    : classes.filter(c => c.level === selectedClassLevel);

  // Apply all filters including school level and specific class
  const filteredResults = compiledResults.filter((r) => {
    if (r.status !== filterStatus) return false;
    
    // Filter by current term and academic year
    if (r.term !== currentTerm || r.academic_year !== currentAcademicYear) return false;
    
    if (selectedClass !== 'all' && r.class_id !== parseInt(selectedClass)) return false;
    
    if (selectedClassLevel !== 'all' && selectedClass === 'all') {
      const classObj = classes.find(c => c.id === r.class_id);
      if (classObj && classObj.level !== selectedClassLevel) return false;
    }
    
    return true;
  });

  // Clear selection when changing filters
  const handleFilterStatusChange = (status: 'Submitted' | 'Approved' | 'Rejected') => {
    setFilterStatus(status);
    setSelectedResults(new Set());
  };

  const handleClassLevelChange = (value: string) => {
    setSelectedClassLevel(value);
    setSelectedClass('all');
    setSelectedResults(new Set());
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    setSelectedResults(new Set());
  };

  const handleApprove = (resultId: number) => {
    if (!currentUser) return;
    approveCompiledResult(resultId);
    toast.success('Result approved successfully!');
    
    // No need to refresh - the context will update automatically
  };

  const handleReject = () => {
    // Reject functionality not available - remove reject buttons
    toast.error('Reject functionality not implemented');
  };

  const handlePrintPDF = (resultId: number) => {
    const result = compiledResults.find((r) => r.id === resultId);
    if (!result) return;

    if (result.status !== 'Approved') {
      toast.error('Only approved results can be printed');
      return;
    }

    setSelectedResult(resultId);
    setShowPDFSheet(true);
  };

  const handleDownloadAll = async () => {
    const approvedCount = approvedResults.length;
    if (approvedCount === 0) {
      toast.error('No approved results to download');
      return;
    }

    toast.info(`Preparing ${approvedCount} report cards for download...`);
    
    // Download each result individually
    for (let i = 0; i < approvedResults.length; i++) {
      const result = approvedResults[i];
      const student = students.find(s => s.id === result.student_id);
      
      toast.info(`Downloading ${i + 1}/${approvedCount}: ${student?.firstName} ${student?.lastName}`);
      
      // Open PDF sheet for each result with a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setSelectedResult(result.id);
      setShowPDFSheet(true);
      
      // Close after download
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowPDFSheet(false);
    }
    
    toast.success(`All ${approvedCount} report cards ready!`);
  };

  const handleCheckboxChange = (resultId: number, checked: boolean) => {
    const newSelected = new Set(selectedResults);
    if (checked) {
      newSelected.add(resultId);
    } else {
      newSelected.delete(resultId);
    }
    setSelectedResults(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allResultIds = new Set(filteredResults.map(r => r.id));
      setSelectedResults(allResultIds);
    } else {
      setSelectedResults(new Set());
    }
  };

  const handleDownloadSelected = async () => {
    const selectedCount = selectedResults.size;
    if (selectedCount === 0) {
      toast.error('Please select at least one result to download');
      return;
    }

    toast.info(`Preparing ${selectedCount} selected report cards for download...`);
    
    const selectedResultsArray = Array.from(selectedResults);
    
    // Download each selected result
    for (let i = 0; i < selectedResultsArray.length; i++) {
      const resultId = selectedResultsArray[i];
      const result = compiledResults.find((r) => r.id === resultId);
      const student = students.find(s => s.id === result?.student_id);
      
      toast.info(`Downloading ${i + 1}/${selectedCount}: ${student?.firstName} ${student?.lastName}`);
      
      // Open PDF sheet for each result with a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setSelectedResult(resultId);
      setShowPDFSheet(true);
      
      // Close after download
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowPDFSheet(false);
    }
    
    toast.success(`All ${selectedCount} selected report cards ready!`);
  };

  const selectedResultData = selectedResult ? compiledResults.find((r) => r.id === selectedResult) : null;

  // Show PDF sheet if requested
  if (showPDFSheet && selectedResultData) {
    return (
      <div>
        <StudentResultSheet 
          studentId={selectedResultData.student_id} 
          term={selectedResultData.term} 
          academicYear={selectedResultData.academic_year} 
        />
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={() => setShowPDFSheet(false)}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Approve Results</h1>
        <p className="text-gray-600">Review and approve compiled results from class teachers</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Pending Approval</p>
              <span className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <p className="text-2xl text-gray-900">{pendingResults.length}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Approved</p>
              <span className="w-6 h-6 text-[#10B981]" />
            </div>
            <p className="text-2xl text-gray-900">{approvedResults.length}</p>
            <p className="text-xs text-gray-500 mt-1">Ready for printing</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Rejected</p>
              <span className="w-6 h-6 text-[#EF4444]" />
            </div>
            <p className="text-2xl text-gray-900">{rejectedResults.length}</p>
            <p className="text-xs text-gray-500 mt-1">Sent back</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Total Results</p>
              <span className="w-6 h-6 text-[#2563EB]" />
            </div>
            <p className="text-2xl text-gray-900">{compiledResults.length}</p>
            <p className="text-xs text-gray-500 mt-1">All submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Class Level and Class Filter */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-lg text-gray-900">Filter by Class</h3>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid md:grid-cols-2 gap-4">
            {/* School Level Filter */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block">School Level</label>
              <Select value={selectedClassLevel} onValueChange={handleClassLevelChange}>
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue placeholder="Select school level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {schoolLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Class Filter */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Specific Class</label>
              <Select 
                value={selectedClass} 
                onValueChange={handleClassChange}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {filteredClasses.map(cls => (
                    <SelectItem key={cls.id} value={String(cls.id)}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex gap-2">
            <Button
              onClick={() => handleFilterStatusChange('Submitted')}
              variant={filterStatus === 'Submitted' ? 'default' : 'outline'}
              className={`rounded-xl ${
                filterStatus === 'Submitted'
                  ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Pending ({pendingResults.length})
            </Button>
            <Button
              onClick={() => handleFilterStatusChange('Approved')}
              variant={filterStatus === 'Approved' ? 'default' : 'outline'}
              className={`rounded-xl ${
                filterStatus === 'Approved'
                  ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Approved ({approvedResults.length})
            </Button>
            <Button
              onClick={() => handleFilterStatusChange('Rejected')}
              variant={filterStatus === 'Rejected' ? 'default' : 'outline'}
              className={`rounded-xl ${
                filterStatus === 'Rejected'
                  ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Rejected ({rejectedResults.length})
            </Button>
          </div>

          {filterStatus === 'Approved' && approvedResults.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedResults.size === filteredResults.length && filteredResults.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm text-gray-700 cursor-pointer">
                  Select All ({selectedResults.size}/{filteredResults.length})
                </label>
              </div>
              <div className="flex gap-2">
                {selectedResults.size > 0 && (
                  <Button
                    onClick={handleDownloadSelected}
                    className="bg-[#059669] hover:bg-[#047857] text-white rounded-xl shadow-sm"
                  >
                    <span className="w-4 h-4 mr-2" />
                    Download Selected ({selectedResults.size})
                  </Button>
                )}
                <Button
                  onClick={handleDownloadAll}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-sm"
                >
                  <span className="w-4 h-4 mr-2" />
                  Download All ({approvedResults.length})
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-lg text-gray-900">Results - {filterStatus}</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  {filterStatus === 'Approved' && (
                    <TableHead className="text-white w-12">
                      <Checkbox
                        checked={selectedResults.size === filteredResults.length && filteredResults.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-white">Student Name</TableHead>
                  <TableHead className="text-white">Admission No.</TableHead>
                  <TableHead className="text-white">Class</TableHead>
                  <TableHead className="text-white text-center">Average</TableHead>
                  <TableHead className="text-white text-center">Position</TableHead>
                  <TableHead className="text-white text-center">Compiled By</TableHead>
                  <TableHead className="text-white text-center">Date</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={filterStatus === 'Approved' ? 9 : 8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <span className="w-12 h-12 text-gray-400" />
                        <p className="text-gray-900">No {filterStatus.toLowerCase()} results</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result) => {
                    const student = students.find((s) => s.id === result.student_id);
                    const className = classes.find((c) => c.id === result.class_id);
                    const compiledBy = teachers.find((t) => t.id === result.compiled_by);

                    return (
                      <TableRow key={result.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                        {filterStatus === 'Approved' && (
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedResults.has(result.id)}
                              onCheckedChange={(checked) => handleCheckboxChange(result.id, checked as boolean)}
                              aria-label={`Select ${student?.firstName} ${student?.lastName}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-gray-900">
                          {student?.firstName} {student?.lastName}
                        </TableCell>
                        <TableCell className="text-gray-600">{student?.admissionNumber}</TableCell>
                        <TableCell className="text-gray-900">
                          <Badge className="bg-[#3B82F6] text-white border-0">{className?.name}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-gray-900">{result.average_score.toFixed(1)}%</TableCell>
                        <TableCell className="text-center text-gray-900">
                          {result.position}/{result.total_students}
                        </TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">
                          {compiledBy?.firstName} {compiledBy?.lastName}
                        </TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">
                          {new Date(result.compiled_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => {
                                setSelectedResult(result.id);
                                setIsPreviewOpen(true);
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-[#2563EB] hover:bg-blue-50"
                            >
                              <span className="w-4 h-4" />
                            </Button>

                            {result.status === 'Submitted' && (
                              <>
                                <Button
                                  onClick={() => handleApprove(result.id)}
                                  size="sm"
                                  className="h-8 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs px-3"
                                >
                                  <span className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedResult(result.id);
                                    setIsRejectDialogOpen(true);
                                  }}
                                  size="sm"
                                  className="h-8 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-xs px-3"
                                >
                                  <span className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {result.status === 'Approved' && (
                              <Button
                                onClick={() => handlePrintPDF(result.id)}
                                size="sm"
                                className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs px-3"
                              >
                                <span className="w-3 h-3 mr-1" />
                                Print PDF
                              </Button>
                            )}

                            {result.status === 'Rejected' && (
                              <Badge className="bg-gray-400 text-white border-0 text-xs">Sent Back</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl rounded-xl bg-white border border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Result Preview</DialogTitle>
            <DialogDescription>Preview the compiled result details before approving or rejecting.</DialogDescription>
          </DialogHeader>

          {selectedResultData && (
            <div className="space-y-6 py-4">
              {(() => {
                const student = students.find((s) => s.id === selectedResultData.student_id);
                const className = classes.find((c) => c.id === selectedResultData.class_id);
                const compiledBy = teachers.find((t) => t.id === selectedResultData.compiled_by);

                return (
                  <>
                    <div className="text-center border-b border-gray-200 pb-4">
                      <h2 className="text-xl text-gray-900">Graceland Royal Academy Gombe</h2>
                      <p className="text-sm text-gray-600">Wisdom & Illumination</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedResultData.term} - {selectedResultData.academic_year}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Student Name:</p>
                        <p className="text-lg text-gray-900">
                          {student?.firstName} {student?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Admission Number:</p>
                        <p className="text-lg text-gray-900">{student?.admissionNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Class:</p>
                        <p className="text-lg text-gray-900">{className?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Position:</p>
                        <p className="text-lg text-gray-900">
                          {selectedResultData.position} out of {selectedResultData.total_students}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-md text-gray-900 mb-2">Subject Scores</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead className="text-gray-900">Subject</TableHead>
                              <TableHead className="text-gray-900 text-center">CA1 (20)</TableHead>
                              <TableHead className="text-gray-900 text-center">CA2 (20)</TableHead>
                              <TableHead className="text-gray-900 text-center">Exam (60)</TableHead>
                              <TableHead className="text-gray-900 text-center">Total (100)</TableHead>
                              <TableHead className="text-gray-900 text-center">Grade</TableHead>
                              <TableHead className="text-gray-900">Remark</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedResultData.scores.map((score) => {
                              const assignment = subjectAssignments.find((a) => a.id === score.subject_assignment_id);
                              return (
                                <TableRow key={score.id} className="border-b border-gray-100">
                                  <TableCell className="text-gray-900">{assignment?.subject_name}</TableCell>
                                  <TableCell className="text-center text-gray-900">{score.ca1}</TableCell>
                                  <TableCell className="text-center text-gray-900">{score.ca2}</TableCell>
                                  <TableCell className="text-center text-gray-900">{score.exam}</TableCell>
                                  <TableCell className="text-center text-gray-900">{score.total}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="bg-[#10B981] text-white border-0">{score.grade}</Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-sm">{score.remark}</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-gray-100">
                              <TableCell colSpan={4} className="text-gray-900">
                                <strong>Total/Average</strong>
                              </TableCell>
                              <TableCell className="text-center text-gray-900">
                                <strong>{selectedResultData.average_score.toFixed(1)}%</strong>
                              </TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-md text-gray-900 mb-2">Class Teacher's Comment</h4>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">{selectedResultData.class_teacher_comment}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Compiled by: {compiledBy?.firstName} {compiledBy?.lastName}</p>
                      <p className="text-sm text-gray-600">Date: {new Date(selectedResultData.compiled_date).toLocaleDateString()}</p>
                      {selectedResultData.status === 'Approved' && (
                        <p className="text-sm text-green-600 mt-2">✓ Approved by Admin</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsPreviewOpen(false)}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700"
            >
              Close
            </Button>
            {selectedResultData?.status === 'Approved' && (
              <Button
                onClick={() => selectedResult && handlePrintPDF(selectedResult)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl"
              >
                <span className="w-4 h-4 mr-2" />
                Print PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md rounded-xl bg-white border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Reject Result</DialogTitle>
            <DialogDescription>Reject this result with an optional reason. This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-50 border-red-200 rounded-xl">
              <span className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-gray-900">
                Please provide a reason for rejection. This will be sent to the class teacher.
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Rejection Reason *</label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="rounded-xl border-gray-300 text-gray-900"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason('');
                setSelectedResult(null);
              }}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Reject Result
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
