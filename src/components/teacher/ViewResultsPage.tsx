import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { StudentResultSheet } from "../StudentResultSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

export function ViewResultsPage() {
  const { 
    currentUser, 
    teachers, 
    getTeacherAssignments, 
    compiledResults, 
    students,
    classes,
    subjects,
    scores 
  } = useSchool();

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingResult, setViewingResult] = useState<any>(null);

  // Get current teacher data
  const currentTeacher = currentUser ? teachers.find(t => t.id === String(currentUser.linked_id)) : null;
  
  // Only include classes where teacher is assigned as class_teacher
  const teacherClasses = classes.filter((c: any) => Number(c.classTeacherId) === Number(currentTeacher?.id));
  
  // Filter results for teacher's classes
  const teacherResults = compiledResults.filter(result => {
    const student = students.find(s => s.id === result.student_id);
    return student && teacherClasses.some(c => c.id === student.class_id);
  });

  // Apply filters
  const filteredResults = teacherResults.filter(result => {
    const student = students.find(s => s.id === result.student_id);
    if (!student) return false;

    // Class filter
    if (selectedClass !== "all" && student.class_id !== parseInt(selectedClass)) return false;

    // Term filter
    if (selectedTerm !== "all" && result.term !== selectedTerm) return false;

    // Status filter
    if (selectedStatus !== "all" && result.status !== selectedStatus) return false;

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const studentName = student.firstName && student.lastName ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
      const admissionNo = student.admissionNumber ? student.admissionNumber.toLowerCase() : '';
      if (!studentName.includes(searchLower) && !admissionNo.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Sort by date (newest first)
  const sortedResults = [...filteredResults].sort((a, b) => 
    new Date(b.compiled_date).getTime() - new Date(a.compiled_date).getTime()
  );

  const handleViewResult = (result: any) => {
    const student = students.find(s => s.id === result.student_id);
    if (!student) return;

    // Get student scores for this result
    const studentScores = scores.filter(
      s => s.student_id === result.student_id && 
           s.status === 'Submitted'
    );

    // Prepare result data for viewing
    const resultData = {
      ...result,
      student,
      scores: studentScores,
    };

    setViewingResult(resultData);
  };

  const handlePrintResult = (result: any) => {
    handleViewResult(result);
    // The print dialog will be triggered from the StudentResultSheet component
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-[#10B981] text-white border-0 rounded-full">Approved</Badge>;
      case 'Submitted':
        return <Badge className="bg-[#F59E0B] text-white border-0 rounded-full">Pending Approval</Badge>;
      case 'Draft':
        return <Badge className="bg-[#6B7280] text-white border-0 rounded-full">Draft</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#EF4444] text-white border-0 rounded-full">Rejected</Badge>;
      default:
        return <Badge className="bg-[#6B7280] text-white border-0 rounded-full">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#1F2937] mb-2">View Results</h1>
        <p className="text-[#6B7280]">
          View and download compiled results for your classes
        </p>
      </div>

      {/* Filters */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-[#1F2937]">Filters</h3>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <Input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-lg border-[#E5E7EB] focus:border-[#3B82F6] focus:ring-[#3B82F6]"
              />
            </div>

            {/* Class Filter */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {teacherClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Term Filter */}
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="First Term">First Term</SelectItem>
                <SelectItem value="Second Term">Second Term</SelectItem>
                <SelectItem value="Third Term">Third Term</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280] text-sm">Total Results</p>
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-[#1F2937] font-semibold">{teacherResults.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280] text-sm">Approved</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-[#1F2937] font-semibold">
              {(teacherResults || []).filter(r => r.status === 'Approved').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280] text-sm">Pending</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-[#1F2937] font-semibold">
              {(teacherResults || []).filter(r => r.status === 'Submitted').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280] text-sm">Your Classes</p>
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-[#1F2937] font-semibold">{teacherClasses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1F2937]">Compiled Results</h3>
            <Badge className="bg-[#3B82F6] text-white border-0">
              {sortedResults.length} {sortedResults.length === 1 ? 'Result' : 'Results'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedResults.length === 0 ? (
            <div className="text-center py-12">
              <span className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
              <h3 className="text-[#1F2937] mb-2">No Results Found</h3>
              <p className="text-[#6B7280] mb-4">
                {teacherResults.length === 0 
                  ? "No results have been compiled yet."
                  : "No results match your current filters."
                }
              </p>
              {teacherResults.length > 0 && (
                <Button
                  onClick={() => {
                    setSelectedClass("all");
                    setSelectedTerm("all");
                    setSelectedStatus("all");
                    setSearchQuery("");
                  }}
                  className="bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {sortedResults.map((result) => {
                const student = students.find(s => s.id === result.student_id);
                if (!student) return null;

                return (
                  <div
                    key={result.id}
                    className="p-5 hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-[#1F2937] font-medium">
                            {student.firstName} {student.lastName}
                          </h4>
                          {getStatusBadge(result.status)}
                        </div>
                        <div className="grid md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-[#6B7280]">
                          <p>
                            <span className="font-medium">Admission No:</span> {student.admissionNumber}
                          </p>
                          <p>
                            <span className="font-medium">Class:</span> {student.className}
                          </p>
                          <p>
                            <span className="font-medium">Term:</span> {result.term}
                          </p>
                          <p>
                            <span className="font-medium">Academic Year:</span> {result.academic_year}
                          </p>
                          <p>
                            <span className="font-medium">Average:</span>{" "}
                            <span className="text-[#10B981] font-semibold">
                              {result.average_score.toFixed(2)}%
                            </span>
                          </p>
                          <p>
                            <span className="font-medium">Position:</span>{" "}
                            <span className="text-[#3B82F6] font-semibold">
                              {result.position}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium">Compiled:</span>{" "}
                            {new Date(result.compiled_date).toLocaleDateString()}
                          </p>
                          {result.approved_date && (
                            <p>
                              <span className="font-medium">Approved:</span>{" "}
                              {new Date(result.approved_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleViewResult(result)}
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
                        >
                          <span className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {result.status === 'Approved' && (
                          <Button
                            onClick={() => handlePrintResult(result)}
                            className="bg-gray-400 text-white rounded-xl cursor-not-allowed opacity-50"
                            disabled
                          >
                            <span className="w-4 h-4 mr-2" />
                            Print (PDF Only)
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result View Dialog */}
      {viewingResult && (
        <Dialog open={!!viewingResult} onOpenChange={() => setViewingResult(null)}>
          <DialogHeader className="sr-only">
            <DialogTitle>Result Sheet</DialogTitle>
          </DialogHeader>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1F2937]">
                  Result Sheet - {viewingResult.student.firstName} {viewingResult.student.lastName}
                </h2>
                <Button
                  onClick={() => window.print()}
                  className="bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg"
                >
                  <span className="w-4 h-4 mr-2" />
                  Print PDF
                </Button>
              </div>
              <StudentResultSheet 
                studentId={viewingResult.studentId} 
                term={viewingResult.term} 
                academicYear={viewingResult.academicYear} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
