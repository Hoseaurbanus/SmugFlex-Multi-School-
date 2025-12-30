import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function ViewAllResultsPage() {
  const { compiledResults, students, classes } = useSchool();
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");

  // Filter results
  const filteredResults = compiledResults.filter((result) => {
    if (selectedClass !== "all" && result.class_id !== parseInt(selectedClass)) return false;
    if (selectedStatus !== "all" && result.status !== selectedStatus) return false;
    if (selectedTerm !== "all" && result.term !== selectedTerm) return false;
    return true;
  });

  // Calculate statistics
  const totalResults = (filteredResults || []).length;
  const approvedResults = (filteredResults || []).filter(r => r.status === 'Approved').length;
  const pendingResults = (filteredResults || []).filter(r => r.status === 'Submitted').length;
  const draftResults = (filteredResults || []).filter(r => r.status === 'Draft').length;

  const handleViewResult = (resultId: number) => {
    toast.success(`Opening result details for ID: ${resultId}`);
  };

  const handleDownloadResult = (resultId: number) => {
    toast.success(`Downloading result ID: ${resultId}`);
  };

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
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{totalResults}</p>
            <p className="text-xs text-[#6B7280]">Compiled results</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Approved</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{approvedResults}</p>
            <p className="text-xs text-[#10B981]">Ready for distribution</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Pending</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{pendingResults}</p>
            <p className="text-xs text-[#F59E0B]">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Draft</p>
              <span className="w-5 h-5 text-[#6B7280]" />
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
            <span className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-[#1F2937] font-semibold">Filters</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4">
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
            <Button className="h-10 px-4 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg shadow-clinical">
              <span className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB]">
                  <TableHead className="text-[#1F2937]">Student</TableHead>
                  <TableHead className="text-[#1F2937]">Admission No.</TableHead>
                  <TableHead className="text-[#1F2937]">Class</TableHead>
                  <TableHead className="text-[#1F2937]">Term</TableHead>
                  <TableHead className="text-[#1F2937]">Average</TableHead>
                  <TableHead className="text-[#1F2937]">Position</TableHead>
                  <TableHead className="text-[#1F2937]">Status</TableHead>
                  <TableHead className="text-[#1F2937]">Compiled Date</TableHead>
                  <TableHead className="text-[#1F2937]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => {
                  const student = students.find(s => s.id === result.student_id);
                  const cls = classes.find(c => c.id === result.class_id);

                  return (
                    <TableRow key={result.id} className="border-b border-[#E5E7EB]">
                      <TableCell className="text-[#1F2937] font-medium">
                        {student ? `${student.firstName} ${student.lastName}` : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-[#1F2937]">{student?.admissionNumber}</TableCell>
                      <TableCell className="text-[#1F2937]">{cls?.name}</TableCell>
                      <TableCell className="text-[#1F2937]">{result.term}</TableCell>
                      <TableCell className="text-[#1F2937] font-medium">{result.average_score.toFixed(2)}%</TableCell>
                      <TableCell className="text-[#1F2937]">
                        {result.position}/{result.total_students}
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
                      <TableCell className="text-[#1F2937]">{result.compiled_date}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleViewResult(result.id)}
                            className="h-8 px-3 bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg"
                          >
                            <span className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDownloadResult(result.id)}
                            className="h-8 px-3 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg"
                          >
                            <span className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-[#6B7280]">
                      No results found matching the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
