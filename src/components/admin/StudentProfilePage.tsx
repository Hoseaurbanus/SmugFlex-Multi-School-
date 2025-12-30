import { Book, BookOpen } from 'lucide-react';
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useSchool } from "../../contexts/SchoolContext";

export function StudentProfilePage() {
  const { students, classes, parents, scores, payments, compiledResults } = useSchool();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const studentClass = selectedStudent ? classes.find(c => c.id === selectedStudent.classId) : null;
  const studentParent = selectedStudent ? parents.find(p => p.studentIds.includes(selectedStudent.id)) : null;
  const studentScores = selectedStudent ? scores.filter(s => s.studentId === selectedStudent.id) : [];
  const studentPayments = selectedStudent ? payments.filter(p => p.studentId === selectedStudent.id) : [];
  const studentResult = selectedStudent ? compiledResults.find(r => r.studentId === selectedStudent.id) : null;

  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Student Profile</h1>
        <p className="text-[#6B7280]">View detailed student information and academic records</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h2 className="font-semibold text-[#1F2937]">All Students</h2>
          </CardHeader>
          <CardContent className="p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedStudentId === student.id
                      ? 'bg-[#3B82F6] text-white'
                      : 'hover:bg-[#F3F4F6] text-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      selectedStudentId === student.id
                        ? 'bg-white text-[#3B82F6]'
                        : 'bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white'
                    }`}>
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${selectedStudentId === student.id ? 'text-white' : 'text-[#1F2937]'}`}>
                        {student.firstName} {student.lastName}
                      </p>
                      <p className={`text-sm truncate ${selectedStudentId === student.id ? 'text-white/80' : 'text-[#6B7280]'}`}>
                        {student.admissionNumber}
                      </p>
                    </div>
                    <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                      {student.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Details */}
        <div className="lg:col-span-2">
          {!selectedStudent ? (
            <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
              <CardContent className="p-12 text-center">
                <span className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
                <p className="text-[#6B7280]">Select a student to view profile</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header Card */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white text-2xl font-semibold">
                        {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-[#1F2937]">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </h2>
                        <p className="text-[#6B7280]">{selectedStudent.admissionNumber}</p>
                        <Badge variant={selectedStudent.status === 'Active' ? 'default' : 'secondary'} className="mt-2">
                          {selectedStudent.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        <span className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="rounded-lg">
                        <span className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                      <p className="text-2xl font-semibold text-[#1F2937]">{studentScores.length}</p>
                      <p className="text-sm text-[#6B7280]">Subjects</p>
                    </div>
                    <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                      <p className="text-2xl font-semibold text-[#1F2937]">
                        {studentResult ? `${studentResult.average}%` : 'N/A'}
                      </p>
                      <p className="text-sm text-[#6B7280]">Average</p>
                    </div>
                    <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                      <p className="text-2xl font-semibold text-[#1F2937]">
                        {studentResult?.position || 'N/A'}
                      </p>
                      <p className="text-sm text-[#6B7280]">Position</p>
                    </div>
                    <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                      <p className="text-2xl font-semibold text-[#1F2937]">₦{totalPaid.toLocaleString()}</p>
                      <p className="text-sm text-[#6B7280]">Paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Information Tabs */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <Tabs defaultValue="personal" className="w-full">
                  <CardHeader className="border-b border-[#E5E7EB] p-0">
                    <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                      <TabsTrigger value="personal" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                        Personal Info
                      </TabsTrigger>
                      <TabsTrigger value="academic" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                        Academic
                      </TabsTrigger>
                      <TabsTrigger value="financial" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                        Financial
                      </TabsTrigger>
                      <TabsTrigger value="parent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                        Parent/Guardian
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="p-6">
                    <TabsContent value="personal" className="space-y-4 mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 text-[#6B7280] mt-1" />
                          <div>
                            <p className="text-sm text-[#6B7280]">Date of Birth</p>
                            <p className="text-[#1F2937] font-medium">{selectedStudent.dateOfBirth}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 text-[#6B7280] mt-1" />
                          <div>
                            <p className="text-sm text-[#6B7280]">Gender</p>
                            <p className="text-[#1F2937] font-medium">{selectedStudent.gender}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <BookOpen className="w-5 h-5 text-[#6B7280] mt-1" />
                          <div>
                            <p className="text-sm text-[#6B7280]">Class</p>
                            <p className="text-[#1F2937] font-medium">{studentClass?.name || 'Not Assigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 text-[#6B7280] mt-1" />
                          <div>
                            <p className="text-sm text-[#6B7280]">Academic Year</p>
                            <p className="text-[#1F2937] font-medium">{selectedStudent.academicYear}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="academic" className="space-y-4 mt-0">
                      {studentScores.length === 0 ? (
                        <p className="text-[#6B7280] text-center py-8">No academic records yet</p>
                      ) : (
                        <div className="space-y-3">
                          {studentScores.map((score) => (
                            <div key={score.id} className="p-4 border border-[#E5E7EB] rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-[#1F2937]">{score.subjectName}</h3>
                                <Badge className={
                                  score.grade === 'A' ? 'bg-[#10B981]' :
                                  score.grade === 'B' ? 'bg-[#3B82F6]' :
                                  score.grade === 'C' ? 'bg-[#F59E0B]' :
                                  'bg-[#EF4444]'
                                }>
                                  {score.grade}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-sm">
                                <div>
                                  <p className="text-[#6B7280]">CA1</p>
                                  <p className="font-medium text-[#1F2937]">{score.ca1}/20</p>
                                </div>
                                <div>
                                  <p className="text-[#6B7280]">CA2</p>
                                  <p className="font-medium text-[#1F2937]">{score.ca2}/20</p>
                                </div>
                                <div>
                                  <p className="text-[#6B7280]">Exam</p>
                                  <p className="font-medium text-[#1F2937]">{score.exam}/60</p>
                                </div>
                                <div>
                                  <p className="text-[#6B7280]">Total</p>
                                  <p className="font-medium text-[#1F2937]">{score.total}/100</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-4 mt-0">
                      {studentPayments.length === 0 ? (
                        <p className="text-[#6B7280] text-center py-8">No payment records</p>
                      ) : (
                        <div className="space-y-3">
                          {studentPayments.map((payment) => (
                            <div key={payment.id} className="p-4 border border-[#E5E7EB] rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-[#1F2937]">₦{payment.amount.toLocaleString()}</p>
                                  <p className="text-sm text-[#6B7280]">{payment.paymentDate}</p>
                                </div>
                                <Badge variant={payment.status === 'Verified' ? 'default' : 'secondary'}>
                                  {payment.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-[#6B7280]">{payment.paymentMethod}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="parent" className="space-y-4 mt-0">
                      {!studentParent ? (
                        <p className="text-[#6B7280] text-center py-8">No parent linked</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 text-[#6B7280] mt-1" />
                            <div>
                              <p className="text-sm text-[#6B7280]">Parent Name</p>
                              <p className="text-[#1F2937] font-medium">
                                {studentParent.firstName} {studentParent.lastName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 text-[#6B7280] mt-1" />
                            <div>
                              <p className="text-sm text-[#6B7280]">Email</p>
                              <p className="text-[#1F2937] font-medium">{studentParent.email}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 text-[#6B7280] mt-1" />
                            <div>
                              <p className="text-sm text-[#6B7280]">Phone</p>
                              <p className="text-[#1F2937] font-medium">{studentParent.phone}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
