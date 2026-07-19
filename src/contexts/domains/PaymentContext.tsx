// PaymentContext - Focused payment wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { Payment, FeeStructure, StudentFeeBalance, Scholarship, CreatePaymentPayload, StudentInvoiceSummary } from '../../types/school';

interface PaymentDomain {
  payments: Payment[];
  feeStructures: FeeStructure[];
  studentFeeBalances: StudentFeeBalance[];
  scholarships: Scholarship[];
  addPayment: (payment: CreatePaymentPayload) => Promise<any>;
  updatePayment: (id: number, payment: Partial<Payment>) => Promise<void>;
  verifyPayment: (id: number, data?: { action: 'verify' | 'reject'; rejection_reason?: string; adjusted_amount?: number; adjustment_reason?: string }) => Promise<void>;
  rejectPayment: (id: number, reason: string) => Promise<void>;
  reversePayment: (id: number, reason: string) => Promise<void>;
  getPaymentsByStudent: (studentId: number) => Payment[];
  addFeeStructure: (feeStructure: any) => Promise<number>;
  updateFeeStructure: (id: number, feeStructure: Partial<FeeStructure>) => Promise<void>;
  deleteFeeStructure: (id: number) => Promise<void>;
  getFeeStructures: (classId: number, academicYear: string) => FeeStructure[];
  getStudentFeeBalance: (studentId: number) => StudentFeeBalance | null;
  addScholarship: (scholarship: Omit<Scholarship, 'id'>) => Promise<number>;
  updateScholarship: (id: number, scholarship: Partial<Scholarship>) => Promise<void>;
  deleteScholarship: (id: number) => Promise<void>;
  getScholarships: () => Scholarship[];
  autoGenerateInvoices: (classId: number, term: string, academicYear: string) => Promise<any>;
  getStudentInvoice: (studentId: number, term: string, academicYear: string) => Promise<StudentInvoiceSummary>;
}

const PaymentContext = createContext<PaymentDomain | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: PaymentDomain = {
    payments: school.payments,
    feeStructures: school.feeStructures,
    studentFeeBalances: school.studentFeeBalances,
    scholarships: school.scholarships,
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
    addScholarship: school.addScholarship,
    updateScholarship: school.updateScholarship,
    deleteScholarship: school.deleteScholarship,
    getScholarships: school.getScholarships,
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
