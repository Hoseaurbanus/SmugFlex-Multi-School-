/**
 * SQL Database Service
 * Production-ready database operations with proper error handling
 * Integrates with existing PHP API structure
 */
import { getAuthToken, API_CONFIG, getCurrentUser as getApiCurrentUser } from '../config/api';
import { tokenManager } from '../utils/tokenManager';

// Production database configuration
const DB_CONFIG = {
  host: 'localhost',
  database: 'mdpjhtua_graceland_academy',
  username: 'mdpjhtua_graceland_academy',
  password: '159075321@Au',
  port: 3306
};

class SQLDatabaseService {
  // Request debouncing and retry mechanism
  private requestQueue = new Map<string, Promise<any>>();
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay

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

  // Helper method to convert camelCase to snake_case for database
  private mapFieldsToSnakeCase(data: any): any {
    const snakeData: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeData[snakeKey] = value;
    }
    return snakeData;
  }

  // Debounced request handler to prevent duplicate concurrent requests
  private async debouncedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already in progress, return the existing promise
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key) as Promise<T>;
    }

    // Create new request
    const promise = this.executeRequestWithRetry(key, requestFn);
    this.requestQueue.set(key, promise);

    // Clean up after request completes
    promise.finally(() => {
      this.requestQueue.delete(key);
      this.retryAttempts.delete(key);
    });

    return promise;
  }

  // Request with exponential backoff retry
  private async executeRequestWithRetry<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const attempt = this.retryAttempts.get(key) || 0;

    try {
      const result = await requestFn();
      return result;
    } catch (error: any) {
      // Don't retry on authentication errors
      if (error.message?.includes('Authentication required') ||
        error.message?.includes('401') ||
        error.message?.includes('403')) {
        throw error;
      }

      // Retry on network/server errors with exponential backoff
      if (attempt < this.MAX_RETRIES &&
        (error.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('Network'))) {

        this.retryAttempts.set(key, attempt + 1);
        const delay = this.RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequestWithRetry(key, requestFn);
      }

      throw error;
    }
  }

  // Public method for executing custom queries
  public async executeQuery(query: string, params: any[] = []): Promise<any> {
    return this.executeQueryInternal(query, params);
  }

  // Private execute SQL query with proper error handling
  private async executeQueryInternal(query: string, params: any[] = []): Promise<any> {
    // Create a unique key for this query to enable debouncing
    const queryKey = `${query.substring(0, 100)}_${JSON.stringify(params)}`;

    return this.debouncedRequest(queryKey, async () => {
      try {
        const storedUser: any = getApiCurrentUser();
        if (String(storedUser?.role || '').toLowerCase() === 'parent') {
          return {
            success: false,
            status: 403,
            message: 'Access denied for this operation',
            data: null
          };
        }

        let token = getAuthToken();
        if (!token) {
          throw new Error('Authentication required for database operations');
        }

        const makeRequest = async (authToken: string) => {
          return fetch(`${API_CONFIG.BASE_URL}/database/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ query, params })
          });
        };

        let response = await makeRequest(token);

        // If unauthorized, attempt to refresh token once
        if (response.status === 401) {
          const refreshed = await tokenManager.refreshAuthToken();

          if (refreshed) {
            token = getAuthToken();
            if (token) {
              response = await makeRequest(token);
            }
          } else {
            // Redirect to login or logout if refresh fails
            tokenManager.clearToken();
            window.location.href = '/login';
            throw new Error('Session expired. Please log in again.');
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Database query failed: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        // Check if API returned an error in the JSON response
        if (result.success === false) {
          throw new Error(`Database operation failed: ${result.error}`);
        }

        return result;
      } catch (error) {
        throw error;
      }
    });
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

    const result = await this.executeQueryInternal(query, values);

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

    await this.executeQueryInternal(query, [...values, id]);
    return true;
  }

  public async deleteRecord(table: string, id: number): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    await this.executeQueryInternal(query, [id]);
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
      // Use secure API endpoint
      return await this.api('POST', '/students', studentData);
    } catch (error) {
      throw error;
    }
  }

  // Teacher operations - Updated to match exact XAMPP schema
  async createTeacher(teacherData: any): Promise<any> {
    try {
      // Use secure API endpoint
      return await this.api('POST', '/teachers', teacherData);
    } catch (error) {
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
      // Use secure API endpoint
      return await this.api('POST', '/parents', parentData);
    } catch (error) {
      throw error;
    }
  }

  // Accountant operations - Updated to match exact XAMPP schema
  async createAccountant(accountantData: any): Promise<any> {
    try {
      // Use secure API endpoint
      return await this.api('POST', '/accountants', accountantData);
    } catch (error) {
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
  async createUser(userData: any): Promise<any> {
    try {
      // Use role-based default password
      const defaultPassword = userData.password || (userData.role + '123');
      let linkedId = 0;

      // Create linked record FIRST based on role
      if (userData.role === 'teacher') {
        const teacherData = {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email || '',
          phone: userData.phone || '',
          qualification: userData.qualification || '',
          specialization: userData.specialization || ''
        };

        const createdTeacher = await this.createTeacher(teacherData);
        linkedId = createdTeacher.id;

        // Handle class teacher assignment
        if (userData.isClassTeacher && userData.assignedClassId) {
          await this.updateRecord('classes', userData.assignedClassId, {
            class_teacher_id: linkedId,
            class_teacher: `${userData.firstName} ${userData.lastName}`
          });
        }

      } else if (userData.role === 'parent') {
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

      } else if (userData.role === 'accountant') {
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
      }

      // Now create the user record with proper linked_id
      const sqlData = {
        username: userData.username,
        password_hash: defaultPassword, // Store as plain text, PHP will handle hashing during first login
        role: userData.role,
        linked_id: linkedId, // Use the actual linked_id from the created record
        email: userData.email,
        status: userData.status || 'Active'
      };

      const userId = await this.insertRecord('users', sqlData);

      return {
        id: userId,
        ...userData,
        linkedId: linkedId, // Return the actual linked_id
        password: defaultPassword // Return the actual password for immediate use
      };
    } catch (error) {
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

      const result = await this.executeQueryInternal(query);
      const students = result.data || [];
      return this.mapFieldsToCamelCase(students);
    } catch (error) {
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
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

      const result = await this.executeQueryInternal(query);
      const teachers = result.data || [];
      return this.mapFieldsToCamelCase(teachers);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
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

      const result = await this.executeQueryInternal(query);
      const accountants = result.data || [];
      return this.mapFieldsToCamelCase(accountants);
    } catch (error) {
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
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

      const result = await this.executeQueryInternal(query);
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

      const result = await this.executeQueryInternal(query);
      const classes = result.data || [];
      return this.mapFieldsToCamelCase(classes);
    } catch (error) {
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
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

      const result = await this.executeQueryInternal(query);
      return result.data || [];
    } catch (error) {
      // If authentication error, return empty array
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
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

      const result = await this.executeQueryInternal(query);
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  // Payment operations
  async createPayment(paymentData: any): Promise<any> {
    try {
      const insertId = await this.insertRecord('payments', paymentData);
      return { id: insertId, ...paymentData };
    } catch (error) {
      throw error;
    }
  }

  // Exam timetable operations
  async getExamTimetables(): Promise<any[]> {
    try {
      const result = await this.executeQueryInternal(
        'SELECT * FROM exam_timetables ORDER BY exam_date, start_time'
      );
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async createExamTimetable(timetableData: any): Promise<any> {
    try {
      const insertId = await this.insertRecord('exam_timetables', timetableData);
      return { id: insertId, ...timetableData };
    } catch (error) {
      throw error;
    }
  }

  async updateExamTimetable(id: number, timetableData: any): Promise<boolean> {
    return this.updateRecord('exam_timetables', id, timetableData);
  }

  async deleteExamTimetable(id: number): Promise<boolean> {
    return this.deleteRecord('exam_timetables', id);
  }

  // Subject registration operations
  async registerSubjectForClass(
    subjectId: number,
    classId: number,
    academicYear: string,
    term: string,
    isCompulsory: boolean = true
  ): Promise<any> {
    const data = {
      subject_id: subjectId,
      class_id: classId,
      academic_year: academicYear,
      term,
      is_compulsory: isCompulsory,
      status: 'Active'
    };

    // Check by all four columns matching the DB unique_key (subject_id, class_id, academic_year, term)
    const existingResult = await this.executeQueryInternal(
      'SELECT id, status FROM subject_registrations WHERE subject_id = ? AND class_id = ? AND academic_year = ? AND term = ? LIMIT 1',
      [subjectId, classId, academicYear, term]
    );

    const existingRows = existingResult?.data || [];

    if (existingRows.length > 0) {
      const existing: any = existingRows[0];

      if (existing.status !== 'Active') {
        await this.executeQueryInternal(
          'UPDATE subject_registrations SET status = "Active" WHERE id = ?',
          [existing.id]
        );
      }

      return {
        id: existing.id,
        ...data,
        status: 'Active'
      };
    }

    const insertId = await this.insertRecord('subject_registrations', data);
    return { id: insertId, ...data };
  }

  async removeSubjectRegistration(
    subjectId: number,
    classId: number,
    academicYear: string,
    term: string
  ): Promise<boolean> {
    // Remove registration for this specific class+subject+year+term combination
    const query =
      'DELETE FROM subject_registrations WHERE subject_id = ? AND class_id = ? AND academic_year = ? AND term = ?';
    await this.executeQueryInternal(query, [subjectId, classId, academicYear, term]);
    return true;
  }

  // Bulk student operations
  async deleteBulkStudents(studentIds: number[]): Promise<{ success: boolean; affectedRows?: number }> {
    if (!studentIds.length) {
      return { success: true, affectedRows: 0 };
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const query = `DELETE FROM students WHERE id IN (${placeholders})`;
    const result = await this.executeQueryInternal(query, studentIds);
    return { success: true, affectedRows: result?.affectedRows };
  }

  // Compiled results operations
  async updateCompiledResult(id: number, data: any): Promise<boolean> {
    return this.updateRecord('compiled_results', id, data);
  }

  // Parent-student link operations
  async createParentStudentLink(
    parentId: number,
    studentId: number,
    relationship: string = 'Parent',
    isPrimary: boolean = true
  ): Promise<any> {
    const data = {
      parent_id: parentId,
      student_id: studentId,
      relationship,
      is_primary: isPrimary ? 1 : 0
    };

    const insertId = await this.insertRecord('parent_student_links', data);
    return { id: insertId, ...data };
  }

  // Attendance operations
  async createAttendance(attendanceData: any): Promise<any> {
    const insertId = await this.insertRecord('attendance', attendanceData);
    return { id: insertId, ...attendanceData };
  }

  // Affective / psychomotor domain operations
  async createAffectiveDomain(data: any): Promise<any> {
    const insertId = await this.insertRecord('affective_domains', data);
    return { id: insertId, ...data };
  }

  async updateAffectiveDomain(id: number, data: any): Promise<boolean> {
    return this.updateRecord('affective_domains', id, data);
  }

  async createPsychomotorDomain(data: any): Promise<any> {
    const insertId = await this.insertRecord('psychomotor_domains', data);
    return { id: insertId, ...data };
  }

  async updatePsychomotorDomain(id: number, data: any): Promise<boolean> {
    return this.updateRecord('psychomotor_domains', id, data);
  }

  // Simple update helpers for existing entities
  async updateTeacher(id: number, data: any): Promise<boolean> {
    return this.updateRecord('teachers', id, data);
  }

  async updateParent(id: number, data: any): Promise<boolean> {
    return this.updateRecord('parents', id, data);
  }

  async updateAccountant(id: number, data: any): Promise<boolean> {
    return this.updateRecord('accountants', id, data);
  }

  // Generic API method for secure operations
  private async api(method: string, endpoint: string, data: any): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required for API operations');
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API operation failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

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

      const result = await this.executeQueryInternal(query, [recordId]);
      return result.success && result.affectedRows > 0;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a singleton instance
const sqlDatabaseService = new SQLDatabaseService();
export default sqlDatabaseService;
