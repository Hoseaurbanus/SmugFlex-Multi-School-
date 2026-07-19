// SMugFlex 2.0 - School Domain Types
// Extracted from SchoolContext.tsx for reuse across the codebase

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  otherName?: string;
  admissionNumber: string;
  class_id: number;
  classId?: number;
  level: string;
  parent_id: number | null;
  parentId?: number | null;
  parent_name?: string | null;
  date_of_birth: string;
  dateOfBirth?: string;
  gender: 'Male' | 'Female';
  photo_url?: string;
  passport_photo?: string;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
  academic_year: string;
  academicYear?: string;
  admission_date?: string;
  created_at: string;
  updated_at: string;
  className?: string;
  classCategory?: string;
  parentName?: string;
}

export interface Parent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  occupation?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
  student_ids?: number[];
  children_count?: number;
  firstName?: string;
  lastName?: string;
  studentIds?: number[];
}

export interface Class {
  id: number;
  name: string;
  level: string;
  section?: string;
  category: 'Primary' | 'Secondary';
  capacity: number;
  currentStudents: number;
  classTeacherId: number | null;
  classTeacher?: string;
  academicYear: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  class_teacher_name?: string;
  enrolled_students?: number;
}

export interface Subject {
  id: number;
  name: string;
  subject_name: string;
  code: string;
  category: 'Creche' | 'Nursery' | 'Primary' | 'JSS' | 'SS' | 'General';
  department?: string;
  description?: string;
  is_core?: boolean;
  status: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
}

export interface SubjectAssignment {
  id: number;
  subject_id: number;
  class_id: number;
  classId?: number;
  teacher_id: number;
  academic_year: string;
  term: 'First Term' | 'Second Term' | 'Third Term';
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
  subject_name?: string;
  subjectName?: string;
  class_name?: string;
  className?: string;
  teacher_name?: string;
  teacherName?: string;
}

export interface SubjectRegistration {
  id: number;
  subject_id: number;
  class_id: number;
  academic_year: string;
  term: 'First Term' | 'Second Term' | 'Third Term';
  is_compulsory: boolean;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
  subject_name?: string;
  subject_code?: string;
  subject_category?: string;
  class_name?: string;
  class_level?: string;
}

export interface Score {
  id: number;
  student_id: number;
  studentId?: number;
  subject_assignment_id: number;
  subjectAssignmentId?: number;
  subject_name?: string;
  subjectName?: string;
  ca1?: number | null;
  ca2?: number | null;
  exam?: number | null;
  total: number;
  grade?: string;
  remark?: string;
  class_average?: number;
  class_min?: number;
  class_max?: number;
  entered_by: number;
  enteredBy?: number;
  entered_date: string;
  enteredDate?: string;
  status: 'Draft' | 'Submitted' | 'Rejected' | 'Approved';
  rejection_reason?: string;
  rejected_by?: number;
  rejected_date?: string;
  academic_year?: string;
  academicYear?: string;
  term?: 'First Term' | 'Second Term' | 'Third Term';
  class_name?: string;
  className?: string;
  student_name?: string;
  studentName?: string;
}

export interface AffectiveDomain {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  attentiveness: number;
  attentiveness_remark: string;
  honesty: number;
  honesty_remark: string;
  punctuality: number;
  punctuality_remark: string;
  neatness: number;
  neatness_remark: string;
  obedience: number;
  obedience_remark: string;
  sense_of_responsibility: number;
  sense_of_responsibility_remark: string;
  entered_by: number;
  entered_date: string;
}

export interface PsychomotorDomain {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  attention_to_direction: number;
  attention_to_direction_remark: string;
  considerate_of_others: number;
  considerate_of_others_remark: string;
  handwriting: number;
  handwriting_remark: string;
  sports: number;
  sports_remark: string;
  handwork: number;
  handwork_remark: string;
  drawing: number;
  drawing_remark: string;
  music: number;
  music_remark: string;
  verbal_fluency: number;
  verbal_fluency_remark: string;
  works_well_independently: number;
  works_well_independently_remark: string;
  entered_by: number;
  entered_date: string;
}

export interface CompiledResult {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  scores: Score[];
  affective: AffectiveDomain | null;
  psychomotor: PsychomotorDomain | null;
  total_score: number;
  totalScore?: number;
  average_score: number;
  average?: number;
  class_average: number;
  classAverage?: number;
  position: number;
  total_students: number;
  times_present: number;
  timesPresent?: number;
  times_absent: number;
  timesAbsent?: number;
  total_attendance_days: number;
  totalAttendanceDays?: number;
  term_begin: string;
  term_end: string;
  next_term_begin: string;
  class_teacher_name: string;
  class_teacher_comment: string;
  principal_name: string;
  principal_comment: string;
  principal_signature: string;
  compiled_by: number;
  compiledBy?: number;
  compiled_date: string;
  compiledDate?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approved_by: number | null;
  approved_date: string | null;
  print_approved: number;
  rejection_reason: string | null;
}

export interface CumulativeSubjectEntry {
  subject_id: number;
  subject_name: string;
  first_ca1?: number;
  first_ca2?: number;
  first_exam?: number;
  first_total?: number;
  second_ca1?: number;
  second_ca2?: number;
  second_exam?: number;
  second_total?: number;
  third_ca1?: number;
  third_ca2?: number;
  third_exam?: number;
  third_total?: number;
  grand_total: number;
  average: number;
  grade: string;
  remark: string;
}

export interface CumulativeResult {
  id?: number;
  student_id: number;
  class_id: number;
  academic_year: string;
  total_score: number;
  average_score: number;
  position?: number;
  class_average?: number;
  total_students?: number;
  promotion_status: 'Promoted' | 'Repeated' | null;
  session_attendance_pct?: number;
  subject_data: CumulativeSubjectEntry[];
  principal_comment?: string;
  compiled_by?: number;
  compiled_date?: string;
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  class_name?: string;
}

export interface FeeStructure {
  id: number;
  class_id: number;
  classId?: number;
  class_name: string;
  level: string;
  term: string;
  academic_year: string;
  tuition_fee: number;
  development_levy: number;
  sports_fee: number;
  exam_fee: number;
  books_fee: number;
  uniform_fee: number;
  transport_fee: number;
  total_fee: number;
  tuitionFee: number;
  developmentLevy: number;
  sportsFee: number;
  examFee: number;
  booksFee: number;
  uniformFee: number;
  transportFee: number;
  totalFee: number;
  className: string;
}

export interface StudentFeeBalance {
  id: number;
  student_id: number;
  studentId?: number;
  class_id: number;
  classId?: number;
  term: string;
  academic_year: string;
  total_fee_required: number;
  totalFeeRequired: number;
  total_paid: number;
  totalPaid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface StudentInvoiceSummary {
  invoice: any;
  paid_total: number;
  outstanding: number;
  credit: number;
}

export interface Payment {
  id: number;
  student_id: number;
  studentId?: number;
  student_name: string;
  amount: number;
  payment_type: string;
  term: string;
  academic_year: string;
  payment_method: string;
  paymentMethod?: string;
  invoice_id?: number | null;
  reference: string;
  transaction_reference?: string;
  receipt_number: string;
  recorded_by: number;
  recorded_date: string;
  recordedDate?: string;
  paymentDate?: string;
  studentName?: string;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Reversed';
  notes?: string;
  verified_by?: number;
  verified_date?: string;
}

export interface CreatePaymentPayload {
  student_id: number;
  amount: number;
  payment_method: string;
  payment_type?: string;
  term?: string;
  academic_year?: string;
  notes?: string;
  transaction_reference?: string;
  invoice_id?: number | null;
  student_name?: string;
  reference?: string;
}

export interface Teacher {
  id: number | string;
  firstName: string;
  lastName: string;
  otherName?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  gender?: string;
  qualification?: string;
  specialization?: string | string[];
  status: 'Active' | 'Inactive';
  is_class_teacher?: boolean;
  department_id?: number;
  department?: string;
  signature?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'teacher' | 'student' | 'accountant' | 'parent';
  linked_id: number;
  email: string;
  display_name?: string;
  first_name?: string;
  other_name?: string | null;
  last_name?: string;
  phone?: string | null;
  employee_id?: string | null;
  status: 'Active' | 'Inactive';
  last_login: string | null;
  created_at: string;
  updated_at: string;
  token?: string;
  school_id?: number;
  school_suffix?: string;
  school_name?: string;
  school_status?: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  access_until?: string | null;
  full_identity?: string;
  address?: string | null;
  gender?: string | null;
  qualification?: string | null;
  specialization?: string[] | null;
  isClassTeacher?: boolean | null;
  assignedClassId?: number | null;
  departmentId?: string | null;
  alternatePhone?: string | null;
  department?: string | null;
  occupation?: string | null;
}

export interface LoginResponse {
  id: string;
  username: string;
  role: string;
  linked_id: number;
  email: string;
  first_name: string;
  last_name: string;
  token: string;
  school_id?: number;
  school_suffix?: string;
  school_name?: string;
  school_status?: string;
  access_until?: string | null;
  full_identity?: string;
}

export interface Accountant {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  phone: string;
  department?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'teachers' | 'parents' | 'students' | 'accountants';
  sentBy: number;
  sentDate: string;
  isRead: boolean;
  readBy: number[];
  targetUsers?: number[];
  deletedBy?: number[];
}

export interface ActivityLog {
  id: number;
  actor: string;
  actor_role: 'Admin' | 'Teacher' | 'Accountant' | 'Parent' | 'System';
  action: string;
  target: string;
  timestamp: string;
  ip_address: string;
  status: 'Success' | 'Failed';
  details?: string;
  user_id?: number;
}

export interface Attendance {
  id: number;
  student_id: number;
  studentId?: number;
  class_id: number;
  classId?: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  marked_by: number;
  markedBy?: number;
  marked_date: string;
  markedDate?: string;
  term: string;
  academic_year: string;
  academicYear?: string;
  remarks?: string;
  attended_days?: number;
  required_days?: number;
  times_absent?: number;
  attendance_rate?: number;
}

export interface ExamTimetable {
  id: number;
  class_id: number;
  class_name?: string;
  subject_id: number;
  subject_name?: string;
  exam_type: 'CA1' | 'CA2' | 'Exam' | 'Practical';
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  venue?: string;
  supervisor_id?: number;
  term: string;
  academic_year: string;
  instructions?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClassTimetable {
  id: number;
  class_id: number;
  class_name: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  venue: string;
  term: string;
  academic_year: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  head_of_department: string;
  head_of_department_id: number | null;
  description: string;
  teacher_count: number;
  status: 'Active' | 'Inactive';
}

export interface CbtExam {
  id: number;
  title: string;
  instructions?: string;
  class_id: number;
  class_name?: string;
  subject_id: number;
  subject_name?: string;
  teacher_id: number;
  academic_year: string;
  term: string;
  duration_minutes: number;
  total_marks: number;
  score_slot?: 'first_test' | 'second_test' | null;
  feed_into_scores: number;
  shuffle_questions: number;
  questions_per_student?: number | null;
  published: number;
  published_at?: string;
  starts_at?: string;
  ends_at?: string;
  allow_review: number;
  status: 'Active' | 'Archived';
  created_at?: string;
  attempt?: CbtAttempt | null;
}

export interface CbtQuestion {
  id: number;
  exam_id: number;
  question_type: 'single_choice' | 'true_false' | 'multi_select';
  question_text: string;
  options?: string[];
  correct_answer?: any;
  marks: number;
  sort_order: number;
  student_answer?: any;
  is_correct?: boolean | null;
  marks_awarded?: number;
}

export interface CbtAttempt {
  id: number;
  exam_id: number;
  student_id: number;
  academic_year: string;
  term: string;
  status: 'in_progress' | 'submitted' | 'scored';
  started_at: string;
  submitted_at?: string;
  score: number;
  max_score: number;
  percentage: number;
  remark?: string;
  tab_switch_count?: number;
  metadata?: string;
  exam_title?: string;
  subject_name?: string;
  student_name?: string;
  admission_number?: string;
  answers?: CbtQuestion[];
  duration_minutes?: number;
}

export interface CbtQuestionBank {
  id: number;
  teacher_id: number;
  subject_id: number;
  subject_name?: string;
  class_id?: number;
  question_type: 'single_choice' | 'true_false' | 'multi_select';
  question_text: string;
  options?: string[];
  correct_answer?: any;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  tags?: string[];
  status: 'Active' | 'Archived';
}

export interface SchoolSettings {
  school_name: string;
  school_motto: string;
  school_logo_url?: string;
  principal_name: string;
  principal_signature?: string;
  head_teacher_name?: string;
  head_teacher_signature?: string;
  principal_comment?: string;
  head_teacher_comment?: string;
  resumption_date?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
}

export interface BankAccountSettings {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  payment_methods: {
    bank_transfer: boolean;
    online_payment: boolean;
    cash: boolean;
  };
  updated_by: number;
  updated_date: string;
}

export interface Scholarship {
  id: number;
  name: string;
  type: 'Percentage' | 'Fixed Amount';
  value: number;
  description?: string;
  eligibility_criteria?: string;
  total_budget: number;
  beneficiaries: number;
  status: 'Active' | 'Inactive';
  academic_year?: string;
}

export interface Assignment {
  id: number;
  studentId?: number;
  student_id?: number;
  classId?: number;
  class_id?: number;
  subjects?: string[];
  [key: string]: any;
}
