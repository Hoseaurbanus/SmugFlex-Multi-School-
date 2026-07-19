// CbtContext - Focused CBT wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { CbtExam, CbtQuestion, CbtAttempt, CbtQuestionBank } from '../../types/school';

interface CbtDomain {
  cbtExams: CbtExam[];
  cbtQuestions: CbtQuestion[];
  cbtAttempts: CbtAttempt[];
  cbtQuestionBank: CbtQuestionBank[];
  loadCbtExamsFromAPI: () => Promise<boolean>;
  loadCbtQuestionsFromAPI: (examId: number) => Promise<boolean>;
  loadCbtAttemptsFromAPI: (examId?: number) => Promise<boolean>;
  loadCbtQuestionBankFromAPI: (params?: Record<string, any>) => Promise<boolean>;
  createCbtExam: (exam: Omit<CbtExam, 'id' | 'total_marks' | 'published' | 'status' | 'created_at'>) => Promise<number>;
  updateCbtExam: (id: number, exam: Partial<CbtExam>) => Promise<void>;
  deleteCbtExam: (id: number) => Promise<void>;
  publishCbtExam: (id: number) => Promise<void>;
  addCbtQuestion: (examId: number, question: any) => Promise<number>;
  updateCbtQuestion: (examId: number, questionId: number, question: any) => Promise<void>;
  deleteCbtQuestion: (examId: number, questionId: number) => Promise<void>;
  reorderCbtQuestions: (examId: number, order: {question_id: number; sort_order: number}[]) => Promise<void>;
  addToCbtQuestionBank: (question: any) => Promise<number>;
  deleteFromCbtQuestionBank: (id: number) => Promise<void>;
  importFromCbtBank: (examId: number, questionIds: number[]) => Promise<any>;
  startCbtAttempt: (examId: number) => Promise<any>;
  saveCbtAnswer: (attemptId: number, questionId: number, answer: any) => Promise<void>;
  submitCbtAttempt: (attemptId: number, tabSwitchCount?: number) => Promise<any>;
  getCbtAttemptDetail: (attemptId: number) => Promise<any>;
  getCbtExamResults: (examId: number) => Promise<any>;
  feedCbtExamScores: (examId: number, scoreSlot: string) => Promise<any>;
  bulkImportQuestions: (examId: number, questions: any[]) => Promise<any>;
  generateQuestionsFromMaterial: (materialText: string, questionType: string, count: number, options?: { difficulty?: string; exam_type?: string; topic?: string; include_explanations?: boolean }) => Promise<any>;
}

const CbtContext = createContext<CbtDomain | null>(null);

export function CbtProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: CbtDomain = {
    cbtExams: school.cbtExams,
    cbtQuestions: school.cbtQuestions,
    cbtAttempts: school.cbtAttempts,
    cbtQuestionBank: school.cbtQuestionBank,
    loadCbtExamsFromAPI: school.loadCbtExamsFromAPI,
    loadCbtQuestionsFromAPI: school.loadCbtQuestionsFromAPI,
    loadCbtAttemptsFromAPI: school.loadCbtAttemptsFromAPI,
    loadCbtQuestionBankFromAPI: school.loadCbtQuestionBankFromAPI,
    createCbtExam: school.createCbtExam,
    updateCbtExam: school.updateCbtExam,
    deleteCbtExam: school.deleteCbtExam,
    publishCbtExam: school.publishCbtExam,
    addCbtQuestion: school.addCbtQuestion,
    updateCbtQuestion: school.updateCbtQuestion,
    deleteCbtQuestion: school.deleteCbtQuestion,
    reorderCbtQuestions: school.reorderCbtQuestions,
    addToCbtQuestionBank: school.addToCbtQuestionBank,
    deleteFromCbtQuestionBank: school.deleteFromCbtQuestionBank,
    importFromCbtBank: school.importFromCbtBank,
    startCbtAttempt: school.startCbtAttempt,
    saveCbtAnswer: school.saveCbtAnswer,
    submitCbtAttempt: school.submitCbtAttempt,
    getCbtAttemptDetail: school.getCbtAttemptDetail,
    getCbtExamResults: school.getCbtExamResults,
    feedCbtExamScores: school.feedCbtExamScores,
    bulkImportQuestions: school.bulkImportQuestions,
    generateQuestionsFromMaterial: school.generateQuestionsFromMaterial,
  };
  return <CbtContext.Provider value={value}>{children}</CbtContext.Provider>;
}

export function useCbt(): CbtDomain {
  const ctx = useContext(CbtContext);
  if (!ctx) throw new Error('useCbt must be used within CbtProvider');
  return ctx;
}
