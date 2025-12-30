import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function BroadsheetViewPage() {
  const { classes, students, scores, subjects, subjectAssignments } = useSchool();
  const [selectedClassId, setSelectedClassId] = useState("");

  const selectedClass = classes.find(c => c.id === Number(selectedClassId));
  const classStudents = students.filter(s => s.classId === Number(selectedClassId) && s.status === 'Active');
  const classAssignments = subjectAssignments.filter(sa => sa.classId === Number(selectedClassId));

  const handlePrint = () => {
    window.print();
    toast.success("Printing broadsheet...");
  };

  const handleExport = () => {
    toast.success("Broadsheet exported to Excel!");
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Broadsheet View</h1>
        <p className="text-[#6B7280]">View all students and their scores across all subjects</p>
      </div>

      {/* Controls */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="class">Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Choose class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handlePrint}
              disabled={!selectedClassId}
              variant="outline"
              className="rounded-lg"
            >
              <span className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleExport}
              disabled={!selectedClassId}
              variant="outline"
              className="rounded-lg"
            >
              <span className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Broadsheet Table */}
      {!selectedClassId ? (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-12 text-center">
            <Table className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
            <p className="text-[#6B7280]">Select a class to view broadsheet</p>
          </CardContent>
        </Card>
      ) : classStudents.length === 0 ? (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-12 text-center">
            <p className="text-[#6B7280]">No students in this class</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#1F2937]">
                {selectedClass?.name} - Broadsheet
              </h2>
              <p className="text-sm text-[#6B7280]">
                {classStudents.length} students • {classAssignments.length} subjects
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="p-3 text-left font-semibold text-[#1F2937] sticky left-0 bg-[#F9FAFB] z-10">
                      S/N
                    </th>
                    <th className="p-3 text-left font-semibold text-[#1F2937] sticky left-12 bg-[#F9FAFB] z-10 min-w-[200px]">
                      Student Name
                    </th>
                    <th className="p-3 text-left font-semibold text-[#1F2937]">
                      Admission No
                    </th>
                    {classAssignments.map((assignment) => (
                      <th key={assignment.id} className="p-3 text-center font-semibold text-[#1F2937] min-w-[100px]">
                        <div>{assignment.subjectName}</div>
                        <div className="text-xs font-normal text-[#6B7280]">Total</div>
                      </th>
                    ))}
                    <th className="p-3 text-center font-semibold text-[#1F2937] bg-[#F3F4F6]">
                      Total
                    </th>
                    <th className="p-3 text-center font-semibold text-[#1F2937] bg-[#F3F4F6]">
                      Average
                    </th>
                    <th className="p-3 text-center font-semibold text-[#1F2937] bg-[#F3F4F6]">
                      Position
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => {
                    const studentScores = scores.filter(s => s.studentId === student.id);
                    const totalScore = studentScores.reduce((sum, s) => sum + s.total, 0);
                    const average = studentScores.length > 0 ? (totalScore / studentScores.length).toFixed(2) : '0.00';

                    return (
                      <tr key={student.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-3 sticky left-0 bg-white">{index + 1}</td>
                        <td className="p-3 font-medium text-[#1F2937] sticky left-12 bg-white">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="p-3 text-[#6B7280]">{student.admissionNumber}</td>
                        {classAssignments.map((assignment) => {
                          const score = studentScores.find(s => s.subjectAssignmentId === assignment.id);
                          return (
                            <td key={assignment.id} className="p-3 text-center">
                              {score ? (
                                <div>
                                  <div className="font-semibold text-[#1F2937]">{score.total}</div>
                                  <div className="text-xs text-[#6B7280]">{score.grade}</div>
                                </div>
                              ) : (
                                <span className="text-[#9CA3AF]">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-semibold text-[#1F2937] bg-[#F9FAFB]">
                          {totalScore}
                        </td>
                        <td className="p-3 text-center font-semibold text-[#1F2937] bg-[#F9FAFB]">
                          {average}%
                        </td>
                        <td className="p-3 text-center font-semibold text-[#1F2937] bg-[#F9FAFB]">
                          {index + 1}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
