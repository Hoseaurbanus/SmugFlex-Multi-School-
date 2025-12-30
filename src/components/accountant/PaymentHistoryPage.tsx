import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useSchool } from '../../contexts/SchoolContext';

export function PaymentHistoryPage() {
  const { payments, students } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feeTypeFilter, setFeeTypeFilter] = useState('all');

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      (payment.student_name && payment.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.reference && payment.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.receipt_number && payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesFeeType = feeTypeFilter === 'all' || payment.payment_type === feeTypeFilter;
    
    return matchesSearch && matchesStatus && matchesFeeType;
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
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Payment ID', 'Student Name', 'Receipt No', 'Fee Type', 'Amount', 'Payment Method', 'Transaction Ref', 'Status', 'Date'];
    const rows = filteredPayments.map(p => [
      p.id, p.student_name, p.receipt_number, p.payment_type, p.amount, p.payment_method, p.reference, p.status, new Date(p.recorded_date).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
                <p className="text-[#0A2540]">₦{totalRevenue.toLocaleString()}</p>
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
                <p className="text-[#0A2540]">₦{pendingAmount.toLocaleString()}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              </SelectContent>
            </Select>

            {/* Fee Type Filter */}
            <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Fee Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fee Types</SelectItem>
                <SelectItem value="Full Payment">Full Payment</SelectItem>
                <SelectItem value="Partial Payment">Partial Payment</SelectItem>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => {
                    const student = students.find(s => s.id === payment.student_id);
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
                        <TableCell className="text-[#0A2540]">₦{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell className="text-sm text-gray-600 font-mono">{payment.reference}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>{new Date(payment.recorded_date).toLocaleDateString('en-GB')}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
