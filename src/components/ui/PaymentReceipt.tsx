import { Payment } from '../../contexts/SchoolContext';
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Printer, Download } from "lucide-react";

// Naira symbol constant for reliable display
const NAIRA = "₦";

interface PaymentReceiptProps {
  payment: Payment;
  studentName?: string;
  studentClassName?: string;
  className?: string;
}

export function PaymentReceipt({ payment, studentName, studentClassName, className = '' }: PaymentReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a temporary element for receipt content
    const receiptElement = document.getElementById('payment-receipt');
    if (!receiptElement) return;

    // Use html2canvas or similar library for PDF generation
    // For now, we'll trigger print which can save as PDF
    window.print();
  };

  const transactionReference = (payment as any).transaction_reference || (payment as any).reference || '';
  const studentClass = studentClassName || (payment as any).class_name || 'N/A';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Print Actions */}
      <div className="flex gap-2 no-print">
        <Button onClick={handlePrint} size="sm" variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
        <Button onClick={handleDownload} size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Receipt Content */}
      <div 
        id="payment-receipt" 
        className="bg-white border-2 border-gray-300 rounded-lg p-8 max-w-2xl mx-auto print:shadow-none print:border-black"
        style={{ minHeight: '11in', width: '8.5in' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <img 
              src="/school-logo.png" 
              alt="School Logo" 
              className="h-16 mx-auto mb-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            GRACELAND ROYAL ACADEMY
          </h1>
          <p className="text-gray-600 mb-1">
            School Fee Payment Receipt
          </p>
          <div className="w-32 h-1 bg-blue-600 mx-auto"></div>
        </div>

        {/* Receipt Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Receipt Number:</p>
            <p className="font-semibold text-lg">{payment.receipt_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Payment Date:</p>
            <p className="font-semibold">{formatDate(payment.recorded_date)}</p>
          </div>
        </div>

        {/* Student Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Student Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Student Name:</p>
              <p className="font-medium">{studentName || payment.student_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Class:</p>
              <p className="font-medium">{studentClass}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Term:</p>
              <p className="font-medium">{payment.term}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Academic Year:</p>
              <p className="font-medium">{payment.academic_year}</p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2">Payment Type</th>
                <th className="text-left py-2">Method</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3">{payment.payment_type}</td>
                <td className="py-3">{payment.payment_method}</td>
                <td className="py-3 text-right font-semibold">{NAIRA}{payment.amount.toLocaleString()}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={2} className="py-3 font-bold text-lg">Total Paid:</td>
                <td className="py-3 text-right font-bold text-lg">{NAIRA}{payment.amount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Transaction Reference */}
        {transactionReference && (
          <div className="mb-6">
            <p className="text-sm text-gray-500">Transaction Reference:</p>
            <p className="font-mono text-sm">{transactionReference}</p>
          </div>
        )}

        {/* Verification Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            payment.status === 'Verified' 
              ? 'bg-green-100 text-green-800' 
              : payment.status === 'Pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            Status: {payment.status}
          </div>
          {payment.verified_date && (
            <p className="text-sm text-gray-500 mt-1">
              Verified on: {formatDate(payment.verified_date)}
            </p>
          )}
        </div>

        {/* Bank Details for Transfer */}
        {payment.payment_method === 'Bank Transfer' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Bank Transfer Details</h3>
            <div className="text-sm text-blue-800">
              <p><strong>Bank:</strong> Bank details to be provided by school administration</p>
              <p><strong>Account Name:</strong> Please contact school for account information</p>
              <p><strong>Account Number:</strong> Available from school administration</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-2">Received By:</p>
              <div className="border-b-2 border-gray-400 pb-1">
                <p className="font-medium">_________________________</p>
                <p className="text-sm text-gray-600">Signature & Date</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">School Stamp:</p>
              <div className="border-b-2 border-gray-400 pb-1 h-12"></div>
            </div>
          </div>
          
          <div className="text-center mt-6 text-sm text-gray-500">
            <p>Thank you for your payment!</p>
            <p>This receipt is computer generated and does not require a signature</p>
            <p>For inquiries, please contact the school administration</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          #payment-receipt {
            box-shadow: none !important;
            border: 2px solid black !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
