# SMugFlex — Multi-School Management Platform
### Complete Conversion Guide: Graceland Royal Academy (Single School) → SMugFlex (Multi-School SaaS)

> **Version:** 2.0.0 | **Base Repository:** `smugflexventures-web/Graceland-G`
> **Author:** SMugFlex Ventures | **Date:** May 2026

---

## Table of Contents

1. [Executive Summary & What Changed](#1-executive-summary--what-changed)
2. [Current System Analysis](#2-current-system-analysis)
3. [SMugFlex Core Design Decisions](#3-smugflex-core-design-decisions)
   - [The Suffix-Based Identity System](#31-the-suffix-based-identity-system)
   - [Super Admin Manual Control Model](#32-super-admin-manual-control-model)
   - [Trial Plan — Free Per Term](#33-trial-plan--free-per-term)
   - [No In-App Payment Processing](#34-no-in-app-payment-processing)
   - [Multi-Tenancy Strategy](#35-multi-tenancy-strategy)
4. [Complete Conversion Prompt](#4-complete-conversion-prompt)
   - [Phase 1 — Database Layer](#phase-1--database-layer)
   - [Phase 2 — Suffix Identity & Authentication System](#phase-2--suffix-identity--authentication-system)
   - [Phase 3 — Backend API: Tenant Isolation](#phase-3--backend-api-tenant-isolation)
   - [Phase 4 — Super Admin Portal](#phase-4--super-admin-portal)
   - [Phase 5 — SMugFlex Platform Landing Page](#phase-5--smugflex-platform-landing-page)
   - [Phase 6 — SMugFlex Login Page](#phase-6--smugflex-login-page)
   - [Phase 7 — School Registration Flow](#phase-7--school-registration-flow)
   - [Phase 8 — Per-School Dashboards (Branding)](#phase-8--per-school-dashboards-branding)
   - [Phase 9 — Tenant Context & State](#phase-9--tenant-context--state)
   - [Phase 10 — Security Hardening](#phase-10--security-hardening)
   - [Phase 11 — Deployment](#phase-11--deployment)
5. [File-by-File Change Manifest](#5-file-by-file-change-manifest)
6. [Full Database Schema Additions](#6-full-database-schema-additions)
7. [New API Endpoints](#7-new-api-endpoints)
8. [Security Specification](#8-security-specification)
9. [Suffix Identity Reference](#9-suffix-identity-reference)
10. [Environment Variables](#10-environment-variables)
11. [Testing Checklist](#11-testing-checklist)
12. [Deployment Guide](#12-deployment-guide)

---

## 1. Executive Summary & What Changed

### What This Document Is
This is the complete, production-grade engineering specification for converting the **Graceland Royal Academy** single-school management system into **SMugFlex** — a multi-school SaaS platform where many schools can register, operate, and manage their own data in complete isolation from one another.

### Key Design Decisions in This Version

| Decision | Detail |
|----------|--------|
| **Suffix-Based User Identity** | Super Admin assigns a unique suffix (e.g. `joy`) to each school. All users of that school log in as `username@joy`. This is the primary way users are differentiated across schools. |
| **Super Admin Manual Activation** | The Super Admin manually activates and deactivates schools. No payment automation. Schools that have not paid are deactivated by the Super Admin. Schools that pay are activated manually. |
| **Trial is Free for One Term** | Every newly registered school gets a free trial for one academic term (~3 months). No credit card. No payment. Pure goodwill trial. |
| **No In-App Payment Processing** | Payment between schools and SMugFlex happens outside the app (bank transfer, mobile money, etc.). There is NO Paystack integration for SMugFlex subscriptions. The existing Paystack integration for school fee collection (students paying school fees) is preserved. |
| **Fully Rebranded Landing & Login** | The Graceland-specific landing page and login page are replaced with SMugFlex-branded equivalents. |

---

## 2. Current System Analysis

### 2.1 Tech Stack (Existing)

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18.3, TypeScript 5.9, Vite 6.4, SWC |
| **Routing** | React Router DOM v6 — 7 routes |
| **Styling** | Tailwind CSS v4, Radix UI ~25 components, Lucide icons |
| **State** | Monolithic `SchoolContext.tsx` — 9,158 lines, ~200 methods |
| **Charts** | Recharts |
| **PDF** | jsPDF + jsPDF-AutoTable + html2canvas |
| **School Fees Payment** | Paystack inline.js ← **KEEP THIS. Do not remove.** |
| **Real-time** | Server-Sent Events (SSE) + 15s polling fallback |
| **Backend** | PHP 8.x, custom MVC, front controller `api/index.php` |
| **Auth** | Custom JWT (HS256), bcrypt, rate limiter, token blacklist |
| **Database** | MySQL/MariaDB 11.4, 65 tables, utf8mb4 |
| **Deployment** | Apache + Vite build + `.htaccess` |

### 2.2 User Roles (Existing)

| Role | Dashboard | Key Capabilities |
|------|-----------|-----------------|
| Admin | `AdminDashboard.tsx` | 46 sub-pages — full school management |
| Teacher | `TeacherDashboard.tsx` | Scores, attendance, CBT, assignments |
| Accountant | `AccountantDashboard.tsx` | Fees, invoices, payments |
| Parent | `UniversalParentDashboardFixed.tsx` | Children's results, school fee payments |
| Student | `StudentDashboard.tsx` | Own results, CBT, assignments |

### 2.3 All 65 Database Tables (Must All Gain `school_id`)

`academic_years`, `accountants`, `activity_logs`, `affective_domains`, `assignments`,
`assignment_submissions`, `attendance`, `attendance_backup`, `attendance_summary`,
`bank_account_settings`, `cbt_answers`, `cbt_attempts`, `cbt_exams`, `cbt_questions`,
`cbt_question_bank`, `classes`, `class_performance_summary`, `class_progression_rules`,
`class_teacher_assignments`, `class_timetable`, `class_whatsapp_groups`,
`compiled_results`, `data_changes_summary`, `data_change_logs`, `departments`,
`exam_timetable`, `fee_structures`, `file_uploads`, `manual_class_changes`,
`notifications`, `parents`, `parent_student_links`, `password_reset_log`, `payments`,
`performance_logs`, `permissions`, `psychomotor_domains`, `realtime_events`,
`role_permissions`, `scholarships`, `school_calendar`, `school_settings`, `scores`,
`security_events_summary`, `security_logs`, `signature_settings`, `students`,
`student_domains`, `student_fee_balances`, `student_promotions`, `student_scholarships`,
`student_summary`, `student_term_invoices`, `subjects`, `subject_assignments`,
`subject_registrations`, `teachers`, `teacher_assignments`, `terms`, `token_blacklist`,
`user_dashboard_responsibilities`, `user_notifications`, `user_sessions`, `users`

### 2.4 What Must Be Removed/Replaced

| Item | Action |
|------|--------|
| `LandingPage.tsx` — Graceland branding | **Replace** with SMugFlex platform landing |
| `LoginPage.tsx` — single-school login | **Replace** with SMugFlex multi-school login (suffix-based) |
| `api/index.php` CORS — hardcoded to Graceland domain | **Update** to dynamic |
| `Config::getSchoolName()` returning "Graceland Royal Academy" | **Replace** with dynamic school name |
| `api/auth/simple_login.php` — already disabled | **Delete** |
| Debug endpoints: `jwt_test.php`, `jwt_diagnostic.php`, `test.php`, `test-promotions.php` | **Delete** |
| Graceland logo in `assets/images/school-logo.jpg` | **Replace** with dynamic per-school logos |
| Hardcoded Paystack keys in school fee payment | **Keep** but make per-school configurable |

---

## 3. SMugFlex Core Design Decisions

### 3.1 The Suffix-Based Identity System

#### Concept

Every school on SMugFlex is assigned a **suffix** by the Super Admin. This suffix is a short, lowercase, unique identifier for the school (e.g., `joy`, `stars`, `nnpc`, `greenwood`).

Every user account at that school has their username combined with `@{suffix}` to form their **SMugFlex Identity**:

```
School: Joy Academy            → Suffix assigned by Super Admin: joy
Admin:  principal  login as:   principal@joy
Teacher: mr_james  login as:   mr_james@joy
Parent:  sarah_m   login as:   sarah_m@joy
Student: ade001    login as:   ade001@joy

School: Greenwood Academy      → Suffix assigned by Super Admin: greenwood
Admin:  headmaster login as:   headmaster@greenwood
Teacher: mrs_tolu  login as:   mrs_tolu@greenwood
```

#### Why This Is Secure

1. **Global uniqueness guaranteed.** `principal@joy` and `principal@greenwood` are different accounts even if the underlying usernames are the same.
2. **No username collision across schools.** School A and School B can both have a user called `admin` with zero conflict.
3. **The suffix is the school's identity key.** When a user logs in with `michael@joy`, the system extracts `joy` → looks up which school has suffix `joy` → gets `school_id` → scopes all data to that school.
4. **Users cannot accidentally log into the wrong school** — their identity is permanently tied to their school's suffix.
5. **Simple for users.** It looks like an email format they already understand. Easy to remember.

#### Suffix Rules
- Lowercase letters and numbers only (no spaces, no special characters except the system-added `@`)
- Minimum 2 characters, maximum 20 characters
- Must be globally unique across all schools on the platform
- Assigned **only** by the Super Admin — schools cannot choose or change their own suffix
- Cannot be changed after first user login (it's part of user identity)
- Examples of valid suffixes: `joy`, `nnpc`, `stars`, `gra`, `greenwood`, `baze2025`

#### How Login Works With Suffixes

```
USER TYPES:    michael@joy
               ───────┬──  ─┬─
                      │     └── suffix = "joy"  → look up school_id
                      └──────── username = "michael"

SYSTEM DOES:
  1. Parse input: split on "@" → username = "michael", suffix = "joy"
  2. SELECT id, status FROM schools WHERE suffix = 'joy'
     → school_id = 7, status = 'active'  (if inactive → "School account not active")
  3. SELECT * FROM users WHERE username = 'michael' AND school_id = 7 AND status = 'Active'
  4. Verify password with bcrypt
  5. Issue JWT: { user_id, username, school_id: 7, school_suffix: "joy", role, ... }
  6. All subsequent requests scoped to school_id = 7
```

#### How The Super Admin Assigns Suffixes

1. School submits a registration request (name, email, contact)
2. Super Admin reviews the request in their dashboard
3. Super Admin types a suffix for the school (e.g. types `joy` for Joy Academy)
4. System validates: suffix is unique, valid format
5. Super Admin clicks "Approve & Assign Suffix"
6. School status changes to `active`, suffix is saved permanently
7. Super Admin communicates the suffix to the school administrator offline (email, phone, WhatsApp)
8. School admin's initial credentials are shown once to the Super Admin: `admin@joy` / `[generated password]`
9. Super Admin shares these credentials with the school securely
10. School admin logs in, immediately forced to change password

#### Username Format Within a School

Inside a school, users are managed by the school's Admin. The school Admin creates users with simple usernames (e.g., `michael`, `mrs_tolu`, `parent_001`). The system automatically appends `@{suffix}` when displaying or using the full identity. The school Admin does not need to type the suffix — it is added automatically.

```
School Admin creates user:   username = "michael"
System stores in `users`:    username = "michael", school_id = 7
User logs in at SMugFlex:    michael@joy
```

---

### 3.2 Super Admin Manual Control Model

The Super Admin has **complete, exclusive control** over school activation and deactivation. There is no automation. No payment webhook. No automatic expiry enforcement. The Super Admin decides everything.

#### School Lifecycle

```
REGISTRATION SUBMITTED
        │
        ▼
  [Status: pending]
  Super Admin reviews registration
        │
        ├── REJECT → Status: rejected (school notified)
        │
        └── APPROVE
              │
              Super Admin types suffix (e.g. "joy")
              Super Admin sets trial end date (default: current term end)
              │
              ▼
        [Status: active | Plan: trial]
        School can now log in and use the platform
              │
              │  (Trial term ends — nothing automatic happens)
              │  Super Admin checks who has paid offline
              │
              ├── PAID → Super Admin manually sets plan to 'paid' and extends access
              │
              └── NOT PAID → Super Admin clicks "Deactivate"
                              │
                              ▼
                        [Status: inactive]
                        All users of this school get "Account inactive.
                        Please contact SMugFlex." on login attempt.
                        No data is deleted. Data is preserved.
                              │
                              └── School pays → Super Admin clicks "Activate"
                                              → Status: active again
                                              → Users can log in immediately
```

#### Super Admin Actions Available

| Action | Effect |
|--------|--------|
| **Approve + Assign Suffix** | Creates school record, sets status=active, sets suffix, generates admin credentials |
| **Deactivate School** | Sets status=inactive. All logins blocked immediately. Data preserved. |
| **Activate School** | Sets status=active. All logins restored immediately. |
| **Suspend School** (stronger) | Sets status=suspended. Same as inactive but flags the school. Used for ToS violations. |
| **Change Plan** | Manually sets plan: trial / basic / standard / premium (informational only, no automation) |
| **Set Access Until Date** | Sets a date field `access_until`. After this date, all logins blocked automatically. Super Admin can extend it. |
| **Reset School Admin Password** | Generates a new temporary password, displayed once to Super Admin |
| **Edit School Details** | Name, contact, address, suffix (before first user login only) |
| **View All School Data** | Super Admin can browse all data of any school (read-only impersonation) |
| **Delete School** | Permanently removes school and all data. Requires typing school name to confirm. |

#### The `access_until` Date — The One Automatic Check

While activation/deactivation is manual, there is one optional automation: the `access_until` date field in the `schools` table. When the Super Admin activates a school, they can optionally set `access_until` to a future date (e.g., end of next term). When a user tries to log in, the system checks:

```php
if ($school['access_until'] && strtotime($school['access_until']) < time()) {
    // Access expired — but status is still 'active'
    // Show: "Your access period has ended. Please contact SMugFlex to renew."
    // Super Admin simply extends access_until to re-enable login
}
```

This gives the Super Admin a "set it and forget it" tool while retaining full manual control. No payment is required. The Super Admin extends the date after confirming payment offline.

---

### 3.3 Trial Plan — Free Per Term

- Every approved school starts on the **Trial plan**
- Trial is **free** — no payment, no credit card
- Trial duration: **one academic term** (approximately 90 days)
- The Super Admin sets the `access_until` date when approving (default: today + 90 days)
- Trial schools have **full access** to all features — no feature restrictions
- After trial ends: Super Admin deactivates unless payment has been made offline
- Trial can be **extended** by the Super Admin at any time

---

### 3.4 No In-App Payment Processing

**There is NO payment gateway integration for SMugFlex subscriptions.**

- Schools pay SMugFlex offline (bank transfer, mobile money, cash, etc.)
- The Super Admin is notified of payment through their normal business channels
- The Super Admin logs in to the Super Admin dashboard and manually activates/extends the school
- The only payment in the system is **school → student fee collection** via Paystack (existing feature, preserved as-is)

This means:
- Remove all Paystack subscription code planned for Phase 9 of the previous version
- Remove `BillingController.php` subscription endpoints
- Remove `SubscriptionPage.tsx`, `PricingPage.tsx` billing components
- The `school_plans` table is kept but is **informational only** (plans have no automation)

---

### 3.5 Multi-Tenancy Strategy

**Shared Database, Row-Level Isolation with `school_id`.**

Every one of the 65 existing tables gets a `school_id` column. Every query is scoped by `school_id`. The `school_id` is embedded in the JWT and enforced by middleware on every API request. No data from School A can ever appear in School B's responses.

---

## 4. Complete Conversion Prompt

> **How to use:** Feed each Phase to your AI coding assistant (Claude, Cursor, etc.) with the relevant source files. Each Phase is self-contained and builds on the previous.

---

### PHASE 1 — Database Layer

```
You are converting the Graceland Royal Academy single-school management system
into SMugFlex, a multi-school SaaS platform.

TASK: Write the complete SQL migration for multi-tenancy.

═══════════════════════════════════════════════════════
STEP 1 — New Platform Tables
═══════════════════════════════════════════════════════

-- Schools master table
CREATE TABLE `schools` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(255) NOT NULL,
  `suffix`            VARCHAR(20) NULL UNIQUE,
    -- The suffix assigned by Super Admin (e.g. "joy" for Joy Academy)
    -- NULL until Super Admin approves and assigns it
    -- NEVER changeable after first user login
    -- Lowercase letters and numbers only, 2-20 chars
  `email`             VARCHAR(255) NOT NULL UNIQUE,
  `phone`             VARCHAR(30),
  `address`           TEXT,
  `city`              VARCHAR(100),
  `state`             VARCHAR(100),
  `country`           VARCHAR(100) DEFAULT 'Nigeria',
  `logo_url`          VARCHAR(500),
  `primary_color`     VARCHAR(7)  DEFAULT '#1E3A5F',
  `secondary_color`   VARCHAR(7)  DEFAULT '#F4A300',
  `website`           VARCHAR(255),
  `plan`              ENUM('trial','basic','standard','premium') DEFAULT 'trial',
    -- Informational only. No automation. Super Admin sets this manually.
  `status`            ENUM('pending','active','inactive','suspended','rejected') DEFAULT 'pending',
    -- pending:   awaiting Super Admin review
    -- active:    can log in, fully operational
    -- inactive:  Super Admin deactivated (e.g. payment not made). Data preserved.
    -- suspended: ToS violation. Stronger than inactive.
    -- rejected:  registration was rejected
  `access_until`      DATETIME NULL,
    -- Optional: Super Admin can set an expiry date.
    -- If set and in the past, logins are blocked even if status='active'.
    -- Super Admin extends this date to re-enable access.
    -- NULL means no date-based restriction (rely only on status).
  `suffix_locked`     BOOLEAN DEFAULT FALSE,
    -- Set to TRUE after the first user of this school logs in.
    -- Once locked, suffix cannot be changed (it is part of user identities).
  `admin_credentials_shown` BOOLEAN DEFAULT FALSE,
    -- Set to TRUE after Super Admin views the initial admin credentials.
    -- Once TRUE, the temp password is hashed and cannot be retrieved.
  `rejection_reason`  TEXT NULL,
  `approved_by`       INT UNSIGNED NULL,
  `approved_at`       DATETIME NULL,
  `deactivated_by`    INT UNSIGNED NULL,
  `deactivated_at`    DATETIME NULL,
  `deactivation_reason` TEXT NULL,
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_suffix` (`suffix`),
  KEY `idx_status` (`status`),
  KEY `idx_access_until` (`access_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Super Admin accounts (platform owners — completely separate from school users)
CREATE TABLE `super_admins` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`          VARCHAR(100) NOT NULL UNIQUE,
  `email`             VARCHAR(255) NOT NULL UNIQUE,
  `password_hash`     VARCHAR(255) NOT NULL,
  `first_name`        VARCHAR(100),
  `last_name`         VARCHAR(100),
  `status`            ENUM('active','inactive') DEFAULT 'active',
  `last_login`        DATETIME,
  `last_login_ip`     VARCHAR(45),
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Platform-level audit log (Super Admin actions)
CREATE TABLE `platform_activity_logs` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `super_admin_id`  INT UNSIGNED NOT NULL,
  `action`          VARCHAR(100) NOT NULL,
    -- e.g. 'approve_school', 'deactivate_school', 'activate_school',
    --      'assign_suffix', 'reset_admin_password', 'delete_school'
  `school_id`       INT UNSIGNED,
  `school_name`     VARCHAR(255),  -- snapshot at time of action
  `details`         JSON,
  `ip_address`      VARCHAR(45),
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_super_admin` (`super_admin_id`),
  KEY `idx_school` (`school_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Plans table (informational only — no automation, no payment processing)
CREATE TABLE `school_plans` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`           ENUM('trial','basic','standard','premium') NOT NULL UNIQUE,
  `display_name`   VARCHAR(100) NOT NULL,
  `description`    TEXT,
  `max_students`   INT DEFAULT NULL,    -- NULL = unlimited
  `max_teachers`   INT DEFAULT NULL,    -- NULL = unlimited
  `trial_days`     INT DEFAULT 90,      -- trial duration in days
  `notes`          TEXT,               -- internal notes for Super Admin
  `is_active`      BOOLEAN DEFAULT TRUE,
  `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Migration tracking
CREATE TABLE `migrations` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `filename`     VARCHAR(255) NOT NULL UNIQUE,
  `executed_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


═══════════════════════════════════════════════════════
STEP 2 — Add school_id to ALL 65 existing tables
═══════════════════════════════════════════════════════

Write ALTER TABLE statements for every table listed below.
Each statement must:
  (a) ADD COLUMN school_id INT UNSIGNED NOT NULL DEFAULT 1
  (b) ADD INDEX idx_school_id (school_id)
  (c) ADD FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
  
Do this for: academic_years, accountants, activity_logs, affective_domains,
assignments, assignment_submissions, attendance, attendance_backup,
attendance_summary, bank_account_settings, cbt_answers, cbt_attempts,
cbt_exams, cbt_questions, cbt_question_bank, classes, class_performance_summary,
class_progression_rules, class_teacher_assignments, class_timetable,
class_whatsapp_groups, compiled_results, data_changes_summary, data_change_logs,
departments, exam_timetable, fee_structures, file_uploads, manual_class_changes,
notifications, parents, parent_student_links, password_reset_log, payments,
performance_logs, permissions, psychomotor_domains, realtime_events,
role_permissions, scholarships, school_calendar, school_settings, scores,
security_events_summary, security_logs, signature_settings, students,
student_domains, student_fee_balances, student_promotions, student_scholarships,
student_summary, student_term_invoices, subjects, subject_assignments,
subject_registrations, teachers, teacher_assignments, terms, token_blacklist,
user_dashboard_responsibilities, user_notifications, user_sessions, users

═══════════════════════════════════════════════════════
STEP 3 — Seed data
═══════════════════════════════════════════════════════

-- Insert Graceland Royal Academy as school_id = 1 (preserves existing data)
INSERT INTO schools (id, name, suffix, email, plan, status, access_until, suffix_locked)
VALUES (1, 'Graceland Royal Academy', 'gra', 'info@gracelandroyalacademy.com.ng',
        'trial', 'active', DATE_ADD(NOW(), INTERVAL 90 DAY), TRUE);

-- Insert default super admin (CHANGE PASSWORD ON FIRST LOGIN)
INSERT INTO super_admins (username, email, password_hash, first_name, last_name)
VALUES ('superadmin', 'admin@smugflex.com',
        '$2y$12$PLACEHOLDER_HASH_CHANGE_ON_FIRST_LOGIN',
        'SMugFlex', 'Admin');

-- Insert plans (informational)
INSERT INTO school_plans (name, display_name, description, trial_days) VALUES
  ('trial',   'Free Trial',   'One term free trial. Full access.', 90),
  ('basic',   'Basic',        'Standard plan for small schools.', 0),
  ('standard','Standard',     'For medium-sized schools.', 0),
  ('premium', 'Premium',      'Unlimited access for large schools.', 0);

Output file: database/migrations/001_multitenancy.sql
```

---

### PHASE 2 — Suffix Identity & Authentication System

```
You are implementing the suffix-based identity system for SMugFlex.

═══════════════════════════════════════════════════════
CONCEPT
═══════════════════════════════════════════════════════
Every user logs in as username@suffix (e.g. michael@joy).
The "@suffix" part tells the system which school this user belongs to.
The system parses this on login to find school_id, then verifies
the user exists in that school's user records.

═══════════════════════════════════════════════════════
STEP 1 — Update api/helpers/JWT.php
═══════════════════════════════════════════════════════

Update JWT::encode() — ensure these fields are always in the payload:
  user_id        (int)
  username       (string) — just the base username, e.g. "michael"
  role           (string) — admin, teacher, accountant, parent, student
  school_id      (int)    — MANDATORY for school users
  school_suffix  (string) — e.g. "joy"
  school_name    (string) — e.g. "Joy Academy"
  exp            (int)    — Unix timestamp, 24 hours from now

For Super Admin JWT, use a DIFFERENT secret key and payload:
  super_admin_id  (int)
  username        (string)
  is_super_admin  (boolean) = TRUE
  exp             (int)
  -- NO school_id in super admin JWT

Update JWT::validateToken():
  Accept a second parameter: bool $expectSuperAdmin = false
  If $expectSuperAdmin = true: use SUPER_ADMIN_JWT_SECRET env var
  Otherwise: use JWT_SECRET env var
  This prevents a school user's token from working on super admin routes
  and vice versa.

═══════════════════════════════════════════════════════
STEP 2 — Update api/controllers/AuthController.php login()
═══════════════════════════════════════════════════════

CURRENT login() accepts: { username, password, role }
NEW login() accepts:     { identity, password, role }
  where identity = "michael@joy"

NEW login() logic:

public function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    Middleware::validateRequired($data, ['identity', 'password', 'role']);
    
    $identity = trim($data['identity']);  // e.g. "michael@joy"
    $password  = $data['password'];
    $role      = Middleware::validateEnum($data['role'],
                   ['admin','teacher','accountant','parent','student'], 'role');
    
    // ── STEP A: Parse identity ──
    if (!str_contains($identity, '@')) {
        Response::badRequest('Invalid identity format. Use username@suffix (e.g. michael@joy)');
    }
    [$username, $suffix] = explode('@', $identity, 2);
    $username = strtolower(trim($username));
    $suffix   = strtolower(trim($suffix));
    
    if (empty($username) || empty($suffix)) {
        Response::badRequest('Both username and suffix are required.');
    }
    
    // ── STEP B: Validate suffix → get school ──
    $schoolStmt = $this->conn->prepare(
        "SELECT id, name, status, access_until, primary_color, secondary_color, logo_url
         FROM schools WHERE suffix = :suffix LIMIT 1"
    );
    $schoolStmt->execute([':suffix' => $suffix]);
    $school = $schoolStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$school) {
        // IMPORTANT: Return the same generic message whether the suffix is wrong
        // OR the username is wrong — prevents enumeration attacks
        Response::unauthorized('Invalid credentials.');
    }
    
    // ── STEP C: Check school status ──
    if ($school['status'] === 'inactive') {
        Response::forbidden('This school account is currently inactive. Please contact SMugFlex support.');
    }
    if ($school['status'] === 'suspended') {
        Response::forbidden('This school account has been suspended. Please contact SMugFlex support.');
    }
    if ($school['status'] === 'pending' || $school['status'] === 'rejected') {
        Response::forbidden('This school account is not yet active.');
    }
    
    // ── STEP D: Check access_until date ──
    if ($school['access_until'] !== null) {
        if (strtotime($school['access_until']) < time()) {
            Response::forbidden('Your access period has ended. Please contact SMugFlex to renew your subscription.');
        }
    }
    
    $school_id = (int)$school['id'];
    
    // ── STEP E: Rate limit by identity ──
    RateLimiter::check("{$identity}:login_attempt");
    
    // ── STEP F: Find user in this school ──
    // NOTE: username is stored without @suffix in the database
    // school_id in the users table guarantees school isolation
    $query = "SELECT u.*,
                CASE WHEN u.role='teacher'    THEN t.first_name
                     WHEN u.role='parent'     THEN p.first_name
                     WHEN u.role='accountant' THEN a.first_name
                     WHEN u.role='student'    THEN s.first_name
                     ELSE 'Admin' END as first_name,
                CASE WHEN u.role='teacher'    THEN t.last_name
                     WHEN u.role='parent'     THEN p.last_name
                     WHEN u.role='accountant' THEN a.last_name
                     WHEN u.role='student'    THEN s.last_name
                     ELSE 'User' END as last_name
              FROM users u
              LEFT JOIN teachers t    ON u.role='teacher'    AND u.linked_id=t.id    AND t.school_id=:sid1
              LEFT JOIN parents p     ON u.role='parent'     AND u.linked_id=p.id    AND p.school_id=:sid2
              LEFT JOIN accountants a ON u.role='accountant' AND u.linked_id=a.id    AND a.school_id=:sid3
              LEFT JOIN students s    ON u.role='student'    AND u.linked_id=s.id    AND s.school_id=:sid4
              WHERE u.username = :username
                AND u.role = :role
                AND u.school_id = :school_id
                AND u.status = 'Active'
              LIMIT 1";
    
    $stmt = $this->conn->prepare($query);
    $stmt->execute([
        ':username'  => $username,
        ':role'      => $role,
        ':school_id' => $school_id,
        ':sid1' => $school_id, ':sid2' => $school_id,
        ':sid3' => $school_id, ':sid4' => $school_id,
    ]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        // Same generic message — do not confirm whether username or suffix was wrong
        Response::unauthorized('Invalid credentials.');
    }
    
    // ── STEP G: Verify password ──
    $passwordValid = false;
    if (password_verify($password, $user['password_hash'])) {
        $passwordValid = true;
    } elseif ($password === $user['password_hash']) {
        // Legacy plain-text upgrade
        $passwordValid = true;
        $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $this->conn->prepare("UPDATE users SET password_hash=? WHERE id=?")
             ->execute([$newHash, $user['id']]);
    }
    
    if (!$passwordValid) {
        RateLimiter::increment("{$identity}:login_attempt");
        Response::unauthorized('Invalid credentials.');
    }
    
    // ── STEP H: Lock suffix if this is first login ──
    if (!$school['suffix_locked']) {
        $this->conn->prepare("UPDATE schools SET suffix_locked=TRUE WHERE id=?")
             ->execute([$school_id]);
    }
    
    // ── STEP I: Issue JWT ──
    $token = JWT::encode([
        'user_id'       => (int)$user['id'],
        'username'      => $username,      // bare username without @suffix
        'full_identity' => "{$username}@{$suffix}", // display identity
        'role'          => $user['role'],
        'school_id'     => $school_id,
        'school_suffix' => $suffix,
        'school_name'   => $school['name'],
        'exp'           => time() + (int)Config::getJwtExpiry(),
    ]);
    
    // ── STEP J: Update last login ──
    $this->conn->prepare("UPDATE users SET last_login=NOW() WHERE id=?")
         ->execute([$user['id']]);
    
    // ── STEP K: Return response ──
    Response::success([
        'token'          => $token,
        'id'             => (int)$user['id'],
        'username'       => $username,
        'full_identity'  => "{$username}@{$suffix}",
        'role'           => $user['role'],
        'first_name'     => $user['first_name'] ?? '',
        'last_name'      => $user['last_name'] ?? '',
        'school_id'      => $school_id,
        'school_name'    => $school['name'],
        'school_suffix'  => $suffix,
        'school_logo'    => $school['logo_url'],
        'school_primary_color'   => $school['primary_color'],
        'school_secondary_color' => $school['secondary_color'],
    ], 'Login successful');
}

═══════════════════════════════════════════════════════
STEP 3 — Update Super Admin Login
Create: api/controllers/SuperAdminController.php → login()
═══════════════════════════════════════════════════════

Super Admin login does NOT use the @suffix format.
They log in with: { username, password }
at the route: POST /api/super-admin/auth/login

The JWT is signed with SUPER_ADMIN_JWT_SECRET (different key).
The JWT payload has is_super_admin: true and NO school_id.

public function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    Middleware::validateRequired($data, ['username', 'password']);
    
    $username = trim($data['username']);
    $password = $data['password'];
    
    $stmt = $this->conn->prepare(
        "SELECT * FROM super_admins WHERE username=:u AND status='active' LIMIT 1"
    );
    $stmt->execute([':u' => $username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin || !password_verify($password, $admin['password_hash'])) {
        Response::unauthorized('Invalid credentials.');
    }
    
    $token = JWT::encode([
        'super_admin_id' => (int)$admin['id'],
        'username'       => $admin['username'],
        'is_super_admin' => true,
        'exp'            => time() + 86400,
    ], true); // true = use SUPER_ADMIN_JWT_SECRET
    
    $this->conn->prepare("UPDATE super_admins SET last_login=NOW(), last_login_ip=? WHERE id=?")
         ->execute([$_SERVER['REMOTE_ADDR'] ?? '', $admin['id']]);
    
    Response::success([
        'token'      => $token,
        'username'   => $admin['username'],
        'first_name' => $admin['first_name'],
        'last_name'  => $admin['last_name'],
    ], 'Super Admin login successful');
}

═══════════════════════════════════════════════════════
STEP 4 — Create api/helpers/TenantMiddleware.php
═══════════════════════════════════════════════════════

class TenantMiddleware {

    /**
     * Resolve school_id from the JWT.
     * Called at the start of every school-scoped controller method.
     * Returns the verified school_id as an integer.
     * Aborts with 403 if school_id is missing, invalid, or school is not active.
     */
    public static function resolveSchoolId(PDO $conn): int {
        $headers   = function_exists('getallheaders') ? getallheaders() : [];
        $tokenData = JWT::validateToken($headers, false); // school JWT
        
        if (!$tokenData) {
            Response::unauthorized('Invalid or expired token.');
        }
        if (isset($tokenData['is_super_admin']) && $tokenData['is_super_admin']) {
            Response::forbidden('Super admin token cannot access school resources directly.');
        }
        
        $school_id = (int)($tokenData['school_id'] ?? 0);
        if ($school_id <= 0) {
            Response::forbidden('School context missing from token.');
        }
        
        // Verify school is still active (cached per request via static var)
        static $verified = [];
        if (!isset($verified[$school_id])) {
            $stmt = $conn->prepare(
                "SELECT status, access_until FROM schools WHERE id=:id LIMIT 1"
            );
            $stmt->execute([':id' => $school_id]);
            $school = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$school) {
                Response::forbidden('School not found.');
            }
            if (!in_array($school['status'], ['active'], true)) {
                Response::forbidden('School account is not active. Contact SMugFlex support.');
            }
            if ($school['access_until'] && strtotime($school['access_until']) < time()) {
                Response::forbidden('School access period has ended. Please contact SMugFlex.');
            }
            $verified[$school_id] = true;
        }
        
        return $school_id;
    }

    /**
     * Verify that a specific record belongs to the given school.
     * Use this before any operation on a record fetched by ID.
     * Prevents horizontal privilege escalation (IDOR).
     */
    public static function assertOwnership(
        PDO $conn, string $table, int $record_id, int $school_id
    ): void {
        // Whitelist of safe table names to prevent SQL injection
        $allowedTables = [
            'students','teachers','parents','accountants','users','classes',
            'subjects','scores','compiled_results','payments','fee_structures',
            'terms','notifications','assignments','cbt_exams','attendance',
            // add all 65 tables here
        ];
        if (!in_array($table, $allowedTables, true)) {
            Response::serverError('Invalid table reference.');
        }
        
        $stmt = $conn->prepare(
            "SELECT school_id FROM `{$table}` WHERE id=:id LIMIT 1"
        );
        $stmt->execute([':id' => $record_id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$record || (int)$record['school_id'] !== $school_id) {
            Response::notFound('Record not found.');
            // Return 404 not 403 — don't confirm existence of other schools' records
        }
    }

    /**
     * Validate a suffix format before assigning it.
     */
    public static function validateSuffixFormat(string $suffix): bool {
        return (bool) preg_match('/^[a-z0-9]{2,20}$/', $suffix);
    }

    /**
     * Check if a suffix is available (not taken by another school).
     */
    public static function isSuffixAvailable(PDO $conn, string $suffix): bool {
        $stmt = $conn->prepare("SELECT 1 FROM schools WHERE suffix=:s LIMIT 1");
        $stmt->execute([':s' => $suffix]);
        return !$stmt->fetch();
    }
}

═══════════════════════════════════════════════════════
STEP 5 — Username validation when school Admin creates users
═══════════════════════════════════════════════════════

In UserController.php (createUser) and any user creation endpoint:

Validate that the username does NOT contain "@":
  if (str_contains($username, '@')) {
      Response::badRequest('Username cannot contain "@". The @suffix is added automatically by the system.');
  }

Validate username format: lowercase, alphanumeric + underscore + hyphen, 3-50 chars:
  if (!preg_match('/^[a-z0-9_\-]{3,50}$/', $username)) {
      Response::badRequest('Username must be 3-50 characters: lowercase letters, numbers, underscores, hyphens only.');
  }

Always enforce uniqueness within the school (not globally):
  WHERE username = :username AND school_id = :school_id
  (same username can exist in different schools — they are different people)

Output: Modified api/controllers/AuthController.php
        New: api/helpers/TenantMiddleware.php
        Modified: api/helpers/JWT.php
        Modified: api/controllers/UserController.php
```

---

### PHASE 3 — Backend API: Tenant Isolation

```
You are adding school_id scoping to all 18 existing API controllers
in the SMugFlex multi-school system.

═══════════════════════════════════════════════════════
PATTERN TO APPLY TO ALL 18 CONTROLLERS
═══════════════════════════════════════════════════════

At the start of every public method (except those that don't need auth):
  $school_id = TenantMiddleware::resolveSchoolId($this->conn);

For every SELECT query, add:
  AND school_id = :school_id

For every INSERT query, add school_id to columns and values:
  INSERT INTO table_name (..., school_id) VALUES (..., :school_id)
  $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);

For every UPDATE/DELETE on a specific record, use assertOwnership:
  TenantMiddleware::assertOwnership($this->conn, 'students', $student_id, $school_id);

═══════════════════════════════════════════════════════
CONTROLLERS TO UPDATE (all 18):
═══════════════════════════════════════════════════════

StudentController.php    — getStudents, createStudent, updateStudent,
                           deleteStudent, getStudentById, uploadPhoto, etc.

TeacherController.php    — getTeachers, createTeacher, updateTeacher, etc.

ClassController.php      — getClasses, createClass, updateClass,
                           getTimetable, setTimetable, etc.

SubjectController.php    — getSubjects, createSubject, assignSubject, etc.

ResultsController.php    — getScores, enterScores, compileResults,
                           approveResults, getBroadsheet, getReportCard, etc.

PaymentController.php    — getPayments, recordPayment, getPaymentHistory
                           NOTE: Paystack school-fee payments REMAIN as-is.
                           Only add school_id scoping to payment records.

InvoiceController.php    — getInvoices, createInvoice, etc.

ParentController.php     — getParents, createParent, linkStudentParent, etc.

ReportController.php     — generateReport, getAttendanceReport, etc.

AttendanceController.php — markAttendance, getAttendance, getSummary, etc.

NotificationController.php — sendNotification, getNotifications,
                              SSE stream: filter events by school_id

AssignmentController.php   — createAssignment, getAssignments, submit, grade, etc.

FileController.php         — uploadFile, getFile
                             IMPORTANT: store files at:
                             uploads/schools/{school_id}/photos/
                             uploads/schools/{school_id}/documents/
                             uploads/schools/{school_id}/signatures/
                             NEVER at a flat path.

UserController.php         — createUser, updateUser, deleteUser, getUsers
                             Enforce: username cannot contain "@"

ProgressionController.php  — promoteStudents, getProgressionRules, etc.

RealtimeController.php     — SSE stream()
                             Filter: SELECT * FROM realtime_events
                             WHERE school_id = :school_id AND ...
                             This ensures School A never receives School B's events.

CbtController.php          — createExam, getExams, startAttempt, submitAttempt, etc.

AuthController.php         — login (already done in Phase 2)
                             logout: invalidate token in token_blacklist with school_id
                             changePassword: scope to school_id from JWT
                             profile: scope to school_id from JWT

═══════════════════════════════════════════════════════
UPDATE api/index.php
═══════════════════════════════════════════════════════

1. Remove hardcoded Graceland CORS:
   BEFORE: $allowed_origins = ['https://gracelandroyalacademy.com.ng', ...]
   AFTER:  Allow all origins for now (update to specific domain in production):
           header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
           OR read allowed origins from .env CORS_ORIGINS

2. Add new routes:
   case 'super-admin':   → route to SuperAdminController
   case 'schools':       → route to TenantController (school registration/profile)

3. Remove debug routes:
   Delete any routing to jwt_test.php, jwt_diagnostic.php, test.php

═══════════════════════════════════════════════════════
CREATE api/controllers/SuperAdminController.php (full)
═══════════════════════════════════════════════════════

All methods require Super Admin JWT (is_super_admin=true).
Call Middleware::requireSuperAdmin() at start of each method.

Methods:

login()                        — Phase 2 already covers this

listSchools()
  Returns all schools with:
  id, name, suffix, email, phone, plan, status, access_until,
  student_count (subquery), teacher_count (subquery), created_at
  Supports filters: status, plan, search (name/email)
  Ordered by: created_at DESC

getPendingRegistrations()
  Returns schools WHERE status='pending' ORDER BY created_at ASC

approveSchool(int $id, string $suffix, string $access_until_date)
  Validates:
    - suffix format (TenantMiddleware::validateSuffixFormat)
    - suffix availability (TenantMiddleware::isSuffixAvailable)
    - school exists and is 'pending'
  Actions:
    - Set suffix = given suffix
    - Set status = 'active'
    - Set plan = 'trial'
    - Set access_until = given date (default: today + 90 days)
    - Set approved_by = super_admin_id, approved_at = NOW()
    - Generate initial admin credentials:
        username = "admin"
        password = random 12-char alphanumeric (DISPLAY ONCE)
        INSERT INTO users (username, password_hash, role, school_id, status)
        VALUES ('admin', bcrypt(temp_password), 'admin', school_id, 'Active')
    - Set admin_credentials_shown = FALSE on school record
  Returns:
    - school data
    - admin_temp_password (plaintext, shown ONLY THIS ONCE)
    - admin_identity: "admin@{suffix}" (what the school admin will use to log in)
  Logs to platform_activity_logs

getInitialAdminCredentials(int $school_id)
  Can ONLY be called when admin_credentials_shown = FALSE.
  Returns admin_identity and temp password.
  After returning: SET admin_credentials_shown = TRUE.
  After that, this endpoint returns 410 Gone — credentials no longer available.
  The Super Admin must use resetAdminPassword() if credentials are lost.

rejectSchool(int $id, string $reason)
  Set status = 'rejected', rejection_reason = reason
  Logs to platform_activity_logs

deactivateSchool(int $id, string $reason)
  Set status = 'inactive'
  Set deactivated_by, deactivated_at, deactivation_reason
  Logs to platform_activity_logs: action='deactivate_school'
  Effect: All users of this school get "Account inactive" on next login attempt.
  DATA IS PRESERVED. Nothing is deleted.

activateSchool(int $id, string $new_access_until_date)
  Set status = 'active'
  Set access_until = new_access_until_date
  Clear deactivation fields
  Logs to platform_activity_logs: action='activate_school'

suspendSchool(int $id, string $reason)
  Set status = 'suspended' (stronger than inactive — ToS violation)
  Logs to platform_activity_logs

extendAccess(int $id, string $new_access_until_date)
  Set access_until = new_access_until_date
  Logs to platform_activity_logs

setSchoolPlan(int $id, string $plan)
  Set plan = plan (trial/basic/standard/premium)
  Informational only. No automation triggered.
  Logs to platform_activity_logs

resetAdminPassword(int $school_id)
  Find the school's admin user (role='admin', school_id=school_id)
  Generate new random 12-char password
  Update password_hash = bcrypt(new_password)
  Set user.must_change_password = TRUE
    (add must_change_password BOOLEAN to users table)
  Return: { admin_identity: "admin@{suffix}", temp_password: "..." }
  Password shown ONCE — not stored in plaintext anywhere.
  Logs to platform_activity_logs

getSchoolDetails(int $id)
  Full school profile + stats:
    student_count, teacher_count, parent_count, accountant_count,
    payment_count, class_count, term_count
    recent activity_logs for this school (last 20)
    subscription info

getPlatformStats()
  total_schools, active_schools, pending_schools, inactive_schools,
  total_students (SUM across all schools), total_teachers (SUM),
  schools_by_plan (GROUP BY plan), new_schools_this_month

getActivityLogs()
  Returns platform_activity_logs (Super Admin's own actions) paginated

editSchoolDetails(int $id, array $data)
  Can edit: name, email, phone, address, city, state, logo_url,
            primary_color, secondary_color
  CANNOT edit suffix after suffix_locked = TRUE
  CANNOT edit school_id
```

---

### PHASE 4 — Super Admin Portal

```
Create the complete Super Admin portal for SMugFlex.

LOCATION: src/components/super-admin/

LAYOUT: src/components/super-admin/SuperAdminLayout.tsx
  Sidebar with navigation:
    Overview (platform stats)
    Pending Registrations  [badge with count]
    All Schools
    Inactive Schools
    Activity Log
    Settings
  Top bar: "SMugFlex Super Admin" | username | logout
  SMugFlex branding (NOT any school's branding)

═══════════════════════════════════════════════════════
PAGES TO BUILD:
═══════════════════════════════════════════════════════

1. src/components/super-admin/SuperAdminLoginPage.tsx
   Standalone login page (not the school login page).
   Route: /super-admin/login
   Fields: username, password
   Calls: POST /api/super-admin/auth/login
   On success: navigate to /super-admin/dashboard
   Branding: SMugFlex logo, dark navy + amber color scheme
   No school suffix. No role dropdown.

2. src/components/super-admin/PlatformOverviewPage.tsx
   Cards:
     Total Schools | Active Schools | Pending Review | Inactive
     Total Students (all schools) | Total Teachers (all schools)
   Charts:
     Bar chart: Schools by status
     Line chart: New school registrations last 12 months
   Quick actions: Go to Pending Registrations

3. src/components/super-admin/PendingRegistrationsPage.tsx
   Table: School Name | Email | Phone | Registered | Actions
   Action button per row: "Review & Approve"
   Opens SchoolApprovalModal.tsx:

   SchoolApprovalModal.tsx (critical component):
     Shows school details (name, email, phone, address)
     Input: Assign Suffix
       - Live availability check (debounced): GET /api/super-admin/check-suffix?suffix=joy
       - Shows: ✓ "joy" is available / ✗ "joy" is already taken
       - Format hint: "2-20 lowercase letters/numbers only"
     Input: Access Until (date picker, default = today + 90 days)
     Dropdown: Plan (default: trial)
     Button: "Approve & Create Admin Account"
     
     On success — show CredentialsModal:
       "⚠️ Save these credentials now. They will not be shown again."
       Admin Identity:   admin@joy
       Temp Password:    Xk8#mQ2pLn (shown once)
       [Copy to Clipboard] button
       [I have saved these credentials → Close]
     
     OR: Button "Reject" → text area for reason

4. src/components/super-admin/AllSchoolsPage.tsx
   Searchable, filterable table:
     Columns: Name | Suffix | Plan | Status | Students | Access Until | Actions
     Filters: Status (All/Active/Inactive/Suspended/Pending), Plan
     Search: by name or email
   Per-row actions: View Details | Deactivate | Activate | Extend Access | Set Plan

5. src/components/super-admin/SchoolDetailPage.tsx
   Route: /super-admin/schools/:id
   Sections:
     School Profile (name, suffix, email, status badge, plan badge)
     Access Control:
       Status badge with action buttons:
         [Active] → Deactivate button
         [Inactive] → Activate button + Extend Access button
         [Suspended] → Reactivate button
       Access Until: date shown with [Extend] button
       Plan: shown with [Change Plan] dropdown
     Usage Stats:
       Students, Teachers, Parents, Classes, Terms, Payments
     Admin Account:
       Shows "admin@{suffix}" identity
       [Reset Admin Password] button → shows new credentials once
     Deactivation History:
       If previously deactivated: shows who deactivated, when, why
     Recent Activity (last 20 entries from activity_logs for this school)

6. src/components/super-admin/ActivityLogPage.tsx
   Table of platform_activity_logs:
     Super Admin name | Action | School | Details | Timestamp | IP

═══════════════════════════════════════════════════════
CONTEXT: src/contexts/SuperAdminContext.tsx
═══════════════════════════════════════════════════════
Separate from SchoolContext. Never mix them.
Stores: superAdmin (user object), token, schools[], pendingCount, platformStats
Methods: login, logout, listSchools, approveSchool, deactivateSchool,
         activateSchool, extendAccess, getSchoolDetails, resetAdminPassword,
         getPlatformStats, checkSuffix

═══════════════════════════════════════════════════════
ROUTING: Update src/App.tsx
═══════════════════════════════════════════════════════
/super-admin/login      → SuperAdminLoginPage (public)
/super-admin/*          → Protected by SuperAdminProtectedRoute
/super-admin/dashboard  → PlatformOverviewPage
/super-admin/pending    → PendingRegistrationsPage
/super-admin/schools    → AllSchoolsPage
/super-admin/schools/:id → SchoolDetailPage
/super-admin/logs       → ActivityLogPage
```

---

### PHASE 5 — SMugFlex Platform Landing Page

```
Replace src/components/LandingPage.tsx (Graceland-branded) with a brand new
SMugFlex platform marketing landing page.

FILE: src/components/platform/PlatformLandingPage.tsx
ROUTE: /  (the main landing page of smugflex.com)

═══════════════════════════════════════════════════════
DESIGN BRIEF
═══════════════════════════════════════════════════════
Brand name:     SMugFlex
Tagline:        "One Platform. Every School."
Color scheme:   Primary #1E3A5F (deep navy), Accent #F4A300 (warm amber)
Font feel:      Professional, modern, Nigerian education context
Tone:           Confident, trustworthy, approachable

═══════════════════════════════════════════════════════
SECTIONS (in order):
═══════════════════════════════════════════════════════

SECTION 1 — Navigation Header (sticky)
  Left:  SMugFlex logo (text-based with icon if no logo file yet) + "SMugFlex"
  Right: Features | Pricing | Contact | [Login →] button | [Register Your School] button
  Mobile: hamburger menu

SECTION 2 — Hero
  Headline: "One Platform. Every School."
  Subheadline: "SMugFlex gives Nigerian schools a complete management system —
               admissions, results, fees, attendance, CBT, and more.
               Trusted by schools across the country."
  CTA buttons:
    Primary:   "Register Your School →"  (links to /register)
    Secondary: "Login to Your School"    (links to /login)
  Hero visual: A clean illustration or mockup showing the dashboard
               (use a styled card/mockup built in JSX if no image available)

SECTION 3 — Features ("Everything Your School Needs")
  6 feature cards with icons:
  1. Student Management      — Admissions, profiles, transfers, promotions
  2. Academic Results        — Score entry, report cards, broadsheets, CBT
  3. Fee Management          — Invoices, payments, debtors, receipts
  4. Attendance Tracking     — Daily attendance, summaries, reports
  5. Staff Management        — Teachers, accountants, timetables, assignments
  6. Parent & Student Portal — Results, notifications, school fee payments online

SECTION 4 — How It Works ("Get Your School Running in 3 Steps")
  Step 1: Register Your School
          "Fill out our simple registration form. We review and approve within 24 hours."
  Step 2: Get Your Login Details
          "We assign your school a unique ID. Your admin receives secure login credentials."
  Step 3: Start Managing
          "Invite your staff, enroll students, and take control of your school's operations."

SECTION 5 — Pricing ("Simple, Fair Pricing")
  3 cards:
  Trial:    "Free for one term"   — Full access, no credit card, all features
  Basic:    "Contact us"          — For small schools
  Premium:  "Contact us"          — For larger schools / multiple campuses
  Note:     "All payments are processed offline. Contact us to upgrade."
  CTA: "Start Free Trial →"

SECTION 6 — CTA Banner
  "Ready to modernize your school?"
  [Register Your School — It's Free to Start]

SECTION 7 — Footer
  Logo + tagline
  Links: About | Features | Pricing | Login | Register | Contact
  Contact: info@smugflex.com | +234-XXX-XXX-XXXX
  © 2025 SMugFlex Ventures. All rights reserved.

═══════════════════════════════════════════════════════
IMPORTANT NOTES:
═══════════════════════════════════════════════════════
- Remove ALL Graceland Royal Academy references
- Remove the old school-logo.jpg import
- This page is 100% SMugFlex branded
- The old LandingPage.tsx should be deleted or renamed SchoolPublicPage.tsx
  (a per-school public page used by individual schools if needed)
```

---

### PHASE 6 — SMugFlex Login Page

```
Replace src/components/LoginPage.tsx with a new multi-school login page.

FILE: src/components/platform/PlatformLoginPage.tsx
ROUTE: /login

═══════════════════════════════════════════════════════
DESIGN & BEHAVIOR
═══════════════════════════════════════════════════════

The login page must support the suffix-based identity system.
Users log in with their identity in the format: username@suffix
(e.g. michael@joy, admin@greenwood, principal@stars)

LAYOUT:
  Split-screen or centered card design.
  Left side (desktop): SMugFlex branding, tagline, feature highlights
  Right side: Login form

  OR: Clean centered card with SMugFlex logo at top.

FORM FIELDS:
  1. Identity field
     Label:       "Your SMugFlex Identity"
     Placeholder: "e.g. michael@joy"
     Type:        text
     Hint text:   "Format: username@schoolsuffix (provided by your school admin)"
     
  2. Password field
     Label:       "Password"
     Type:        password
     Show/hide toggle
     
  3. Role dropdown
     Label:       "Login as"
     Options:     School Admin | Teacher | Accountant | Parent | Student
     
  4. Submit button: "Login →"

SMART SUFFIX DETECTION:
  As the user types in the Identity field, when "@" is detected:
    - Extract the suffix part after "@"
    - After 500ms debounce, call: GET /api/schools/public-info?suffix={suffix}
    - If school found:
        Show a small banner below the field:
        [school logo or placeholder icon] "Joy Academy" ✓
        Apply school's primary_color subtly to the form border
    - If not found and suffix is ≥ 2 chars:
        Show: "School not recognized. Check your suffix."
  This gives users immediate feedback without revealing whether
  the full identity exists (only the school suffix is checked — not the username).

ERROR MESSAGES:
  Always use the generic: "Invalid credentials. Please check your identity and password."
  Do NOT say "School not found" or "User not found" on failed login
  (prevents enumeration attacks)
  The only exception: if school is inactive/suspended, show a specific message
  so the user knows to contact SMugFlex.

LINKS:
  "Forgot your identity?" → Shows modal with instructions:
    "Your SMugFlex identity is username@suffix.
     Your username and suffix were provided by your school admin.
     If you've forgotten them, please contact your school administrator."
  
  "Are you a school admin? Register your school →" → /register
  "Back to home" → /

AFTER LOGIN SUCCESS:
  Navigate based on role:
    admin      → /dashboard/admin
    teacher    → /dashboard/teacher
    accountant → /dashboard/accountant
    parent     → /dashboard/parent
    student    → /dashboard/student
  
  Apply school branding to entire app:
    document.documentElement.style.setProperty('--primary-color', school_primary_color)
    document.documentElement.style.setProperty('--secondary-color', school_secondary_color)

NOTES:
  - Remove ALL Graceland-specific branding
  - Remove the old 5-tab role login UI (roles are now a dropdown, not tabs)
  - The page must work for ANY school — branding is dynamic per school suffix
  - SMugFlex logo shown at all times (school logo shown only after suffix detected)
```

---

### PHASE 7 — School Registration Flow

```
Create the school registration page for SMugFlex.

FILE: src/components/platform/SchoolRegistrationPage.tsx
ROUTE: /register

═══════════════════════════════════════════════════════
MULTI-STEP REGISTRATION FORM (3 steps)
═══════════════════════════════════════════════════════

STEP 1 — School Information
  School Name*
  School Email* (becomes contact email)
  Phone Number*
  School Address*
  City*
  State* (dropdown: Nigerian states)
  School Type* (Primary | Secondary | Combined Primary & Secondary | Tertiary)
  School Website (optional)

STEP 2 — About Your School
  Number of Students (approximate range: 1-50 | 51-200 | 201-500 | 500+)
  Number of Teachers (approximate range)
  How did you hear about SMugFlex? (optional)
  Any specific requirements or notes (optional text area)

STEP 3 — Review & Submit
  Summary of all entered information
  Terms of Service checkbox (required)
  Privacy Policy checkbox (required)
  Submit button: "Submit Registration Request"

ON SUBMIT:
  POST /api/schools/register
  {
    name, email, phone, address, city, state,
    school_type, approx_students, approx_teachers,
    website, referral_source, notes
  }
  
  On success:
    Show success screen:
    ✓ "Registration Submitted Successfully!"
    "Your school registration has been received. 
     The SMugFlex team will review your application and 
     contact you at {email} within 24 hours with your 
     login credentials once approved."
    [Back to Home]

═══════════════════════════════════════════════════════
BACKEND: api/controllers/TenantController.php
═══════════════════════════════════════════════════════

register() — public endpoint, no auth required
  Validate all required fields
  Check email uniqueness: SELECT 1 FROM schools WHERE email=?
  INSERT INTO schools (name, email, phone, address, city, state, status)
    status = 'pending' (Super Admin must approve)
    suffix = NULL (Super Admin assigns this)
  Return success message

getPublicInfo(string $suffix) — public endpoint, no auth
  Used by the login page for smart suffix detection
  SELECT name, logo_url, primary_color, secondary_color, status
  FROM schools WHERE suffix = :suffix
  If status != 'active': return { found: true, active: false }
  If not found: return { found: false }
  Never return sensitive data (email, phone, etc.)

getOwnProfile() — requires school JWT
  Return own school's full profile data

updateOwnProfile() — requires school JWT (admin role only)
  Allow updating: name, phone, address, logo_url, primary_color, secondary_color, website
  Cannot change: suffix, email, school_id, status

uploadLogo() — requires school JWT (admin role only)
  Store at: uploads/schools/{school_id}/logo/logo.{ext}
  Update schools.logo_url
```

---

### PHASE 8 — Per-School Dashboards (Dynamic Branding)

```
Update all existing dashboards to be dynamically branded per school.

═══════════════════════════════════════════════════════
REMOVE ALL HARDCODED GRACELAND REFERENCES
═══════════════════════════════════════════════════════

Search codebase for all occurrences of:
  "Graceland"
  "Graceland Royal Academy"
  "gracelandroyalacademy.com.ng"
  school-logo.jpg (hardcoded import)
  "#0A2540" (Graceland's primary color — replace with CSS var)
  "#FFD700" (Graceland's secondary color — replace with CSS var)

For each occurrence, replace with dynamic equivalent:
  School name    → {currentUser.school_name} from SchoolContext
  School logo    → {currentUser.school_logo_url} (fallback: placeholder)
  Colors         → var(--primary-color) and var(--secondary-color)
  Domain         → remove hardcoded domain references

═══════════════════════════════════════════════════════
UPDATE src/components/DashboardSidebar.tsx
═══════════════════════════════════════════════════════
  School logo: <img src={schoolLogo || placeholderLogo} />
  School name: <h3>{schoolName}</h3>
  Identity display: Logged in as: {currentUser.full_identity} (e.g. michael@joy)

═══════════════════════════════════════════════════════
UPDATE src/components/DashboardTopBar.tsx
═══════════════════════════════════════════════════════
  Show school name dynamically
  Show user's full identity (username@suffix)
  Profile menu: show role badge

═══════════════════════════════════════════════════════
UPDATE src/components/admin/SystemSettingsPage.tsx
═══════════════════════════════════════════════════════
  Add section: "School Branding"
    Logo upload
    Primary color picker
    Secondary color picker
    Preview (shows sidebar with new colors)
  These settings call: PUT /api/schools/profile

═══════════════════════════════════════════════════════
CSS VARIABLES (src/index.css)
═══════════════════════════════════════════════════════
Add default values:
  :root {
    --primary-color: #1E3A5F;   /* SMugFlex default — overridden on login */
    --secondary-color: #F4A300; /* SMugFlex default — overridden on login */
  }

Applied dynamically on login:
  document.documentElement.style.setProperty('--primary-color', school_primary_color);
  document.documentElement.style.setProperty('--secondary-color', school_secondary_color);

Replace all Tailwind hardcoded color classes that reference Graceland colors
with CSS variable equivalents using style prop or a dynamic className utility.
```

---

### PHASE 9 — Tenant Context & State

```
Update SchoolContext.tsx for multi-tenancy in SMugFlex.

═══════════════════════════════════════════════════════
TARGETED CHANGES (do not rewrite the 9,158 lines)
═══════════════════════════════════════════════════════

CHANGE 1 — Update CurrentUser interface:
  Add these fields:
    school_id:           number;
    school_name:         string;
    school_suffix:       string;
    full_identity:       string;   // e.g. "michael@joy"
    school_logo_url?:    string;
    school_primary_color?:   string;
    school_secondary_color?: string;
    must_change_password?:   boolean;

CHANGE 2 — On login success:
  Store school branding in state AND localStorage.
  Apply CSS variables immediately:
    document.documentElement.style.setProperty('--primary-color', res.school_primary_color || '#1E3A5F');
    document.documentElement.style.setProperty('--secondary-color', res.school_secondary_color || '#F4A300');

CHANGE 3 — On app init (useEffect on mount):
  If JWT exists in localStorage:
    Decode it → extract school_id, school_suffix, school_name
    Restore CSS variables from localStorage (fast, no API call needed)
    Optionally: fetch /api/schools/profile to refresh branding

CHANGE 4 — Update all API calls:
  In api.ts, the request builder already sends Authorization: Bearer {token}.
  Add a header: X-School-ID: {school_id} (defense-in-depth).
  This header is CHECKED by TenantMiddleware as a secondary verification.
  If X-School-ID doesn't match JWT's school_id, log anomaly and reject.

CHANGE 5 — Handle must_change_password:
  If the API response contains must_change_password: true,
  force-redirect to ChangePasswordPage.tsx immediately after login.
  The user cannot navigate away until password is changed.

CHANGE 6 — Handle school inactive error:
  If any API call returns HTTP 403 with code 'SCHOOL_INACTIVE',
  log out the user immediately and show:
  "Your school account has been deactivated. Please contact SMugFlex."
  Clear all cached data.

CHANGE 7 — Update API login call:
  BEFORE: { username, password, role }
  AFTER:  { identity, password, role }
  where identity = full_identity from the login form (e.g. "michael@joy")

CHANGE 8 — Create SuperAdminContext.tsx (separate):
  Does NOT extend or wrap SchoolContext.
  Stored at: src/contexts/SuperAdminContext.tsx
  State: superAdmin{id, username, first_name}, token, schools[], stats
  Methods: login, logout, listSchools, approveSchool, deactivateSchool,
           activateSchool, extendAccess, resetAdminPassword, checkSuffix,
           getPlatformStats, getSchoolDetails
```

---

### PHASE 10 — Security Hardening

```
Implement complete security for SMugFlex multi-tenant platform.

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 1 — Every DB query must be scoped
═══════════════════════════════════════════════════════
Write a PHP script (api/tools/verify_school_scoping.php) that:
  - Scans all PHP files in api/controllers/
  - Finds every SQL query string
  - Checks if it contains "school_id" (for SELECT/INSERT/UPDATE/DELETE)
  - Reports any query that modifies data without school_id scoping
  Run this as part of deployment verification.

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 2 — Suffix cannot be enumerated
═══════════════════════════════════════════════════════
The GET /api/schools/public-info?suffix= endpoint:
  - Rate limited: 10 requests per minute per IP
  - Returns ONLY: { found, active, name, logo, primary_color, secondary_color }
  - Never returns school_id, email, or user counts
  - If suffix not found: identical response time to found (use usleep to normalize)
    This prevents timing attacks to enumerate valid suffixes.

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 3 — Login endpoint
═══════════════════════════════════════════════════════
  - Rate limit: 5 failed attempts per identity per 15 minutes
  - After 5 failures: lock out for 15 minutes (return 429 with retry-after)
  - Always return the same error message regardless of failure reason
    (except school status messages which are intentional)
  - Log all failed attempts to security_logs with school_id, IP, user agent
  - Use constant-time comparison for tokens (hash_equals)

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 4 — Suffix assignment
═══════════════════════════════════════════════════════
  - Only Super Admin can assign/view suffixes
  - Suffix is NEVER returned in any school-user-facing API response
    (school users don't need to see their suffix via API — they already know it)
  - Suffix is only stored and used for routing — not displayed to other users
  - The suffix uniqueness check (check-suffix endpoint) is only callable
    by authenticated Super Admins

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 5 — File isolation
═══════════════════════════════════════════════════════
  Store ALL uploaded files under: uploads/schools/{school_id}/
  Never store at a flat path.
  File retrieval endpoint:
    GET /api/files/{file_id}
    Validates: file.school_id === JWT.school_id
    Returns 404 for any file not belonging to the requesting school.

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 6 — SSE stream isolation
═══════════════════════════════════════════════════════
  In RealtimeController::stream():
    $school_id = TenantMiddleware::resolveSchoolId($this->conn);
    // ONLY query events for this school:
    SELECT * FROM realtime_events WHERE school_id = :school_id AND id > :last_id
    // School A NEVER receives School B's real-time events

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 7 — must_change_password enforcement
═══════════════════════════════════════════════════════
  Add must_change_password BOOLEAN DEFAULT FALSE to users table.
  Set to TRUE when Super Admin resets admin password.
  On login: if must_change_password = TRUE:
    - Issue a RESTRICTED JWT with flag: must_change_password: true
    - This JWT only works on the change-password endpoint
    - All other endpoints return 403 with "Please change your password first"
  On password change: set must_change_password = FALSE, issue normal JWT.

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 8 — Super Admin JWT isolation
═══════════════════════════════════════════════════════
  Super Admin JWT uses SUPER_ADMIN_JWT_SECRET (different from JWT_SECRET)
  School endpoints call JWT::validateToken($headers, false) — rejects super admin JWT
  Super admin endpoints call JWT::validateToken($headers, true) — rejects school JWT
  A school user's token CANNOT access super admin endpoints even if role='admin'

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 9 — IDOR prevention
═══════════════════════════════════════════════════════
  Every controller method that takes a record ID as parameter must call:
    TenantMiddleware::assertOwnership($conn, $table, $record_id, $school_id)
  This prevents: "Change student_id=1 to student_id=50" attacks
  where student 50 belongs to a different school.
  Return 404 (not 403) to not reveal existence of other schools' records.

═══════════════════════════════════════════════════════
SECURITY REQUIREMENT 10 — HTTP Security Headers
═══════════════════════════════════════════════════════
Add to .htaccess:
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
```

---

### PHASE 11 — Deployment

```
Configure SMugFlex for production deployment.

═══════════════════════════════════════════════════════
STEP 1 — Environment Variables (.env)
═══════════════════════════════════════════════════════
See Section 10 of this README for the full .env specification.

═══════════════════════════════════════════════════════
STEP 2 — Apache (.htaccess updates)
═══════════════════════════════════════════════════════

Root .htaccess:
  RewriteEngine On
  # API requests → PHP
  RewriteRule ^api/(.*)$ api/index.php [QSA,L]
  # Everything else → React SPA
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]

API .htaccess (api/.htaccess):
  # Remove Graceland CORS — handled in PHP now
  # Block direct access to sensitive files
  <Files "*.php">
    Order Allow,Deny
    Allow from all
  </Files>
  <FilesMatch "(simple_login|jwt_test|jwt_diagnostic|test)\.php$">
    Order Deny,Allow
    Deny from all
  </FilesMatch>

═══════════════════════════════════════════════════════
STEP 3 — Remove debug files
═══════════════════════════════════════════════════════
Delete these files entirely:
  api/auth/simple_login.php      (was already disabled with 403, now delete)
  api/jwt_diagnostic.php
  api/jwt_test.php
  api/test.php
  api/test-promotions.php
  api/restore_first_term.php

═══════════════════════════════════════════════════════
STEP 4 — Upload directory structure
═══════════════════════════════════════════════════════
mkdir -p uploads/schools/
mkdir -p uploads/platform/
chmod 755 uploads/ -R
# Add .htaccess to uploads/ to prevent direct PHP execution:
echo "php_flag engine off" > uploads/.htaccess

For each approved school, directories are created automatically:
uploads/schools/{school_id}/logo/
uploads/schools/{school_id}/photos/students/
uploads/schools/{school_id}/photos/staff/
uploads/schools/{school_id}/documents/
uploads/schools/{school_id}/signatures/

═══════════════════════════════════════════════════════
STEP 5 — Run migrations
═══════════════════════════════════════════════════════
php api/migrate.php run 001_multitenancy.sql
php api/migrate.php run 002_add_must_change_password.sql
php api/migrate.php run 003_seed_plans.sql
php api/migrate.php run 004_seed_superadmin.sql

═══════════════════════════════════════════════════════
STEP 6 — Build frontend
═══════════════════════════════════════════════════════
npm install
npm run build
# Output goes to build/ — deploy to webroot

═══════════════════════════════════════════════════════
STEP 7 — Create first Super Admin
═══════════════════════════════════════════════════════
php api/tools/create_super_admin.php
  Prompts for: username, email, password
  Stores bcrypt hash in super_admins table
  Existing Graceland Royal Academy data preserved as school_id=1

═══════════════════════════════════════════════════════
STEP 8 — Post-deployment verification
═══════════════════════════════════════════════════════
1. Visit smugflex.com → SMugFlex landing page (NOT Graceland)
2. Visit smugflex.com/login → SMugFlex login (with @suffix field)
3. Visit smugflex.com/super-admin/login → Super Admin login
4. Log in as super admin → Approve a test school with suffix "test"
5. Log in as test school: admin@test → Force password change
6. Create a student in test school
7. Log in as another school → Confirm test school's student is invisible
8. Run: php api/tools/verify_school_scoping.php → All queries scoped ✓
```

---

## 5. File-by-File Change Manifest

### New Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/001_multitenancy.sql` | All schema changes |
| `database/migrations/002_add_must_change_password.sql` | must_change_password column |
| `database/migrations/003_seed_plans.sql` | Default plan records |
| `database/migrations/004_seed_superadmin.sql` | Initial super admin |
| `api/helpers/TenantMiddleware.php` | School ID resolution, ownership validation |
| `api/controllers/SuperAdminController.php` | Full super admin management |
| `api/controllers/TenantController.php` | School registration and profile |
| `api/tools/create_super_admin.php` | CLI tool to create super admin |
| `api/tools/verify_school_scoping.php` | Security audit tool |
| `src/components/platform/PlatformLandingPage.tsx` | SMugFlex marketing page |
| `src/components/platform/PlatformLoginPage.tsx` | Suffix-based login page |
| `src/components/platform/SchoolRegistrationPage.tsx` | School sign-up form |
| `src/components/super-admin/SuperAdminLayout.tsx` | Super admin shell |
| `src/components/super-admin/SuperAdminLoginPage.tsx` | Super admin login |
| `src/components/super-admin/PlatformOverviewPage.tsx` | Platform stats |
| `src/components/super-admin/PendingRegistrationsPage.tsx` | Approval queue |
| `src/components/super-admin/SchoolApprovalModal.tsx` | Approve + assign suffix |
| `src/components/super-admin/AllSchoolsPage.tsx` | Schools table |
| `src/components/super-admin/SchoolDetailPage.tsx` | School deep-dive |
| `src/components/super-admin/ActivityLogPage.tsx` | Platform audit log |
| `src/components/SuperAdminProtectedRoute.tsx` | Guard for super admin routes |
| `src/contexts/SuperAdminContext.tsx` | Super admin state |
| `src/hooks/useSchoolBranding.ts` | Dynamic branding hook |

### Files to Modify

| File | Changes |
|------|---------|
| `api/config/database.php` | Remove hardcoded school name/settings |
| `api/helpers/JWT.php` | Add school_id to payload, support super admin JWT |
| `api/helpers/Middleware.php` | Add requireSchoolContext, requireSuperAdmin |
| `api/helpers/RateLimiter.php` | Include identity (not just username) in rate limit key |
| `api/index.php` | Dynamic CORS, new routes, remove Graceland whitelist |
| `api/controllers/AuthController.php` | Suffix-based login (identity@suffix) |
| `api/controllers/StudentController.php` | + school_id on all queries |
| `api/controllers/TeacherController.php` | + school_id on all queries |
| `api/controllers/ClassController.php` | + school_id on all queries |
| `api/controllers/SubjectController.php` | + school_id on all queries |
| `api/controllers/ResultsController.php` | + school_id on all queries |
| `api/controllers/PaymentController.php` | + school_id on all queries |
| `api/controllers/InvoiceController.php` | + school_id on all queries |
| `api/controllers/ParentController.php` | + school_id on all queries |
| `api/controllers/ReportController.php` | + school_id on all queries |
| `api/controllers/AttendanceController.php` | + school_id on all queries |
| `api/controllers/NotificationController.php` | + school_id, SSE scoped |
| `api/controllers/AssignmentController.php` | + school_id on all queries |
| `api/controllers/FileController.php` | Scoped file paths |
| `api/controllers/UserController.php` | Validate no "@" in username |
| `api/controllers/ProgressionController.php` | + school_id on all queries |
| `api/controllers/RealtimeController.php` | SSE stream scoped to school_id |
| `api/controllers/CbtController.php` | + school_id on all queries |
| `api/school_settings.php` | + school_id scoping |
| `api/academic_years.php` | + school_id scoping |
| `api/signature_settings.php` | + school_id scoping |
| `api/subject_registrations.php` | + school_id scoping |
| `api/teachers.php` | + school_id scoping |
| `api/upload-student-photo.php` | Scoped file path |
| `src/App.tsx` | New routes, remove old routes |
| `src/contexts/SchoolContext.tsx` | school_id/branding in state, identity-based login |
| `src/config/api.ts` | Remove hardcoded domain, add X-School-ID header |
| `src/components/ProtectedRoute.tsx` | Check school_id in token |
| `src/components/DashboardSidebar.tsx` | Dynamic school name, logo, show full_identity |
| `src/components/DashboardTopBar.tsx` | Dynamic school name |
| `src/components/admin/SystemSettingsPage.tsx` | Add branding settings section |
| `src/components/admin/UserManagementPage.tsx` | No "@" in username creation |
| `src/index.css` | CSS variable defaults for colors |
| `vite.config.ts` | Update base path |
| `.htaccess` | New routing rules, security headers |

### Files to DELETE

| File | Reason |
|------|--------|
| `api/auth/simple_login.php` | Already disabled; delete entirely |
| `api/jwt_diagnostic.php` | Debug endpoint — security risk |
| `api/jwt_test.php` | Debug endpoint — security risk |
| `api/test.php` | Test endpoint — security risk |
| `api/test-promotions.php` | Test endpoint — security risk |
| `api/restore_first_term.php` | One-time script — no longer needed |
| `src/components/LandingPage.tsx` | Replaced by PlatformLandingPage.tsx |
| `src/components/LoginPage.tsx` | Replaced by PlatformLoginPage.tsx |

---

## 6. Full Database Schema Additions

```sql
-- ============================================================
-- SMugFlex Multi-Tenancy Schema
-- Migration: 001_multitenancy.sql
-- ============================================================

-- 1. SCHOOLS TABLE
CREATE TABLE IF NOT EXISTS `schools` (
  `id`                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                    VARCHAR(255) NOT NULL,
  `suffix`                  VARCHAR(20) NULL UNIQUE
    COMMENT 'Assigned by Super Admin. e.g. "joy". Used as @suffix in logins.',
  `email`                   VARCHAR(255) NOT NULL UNIQUE,
  `phone`                   VARCHAR(30),
  `address`                 TEXT,
  `city`                    VARCHAR(100),
  `state`                   VARCHAR(100),
  `country`                 VARCHAR(100) DEFAULT 'Nigeria',
  `school_type`             ENUM('Primary','Secondary','Combined','Tertiary') DEFAULT 'Secondary',
  `logo_url`                VARCHAR(500),
  `primary_color`           VARCHAR(7) DEFAULT '#1E3A5F',
  `secondary_color`         VARCHAR(7) DEFAULT '#F4A300',
  `website`                 VARCHAR(255),
  `plan`                    ENUM('trial','basic','standard','premium') DEFAULT 'trial'
    COMMENT 'Informational only. Super Admin sets manually. No automation.',
  `status`                  ENUM('pending','active','inactive','suspended','rejected')
                            DEFAULT 'pending',
  `access_until`            DATETIME NULL
    COMMENT 'If set and past, logins blocked. Super Admin extends this to renew access.',
  `suffix_locked`           BOOLEAN DEFAULT FALSE
    COMMENT 'TRUE after first user login. Suffix cannot be changed once locked.',
  `admin_credentials_shown` BOOLEAN DEFAULT FALSE
    COMMENT 'TRUE after Super Admin views initial credentials. Cannot retrieve again.',
  `rejection_reason`        TEXT NULL,
  `deactivation_reason`     TEXT NULL,
  `approved_by`             INT UNSIGNED NULL,
  `approved_at`             DATETIME NULL,
  `deactivated_by`          INT UNSIGNED NULL,
  `deactivated_at`          DATETIME NULL,
  `created_at`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_suffix` (`suffix`),
  KEY `idx_status` (`status`),
  KEY `idx_access_until` (`access_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SUPER ADMINS TABLE
CREATE TABLE IF NOT EXISTS `super_admins` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(100) NOT NULL UNIQUE,
  `email`           VARCHAR(255) NOT NULL UNIQUE,
  `password_hash`   VARCHAR(255) NOT NULL,
  `first_name`      VARCHAR(100),
  `last_name`       VARCHAR(100),
  `status`          ENUM('active','inactive') DEFAULT 'active',
  `last_login`      DATETIME,
  `last_login_ip`   VARCHAR(45),
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. PLATFORM ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS `platform_activity_logs` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `super_admin_id`  INT UNSIGNED NOT NULL,
  `action`          VARCHAR(100) NOT NULL,
  `school_id`       INT UNSIGNED,
  `school_name`     VARCHAR(255),
  `details`         JSON,
  `ip_address`      VARCHAR(45),
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_super_admin` (`super_admin_id`),
  KEY `idx_school` (`school_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. PLANS TABLE (informational only)
CREATE TABLE IF NOT EXISTS `school_plans` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`          ENUM('trial','basic','standard','premium') NOT NULL UNIQUE,
  `display_name`  VARCHAR(100) NOT NULL,
  `description`   TEXT,
  `max_students`  INT DEFAULT NULL COMMENT 'NULL = unlimited',
  `max_teachers`  INT DEFAULT NULL COMMENT 'NULL = unlimited',
  `trial_days`    INT DEFAULT 90,
  `notes`         TEXT,
  `is_active`     BOOLEAN DEFAULT TRUE,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. MIGRATION TRACKER
CREATE TABLE IF NOT EXISTS `migrations` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `filename`     VARCHAR(255) NOT NULL UNIQUE,
  `executed_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Migration: 002_add_must_change_password.sql
-- ============================================================
ALTER TABLE `users`
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'TRUE = user must change password on next login'
  AFTER `status`;

-- ============================================================
-- ADD school_id TO ALL 65 EXISTING TABLES
-- (Abbreviated — full script has all 65)
-- ============================================================
ALTER TABLE `users`
  ADD COLUMN `school_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`,
  ADD KEY `idx_school_id` (`school_id`),
  ADD CONSTRAINT `fk_users_school` 
    FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE;

ALTER TABLE `students`
  ADD COLUMN `school_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`,
  ADD KEY `idx_school_id` (`school_id`),
  ADD CONSTRAINT `fk_students_school`
    FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE;

-- Repeat pattern for all 65 tables...

-- ============================================================
-- Seed: 003_seed_plans.sql
-- ============================================================
INSERT INTO school_plans (name, display_name, description, trial_days) VALUES
  ('trial',   'Free Trial',  'One academic term free. Full access to all features. No payment required.', 90),
  ('basic',   'Basic',       'For small schools up to 200 students.', 0),
  ('standard','Standard',    'For medium schools up to 500 students.', 0),
  ('premium', 'Premium',     'Unlimited students and teachers.', 0);

-- Seed Graceland as school_id=1
INSERT INTO schools
  (id, name, suffix, email, plan, status, access_until, suffix_locked, admin_credentials_shown)
VALUES
  (1, 'Graceland Royal Academy', 'gra',
   'info@gracelandroyalacademy.com.ng',
   'trial', 'active',
   DATE_ADD(NOW(), INTERVAL 90 DAY),
   TRUE, TRUE);

-- Set all existing records to school_id=1
UPDATE users SET school_id=1 WHERE school_id IS NULL OR school_id=0;
UPDATE students SET school_id=1 WHERE school_id IS NULL OR school_id=0;
-- ... repeat for all 65 tables

-- Then remove DEFAULT 1 from all columns:
ALTER TABLE users ALTER COLUMN school_id DROP DEFAULT;
-- ... repeat for all 65 tables
```

---

## 7. New API Endpoints

### Public Endpoints (No Authentication)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/schools/register` | Submit school registration request |
| GET | `/api/schools/public-info?suffix={suffix}` | Get school branding by suffix (for login page) |
| GET | `/api/health` | Platform health check |

### School Endpoints (School JWT Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schools/profile` | Get own school profile |
| PUT | `/api/schools/profile` | Update school profile (admin only) |
| POST | `/api/schools/upload-logo` | Upload school logo (admin only) |

### Super Admin Endpoints (Super Admin JWT Required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/super-admin/auth/login` | Super admin login |
| GET | `/api/super-admin/schools` | List all schools with filters |
| GET | `/api/super-admin/schools/{id}` | Full school details + stats |
| GET | `/api/super-admin/schools/pending` | Pending registrations only |
| POST | `/api/super-admin/schools/{id}/approve` | Approve + assign suffix |
| POST | `/api/super-admin/schools/{id}/reject` | Reject registration |
| POST | `/api/super-admin/schools/{id}/deactivate` | Deactivate school |
| POST | `/api/super-admin/schools/{id}/activate` | Activate school |
| POST | `/api/super-admin/schools/{id}/suspend` | Suspend school |
| POST | `/api/super-admin/schools/{id}/extend-access` | Extend access_until date |
| POST | `/api/super-admin/schools/{id}/set-plan` | Set informational plan |
| POST | `/api/super-admin/schools/{id}/reset-admin-password` | Reset school admin password |
| GET | `/api/super-admin/schools/{id}/credentials` | Get initial credentials (once only) |
| GET | `/api/super-admin/check-suffix?suffix={suffix}` | Check suffix availability |
| GET | `/api/super-admin/stats` | Platform-wide statistics |
| GET | `/api/super-admin/activity-logs` | Super admin audit trail |

---

## 8. Security Specification

### The Suffix Identity Security Model

```
THREAT: Can a user in School A access School B's data?

LAYER 1 — IDENTITY PARSE:
  User must know a valid suffix to log in.
  Even knowing a suffix tells you nothing — you still need a valid username
  and password for a user in THAT school.
  "Guessing" suffixes: rate-limited endpoint, timing-normalized response.

LAYER 2 — DATABASE QUERY:
  WHERE username = 'michael' AND school_id = 7 AND status = 'Active'
  Even if 'michael' exists in School B (school_id=12), the school_id=7 
  constraint means School B's michael is invisible here.

LAYER 3 — JWT PAYLOAD:
  JWT contains school_id=7 (Signed, tamper-proof with HS256).
  If someone forges school_id=12 in the token, the signature breaks.

LAYER 4 — MIDDLEWARE CHECK:
  TenantMiddleware::resolveSchoolId() re-validates school status on every request.
  Not just at login — on EVERY API call.

LAYER 5 — EVERY QUERY SCOPED:
  Every SELECT, INSERT, UPDATE, DELETE adds AND school_id = :school_id.
  Even if layers 1-4 somehow fail, the data layer returns empty/nothing.

LAYER 6 — IDOR PROTECTION:
  TenantMiddleware::assertOwnership() verifies every record by ID.
  Can't fetch student ID=50 if student 50 belongs to school_id=12.
  Returns 404 (not 403) — doesn't confirm record exists.

SUMMARY: 6 independent layers. All 6 must fail simultaneously for a breach.
That is not possible without access to the JWT_SECRET.
```

### Activation/Deactivation Security

| Scenario | System Response |
|----------|----------------|
| School deactivated by Super Admin | Login returns HTTP 403 "Account inactive" |
| School access_until in the past | Login returns HTTP 403 "Access period ended" |
| Token issued before deactivation | Next API request re-checks school status → 403 |
| School reactivated | Login works immediately — no token re-issuance needed |
| Suffix assigned to school | Immediately available for login |
| Suffix changed (before lock) | Old suffix stops working immediately |
| Suffix locked (after first login) | Cannot be changed — user identities depend on it |

---

## 9. Suffix Identity Reference

### Suffix Assignment Guidelines for Super Admin

| School Name | Suggested Suffix | Notes |
|-------------|-----------------|-------|
| Joy Academy | `joy` | Short, clear |
| Greenwood International School | `greenwood` | Distinctive |
| NNPC Staff School | `nnpc` | Organization acronym |
| Stars Academy Abuja | `stars` | or `starsabj` if `stars` taken |
| Our Lady of Fatima | `fatima` | Key word |
| King David College | `kdcollege` | or `kingdavid` |
| School with generic name (e.g. "Excellence Academy") | `excellence24` | Add year if common |

### What Users See

```
User logs in at:     smugflex.com/login
They type:           michael@joy
                     ──────┬───  ─┬─
                           │       └ suffix (school identifier)
                           └─────── username (within school)
Password:            ••••••••••

Role:                Teacher ▼

[Login →]
```

### Where Suffix Appears in the UI

| Location | Appearance |
|----------|-----------|
| Login page identity field | Typed as part of identity |
| Dashboard topbar/sidebar | "Logged in as: michael@joy" |
| User profile page | "Your identity: michael@joy" |
| Password reset info | "Your identity is username@suffix" |
| NOT in: | School admin's user list (shows username only, suffix is school-wide) |
| NOT in: | Student/result records (school_id handles isolation, suffix not needed) |

---

## 10. Environment Variables

```bash
# ──────────────── PLATFORM ────────────────
APP_NAME=SMugFlex
APP_ENV=production
APP_DEBUG=false
APP_URL=https://smugflex.com
APP_TIMEZONE=Africa/Lagos

# ──────────────── DATABASE ────────────────
DB_HOST=localhost
DB_NAME=smugflex_platform
DB_USER=smugflex_db_user
DB_PASS=CHANGE_THIS_TO_STRONG_PASSWORD

# ──────────────── JWT SECRETS ────────────────
# School users JWT (min 64 characters — generate: openssl rand -hex 64)
JWT_SECRET=GENERATE_A_RANDOM_64_CHAR_SECRET_FOR_SCHOOL_USERS
JWT_EXPIRY=86400

# Super Admin JWT — MUST be different from JWT_SECRET
SUPER_ADMIN_JWT_SECRET=GENERATE_A_DIFFERENT_RANDOM_64_CHAR_SECRET_FOR_SUPER_ADMIN

# ──────────────── FILE UPLOADS ────────────────
UPLOAD_PATH=../uploads/
MAX_UPLOAD_SIZE=10485760

# ──────────────── SCHOOL FEE PAYSTACK ────────────────
# This is for school fee collection (students paying school fees)
# NOT for SMugFlex subscriptions (those are handled offline)
# Each school can configure their own Paystack key in school_settings
# This is a platform-level fallback if needed
PAYSTACK_PUBLIC_KEY_DEFAULT=pk_live_your_key
PAYSTACK_SECRET_KEY_DEFAULT=sk_live_your_key

# ──────────────── EMAIL (for registration notifications) ────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=noreply@smugflex.com
MAIL_PASSWORD=your_email_app_password
MAIL_FROM_ADDRESS=noreply@smugflex.com
MAIL_FROM_NAME=SMugFlex

# ──────────────── CORS ────────────────
CORS_ORIGINS=https://smugflex.com,http://localhost:5173,http://localhost:3000

# ──────────────── TRIAL ────────────────
TRIAL_DURATION_DAYS=90
```

---

## 11. Testing Checklist

### ✅ Multi-Tenancy Isolation Tests (MUST ALL PASS)

```
□ Register School A → suffix "alpha" | Register School B → suffix "beta"
□ School A admin logs in as: admin@alpha → success
□ School B admin logs in as: admin@beta  → success
□ Create student "Ade" in School A
□ Log in as School A teacher → Ade appears in student list
□ Log in as School B teacher → Ade does NOT appear
□ Attempt to access School A's student ID directly via School B's JWT → 404
□ Log in as admin@alpha, then attempt to call super admin endpoint → 403
□ Log in as super admin, attempt to use token on school endpoint → 403
□ Deactivate School A via Super Admin → admin@alpha login blocked immediately
□ School A teacher (already logged in) makes API request → 403 school inactive
□ Reactivate School A → admin@alpha can log in again immediately
□ Set access_until to past date → login blocked with "access period ended"
□ Extend access_until to future → login works immediately
□ Create user "teacher1" in School A AND School B
□ teacher1@alpha and teacher1@beta are different accounts
□ teacher1@alpha password change does NOT affect teacher1@beta
□ Upload a document in School A → cannot be accessed by School B user
□ School A SSE stream → no events from School B appear
□ Super Admin resets School A admin password → 
    - Must-change-password is enforced
    - admin@alpha can ONLY access change-password until password is changed
□ Suffix "alpha" check via public endpoint → rate limited after 10 requests/min
□ Login with wrong suffix: michael@wrongsuffix → "Invalid credentials" (generic)
□ Login with wrong password: michael@alpha → "Invalid credentials" (generic)
```

### ✅ Suffix System Tests

```
□ Suffix format validation: "ab" ✓ | "a" ✗ | "AB" ✗ | "ab cd" ✗ | "ab@cd" ✗
□ Suffix uniqueness: assigning same suffix to two schools → second fails
□ Suffix lock: after admin@joy first login → suffix cannot be changed
□ Suffix lock: before first login → Super Admin can change suffix
□ Username with "@": creating user "michael@extra" → blocked
□ Login page smart detection: type "@joy" → shows "Joy Academy" banner
□ Login page smart detection: type "@unknown" → shows "not recognized"
□ Full identity displayed in sidebar: "michael@joy" ✓
```

### ✅ Super Admin Control Tests

```
□ Super Admin can approve pending school + assign suffix
□ Initial credentials shown ONCE — cannot retrieve again
□ Super Admin can deactivate school → all logins blocked
□ Super Admin can activate school → all logins restored
□ Super Admin can see all schools' stats
□ Super Admin cannot see individual school data (no impersonation of user data)
□ All Super Admin actions logged in platform_activity_logs
□ Super Admin login uses separate JWT secret
□ Super Admin JWT rejected on school endpoints
□ School JWT rejected on super admin endpoints
```

### ✅ Landing Page & Login Tests

```
□ / → SMugFlex platform landing (NO Graceland content)
□ /login → SMugFlex login with identity@suffix field
□ /register → School registration form
□ /super-admin/login → Super admin login (NOT school login)
□ No hardcoded "Graceland Royal Academy" text anywhere on public pages
□ Login with school that has custom colors → colors applied to dashboard
□ School logo shown in dashboard after login
```

---

## 12. Deployment Guide

### Production Deployment Checklist

```bash
# 1. Clone and install
git clone https://github.com/smugflexventures-web/Graceland-G.git smugflex
cd smugflex
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set all values, especially JWT secrets

# 3. Generate secure JWT secrets
openssl rand -hex 64   # Use output as JWT_SECRET
openssl rand -hex 64   # Use a DIFFERENT output as SUPER_ADMIN_JWT_SECRET

# 4. Run database migrations
php api/migrate.php run 001_multitenancy.sql
php api/migrate.php run 002_add_must_change_password.sql
php api/migrate.php run 003_seed_plans.sql
php api/migrate.php run 004_seed_superadmin.sql

# 5. Create super admin account
php api/tools/create_super_admin.php
# (Prompts for username, email, password)

# 6. Create upload directories
mkdir -p uploads/schools
mkdir -p uploads/platform
echo "php_flag engine off" > uploads/.htaccess
chmod 755 uploads/ -R

# 7. Build frontend
npm run build

# 8. Deploy to webroot
cp -r build/* /var/www/smugflex/public_html/
cp -r api/ /var/www/smugflex/public_html/api/
cp .env /var/www/smugflex/public_html/api/.env

# 9. Run security verification
php api/tools/verify_school_scoping.php

# 10. Verify deployment
curl https://smugflex.com/api/health
# Expected: { "status": "ok", "platform": "SMugFlex", "version": "2.0.0" }
```

### Onboarding First School After Deployment

```
1. Super Admin logs in at smugflex.com/super-admin/login
2. Navigate to "Pending Registrations"
3. Either: 
   - Wait for a school to submit registration at smugflex.com/register
   - OR manually create a school via API for Graceland (already seeded as school_id=1)

4. For each approved school:
   a. Click "Review & Approve"
   b. Type the suffix (e.g. "gra" for Graceland)
   c. Set access_until (e.g. end of current term)
   d. Click "Approve & Create Admin Account"
   e. SAVE the credentials shown (admin@gra / temp_password_shown_once)
   f. Share credentials with school contact securely

5. School Admin logs in at smugflex.com/login
   Identity: admin@gra
   Password: [temp password from step e]
   Role: School Admin
   → Immediately forced to change password
   → Dashboard loads with school's data
```

---

*SMugFlex Multi-School Platform — Conversion Guide v2.0.0*
*Based on analysis of: smugflexventures-web/Graceland-G*
*© 2026 SMugFlex Ventures*
