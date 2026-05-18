import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { api } from '../../services/api';
import { Eye, Download, FileText, Printer, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, DollarSign } from 'lucide-react';
import { PaymentReceipt } from '../ui/PaymentReceipt';

const NAIRA = "\u20A6";

export function VerifyReceiptsPage() {
  const { payments, verifyPayment, reversePayment, students, parents, addNotification, currentUser, classes, getPaymentExceptions } = useSchool();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isPrintReceiptDialogOpen, setIsPrintReceiptDialogOpen] = useState(false);

  const [isAdjustVerifyDialogOpen, setIsAdjustVerifyDialogOpen] = useState(false);
  const [adjustVerifyAmount, setAdjustVerifyAmount] = useState<number>(0);
  const [adjustVerifyReason, setAdjustVerifyReason] = useState<string>('');

  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseTargetPayment, setReverseTargetPayment] = useState<any>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const [exceptionsData, setExceptionsData] = useState<any>(null);
  const [loadingExceptions, setLoadingExceptions] = useState(false);

  // Get pending payments only
  const pendingPayments = payments.filter((p) => p.status === 'Pending');

  const recentVerifiedPayments = useMemo(() => {
    const rows = payments
      .filter((p: any) => p && p.status === 'Verified')
      .sort((a: any, b: any) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime())
      .slice(0, 10);
    return rows;
  }, [payments]);

  const pendingOnlineExceptions = useMemo(() => {
    const rows = exceptionsData?.pending_online;
    return Array.isArray(rows) ? rows : [];
  }, [exceptionsData]);

  const pendingBankExceptions = useMemo(() => {
    const rows = exceptionsData?.pending_bank_transfers;
    return Array.isArray(rows) ? rows : [];
  }, [exceptionsData]);

  const exceptionPaymentIdSet = useMemo(() => {
    const ids = new Set<number>();
    for (const p of pendingOnlineExceptions) {
      const id = Number((p as any)?.id);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    }
    for (const p of pendingBankExceptions) {
      const id = Number((p as any)?.id);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    }
    return ids;
  }, [pendingOnlineExceptions, pendingBankExceptions]);

  const sortedPendingPayments = useMemo(() => {
    const copy = [...pendingPayments];
    copy.sort((a: any, b: any) => {
      const aIsException = exceptionPaymentIdSet.has(Number(a?.id)) ? 1 : 0;
      const bIsException = exceptionPaymentIdSet.has(Number(b?.id)) ? 1 : 0;
      if (aIsException !== bIsException) return bIsException - aIsException;
      return new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime();
    });
    return copy;
  }, [pendingPayments, exceptionPaymentIdSet]);

  const refreshExceptions = async () => {
    try {
      setLoadingExceptions(true);
      const data = await getPaymentExceptions();
      setExceptionsData(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load exceptions');
      setExceptionsData(null);
    } finally {
      setLoadingExceptions(false);
    }
  };

  useEffect(() => {
    refreshExceptions();
  }, []);

  // Extract receipt URL from notes field
  const getReceiptUrl = (notes: string | undefined) => {
    if (!notes) return null;
    const match = notes.match(/Bank transfer receipt:\s*(.+)/);
    return match ? match[1] : null;
  };

  const loadInvoiceForStudent = async (studentId: number, term: string, academicYear: string) => {
    try {
      setLoadingInvoice(true);
      const result = await api.get(`/invoices/student/${studentId}`, { term, academic_year: academicYear });
      if (result.success && result.data) {
        setInvoiceData(result.data);
      } else {
        setInvoiceData(null);
      }
    } catch {
      setInvoiceData(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleVerifyDirect = async (payment: any, adjustedAmount?: number, adjustmentReason?: string) => {
    try {
      setIsVerifying(true);
      const student = students.find(s => s.id === payment.student_id);
      const studentClass = student ? classes.find(c => c.id === student.class_id) : null;

      const payload: any = { action: 'verify' };
      const hasAdjustedAmount = typeof adjustedAmount === 'number' && Number.isFinite(adjustedAmount) && adjustedAmount > 0;
      const isChanged = hasAdjustedAmount && Number(adjustedAmount) !== Number(payment.amount);
      if (isChanged) {
        if (!adjustmentReason || !adjustmentReason.trim()) {
          throw new Error('Adjustment reason is required');
        }
        payload.adjusted_amount = adjustedAmount;
        payload.adjustment_reason = adjustmentReason.trim();
      }

      await verifyPayment(payment.id, payload);

      const parent = parents.find(p => p.id === student?.parent_id);
      if (parent && student) {
        const amountForMessage = isChanged ? adjustedAmount : payment.amount;
        await addNotification({
          title: '✓ Fee Payment Confirmed',
          message: `Payment of ${NAIRA}${Number(amountForMessage).toLocaleString()} for ${student.firstName} ${student.lastName} (${studentClass?.name || 'N/A'}) has been verified and confirmed. Receipt No: ${payment.receipt_number}`,
          type: 'success',
          targetAudience: 'parents',
          sentBy: currentUser?.id || 1,
          sentDate: new Date().toISOString(),
          isRead: false,
          readBy: []
        } as any);
      }

      toast.success('Payment verified successfully');

      if (payment.payment_method !== 'Online Payment') {
        setSelectedPayment(payment);
        setIsPrintReceiptDialogOpen(true);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify payment');
      throw e;
    } finally {
      setIsVerifying(false);
    }
  };

  const openAdjustVerifyDialog = async (payment: any) => {
    setSelectedPayment(payment);
    setAdjustVerifyAmount(Number(payment.amount || 0));
    setAdjustVerifyReason('');
    setIsAdjustVerifyDialogOpen(true);
    // Load invoice data for context
    const student = students.find(s => s.id === payment.student_id);
    if (student) {
      await loadInvoiceForStudent(student.id, payment.term, payment.academic_year);
    }
  };

  const handleVerify = async (paymentId: number) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    if (payment.payment_method === 'Bank Transfer') {
      openAdjustVerifyDialog(payment);
      return;
    }

    await handleVerifyDirect(payment);
  };

  const confirmAdjustVerify = async () => {
    if (!selectedPayment) return;
    const originalAmount = Number(selectedPayment.amount || 0);
    const adjustedAmount = Number(adjustVerifyAmount || 0);
    if (!Number.isFinite(adjustedAmount) || adjustedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const isChanged = adjustedAmount !== originalAmount;
    if (isChanged && !adjustVerifyReason.trim()) {
      toast.error('Adjustment reason is required');
      return;
    }

    try {
      await handleVerifyDirect(selectedPayment, adjustedAmount, adjustVerifyReason);
      setIsAdjustVerifyDialogOpen(false);
      setSelectedPayment(null);
      setAdjustVerifyReason('');
    } catch {
      // Error already toasted
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsRejecting(true);
      const student = students.find(s => s.id === selectedPayment.student_id);
      const studentClass = student ? classes.find(c => c.id === student.class_id) : null;

      await verifyPayment(selectedPayment.id, { action: 'reject', rejection_reason: rejectionReason });

      // Notify parent about rejection
      const parent = parents.find(p => p.id === student?.parent_id);
      if (parent && student) {
        await addNotification({
          title: '⚠️ Payment Rejected',
          message: `Payment of ${NAIRA}${Number(selectedPayment.amount).toLocaleString()} for ${student.firstName} ${student.lastName} (${studentClass?.name || 'N/A'}) was rejected. Reason: ${rejectionReason}. Please contact the school or submit a new payment.`,
          type: 'warning',
          targetAudience: 'parents',
          sentBy: currentUser?.id || 1,
          sentDate: new Date().toISOString(),
          isRead: false,
          readBy: []
        } as any);
      }

      toast.success(`Payment ${selectedPayment.receipt_number} rejected`);
      setIsRejectDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject payment');
    } finally {
      setIsRejecting(false);
    }
  };

  const openRejectDialog = async (payment: any) => {
    setSelectedPayment(payment);
    setIsRejectDialogOpen(true);
    // Load invoice data for context
    const student = students.find(s => s.id === payment.student_id);
    if (student) {
      await loadInvoiceForStudent(student.id, payment.term, payment.academic_year);
    }
  };

  const openReceiptDialog = (payment: any) => {
    setSelectedPayment(payment);
    setIsReceiptDialogOpen(true);
  };

  const openReverseDialog = (payment: any) => {
    setReverseTargetPayment(payment);
    setReverseReason('');
    setIsReverseDialogOpen(true);
  };

  const confirmReverse = async () => {
    if (!reverseTargetPayment) return;
    if (!reverseReason.trim()) {
      toast.error('Reversal reason is required');
      return;
    }

    try {
      await reversePayment(Number(reverseTargetPayment.id), reverseReason.trim());
      toast.success('Payment reversed successfully');
      setIsReverseDialogOpen(false);
      setReverseTargetPayment(null);
      setReverseReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reverse payment');
    }
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
            <div className="flex items-center justify-between mb-2">
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

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Recent Verified Payments</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#111827] border-none hover:bg-[#111827]">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Student</TableHead>
                  <TableHead className="text-white">Receipt</TableHead>
                  <TableHead className="text-white">Method</TableHead>
                  <TableHead className="text-white text-right">Amount</TableHead>
                  <TableHead className="text-white text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentVerifiedPayments.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-[#6B7280]">
                      No verified payments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentVerifiedPayments.map((p: any) => (
                    <TableRow key={p.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <TableCell className="text-sm text-[#374151]">
                        {p.recorded_date ? new Date(p.recorded_date).toLocaleDateString('en-GB') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-[#111827] font-medium">{p.student_name || p.studentName || '-'}</TableCell>
                      <TableCell className="text-sm font-mono text-[#374151]">{p.receipt_number || '-'}</TableCell>
                      <TableCell className="text-sm text-[#374151]">{p.payment_method || '-'}</TableCell>
                      <TableCell className="text-sm text-right font-semibold text-[#111827]">{NAIRA}{Number(p.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2]"
                          onClick={() => openReverseDialog(p)}
                        >
                          Reverse
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions Queue */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[#1F2937]">Stuck Pending (Exceptions)</h3>
              <p className="text-[#6B7280] text-sm">Payments pending beyond expected time thresholds</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshExceptions}
              disabled={loadingExceptions}
              className="rounded-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#1F2937]">Online Payments Pending Too Long</h4>
              <Badge className="bg-[#F59E0B] text-white border-0">{pendingOnlineExceptions.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOnlineExceptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-[#6B7280] py-6">No stuck online payments</TableCell>
                    </TableRow>
                  ) : (
                    pendingOnlineExceptions.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-[#1F2937]">{new Date(p.recorded_date).toLocaleString()}</TableCell>
                        <TableCell className="text-[#1F2937]">{p.first_name} {p.last_name}</TableCell>
                        <TableCell className="text-[#6B7280] font-mono text-xs">{p.transaction_reference || p.reference || '-'}</TableCell>
                        <TableCell className="text-right text-[#1F2937]">{NAIRA}{Number(p.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleVerify(p.id)}
                              size="sm"
                              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg h-7 px-2 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verify
                            </Button>
                            <Button
                              onClick={() => openRejectDialog(p)}
                              size="sm"
                              variant="outline"
                              className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg h-7 px-2 text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#1F2937]">Bank Transfers Pending Too Long</h4>
              <Badge className="bg-[#F59E0B] text-white border-0">{pendingBankExceptions.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBankExceptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-[#6B7280] py-6">No stuck bank transfers</TableCell>
                    </TableRow>
                  ) : (
                    pendingBankExceptions.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-[#1F2937]">{new Date(p.recorded_date).toLocaleString()}</TableCell>
                        <TableCell className="text-[#1F2937]">{p.first_name} {p.last_name}</TableCell>
                        <TableCell className="text-[#6B7280] font-mono text-xs">{p.receipt_number || '-'}</TableCell>
                        <TableCell className="text-right text-[#1F2937]">{NAIRA}{Number(p.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleVerify(p.id)}
                              size="sm"
                              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg h-7 px-2 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verify
                            </Button>
                            <Button
                              onClick={() => openRejectDialog(p)}
                              size="sm"
                              variant="outline"
                              className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg h-7 px-2 text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
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
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="text-white text-center">Flag</TableHead>
                  <TableHead className="text-white text-center">Receipt</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPendingPayments.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <span className="w-12 h-12 text-[#10B981]" />
                        <p className="text-[#1F2937]">No pending payments to verify</p>
                        <p className="text-[#6B7280] text-sm">All payments have been processed</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPendingPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className={
                        exceptionPaymentIdSet.has(Number((payment as any)?.id))
                          ? 'bg-amber-50 border-b border-[#E5E7EB] hover:bg-amber-100/40'
                          : 'bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]'
                      }
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
                        {exceptionPaymentIdSet.has(Number((payment as any)?.id)) ? (
                          <Badge className="bg-amber-500 text-white border-0">Stuck</Badge>
                        ) : null}
                      </TableCell>
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
        <DialogContent className="max-w-lg rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-[#EF4444]" />
              Reject Payment
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              This will reject the payment and notify the parent. The student's fee balance will not be affected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPayment && (
              <>
                <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="w-5 h-5 text-[#6B7280]" />
                    <div>
                      <p className="text-[#1F2937] font-medium">{selectedPayment.student_name}</p>
                      <p className="text-[#6B7280] text-sm">{selectedPayment.term} • {selectedPayment.academic_year}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#6B7280]">Receipt:</span>
                      <p className="font-mono text-[#1F2937]">{selectedPayment.receipt_number}</p>
                    </div>
                    <div>
                      <span className="text-[#6B7280]">Method:</span>
                      <p className="text-[#1F2937]">{selectedPayment.payment_method}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#6B7280]">Amount:</span>
                      <p className="text-[#1F2937] font-semibold text-lg">{NAIRA}{Number(selectedPayment.amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Context */}
                {loadingInvoice ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#6B7280]" />
                  </div>
                ) : invoiceData ? (
                  <div className="p-3 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-[#92400E]" />
                      <span className="text-sm font-medium text-[#92400E]">Fee Balance Context</span>
                    </div>
                    <div className="text-sm text-[#92400E]">
                      <span>Outstanding: </span>
                      <span className="font-semibold">{NAIRA}{Number(invoiceData.outstanding || 0).toLocaleString()}</span>
                      {invoiceData.credit > 0 && (
                        <span className="ml-2">| Credit: {NAIRA}{Number(invoiceData.credit).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div className="space-y-2">
              <Label className="text-[#1F2937]">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Enter reason for rejecting this payment (e.g., Invalid receipt, Amount mismatch, Duplicate payment)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937] focus:ring-2 focus:ring-[#EF4444]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <Button
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedPayment(null);
                setRejectionReason('');
                setInvoiceData(null);
              }}
              variant="outline"
              disabled={isRejecting}
              className="rounded-lg border-[#E5E7EB] text-[#6B7280]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg min-w-[140px]"
            >
              {isRejecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reverse Dialog */}
      <Dialog open={isReverseDialogOpen} onOpenChange={setIsReverseDialogOpen}>
        <DialogContent className="max-w-md rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Reverse Payment</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              This will create a reversal entry and mark the original payment as reversed.
            </DialogDescription>
          </DialogHeader>

          {reverseTargetPayment ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm text-[#111827] font-medium">{reverseTargetPayment.student_name || reverseTargetPayment.studentName || '-'}</p>
                <p className="text-xs text-[#6B7280] font-mono">Receipt: {reverseTargetPayment.receipt_number || '-'}</p>
                <p className="text-xs text-[#6B7280]">Amount: {NAIRA}{Number(reverseTargetPayment.amount || 0).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">
                  Reversal reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937]"
                  placeholder="Provide a clear reason for this reversal..."
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsReverseDialogOpen(false);
                setReverseTargetPayment(null);
                setReverseReason('');
              }}
            >
              Cancel
            </Button>
            <Button className="bg-[#EF4444] hover:bg-[#DC2626] text-white" onClick={confirmReverse}>
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust & Verify Dialog (Bank Transfer) */}
      <Dialog open={isAdjustVerifyDialogOpen} onOpenChange={setIsAdjustVerifyDialogOpen}>
        <DialogContent className="max-w-lg rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
              Verify Bank Transfer
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Confirm the amount received. If you change the amount, you must provide a reason.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5 text-[#6B7280]" />
                  <div>
                    <p className="text-[#1F2937] font-medium">{selectedPayment.student_name}</p>
                    <p className="text-[#6B7280] text-sm">{selectedPayment.term} • {selectedPayment.academic_year}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[#6B7280]">Receipt:</span>
                    <p className="font-mono text-[#1F2937]">{selectedPayment.receipt_number}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Type:</span>
                    <p className="text-[#1F2937]">{selectedPayment.payment_type}</p>
                  </div>
                </div>
              </div>

              {/* Invoice Context */}
              {loadingInvoice ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#6B7280]" />
                </div>
              ) : invoiceData ? (
                <div className="p-3 bg-[#D1FAE5] border border-[#10B981] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-[#065F46]" />
                    <span className="text-sm font-medium text-[#065F46]">Fee Balance Context</span>
                  </div>
                  <div className="text-sm text-[#065F46]">
                    <span>Outstanding: </span>
                    <span className="font-semibold">{NAIRA}{Number(invoiceData.outstanding || 0).toLocaleString()}</span>
                    {invoiceData.credit > 0 && (
                      <span className="ml-2">| Credit: {NAIRA}{Number(invoiceData.credit).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label className="text-[#1F2937] flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount Received ({NAIRA})
                </Label>
                <Input
                  type="number"
                  value={adjustVerifyAmount ? String(adjustVerifyAmount) : ''}
                  onChange={(e) => setAdjustVerifyAmount(Number(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">Submitted amount: {NAIRA}{Number(selectedPayment.amount || 0).toLocaleString()}</span>
                  {Number(adjustVerifyAmount || 0) !== Number(selectedPayment.amount || 0) && (
                    <span className="text-[#F59E0B] font-medium">
                      Difference: {NAIRA}{Math.abs(Number(adjustVerifyAmount || 0) - Number(selectedPayment.amount || 0)).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {Number(adjustVerifyAmount || 0) !== Number(selectedPayment.amount || 0) ? (
                <div className="space-y-2">
                  <Label className="text-[#1F2937]">
                    Reason for adjustment <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={adjustVerifyReason}
                    onChange={(e) => setAdjustVerifyReason(e.target.value)}
                    rows={3}
                    className="rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937] focus:ring-2 focus:ring-[#10B981]"
                    placeholder="Explain why the verified amount differs from the submitted amount (e.g., Bank fees deducted, Partial payment received)..."
                  />
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
            <Button
              variant="outline"
              disabled={isVerifying}
              onClick={() => {
                setIsAdjustVerifyDialogOpen(false);
                setSelectedPayment(null);
                setAdjustVerifyReason('');
                setInvoiceData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAdjustVerify}
              disabled={isVerifying || (Number(adjustVerifyAmount || 0) !== Number(selectedPayment?.amount || 0) && !adjustVerifyReason.trim())}
              className="bg-[#10B981] hover:bg-[#059669] text-white min-w-[140px]"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
          </DialogFooter>
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
