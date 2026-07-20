/**
 * Real SQL Database Integration for CSV Imports
 * SMugFlex 2.0 Multi-School Management Platform
 * Direct MySQL database operations
 */

import { API_CONFIG } from '../config/api';
import { Student, Teacher, Class, Subject, Parent } from '../types/school';
import sqlDatabase from '../services/sqlDatabase';

// Batch processing configuration
const BATCH_SIZE = 50; // Process records in batches for better performance
const DELAY_BETWEEN_BATCHES = 100; // Delay between batches in ms

/**
 * Batch processor for efficient database operations
 */
class BatchProcessor {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async addOperation(operation: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (operation) => {
          try {
            await operation();
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          } catch (error) {
            }
        })
      );
    }
    
    this.processing = false;
  }
}

const batchProcessor = new BatchProcessor();

/**
 * Student Database Importer
 */
export class StudentDatabaseImporter {
  private static async createStudentInDB(studentData: any): Promise<Student | null> {
    try {
      // Use real SQL database
      const student = await sqlDatabase.createStudent(studentData);
      
      return student;
    } catch (error) {
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage && errorMessage.includes('Duplicate entry')) {
        throw new Error(`Student with admission number ${studentData.admissionNumber} already exists`);
      } else if (errorMessage && errorMessage.includes('foreign key constraint')) {
        throw new Error(`Invalid class or parent reference for student ${studentData.firstName} ${studentData.lastName}`);
      } else {
        throw new Error(`Failed to create student: ${errorMessage}`);
      }
    }
  }

  private static async createParentInDB(parentData: any): Promise<Parent | null> {
    try {
      // Use real SQL database
      const parent = await sqlDatabase.createParent(parentData);
      
      return parent;
    } catch (error) {
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage && errorMessage.includes('Duplicate entry')) {
        throw new Error(`Parent with email ${parentData.email} already exists`);
      } else {
        throw new Error(`Failed to create parent: ${errorMessage}`);
      }
    }
  }

  private static async createUserAccount(userData: any): Promise<boolean> {
    try {
      // Use real SQL database
      await sqlDatabase.createUser(userData);
      
      return true;
    } catch (error) {
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage && errorMessage.includes('Duplicate entry')) {
        throw new Error(`Username ${userData.username} already exists`);
      } else {
        throw new Error(`Failed to create user account: ${errorMessage}`);
      }
    }
  }

  static async importStudents(
    students: any[], 
    selectedClassId?: number,
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number, errors: string[], students: Student[] }> {
    const errors: string[] = [];
    const importedStudents: Student[] = [];
    let successCount = 0;

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      
      try {
        // Check for existing admission number only if provided
        if (studentData.admissionNumber) {
          const existingStudent = await sqlDatabase.checkAdmissionNumberExists(studentData.admissionNumber);
          if (existingStudent) {
            errors.push(`Admission number ${studentData.admissionNumber} already exists for student: ${studentData.firstName} ${studentData.lastName}`);
            continue;
          }
        }

        // Prepare student data with class selection matching simplified structure
        const preparedStudent = {
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          otherName: studentData.otherName || '',
          admissionNumber: studentData.admissionNumber || await this.generateUniqueAdmissionNumber(),
          classId: selectedClassId || studentData.classId,
          className: studentData.className || '',
          level: studentData.level || '',
          parentId: null, // Will be set after parent creation
          dateOfBirth: studentData.dateOfBirth || '',
          gender: studentData.gender,
          status: studentData.status || 'Active',
          academicYear: studentData.academicYear || new Date().getFullYear().toString(),
          admissionDate: studentData.admissionDate || new Date().toISOString().split('T')[0],
          parentName: studentData.parentName || '',
          parentPhone: studentData.parentPhone || ''
        };

        // Create parent if parent data exists (simplified - only name and phone)
        let parentId = null;
        if (studentData.parentName && studentData.parentPhone) {
          // Check for existing parent by phone
          const existingParents = await sqlDatabase.getParents();
          const existingParent = existingParents.find(p => p.phone === studentData.parentPhone);
          
          if (existingParent) {
            parentId = existingParent.id;
          } else {
            // Create new parent with simplified data
            const parentData = {
              firstName: studentData.parentName?.split(' ')[0] || '',
              lastName: studentData.parentName?.split(' ').slice(1).join(' ') || '',
              email: `${studentData.parentName.replace(/\s+/g, '.').toLowerCase()}@parent.com`, // Generate email
              phone: studentData.parentPhone || '',
              status: 'Active',
            };

            const parent = await this.createParentInDB(parentData);
            if (parent) {
              parentId = parent.id;
            }
          }
        }

        preparedStudent.parentId = parentId;

        // Create student
        const student = await this.createStudentInDB(preparedStudent);
        if (student) {
          importedStudents.push(student);
          successCount++;

          // Create student user account if username provided
          if (studentData.username) {
            await this.createUserAccount({
              username: studentData.username,
              email: studentData.email || '',
              role: 'student',
              linkedId: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              status: 'Active',
            });
          }
        } else {
          errors.push(`Failed to create student in database: ${studentData.firstName} ${studentData.lastName}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Error importing student ${studentData.firstName}: ${errorMessage}`);
      }

      // Update progress
      if (onProgress) {
        onProgress(i + 1, students.length);
      }
    }

    return { success: successCount, errors, students: importedStudents };
  }

  private static async generateUniqueAdmissionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    const maxAttempts = 100;
    const prefix = StudentDatabaseImporter.getSchoolPrefix();
    
    while (attempts < maxAttempts) {
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const admissionNumber = `${prefix}/${year}/${random}`;
      
      // Check if this admission number already exists
      const existingStudent = await sqlDatabase.checkAdmissionNumberExists(admissionNumber);
      if (!existingStudent) {
        return admissionNumber;
      }
      
      attempts++;
    }
    
    // Fallback: use timestamp if we can't generate a unique number
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}/${year}/${timestamp}`;
  }

  private static getSchoolPrefix(): string {
    try {
      const userStr = localStorage.getItem(API_CONFIG.AUTH.USER_KEY);
      if (userStr) {
        const user = JSON.parse(userStr);
        return (user.school_suffix || 'STU').toUpperCase();
      }
    } catch {}
    return 'STU';
  }
}

/**
 * Teacher Database Importer
 */
export class TeacherDatabaseImporter {
  private static async createTeacherInDB(teacherData: any): Promise<Teacher | null> {
    try {
      // Use real SQL database
      const teacher = await sqlDatabase.createTeacher(teacherData);
      return teacher;
    } catch (error) {
      return null;
    }
  }

  static async importTeachers(
    teachers: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number, errors: string[], teachers: Teacher[] }> {
    const errors: string[] = [];
    const importedTeachers: Teacher[] = [];
    let successCount = 0;

    for (let i = 0; i < teachers.length; i++) {
      const teacherData = teachers[i];
      
      try {
        // Check for existing employee ID
        const existingTeacher = await sqlDatabase.checkEmployeeIdExists(teacherData.employeeId);
        if (existingTeacher) {
          errors.push(`Employee ID ${teacherData.employeeId} already exists for teacher: ${teacherData.firstName} ${teacherData.lastName}`);
          continue;
        }

        // Check for existing email
        const existingEmail = await sqlDatabase.checkEmailExists(teacherData.email, 'teachers');
        if (existingEmail) {
          errors.push(`Email ${teacherData.email} already exists for teacher: ${teacherData.firstName} ${teacherData.lastName}`);
          continue;
        }

        const preparedTeacher = {
          firstName: teacherData.firstName,
          lastName: teacherData.lastName,
          otherName: teacherData.otherName || '',
          employeeId: teacherData.employeeId,
          email: teacherData.email,
          phone: teacherData.phone || '',
          gender: teacherData.gender || '',
          qualification: teacherData.qualification || '',
          specialization: Array.isArray(teacherData.specialization) 
            ? teacherData.specialization 
            : (teacherData.specialization ? teacherData.specialization.split(';').map((s: string) => s.trim()) : []),
          status: teacherData.status || 'Active',
          isClassTeacher: teacherData.isClassTeacher === 'true' || teacherData.isClassTeacher === true,
          classTeacherId: null,
        };

        const teacher = await this.createTeacherInDB(preparedTeacher);
        if (teacher) {
          importedTeachers.push(teacher);
          successCount++;

          // Create teacher user account
          await batchProcessor.addOperation(async () => {
            await sqlDatabase.createUser({
              username: teacherData.username || `${teacher.firstName.toLowerCase()}${teacher.lastName.toLowerCase()}`,
              email: teacherData.email,
              role: 'teacher',
              linkedId: teacher.id,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              status: 'Active',
            });
          });
        } else {
          errors.push(`Failed to create teacher in database: ${teacherData.firstName} ${teacherData.lastName}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Error importing teacher ${teacherData.firstName}: ${errorMessage}`);
      }

      if (onProgress) {
        onProgress(i + 1, teachers.length);
      }
    }

    return { success: successCount, errors, teachers: importedTeachers };
  }
}

/**
 * Class Database Importer
 */
export class ClassDatabaseImporter {
  private static async createClassInDB(classData: any): Promise<Class | null> {
    try {
      // Use real SQL database
      const newClass = await sqlDatabase.createClass(classData);
      return newClass;
    } catch (error) {
      return null;
    }
  }

  static async importClasses(
    classes: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number, errors: string[], classes: Class[] }> {
    const errors: string[] = [];
    const importedClasses: Class[] = [];
    let successCount = 0;

    for (let i = 0; i < classes.length; i++) {
      const classData = classes[i];
      
      try {
        const preparedClass = {
          name: classData.name,
          level: classData.level,
          section: classData.section || '',
          capacity: parseInt(classData.capacity) || 30,
          classTeacherId: classData.classTeacherId || null,
          status: classData.status || 'Active',
        };

        const newClass = await this.createClassInDB(preparedClass);
        if (newClass) {
          importedClasses.push(newClass);
          successCount++;
        } else {
          errors.push(`Failed to create class in database: ${classData.name}`);
        }
      } catch (error) {
        errors.push(`Error importing class ${classData.name}: ${error}`);
      }

      if (onProgress) {
        onProgress(i + 1, classes.length);
      }
    }

    return { success: successCount, errors, classes: importedClasses };
  }
}

/**
 * Subject Database Importer
 */
export class SubjectDatabaseImporter {
  private static async createSubjectInDB(subjectData: any): Promise<Subject | null> {
    try {
      // Use real SQL database
      const subject = await sqlDatabase.createSubject(subjectData);
      return subject;
    } catch (error) {
      return null;
    }
  }

  static async importSubjects(
    subjects: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number, errors: string[], subjects: Subject[] }> {
    const errors: string[] = [];
    const importedSubjects: Subject[] = [];
    let successCount = 0;

    for (let i = 0; i < subjects.length; i++) {
      const subjectData = subjects[i];
      
      try {
        const preparedSubject = {
          name: subjectData.name,
          category: subjectData.category,
          subjectType: subjectData.subjectType || 'Elective',
          description: subjectData.description || '',
          status: subjectData.status || 'Active',
          isCore: subjectData.isCore === 'true' || subjectData.isCore === true || subjectData.subjectType === 'Core',
        };

        const subject = await this.createSubjectInDB(preparedSubject);
        if (subject) {
          importedSubjects.push(subject);
          successCount++;
        } else {
          errors.push(`Failed to create subject in database: ${subjectData.name}`);
        }
      } catch (error) {
        errors.push(`Error importing subject ${subjectData.name}: ${error}`);
      }

      if (onProgress) {
        onProgress(i + 1, subjects.length);
      }
    }

    return { success: successCount, errors, subjects: importedSubjects };
  }
}

/**
 * Parent Database Importer
 */
export class ParentDatabaseImporter {
  private static async createParentInDB(parentData: any): Promise<Parent | null> {
    try {
      // Use real SQL database
      const parent = await sqlDatabase.createParent(parentData);
      return parent;
    } catch (error) {
      return null;
    }
  }

  static async importParents(
    parents: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number, errors: string[], parents: Parent[] }> {
    const errors: string[] = [];
    const importedParents: Parent[] = [];
    let successCount = 0;

    for (let i = 0; i < parents.length; i++) {
      const parentData = parents[i];
      
      try {
        // Check for existing parent email
        const existingParent = await sqlDatabase.checkEmailExists(parentData.email, 'parents');
        if (existingParent) {
          errors.push(`Email ${parentData.email} already exists for parent: ${parentData.firstName} ${parentData.lastName}`);
          continue;
        }

        const preparedParent = {
          firstName: parentData.firstName,
          lastName: parentData.lastName,
          otherName: parentData.otherName || '',
          email: parentData.email,
          phone: parentData.phone || '',
          gender: parentData.gender || '',
          status: parentData.status || 'Active',
          studentIds: [], // Will be populated separately
        };

        const parent = await this.createParentInDB(preparedParent);
        if (parent) {
          importedParents.push(parent);
          successCount++;

          // Create parent user account
          await batchProcessor.addOperation(async () => {
            await sqlDatabase.createUser({
              username: parentData.username || `${parent.first_name.toLowerCase()}${parent.last_name.toLowerCase()}`,
              email: parentData.email,
              role: 'parent',
              linkedId: parent.id,
              first_name: parent.first_name,
              last_name: parent.last_name,
              status: 'Active',
            });
          });
        } else {
          errors.push(`Failed to create parent in database: ${parentData.firstName} ${parentData.lastName}`);
        }
      } catch (error) {
        errors.push(`Error importing parent ${parentData.firstName}: ${error}`);
      }

      if (onProgress) {
        onProgress(i + 1, parents.length);
      }
    }

    return { success: successCount, errors, parents: importedParents };
  }
}
