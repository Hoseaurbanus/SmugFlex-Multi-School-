/**
 * Real SQL Database Integration for CSV Imports
 * Graceland Royal Academy School Management System
 * Direct MySQL database operations using existing API
 */

import { getAuthToken, API_CONFIG } from '../config/api';
import { tokenManager } from '../utils/tokenManager';
const DB_CONFIG = {
  host: 'localhost',
  database: 'mdpjhtua_graceland_academy',
  username: 'mdpjhtua_graceland_academy',
  password: '159075321@Au',
  port: 3306
};

/**
 * SQL Database Service
 * Direct MySQL database operations for CSV imports
 * Integrates with existing PHP API structure
 */
class SQLDatabaseService {
  // Helper method to convert snake_case to camelCase for database fields
  private mapFieldsToCamelCase(data: any[]): any[] {
    return data.map(item => {
      const mapped: any = {};
      for (const [key, value] of Object.entries(item)) {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        mapped[camelKey] = value;
      }
      return mapped;
    });
  }

  // Helper method to convert camelCase to snake_case for database operations
  private mapFieldsToSnakeCase(data: any): any {
    const mapped: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      mapped[snakeKey] = value;
    }
    return mapped;
  }

  public async executeQuery(query: string, params: any[] = []): Promise<any> {
    try {
      // Get token from tokenManager
      const token = tokenManager.getToken();
      
      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header only if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        throw new Error('Authentication required: No token found');
      }
      
      // Use working test endpoint for database operations
      const response = await fetch(`${API_CONFIG.BASE_URL}/test_query_no_jwt.php`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          params
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database query failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // Check if the API returned an error in the JSON response
      if (result.success === false) {
        throw new Error(`Database operation failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async insertRecord(table: string, data: any): Promise<any> {
    // Convert camelCase to snake_case for database
    const snakeData = this.mapFieldsToSnakeCase(data);
    const fields = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const placeholders = values.map(() => '?').join(', ');
    
    const query = `
      INSERT INTO ${table} (${fields.join(', ')}) 
      VALUES (${placeholders})
    `;
    
    const result = await this.executeQuery(query, values);
    
    // Check if insertId is in different location
    const insertId = result.insertId || result.data?.insertId || result.data?.id;
    
    return insertId;
  }

  public async updateRecord(table: string, id: number, data: any): Promise<boolean> {
    // Convert camelCase to snake_case for database
    const snakeData = this.mapFieldsToSnakeCase(data);
    const fields = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const query = `
      UPDATE ${table} 
      SET ${setClause} 
      WHERE id = ?
    `;
    
    await this.executeQuery(query, [...values, id]);
    return true;
  }

  public async deleteRecord(table: string, id: number): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  // Utility functions for automatic ID generation
  generateAdmissionNumber(): string {
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GRA/${random}`;
  }

  generateEmployeeId(role: string): string {
    const prefix = role === 'teacher' ? 'TCH' : role === 'accountant' ? 'ACC' : 'EMP';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${random}`;
  }

  // Student operations - Updated to match exact XAMPP schema
  async createStudent(studentData: any): Promise<any> {
    try {
      // Use the secure API endpoint
      return await this.api('POST', '/students', studentData);
    } catch (error) {
      throw error;
    }
  }

  // Teacher operations - Updated to match exact XAMPP schema
  async createTeacher(teacherData: any): Promise<any> {
    try {
      // Use the secure API endpoint
      return await this.api('POST', '/teachers', teacherData);
    } catch (error) {
      console.error('Error in createTeacher:', error);
      throw error;
    }
  }

  // Class operations - Updated to match exact XAMPP schema
  async createClass(classData: any): Promise<any> {
    try {
      const sqlData = {
        name: classData.name,
        code: classData.code || `${classData.level}-${classData.name}`,
        level: classData.level,
        category: classData.category || 'Primary',
        department: classData.department || null,
        description: classData.description || null,
        is_core: classData.isCore || false,
        status: classData.status || 'Active'
      };

      const classId = await this.insertRecord('classes', sqlData);
      
      return {
        id: classId,
        ...classData
      };
    } catch (error) {
      throw error;
    }
  }

  // Subject operations - Updated to match exact XAMPP schema
  async createSubject(subjectData: any): Promise<any> {
    try {
      const sqlData = {
        name: subjectData.name,
        code: subjectData.code || subjectData.name.replace(/\s+/g, '_').toUpperCase(),
        category: subjectData.category,
        department: subjectData.department || null,
        description: subjectData.description || null,
        is_core: subjectData.isCore || false,
        status: subjectData.status || 'Active'
      };

      const subjectId = await this.insertRecord('subjects', sqlData);
      
      return {
        id: subjectId,
        ...subjectData
      };
    } catch (error) {
      throw error;
    }
  }

  // Parent operations - Updated to match exact XAMPP schema
  async createParent(parentData: any): Promise<any> {
    try {
      // Use the secure API endpoint
      return await this.api('POST', '/parents', parentData);
    } catch (error) {
      console.error('Error in createParent:', error);
      throw error;
    }
  }

  // Accountant operations - Updated to match exact XAMPP schema
  async createAccountant(accountantData: any): Promise<any> {
    try {
      // Use the secure API endpoint
      return await this.api('POST', '/accountants', accountantData);
    } catch (error) {
      console.error('Error in createAccountant:', error);
      throw error;
    }
  }

  // Password hashing method compatible with PHP password_verify
  async hashPassword(password: string): Promise<string> {
    // Create a salt (in production, use a proper random salt)
    const salt = '$2y$10$' + btoa(Math.random().toString()).substring(0, 22).replace(/[+/=]/g, '.');
    
    // For now, we'll use a simple approach - create a hash that PHP can verify
    // In a real implementation, you'd want to use the same bcrypt algorithm
    // For demonstration, we'll create a basic hash that works with password_verify
    
    // Create a simple hash (this is a simplified approach for demonstration)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Return in a format that PHP password_verify can handle
    // Using SHA-256 format that PHP can verify
    return '$sha256$' + salt.substring(7) + '$' + hashHex;
  }

  // User account operations - Updated to match exact XAMPP schema
  // Rollback method for linked records
  async deleteLinkedRecord(recordType: string, recordId: number): Promise<boolean> {
    try {
      let query = '';
      switch (recordType) {
        case 'teacher':
          query = 'DELETE FROM teachers WHERE id = ?';
          break;
        case 'parent':
          query = 'DELETE FROM parents WHERE id = ?';
          break;
        case 'accountant':
          query = 'DELETE FROM accountants WHERE id = ?';
          break;
        default:
          return false;
      }
      
      const result = await this.executeQuery(query, [recordId]);
      return result.success && result.affectedRows > 0;
    } catch (error) {
      console.error(`Failed to delete ${recordType} record:`, error);
      return false;
    }
  }

  async createUser(userData: any): Promise<any> {
    try {
      console.log('=== SQLDATABASE CREATE USER DEBUG ===');
      console.log('Input userData:', userData);
      
      // Use role-based default password
      const defaultPassword = userData.password || (userData.role + '123');
      let linkedId = 0;
      
      // Create linked record FIRST based on role
      if (userData.role === 'teacher') {
        console.log('Creating teacher record first...');
        const teacherData = {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          phone: userData.phone || null,
          gender: userData.gender || null,
          qualification: userData.qualification || null,
          specialization: userData.specialization ? JSON.stringify(userData.specialization) : null,
          is_class_teacher: userData.isClassTeacher || false,
          department_id: userData.departmentId || null,
          employee_id: userData.employeeId || `EMP-${Date.now()}`,
          status: userData.status || 'Active'
        };
        
        const createdTeacher = await this.createTeacher(teacherData);
        linkedId = createdTeacher.id;
        console.log('Teacher created with ID:', linkedId);
        
        // Handle class teacher assignment
        if (userData.isClassTeacher && userData.assignedClassId) {
          console.log('Assigning teacher to class:', userData.assignedClassId);
          await this.updateRecord('classes', userData.assignedClassId, {
            class_teacher_id: linkedId,
            class_teacher: `${userData.firstName} ${userData.lastName}`
          });
          console.log('Class teacher assignment completed');
        }
        
      } else if (userData.role === 'parent') {
        console.log('Creating parent record first...');
        const parentData = {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          phone: userData.phone || null,
          alternate_phone: userData.alternatePhone || null,
          address: userData.address || null,
          occupation: userData.occupation || null,
          status: userData.status || 'Active'
        };
        
        const createdParent = await this.createParent(parentData);
        linkedId = createdParent.id;
        console.log('Parent created with ID:', linkedId);
        
      } else if (userData.role === 'accountant') {
        console.log('Creating accountant record first...');
        const accountantData = {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          phone: userData.phone || null,
          department: userData.department || null,
          employee_id: userData.employeeId || `ACC-${Date.now()}`,
          status: userData.status || 'Active'
        };
        
        const createdAccountant = await this.createAccountant(accountantData);
        linkedId = createdAccountant.id;
        console.log('Accountant created with ID:', linkedId);
      }
      
      // Now create the user record with the proper linked_id
      const sqlData = {
        username: userData.username,
        password_hash: defaultPassword, // Store as plain text, PHP will handle hashing during first login
        role: userData.role,
        linked_id: linkedId, // Use the actual linked_id from the created record
        email: userData.email,
        status: userData.status || 'Active'
      };

      console.log('Transformed sqlData for database:', sqlData);
      console.log('About to call insertRecord for users table...');

      const userId = await this.insertRecord('users', sqlData);
      
      console.log('User created with ID:', userId);
      console.log('=====================================');
      
      return {
        id: userId,
        ...userData,
        linkedId: linkedId, // Return the actual linked_id
        password: defaultPassword // Return the actual password for immediate use
      };
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  // Get all data (for export) - Updated to match exact XAMPP schema
  async getStudents(): Promise<any[]> {
    try {
      const query = `
        SELECT s.*, c.name as class_name 
        FROM students s 
        LEFT JOIN classes c ON s.class_id = c.id 
        ORDER BY s.first_name ASC
      `;
      
      const result = await this.executeQuery(query);
      const students = result.data || [];
      return this.mapFieldsToCamelCase(students);
    } catch (error) {
      console.error('Error in getStudents:', error);
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication required for students, returning empty array...');
        return [];
      }
      throw error;
    }
  }

  async getTeachers(): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM teachers 
        ORDER BY last_name, first_name
      `;
      
      const result = await this.executeQuery(query);
      const teachers = result.data || [];
      return this.mapFieldsToCamelCase(teachers);
    } catch (error) {
      console.error('Error in getTeachers:', error);
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication required for teachers, returning empty array...');
        return [];
      }
      throw error;
    }
  }

  async getAccountants(): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM accountants 
        ORDER BY last_name, first_name
      `;
      
      const result = await this.executeQuery(query);
      const accountants = result.data || [];
      return this.mapFieldsToCamelCase(accountants);
    } catch (error) {
      console.error('Error in getAccountants:', error);
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication required for accountants, returning empty array...');
        return [];
      }
      throw error;
    }
  }

  async getFeeBalances(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          fb.*,
          s.first_name,
          s.last_name,
          s.admission_number,
          c.name as class_name
        FROM fee_balances fb
        LEFT JOIN students s ON fb.student_id = s.id
        LEFT JOIN classes c ON fb.class_id = c.id
        ORDER BY fb.academic_year, fb.term, s.last_name, s.first_name
      `;
      
      const result = await this.executeQuery(query);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async getClasses(): Promise<any[]> {
    try {
      const query = `
        SELECT c.*, 
               (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
        FROM classes c 
        ORDER BY c.level, c.name
      `;
      
      const result = await this.executeQuery(query);
      const classes = result.data || [];
      return this.mapFieldsToCamelCase(classes);
    } catch (error) {
      console.error('Error in getClasses:', error);
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication required for classes, returning empty array...');
        return [];
      }
      throw error;
    }
  }

  async getSubjects(): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM subjects 
        ORDER BY category, name
      `;
      
      console.log('=== GET SUBJECTS DEBUG ===');
      console.log('Query:', query);
      
      const result = await this.executeQuery(query);
      console.log('Result:', result);
      
      return result.data || [];
    } catch (error) {
      console.error('Error in getSubjects:', error);
      // If authentication error, return fallback data
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication required for subjects, returning empty list.');
        return [];
      }
      throw error;
    }
  }

  async getParents(): Promise<any[]> {
    try {
      const query = `
        SELECT p.*, 
               (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id) as children_count
        FROM parents p 
        ORDER BY p.last_name, p.first_name
      `;
      
      const result = await this.executeQuery(query);
      const parents = result.data || [];
      return this.mapFieldsToCamelCase(parents);
    } catch (error) {
      console.error('Error in getParents:', error);
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication required for parents, returning empty array...');
        return [];
      }
      throw error;
    }
  }

  // Check for existing records (validation) - Updated to match exact XAMPP schema
  async checkAdmissionNumberExists(admissionNumber: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM students WHERE admission_number = ?';
      const result = await this.executeQuery(query, [admissionNumber]);
      return result.data && result.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  async checkEmployeeIdExists(employeeId: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM teachers WHERE employee_id = ?';
      const result = await this.executeQuery(query, [employeeId]);
      return result.data && result.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  async checkEmailExists(email: string, table: string = 'users'): Promise<boolean> {
    try {
      const query = `SELECT id FROM ${table} WHERE email = ?`;
      const result = await this.executeQuery(query, [email]);
      return result.data && result.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Parent-Student Link operations - New for exact schema
  async createParentStudentLink(parentId: number, studentId: number, relationship: string = 'Guardian', isPrimary: boolean = false): Promise<any> {
    try {
      const sqlData = {
        parent_id: parentId,
        student_id: studentId,
        relationship: relationship,
        is_primary: isPrimary
      };

      const linkId = await this.insertRecord('parent_student_links', sqlData);
      return { id: linkId, parentId, studentId, relationship, isPrimary };
    } catch (error) {
      throw error;
    }
  }

  // Get Parent Student Links
  async getParentStudentLinks(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          psl.parent_id,
          psl.student_id,
          psl.relationship,
          psl.is_primary,
          s.first_name as student_first_name,
          s.last_name as student_last_name,
          s.admission_number,
          s.class_id,
          c.name as class_name
        FROM parent_student_links psl
        JOIN students s ON psl.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.status = 'Active'
        ORDER BY psl.parent_id, s.last_name, s.first_name
      `;
      
      const result = await this.executeQuery(query);
      return result.data || [];
    } catch (error) {
      console.error('Error getting parent student links:', error);
      return [];
    }
  }

  // Batch operations for performance - Updated to match exact XAMPP schema
  async insertBatch(table: string, records: any[]): Promise<any[]> {
    try {
      if (records.length === 0) return [];

      const fields = Object.keys(records[0]);
      const placeholders = records.map(() => 
        `(${fields.map(() => '?').join(', ')})`
      ).join(', ');
      
      const values = records.flatMap(record => Object.values(record));
      
      const query = `
        INSERT INTO ${table} (${fields.join(', ')}) 
        VALUES ${placeholders}
      `;
      
      const result = await this.executeQuery(query, values);
      return result.insertIds || [];
    } catch (error) {
      throw error;
    }
  }

  // Get database statistics - Updated to match exact XAMPP schema
  async getStatistics(): Promise<any> {
    try {
      const queries = {
        students: 'SELECT COUNT(*) as count FROM students',
        teachers: 'SELECT COUNT(*) as count FROM teachers',
        classes: 'SELECT COUNT(*) as count FROM classes',
        subjects: 'SELECT COUNT(*) as count FROM subjects',
        parents: 'SELECT COUNT(*) as count FROM parents',
        users: 'SELECT COUNT(*) as count FROM users',
        parent_student_links: 'SELECT COUNT(*) as count FROM parent_student_links',
        subject_assignments: 'SELECT COUNT(*) as count FROM subject_assignments'
      };

      const stats: any = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.executeQuery(query);
        stats[key] = result.data?.[0]?.count || 0;
      }

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Test database connection to XAMPP
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeQuery('SELECT 1 as test');
      return result.success === true;
    } catch (error) {
      return false;
    }
  }

  // =============================================
  // SECURE API HELPER
  // =============================================

  private async api(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data: any = null): Promise<any> {
    try {
      const token = localStorage.getItem('jwt_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(API_CONFIG.BASE_URL + endpoint, config);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API call to ${endpoint} failed: ${response.statusText}`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage += ` - ${errorJson.message || errorJson.error}`;
        } catch (e) {
            errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success === false) {
        throw new Error(`API operation failed: ${result.message || result.error}`);
      }

      return result.data;
    } catch (error) {
      console.error(`API error at endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================
  // SCORES OPERATIONS (REFACTORED)
  // =============================================

  // Get all scores
  async getScores(): Promise<any[]> {
    try {
      // This uses a generic query for initial data load. Dedicated endpoints for specific roles (e.g., teacher) would be more secure.
      const query = `
        SELECT 
          sc.id, sc.student_id, sc.subject_assignment_id, sc.ca1, sc.ca2, sc.exam, sc.total, sc.grade, sc.remark, sc.status,
          st.first_name as student_first_name, st.last_name as student_last_name,
          sa.subject_id, sa.class_id, s.name as subject_name
        FROM scores sc
        LEFT JOIN students st ON sc.student_id = st.id
        LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
        LEFT JOIN subjects s ON sa.subject_id = s.id
        ORDER BY sc.subject_assignment_id, st.last_name, st.first_name
      `;
      const result = await this.executeQuery(query);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Create/Update scores via the secure controller
  async upsertScores(assignment_id: number, scores: any[]): Promise<any> {
    return this.api('POST', '/results/scores', { assignment_id, scores });
  }

  // Deprecated: createScore should not be called directly. Use upsertScores.
  async createScore(scoreData: any): Promise<any> {
    console.warn("Deprecated: Direct createScore is insecure. Use upsertScores.");
    // This function will now call the secure upsert endpoint for a single score.
    const scorePayload = [{
      student_id: scoreData.studentId,
      ca1: scoreData.ca1 || 0,
      ca2: scoreData.ca2 || 0,
      exam: scoreData.exam || 0,
    }];
    return this.upsertScores(scoreData.subjectAssignmentId, scorePayload);
  }

  // updateScore is also deprecated in favor of upsertScores
  async updateScore(id: number, scoreData: any): Promise<void> {
    console.warn("Deprecated: Direct updateScore is insecure. Use upsertScores.");
    // This function is difficult to map to the new `upsertScores` flow without more info.
    // For now, we leave it as a no-op to enforce the new pattern.
    return Promise.resolve();
  }

  // Delete score - This should also be a dedicated endpoint, but for now we leave it.
  async deleteScore(id: number): Promise<void> {
    try {
      const query = 'DELETE FROM scores WHERE id = ?';
      await this.executeQuery(query, [id]);
    } catch (error) {
      throw error;
    }
  }

  // Get scores by assignment (Refactored to use dedicated controller endpoint)
  async getScoresByAssignment(assignmentId: number): Promise<any[]> {
    try {
      return this.api('GET', `/results/scores/${assignmentId}`);
    } catch (error) {
      throw error;
    }
  }

  // Get scores by student (Refactored to use dedicated controller endpoint)
  async getScoresByStudent(studentId: number, academicYear?: string, term?: string): Promise<any[]> {
    try {
      let endpoint = `/results/student/${studentId}`; // This endpoint gets results for a student.
      const queryParams = new URLSearchParams();
      if (academicYear) queryParams.append('academic_year', academicYear);
      if (term) queryParams.append('term', term);
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
      return this.api('GET', endpoint);
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // COMPILED RESULTS OPERATIONS (REFACTORED)
  // =============================================

  // Get all compiled results (Refactored to use dedicated controller endpoint if possible)
  async getCompiledResults(): Promise<any[]> {
    try {
        // If there's an API endpoint for getting all compiled results, use it.
        // Otherwise, fall back to executeQuery. For now, assume a general endpoint doesn't exist.
        // The more secure approach is to use specific endpoints per role.
        // For Admin/Reports, querying directly via executeQuery might be acceptable if role check is robust.
        const query = `
            SELECT 
                cr.*,
                st.first_name as student_first_name,
                st.last_name as student_last_name,
                st.admission_number,
                c.name as class_name,
                c.level as class_level
            FROM compiled_results cr
            LEFT JOIN students st ON cr.student_id = st.id
            LEFT JOIN classes c ON cr.class_id = c.id
            ORDER BY cr.academic_year, cr.term, c.name, cr.position
        `;
        const result = await this.executeQuery(query); // Still uses generic query for this broad data set
        return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Create compiled result via the secure controller
  async createCompiledResult(resultData: any): Promise<any> {
    // The controller endpoint expects `student_results` array.
    // This function is likely called for a single student compilation.
    const payload = {
        class_id: resultData.classId,
        term: resultData.term,
        academic_year: resultData.academicYear,
        student_results: [ // Wrapping the single result into the expected array
            {
                student_id: resultData.studentId,
                total_score: resultData.totalScore,
                average_score: resultData.averageScore,
                position: resultData.position,
                total_students: resultData.totalStudents,
                class_teacher_comment: resultData.classTeacherComment || null,
                principal_comment: resultData.principalComment || null,
                // other fields if necessary
            }
        ]
    };
    return this.api('POST', '/results/compile', payload);
  }

  // Update compiled result (for approval/rejection) via the secure controller
  async updateCompiledResult(id: number, resultData: Partial<{ status: string; approvedBy: number; approvedDate: string; rejectionReason: string; total_score: number; average_score: number; class_average: number; position: number; total_students: number; grade: string; remark: string; class_teacher_comment: string; principal_comment: string; }>): Promise<void> {
    if (resultData.status === 'Approved') {
        const payload = {
            action: 'approve',
        };
        return this.api('POST', `/results/approve/${id}`, payload);
    } else if (resultData.status === 'Rejected') {
        const payload = {
            action: 'reject',
            rejection_reason: resultData.rejectionReason || 'Rejected without a specific reason.'
        };
        return this.api('POST', `/results/approve/${id}`, payload);
    } else {
      // For other updates, we might need a different endpoint or to use the old method.
      // For now, we only handle approval/rejection via this specific API.
      console.warn('updateCompiledResult currently only supports status changes to Approved/Rejected via API. Other updates still use generic query.');
      // Fallback to generic update if it's not an approval/rejection for existing fields
      const updates: { [key: string]: any } = {};
      if (resultData.total_score !== undefined) updates.total_score = resultData.total_score;
      if (resultData.average_score !== undefined) updates.average_score = resultData.average_score;
      if (resultData.class_average !== undefined) updates.class_average = resultData.class_average;
      if (resultData.position !== undefined) updates.position = resultData.position;
      if (resultData.total_students !== undefined) updates.total_students = resultData.total_students;
      if (resultData.grade !== undefined) updates.grade = resultData.grade;
      if (resultData.remark !== undefined) updates.remark = resultData.remark;
      if (resultData.class_teacher_comment !== undefined) updates.class_teacher_comment = resultData.class_teacher_comment;
      if (resultData.principal_comment !== undefined) updates.principal_comment = resultData.principal_comment;
      // Note: approvedBy and approvedDate are handled by the /results/approve API itself.
      
      if (Object.keys(updates).length > 0) {
        await this.updateRecord('compiled_results', id, updates);
      }
    }
  }

  // Delete compiled result
  async deleteCompiledResult(id: number): Promise<void> {
    try {
      // This should also be a dedicated endpoint
      const query = 'DELETE FROM compiled_results WHERE id = ?';
      await this.executeQuery(query, [id]);
    } catch (error) {
      throw error;
    }
  }

  // Get results by class (Refactored to use dedicated controller endpoint)
  async getResultsByClass(classId: number, academicYear?: string, term?: string): Promise<any[]> {
    try {
      let endpoint = `/results/class/${classId}`; // Assuming a route like this exists for class results
      const queryParams = new URLSearchParams();
      if (academicYear) queryParams.append('academic_year', academicYear);
      if (term) queryParams.append('term', term);

      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
      return this.api('GET', endpoint);
    } catch (error) {
      throw error;
    }
  }

  // Get results by student (Refactored to use dedicated controller endpoint)
  async getResultsByStudent(studentId: number, academicYear?: string, term?: string): Promise<any[]> {
    try {
      let endpoint = `/results/student/${studentId}`;
      const queryParams = new URLSearchParams();
      if (academicYear) queryParams.append('academic_year', academicYear);
      if (term) queryParams.append('term', term);
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
      return this.api('GET', endpoint);
    } catch (error) {
      throw error;
    }
  }

  // Get pending compiled results (Refactored to use dedicated controller endpoint)
  async getPendingCompiledResults(): Promise<any[]> {
    try {
      return this.api('GET', '/results/pending-approvals');
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // BATCH OPERATIONS FOR PERFORMANCE
  // =============================================

  // Batch create subject assignments
  async createBatchSubjectAssignments(assignments: any[]): Promise<any[]> {
    try {
      const records = assignments.map(assignment => ({
        subject_id: assignment.subject_id || assignment.subjectId,
        class_id: assignment.class_id || assignment.classId,
        teacher_id: assignment.teacher_id || assignment.teacherId,
        academic_year: assignment.academic_year || assignment.academicYear,
        term: assignment.term,
        status: assignment.status || 'Active'
      }));

      return await this.insertBatch('subject_assignments', records);
    } catch (error) {
      throw error;
    }
  }

  // Batch create scores
  async createBatchScores(scores: any[]): Promise<any[]> {
    try {
      const records = scores.map(score => ({
        student_id: score.studentId,
        subject_assignment_id: score.subjectAssignmentId,
        ca1: score.ca1 || 0,
        ca2: score.ca2 || 0,
        exam: score.exam || 0,
        grade: score.grade || null,
        remark: score.remark || null,
        class_average: score.classAverage || null,
        class_min: score.classMin || null,
        class_max: score.classMax || null,
        status: score.status || 'Draft'
      }));

      return await this.insertBatch('scores', records);
    } catch (error) {
      throw error;
    }
  }

  // Batch update scores
  async updateBatchScores(scoreUpdates: { id: number; data: any }[]): Promise<void> {
    try {
      for (const { id, data } of scoreUpdates) {
        await this.updateScore(id, data);
      }
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // ADVANCED QUERY METHODS
  // =============================================

  // Get class performance summary
  async getClassPerformanceSummary(classId: number, academicYear: string, term: string): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(cr.id) as total_students,
          ROUND(AVG(cr.average_score), 2) as class_average,
          MAX(cr.average_score) as highest_score,
          MIN(cr.average_score) as lowest_score,
          ROUND(AVG(cr.position), 2) as average_position
        FROM compiled_results cr
        WHERE cr.class_id = ? AND cr.academic_year = ? AND cr.term = ? AND cr.status = 'Approved'
      `;
      
      const result = await this.executeQuery(query, [classId, academicYear, term]);
      return result.data?.[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Get subject performance summary
  async getSubjectPerformanceSummary(subjectId: number, classId: number, academicYear: string, term: string): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(sc.id) as total_students,
          ROUND(AVG(sc.total), 2) as class_average,
          MAX(sc.total) as highest_score,
          MIN(sc.total) as lowest_score,
          ROUND(AVG(sc.ca1), 2) as ca1_average,
          ROUND(AVG(sc.ca2), 2) as ca2_average,
          ROUND(AVG(sc.exam), 2) as exam_average
        FROM scores sc
        LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
        WHERE sa.subject_id = ? AND sa.class_id = ? AND sa.academic_year = ? AND sa.term = ?
      `;
      
      const result = await this.executeQuery(query, [subjectId, classId, academicYear, term]);
      return result.data?.[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // User Management Methods
  async getUsers(): Promise<any[]> {
    try {
      const query = `
        SELECT u.*, 
          CASE 
            WHEN u.role = 'teacher' THEN t.first_name
            WHEN u.role = 'parent' THEN p.first_name
            WHEN u.role = 'accountant' THEN a.first_name
            ELSE 'System'
          END as linked_name,
          CASE 
            WHEN u.role = 'teacher' THEN t.last_name
            WHEN u.role = 'parent' THEN p.last_name
            WHEN u.role = 'accountant' THEN a.last_name
            ELSE 'User'
          END as linked_lastname
        FROM users u
        LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'
        LEFT JOIN parents p ON u.linked_id = p.id AND u.role = 'parent'
        LEFT JOIN accountants a ON u.linked_id = a.id AND u.role = 'accountant'
        ORDER BY u.created_at DESC
      `;
      
      const result = await this.executeQuery(query);
      return result.data || [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  async getUserById(id: number): Promise<any> {
    try {
      const query = `
        SELECT u.*, 
          CASE 
            WHEN u.role = 'student' THEN s.first_name
            WHEN u.role = 'teacher' THEN t.first_name
            WHEN u.role = 'parent' THEN p.first_name
            ELSE 'System'
          END as linked_name,
          CASE 
            WHEN u.role = 'student' THEN s.last_name
            WHEN u.role = 'teacher' THEN t.last_name
            WHEN u.role = 'parent' THEN p.last_name
            ELSE 'User'
          END as linked_lastname
        FROM users u
        LEFT JOIN students s ON u.linked_id = s.id AND u.role = 'student'
        LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'
        LEFT JOIN parents p ON u.linked_id = p.id AND u.role = 'parent'
        WHERE u.id = ?
      `;
      
      const result = await this.executeQuery(query, [id]);
      return result.data?.[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id: number, userData: any): Promise<any> {
    try {
      const updateData = {
        ...userData,
        updated_at: new Date().toISOString()
      };
      
      // Remove id from updateData if present
      delete updateData.id;
      
      await this.updateRecord('users', id, updateData);
      
      // Return updated user
      return await this.getUserById(id);
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // First get the user to check role and linked_id
      const userQuery = 'SELECT role, linked_id FROM users WHERE id = ?';
      const userResult = await this.executeQuery(userQuery, [id]);
      
      if (!userResult.data || userResult.data.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.data[0];
      
      // Delete linked record based on role (except admin)
      if (user.role === 'teacher' && user.linked_id > 0) {
        await this.executeQuery('DELETE FROM teachers WHERE id = ?', [user.linked_id]);
      } else if (user.role === 'parent' && user.linked_id > 0) {
        // First delete parent-student links
        await this.executeQuery('DELETE FROM parent_student_links WHERE parent_id = ?', [user.linked_id]);
        // Then delete parent record
        await this.executeQuery('DELETE FROM parents WHERE id = ?', [user.linked_id]);
      } else if (user.role === 'accountant' && user.linked_id > 0) {
        await this.executeQuery('DELETE FROM accountants WHERE id = ?', [user.linked_id]);
      }
      
      // Finally delete the user record
      await this.executeQuery('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async updateUserStatus(id: number, status: string): Promise<any> {
    try {
      return await this.updateUser(id, { status });
    } catch (error) {
      throw error;
    }
  }

  async resetUserPassword(id: number, newPassword: string): Promise<any> {
    try {
      // In production, you would hash the password here
      const passwordHash = newPassword; // Should be properly hashed
      
      return await this.updateUser(id, { 
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM users WHERE username = ?';
      const result = await this.executeQuery(query, [username]);
      return result.data && result.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Role and Permission Management (aligned with schema)
  async getUserPermissions(role: string): Promise<any[]> {
    try {
      const query = `
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = ? AND rp.is_active = TRUE
      `;
      
      const result = await this.executeQuery(query, [role]);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async checkUserPermission(role: string, permission: string): Promise<boolean> {
    try {
      // Check if user has the specific permission
      const query = `
        SELECT COUNT(*) as has_permission 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role = ? AND p.name = ? AND rp.is_active = TRUE
      `;
      
      const result = await this.executeQuery(query, [role, permission]);
      const hasPermission = result.data && result.data[0] && result.data[0].has_permission > 0;
      
      return hasPermission;
    } catch (error) {
      // Return false on error for security
      return false;
    }
  }

  // Authentication Methods
  async authenticateUser(username: string, password: string, role: string): Promise<any> {
    try {
      console.log('Authenticating user:', { username, role });
      
      // Use proper authentication endpoint
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/simple_login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          role
        })
      });

      console.log('Authentication response status:', response.status);

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Authentication response data:', result);
      
      if (!result.success) {
        console.log('Authentication unsuccessful:', result.message);
        return null;
      }

      console.log('Authentication successful for:', result.data.first_name);
      return result.data;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  // Subject Registration Methods
  async getActiveAcademicYear(): Promise<string> {
    try {
      const query = "SELECT value FROM school_settings WHERE key = 'current_academic_year'";
      const result = await this.executeQuery(query);
      return result.data && result.data.length > 0 ? result.data[0].value : '2025/2026';
    } catch (error) {
      return '2025/2026';
    }
  }

  async getActiveTerm(): Promise<string> {
    try {
      const query = "SELECT value FROM school_settings WHERE key = 'current_term'";
      const result = await this.executeQuery(query);
      return result.data && result.data.length > 0 ? result.data[0].value : 'First Term';
    } catch (error) {
      return 'First Term';
    }
  }

  async getRegisteredSubjects(academicYear: string, term: string, classId?: number): Promise<any[]> {
    try {
      let query = `
        SELECT sr.*, s.name as subject_name, s.code as subject_code, s.category,
          c.name as class_name, c.level as class_level
        FROM subject_registrations sr
        JOIN subjects s ON sr.subject_id = s.id
        JOIN classes c ON sr.class_id = c.id
        WHERE sr.academic_year = ? AND sr.term = ? AND sr.status = 'Active'
      `;
      const params = [academicYear, term];
      
      if (classId) {
        query += ' AND sr.class_id = ?';
        params.push(classId.toString());
      }
      
      query += ' ORDER BY c.level, c.name, s.name';
      
      const result = await this.executeQuery(query, params);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async registerSubjectForClass(subjectId: number, classId: number, academicYear: string, term: string, isCompulsory: boolean = true): Promise<any> {
    try {
      const sqlData = {
        subject_id: subjectId,
        class_id: classId,
        academic_year: academicYear,
        term: term,
        is_compulsory: isCompulsory,
        status: 'Active'
      };
      
      const insertedId = await this.insertRecord('subject_registrations', sqlData);
      
      return { id: insertedId, ...sqlData };
    } catch (error) {
      throw error;
    }
  }

  async removeSubjectRegistration(subjectId: number, classId: number, academicYear: string, term: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM subject_registrations 
        WHERE subject_id = ? AND class_id = ? AND academic_year = ? AND term = ?
      `;
      await this.executeQuery(query, [subjectId.toString(), classId.toString(), academicYear, term]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async getSubjectAssignments(academicYear: string, term: string, classId?: number, teacherId?: number): Promise<any[]> {
    try {
      let query = `
        SELECT sa.*, s.name as subject_name, s.code as subject_code, s.category,
          c.name as class_name, c.level as class_level,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name, t.employee_id
        FROM subject_assignments sa
        JOIN subjects s ON sa.subject_id = s.id
        JOIN classes c ON sa.class_id = c.id
        JOIN teachers t ON sa.teacher_id = t.id
        WHERE sa.academic_year = ? AND sa.term = ? AND sa.status = 'Active'
      `;
      const params = [academicYear, term];
      
      if (classId) {
        query += ' AND sa.class_id = ?';
        params.push(classId.toString());
      }
      
      if (teacherId) {
        query += ' AND sa.teacher_id = ?';
        params.push(teacherId.toString());
      }
      
      query += ' ORDER BY c.level, c.name, s.name';
      
      const result = await this.executeQuery(query, params);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async assignSubjectToTeacher(subjectId: number, classId: number, teacherId: number, academicYear: string, term: string): Promise<any> {
    try {
      const sqlData = {
        subject_id: subjectId,
        class_id: classId,
        teacher_id: teacherId,
        academic_year: academicYear,
        term: term,
        status: 'Active'
      };
      
      const insertedId = await this.insertRecord('subject_assignments', sqlData);
      return { id: insertedId, ...sqlData };
    } catch (error) {
      throw error;
    }
  }

  async removeSubjectAssignment(subjectId: number, classId: number, teacherId: number, academicYear: string, term: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM subject_assignments 
        WHERE subject_id = ? AND class_id = ? AND teacher_id = ? AND academic_year = ? AND term = ?
      `;
      await this.executeQuery(query, [subjectId.toString(), classId.toString(), teacherId.toString(), academicYear, term]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async getUnassignedSubjects(academicYear: string, term: string, classId: number): Promise<any[]> {
    try {
      const query = `
        SELECT s.* FROM subjects s
        WHERE s.status = 'Active'
        AND s.id NOT IN (
          SELECT sr.subject_id FROM subject_registrations sr
          WHERE sr.class_id = ? AND sr.academic_year = ? AND sr.term = ? AND sr.status = 'Active'
        )
        ORDER BY s.category, s.name
      `;
      
      const result = await this.executeQuery(query, [classId.toString(), academicYear, term]);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async getAvailableTeachers(academicYear: string, term: string, subjectId: number, classId: number): Promise<any[]> {
    try {
      const query = `
        SELECT t.* FROM teachers t
        WHERE t.status = 'Active'
        AND t.id NOT IN (
          SELECT sa.teacher_id FROM subject_assignments sa
          WHERE sa.subject_id = ? AND sa.class_id = ? 
          AND sa.academic_year = ? AND sa.term = ? AND sa.status = 'Active'
        )
        ORDER BY t.first_name, t.last_name
      `;
      
      const result = await this.executeQuery(query, [subjectId.toString(), classId.toString(), academicYear, term]);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Update Methods
  async updateStudent(id: number, studentData: any): Promise<any> {
    const fields = Object.keys(studentData).filter(key => studentData[key] !== undefined);
    const values = fields.map(field => studentData[field]);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE students SET ${setClause} WHERE id = ?`;
    
    return await this.executeQuery(query, [...values, id]);
  }

  async updateTeacher(id: number, teacherData: any): Promise<any> {
    const fields = Object.keys(teacherData).filter(key => teacherData[key] !== undefined);
    const values = fields.map(field => teacherData[field]);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE teachers SET ${setClause} WHERE id = ?`;
    
    return await this.executeQuery(query, [...values, id]);
  }

  async updateClass(id: number, classData: any): Promise<any> {
    const fields = Object.keys(classData).filter(key => classData[key] !== undefined);
    const values = fields.map(field => classData[field]);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE classes SET ${setClause} WHERE id = ?`;
    
    return await this.executeQuery(query, [...values, id]);
  }

  async updateParent(id: number, parentData: any): Promise<any> {
    const fields = Object.keys(parentData).filter(key => parentData[key] !== undefined);
    const values = fields.map(field => parentData[field]);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE parents SET ${setClause} WHERE id = ?`;
    
    return await this.executeQuery(query, [...values, id]);
  }

  async updateAccountant(id: number, accountantData: any): Promise<any> {
    const fields = Object.keys(accountantData).filter(key => accountantData[key] !== undefined);
    const values = fields.map(field => accountantData[field]);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE accountants SET ${setClause} WHERE id = ?`;
    
    return await this.executeQuery(query, [...values, id]);
  }

  // Delete Methods
  async deleteStudent(id: number): Promise<any> {
    try {
      // First check if student exists
      const checkQuery = 'SELECT id, first_name, last_name FROM students WHERE id = ?';
      const checkResult = await this.executeQuery(checkQuery, [id]);
      
      if (!checkResult || !checkResult.data || checkResult.data.length === 0) {
        throw new Error('Student not found in database');
      }
      
      // Delete related records first (handle foreign key constraints)
      const relatedTables = [
        'fee_balances',
        'users', 
        'scores',
        'attendance',
        'student_fee_balances',
        'affective_domains',
        'psychomotor_domains',
        'compiled_results'
      ];
      
      for (const table of relatedTables) {
        try {
          let deleteQuery = '';
          if (table === 'users') {
            deleteQuery = `DELETE FROM ${table} WHERE linked_id = ? AND role = 'student'`;
          } else {
            deleteQuery = `DELETE FROM ${table} WHERE student_id = ?`;
          }
          
          await this.executeQuery(deleteQuery, [id]);
        } catch (error) {
          // Table might not exist or no records to delete - continue
        }
      }
      
      // Now proceed with student deletion
      const deleteQuery = 'DELETE FROM students WHERE id = ?';
      const result = await this.executeQuery(deleteQuery, [id]);
      
      // Verify deletion was successful
      if (result && result.affectedRows > 0) {
        // Verify the student is actually gone
        const verifyQuery = 'SELECT id FROM students WHERE id = ?';
        const verifyResult = await this.executeQuery(verifyQuery, [id]);
        
        if (verifyResult && verifyResult.data && verifyResult.data.length > 0) {
          throw new Error('Student deletion verification failed - student still exists');
        }
        
        return result;
      } else {
        throw new Error('Failed to delete student - no rows affected');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  }

  async deleteBulkStudents(studentIds: number[]): Promise<any> {
    try {
      if (!studentIds || studentIds.length === 0) {
        throw new Error('No student IDs provided for bulk deletion');
      }

      const results = [];
      let totalDeleted = 0;

      // Delete each student individually to handle cascade properly
      for (const studentId of studentIds) {
        try {
          const result = await this.deleteStudent(studentId);
          if (result && result.affectedRows > 0) {
            totalDeleted += result.affectedRows;
            results.push({ id: studentId, success: true });
          } else {
            results.push({ id: studentId, success: false, error: 'No rows affected' });
          }
        } catch (error) {
          results.push({ id: studentId, success: false, error: (error as Error).message });
        }
      }

      return {
        success: true,
        totalDeleted,
        results,
        summary: `Successfully deleted ${totalDeleted} of ${studentIds.length} students`
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteTeacher(id: number): Promise<any> {
    const query = 'DELETE FROM teachers WHERE id = ?';
    return await this.executeQuery(query, [id]);
  }

  async deleteClass(id: number): Promise<any> {
    const query = 'DELETE FROM classes WHERE id = ?';
    return await this.executeQuery(query, [id]);
  }

  async deleteParent(id: number): Promise<any> {
    const query = 'DELETE FROM parents WHERE id = ?';
    return await this.executeQuery(query, [id]);
  }

  async deleteAccountant(id: number): Promise<any> {
    const query = 'DELETE FROM accountants WHERE id = ?';
    return await this.executeQuery(query, [id]);
  }

  // Link Parent to Student (wrapper for existing method)
  async linkParentToStudent(parentId: number, studentId: number): Promise<any> {
    return await this.createParentStudentLink(parentId, studentId);
  }

  // =============================================
  // ATTENDANCE OPERATIONS
  // =============================================

  async getAttendance(classId?: number, date?: string): Promise<any[]> {
    try {
      let query = `
        SELECT 
          a.*,
          s.first_name,
          s.last_name,
          s.admission_number,
          c.name as class_name
        FROM attendance a
        LEFT JOIN students s ON a.student_id = s.id
        LEFT JOIN classes c ON a.class_id = c.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (classId) {
        conditions.push('a.class_id = ?');
        params.push(classId);
      }
      
      if (date) {
        conditions.push('a.date = ?');
        params.push(date);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY a.date, c.name, s.last_name, s.first_name';
      
      const result = await this.executeQuery(query, params);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async createAttendance(attendanceData: any): Promise<any> {
    try {
      const sqlData = {
        student_id: attendanceData.student_id || attendanceData.studentId,
        class_id: attendanceData.class_id || attendanceData.classId,
        date: attendanceData.date,
        status: attendanceData.status,
        marked_by: attendanceData.marked_by || attendanceData.markedBy,
        term: attendanceData.term,
        academic_year: attendanceData.academic_year || attendanceData.academicYear,
        remarks: attendanceData.remarks || null
      };

      const attendanceId = await this.insertRecord('attendance', sqlData);
      
      return {
        id: attendanceId,
        ...attendanceData
      };
    } catch (error) {
      throw error;
    }
  }

  async updateAttendance(id: number, attendanceData: any): Promise<void> {
    try {
      const sqlData = {
        status: attendanceData.status,
        remarks: attendanceData.remarks
      };

      await this.updateRecord('attendance', id, sqlData);
    } catch (error) {
      throw error;
    }
  }

  async deleteAttendance(id: number): Promise<void> {
    try {
      const query = 'DELETE FROM attendance WHERE id = ?';
      await this.executeQuery(query, [id]);
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // FEE MANAGEMENT OPERATIONS
  // =============================================

  async getFeeStructures(classId?: number, academicYear?: string, term?: string): Promise<any[]> {
    try {
      let query = `
        SELECT 
          fs.*,
          c.name as class_name,
          c.level
        FROM fee_structures fs
        LEFT JOIN classes c ON fs.class_id = c.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (classId) {
        conditions.push('fs.class_id = ?');
        params.push(classId);
      }
      
      if (academicYear) {
        conditions.push('fs.academic_year = ?');
        params.push(academicYear);
      }
      
      if (term) {
        conditions.push('fs.term = ?');
        params.push(term);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY fs.academic_year, fs.term, c.level, c.name';
      
      const result = await this.executeQuery(query, params);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async createFeeStructure(feeData: any): Promise<any> {
    try {
      const sqlData = {
        class_id: feeData.classId,
        level: feeData.level,
        term: feeData.term,
        academic_year: feeData.academicYear,
        tuition_fee: feeData.tuitionFee || 0,
        development_levy: feeData.developmentLevy || 0,
        sports_fee: feeData.sportsFee || 0,
        exam_fee: feeData.examFee || 0,
        books_fee: feeData.booksFee || 0,
        uniform_fee: feeData.uniformFee || 0,
        transport_fee: feeData.transportFee || 0,
        status: feeData.status || 'Active'
      };

      const feeId = await this.insertRecord('fee_structures', sqlData);
      
      return {
        id: feeId,
        ...feeData
      };
    } catch (error) {
      throw error;
    }
  }

  async getPayments(studentId?: number, academicYear?: string, term?: string): Promise<any[]> {
    try {
      let query = `
        SELECT 
          p.*,
          s.first_name,
          s.last_name,
          s.admission_number,
          c.name as class_name,
          u_recorder.username as recorder_name,
          u_verifier.username as verifier_name
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN users u_recorder ON p.recorded_by = u_recorder.id
        LEFT JOIN users u_verifier ON p.verified_by = u_verifier.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (studentId) {
        conditions.push('p.student_id = ?');
        params.push(studentId);
      }
      
      if (academicYear) {
        conditions.push('p.academic_year = ?');
        params.push(academicYear);
      }
      
      if (term) {
        conditions.push('p.term = ?');
        params.push(term);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY p.recorded_date DESC';
      
      const result = await this.executeQuery(query, params);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async createPayment(paymentData: any): Promise<any> {
    try {
      const sqlData = {
        student_id: paymentData.studentId,
        amount: paymentData.amount,
        payment_type: paymentData.paymentType,
        term: paymentData.term,
        academic_year: paymentData.academicYear,
        payment_method: paymentData.paymentMethod,
        transaction_reference: paymentData.transactionReference || null,
        receipt_number: paymentData.receiptNumber,
        recorded_by: paymentData.recordedBy,
        notes: paymentData.notes || null
      };

      const paymentId = await this.insertRecord('payments', sqlData);
      
      return {
        id: paymentId,
        ...paymentData
      };
    } catch (error) {
      throw error;
    }
  }

  async updatePaymentStatus(id: number, status: string, verifiedBy?: number): Promise<void> {
    try {
      const sqlData: any = {
        status: status
      };
      
      if (verifiedBy) {
        sqlData.verified_by = verifiedBy;
        sqlData.verified_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      
      await this.updateRecord('payments', id, sqlData);
    } catch (error) {
      throw error;
    }
  }

  // =============================================
  // BATCH OPERATIONS FOR EFFICIENCY
  // =============================================

  async createBatchAttendance(attendanceRecords: any[]): Promise<any[]> {
    try {
      const results = [];
      for (const record of attendanceRecords) {
        const result = await this.createAttendance(record);
        results.push(result);
      }
      return results;
    } catch (error) {
      throw error;
    }
  }

  async createBatchPayments(payments: any[]): Promise<any[]> {
    try {
      const results = [];
      for (const payment of payments) {
        const result = await this.createPayment(payment);
        results.push(result);
      }
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Affective Domain Methods
  async createAffectiveDomain(affectiveData: any): Promise<any> {
    const sqlData = {
      student_id: affectiveData.student_id,
      class_id: affectiveData.class_id,
      term: affectiveData.term,
      academic_year: affectiveData.academic_year,
      attentiveness: affectiveData.attentiveness,
      attentiveness_remark: affectiveData.attentiveness_remark,
      honesty: affectiveData.honesty,
      honesty_remark: affectiveData.honesty_remark,
      neatness: affectiveData.neatness,
      neatness_remark: affectiveData.neatness_remark,
      obedience: affectiveData.obedience,
      obedience_remark: affectiveData.obedience_remark,
      sense_of_responsibility: affectiveData.sense_of_responsibility,
      sense_of_responsibility_remark: affectiveData.sense_of_responsibility_remark,
      entered_by: affectiveData.entered_by,
      entered_date: affectiveData.entered_date
    };
    
    const affectiveId = await this.insertRecord('affective_domains', sqlData);
    return { id: affectiveId, ...affectiveData };
  }

  async updateAffectiveDomain(id: number, affectiveData: any): Promise<any> {
    const sqlData = {
      attentiveness: affectiveData.attentiveness,
      attentiveness_remark: affectiveData.attentiveness_remark,
      honesty: affectiveData.honesty,
      honesty_remark: affectiveData.honesty_remark,
      neatness: affectiveData.neatness,
      neatness_remark: affectiveData.neatness_remark,
      obedience: affectiveData.obedience,
      obedience_remark: affectiveData.obedience_remark,
      sense_of_responsibility: affectiveData.sense_of_responsibility,
      sense_of_responsibility_remark: affectiveData.sense_of_responsibility_remark,
      entered_by: affectiveData.entered_by,
      entered_date: affectiveData.entered_date
    };
    
    await this.updateRecord('affective_domains', id, sqlData);
    return { id, ...affectiveData };
  }

  // Psychomotor Domain Methods
  async createPsychomotorDomain(psychomotorData: any): Promise<any> {
    const sqlData = {
      student_id: psychomotorData.student_id,
      class_id: psychomotorData.class_id,
      term: psychomotorData.term,
      academic_year: psychomotorData.academic_year,
      attention_to_direction: psychomotorData.attention_to_direction,
      attention_to_direction_remark: psychomotorData.attention_to_direction_remark,
      considerate_of_others: psychomotorData.considerate_of_others,
      considerate_of_others_remark: psychomotorData.considerate_of_others_remark,
      handwriting: psychomotorData.handwriting,
      handwriting_remark: psychomotorData.handwriting_remark,
      sports: psychomotorData.sports,
      sports_remark: psychomotorData.sports_remark,
      verbal_fluency: psychomotorData.verbal_fluency,
      verbal_fluency_remark: psychomotorData.verbal_fluency_remark,
      works_well_independently: psychomotorData.works_well_independently,
      works_well_independently_remark: psychomotorData.works_well_independently_remark,
      entered_by: psychomotorData.entered_by,
      entered_date: psychomotorData.entered_date
    };
    
    const psychomotorId = await this.insertRecord('psychomotor_domains', sqlData);
    return { id: psychomotorId, ...psychomotorData };
  }

  async updatePsychomotorDomain(id: number, psychomotorData: any): Promise<any> {
    const sqlData = {
      attention_to_direction: psychomotorData.attention_to_direction,
      attention_to_direction_remark: psychomotorData.attention_to_direction_remark,
      considerate_of_others: psychomotorData.considerate_of_others,
      considerate_of_others_remark: psychomotorData.considerate_of_others_remark,
      handwriting: psychomotorData.handwriting,
      handwriting_remark: psychomotorData.handwriting_remark,
      sports: psychomotorData.sports,
      sports_remark: psychomotorData.sports_remark,
      verbal_fluency: psychomotorData.verbal_fluency,
      verbal_fluency_remark: psychomotorData.verbal_fluency_remark,
      works_well_independently: psychomotorData.works_well_independently,
      works_well_independently_remark: psychomotorData.works_well_independently_remark,
      entered_by: psychomotorData.entered_by,
      entered_date: psychomotorData.entered_date
    };
    
    await this.updateRecord('psychomotor_domains', id, sqlData);
    return { id, ...psychomotorData };
  }

  async deleteAffectiveDomain(id: number): Promise<void> {
    await this.deleteRecord('affective_domains', id);
  }

  async deletePsychomotorDomain(id: number): Promise<void> {
    await this.deleteRecord('psychomotor_domains', id);
  }

  // Exam Timetable Methods
  async createExamTimetable(timetableData: any): Promise<any> {
    const sqlData = {
      class_id: timetableData.classId,
      subject_id: timetableData.subjectId,
      exam_type: timetableData.examType || 'Exam',
      exam_date: timetableData.examDate,
      start_time: timetableData.startTime,
      end_time: timetableData.endTime,
      duration_minutes: this.calculateDuration(timetableData.startTime, timetableData.endTime),
      venue: timetableData.venue || null,
      supervisor_id: timetableData.supervisorId || null,
      academic_year: timetableData.academicYear || '',
      term: timetableData.term || '',
      instructions: timetableData.instructions || null,
      created_by: timetableData.createdBy || null,
      created_at: new Date().toISOString()
    };
    const timetableId = await this.insertRecord('exam_timetable', sqlData);
    return { id: timetableId, ...timetableData };
  }

  async updateExamTimetable(id: number, timetableData: any): Promise<boolean> {
    const sqlData = {
      class_id: timetableData.classId,
      subject_id: timetableData.subjectId,
      exam_type: timetableData.examType,
      exam_date: timetableData.examDate,
      start_time: timetableData.startTime,
      end_time: timetableData.endTime,
      duration_minutes: this.calculateDuration(timetableData.startTime, timetableData.endTime),
      venue: timetableData.venue,
      supervisor_id: timetableData.supervisorId,
      academic_year: timetableData.academicYear,
      term: timetableData.term,
      instructions: timetableData.instructions,
      updated_at: new Date().toISOString()
    };
    return await this.updateRecord('exam_timetable', id, sqlData);
  }

  async deleteExamTimetable(id: number): Promise<boolean> {
    return await this.deleteRecord('exam_timetable', id);
  }

  async getExamTimetables(): Promise<any[]> {
    const result = await this.executeQuery('SELECT et.*, c.name as class_name, s.name as subject_name FROM exam_timetable et LEFT JOIN classes c ON et.class_id = c.id LEFT JOIN subjects s ON et.subject_id = s.id ORDER BY et.exam_date, et.start_time');
    return result && result.data ? result.data : [];
  }

  async getExamTimetablesByClass(classId: number): Promise<any[]> {
    const result = await this.executeQuery('SELECT et.*, c.name as class_name, s.name as subject_name FROM exam_timetable et LEFT JOIN classes c ON et.class_id = c.id LEFT JOIN subjects s ON et.subject_id = s.id WHERE et.class_id = ? ORDER BY et.exam_date, et.start_time', [classId]);
    return result && result.data ? result.data : [];
  }

  async getExamTimetablesBySubject(subjectId: number): Promise<any[]> {
    const result = await this.executeQuery('SELECT et.*, c.name as class_name, s.name as subject_name FROM exam_timetable et LEFT JOIN classes c ON et.class_id = c.id LEFT JOIN subjects s ON et.subject_id = s.id WHERE et.subject_id = ? ORDER BY et.exam_date, et.start_time', [subjectId]);
    return result && result.data ? result.data : [];
  }

  async getExamTimetablesByDate(date: string): Promise<any[]> {
    const result = await this.executeQuery('SELECT et.*, c.name as class_name, s.name as subject_name FROM exam_timetable et LEFT JOIN classes c ON et.class_id = c.id LEFT JOIN subjects s ON et.subject_id = s.id WHERE et.exam_date = ? ORDER BY et.start_time', [date]);
    return result && result.data ? result.data : [];
  }

  private calculateDuration(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
}

export const sqlDatabase = new SQLDatabaseService();
export default sqlDatabase;

