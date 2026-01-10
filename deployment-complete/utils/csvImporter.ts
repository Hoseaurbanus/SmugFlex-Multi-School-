/**
 * Enhanced CSV Import Utilities for Graceland Royal Academy
 * Import CSV files into database with proper validation and class selection
 */

import { 
  StudentDatabaseImporter, 
  TeacherDatabaseImporter, 
  ClassDatabaseImporter, 
  SubjectDatabaseImporter, 
  ParentDatabaseImporter 
} from './databaseImporter';
import { Student, Teacher, Class, Subject, Parent } from '../contexts/SchoolContext';

/**
 * Enhanced CSV string parser that handles quoted fields and commas
 */
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse headers properly handling quotes
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      data.push(obj);
    } else {
      }
  }
  
  return data;
}

/**
 * Parse a single CSV line handling quoted fields and escaped quotes
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quoted field
        current += '"';
        i += 2; // Skip both quotes
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Validate student data from CSV with enhanced validation
 */
function validateStudentData(data: any[]): { valid: any[], errors: string[] } {
  const valid: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    
    // Required fields for new simplified structure (admission number is optional - will be auto-generated)
    if (!row.firstName) rowErrors.push('First name required');
    if (!row.lastName) rowErrors.push('Last name required');
    if (!row.gender) rowErrors.push('Gender required');
    if (!row.className) rowErrors.push('Class name required');
    
    // Validate gender
    if (row.gender && !['Male', 'Female', 'MALE', 'FEMALE'].includes(row.gender)) {
      rowErrors.push('Invalid gender (must be Male or Female)');
    }
    
    // Validate date format if provided
    if (row.dateOfBirth && !isValidDate(row.dateOfBirth)) {
      rowErrors.push('Invalid date format (use YYYY-MM-DD)');
    }
    
    // Validate parent phone if provided
    if (row.parentPhone && !isValidPhone(row.parentPhone)) {
      rowErrors.push('Invalid parent phone format');
    }
    
    if (rowErrors.length === 0) {
      valid.push({
        ...row,
        gender: row.gender.toUpperCase(),
        status: row.status || 'Active',
        academicYear: row.academicYear || new Date().getFullYear().toString(),
        // Map to database schema
        first_name: row.firstName,
        last_name: row.lastName,
        other_name: row.otherName || null,
        admission_number: row.admissionNumber || null, // Will be auto-generated in database importer
        class_name: row.className,
        level: row.level || '',
        parent_name: row.parentName || '',
        parent_phone: row.parentPhone || '',
        date_of_birth: row.dateOfBirth || null,
        admission_date: row.admissionDate || new Date().toISOString().split('T')[0]
      });
    } else {
      errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
    }
  });
  
  return { valid, errors };
}

/**
 * Validate teacher data from CSV with enhanced validation
 */
function validateTeacherData(data: any[]): { valid: any[], errors: string[] } {
  const valid: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    
    // Required fields
    if (!row.firstName) rowErrors.push('First name required');
    if (!row.lastName) rowErrors.push('Last name required');
    if (!row.email) rowErrors.push('Email required');
    if (!row.employeeId) rowErrors.push('Employee ID required');
    
    // Validate email format
    if (row.email && !isValidEmail(row.email)) {
      rowErrors.push('Invalid email format');
    }
    
    // Validate phone format if provided
    if (row.phone && !isValidPhone(row.phone)) {
      rowErrors.push('Invalid phone format');
    }
    
    // Validate gender
    if (row.gender && !['Male', 'Female', 'MALE', 'FEMALE', ''].includes(row.gender)) {
      rowErrors.push('Invalid gender (must be Male, Female, or empty)');
    }
    
    // Validate specialization format
    if (row.specialization && typeof row.specialization === 'string') {
      const specs = row.specialization.split(';').map((s: string) => s.trim()).filter((s: string) => s);
      if (specs.length === 0) {
        rowErrors.push('At least one specialization required');
      }
    }
    
    if (rowErrors.length === 0) {
      valid.push({
        ...row,
        gender: row.gender || '',
        status: row.status || 'Active',
        isClassTeacher: row.isClassTeacher === 'true' || row.isClassTeacher === 'TRUE',
        specialization: Array.isArray(row.specialization) 
          ? row.specialization 
          : (row.specialization ? row.specialization.split(';').map((s: string) => s.trim()) : []),
        username: row.username || generateUsername(row.firstName, row.lastName),
      });
    } else {
      errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
    }
  });
  
  return { valid, errors };
}

/**
 * Validate class data from CSV with enhanced validation
 */
function validateClassData(data: any[]): { valid: any[], errors: string[] } {
  const valid: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    
    // Required fields
    if (!row.name) rowErrors.push('Class name required');
    if (!row.level) rowErrors.push('Level required');
    
    // Validate capacity
    if (row.capacity && (isNaN(row.capacity) || parseInt(row.capacity) <= 0)) {
      rowErrors.push('Capacity must be a positive number');
    }
    
    // Validate level
    const validLevels = ['Creche', 'Nursery', 'Primary', 'JSS', 'SS'];
    if (row.level && !validLevels.includes(row.level)) {
      rowErrors.push(`Invalid level (must be one of: ${validLevels.join(', ')})`);
    }
    
    if (rowErrors.length === 0) {
      valid.push({
        ...row,
        capacity: row.capacity ? parseInt(row.capacity) : 30,
        status: row.status || 'Active',
        section: row.section || '',
        classTeacherId: row.classTeacherId || null,
      });
    } else {
      errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
    }
  });
  
  return { valid, errors };
}

/**
 * Validate subject data from CSV with enhanced validation
 */
function validateSubjectData(data: any[]): { valid: any[], errors: string[] } {
  const valid: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    
    // Required fields
    if (!row.name) rowErrors.push('Subject name required');
    if (!row.category) rowErrors.push('Category required');
    
    // Validate category
    const validCategories = ['Creche', 'Nursery', 'Primary', 'JSS', 'SS'];
    if (row.category && !validCategories.includes(row.category)) {
      rowErrors.push(`Invalid category (must be one of: ${validCategories.join(', ')})`);
    }
    
    // Validate subject type
    const validTypes = ['Core', 'Elective', 'CORE', 'ELECTIVE'];
    if (row.subjectType && !validTypes.includes(row.subjectType)) {
      rowErrors.push(`Invalid subject type (must be Core or Elective)`);
    }
    
    if (rowErrors.length === 0) {
      valid.push({
        ...row,
        category: row.category,
        subjectType: row.subjectType || 'Elective',
        status: row.status || 'Active',
        isCore: row.isCore === 'true' || row.isCore === 'TRUE' || row.subjectType === 'Core',
        description: row.description || '',
      });
    } else {
      errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
    }
  });
  
  return { valid, errors };
}

/**
 * Validate parent data from CSV with enhanced validation
 */
function validateParentData(data: any[]): { valid: any[], errors: string[] } {
  const valid: any[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    
    // Required fields
    if (!row.firstName) rowErrors.push('First name required');
    if (!row.lastName) rowErrors.push('Last name required');
    if (!row.email) rowErrors.push('Email required');
    
    // Validate email format
    if (row.email && !isValidEmail(row.email)) {
      rowErrors.push('Invalid email format');
    }
    
    // Validate phone format if provided
    if (row.phone && !isValidPhone(row.phone)) {
      rowErrors.push('Invalid phone format');
    }
    
    // Validate gender
    if (row.gender && !['Male', 'Female', 'MALE', 'FEMALE', ''].includes(row.gender)) {
      rowErrors.push('Invalid gender (must be Male, Female, or empty)');
    }
    
    if (rowErrors.length === 0) {
      valid.push({
        ...row,
        gender: row.gender || '',
        phone: row.phone || '',
        status: row.status || 'Active',
        username: row.username || generateUsername(row.firstName, row.lastName),
      });
    } else {
      errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
    }
  });
  
  return { valid, errors };
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsed = new Date(date);
  return parsed instanceof Date && !isNaN(parsed.getTime());
}

function generateUsername(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * Enhanced import functions with database integration
 */
export function importStudentsFromCSV(
  file: File, 
  selectedClassId?: number,
  onProgress?: (processed: number, total: number) => void
): Promise<{ valid: any[], errors: string[], imported: Student[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        if (data.length === 0) {
          resolve({ 
            valid: [], 
            errors: ['CSV file is empty or invalid'], 
            imported: [] 
          });
          return;
        }
        
        const validation = validateStudentData(data);
        if (validation.errors.length > 0) {
          resolve({ 
            valid: validation.valid, 
            errors: validation.errors, 
            imported: [] 
          });
          return;
        }
        
        if (validation.valid.length === 0) {
          resolve({ 
            valid: [], 
            errors: ['No valid records to import'], 
            imported: [] 
          });
          return;
        }
        
        // Import to database
        const result = await StudentDatabaseImporter.importStudents(
          validation.valid, 
          selectedClassId,
          onProgress
        );
        
        resolve({
          valid: validation.valid,
          errors: result.errors,
          imported: result.students
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

export function importTeachersFromCSV(
  file: File,
  onProgress?: (processed: number, total: number) => void
): Promise<{ valid: any[], errors: string[], imported: Teacher[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        const validation = validateTeacherData(data);
        
        if (validation.errors.length > 0) {
          resolve({ 
            valid: validation.valid, 
            errors: validation.errors, 
            imported: [] 
          });
          return;
        }
        
        const result = await TeacherDatabaseImporter.importTeachers(
          validation.valid,
          onProgress
        );
        
        resolve({
          valid: validation.valid,
          errors: result.errors,
          imported: result.teachers
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importClassesFromCSV(
  file: File,
  onProgress?: (processed: number, total: number) => void
): Promise<{ valid: any[], errors: string[], imported: Class[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        const validation = validateClassData(data);
        
        if (validation.errors.length > 0) {
          resolve({ 
            valid: validation.valid, 
            errors: validation.errors, 
            imported: [] 
          });
          return;
        }
        
        const result = await ClassDatabaseImporter.importClasses(
          validation.valid,
          onProgress
        );
        
        resolve({
          valid: validation.valid,
          errors: result.errors,
          imported: result.classes
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importSubjectsFromCSV(
  file: File,
  onProgress?: (processed: number, total: number) => void
): Promise<{ valid: any[], errors: string[], imported: Subject[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        const validation = validateSubjectData(data);
        
        if (validation.errors.length > 0) {
          resolve({ 
            valid: validation.valid, 
            errors: validation.errors, 
            imported: [] 
          });
          return;
        }
        
        const result = await SubjectDatabaseImporter.importSubjects(
          validation.valid,
          onProgress
        );
        
        resolve({
          valid: validation.valid,
          errors: result.errors,
          imported: result.subjects
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importParentsFromCSV(
  file: File,
  onProgress?: (processed: number, total: number) => void
): Promise<{ valid: any[], errors: string[], imported: Parent[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        const validation = validateParentData(data);
        
        if (validation.errors.length > 0) {
          resolve({ 
            valid: validation.valid, 
            errors: validation.errors, 
            imported: [] 
          });
          return;
        }
        
        const result = await ParentDatabaseImporter.importParents(
          validation.valid,
          onProgress
        );
        
        resolve({
          valid: validation.valid,
          errors: result.errors,
          imported: result.parents
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Enhanced CSV templates with more fields
 */
export function generateStudentTemplate(): string {
  const headers = [
    'admissionNumber (Optional - will be auto-generated if empty)',
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
  
  const sampleData = [
    '', // Leave empty for auto-generation
    'John',
    'Doe',
    'Michael',
    'Male',
    '2010-05-15',
    'JSS 1A',
    'JSS',
    'Active',
    'Jane Doe',
    '08012345678',
    '2024',
    '2024-09-01'
  ];
  
  return [headers.join(','), sampleData.join(',')].join('\n');
}

export function generateTeacherTemplate(): string {
  const headers = [
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
    'isClassTeacher',
    'username'
  ];
  
  const sampleData = [
    'Jane',
    'Smith',
    'Mary',
    'Female',
    'TCH001',
    'jane.smith@school.com',
    '08012345678',
    'B.Ed Mathematics',
    'Mathematics;Physics',
    'Active',
    'true',
    'jane.smith'
  ];
  
  return [headers.join(','), sampleData.join(',')].join('\n');
}

export function generateClassTemplate(): string {
  const headers = [
    'name',
    'level',
    'section',
    'capacity',
    'status',
    'classTeacherId'
  ];
  
  const sampleData = [
    'JSS 1A',
    'JSS',
    'A',
    '30',
    'Active',
    ''
  ];
  
  return [headers.join(','), sampleData.join(',')].join('\n');
}

export function generateSubjectTemplate(): string {
  const headers = [
    'name',
    'category',
    'subjectType',
    'description',
    'status',
    'isCore'
  ];
  
  const sampleData = [
    'Mathematics',
    'JSS',
    'Core',
    'Mathematics for Junior Secondary',
    'Active',
    'true'
  ];
  
  return [headers.join(','), sampleData.join(',')].join('\n');
}

export function generateParentTemplate(): string {
  const headers = [
    'firstName',
    'lastName',
    'otherName',
    'gender',
    'email',
    'phone',
    'status',
    'username'
  ];
  
  const sampleData = [
    'John',
    'Doe',
    'Michael',
    'Male',
    'john.doe@parent.com',
    '08012345678',
    'Active',
    'john.doe'
  ];
  
  return [headers.join(','), sampleData.join(',')].join('\n');
}
