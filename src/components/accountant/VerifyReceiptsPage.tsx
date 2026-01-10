import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { Eye, Download, FileText, Printer } from 'lucide-react';
import { PaymentReceipt } from '../ui/PaymentReceipt';

const NAIRA = "\u20A6";

export function VerifyReceiptsPage() {
  const { payments, verifyPayment, updatePayment, updateStudentFeeBalance, students, parents, users, addNotification, currentUser, classes } = useSchool();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isPrintReceiptDialogOpen, setIsPrintReceiptDialogOpen] = useState(false);

  // Get pending payments only
  const pendingPayments = payments.filter((p) => p.status === 'Pending');

  // Extract receipt URL from notes field
  const getReceiptUrl = (notes: string | undefined) => {
    if (!notes) return null;
    const match = notes.match(/Bank transfer receipt: (.+)/);
    return match ? match[1] : null;
  };

  const handleVerify = (paymentId: number) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (payment) {
      const student = students.find(s => s.id === payment.student_id);
      const studentClass = student ? classes.find(c => c.id === student.class_id) : null;
      
      // Call verifyPayment with action 'verify'
      verifyPayment(paymentId, { action: 'verify' });
      
      // Update student fee balance
      updateStudentFeeBalance(payment.student_id, { total_paid: payment.amount });
      
      // Send notification to parent
      const parent = parents.find(p => p.id === student?.parent_id);
      if (parent && student) {
        addNotification({
          title: '✓ Fee Payment Confirmed',
          message: `Payment of ${NAIRA}${payment.amount.toLocaleString()} for ${student.firstName} ${student.lastName} (${studentClass?.name || 'N/A'}) has been verified and confirmed. Receipt No: ${payment.receipt_number}`,
          type: 'success',
          targetAudience: 'parents',
          sentBy: currentUser?.id || 1,
          sentDate: new Date().toISOString(),
          isRead: false,
          readBy: []
        } as any);
      }
      
      toast.success('Payment verified successfully');
      
      // Open print receipt dialog for manual payments
      if (payment.payment_method !== 'Online Payment') {
        setSelectedPayment(payment);
        setIsPrintReceiptDialogOpen(true);
      }
    }
  };

  const handleReject = () => {
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    // Call verifyPayment with action 'reject' and reason
    verifyPayment(selectedPayment.id, { action: 'reject', rejection_reason: rejectionReason });
    
    toast.error(`Payment ${selectedPayment.receipt_number} rejected`);
    setIsRejectDialogOpen(false);
    setSelectedPayment(null);
    setRejectionReason('');
  };

  const openRejectDialog = (payment: any) => {
    setSelectedPayment(payment);
    setIsRejectDialogOpen(true);
  };

  const openReceiptDialog = (payment: any) => {
    setSelectedPayment(payment);
    setIsReceiptDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Verify Payment Receipts</h1>
        <p className="text-[#6B7280]">Review and verify pending payment submissions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280]">Pending Verification</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-3xl text-[#1F2937]">{pendingPayments.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-5">
            <div className="flex items-center justify_between mb-2">
              <p className="text-[#6B7280]">Total Amount</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-3xl text-[#1F2937]">
              {NAIRA}{pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280]">Verified Today</p>
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-3xl text-[#1F2937]">
              {
                payments.filter(
                  (p) =>
                    p.status === 'Verified' &&
                    new Date(p.recorded_date).toDateString() === new Date().toDateString()
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Table */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1F2937]">Pending Payment Verifications</h3>
            <Badge className="bg-[#F59E0B] text-white border-0">{pendingPayments.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Student Name</TableHead>
                  <TableHead className="text-white">Receipt No.</TableHead>
                  <TableHead className="text-white">Amount</TableHead>
                  <TableHead className="text-white">Payment Type</TableHead>
                  <TableHead className="text-white">Method</TableHead>
                  <TableHead className="text-white">Reference</TableHead>
                  <TableHead className="text-white text-center">Receipt</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <span className="w-12 h-12 text-[#10B981]" />
                        <p className="text-[#1F2937]">No pending payments to verify</p>
                        <p className="text-[#6B7280] text-sm">All payments have been processed</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]"
                    >
                      <TableCell className="text-[#1F2937]">
                        {new Date(payment.recorded_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-[#1F2937] font-medium">{payment.student_name}</TableCell>
                      <TableCell className="text-[#6B7280] font-mono text-sm">
                        {payment.receipt_number}
                      </TableCell>
                      <TableCell className="text-[#1F2937] font-medium">
                        {NAIRA}{payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[#6B7280]">{payment.payment_type}</TableCell>
                      <TableCell className="text-[#6B7280]">{payment.payment_method}</TableCell>
                      <TableCell className="text-[#6B7280] font-mono text-xs">{payment.reference}</TableCell>
                      <TableCell className="text-center">
                        {payment.payment_method === 'Bank Transfer' && getReceiptUrl(payment.notes) ? (
                          <Button
                            onClick={() => openReceiptDialog(payment)}
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg h-8"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => handleVerify(payment.id)}
                            size="sm"
                            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg h-8 shadow-clinical hover:shadow-clinical-lg transition-all"
                          >
                            <span className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            onClick={() => openRejectDialog(payment)}
                            size="sm"
                            variant="outline"
                            className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg h-8"
                          >
                            <span className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Reject Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPayment && (
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-2">Payment Details:</p>
                <p className="text-[#1F2937] font-medium">{selectedPayment.student_name}</p>
                <p className="text-[#6B7280] text_sm">
                  Receipt: {selectedPayment.receipt_number} | Amount: {NAIRA}
                  {selectedPayment.amount.toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#1F2937]">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Enter reason for rejecting this payment..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedPayment(null);
                setRejectionReason('');
              }}
              variant="outline"
              className="rounded-lg border-[#E5E7EB] text-[#6B7280]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg"
            >
              <span className="w-4 h-4 mr-2" />
              Reject Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Image Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="max-w-2xl rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && getReceiptUrl(selectedPayment.notes) && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-2">Payment Details:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Student:</span> {selectedPayment.student_name}
                  </div>
                  <div>
                    <span className="font-medium">Receipt:</span> {selectedPayment.receipt_number}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> {NAIRA}{selectedPayment.amount.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Method:</span> {selectedPayment.payment_method}
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <img 
                    src={getReceiptUrl(selectedPayment.notes) || ''} 
                    alt="Payment Receipt"
                    className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-image.png';
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={() => {
                    setIsReceiptDialogOpen(false);
                    setSelectedPayment(null);
                  }}
                  variant="outline"
                  className="rounded-lg border-[#E5E7EB] text-[#6B7280]"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const receiptUrl = getReceiptUrl(selectedPayment.notes);
                    if (receiptUrl) {
                      window.open(receiptUrl, '_blank');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Receipt Dialog */}
      <Dialog open={isPrintReceiptDialogOpen} onOpenChange={setIsPrintReceiptDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937] flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <PaymentReceipt 
              payment={selectedPayment} 
              studentName={selectedPayment.student_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
