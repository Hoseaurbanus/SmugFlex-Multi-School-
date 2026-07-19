// ResultsContext - Focused results wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import {
  Score, AffectiveDomain, PsychomotorDomain, CompiledResult,
  CumulativeResult
} from '../../types/school';

interface ResultsDomain {
  scores: Score[];
  compiledResults: CompiledResult[];
  cumulativeResults: CumulativeResult[];
  loadingCumulative: boolean;
  affectiveDomains: AffectiveDomain[];
  psychomotorDomains: PsychomotorDomain[];
  addScore: (score: Omit<Score, 'id'>) => Promise<number>;
  updateScore: (id: number, score: Partial<Score>) => Promise<void>;
  deleteScore: (id: number) => Promise<void>;
  createBatchScores: (batchScores: Omit<Score, 'id'>[]) => Promise<boolean>;
  getScoresByStudent: (studentId: number) => Score[];
  getScoresByAssignment: (subjectAssignmentId: number) => Score[];
  getScoresByClass: (classId: number, academicYear: string, term: string) => Score[];
  rejectScore: (scoreId: number, rejectionReason: string, rejectedBy: number) => Promise<void>;
  approveScore: (scoreId: number, approvedBy: number) => Promise<void>;
  submitScores: (assignmentId: number) => Promise<void>;
  getPendingScores: (classId?: number) => Score[];
  addCompiledResult: (result: Omit<CompiledResult, 'id'>) => Promise<number>;
  updateCompiledResult: (id: number, result: Partial<CompiledResult>) => Promise<void>;
  deleteCompiledResult: (id: number) => Promise<void>;
  getCompiledResults: (academicYear: string, term: string) => CompiledResult[];
  getResultsByClass: (classId: number, academicYear: string, term: string) => CompiledResult[];
  getResultsByStudent: (studentId: number, academicYear: string, term: string) => CompiledResult[];
  approveCompiledResult: (id: number) => Promise<void>;
  publishCompiledResult: (id: number) => Promise<void>;
  getPendingApprovals: () => any[];
  loadCumulativeResultsFromAPI: (classId: number, academicYear: string) => Promise<CumulativeResult[]>;
  compileCumulativeResults: (classId: number, academicYear: string) => Promise<{ success: boolean; message: string; count: number }>;
  addAffectiveDomain: (affectiveData: any) => Promise<any>;
  updateAffectiveDomain: (id: number, affectiveData: any) => Promise<any>;
  deleteAffectiveDomain: (id: number) => Promise<any>;
  addPsychomotorDomain: (psychomotorData: any) => Promise<any>;
  updatePsychomotorDomain: (id: number, psychomotorData: any) => Promise<any>;
  deletePsychomotorDomain: (id: number) => Promise<any>;
}

const ResultsContext = createContext<ResultsDomain | null>(null);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: ResultsDomain = {
    scores: school.scores,
    compiledResults: school.compiledResults,
    cumulativeResults: school.cumulativeResults,
    loadingCumulative: school.loadingCumulative,
    affectiveDomains: school.affectiveDomains,
    psychomotorDomains: school.psychomotorDomains,
    addScore: school.addScore,
    updateScore: school.updateScore,
    deleteScore: school.deleteScore,
    createBatchScores: school.createBatchScores,
    getScoresByStudent: school.getScoresByStudent,
    getScoresByAssignment: school.getScoresByAssignment,
    getScoresByClass: school.getScoresByClass,
    rejectScore: school.rejectScore,
    approveScore: school.approveScore,
    submitScores: school.submitScores,
    getPendingScores: school.getPendingScores,
    addCompiledResult: school.addCompiledResult,
    updateCompiledResult: school.updateCompiledResult,
    deleteCompiledResult: school.deleteCompiledResult,
    getCompiledResults: school.getCompiledResults,
    getResultsByClass: school.getResultsByClass,
    getResultsByStudent: school.getResultsByStudent,
    approveCompiledResult: school.approveCompiledResult,
    publishCompiledResult: school.publishCompiledResult,
    getPendingApprovals: school.getPendingApprovals,
    loadCumulativeResultsFromAPI: school.loadCumulativeResultsFromAPI,
    compileCumulativeResults: school.compileCumulativeResults,
    addAffectiveDomain: school.addAffectiveDomain,
    updateAffectiveDomain: school.updateAffectiveDomain,
    deleteAffectiveDomain: school.deleteAffectiveDomain,
    addPsychomotorDomain: school.addPsychomotorDomain,
    updatePsychomotorDomain: school.updatePsychomotorDomain,
    deletePsychomotorDomain: school.deletePsychomotorDomain,
  };
  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

export function useResults(): ResultsDomain {
  const ctx = useContext(ResultsContext);
  if (!ctx) throw new Error('useResults must be used within ResultsProvider');
  return ctx;
}
