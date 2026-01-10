import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { Search, User, DollarSign, CreditCard, Banknote, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';

export function RecordPaymentPage() {
  const {
    students,
    currentUser,
    getFeeStructureByClass,
    getStudentFeeBalance,
    addPayment,
    updateStudentFeeBalance,
    currentTerm,
    currentAcademicYear,
    payments,
    parents,
    addNotification,
    classes,
  } = useSchool();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "",
    referenceNumber: "",
  });

  const selectedStudent = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)
    : null;

  const selectedClass = selectedStudent
    ? classes.find((c) => c.id === selectedStudent.class_id)
    : null;

  const selectedFeeStructure = selectedStudent
    ? getFeeStructureByClass(selectedStudent.class_id, currentTerm, currentAcademicYear)
    : null;

  const selectedFeeBalance = selectedStudent
    ? getStudentFeeBalance(selectedStudent.id)
    : null;

  const handleSearch = () => {
    const student = students.find(
      (s) =>
        (s.firstName && s.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.lastName && s.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.firstName && s.lastName && `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (student) {
      setSelectedStudentId(student.id);
    } else {
      setSelectedStudentId(null);
      toast.error("Student not found");
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId || !currentUser) {
      toast.error("Please select a student");
      return;
    }

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!paymentData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    const amount = parseFloat(paymentData.amount);
    const balance = selectedFeeBalance?.balance || 0;

    if (amount > balance) {
      toast.error(`Payment amount exceeds balance (₦${balance.toLocaleString()})`);
      return;
    }

    const receiptNumber = `REC/${new Date().getFullYear()}/${String(payments.length + 1).padStart(4, '0')}`;
    const txnReference = paymentData.referenceNumber || `TRX${Date.now()}`;

    // For cash payments, auto-verify and send notification
    const isCashPayment = paymentData.paymentMethod === 'Cash';
    const paymentStatus = isCashPayment ? 'Verified' : 'Pending';

    addPayment({
      student_id: selectedStudentId,
      student_name: `${selectedStudent?.firstName} ${selectedStudent?.lastName}`,
      amount,
      payment_type: amount >= balance ? 'Full Payment' : 'Partial Payment',
      term: currentTerm,
      academic_year: currentAcademicYear,
      payment_method: paymentData.paymentMethod,
      reference: txnReference,
      recorded_by: currentUser.id,
      recorded_date: new Date().toISOString(),
      status: paymentStatus,
      receipt_number: receiptNumber,
    });

    // If cash payment, update balance immediately and notify parent
    if (isCashPayment) {
      const currentBalance = selectedFeeBalance?.total_paid || 0;
      updateStudentFeeBalance(selectedStudentId, { 
        total_paid: currentBalance + amount,
        balance: (selectedFeeBalance?.total_fee_required || 0) - (currentBalance + amount)
      });
      
      // Send notification to parent
      if (selectedStudent?.parent_id) {
        const parent = parents.find(p => p.id === selectedStudent.parent_id);
        if (parent) {
          addNotification({
            title: '✓ Fee Payment Confirmed',
            message: `Payment of ₦${amount.toLocaleString()} for ${selectedStudent.firstName} ${selectedStudent.lastName} (${selectedStudent.className}) has been verified and confirmed. Receipt No: ${receiptNumber}. Payment Method: ${paymentData.paymentMethod}`,
            type: 'success',
            targetAudience: 'parents',
            sentBy: currentUser.id,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
        }
      }
      
      toast.success(`Payment of ₦${amount.toLocaleString()} recorded and verified! Receipt: ${receiptNumber}`);
    } else {
      toast.success(`Payment of ₦${amount.toLocaleString()} recorded successfully! Receipt: ${receiptNumber}. Awaiting verification.`);
    }

    setSelectedStudentId(null);
    setSearchTerm("");
    setPaymentData({ amount: "", paymentMethod: "", referenceNumber: "" });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Record Payment</h1>
        <p className="text-[#6B7280]">Search for student and record fee payment</p>
      </div>

      {/* Search Student */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-2xl">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <h3 className="text-[#1F2937]">Search Student</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter student name or admission number..."
                className="h-12 pl-10 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="h-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all whitespace-nowrap px-8"
            >
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student Details & Payment Form */}
      {selectedStudent && selectedFeeBalance && (
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-2xl">
          <CardHeader className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <h3 className="text-[#1F2937]">Student Payment Details</h3>
              <Badge className={selectedFeeBalance.balance > 0 ? "bg-[#EF4444] text-white border-0" : "bg-[#10B981] text-white border-0"}>
                {selectedFeeBalance.balance > 0 ? "Outstanding" : "Fully Paid"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Student Info */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Student Name</p>
                <p className="text-[#1F2937]">{selectedStudent.firstName} {selectedStudent.lastName}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Class</p>
                <p className="text-[#1F2937]">{selectedClass?.name || 'N/A'}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Total Fee</p>
                <p className="text-[#1F2937]">₦{selectedFeeStructure?.total_fee?.toLocaleString() || '0'}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Amount Paid</p>
                <p className="text-[#1F2937]">₦{selectedFeeBalance?.total_paid?.toLocaleString() || '0'}</p>
              </div>
              <div className="p-4 bg-[#FEF2F2] border border-[#EF4444] rounded-lg md:col-span-2">
                <p className="text-[#6B7280] mb-1">Outstanding Balance</p>
                <p className="text-[#1F2937] text-xl">₦{selectedFeeBalance.balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Amount Paid (₦) *</Label>
                <Input
                  required
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="Enter amount"
                  max={selectedFeeBalance.balance}
                  className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Payment Method *</Label>
                <Select value={paymentData.paymentMethod} onValueChange={(value: string) => setPaymentData({ ...paymentData, paymentMethod: value })}>
                  <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    <SelectItem value="Cash" className="text-[#1F2937]">Cash</SelectItem>
                    <SelectItem value="Bank Transfer" className="text-[#1F2937]">Bank Transfer</SelectItem>
                    <SelectItem value="POS" className="text-[#1F2937]">POS</SelectItem>
                    <SelectItem value="Online Payment" className="text-[#1F2937]">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Reference Number</Label>
                <Input
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  placeholder="Optional: Transaction/Receipt reference"
                  className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedStudentId(null)}
                  className="flex-1 h-12 rounded-lg border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all"
                >
                  <span className="w-5 h-5 mr-2" />
                  Record Payment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
