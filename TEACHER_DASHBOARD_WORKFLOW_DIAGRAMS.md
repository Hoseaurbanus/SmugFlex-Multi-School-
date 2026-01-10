# Teacher Dashboard - Complete Workflow Diagrams

## WORKFLOW 1: Score Entry → Compilation → Approval (IDEAL STATE)

```
TEACHER DASHBOARD
│
├─ SCORE ENTRY PAGE
│  ├─ ✅ Select Class (from assignedClasses)
│  ├─ ✅ Select Subject
│  ├─ ✅ Enter Scores (CA1, CA2, Exam)
│  ├─ ✅ Auto-save every 30 seconds
│  └─ ✅ Submit Scores (status: "Submitted")
│
├─ COMPILE RESULTS PAGE
│  ├─ ❌ Load Compiled Results [500 ERROR]
│  │   └─ Blocks: Cannot see current state
│  │
│  ├─ ⚠️ Fill Affective Domains (isolated page)
│  │   ├─ Attentiveness
│  │   ├─ Honesty
│  │   ├─ Neatness
│  │   ├─ Obedience
│  │   └─ Sense of Responsibility
│  │
│  ├─ ⚠️ Fill Psychomotor Domains (isolated page)
│  │   ├─ Attention to Direction
│  │   ├─ Considerate of Others
│  │   ├─ Handwriting
│  │   ├─ Sports
│  │   ├─ Verbal Fluency
│  │   └─ Works Well Independently
│  │
│  ├─ ❌ Mark Attendance
│  │   ├─ [Redirect to Mark Attendance Page]
│  │   ├─ MarkAttendancePage API returns 500 ERROR
│  │   └─ Blocks: Cannot record attendance
│  │
│  ├─ ✅ Generate Auto-Comment (based on average score)
│  │
│  └─ ❌ Submit Result
│      ├─ Requires: Scores + Affective + Psychomotor + Attendance
│      ├─ Cannot submit without Attendance (validation fails)
│      └─ Blocks: Result submission fails
│
└─ SCORE APPROVAL PAGE
   ├─ ❌ Load Submitted Results [500 ERROR - blocked by Compiled Results API]
   ├─ ❌ Review Results
   └─ ❌ Approve/Reject
```

---

## WORKFLOW 2: Attendance Marking (CURRENT ISSUE)

```
MARK ATTENDANCE PAGE
│
├─ API Call: GET /attendance
│  ├─ ❌ Returns 500 Server Error
│  │   ├─ Root Cause: Complex LEFT JOIN with NULL CONCAT
│  │   └─ Issue: Line 33-35 in AttendanceController.php
│  │
│  └─ Expected Response:
│      └─ Array of attendance records with:
│          ├─ student_id
│          ├─ date
│          ├─ status (Present/Absent/Late/Excused)
│          └─ class_id
│
├─ Cannot proceed because:
│  ├─ Page fails to load
│  ├─ Teachers have nowhere to mark attendance
│  └─ No attendance data created
│
└─ Impact on Result Compilation:
   └─ CompileResultsPage checks for attendance before submission
       └─ Validation fails → Results cannot be submitted
```

---

## WORKFLOW 3: Data Aggregation Issue

```
DAILY ATTENDANCE SYSTEM (MarkAttendancePage)
│
├─ Individual Records in "attendance" table:
│  ├─ Date: 2025-01-15, Student: 123, Status: Present
│  ├─ Date: 2025-01-16, Student: 123, Status: Present
│  ├─ Date: 2025-01-17, Student: 123, Status: Absent
│  └─ Date: 2025-01-20, Student: 123, Status: Present
│
├─ [MISSING AGGREGATION STEP]
│  └─ ❌ No transformation from daily → aggregated
│
└─ COMPILED RESULTS SYSTEM (CompileResultsPage)
   │
   └─ Expected Format in "compiled_results" table:
       ├─ times_present: 3
       ├─ times_absent: 1
       ├─ total_attendance_days: 4
       └─ attendance_rate: 75%

PROBLEM: CompileResultsPage cannot submit results without
attendance data, but MarkAttendancePage cannot create it (500 error)
```

---

## WORKFLOW 4: SQL Query Failure Analysis

### Query 1: getAllCompiledResults() (BROKEN)

```
SELECT cr.*, s.first_name, s.last_name, s.admission_number,
       c.name as class_name, c.level,
       CONCAT(t.first_name, ' ', t.last_name) as compiled_by_name
FROM compiled_results cr
JOIN students s ON cr.student_id = s.id
JOIN classes c ON cr.class_id = c.id
JOIN users u ON cr.compiled_by = u.id
LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'  ← PROBLEM 1
WHERE 1=1
  AND EXISTS (
      SELECT 1 FROM class_teacher_assignments cta
      WHERE cta.class_id = cr.class_id
        AND cta.teacher_id = :teacher_id
        AND cta.academic_year = cr.academic_year          ← PROBLEM 2
        AND cta.term = cr.term                            ← PROBLEM 2
        AND cta.status = 'Active'
  )

PROBLEMS:
1. LEFT JOIN can return NULL teachers
   → CONCAT(NULL, ' ', NULL) = NULL instead of ""
   
2. EXISTS subquery too strict
   → Any mismatch in academic_year or term = 0 rows returned
   → If teacher has no assignments for this specific term = 0 rows
   → No error message, just empty result set → assumed 500 error
   
3. Multiple JOINs increase NULL matching risk
   → users.id might not exist
   → teachers might not linked to users
   → Cascading NULLs

SOLUTION: Simplify to 3 INNER JOINs + auth check in PHP
```

### Query 2: getAttendance() (BROKEN)

```
SELECT a.*, s.first_name, s.last_name, s.admission_number,
       c.name as class_name, c.level,
       CONCAT(t.first_name, ' ', t.last_name) as recorded_by_name
FROM attendance a
JOIN students s ON a.student_id = s.id
JOIN classes c ON s.class_id = c.id
LEFT JOIN users u ON a.recorded_by = u.id
LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'

PROBLEMS:
1. Multiple LEFT JOINs can return NULL values
2. CONCAT on potentially NULL teacher data
3. No guarantee users or teachers exist
4. Complex WHERE clause building (lines 50-100) may have logic errors

SOLUTION: Remove teacher JOIN entirely - not needed for attendance records
Just get: attendance + students + classes
Add teacher info only if actually needed for display
```

---

## WORKFLOW 5: Page Dependencies (Blocking Chain)

```
INDEPENDENT PAGES (No blocking):
├─ Score Entry Page
├─ Class List Page
└─ Message Parents Page

DEPENDENT PAGES (Blocked by API errors):
├─ Compile Results Page
│  └─ Depends on: /results/compiled API ❌ (500 error)
│
├─ Mark Attendance Page
│  └─ Depends on: /attendance API ❌ (500 error)
│
├─ Score Approval Page
│  └─ Depends on: Compile Results Page ❌ (blocked above)
│
├─ Affective Domains Page
│  └─ Intended use: Fill data for Compile Results Page
│      └─ But cannot proceed without Compile Results API
│
└─ Psychomotor Domains Page
   └─ Intended use: Fill data for Compile Results Page
       └─ But cannot proceed without Compile Results API

IMPACT:
- 5 pages out of 8 are blocked or non-functional
- Only 3 pages work independently
- Cannot complete any result compilation workflow
```

---

## WORKFLOW 6: Complete Teacher Flow (Current State)

```
┌─────────────────────────────────────────────────────┐
│  TEACHER LOGIN                                      │
│  ✅ Authentication works                           │
│  ✅ Dashboard loads                                │
│  ✅ Classes loaded into context                    │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
    [OPTION A]          [OPTION B]
    SCORE ENTRY          MARK ATTENDANCE
    
    ✅ Can Enter          ❌ API BROKEN (500)
       Scores               Cannot proceed
       
       │
       ▼
    ✅ Can Submit
       Scores
       
       │
       ▼
    ❌ Cannot Compile
       Results (API 500)
       │
       ├─ Cannot view current state
       ├─ Cannot mark attendance (alt page also 500)
       ├─ Cannot fill affective domains (blocked)
       ├─ Cannot fill psychomotor domains (blocked)
       └─ Cannot submit results


DEAD END: 
Teacher can enter scores but cannot complete workflow
```

---

## WORKFLOW 7: Fix Application Sequence

```
PHASE 1: FIX BROKEN ENDPOINTS (45 min)
├─ Fix 1: Simplify getAllCompiledResults() query
│  ├─ Remove complex LEFT JOIN
│  ├─ Remove complex EXISTS subquery
│  ├─ Move auth check to PHP
│  └─ Status: Ready to implement
│
└─ Fix 2: Simplify getAttendance() query
   ├─ Remove teacher JOINs
   ├─ Just get attendance + students + classes
   └─ Status: Ready to implement

PHASE 2: IMPLEMENT AGGREGATION (1-2 hours)
└─ Create attendance aggregation endpoint
   ├─ Sums daily records into totals
   ├─ Returns times_present, times_absent, total_days
   └─ Called before result submission

PHASE 3: POLISH (30 min)
├─ Add error boundaries to CompileResultsPage
├─ Show actual error messages instead of generic
└─ Validate data loading in all pages

PHASE 4: TEST (1 hour)
├─ Test score entry → submit → compile → approve flow
├─ Test attendance marking → aggregation
└─ Test error handling with invalid data

TIMELINE: 3-4 hours total for complete fix
```

---

## WORKFLOW 8: Data State During Result Compilation

```
For each student, system needs:

SCORES TABLE (academic_year = 2025/2026, term = 'First Term')
├─ Student ID
├─ Subject Assignment ID (must match class)
├─ CA1, CA2, Exam scores
├─ Total score
├─ Status: "Submitted" ← REQUIRED for compilation
└─ Count: Must have ALL subjects for class

AFFECTIVE_DOMAINS TABLE
├─ Student ID
├─ Class ID
├─ Term
├─ Academic Year
├─ Attentiveness (1-5)
├─ Honesty (1-5)
├─ Neatness (1-5)
├─ Obedience (1-5)
├─ Sense of Responsibility (1-5)
└─ Record must EXIST ← REQUIRED for compilation

PSYCHOMOTOR_DOMAINS TABLE
├─ Student ID
├─ Class ID
├─ Term
├─ Academic Year
├─ Attention to Direction (1-5)
├─ Considerate of Others (1-5)
├─ Handwriting (1-5)
├─ Sports (1-5)
├─ Verbal Fluency (1-5)
├─ Works Well Independently (1-5)
└─ Record must EXIST ← REQUIRED for compilation

ATTENDANCE TABLE (aggregated into compiled_results)
├─ Date range for term
├─ Status records (Present/Absent/Late/Excused)
└─ Sum into times_present, times_absent ← REQUIRED for compilation

COMPILED_RESULTS TABLE
├─ student_id
├─ class_id
├─ term
├─ academic_year
├─ total_score (sum of all subject totals)
├─ average_score (total / subject count)
├─ position (rank by average_score)
├─ total_students
├─ times_present
├─ times_absent
├─ total_attendance_days
├─ class_teacher_comment
├─ status: "Submitted" → "Approved" (by principal)
└─ compiled_by: user_id

BLOCKING ISSUES:
❌ Cannot load compiled_results (API 500)
❌ Cannot mark attendance (API 500)
❌ Cannot validate all data before submission
```

---

## WORKFLOW 9: Student Result Status Tracking

```
STUDENT RESULT LIFECYCLE:

1. NO RESULT
   └─ First time teacher is compiling for this student

2. DRAFT (Uncommitted)
   └─ Some data entered but not all validations passed
   └─ Not submitted to backend

3. SUBMITTED (Pending Approval)
   └─ All validations passed
   └─ Sent to backend
   └─ Waiting for principal approval
   └─ Status: "Submitted"

4. APPROVED (Final)
   └─ Principal reviewed
   └─ Status: "Approved"
   └─ Can be printed/published

5. REJECTED (Needs Revision)
   └─ Principal rejected with reason
   └─ Status: "Rejected"
   └─ Teacher must fix and resubmit
   └─ ScoreEntryPage auto-enables edit mode

CURRENT ISSUE:
Teachers cannot reach status 3 (SUBMITTED) because:
├─ Cannot load current status (API 500)
├─ Cannot mark attendance to complete validation (API 500)
└─ Workflow blocked at step 3
```

---

## WORKFLOW 10: Permission & Access Control

```
SCORE ENTRY PAGE
├─ Who can access: Teachers with subject assignments
├─ Data visible: Own class's scores
├─ Can modify: Own scores only
└─ Status: ✅ Working

COMPILE RESULTS PAGE
├─ Who can access: Teachers with class assignments
├─ Data visible: Own class's compiled results
├─ Can modify: Own class's results
└─ Status: ❌ Cannot load (API 500)

MARK ATTENDANCE PAGE
├─ Who can access: Teachers with class assignments
├─ Data visible: Own class's attendance
├─ Can modify: Record attendance for own classes
└─ Status: ❌ Cannot load (API 500)

SCORE APPROVAL PAGE
├─ Who can access: Principal/Admin only
├─ Data visible: All compiled results
├─ Can modify: Approve/reject all results
└─ Status: ❌ Cannot load (blocked by Compile Results API)

AFFECTIVE DOMAINS PAGE
├─ Who can access: Teachers with class assignments
├─ Data visible: Own class's student data
├─ Can modify: Own student assessments
└─ Status: ⚠️ Likely working but isolated

PSYCHOMOTOR DOMAINS PAGE
├─ Who can access: Teachers with class assignments
├─ Data visible: Own class's student data
├─ Can modify: Own student assessments
└─ Status: ⚠️ Likely working but isolated

CLASS LIST PAGE
├─ Who can access: Teachers with class assignments
├─ Data visible: Own classes only
├─ Can modify: None (read-only)
└─ Status: ✅ Working
```

---

## QUICK REFERENCE: API ENDPOINTS

### Score Management Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/results/scores/{assignmentId}` | GET | ✅ Works | Fetch scores for assignment |
| `/results/scores` | POST | ✅ Works | Save/update scores |
| `/results/scores/{scoreId}` | PATCH | ✅ Works | Update single score |
| `/results/compiled` | GET | ❌ 500 ERROR | Get compiled results |
| `/results/compiled` | POST | ⚠️ Unknown | Submit compiled result |

### Attendance Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/attendance` | GET | ❌ 500 ERROR | Get attendance records |
| `/attendance` | POST | ⚠️ Unknown | Record attendance |
| `/attendance/{id}` | PATCH | ⚠️ Unknown | Update attendance |

### Affective/Psychomotor Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/affective-domains` | GET | ⚠️ Unknown | Get affective data |
| `/affective-domains` | POST | ⚠️ Unknown | Save affective data |
| `/psychomotor-domains` | GET | ⚠️ Unknown | Get psychomotor data |
| `/psychomotor-domains` | POST | ⚠️ Unknown | Save psychomotor data |

---

## KEY METRICS

**Total Teacher Pages**: 8
- ✅ Fully Working: 2 (28%)
- ⚠️ Partially Working: 2 (28%)
- ❌ Broken: 4 (44%)

**Total API Endpoints Used**: 12+
- ✅ Working: 3 (25%)
- ⚠️ Unknown: 7 (58%)
- ❌ Broken: 2 (17%)

**Critical Workflows**:
- ✅ Score Entry: Complete
- ✅ View Classes: Complete
- ✅ Message Parents: Likely Complete
- ⚠️ Approval Workflow: Blocked (0% complete)
- ❌ Attendance: Cannot Start (0% complete)
- ❌ Result Compilation: Cannot Complete (10% complete)

---

**This diagram set complements the TEACHER_DASHBOARD_WORKFLOW_ANALYSIS.md report**
