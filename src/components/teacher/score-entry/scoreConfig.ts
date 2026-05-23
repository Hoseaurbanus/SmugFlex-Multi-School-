export const CA1_MAX = 20;
export const CA2_MAX = 20;
export const EXAM_MAX = 60;
export const CRECHE_EXAM_MAX = 100;
export const TOTAL_MAX = 100;

export function getGrade(total: number): string {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  if (total >= 50) return 'E';
  return 'F';
}

export function getRemark(total: number): string {
  if (total >= 90) return 'Excellent';
  if (total >= 80) return 'Very Good';
  if (total >= 70) return 'Good';
  if (total >= 60) return 'Satisfactory';
  if (total >= 50) return 'Fair';
  return 'Fail';
}

export function calculateTotal(ca1: string, ca2: string, exam: string, isCreche: boolean) {
  if (isCreche) {
    const examNum = parseFloat(exam) || 0;
    return { total: examNum };
  }
  const ca1Num = parseFloat(ca1) || 0;
  const ca2Num = parseFloat(ca2) || 0;
  const examNum = parseFloat(exam) || 0;
  return { total: ca1Num + ca2Num + examNum };
}

export function getScoreStatusBadge(data: { ca1?: string; ca2?: string; exam?: string }, isCreche: boolean) {
  if (isCreche) {
    if (data.exam && data.exam !== '') return { label: 'Complete', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { label: 'Missing', className: 'bg-gray-100 text-gray-500 border-gray-200' };
  }
  const hasCa1 = data.ca1 && data.ca1 !== '';
  const hasCa2 = data.ca2 && data.ca2 !== '';
  const hasExam = data.exam && data.exam !== '';
  const count = [hasCa1, hasCa2, hasExam].filter(Boolean).length;
  if (count === 3) return { label: 'Complete', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (count > 0) return { label: 'Partial', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Missing', className: 'bg-gray-100 text-gray-500 border-gray-200' };
}

export function getPerformanceColor(total: number) {
  if (total >= 70) return 'text-emerald-600';
  if (total >= 60) return 'text-blue-600';
  if (total >= 50) return 'text-yellow-600';
  if (total >= 40) return 'text-orange-600';
  return 'text-red-600';
}
