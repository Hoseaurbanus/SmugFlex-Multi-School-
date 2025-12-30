import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function DebtorListPage() {
  const { students, feeStructures, feeBalances, classes } = useSchool();
  const [selectedDebtors, setSelectedDebtors] = useState<number[]>([]);

  const debtors = students.filter(student => {
    const balance = feeBalances.find(fb => fb.studentId === student.id);
    return balance && balance.outstanding > 0;
  }).map(student => {
    const balance = feeBalances.find(fb => fb.studentId === student.id)!;
    const classObj = classes.find(c => c.id === student.classId);
    return {
      ...student,
      outstanding: balance.outstanding,
      totalFees: balance.totalFees,
      paid: balance.paid,
      className: classObj?.name || 'N/A'
    };
  }).sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.outstanding, 0);

  const handleSendReminder = (studentIds: number[]) => {
    toast.success(`Reminder sent to ${studentIds.length} student(s)`);
  };

  const handleSendBulkSMS = () => {
    if (selectedDebtors.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    handleSendReminder(selectedDebtors);
    setSelectedDebtors([]);
  };

  const toggleSelection = (studentId: number) => {
    setSelectedDebtors(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    setSelectedDebtors(debtors.map(d => d.id));
  };

  const clearSelection = () => {
    setSelectedDebtors([]);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Debtor List & Management</h1>
        <p className="text-[#6B7280]">Track outstanding fees and send payment reminders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Debtors</p>
                <p className="text-2xl font-semibold text-[#1F2937] mt-1">{debtors.length}</p>
              </div>
              <span className="w-8 h-8 text-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Outstanding</p>
                <p className="text-2xl font-semibold text-[#EF4444] mt-1">
                  ₦{totalOutstanding.toLocaleString()}
                </p>
              </div>
              <span className="w-8 h-8 text-[#EF4444]" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Selected</p>
                <p className="text-2xl font-semibold text-[#1F2937] mt-1">{selectedDebtors.length}</p>
              </div>
              <span className="w-8 h-8 text-[#3B82F6]" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <Button
              onClick={handleSendBulkSMS}
              disabled={selectedDebtors.length === 0}
              className="w-full h-full rounded-lg bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              <span className="w-4 h-4 mr-2" />
              Send SMS ({selectedDebtors.length})
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Debtor List */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1F2937]">Outstanding Fees</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} className="rounded-lg">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} className="rounded-lg">
                Clear
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg">
                <span className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {debtors.length === 0 ? (
            <div className="text-center py-12">
              <span className="w-16 h-16 text-[#10B981] mx-auto mb-4 opacity-50" />
              <p className="text-[#6B7280]">No outstanding fees!</p>
              <p className="text-sm text-[#9CA3AF] mt-1">All students have cleared their fees</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDebtors.length === debtors.length}
                        onChange={() => selectedDebtors.length === debtors.length ? clearSelection() : selectAll()}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 text-left font-semibold text-[#1F2937]">Student</th>
                    <th className="p-3 text-left font-semibold text-[#1F2937]">Admission No</th>
                    <th className="p-3 text-left font-semibold text-[#1F2937]">Class</th>
                    <th className="p-3 text-right font-semibold text-[#1F2937]">Total Fees</th>
                    <th className="p-3 text-right font-semibold text-[#1F2937]">Paid</th>
                    <th className="p-3 text-right font-semibold text-[#1F2937]">Outstanding</th>
                    <th className="p-3 text-center font-semibold text-[#1F2937]">Status</th>
                    <th className="p-3 text-center font-semibold text-[#1F2937]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.map((debtor) => {
                    const percentPaid = (debtor.paid / debtor.totalFees) * 100;
                    const severity = percentPaid < 25 ? 'critical' : percentPaid < 50 ? 'high' : percentPaid < 75 ? 'medium' : 'low';

                    return (
                      <tr key={debtor.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedDebtors.includes(debtor.id)}
                            onChange={() => toggleSelection(debtor.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white font-semibold text-sm">
                              {debtor.firstName[0]}{debtor.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-[#1F2937]">
                                {debtor.firstName} {debtor.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-[#6B7280]">{debtor.admissionNumber}</td>
                        <td className="p-3 text-[#6B7280]">{debtor.className}</td>
                        <td className="p-3 text-right font-medium text-[#1F2937]">
                          ₦{debtor.totalFees.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-medium text-[#10B981]">
                          ₦{debtor.paid.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-[#EF4444]">
                          ₦{debtor.outstanding.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={
                              severity === 'critical' ? 'bg-[#EF4444]' :
                              severity === 'high' ? 'bg-[#F59E0B]' :
                              severity === 'medium' ? 'bg-[#F59E0B]' :
                              'bg-[#3B82F6]'
                            }
                          >
                            {percentPaid.toFixed(0)}% paid
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder([debtor.id])}
                            className="rounded-lg"
                          >
                            <span className="w-3 h-3 mr-1" />
                            Remind
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
