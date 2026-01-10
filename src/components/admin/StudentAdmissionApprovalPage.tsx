import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export function StudentAdmissionApprovalPage() {
  const { students, updateStudent, classes } = useSchool();
  const [viewStudent, setViewStudent] = useState<any>(null);

  // Filter pending admissions (using Inactive status as pending)
  const pendingAdmissions = students.filter(s => s.status === 'Inactive');

  const handleApprove = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      updateStudent(studentId, { ...student, status: 'Active' });
      toast.success("Student admission approved successfully!");
    }
  };

  const handleReject = (studentId: number) => {
    if (confirm("Are you sure you want to reject this admission? This cannot be undone.")) {
      // In production, you might want to move to rejected status instead of delete
      toast.error("Admission rejected");
    }
  };

  const getClassName = (classId?: number) => {
    if (classId == null) return 'Not Assigned';
    return classes.find(c => c.id === classId)?.name || 'Not Assigned';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Student Admission Approval</h1>
        <p className="text-[#6B7280]">Review and approve pending student admissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Pending Admissions</p>
                <p className="text-2xl font-semibold text-[#1F2937] mt-1">{pendingAdmissions.length}</p>
              </div>
              <span className="w-8 h-8 text-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Approved Today</p>
                <p className="text-2xl font-semibold text-[#1F2937] mt-1">0</p>
              </div>
              <span className="w-8 h-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Active</p>
                <p className="text-2xl font-semibold text-[#1F2937] mt-1">
                  {students.filter(s => s.status === 'Active').length}
                </p>
              </div>
              <span className="w-8 h-8 text-[#3B82F6]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Admissions List */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <h2 className="text-lg font-semibold text-[#1F2937]">Pending Admissions</h2>
        </CardHeader>
        <CardContent className="p-6">
          {pendingAdmissions.length === 0 ? (
            <div className="text-center py-12">
              <span className="w-16 h-16 text-[#10B981] mx-auto mb-4 opacity-50" />
              <p className="text-[#6B7280]">No pending admissions</p>
              <p className="text-sm text-[#9CA3AF] mt-1">All applications have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAdmissions.map((student) => (
                <Card key={student.id} className="rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white font-semibold">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1F2937]">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-[#6B7280] mb-2">{student.admissionNumber}</p>
                          
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-4 h-4 text-[#6B7280]" />
                              <span className="text-[#6B7280]">DOB:</span>
                              <span className="text-[#1F2937]">{student.dateOfBirth}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-4 h-4 text-[#6B7280]" />
                              <span className="text-[#6B7280]">Gender:</span>
                              <span className="text-[#1F2937]">{student.gender}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-4 h-4 text-[#6B7280]" />
                              <span className="text-[#6B7280]">Class:</span>
                              <span className="text-[#1F2937]">{getClassName(student.classId)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-[#F59E0B] border-[#F59E0B]">
                                Pending Review
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewStudent(student)}
                          className="rounded-lg"
                        >
                          <span className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(student.id)}
                          className="rounded-lg bg-[#10B981] hover:bg-[#059669]"
                        >
                          <span className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(student.id)}
                          className="rounded-lg"
                        >
                          <span className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Student Dialog */}
      {viewStudent && (
        <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Application Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white text-2xl font-semibold">
                  {viewStudent.firstName[0]}{viewStudent.lastName[0]}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1F2937]">
                    {viewStudent.firstName} {viewStudent.lastName}
                  </h3>
                  <p className="text-[#6B7280]">{viewStudent.admissionNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Date of Birth</p>
                  <p className="text-[#1F2937] font-medium">{viewStudent.dateOfBirth}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Gender</p>
                  <p className="text-[#1F2937] font-medium">{viewStudent.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Class Applied For</p>
                  <p className="text-[#1F2937] font-medium">{getClassName(viewStudent.classId)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Academic Year</p>
                  <p className="text-[#1F2937] font-medium">{viewStudent.academicYear}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    handleApprove(viewStudent.id);
                    setViewStudent(null);
                  }}
                  className="flex-1 rounded-lg bg-[#10B981] hover:bg-[#059669]"
                >
                  <span className="w-4 h-4 mr-2" />
                  Approve Admission
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleReject(viewStudent.id);
                    setViewStudent(null);
                  }}
                  className="flex-1 rounded-lg"
                >
                  <span className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

