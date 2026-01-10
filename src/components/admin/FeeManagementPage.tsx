import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useSchool } from "../../contexts/SchoolContext";
export function FeeManagementPage() {
  const { feeStructures, classes, students, studentFeeBalances, payments } = useSchool();
  const [selectedTab, setSelectedTab] = useState<"overview" | "structures" | "balances">("overview");

  // Calculate statistics
  const totalExpectedRevenue = feeStructures.reduce((sum, fee) => {
    const cls = classes.find(c => c.id === fee.class_id || fee.classId);
    const studentsCount = cls?.currentStudents ?? 0;
    return sum + (fee.totalFee * studentsCount || 0);
  }, 0);
  const totalCollected = payments.filter(p => p.status === 'Verified').reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = studentFeeBalances.reduce((sum, b) => sum + b.balance, 0);
  const studentsWithBalances = studentFeeBalances.filter(b => b.balance > 0).length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Fee Management</h1>
        <p className="text-[#6B7280]">Oversee fee structures and student payment status</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Expected Revenue</p>
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">₦{totalExpectedRevenue.toLocaleString()}</p>
            <p className="text-xs text-[#6B7280]">This term</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Total Collected</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">₦{totalCollected.toLocaleString()}</p>
            <p className="text-xs text-[#10B981]">
              {totalExpectedRevenue > 0 ? ((totalCollected / totalExpectedRevenue) * 100).toFixed(1) : 0}% collected
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Outstanding</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">₦{totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-[#F59E0B]">Unpaid balances</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Students w/ Balance</p>
              <span className="w-5 h-5 text-[#EF4444]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{studentsWithBalances}</p>
            <p className="text-xs text-[#6B7280]">Out of {students.length} students</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[#E5E7EB]">
        <button
          onClick={() => setSelectedTab("overview")}
          className={`px-4 py-2 rounded-t-lg transition-all ${
            selectedTab === "overview"
              ? "bg-[#3B82F6] text-white"
              : "text-[#6B7280] hover:bg-[#F3F4F6]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedTab("structures")}
          className={`px-4 py-2 rounded-t-lg transition-all ${
            selectedTab === "structures"
              ? "bg-[#3B82F6] text-white"
              : "text-[#6B7280] hover:bg-[#F3F4F6]"
          }`}
        >
          Fee Structures
        </button>
        <button
          onClick={() => setSelectedTab("balances")}
          className={`px-4 py-2 rounded-t-lg transition-all ${
            selectedTab === "balances"
              ? "bg-[#3B82F6] text-white"
              : "text-[#6B7280] hover:bg-[#F3F4F6]"
          }`}
        >
          Student Balances
        </button>
      </div>

      {/* Fee Structures Tab */}
      {selectedTab === "structures" && (
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-[#1F2937] font-semibold">Fee Structures by Class</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#1F2937]">Class</TableHead>
                    <TableHead className="text-[#1F2937]">Tuition</TableHead>
                    <TableHead className="text-[#1F2937]">Development</TableHead>
                    <TableHead className="text-[#1F2937]">Exam</TableHead>
                    <TableHead className="text-[#1F2937]">Books</TableHead>
                    <TableHead className="text-[#1F2937]">Transport</TableHead>
                    <TableHead className="text-[#1F2937]">Total Fee</TableHead>
                    <TableHead className="text-[#1F2937]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.map((fee) => (
                    <TableRow key={fee.id} className="border-b border-[#E5E7EB]">
                      <TableCell className="text-[#1F2937] font-medium">{fee.className}</TableCell>
                      <TableCell className="text-[#1F2937]">₦{fee.tuitionFee.toLocaleString()}</TableCell>
                      <TableCell className="text-[#1F2937]">₦{fee.developmentLevy.toLocaleString()}</TableCell>
                      <TableCell className="text-[#1F2937]">₦{fee.examFee.toLocaleString()}</TableCell>
                      <TableCell className="text-[#1F2937]">₦{fee.booksFee.toLocaleString()}</TableCell>
                      <TableCell className="text-[#1F2937]">₦{fee.transportFee.toLocaleString()}</TableCell>
                      <TableCell className="text-[#1F2937] font-semibold">₦{fee.totalFee.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button className="h-8 px-3 bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg">
                            <span className="w-4 h-4" />
                          </Button>
                          <Button className="h-8 px-3 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg">
                            <span className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Balances Tab */}
      {selectedTab === "balances" && (
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-[#1F2937] font-semibold">Student Fee Balances</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#1F2937]">Student ID</TableHead>
                    <TableHead className="text-[#1F2937]">Student Name</TableHead>
                    <TableHead className="text-[#1F2937]">Class</TableHead>
                    <TableHead className="text-[#1F2937]">Total Fee</TableHead>
                    <TableHead className="text-[#1F2937]">Paid</TableHead>
                    <TableHead className="text-[#1F2937]">Balance</TableHead>
                    <TableHead className="text-[#1F2937]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentFeeBalances.map((balance) => {
                    const student = students.find(s => s.id === balance.studentId);
                    return (
                      <TableRow key={balance.id} className="border-b border-[#E5E7EB]">
                        <TableCell className="text-[#1F2937]">{student?.admissionNumber}</TableCell>
                        <TableCell className="text-[#1F2937] font-medium">
                          {student ? `${student.firstName} ${student.lastName}` : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{student?.className}</TableCell>
                        <TableCell className="text-[#1F2937]">₦{balance.totalFeeRequired.toLocaleString()}</TableCell>
                        <TableCell className="text-[#10B981]">₦{balance.totalPaid.toLocaleString()}</TableCell>
                        <TableCell className="text-[#EF4444] font-medium">₦{balance.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${
                              balance.status === "Paid"
                                ? "bg-[#10B981] text-white"
                                : balance.status === "Partial"
                                ? "bg-[#F59E0B] text-white"
                                : "bg-[#EF4444] text-white"
                            } border-0`}
                          >
                            {balance.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Tab */}
      {selectedTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
            <CardHeader className="p-4 border-b border-[#E5E7EB]">
              <h3 className="text-[#1F2937] font-semibold">Collection Rate by Class</h3>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {classes.slice(0, 5).map((cls) => {
                const classFee = feeStructures.find(f => f.classId === cls.id);
                const classStudents = students.filter(s => s.classId === cls.id);
                const classBalances = studentFeeBalances.filter(b => b.classId === cls.id);
                const totalExpected = classFee ? classFee.totalFee * classStudents.length : 0;
                const totalPaid = classBalances.reduce((sum, b) => sum + b.totalPaid, 0);
                const collectionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

                return (
                  <div key={cls.id} className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#1F2937] font-medium">{cls.name}</span>
                      <span className="text-[#3B82F6] font-medium">{collectionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div
                        className="bg-[#3B82F6] h-2 rounded-full transition-all"
                        style={{ width: `${collectionRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
            <CardHeader className="p-4 border-b border-[#E5E7EB]">
              <h3 className="text-[#1F2937] font-semibold">Recent Payment Activity</h3>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {payments.slice(-5).reverse().map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <div>
                    <p className="text-[#1F2937] font-medium">{payment.studentName}</p>
                    <p className="text-xs text-[#6B7280]">{payment.recordedDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#10B981] font-medium">₦{payment.amount.toLocaleString()}</p>
                    <Badge
                      className={`${
                        payment.status === "Verified" ? "bg-[#10B981]" : "bg-[#F59E0B]"
                      } text-white border-0 text-xs`}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
