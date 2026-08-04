// CbtContext - Focused CBT wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { CbtExam, CbtQuestion, CbtAttempt, CbtQuestionBank } from '../../types/school';

interface CbtQuestionInput {
  question_type: string;
  question_text: string;
  options?: string[];
  correct_answer?: string | string[];
  marks: number;
  sort_order?: number;
}

interface CbtDomain {
  cbtExams: CbtExam[];
  cbtQuestions: CbtQuestion[];
  cbtAttempts: CbtAttempt[];
  cbtQuestionBank: CbtQuestionBank[];
  loadCbtExamsFromAPI: () => Promise<boolean>;
  loadCbtQuestionsFromAPI: (examId: number) => Promise<boolean>;
  loadCbtAttemptsFromAPI: (examId?: number) => Promise<boolean>;
  loadCbtQuestionBankFromAPI: (params?: Record<string, string | number>) => Promise<boolean>;
  createCbtExam: (exam: Omit<CbtExam, 'id' | 'total_marks' | 'published' | 'status' | 'created_at'>) => Promise<number>;
  updateCbtExam: (id: number, exam: Partial<CbtExam>) => Promise<void>;
  deleteCbtExam: (id: number) => Promise<void>;
  publishCbtExam: (id: number) => Promise<void>;
  addCbtQuestion: (examId: number, question: Omit<CbtQuestion, 'id'>) => Promise<number>;
  updateCbtQuestion: (examId: number, questionId: number, question: Partial<CbtQuestion>) => Promise<void>;
  deleteCbtQuestion: (examId: number, questionId: number) => Promise<void>;
  reorderCbtQuestions: (examId: number, order: {question_id: number; sort_order: number}[]) => Promise<void>;
  addToCbtQuestionBank: (question: Omit<CbtQuestionBank, 'id'>) => Promise<number>;
  deleteFromCbtQuestionBank: (id: number) => Promise<void>;
  importFromCbtBank: (examId: number, questionIds: number[]) => Promise<{ imported: number; skipped: number }>;
  startCbtAttempt: (examId: number) => Promise<CbtAttempt>;
  saveCbtAnswer: (attemptId: number, questionId: number, answer: string | string[]) => Promise<void>;
  submitCbtAttempt: (attemptId: number, tabSwitchCount?: number) => Promise<CbtAttempt>;
  getCbtAttemptDetail: (attemptId: number) => Promise<CbtAttempt>;
  getCbtExamResults: (examId: number) => Promise<CbtAttempt[]>;
  feedCbtExamScores: (examId: number, scoreSlot: string) => Promise<{ success: boolean }>;
  bulkImportQuestions: (examId: number, questions: Omit<CbtQuestion, 'id'>[]) => Promise<{ imported: number; errors: string[] }>;
  generateQuestionsFromMaterial: (materialText: string, questionType: string, count: number, options?: { difficulty?: string; exam_type?: string; topic?: string; include_explanations?: boolean }) => Promise<CbtQuestionInput[]>;
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
