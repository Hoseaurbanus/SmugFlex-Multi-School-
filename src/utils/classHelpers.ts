const EARLY_CHILDHOOD_CLASSES = [
  'CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2',
  'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)',
  'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)', 'KG 2 (PEARL)'
];

export const shouldShowPosition = (className?: string): boolean => {
  if (!className) return true;
  return !EARLY_CHILDHOOD_CLASSES.includes(className.toUpperCase());
};

export const getGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
};

export const getGradeAndRemark = (score: number): { grade: string; remark: string } => {
  if (score >= 90) return { grade: 'A', remark: 'Excellent' };
  if (score >= 80) return { grade: 'B', remark: 'Very Good' };
  if (score >= 70) return { grade: 'C', remark: 'Good' };
  if (score >= 60) return { grade: 'D', remark: 'Satisfactory' };
  if (score >= 50) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
};
