// PaymentContext - Focused payment wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { Payment, FeeStructure, StudentFeeBalance, StudentInvoiceSummary } from '../../types/school';

interface PaymentDomain {
  payments: Payment[];
  feeStructures: FeeStructure[];
  studentFeeBalances: StudentFeeBalance[];
  addPayment: (payment: import('../../types/school').CreatePaymentPayload) => Promise<void>;
  updatePayment: (id: number, payment: Partial<Payment>) => Promise<void>;
  verifyPayment: (id: number, data?: { action: 'verify' | 'reject'; rejection_reason?: string; adjusted_amount?: number; adjustment_reason?: string }) => Promise<void>;
  rejectPayment: (id: number, reason: string) => Promise<void>;
  reversePayment: (id: number, reason: string) => Promise<void>;
  getPaymentsByStudent: (studentId: number) => Payment[];
  addFeeStructure: (feeStructure: Omit<FeeStructure, 'id'>) => Promise<number>;
  updateFeeStructure: (id: number, feeStructure: Partial<FeeStructure>) => Promise<void>;
  deleteFeeStructure: (id: number) => Promise<void>;
  getFeeStructures: (classId: number, academicYear: string) => FeeStructure[];
  getStudentFeeBalance: (studentId: number) => StudentFeeBalance | null;
  autoGenerateInvoices: (classId: number, term: string, academicYear: string) => Promise<{ success: boolean; message: string; count: number }>;
  getStudentInvoice: (studentId: number, term: string, academicYear: string) => Promise<StudentInvoiceSummary>;
}

const PaymentContext = createContext<PaymentDomain | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: PaymentDomain = {
    payments: school.payments,
    feeStructures: school.feeStructures,
    studentFeeBalances: school.studentFeeBalances,
    addPayment: school.addPayment,
    updatePayment: school.updatePayment,
    verifyPayment: school.verifyPayment,
    rejectPayment: school.rejectPayment,
    reversePayment: school.reversePayment,
    getPaymentsByStudent: school.getPaymentsByStudent,
    addFeeStructure: school.addFeeStructure,
    updateFeeStructure: school.updateFeeStructure,
    deleteFeeStructure: school.deleteFeeStructure,
    getFeeStructures: school.getFeeStructures,
    getStudentFeeBalance: school.getStudentFeeBalance,
    autoGenerateInvoices: school.autoGenerateInvoices,
    getStudentInvoice: school.getStudentInvoice,
  };
  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export function usePayments(): PaymentDomain {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayments must be used within PaymentProvider');
  return ctx;
}
