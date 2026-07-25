import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { CheckCircle, AlertCircle, FileText, Printer, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { CapacitorHelper } from "../../utils/capacitorHelper";

export function RecordPaymentPage() {
  const {
    students,
    currentUser,
    getFeeStructureByClass,
    addPayment,
    currentTerm,
    currentAcademicYear,
    payments,
    parents,
    addNotification,
    classes,
    getStudentInvoice,
  } = useSchool();

  const term = currentTerm || '';
  const academicYear = currentAcademicYear || '';

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
    ? (term && academicYear ? getFeeStructureByClass(selectedStudent.class_id, term, academicYear) : null)
    : null;

  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [showRecentPayments, setShowRecentPayments] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!selectedStudent || !term || !academicYear) {
        setInvoiceSummary(null);
        setInvoiceError(null);
        return;
      }

      try {
        setIsLoadingInvoice(true);
        setInvoiceError(null);
        const res = await getStudentInvoice(selectedStudent.id, term, academicYear);
        if (isMounted) {
          setInvoiceSummary(res);
        }
      } catch (e: any) {
        if (isMounted) {
          setInvoiceSummary(null);
          setInvoiceError(e?.message || 'No invoice found for this term');
        }
      } finally {
        if (isMounted) {
          setIsLoadingInvoice(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedStudent?.id, term, academicYear, getStudentInvoice]);

  // Filter students for dropdown
  const _filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        (s.firstName && s.firstName.toLowerCase().includes(term)) ||
        (s.lastName && s.lastName.toLowerCase().includes(term)) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(term)) ||
        (s.firstName && s.lastName && `${s.firstName} ${s.lastName}`.toLowerCase().includes(term))
    ).slice(0, 20);
  }, [students, searchTerm]);

  // Get recent payments for selected student
  const recentPayments = useMemo(() => {
    if (!selectedStudentId) return [];
    return payments
      .filter(p => p.student_id === selectedStudentId && p.academic_year === academicYear && p.term === term)
      .sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime())
      .slice(0, 5);
  }, [payments, selectedStudentId, academicYear, term]);

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

  const _handleSelectStudent = (studentId: number) => {
    setSelectedStudentId(studentId);
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSearchTerm(`${student.firstName} ${student.lastName}`);
    }
  };

  // Quick amount presets
  const quickAmounts = useMemo(() => {
    const outstanding = invoiceSummary?.outstanding || 0;
    const presets = [];
    if (outstanding > 0) {
      presets.push({ label: 'Full Amount', value: outstanding });
      if (outstanding > 10000) {
        presets.push({ label: 'Half', value: Math.floor(outstanding / 2) });
      }
      if (outstanding > 50000) {
        presets.push({ label: 'Quarter', value: Math.floor(outstanding / 4) });
      }
    }
    return presets;
  }, [invoiceSummary?.outstanding]);

  const handleRecordPayment = async (e: React.FormEvent) => {
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

    if (!term || !academicYear) {
      toast.error('Current term and academic year are required');
      return;
    }

    // Show confirmation dialog instead of executing immediately
    setShowConfirmDialog(true);
  };

  const executePayment = async () => {
    setShowConfirmDialog(false);
    if (!selectedStudentId || !currentUser) return;

    const amount = parseFloat(paymentData.amount);
    const txnReference = paymentData.referenceNumber || `TRX${Date.now()}`;

    setIsRecordingPayment(true);
    try {
      const result = await addPayment({
        student_id: selectedStudentId,
        student_name: `${selectedStudent?.firstName} ${selectedStudent?.lastName}`,
        invoice_id: invoiceSummary?.invoice?.id,
        amount,
        payment_type: 'School Fees',
        term,
        academic_year: academicYear,
        payment_method: paymentData.paymentMethod,
        transaction_reference: txnReference,
      });

      const actualReceiptNumber = result?.receipt_number || result?.receiptNumber || `RCPT-${Date.now()}`;

      // Notify parent
      if (selectedStudent?.parent_id) {
        const parent = parents.find(p => p.id === selectedStudent.parent_id);
        if (parent) {
          addNotification({
            title: 'Fee Payment Recorded',
            message: `Payment of ₦${amount.toLocaleString()} recorded for ${selectedStudent.firstName} ${selectedStudent.lastName}. Payment Method: ${paymentData.paymentMethod}`,
            type: 'info',
            targetAudience: 'parents',
            sentBy: currentUser.id,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
        }
      }

      // Store payment details for receipt
      setRecordedPayment({
        amount,
        receiptNumber: actualReceiptNumber,
        studentName: `${selectedStudent?.firstName} ${selectedStudent?.lastName}`,
        className: selectedClass?.name,
        admissionNumber: selectedStudent?.admissionNumber,
        paymentMethod: paymentData.paymentMethod,
        term,
        academicYear,
        date: new Date().toISOString(),
        transactionReference: txnReference,
      });

      toast.success(`Payment of ₦${amount.toLocaleString()} recorded successfully`);

      // Reset form
      setSelectedStudentId(null);
      setSearchTerm("");
      setPaymentData({ amount: "", paymentMethod: "", referenceNumber: "" });
      setInvoiceSummary(null);
      setInvoiceError(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const cancelPayment = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[#1F2937] mb-2">Record Payment</h1>
          <p className="text-[#6B7280]">Search for student and record fee payment</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280] bg-[#F3F4F6] px-4 py-2 rounded-lg">
          <Info className="w-4 h-4" />
          <span>Term: <strong className="text-[#1F2937]">{term || 'Not Set'}</strong></span>
          <span className="mx-2">|</span>
          <span>Session: <strong className="text-[#1F2937]">{academicYear || 'Not Set'}</strong></span>
        </div>
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
      {selectedStudent && (isLoadingInvoice || invoiceSummary || invoiceError) && (
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-2xl">
          <CardHeader className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <h3 className="text-[#1F2937]">Student Payment Details</h3>
              {isLoadingInvoice ? (
                <Badge className="bg-[#6B7280] text-white border-0">Loading...</Badge>
              ) : invoiceError ? (
                <Badge className="bg-[#F59E0B] text-white border-0">No Invoice</Badge>
              ) : (
                <Badge className={invoiceSummary?.outstanding > 0 ? "bg-[#EF4444] text-white border-0" : "bg-[#10B981] text-white border-0"}>
                  {invoiceSummary?.outstanding > 0 ? "Outstanding" : (invoiceSummary?.credit > 0 ? "Credit" : "Settled")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingInvoice ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007C91]"></div>
                <span className="ml-3 text-[#6B7280]">Loading invoice details...</span>
              </div>
            ) : (
              <>
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
                    <p className="text-[#1F2937]">₦{Number(invoiceSummary?.paid_total || 0).toLocaleString()}</p>
                  </div>
                  {invoiceError ? (
                    <div className="p-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg md:col-span-2">
                      <p className="text-[#92400E] text-sm">{invoiceError}. Payment will be recorded without invoice linkage.</p>
                    </div>
                  ) : invoiceSummary?.outstanding > 0 ? (
                    <div className="p-4 bg-[#FEF2F2] border border-[#EF4444] rounded-lg md:col-span-2">
                      <p className="text-[#6B7280] mb-1">Outstanding Balance</p>
                      <p className="text-[#1F2937] text-xl">₦{Number(invoiceSummary.outstanding || 0).toLocaleString()}</p>
                    </div>
                  ) : invoiceSummary?.credit > 0 ? (
                    <div className="p-4 bg-[#ECFDF5] border border-[#10B981] rounded-lg md:col-span-2">
                      <p className="text-[#6B7280] mb-1">Credit Balance</p>
                      <p className="text-[#1F2937] text-xl">₦{Number(invoiceSummary.credit || 0).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg md:col-span-2">
                      <p className="text-[#6B7280] mb-1">Balance</p>
                      <p className="text-[#1F2937] text-xl">₦0</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Recent Payments for this Student */}
            {recentPayments.length > 0 && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowRecentPayments(!showRecentPayments)}
                  className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1F2937] mb-3"
                >
                  <FileText className="w-4 h-4" />
                  <span>Recent Payments ({recentPayments.length})</span>
                  {showRecentPayments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showRecentPayments && (
                  <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F3F4F6]">
                        <tr>
                          <th className="px-4 py-2 text-left text-[#6B7280]">Date</th>
                          <th className="px-4 py-2 text-left text-[#6B7280]">Amount</th>
                          <th className="px-4 py-2 text-left text-[#6B7280]">Method</th>
                          <th className="px-4 py-2 text-left text-[#6B7280]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPayments.map((p) => (
                          <tr key={p.id} className="border-t border-[#E5E7EB]">
                            <td className="px-4 py-2 text-[#1F2937]">{new Date(p.recorded_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-[#1F2937]">₦{Number(p.amount).toLocaleString()}</td>
                            <td className="px-4 py-2 text-[#1F2937]">{p.payment_method}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                p.status === 'Verified' ? 'bg-[#ECFDF5] text-[#059669]' :
                                p.status === 'Pending' ? 'bg-[#FEF3C7] text-[#D97706]' :
                                p.status === 'Rejected' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                                'bg-[#F3F4F6] text-[#6B7280]'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Payment Form */}
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Amount Paid (₦) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                />
                {/* Quick Amount Buttons */}
                {quickAmounts.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {quickAmounts.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPaymentData({ ...paymentData, amount: preset.value.toString() })}
                        className="px-3 py-1.5 text-xs bg-[#EFF6FF] text-[#2563EB] rounded-full hover:bg-[#DBEAFE] transition-colors"
                      >
                        {preset.label} (₦{preset.value.toLocaleString()})
                      </button>
                    ))}
                  </div>
                )}
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
                  disabled={isRecordingPayment || isLoadingInvoice}
                  className="flex-1 h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRecordingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <CardHeader className="p-5 border-b border-[#E5E7EB]">
              <h3 className="text-[#1F2937] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                Confirm Payment
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-[#6B7280]">Are you sure you want to record this payment?</p>
                <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Student:</span>
                    <span className="text-[#1F2937] font-medium">{selectedStudent?.firstName} {selectedStudent?.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Amount:</span>
                    <span className="text-[#1F2937] font-medium">₦{parseFloat(paymentData.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Method:</span>
                    <span className="text-[#1F2937] font-medium">{paymentData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Outstanding:</span>
                    <span className={`font-medium ${invoiceSummary?.outstanding > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                      ₦{Number(invoiceSummary?.outstanding || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {invoiceSummary?.outstanding > 0 && parseFloat(paymentData.amount) > invoiceSummary.outstanding && (
                  <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-3">
                    <p className="text-[#92400E] text-sm">
                      ⚠️ Payment exceeds outstanding balance. This will create a credit balance.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={cancelPayment}
                  variant="outline"
                  className="flex-1 h-12 rounded-lg border-[#E5E7EB] text-[#6B7280]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executePayment}
                  disabled={isRecordingPayment}
                  className="flex-1 h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg"
                >
                  {isRecordingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receipt Modal */}
      {recordedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <CardHeader className="p-5 border-b border-[#E5E7EB] flex flex-row items-center justify-between">
              <h3 className="text-[#1F2937] flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#10B981]" />
                Payment Recorded
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecordedPayment(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#10B981]" />
                </div>
                <p className="text-[#10B981] font-medium">Payment Successful</p>
              </div>
              <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Receipt No:</span>
                  <span className="text-[#1F2937] font-mono">{recordedPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Student:</span>
                  <span className="text-[#1F2937]">{recordedPayment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Class:</span>
                  <span className="text-[#1F2937]">{recordedPayment.className || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Amount:</span>
                  <span className="text-[#1F2937] font-bold text-lg">₦{recordedPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Method:</span>
                  <span className="text-[#1F2937]">{recordedPayment.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Term/Session:</span>
                  <span className="text-[#1F2937]">{recordedPayment.term} / {recordedPayment.academicYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Date:</span>
                  <span className="text-[#1F2937]">{new Date(recordedPayment.date).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setRecordedPayment(null)}
                  variant="outline"
                  className="flex-1 h-12 rounded-lg border-[#E5E7EB] text-[#6B7280]"
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    // Print receipt logic
                    await CapacitorHelper.print();
                  }}
                  className="flex-1 h-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
