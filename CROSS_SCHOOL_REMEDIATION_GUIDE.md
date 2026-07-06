# Cross-School Data Leakage Remediation Guide

**Priority:** CRITICAL — Fix within 24 hours for P0 items

---

## Fix #1: Raw SQL Endpoint (CRITICAL)

**File:** `api/database/query.php:73-95`

**Problem:** Executes user-submitted SQL without school_id enforcement.

**Recommended Solution:** Remove this endpoint entirely.

If the endpoint must be kept, inject school_id automatically:

```php
// BEFORE (line 73-95):
$stmt = $pdo->prepare($data['sql']);
$stmt->execute($data['params'] ?? []);

// AFTER:
// Parse and inject school_id into WHERE clause
$sql = $data['sql'];
$schoolId = $_SERVER['HTTP_X_SCHOOL_ID'] ?? null;

if (!$schoolId) {
    Response::error('School ID required', 403);
}

// Add school_id to WHERE clause if not present
if (stripos($sql, 'WHERE') !== false) {
    if (stripos($sql, 'school_id') === false) {
        // Add AND school_id = :school_id to existing WHERE
        $sql = preg_replace('/WHERE/i', 'WHERE 1=1 AND school_id = :school_id AND', $sql, 1);
        $data['params']['school_id'] = $schoolId;
    }
} else {
    // Add WHERE school_id = :school_id
    $sql .= ' WHERE school_id = :school_id';
    $data['params']['school_id'] = $schoolId;
}

$stmt = $pdo->prepare($sql);
$stmt->execute($data['params'] ?? []);
```

**Note:** This is a band-aid solution. The endpoint should be removed and replaced with parameterized API endpoints.

---

## Fix #2: Students Query in ResultsController (CRITICAL)

**File:** `api/controllers/ResultsController.php:2519-2524`

**Problem:** `checkCompilationStatus()` queries students without school_id.

```php
// BEFORE (line 2519-2524):
$stmt = $this->db->prepare("
    SELECT id, first_name, last_name, admission_number 
    FROM students 
    WHERE class_id = :class_id AND status = 'Active'
");
$stmt->execute(['class_id' => $classId]);
$students = $stmt->fetchAll(PDO::FETCH_ASSOC);

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $this->db->prepare("
    SELECT id, first_name, last_name, admission_number 
    FROM students 
    WHERE class_id = :class_id AND status = 'Active' 
    AND school_id = :school_id
");
$stmt->execute([
    'class_id' => $classId,
    'school_id' => $schoolId
]);
$students = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

---

## Fix #3: Financial Summary Queries (CRITICAL)

**File:** `api/controllers/ReportController.php:547-558`

**Problem:** `generateFinancialSummary()` queries payments without school_id.

```php
// BEFORE (line 547-558):
$stmt = $this->db->prepare("
    SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        payment_type,
        payment_method
    FROM payments
    WHERE recorded_date BETWEEN :date_from AND :date_to
    GROUP BY payment_type, payment_method
");
$stmt->execute(['date_from' => $dateFrom, 'date_to' => $dateTo]);
$summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $this->db->prepare("
    SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        payment_type,
        payment_method
    FROM payments
    WHERE recorded_date BETWEEN :date_from AND :date_to
    AND school_id = :school_id
    GROUP BY payment_type, payment_method
");
$stmt->execute([
    'date_from' => $dateFrom,
    'date_to' => $dateTo,
    'school_id' => $schoolId
]);
$summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

**File:** `api/controllers/ReportController.php:618-633`

```php
// BEFORE (line 618-633):
$stmt = $this->db->prepare("
    SELECT 
        payment_type,
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
    FROM payments
    WHERE recorded_date BETWEEN :date_from AND :date_to
    GROUP BY payment_type, payment_method
");
$stmt->execute(['date_from' => $dateFrom, 'date_to' => $dateTo]);
$byType = $stmt->fetchAll(PDO::FETCH_ASSOC);

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $this->db->prepare("
    SELECT 
        payment_type,
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
    FROM payments
    WHERE recorded_date BETWEEN :date_from AND :date_to
    AND school_id = :school_id
    GROUP BY payment_type, payment_method
");
$stmt->execute([
    'date_from' => $dateFrom,
    'date_to' => $dateTo,
    'school_id' => $schoolId
]);
$byType = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

---

## Fix #4: Attendance Query in ReportController (CRITICAL)

**File:** `api/controllers/ReportController.php:303-310`

**Problem:** `generateClassPerformanceReport()` attendance query without school_id.

```php
// BEFORE (line 303-310):
$stmt = $this->db->prepare("
    SELECT 
        a.date,
        a.status,
        s.first_name,
        s.last_name,
        s.admission_number
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE s.class_id = :class_id 
    AND a.date BETWEEN :term_start AND :term_end
");
$stmt->execute([
    'class_id' => $classId,
    'term_start' => $termStart,
    'term_end' => $termEnd
]);
$attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $this->db->prepare("
    SELECT 
        a.date,
        a.status,
        s.first_name,
        s.last_name,
        s.admission_number
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE s.class_id = :class_id 
    AND a.date BETWEEN :term_start AND :term_end
    AND s.school_id = :school_id
");
$stmt->execute([
    'class_id' => $classId,
    'term_start' => $termStart,
    'term_end' => $termEnd,
    'school_id' => $schoolId
]);
$attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

---

## Fix #5: Helper Queries in ResultsController (HIGH)

**File:** `api/controllers/ResultsController.php:2729-2734`

**Problem:** `getAssignmentTerm()` queries subject_assignments without school_id.

```php
// BEFORE (line 2729-2734):
private function getAssignmentTerm($assignmentId) {
    $stmt = $this->db->prepare("
        SELECT term 
        FROM subject_assignments 
        WHERE id = :assignment_id
    ");
    $stmt->execute(['assignment_id' => $assignmentId]);
    return $stmt->fetchColumn();
}

// AFTER:
private function getAssignmentTerm($assignmentId) {
    $schoolId = TenantMiddleware::resolveSchoolId();
    $stmt = $this->db->prepare("
        SELECT term 
        FROM subject_assignments 
        WHERE id = :assignment_id
        AND school_id = :school_id
    ");
    $stmt->execute([
        'assignment_id' => $assignmentId,
        'school_id' => $schoolId
    ]);
    return $stmt->fetchColumn();
}
```

**File:** `api/controllers/ResultsController.php:2741-2747`

```php
// BEFORE (line 2741-2747):
private function getAssignmentAcademicYear($assignmentId) {
    $stmt = $this->db->prepare("
        SELECT academic_year 
        FROM subject_assignments 
        WHERE id = :assignment_id
    ");
    $stmt->execute(['assignment_id' => $assignmentId]);
    return $stmt->fetchColumn();
}

// AFTER:
private function getAssignmentAcademicYear($assignmentId) {
    $schoolId = TenantMiddleware::resolveSchoolId();
    $stmt = $this->db->prepare("
        SELECT academic_year 
        FROM subject_assignments 
        WHERE id = :assignment_id
        AND school_id = :school_id
    ");
    $stmt->execute([
        'assignment_id' => $assignmentId,
        'school_id' => $schoolId
    ]);
    return $stmt->fetchColumn();
}
```

---

## Fix #6: Parent-Student Link Check (HIGH)

**File:** `api/controllers/ParentController.php:386-389`

**Problem:** `deleteParent()` checks linked students without school_id.

```php
// BEFORE (line 386-389):
$stmt = $this->db->prepare("
    SELECT COUNT(*) as count 
    FROM parent_student_links 
    WHERE parent_id = :parent_id
");
$stmt->execute(['parent_id' => $parentId]);
$linkCount = $stmt->fetch(PDO::FETCH_ASSOC);

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $this->db->prepare("
    SELECT COUNT(*) as count 
    FROM parent_student_links 
    WHERE parent_id = :parent_id
    AND school_id = :school_id
");
$stmt->execute([
    'parent_id' => $parentId,
    'school_id' => $schoolId
]);
$linkCount = $stmt->fetch(PDO::FETCH_ASSOC);
```

---

## Fix #7: Password Reset (HIGH)

**File:** `api/user/reset-password.php:59-61, 82-90`

**Problem:** Password reset queries without school_id.

```php
// BEFORE (line 59-61):
$stmt = $pdo->prepare("SELECT id, username, email FROM users WHERE id = ?");
$stmt->execute([$data['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// AFTER:
require_once __DIR__ . '/../helpers/TenantMiddleware.php';
$schoolId = TenantMiddleware::resolveSchoolId();

$stmt = $pdo->prepare("SELECT id, username, email FROM users WHERE id = ? AND school_id = ?");
$stmt->execute([$data['user_id'], $schoolId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);


// BEFORE (line 82-90):
$stmt = $pdo->prepare("
    UPDATE users 
    SET password_hash = ?, updated_at = NOW() 
    WHERE id = ?
");

// AFTER:
$stmt = $pdo->prepare("
    UPDATE users 
    SET password_hash = ?, updated_at = NOW() 
    WHERE id = ? AND school_id = ?
");
$stmt->execute([$hashedPassword, $data['user_id'], $schoolId]);
```

---

## Fix #8: User Update Queries (MEDIUM)

**File:** `api/user/update.php:170, 245, 284, 319`

**Problem:** Final UPDATE statements missing school_id in WHERE clause.

```php
// BEFORE (line 170):
$stmt = $pdo->prepare("UPDATE users SET ... WHERE id = ?");
$stmt->execute([$userId]);

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $pdo->prepare("UPDATE users SET ... WHERE id = ? AND school_id = ?");
$stmt->execute([$userId, $schoolId]);


// BEFORE (line 245):
$stmt = $pdo->prepare("UPDATE teachers SET ... WHERE id = ?");
$stmt->execute([$linkedId]);

// AFTER:
$stmt = $pdo->prepare("UPDATE teachers SET ... WHERE id = ? AND school_id = ?");
$stmt->execute([$linkedId, $schoolId]);


// BEFORE (line 284):
$stmt = $pdo->prepare("UPDATE parents SET ... WHERE id = ?");
$stmt->execute([$linkedId]);

// AFTER:
$stmt = $pdo->prepare("UPDATE parents SET ... WHERE id = ? AND school_id = ?");
$stmt->execute([$linkedId, $schoolId]);


// BEFORE (line 319):
$stmt = $pdo->prepare("UPDATE accountants SET ... WHERE id = ?");
$stmt->execute([$linkedId]);

// AFTER:
$stmt = $pdo->prepare("UPDATE accountants SET ... WHERE id = ? AND school_id = ?");
$stmt->execute([$linkedId, $schoolId]);
```

---

## Fix #9: Invoice Table Schema (MEDIUM)

**File:** `api/controllers/InvoiceController.php:26-43`

**Problem:** `student_term_invoices` table missing school_id column.

```sql
-- BEFORE (line 26-43):
CREATE TABLE IF NOT EXISTS student_term_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    term VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    ...
);

-- AFTER:
CREATE TABLE IF NOT EXISTS student_term_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    student_id INT NOT NULL,
    term VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    ...
);
```

Also add `school_id` to all INSERT/SELECT statements for this table.

---

## Fix #10: Middleware verifyAdmin() (MEDIUM)

**File:** `api/helpers/Middleware.php:73-80`

**Problem:** verifyAdmin() queries users without school_id.

```php
// BEFORE (line 73-80):
$stmt = $this->db->prepare("
    SELECT id 
    FROM users 
    WHERE username = :username 
    AND role = 'admin' 
    AND status = 'Active'
");
$stmt->execute(['username' => $username]);
$admin = $stmt->fetch();

// AFTER:
$schoolId = TenantMiddleware::resolveSchoolId();
$stmt = $this->db->prepare("
    SELECT id 
    FROM users 
    WHERE username = :username 
    AND role = 'admin' 
    AND status = 'Active'
    AND school_id = :school_id
");
$stmt->execute([
    'username' => $username,
    'school_id' => $schoolId
]);
$admin = $stmt->fetch();
```

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Teacher from School A cannot access School B students via `/api/database/query.php`
- [ ] `checkCompilationStatus()` returns only School A students
- [ ] Financial reports show only School A payments
- [ ] Attendance reports show only School A attendance
- [ ] Assignment term/year lookups are scoped to School A
- [ ] Parent deletion checks only School A links
- [ ] Password reset only works for School A users
- [ ] User updates are scoped to School A

---

## Deployment Notes

1. **Database Migration:** If adding `school_id` column to `student_term_invoices`, run migration:
   ```sql
   ALTER TABLE student_term_invoices ADD COLUMN school_id INT NOT NULL AFTER id;
   ```

2. **Backfill Data:** If existing data exists, backfill school_id from related tables.

3. **Index:** Add index for performance:
   ```sql
   ALTER TABLE student_term_invoices ADD INDEX idx_school_id (school_id);
   ```

4. **Rollback Plan:** Keep old queries commented out for quick rollback if issues arise.

---

## Summary

| Fix | Priority | Files Modified | Impact |
|-----|----------|----------------|--------|
| #1 | P0 | database/query.php | Prevents full data exfiltration |
| #2 | P0 | ResultsController.php | Prevents student enumeration |
| #3 | P0 | ReportController.php | Prevents financial data leakage |
| #4 | P0 | ReportController.php | Prevents attendance data leakage |
| #5 | P1 | ResultsController.php | Prevents assignment info leakage |
| #6 | P1 | ParentController.php | Prevents parent link manipulation |
| #7 | P1 | user/reset-password.php | Prevents cross-school password reset |
| #8 | P2 | user/update.php | Defense-in-depth |
| #9 | P2 | InvoiceController.php | Schema completeness |
| #10 | P2 | Middleware.php | Defense-in-depth |

**Estimated Effort:** 2-4 hours for P0 fixes, 1-2 days for complete remediation.
