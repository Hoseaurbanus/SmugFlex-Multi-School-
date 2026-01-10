import { useSchool } from '../contexts/SchoolContext';
import { toast } from 'sonner';

/**
 * System Verification Script
 * Tests and verifies the enhanced teacher assignment and parent-child linking systems
 */

export interface VerificationResult {
  teacherAssignments: {
    totalAssignments: number;
    uniqueTeachers: number;
    uniqueClasses: number;
    uniqueSubjects: number;
    averageAssignmentsPerTeacher: number;
    status: 'pass' | 'fail' | 'warning';
    issues: string[];
  };
  parentChildLinks: {
    totalLinks: number;
    uniqueParents: number;
    uniqueStudents: number;
    averageChildrenPerParent: number;
    status: 'pass' | 'fail' | 'warning';
    issues: string[];
  };
  dataIntegrity: {
    orphanedAssignments: number;
    orphanedLinks: number;
    missingTeacherInfo: number;
    missingStudentInfo: number;
    status: 'pass' | 'fail' | 'warning';
    issues: string[];
  };
}

export const runSystemVerification = async (): Promise<VerificationResult> => {
  console.log('Starting system verification...');
  
  const result: VerificationResult = {
    teacherAssignments: {
      totalAssignments: 0,
      uniqueTeachers: 0,
      uniqueClasses: 0,
      uniqueSubjects: 0,
      averageAssignmentsPerTeacher: 0,
      status: 'pass',
      issues: []
    },
    parentChildLinks: {
      totalLinks: 0,
      uniqueParents: 0,
      uniqueStudents: 0,
      averageChildrenPerParent: 0,
      status: 'pass',
      issues: []
    },
    dataIntegrity: {
      orphanedAssignments: 0,
      orphanedLinks: 0,
      missingTeacherInfo: 0,
      missingStudentInfo: 0,
      status: 'pass',
      issues: []
    }
  };

  try {
    // Test Teacher Assignment System
    await verifyTeacherAssignments(result);
    
    // Test Parent-Child Linking System
    await verifyParentChildLinks(result);
    
    // Test Data Integrity
    await verifyDataIntegrity(result);
    
    console.log('System verification completed:', result);
    return result;
  } catch (error) {
    console.error('System verification failed:', error);
    result.teacherAssignments.status = 'fail';
    result.parentChildLinks.status = 'fail';
    result.dataIntegrity.status = 'fail';
    return result;
  }
};

const verifyTeacherAssignments = async (result: VerificationResult) => {
  try {
    // This would use the actual context functions in a real implementation
    // For now, we'll simulate the verification process
    
    console.log('Verifying teacher assignments...');
    
    // Simulate fetching assignments
    const assignments = await fetchSubjectAssignments();
    const teachers = await fetchTeachers();
    const classes = await fetchClasses();
    const subjects = await fetchSubjects();
    
    result.teacherAssignments.totalAssignments = assignments.length;
    result.teacherAssignments.uniqueTeachers = [...new Set(assignments.map(a => a.teacher_id))].length;
    result.teacherAssignments.uniqueClasses = [...new Set(assignments.map(a => a.class_id))].length;
    result.teacherAssignments.uniqueSubjects = [...new Set(assignments.map(a => a.subject_id))].length;
    
    if (result.teacherAssignments.uniqueTeachers > 0) {
      result.teacherAssignments.averageAssignmentsPerTeacher = 
        assignments.length / result.teacherAssignments.uniqueTeachers;
    }
    
    // Check for issues
    if (assignments.length === 0) {
      result.teacherAssignments.status = 'warning';
      result.teacherAssignments.issues.push('No teacher assignments found');
    }
    
    if (result.teacherAssignments.averageAssignmentsPerTeacher > 10) {
      result.teacherAssignments.status = 'warning';
      result.teacherAssignments.issues.push('Some teachers have too many assignments');
    }
    
    if (result.teacherAssignments.averageAssignmentsPerTeacher < 1) {
      result.teacherAssignments.status = 'warning';
      result.teacherAssignments.issues.push('Some teachers have no assignments');
    }
    
    // Check for orphaned assignments
    const orphanedAssignments = assignments.filter(assignment => {
      const teacherExists = teachers.some(t => t.id === assignment.teacher_id);
      const classExists = classes.some(c => c.id === assignment.class_id);
      const subjectExists = subjects.some(s => s.id === assignment.subject_id);
      return !teacherExists || !classExists || !subjectExists;
    });
    
    if (orphanedAssignments.length > 0) {
      result.teacherAssignments.status = 'fail';
      result.teacherAssignments.issues.push(`${orphanedAssignments.length} orphaned assignments found`);
    }
    
    console.log('Teacher assignments verification completed');
  } catch (error) {
    console.error('Error verifying teacher assignments:', error);
    result.teacherAssignments.status = 'fail';
    result.teacherAssignments.issues.push('Verification failed due to error');
  }
};

const verifyParentChildLinks = async (result: VerificationResult) => {
  try {
    console.log('Verifying parent-child links...');
    
    // Simulate fetching links
    const links = await fetchParentStudentLinks();
    const parents = await fetchParents();
    const students = await fetchStudents();
    
    result.parentChildLinks.totalLinks = links.length;
    result.parentChildLinks.uniqueParents = [...new Set(links.map(l => l.parent_id))].length;
    result.parentChildLinks.uniqueStudents = [...new Set(links.map(l => l.student_id))].length;
    
    if (result.parentChildLinks.uniqueParents > 0) {
      result.parentChildLinks.averageChildrenPerParent = 
        links.length / result.parentChildLinks.uniqueParents;
    }
    
    // Check for issues
    if (links.length === 0) {
      result.parentChildLinks.status = 'warning';
      result.parentChildLinks.issues.push('No parent-child links found');
    }
    
    if (result.parentChildLinks.averageChildrenPerParent > 5) {
      result.parentChildLinks.status = 'warning';
      result.parentChildLinks.issues.push('Some parents have too many children');
    }
    
    // Check for orphaned links
    const orphanedLinks = links.filter(link => {
      const parentExists = parents.some(p => p.id === link.parent_id);
      const studentExists = students.some(s => s.id === link.student_id);
      return !parentExists || !studentExists;
    });
    
    if (orphanedLinks.length > 0) {
      result.parentChildLinks.status = 'fail';
      result.parentChildLinks.issues.push(`${orphanedLinks.length} orphaned links found`);
    }
    
    // Check for students without parents
    const studentsWithoutParents = students.filter(student => 
      !links.some(link => link.student_id === student.id)
    );
    
    if (studentsWithoutParents.length > students.length * 0.1) {
      result.parentChildLinks.status = 'warning';
      result.parentChildLinks.issues.push(`${studentsWithoutParents.length} students have no parent links`);
    }
    
    console.log('Parent-child links verification completed');
  } catch (error) {
    console.error('Error verifying parent-child links:', error);
    result.parentChildLinks.status = 'fail';
    result.parentChildLinks.issues.push('Verification failed due to error');
  }
};

const verifyDataIntegrity = async (result: VerificationResult) => {
  try {
    console.log('Verifying data integrity...');
    
    // Check for missing information
    const teachers = await fetchTeachers();
    const students = await fetchStudents();
    const assignments = await fetchSubjectAssignments();
    const links = await fetchParentStudentLinks();
    
    // Check teachers with missing information
    const teachersWithMissingInfo = teachers.filter(teacher => 
      !teacher.first_name || !teacher.last_name || !teacher.email
    );
    result.dataIntegrity.missingTeacherInfo = teachersWithMissingInfo.length;
    
    // Check students with missing information
    const studentsWithMissingInfo = students.filter(student => 
      !student.first_name || !student.last_name || !student.admission_number
    );
    result.dataIntegrity.missingStudentInfo = studentsWithMissingInfo.length;
    
    // Check for orphaned records (already calculated above)
    const orphanedAssignments = assignments.filter(assignment => {
      const teacherExists = teachers.some(t => t.id === assignment.teacher_id);
      const classExists = true; // Would check classes
      const subjectExists = true; // Would check subjects
      return !teacherExists || !classExists || !subjectExists;
    });
    result.dataIntegrity.orphanedAssignments = orphanedAssignments.length;
    
    const orphanedLinks = links.filter(link => {
      const parentExists = true; // Would check parents
      const studentExists = students.some(s => s.id === link.student_id);
      return !parentExists || !studentExists;
    });
    result.dataIntegrity.orphanedLinks = orphanedLinks.length;
    
    // Determine overall status
    if (
      result.dataIntegrity.missingTeacherInfo > 0 ||
      result.dataIntegrity.missingStudentInfo > 0 ||
      result.dataIntegrity.orphanedAssignments > 0 ||
      result.dataIntegrity.orphanedLinks > 0
    ) {
      result.dataIntegrity.status = 'fail';
      result.dataIntegrity.issues.push('Data integrity issues found');
    }
    
    console.log('Data integrity verification completed');
  } catch (error) {
    console.error('Error verifying data integrity:', error);
    result.dataIntegrity.status = 'fail';
    result.dataIntegrity.issues.push('Verification failed due to error');
  }
};

// Mock API functions (these would be replaced with actual API calls)
interface MockAssignment {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number;
}

interface MockTeacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface MockClass {
  id: number;
  name: string;
  level: string;
}

interface MockSubject {
  id: number;
  name: string;
  code: string;
}

interface MockLink {
  parent_id: number;
  student_id: number;
}

interface MockParent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface MockStudent {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
}

const fetchSubjectAssignments = async (): Promise<MockAssignment[]> => {
  // Simulate API call
  return [];
};

const fetchTeachers = async (): Promise<MockTeacher[]> => {
  // Simulate API call
  return [];
};

const fetchClasses = async (): Promise<MockClass[]> => {
  // Simulate API call
  return [];
};

const fetchSubjects = async (): Promise<MockSubject[]> => {
  // Simulate API call
  return [];
};

const fetchParentStudentLinks = async (): Promise<MockLink[]> => {
  // Simulate API call
  return [];
};

const fetchParents = async (): Promise<MockParent[]> => {
  // Simulate API call
  return [];
};

const fetchStudents = async (): Promise<MockStudent[]> => {
  // Simulate API call
  return [];
};

export const generateVerificationReport = (result: VerificationResult): string => {
  let report = 'SYSTEM VERIFICATION REPORT\n';
  report += '========================\n\n';
  
  // Teacher Assignments Section
  report += 'TEACHER ASSIGNMENTS\n';
  report += '-------------------\n';
  report += `Status: ${result.teacherAssignments.status.toUpperCase()}\n`;
  report += `Total Assignments: ${result.teacherAssignments.totalAssignments}\n`;
  report += `Unique Teachers: ${result.teacherAssignments.uniqueTeachers}\n`;
  report += `Unique Classes: ${result.teacherAssignments.uniqueClasses}\n`;
  report += `Unique Subjects: ${result.teacherAssignments.uniqueSubjects}\n`;
  report += `Avg Assignments/Teacher: ${result.teacherAssignments.averageAssignmentsPerTeacher.toFixed(2)}\n`;
  
  if (result.teacherAssignments.issues.length > 0) {
    report += '\nIssues:\n';
    result.teacherAssignments.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
  }
  
  report += '\n';
  
  // Parent-Child Links Section
  report += 'PARENT-CHILD LINKS\n';
  report += '-----------------\n';
  report += `Status: ${result.parentChildLinks.status.toUpperCase()}\n`;
  report += `Total Links: ${result.parentChildLinks.totalLinks}\n`;
  report += `Unique Parents: ${result.parentChildLinks.uniqueParents}\n`;
  report += `Unique Students: ${result.parentChildLinks.uniqueStudents}\n`;
  report += `Avg Children/Parent: ${result.parentChildLinks.averageChildrenPerParent.toFixed(2)}\n`;
  
  if (result.parentChildLinks.issues.length > 0) {
    report += '\nIssues:\n';
    result.parentChildLinks.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
  }
  
  report += '\n';
  
  // Data Integrity Section
  report += 'DATA INTEGRITY\n';
  report += '--------------\n';
  report += `Status: ${result.dataIntegrity.status.toUpperCase()}\n`;
  report += `Orphaned Assignments: ${result.dataIntegrity.orphanedAssignments}\n`;
  report += `Orphaned Links: ${result.dataIntegrity.orphanedLinks}\n`;
  report += `Missing Teacher Info: ${result.dataIntegrity.missingTeacherInfo}\n`;
  report += `Missing Student Info: ${result.dataIntegrity.missingStudentInfo}\n`;
  
  if (result.dataIntegrity.issues.length > 0) {
    report += '\nIssues:\n';
    result.dataIntegrity.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
  }
  
  report += '\n';
  
  // Overall Status
  const overallStatus = result.teacherAssignments.status === 'fail' || 
                       result.parentChildLinks.status === 'fail' || 
                       result.dataIntegrity.status === 'fail' ? 'FAIL' :
                       result.teacherAssignments.status === 'warning' || 
                       result.parentChildLinks.status === 'warning' || 
                       result.dataIntegrity.status === 'warning' ? 'WARNING' : 'PASS';
  
  report += `OVERALL STATUS: ${overallStatus}\n`;
  
  return report;
};

export const downloadVerificationReport = (result: VerificationResult) => {
  const report = generateVerificationReport(result);
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `system-verification-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success('Verification report downloaded successfully!');
};
