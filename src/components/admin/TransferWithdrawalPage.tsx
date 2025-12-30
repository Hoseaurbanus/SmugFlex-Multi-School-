import { useState } from "react";
import { ArrowLeft, Minus } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function TransferWithdrawalPage() {
  const { students, classes, updateStudent } = useSchool();
  const [transferData, setTransferData] = useState({
    studentId: "",
    newClassId: "",
    effectiveDate: "",
    reason: ""
  });

  const [withdrawalData, setWithdrawalData] = useState({
    studentId: "",
    withdrawalDate: "",
    reason: "",
    clearanceNotes: ""
  });

  const activeStudents = students.filter(s => s.status === 'Active');

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === Number(transferData.studentId));
    if (student) {
      updateStudent(student.id, {
        ...student,
        class_id: Number(transferData.newClassId),
        className: classes.find(c => c.id === Number(transferData.newClassId))?.name || student.className
      });
      toast.success("Student transferred successfully!");
      setTransferData({ studentId: "", newClassId: "", effectiveDate: "", reason: "" });
    }
  };

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === Number(withdrawalData.studentId));
    if (student) {
      if (confirm(`Are you sure you want to withdraw ${student.firstName} ${student.lastName}? This will mark them as inactive.`)) {
        updateStudent(student.id, { ...student, status: 'Inactive' });
        toast.success("Student withdrawn successfully");
        setWithdrawalData({ studentId: "", withdrawalDate: "", reason: "", clearanceNotes: "" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Transfer & Withdrawal Management</h1>
        <p className="text-[#6B7280]">Manage student transfers between classes and process withdrawals</p>
      </div>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <Tabs defaultValue="transfer" className="w-full">
          <CardHeader className="border-b border-[#E5E7EB] p-0">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
              <TabsTrigger value="transfer" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Transfer Student
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                <Minus className="w-4 h-4 mr-2" />
                Withdraw Student
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6]">
                <span className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-6">
            <TabsContent value="transfer" className="mt-0">
              <form onSubmit={handleTransfer} className="space-y-6">
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 flex gap-3">
                  <span className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#1F2937] mb-1">Transfer Guidelines</p>
                    <p className="text-sm text-[#6B7280]">
                      Transferring a student will move them to a new class. All academic records and scores will be retained.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="transferStudent">Select Student *</Label>
                    <Select
                      value={transferData.studentId}
                      onValueChange={(value) => setTransferData({ ...transferData, studentId: value })}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Choose student" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.firstName} {student.lastName} - {student.className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="newClass">Transfer To Class *</Label>
                    <Select
                      value={transferData.newClassId}
                      onValueChange={(value) => setTransferData({ ...transferData, newClassId: value })}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Choose new class" />
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

                  <div>
                    <Label htmlFor="effectiveDate">Effective Date *</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      className="rounded-lg"
                      value={transferData.effectiveDate}
                      onChange={(e) => setTransferData({ ...transferData, effectiveDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="transferReason">Reason for Transfer</Label>
                    <Textarea
                      id="transferReason"
                      className="rounded-lg min-h-[100px]"
                      placeholder="Enter reason for transfer..."
                      value={transferData.reason}
                      onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="rounded-lg bg-[#3B82F6] hover:bg-[#2563EB]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Process Transfer
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="withdrawal" className="mt-0">
              <form onSubmit={handleWithdrawal} className="space-y-6">
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 flex gap-3">
                  <span className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#1F2937] mb-1">Withdrawal Warning</p>
                    <p className="text-sm text-[#6B7280]">
                      Withdrawing a student will mark them as inactive. This action should be carefully documented.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="withdrawStudent">Select Student *</Label>
                    <Select
                      value={withdrawalData.studentId}
                      onValueChange={(value) => setWithdrawalData({ ...withdrawalData, studentId: value })}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Choose student" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.firstName} {student.lastName} - {student.className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="withdrawalDate">Withdrawal Date *</Label>
                    <Input
                      id="withdrawalDate"
                      type="date"
                      className="rounded-lg"
                      value={withdrawalData.withdrawalDate}
                      onChange={(e) => setWithdrawalData({ ...withdrawalData, withdrawalDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="withdrawalReason">Reason for Withdrawal *</Label>
                    <Textarea
                      id="withdrawalReason"
                      className="rounded-lg min-h-[100px]"
                      placeholder="Enter reason for withdrawal..."
                      value={withdrawalData.reason}
                      onChange={(e) => setWithdrawalData({ ...withdrawalData, reason: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="clearanceNotes">Clearance Notes</Label>
                    <Textarea
                      id="clearanceNotes"
                      className="rounded-lg min-h-[100px]"
                      placeholder="Financial clearance, library books returned, etc..."
                      value={withdrawalData.clearanceNotes}
                      onChange={(e) => setWithdrawalData({ ...withdrawalData, clearanceNotes: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" variant="destructive" className="rounded-lg">
                  <Minus className="w-4 h-4 mr-2" />
                  Process Withdrawal
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="text-center py-12">
                <span className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
                <p className="text-[#6B7280]">Transfer and withdrawal history will appear here</p>
                <p className="text-sm text-[#9CA3AF] mt-2">All processed transfers and withdrawals will be logged</p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
