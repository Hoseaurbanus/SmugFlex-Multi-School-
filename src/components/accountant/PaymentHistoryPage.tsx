import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useSchool } from '../../contexts/SchoolContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const NAIRA = "\u20A6";

export function PaymentHistoryPage() {
  const { payments, students, reversePayment, currentTerm, currentAcademicYear, loadPaymentsFromAPI } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feeTypeFilter, setFeeTypeFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [isReversing, setIsReversing] = useState(false);

  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  const academicYears = useMemo(() => {
    const years = Array.from(new Set(payments.map(p => p.academic_year).filter(Boolean)));
    if (currentAcademicYear && !years.includes(currentAcademicYear)) {
      years.unshift(currentAcademicYear);
    }
    return years.sort();
  }, [payments, currentAcademicYear]);

  useEffect(() => {
    if (loadPaymentsFromAPI) {
      loadPaymentsFromAPI(true).catch(() => {
        // failed full-history load is non-blocking
      });
    }
  }, [loadPaymentsFromAPI]);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      (payment.student_name && payment.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.transaction_reference && payment.transaction_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.receipt_number && payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesFeeType = feeTypeFilter === 'all' || payment.payment_type === feeTypeFilter;
    const matchesTerm = termFilter === 'all' || payment.term === termFilter;
    const matchesYear = academicYearFilter === 'all' || payment.academic_year === academicYearFilter;
    
    return matchesSearch && matchesStatus && matchesFeeType && matchesTerm && matchesYear;
  });

  const totalRevenue = payments.filter(p => p.status === 'Verified').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
  const completedCount = payments.filter(p => p.status === 'Verified').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><span className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><span className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><span className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'Reversed':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300"><span className="w-3 h-3 mr-1" />Reversed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const openReverseDialog = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setReverseReason('');
    setIsReverseDialogOpen(true);
  };

  const handleConfirmReverse = async () => {
    if (!selectedPaymentId) {
      toast.error('No payment selected');
      return;
    }
    if (!reverseReason.trim()) {
      toast.error('Reversal reason is required');
      return;
    }

    setIsReversing(true);
    try {
      await reversePayment(selectedPaymentId, reverseReason.trim());
      toast.success('Payment reversed successfully');
      setIsReverseDialogOpen(false);
      setSelectedPaymentId(null);
      setReverseReason('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reverse payment');
    } finally {
      setIsReversing(false);
    }
  };

  const exportToCSV = () => {
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Payment ID', 'Student Name', 'Receipt No', 'Fee Type', 'Amount', 'Payment Method', 'Transaction Ref', 'Status', 'Date', 'Term', 'Academic Year'];
    const rows = filteredPayments.map(p => [
      escapeCSV(p.id),
      escapeCSV(p.student_name),
      escapeCSV(p.receipt_number),
      escapeCSV(p.payment_type),
      escapeCSV(p.amount),
      escapeCSV(p.payment_method),
      escapeCSV(p.transaction_reference || p.reference),
      escapeCSV(p.status),
      escapeCSV(new Date(p.recorded_date).toLocaleDateString()),
      escapeCSV(p.term),
      escapeCSV(p.academic_year)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#0A2540] mb-2">Payment History</h1>
        <p className="text-gray-600">View and manage all payment transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Revenue</p>
                <p className="text-[#0A2540]">{NAIRA}{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Pending Payments</p>
                <p className="text-[#0A2540]">{NAIRA}{pendingAmount.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Completed Transactions</p>
                <p className="text-[#0A2540]">{completedCount}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, ID, or ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#0A2540]/20 focus:border-[#FFD700] rounded-xl"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>

            {/* Fee Type Filter */}
            <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Fee Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fee Types</SelectItem>
                <SelectItem value="School Fees">School Fees</SelectItem>
                <SelectItem value="Examination Fees">Examination Fees</SelectItem>
                <SelectItem value="Books">Books</SelectItem>
                <SelectItem value="Uniform">Uniform</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>

            {/* Term Filter */}
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="First Term">First Term</SelectItem>
                <SelectItem value="Second Term">Second Term</SelectItem>
                <SelectItem value="Third Term">Third Term</SelectItem>
              </SelectContent>
            </Select>

            {/* Academic Year Filter */}
            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button 
              onClick={exportToCSV}
              className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A2540]/5">
                  <TableHead className="text-[#0A2540]">Payment ID</TableHead>
                  <TableHead className="text-[#0A2540]">Student</TableHead>
                  <TableHead className="text-[#0A2540]">Receipt No.</TableHead>
                  <TableHead className="text-[#0A2540]">Fee Type</TableHead>
                  <TableHead className="text-[#0A2540]">Amount</TableHead>
                  <TableHead className="text-[#0A2540]">Payment Method</TableHead>
                  <TableHead className="text-[#0A2540]">Transaction Ref</TableHead>
                  <TableHead className="text-[#0A2540]">Status</TableHead>
                  <TableHead className="text-[#0A2540]">Date</TableHead>
                  <TableHead className="text-[#0A2540] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => {
                    const student = students.find(s => s.id === payment.student_id);
                    const canReverse = payment.status === 'Verified' && payment.payment_method !== 'Reversal';
                    return (
                      <TableRow key={payment.id} className="hover:bg-[#0A2540]/5">
                        <TableCell className="text-[#0A2540]">PAY{String(payment.id).padStart(3, '0')}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-[#0A2540]">{payment.student_name}</p>
                            <p className="text-sm text-gray-500">{student?.admissionNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 font-mono">{payment.receipt_number}</TableCell>
                        <TableCell>{payment.payment_type}</TableCell>
                        <TableCell className="text-[#0A2540]">{NAIRA}{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell className="text-sm text-gray-600 font-mono">{payment.transaction_reference || payment.reference}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>{new Date(payment.recorded_date).toLocaleDateString('en-GB')}</TableCell>
                        <TableCell className="text-right">
                          {canReverse ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openReverseDialog(payment.id)}
                            >
                              Reverse
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReverseDialogOpen} onOpenChange={setIsReverseDialogOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Reverse Payment</DialogTitle>
          <DialogDescription>Provide a reason for reversing this payment.</DialogDescription>
        </DialogHeader>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-[#0A2540]">Reverse Payment</h3>
              <p className="text-sm text-gray-600">This will create a reversal entry and mark the original payment as reversed.</p>
            </div>

            <Textarea
              placeholder="Reason for reversal"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              className="border-[#0A2540]/20 focus:border-[#FFD700] rounded-xl min-h-[100px]"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsReverseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
                onClick={handleConfirmReverse}
                disabled={isReversing}
              >
                {isReversing ? 'Reversing...' : 'Confirm Reversal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
