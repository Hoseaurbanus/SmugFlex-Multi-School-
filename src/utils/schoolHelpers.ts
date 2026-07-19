// SMugFlex 2.0 - School Helper Functions
// Pure functions extracted from SchoolContext.tsx

export const calculateGrade = (total: number): string => {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  if (total >= 50) return 'E';
  return 'F';
};

export const getRemark = (grade: string): string => {
  const remarks: { [key: string]: string } = {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Satisfactory',
    E: 'Fair',
    F: 'Fail',
  };
  return remarks[grade] || 'N/A';
};

export const normalizeParentStudentLink = (link: any) => {
  if (!link || typeof link !== 'object') return link;
  const parent_id = link.parent_id ?? link.parentId ?? link.parentID;
  const student_id = link.student_id ?? link.studentId ?? link.studentID;
  return {
    ...link,
    parent_id,
    student_id,
    relationship: link.relationship ?? link.relationshipType ?? link.relation,
    is_primary: link.is_primary ?? link.isPrimary ?? link.primary,
    created_at: link.created_at ?? link.createdAt,
    updated_at: link.updated_at ?? link.updatedAt,
  };
};

export const normalizeParentStudentLinks = (links: any[]) => {
  const safe = Array.isArray(links) ? links : [];
  return safe.map(normalizeParentStudentLink);
};
