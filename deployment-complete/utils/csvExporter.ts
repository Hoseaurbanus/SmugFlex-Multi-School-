/**
 * Enhanced CSV Export Utilities for Graceland Royal Academy
 * Generate CSV files from real SQL database data
 */

import sqlDatabase from '../services/sqlDatabase';

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return '';

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle values with commas, quotes, and newlines
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export students from real SQL database to CSV
 */
export async function exportStudentsToCSV(filename?: string): Promise<void> {
  try {
    const students = await sqlDatabase.getStudents();
    
    const headers = [
      'admissionNumber',
      'firstName',
      'lastName',
      'otherName',
      'gender',
      'dateOfBirth',
      'className',
      'level',
      'status',
      'parentName',
      'parentPhone',
      'academicYear',
      'admissionDate'
    ];
    
    // Map database fields to CSV format matching the simplified table structure
    const data = students.map(s => ({
      admissionNumber: s.admission_number || '',
      firstName: s.first_name || '',
      lastName: s.last_name || '',
      otherName: s.other_name || '',
      gender: s.gender || '',
      dateOfBirth: s.date_of_birth || '',
      className: s.class_name || '',
      level: s.level || '',
      status: s.status || '',
      parentName: s.parent_name || '',
      parentPhone: s.parent_phone || '',
      academicYear: s.academic_year || '',
      admissionDate: s.admission_date || ''
    }));
    
    const csv = convertToCSV(data, headers);
    downloadCSV(csv, filename || `students_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    throw error;
  }
}

/**
 * Export teachers from real SQL database to CSV
 */
export async function exportTeachersToCSV(filename?: string): Promise<void> {
  try {
    const teachers = await sqlDatabase.getTeachers();
    
    const headers = [
      'id',
      'firstName',
      'lastName',
      'otherName',
      'gender',
      'employeeId',
      'email',
      'phone',
      'qualification',
      'specialization',
      'status',
      'isClassTeacher'
    ];
    
    // Map database fields to CSV format
    const data = teachers.map(t => ({
      ...t,
      firstName: t.first_name,
      lastName: t.last_name,
      otherName: t.other_name || '',
      employeeId: t.employee_id,
      gender: t.gender || '',
      specialization: Array.isArray(t.specialization) ? t.specialization.join('; ') : 
                      (typeof t.specialization === 'string' ? t.specialization : ''),
      status: t.status,
      isClassTeacher: t.is_class_teacher ? 'true' : 'false'
    }));
    
    const csv = convertToCSV(data, headers);
    downloadCSV(csv, filename || `teachers_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    throw error;
  }
}

/**
 * Export classes from real SQL database to CSV
 */
export async function exportClassesToCSV(filename?: string): Promise<void> {
  try {
    const classes = await sqlDatabase.getClasses();
    
    const headers = [
      'id',
      'name',
      'level',
      'section',
      'capacity',
      'classTeacherId',
      'status'
    ];
    
    // Map database fields to CSV format
    const data = classes.map(c => ({
      ...c,
      classTeacherId: c.class_teacher_id || '',
      status: c.status
    }));
    
    const csv = convertToCSV(data, headers);
    downloadCSV(csv, filename || `classes_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    throw error;
  }
}

/**
 * Export subjects from real SQL database to CSV
 */
export async function exportSubjectsToCSV(filename?: string): Promise<void> {
  try {
    const subjects = await sqlDatabase.getSubjects();
    
    const headers = [
      'id',
      'name',
      'category',
      'subjectType',
      'description',
      'status',
      'isCore'
    ];
    
    // Map database fields to CSV format
    const data = subjects.map(s => ({
      ...s,
      subjectType: s.subject_type || 'Elective',
      isCore: s.is_core ? 'true' : 'false',
      status: s.status
    }));
    
    const csv = convertToCSV(data, headers);
    downloadCSV(csv, filename || `subjects_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    throw error;
  }
}

/**
 * Export parents from real SQL database to CSV
 */
export async function exportParentsToCSV(filename?: string): Promise<void> {
  try {
    const parents = await sqlDatabase.getParents();
    
    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'alternatePhone',
      'address',
      'occupation',
      'status'
    ];
    
    // Map database fields to CSV format
    const data = parents.map(p => ({
      ...p,
      firstName: p.first_name,
      lastName: p.last_name,
      alternatePhone: p.alternate_phone || '',
      address: p.address || '',
      occupation: p.occupation || '',
      status: p.status
    }));
    
    const csv = convertToCSV(data, headers);
    downloadCSV(csv, filename || `parents_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    throw error;
  }
}

/**
 * Export scores to CSV
 */
export function exportScoresToCSV(scores: any[], students: any[], filename?: string): void {
  const headers = [
    'studentName',
    'admissionNumber',
    'subjectName',
    'ca1',
    'ca2',
    'exam',
    'total',
    'grade',
    'remark',
    'classAverage',
    'status'
  ];
  
  const data = scores.map(score => {
    const student = students.find(s => s.id === score.studentId);
    return {
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      subjectName: score.subjectName,
      ca1: score.ca1,
      ca2: score.ca2,
      exam: score.exam,
      total: score.total,
      grade: score.grade,
      remark: score.remark,
      classAverage: score.classAverage,
      status: score.status
    };
  });
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, filename || `scores_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export compiled results to CSV
 */
export function exportCompiledResultsToCSV(results: any[], students: any[], filename?: string): void {
  const headers = [
    'studentName',
    'admissionNumber',
    'className',
    'term',
    'academicYear',
    'totalScore',
    'averageScore',
    'position',
    'totalStudents',
    'timesPresent',
    'timesAbsent',
    'status',
    'classTeacherComment'
  ];
  
  const data = results.map(result => {
    const student = students.find(s => s.id === result.studentId);
    return {
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      className: student?.className || '',
      term: result.term,
      academicYear: result.academicYear,
      totalScore: result.totalScore,
      averageScore: result.averageScore,
      position: result.position,
      totalStudents: result.totalStudents,
      timesPresent: result.timesPresent,
      timesAbsent: result.timesAbsent,
      status: result.status,
      classTeacherComment: result.classTeacherComment || ''
    };
  });
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, filename || `results_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export payments to CSV
 */
export function exportPaymentsToCSV(payments: any[], students: any[], filename?: string): void {
  const headers = [
    'receiptNumber',
    'studentName',
    'admissionNumber',
    'className',
    'term',
    'academicYear',
    'amount',
    'paymentMethod',
    'paymentDate',
    'status',
    'verifiedBy',
    'verifiedDate'
  ];
  
  const data = payments.map(payment => {
    const student = students.find(s => s.id === payment.studentId);
    return {
      receiptNumber: payment.receiptNumber,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      className: student?.className || '',
      term: payment.term,
      academicYear: payment.academicYear,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      status: payment.status,
      verifiedBy: payment.verifiedBy || '',
      verifiedDate: payment.verifiedDate || ''
    };
  });
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, filename || `payments_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export fee balances to CSV
 */
export function exportFeeBalancesToCSV(balances: any[], students: any[], filename?: string): void {
  const headers = [
    'studentName',
    'admissionNumber',
    'className',
    'term',
    'academicYear',
    'totalFeeRequired',
    'totalPaid',
    'balance',
    'status'
  ];
  
  const data = balances.map(balance => {
    const student = students.find(s => s.id === balance.studentId);
    return {
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      className: student?.className || '',
      term: balance.term,
      academicYear: balance.academicYear,
      totalFeeRequired: balance.totalFeeRequired,
      totalPaid: balance.totalPaid,
      balance: balance.balance,
      status: balance.status
    };
  });
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, filename || `fee_balances_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export attendance to CSV
 */
export function exportAttendanceToCSV(attendance: any[], students: any[], filename?: string): void {
  const headers = [
    'date',
    'studentName',
    'admissionNumber',
    'className',
    'status',
    'remarks'
  ];
  
  const data = attendance.map(record => {
    const student = students.find(s => s.id === record.studentId);
    return {
      date: record.date,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      className: student?.className || '',
      status: record.status,
      remarks: record.remarks || ''
    };
  });
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, filename || `attendance_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export activity logs to CSV
 */
export function exportActivityLogsToCSV(logs: any[], filename?: string): void {
  const headers = [
    'timestamp',
    'userId',
    'username',
    'role',
    'action',
    'details',
    'ipAddress'
  ];
  
  const csv = convertToCSV(logs, headers);
  downloadCSV(csv, filename || `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export debtor list to CSV
 */
export function exportDebtorListToCSV(debtors: any[], filename?: string): void {
  const headers = [
    'studentName',
    'admissionNumber',
    'className',
    'parentName',
    'parentPhone',
    'totalFeeRequired',
    'totalPaid',
    'balance',
    'term',
    'academicYear'
  ];
  
  const csv = convertToCSV(debtors, headers);
  downloadCSV(csv, filename || `debtors_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export class broadsheet to CSV
 */
export function exportBroadsheetToCSV(broadsheet: any[], filename?: string): void {
  if (!broadsheet || broadsheet.length === 0) return;
  
  // Dynamic headers based on subjects
  const firstRow = broadsheet[0];
  const headers = [
    'position',
    'studentName',
    'admissionNumber',
    ...Object.keys(firstRow.subjects || {}),
    'total',
    'average',
    'grade'
  ];
  
  const data = broadsheet.map(row => ({
    position: row.position,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    ...row.subjects,
    total: row.total,
    average: row.average,
    grade: row.grade
  }));
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, filename || `broadsheet_${new Date().toISOString().split('T')[0]}.csv`);
}
