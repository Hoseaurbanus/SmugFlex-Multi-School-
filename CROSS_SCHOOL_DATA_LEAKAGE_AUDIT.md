# Cross-School Data Leakage Audit Report

**Date:** July 6, 2026
**Auditor:** opencode (automated)
**Scope:** All PHP files in `api/` directory
**Total Files Audited:** 30+
**Total SQL Queries Audited:** ~200+

---

## Executive Summary

This audit identified **5 confirmed data leakage vulnerabilities**, **2 high-risk concerns**, and **4 medium-risk design concerns** across the SMUGFLEX API codebase. The tenant isolation architecture (`TenantMiddleware::resolveSchoolId()`) is generally sound and most controllers use it properly. Critical gaps exist in:

1. A raw SQL endpoint that executes user queries without school_id enforcement
2. Missing school_id filters in ResultsController (2 queries) and ReportController (3 queries)
3. Password reset functionality lacking school scoping

**Risk Level:** CRITICAL — Immediate remediation required for items 1-7.

---

## CRITICAL VULNERABILITIES

### 1. Raw SQL Endpoint — No School Isolation
**File:** `api/database/query.php:73-95`

**Severity:** CRITICAL

The `POST /api/database/query.php` endpoint executes user-submitted SQL after only checking role (admin/teacher/accountant). No `school_id` filter is injected into the query.

**Attack Scenario:**
```json
POST /api/database/query.php
{"sql": "SELECT * FROM students"}
```
Returns **every student from every school** in the system.

**Impact:** Full cross-tenant data exfiltration. Any teacher or accountant can retrieve all data from all schools.

**Recommended Fix:**
- **Option A (Preferred):** Remove this endpoint entirely. Use parameterized API endpoints instead.
- **Option B:** Inject `WHERE school_id = :school_id` into every query automatically via middleware.
- **Option C:** Restrict to admin-only AND require mandatory `school_id` in WHERE clause.

---

### 2. Students Query Missing school_id
**File:** `api/controllers/ResultsController.php:2519-2524`

**Severity:** CRITICAL

In `checkCompilationStatus()`:

```sql
SELECT id, first_name, last_name, admission_number 
FROM students 
WHERE class_id = :class_id AND status = 'Active'
```

Missing: `AND school_id = :school_id`

**Attack Scenario:** A teacher from School A who knows a class_id from School B can enumerate all students in that class.

**Recommended Fix:** Add `AND school_id = :school_id`

---

### 3. Financial Summary Queries Missing school_id
**File:** `api/controllers/ReportController.php:547-558`  
**File:** `api/controllers/ReportController.php:618-633`

**Severity:** CRITICAL

`generateFinancialSummary()` at line 547:
```sql
SELECT ... FROM payments 
WHERE recorded_date BETWEEN :date_from AND :date_to
```

`generateFinancialByPaymentType()` at line 618:
```sql
SELECT ... FROM payments 
WHERE recorded_date BETWEEN :date_from AND :date_to
GROUP BY payment_type, payment_method
```

Both queries return payment data from **all schools**.

**Impact:** Financial data leakage across all tenant schools.

**Recommended Fix:** Add `AND school_id = :school_id` to both queries.

---

### 4. Class Attendance Report Missing school_id
**File:** `api/controllers/ReportController.php:303-310`

**Severity:** CRITICAL

`generateClassPerformanceReport()` attendance query:

```sql
SELECT ... FROM attendance a
JOIN students s ON a.student_id = s.id
WHERE s.class_id = :class_id AND a.date BETWEEN :term_start AND :term_end
```

Missing: `AND s.school_id = :school_id`

**Attack Scenario:** Teacher from School A requests attendance report for a class_id from School B.

**Recommended Fix:** Add `AND s.school_id = :school_id`

---

### 5. Helper Queries Missing school_id
**File:** `api/controllers/ResultsController.php:2729-2734`  
**File:** `api/controllers/ResultsController.php:2741-2747`

**Severity:** HIGH

`getAssignmentTerm()` at line 2729:
```sql
SELECT term FROM subject_assignments WHERE id = :assignment_id
```

`getAssignmentAcademicYear()` at line 2741:
```sql
SELECT academic_year FROM subject_assignments WHERE id = :assignment_id
```

These are private helpers called internally. If an assignment_id from another school is passed, it leaks term/year info.

**Recommended Fix:** Add `AND school_id = :school_id`

---

## HIGH CONCERNS

### 6. Parent-Student Link Check Missing school_id
**File:** `api/controllers/ParentController.php:386-389`

**Severity:** HIGH

`deleteParent()` checks for linked students without `school_id`:

```sql
SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id
```

Could return false-positive count from another school, preventing legitimate deletion.

**Recommended Fix:** Add `AND school_id = :school_id`

---

### 7. Password Reset No school_id Scoping
**File:** `api/user/reset-password.php:59-61, 82-90`

**Severity:** HIGH

Password reset queries:

```sql
SELECT id, username, email FROM users WHERE id = ?
UPDATE users SET password_hash = ? WHERE id = ?
```

Only admin role is checked. If admin from School A knows a user_id from School B, they can reset that user's password.

**Recommended Fix:** Add `AND school_id = ?` using `TenantMiddleware::resolveSchoolId()`

---

## MEDIUM CONCERNS

### 8. User Update Queries Missing Final WHERE school_id
**File:** `api/user/update.php:170, 245, 284, 319`

**Severity:** MEDIUM

Final UPDATE statements:
- Line 170: `UPDATE users SET... WHERE id = ?`
- Line 245: `UPDATE teachers SET... WHERE id = ?`
- Line 284: `UPDATE parents SET... WHERE id = ?`
- Line 319: `UPDATE accountants SET... WHERE id = ?`

Initial `SELECT id FROM users WHERE id = ? AND school_id = ?` check scopes the user, but subsequent updates lack `school_id` in WHERE clause.

**Risk:** Low (defense-in-depth concern). The initial check prevents direct attacks, but adding `school_id` to UPDATE statements provides additional protection.

**Recommended Fix:** Add `AND school_id = ?` to all UPDATE statements.

---

### 9. Username/Email Uniqueness Checks
**File:** `api/user/create.php:111, 121`

**Severity:** MEDIUM

Global uniqueness checks:
```sql
SELECT id FROM users WHERE username = ?
SELECT id FROM users WHERE email = ?
```

No `school_id` filter. **By design** if usernames/emails are globally unique across all schools.

**Risk:** Low if global uniqueness is intended. Could prevent legitimate school-scoped usernames.

**Recommended Fix:** Document this design decision. If school-scoped uniqueness is preferred, add `school_id` to queries.

---

### 10. Middleware::verifyAdmin() Missing school_id
**File:** `api/helpers/Middleware.php:73-80`

**Severity:** MEDIUM

```sql
SELECT id FROM users WHERE username = :username AND role = 'admin' AND status = 'Active'
```

No `school_id` filter. Username comes from JWT which already contains `school_id`.

**Risk:** Low if usernames are globally unique. If usernames can collide across schools, admin from School A could match admin from School B.

**Recommended Fix:** Add `AND school_id = :school_id` using the school_id from JWT.

---

### 11. Student Invoice Table Schema Missing school_id
**File:** `api/controllers/InvoiceController.php:26-43`

**Severity:** MEDIUM

Table creation SQL for `student_term_invoices` does not include `school_id` column:

```sql
CREATE TABLE IF NOT EXISTS student_term_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    term VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    ...
)
```

If this table lacks `school_id`, all invoice queries will leak across schools.

**Recommended Fix:** Add `school_id INT NOT NULL` column to the table schema.

---

## ACCEPTABLE BY DESIGN

### 12. Super Admin Platform Stats
**File:** `api/controllers/SuperAdminController.php:508-509`

```sql
SELECT COUNT(*) FROM students
SELECT COUNT(*) FROM teachers
```

Platform-wide counts without `school_id`. **Expected behavior** for super admin role.

---

### 13. JWT Token Blacklist
**File:** `api/helpers/JWT.php:153-154, 166`

```sql
SELECT 1 FROM token_blacklist WHERE jti = :jti
DELETE FROM token_blacklist WHERE expires_at < NOW()
```

Global table, no `school_id`. **Correct** — JTI is globally unique.

---

### 14. Parent Fallback Queries
**File:** `api/controllers/ParentController.php:40-44, 118-123, 442-447, 535-541`

Multiple fallback queries for `linked_id` without `school_id`:

```sql
SELECT linked_id FROM users WHERE username = :username AND role = 'parent'
```

These are fallback paths when JWT is missing `linked_id`. Low risk since username is from JWT.

---

## FULL PER-FILE AUDIT

### PASS — Properly Scoped Files

All SQL queries in these files include proper `school_id` filters:

| File | Status |
|------|--------|
| `api/school_settings.php` | ✅ PASS |
| `api/class_teacher_assignments.php` | ✅ PASS |
| `api/subject_registrations.php` | ✅ PASS |
| `api/academic_years.php` | ✅ PASS |
| `api/teachers.php` | ✅ PASS |
| `api/signature_settings.php` | ✅ PASS |
| `api/upload-student-photo.php` | ✅ PASS |
| `api/health.php` | ✅ PASS (no multi-tenant queries) |
| `api/user/update.php` | ✅ PASS (initial check) |
| `api/user/delete.php` | ✅ PASS |
| `api/student/promotion-history.php` | ✅ PASS |
| `api/progression/rules.php` | ✅ PASS |
| `api/progression/test.php` | ✅ PASS (test file) |
| `api/migrate.php` | ✅ PASS (CLI tool) |
| `api/controllers/StudentController.php` | ✅ PASS |
| `api/controllers/TeacherController.php` | ✅ PASS |
| `api/controllers/ClassController.php` | ✅ PASS |
| `api/controllers/SubjectController.php` | ✅ PASS |
| `api/controllers/ProgressionController.php` | ✅ PASS |
| `api/controllers/AttendanceController.php` | ✅ PASS |
| `api/controllers/NotificationController.php` | ✅ PASS |
| `api/controllers/AssignmentController.php` | ✅ PASS |
| `api/controllers/UserController.php` | ✅ PASS |
| `api/controllers/PaymentController.php` | ✅ PASS |
| `api/controllers/TenantController.php` | ✅ PASS |
| `api/controllers/AuthController.php` | ✅ PASS |

### PARTIAL — Missing school_id in Some Queries

| File | Line(s) | Issue |
|------|---------|-------|
| `api/database/query.php` | 73-95 | Raw SQL executes without school_id |
| `api/controllers/ResultsController.php` | 2519-2524 | Students query missing school_id |
| `api/controllers/ResultsController.php` | 2729-2734 | getAssignmentTerm() missing school_id |
| `api/controllers/ResultsController.php` | 2741-2747 | getAssignmentAcademicYear() missing school_id |
| `api/controllers/ReportController.php` | 303-310 | Attendance query missing school_id |
| `api/controllers/ReportController.php` | 547-558 | Financial summary missing school_id |
| `api/controllers/ReportController.php` | 618-633 | Financial by type missing school_id |
| `api/controllers/ParentController.php` | 386-389 | deleteParent() linked students check missing school_id |
| `api/controllers/InvoiceController.php` | 26-43 | Table schema missing school_id column |
| `api/user/reset-password.php` | 59-61, 82-90 | Password reset missing school_id |

### ACCEPTABLE — By Design

| File | Line(s) | Notes |
|------|---------|-------|
| `api/controllers/SuperAdminController.php` | 508-509 | Platform-wide stats for super admin |
| `api/helpers/JWT.php` | 153-154, 166 | Token blacklist is globally unique |
| `api/user/create.php` | 111, 121 | Global username/email uniqueness |
| `api/helpers/Middleware.php` | 73-80 | verifyAdmin() uses JWT username |

---

## RECOMMENDED REMEDIATION PRIORITY

### Immediate (P0) — Fix within 24 hours
1. **`api/database/query.php`** — Remove endpoint or inject school_id filter
2. **`api/controllers/ResultsController.php:2519-2524`** — Add school_id to students query
3. **`api/controllers/ReportController.php:547-558, 618-633`** — Add school_id to payment queries

### High (P1) — Fix within 1 week
4. **`api/controllers/ReportController.php:303-310`** — Add school_id to attendance query
5. **`api/controllers/ResultsController.php:2729-2747`** — Add school_id to helper queries
6. **`api/controllers/ParentController.php:386-389`** — Add school_id to linked students check
7. **`api/user/reset-password.php`** — Add school_id to password reset queries

### Medium (P2) — Fix within 1 month
8. **`api/user/update.php`** — Add school_id to UPDATE statements
9. **`api/controllers/InvoiceController.php`** — Add school_id column to table schema
10. **`api/helpers/Middleware.php`** — Add school_id to verifyAdmin()

### Low (P3) — Document and monitor
11. **`api/user/create.php`** — Document global uniqueness design decision
12. **`api/controllers/ParentController.php`** — Review fallback queries

---

## ARCHITECTURE RECOMMENDATIONS

### 1. Centralized Query Filtering
Consider implementing a database middleware layer that automatically injects `school_id` into all queries on multi-tenant tables. This would prevent future vulnerabilities by design.

### 2. Automated Testing
Add integration tests that verify:
- Teacher from School A cannot access School B data
- All API endpoints properly scope responses to school_id
- Cross-school query attempts return 403/404

### 3. SQL Injection Prevention
The `api/database/query.php` endpoint is a severe security risk. Raw SQL execution should never be exposed via API. Use parameterized queries and defined endpoints instead.

### 4. Schema Validation
Add `school_id` column validation to all multi-tenant table schemas. Consider a schema migration to add `school_id` where missing.

---

## CONCLUSION

The SMUGFLEX API has a generally sound tenant isolation architecture with `TenantMiddleware::resolveSchoolId()` as the central enforcement point. However, 5 critical vulnerabilities were identified that could lead to cross-school data leakage. Immediate remediation is required for the raw SQL endpoint and the missing school_id filters in ResultsController and ReportController.

Most controllers (70%+) properly use school_id in all queries. The vulnerabilities are isolated to specific endpoints that were likely added or modified without following the established pattern.

**Overall Risk Rating:** CRITICAL — Requires immediate attention.
