# SMugFlex 2.0 — Multi-School Management Platform

A full-stack multi-tenant school management platform. The platform streamlines academic, financial, and administrative operations across five user roles: **Admin**, **Teacher**, **Accountant**, **Parent**, and **Student**.

**Live:** Configure per deployment

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Request Lifecycle](#request-lifecycle-end-to-end)
- [Key Architectural Patterns](#key-architectural-patterns)
- [User Roles & Permissions](#user-roles--permissions)
- [Complete Workflows](#complete-workflows)
  - [Authentication & Access](#1-authentication--access)
  - [Student Lifecycle Management](#2-student-lifecycle-management)
  - [Class & Subject Management](#3-class--subject-management)
  - [Teacher Assignment & Management](#4-teacher-assignment--management)
  - [Score Entry & Results Workflow](#5-score-entry--results-workflow)
  - [Result Compilation & Report Cards](#6-result-compilation--report-cards)
  - [Fee Management & Payment Processing](#7-fee-management--payment-processing)
  - [Attendance Tracking](#8-attendance-tracking)
  - [Promotion & Progression System](#9-promotion--progression-system)
  - [Communication & Notifications](#10-communication--notifications)
  - [Assignment Management](#11-assignment-management)
  - [Timetable Management](#12-timetable-management)
  - [System Administration](#13-system-administration)
- [Complete Permission Matrix](#complete-permission-matrix)
- [Project Structure](#project-structure)
- [Database Schema Overview](#database-schema-overview)
- [CBT (Computer-Based Testing) Module](#cbt-computer-based-testing-module)
- [Security](#security)
- [Getting Started](#getting-started)
- [API Overview](#api-overview)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology | Usage |
|-------|-----------|-------|
| **Frontend** | React 18, TypeScript 5.9, Vite 6, SWC | SPA with lazy-loaded role-based dashboards |
| **Routing** | React Router DOM v6 | 7 routes: public landing, login, 5 role dashboards |
| **Styling** | Tailwind CSS v4, Radix UI primitives (~25 components), Lucide icons | shadcn/ui pattern with `cn()` utility |
| **Charts** | Recharts | Dashboard analytics, fee collection, attendance trends |
| **PDF** | jsPDF + jsPDF-AutoTable + html2canvas | Report cards, cumulative results, broadsheets |
| **Payments** | Paystack inline.js | Online fee payment (card, USSD, bank transfer) |
| **State** | React Context (monolithic ~9,158 lines) | Single `SchoolContext` provider with ~200 methods |
| **Real-time** | Server-Sent Events (SSE) + 15s polling fallback | Live notification delivery, score updates |
| **Backend** | PHP 8.x, custom MVC (no framework) | Front controller `index.php` → switch-based routing |
| **Database** | MySQL / MariaDB 11.4 | 65 tables + 5 views, utf8mb4, JSON columns, generated columns |
| **Auth** | Custom JWT (HS256) with bcrypt | Stateless auth, 24h expiry, 48h refresh grace period |
| **Deployment** | Apache + Vite build output | `.htaccess` rewrites, CSP headers, gzip |

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                             │
│  React 18 + TypeScript + Vite + SWC                            │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────────┐  │
│  │  Admin   │ │  Teacher │ │ Accountant │ │ Parent/Student │  │
│  │ Dashboard│ │ Dashboard│ │  Dashboard │ │   Dashboard    │  │
│  └──────────┘ └──────────┘ └────────────┘ └────────────────┘  │
│         │            │              │              │           │
│    ┌────┴────────────┴──────────────┴──────────────┴────┐      │
│    │          SchoolContext (Global State)               │      │
│    │  ~200 methods, 20+ entity arrays, 9,158 lines       │      │
│    └────────────────┬────────────────────────────────────┘      │
│                     │                                           │
│              ┌──────┴──────┐                                    │
│              │ ApiService  │  ← authService.ts                 │
│              │ (fetch +    │  ← sqlDatabase.ts (offline cache) │
│              │  retry +    │  ← tokenManager.ts                │
│              │  auto-refresh)│                                 │
│              └──────┬──────┘                                    │
└─────────────────────┼──────────────────────────────────────────┘
                      │ JWT Bearer Token
┌─────────────────────┼──────────────────────────────────────────┐
│                     │                                           │
│              ┌──────┴──────┐                                    │
│              │ api/index.php (Front Controller, 822 lines)     │
│              └──────┬──────┘                                    │
│                     │                                           │
│      ┌──────────────┼──────────────┐                            │
│      ▼              ▼              ▼                             │
│  Middleware     Controllers    Helpers                           │
│  ─────────     ───────────    ────────                           │
│  • requireAuth()   • Student    • Response.php (13 methods)     │
│  • requireRole()   • Teacher    • JWT.php (HS256)              │
│  • requireAnyRole() • Class     • RateLimiter.php              │
│  • sanitizeString() • Subject   • Logger.php                   │
│  • validateInt()   • Results    • DatabaseTransaction.php      │
│  • paginate()      • Payments   • RealtimeEvents.php           │
│                    • Attendance  • Middleware.php               │
│                    • Auth (389L)                                │
│                    • Parent (CRUD + link/unlink children)       │
│                    • Notification (CRUD + broadcast)            │
│                    • Assignment (CRUD + submit + grade)         │
│                    • Progression (rules + validation)           │
│                    • Invoice (auto-generate)                    │
│                    • Report (PDF generation)                    │
│                    • File (upload + management)                 │
│                    • User (CRUD + password reset)               │
│                    • CBT (exams/questions/attempts/scoring)     │
│                    • Realtime (SSE streaming)                   │
│                    • CbtController (full online exam engine)   │
│                      │                                          │
│              ┌───────┴────────┐                                 │
│              │  MySQL/MariaDB │                                  │
│              │  65 tables     │                                  │
│              │  5 views       │                                  │
│              └────────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle (End-to-End)

```
┌──────────────────────────────────────────────────────────────────┐
│              1. PAGE LOAD                                        │
│                                                                  │
│  Browser → GET / → Apache .htaccess rewrites → index.html       │
│  → main.tsx boots React → SchoolProvider → BrowserRouter        │
│  → App.tsx renders Landing page / Login / Dashboard             │
│                                                                  │
│  On login page:                                                  │
│    ↓  User selects role, enters username + password              │
│    ↓                                                             │
│  LoginPage → SchoolContext.login(username, password, role)       │
└──────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────┐
│              2. API REQUEST (Frontend → Backend)                  │
│                                                                  │
│  SchoolContext.login() → fetch() directly (login)                │
│    OR                                                            │
│  Component → SchoolContext.method() → api.get/post/put/delete()  │
│    → ApiService.request()                                        │
│       ├─ Build URL from API_CONFIG.BASE_URL + endpoint           │
│       ├─ Attach JWT Bearer token from localStorage               │
│       ├─ Set Cache-Control: no-cache (for GET/HEAD)              │
│       ├─ Adaptive timeout (30s normal, 60s on slow connection)   │
│       ├─ Retry: up to 3 attempts for idempotent GET/HEAD         │
│       └─ Execute fetch() with AbortController                    │
└──────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────┐
│              3. PHP BACKEND ROUTING                               │
│                                                                  │
│  Apache rewrites /api/* → api/index.php (Front Controller)       │
│    ├─ CORS headers (whitelist-based origins)                     │
│    ├─ Content-Type: application/json                             │
│    ├─ Parse URL path → switch-based route → controller method    │
│    │  e.g., /students/42 → StudentController.getStudentById(42)  │
│    └─ Wrap all in try/catch → Response::serverError()            │
│                                                                  │
│  Each controller:                                                │
│    ├─ new Database() → PDO connection (utf8mb4, prepared stmts)  │
│    ├─ Middleware::requireAuth() → JWT::validateToken()           │
│    │   └─ Checks: Authorization header, signature, expiry, role  │
│    ├─ Input validation (sanitizeString, validateEnum, etc.)      │
│    ├─ Business logic + SQL queries (parameterized)               │
│    ├─ Activity logging to activity_logs table                    │
│    ├─ RealtimeEvents::publish() for SSE updates                  │
│    └─ Response::success() / error() / notFound() etc.            │
└──────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────┐
│              4. DATABASE LAYER                                    │
│                                                                  │
│  Database class (config/database.php):                           │
│    ├─ Loads .env from 5 possible locations (cascading search)    │
│    ├─ Connects via PDO (ERRMODE_EXCEPTION, FETCH_ASSOC)          │
│    └─ Config class: JWT secret, upload paths, CORS, timezone    │
│                                                                  │
│  Auto schema migration (in ResultsController, PaymentController):│
│    ├─ CREATE TABLE IF NOT EXISTS for new tables                  │
│    ├─ ALTER TABLE ADD COLUMN IF NOT EXISTS for schema changes    │
│    ├─ Uses SHOW COLUMNS FROM / SHOW INDEX FROM for detection    │
│    └─ Uses INFORMATION_SCHEMA for column/index introspection     │
└──────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────┐
│              5. RESPONSE (Backend → Frontend)                     │
│                                                                  │
│  Response::json() → { success, status, message, data, timestamp }│
│    ├─ CORS headers re-applied                                    │
│    ├─ HTTP status code set                                       │
│    └─ JSON payload encoded                                       │
│                                                                  │
│  ApiService receives response:                                   │
│    ├─ If 401 → auto-refresh token via POST /auth/refresh-token   │
│    │  → retry original request with new token                    │
│    ├─ If server error (5xx) + idempotent → retry w/ backoff      │
│    ├─ If network error → retry w/ exponential backoff (1/2/4s)  │
│    └─ If success → return parsed JSON to component               │
└──────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────┐
│              6. STATE UPDATE (Frontend)                           │
│                                                                  │
│  SchoolContext processes response:                                │
│    ├─ Maps snake_case DB fields → camelCase for React            │
│    │  (handles both naming conventions for backward compat)      │
│    ├─ Deduplicates by ID (Map<number, T>)                        │
│    ├─ Updates state array → triggers re-render                   │
│    └─ Caches with rate limiting (2s cooldown, term/year key)     │
│                                                                  │
│  Component receives updated data via useSchool() hook            │
│    └─ UI re-renders with new data                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Patterns

### Auto Schema Migration
Several backend controllers **auto-create tables and columns** on construction — no manual migration scripts required:
- `ResultsController` → Creates `compiled_results` table + approval columns on `scores` table
- `PaymentController` → Adds `invoice_id`, reversal tracking columns, unique indexes on `payments` table
- Uses `SHOW COLUMNS FROM`, `SHOW INDEX FROM`, and `INFORMATION_SCHEMA` to check existence before altering
- Only one explicit migration file: `api/migrations/003_question_extensions.sql` (adds passage/image/section columns to CBT tables)

### Dual Field Naming Convention
The system handles both **snake_case** (database) and **camelCase** (React) field names throughout:
- Backend `StudentController` maps `first_name → firstName`, `last_name → lastName`, etc.
- Frontend `SchoolContext.loadStudentsFromAPI()` handles `student.firstName || student.first_name`
- Allows incremental migration from legacy DB field names without breaking existing components

### Optimistic UI Updates
CRUD operations update local state **before** the API call completes, then sync:
1. Update state immediately (instant feedback)
2. Fire API request in background
3. On success → reload from API to ensure consistency
4. On failure → reload from API to revert optimistic change

### Offline Cache Layer (`sqlDatabase.ts` — 787 lines)
Wraps API calls with:
- **Request debouncing** — prevents duplicate concurrent requests (Map-based keyed cache)
- **Exponential backoff retry** — retries 3x with 1s/2s/4s delays on network errors
- **Field mapping** — auto-converts snake_case ↔ camelCase

### SSE Real-Time with Polling Fallback
- Server-Sent Events stream via `GET /realtime/stream`
- Events published to `realtime_events` MySQL table (topic + JSON payload)
- Frontend subscribes via `EventSource`, polls for `id > lastId`
- 15-second polling fallback if SSE disconnects
- Topics: `new_payment`, `notification`, `results`, `assignments`, `attendance`, `scores`

### JWT Token Lifecycle
- HS256 signed tokens with 24h expiry
- 48h grace period for token refresh
- Auto-refresh on 401 responses via `ApiService.refreshToken()`
- Rate-limited login: 5 attempts per 15-minute window (APCu or file-based)
- Token validation across 4 header sources (Authorization, REDIRECT_HTTP_AUTHORIZATION, etc.)

### Role-Based Data Access
Backend enforces row-level security per role:
- **Parent** → only sees students linked via `parent_student_links`
- **Teacher** → only sees students in classes where they have subject assignments
- **Accountant/Admin** → full access
- Implemented via dynamic SQL conditions in every query

### Frontend Component Patterns
- **Single-monolithic files**: Feature pages are single files (688–2,632 lines each), few extracted sub-components
- **Error boundaries**: `ResultsManagementPage` uses class-based error boundaries (`ResultsManagementErrorBoundary`, `FullPageErrorBoundary`)
- **Naming convention**: `Manage*Page.tsx` for CRUD pages, `*Page.tsx` for action pages
- **Export patterns**: Mixed — some use `export function`, others use `export default` + alias
- **Lazy loading**: `React.lazy` used for dashboards and `AddStudentFormSimple`
- **Mobile-responsive**: `ManageStudentsPage` has `Mobile` suffix variant; `ManageClassesPage` uses `Desktop` suffix

### Auth Flow — 6 Layers
1. `config/api.ts` — Token storage primitives (localStorage)
2. `services/authService.ts` — Singleton auth business logic (30-min auto-refresh)
3. `services/api.ts` — HTTP client with automatic Bearer injection + 401 refresh
4. `components/ProtectedRoute.tsx` — Route guard (token check + role match)
5. `utils/tokenManager.ts` — Token recovery from multiple storage locations
6. `main.tsx` — Global error suppression (silences 401/403 errors in production)

---

## User Roles & Permissions

### Admin
**Full system control.** The admin oversees every aspect of the school's operations.

| Permission | Scope |
|-----------|-------|
| Dashboard | View system-wide stats (students, teachers, pending results, notifications) |
| Users | Create, edit, enable/disable, reset passwords for all system users |
| Students | Full CRUD, CSV import/export, photo upload, class assignment, promotion |
| Classes | Create/edit/delete classes with level, section, capacity, category |
| Subjects | Create/edit/delete subjects, assign categories, manage registrations |
| Teachers | Full CRUD, assign subjects to teachers, assign class teachers |
| Parents | Full CRUD, link/unlink parents to students |
| Results | View all scores, approve/reject compiled results, manage result sheets |
| Payments | Configure fee structures, view all payments, manage discounts/scholarships |
| Promotion | Set progression rules, execute bulk promotion, manual class changes |
| Attendance | View all attendance reports across classes |
| Communications | Broadcast notifications, view messages, manage exam timetables |
| Settings | Configure school name, motto, current term, academic year, session dates |
| Logs | View activity log audit trail, database viewer |
| Files | Upload school logo, manage file uploads |

### Teacher
**Academic management.** Teachers handle score entry, results compilation, attendance, and assignments.

| Permission | Scope |
|-----------|-------|
| Dashboard | View assigned classes, subjects, students |
| Class List (Class Teacher only) | View students in assigned class |
| Enter Scores | Enter CA1, CA2, and Exam scores for assigned subjects |
| Compile Results (Class Teacher only) | Compile final results with comments, domains |
| Approve Scores (Class Teacher only) | Submit scores for admin approval |
| Mark Attendance (Class Teacher only) | Take daily attendance for their class |
| Student Domains (Class Teacher only) | Record affective & psychomotor domain ratings |
| Message Parents | Send notifications to parents of their students |
| Exam Timetable | View exam schedules |
| Assignments | Create assignments, grade submissions |
| Change Password | Update own password |

### Accountant
**Financial management.** Accountants handle all fee-related operations.

| Permission | Scope |
|-----------|-------|
| Dashboard | View collection stats, pending verifications, daily revenue |
| Set Fees | Configure fee structures per class/term (tuition, sports, exam, books, etc.) |
| Record Payments | Record cash payments, bank transfers, online payments |
| Verify Receipts | Verify/approve pending payments, upload receipts |
| Payment Reports | Generate financial summaries, reconciliation reports |
| Payment History | View all payment transactions with filters |
| Bank Settings | Configure school bank account details for transfers |
| Discount/Scholarship | Apply discounts and scholarships to students |
| Message Parents | Send payment reminders and notifications |
| Change Password | Update own password |

### Parent
**Student monitoring.** Parents view their children's academic progress and manage fees.

| Permission | Scope |
|-----------|-------|
| Dashboard | View linked children overview, recent results, fee status |
| My Children | View each child's profile, class, and academic data |
| Notifications | Receive and manage school notifications |
| Settings | Update profile, change password |
| Fee Management | View fee breakdown per child, make online payments via Paystack, upload bank transfer receipts, download receipts |
| Messages | Access class WhatsApp group links, send messages to school |

---

## Features

### Student Management
Full CRUD with auto-generated admission numbers (`GRA/[year]/[sequential]`), photo upload with fallback handling, CSV bulk import/export, student-parent linking (Father/Mother/Guardian), transfer & withdrawal management, admission approval workflow, and status lifecycle (Active → Inactive/Graduated/Transferred).

### Academic Structure
Class creation with levels (Creche→SS), sections (A/B/C), capacity limits; subject creation with categories and core/elective flags; subject registration and teacher assignment per class per term; class teacher assignment; department management.

### Results & Grading (FETS System)
Score entry (CA1, CA2, Exam) with Creche exam-only mode. Four-stage approval: Draft → Submitted → Approved/Rejected (with rejection reasons). Admin override with versioning. Compilation: Final Exam (40%) + Term Exam (20%) + Test1 (10%) + Test2 (10%) + Assignment (10%) + Project (10%). Grading: A(75–100), B(60–74), C(50–49), D(40–49), F(0–39). Automatic positions, PDF report cards, broadsheet view, result history.

### Fee Management & Payments
Fee structures per class/term with 10+ component types. Payment methods: Cash, Bank Transfer (receipt upload), Paystack online (card/USSD/bank). Verification workflow with pending timeout detection (>60min online, >48h bank transfer flagged). Reversal with full audit trail. Auto-generated invoices with brought-forward balances. Debtor list, reconciliation reports, discounts & scholarships.

### Attendance
Daily marking (Present/Absent/Late/Excused), bulk mark-all, individual summaries, class-wide reports, dashboard analytics charts, 75% minimum threshold for result compilation eligibility.

### Affective & Psychomotor Domains
6 affective traits (Attentiveness, Honesty, Punctuality, Neatness, Obedience, Sense of Responsibility) and 10 psychomotor traits scored 1–5 with remarks per student per term.

### Communication & Real-time
In-app notifications with role-based broadcast (All/Admin/Teachers/Accountants/Parents/Specific class/students). Teacher-to-parent messaging. Real-time delivery via Server-Sent Events with 15s polling fallback.

### Assignments
Create homework with title, description, due date, max score, file attachments. Student submissions with teacher grading and feedback.

### Timetables
Exam timetable scheduling (class, subject, date, time, hall, invigilator) and class period timetables (8 periods, Mon–Fri).

### Promotion & Progression
Progression rules (from-class → to-class). Eligibility calculation (attendance ≥ 75% + passing average). Bulk promotion with target class and academic year advancement. Manual override with 8 statuses: Promoted, Repeated, Transferred, On Hold, Withdrawn, Pending Approval, Conditional, Manual.

### CBT (Computer-Based Testing)
Full online exam engine: create exams with duration, start/end times; single-choice and true/false questions with JSON options; question bank for reusable content; student attempts with auto-scoring; score feeding into the results system; AI-powered question generation from study materials.

### Parent Portal
View linked children with photos, report cards, attendance, fee balances. Make online payments via Paystack. Upload bank transfer receipts. Access class WhatsApp groups. Download payment receipts.

### System Administration
User management, activity log audit trail, school settings, digital signatures (principal & head teacher), database viewer, raw SQL query tool, data backup, system reports, file uploads.

### Public Pages
Landing page, About, Admissions, Academic Calendar, Fee Structure, School News, Contact.

---

## Complete Workflows

### 1. Authentication & Access

```
User opens site → Landing Page → Clicks "Login to Portal"
    ↓
Login Page → Selects Role (Admin/Teacher/Accountant/Parent)
    ↓
Enters Username + Password → POST /auth/login
    ↓
Backend: RateLimiter checks (5 attempts / 15 min per username)
    ↓
Credentials valid? → JWT generated (HS256, 24h expiry)
    ↓
Redirected to role-specific dashboard:
    admin  → /admin
    teacher → /teacher
    accountant → /accountant
    parent → /parent
    ↓
Frontend: SchoolContext rehydrates from JWT → loads all entity data
    ↓
ProtectedRoute checks JWT validity + role match on every route change
    ↓
On 401 response → ApiService auto-refreshes token → retries request
    ↓
On logout → POST /auth/logout → JWT cleared from localStorage
```

**Security measures:**
- All API requests require `Authorization: Bearer <token>` header
- Role is checked at middleware level (`requireAuth()` + `requireRole()`)
- Rate limiting prevents brute force attacks
- Passwords stored with bcrypt hashing (with legacy plaintext upgrade path for parents)
- CORS whitelist restricts API access to known origins
- Activity logging tracks all user actions

---

### 2. Student Lifecycle Management

**Admission Number Format:** `GRA/[year]/[sequential]` (auto-generated)

```
Admin navigates to → Manage Students
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Options                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  A. Register Single Student:                                 │
│     Click "Add Student" → Fill form (name, class, DOB,      │
│     gender, address, parent/guardian info, photo) → Submit   │
│     → POST /students → Student created → Login user created  │
│                                                              │
│  B. Bulk Import via CSV:                                     │
│     Click "Import CSV" → Download template → Fill data →     │
│     Upload file → Parsed & validated → Students created      │
│                                                              │
│  C. Export Students to CSV:                                  │
│     Click "Export CSV" → All students downloaded as .csv     │
│                                                              │
│  D. View / Edit / Delete:                                    │
│     Search by name/admission_no → Click student →            │
│     View profile → Edit details / Upload photo / Delete       │
│                                                              │
│  E. Link Parent to Student:                                  │
│     Select student → Click "Link Guardian" → Select parent   │
│     → POST /parents/link/{parent_id} → Association created   │
│                                                              │
│  F. Student Status Management:                               │
│     Status options: Active | Inactive | Graduated | Transferred
│     Admin can change status at any time                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Student status lifecycle:**
```
Admission → Active → [Can be: Inactive (manual) / Graduated (promotion from final year) / Transferred (manual)]
```

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create student | Yes | No | No | No |
| Edit student | Yes | No | No | No |
| Delete student | Yes | No | No | No |
| View all students | Yes | Own class only | No | Own children only |
| Import CSV | Yes | No | No | No |
| Export CSV | Yes | No | No | No |
| Upload photo | Yes | No | No | No |
| Link parent | Yes | No | No | No |

---

### 3. Class & Subject Management

**Class hierarchy:**
```
Creche → Nursery → Primary (1-6) → Junior Secondary (JSS 1-3) → Senior Secondary (SS 1-3)
```

#### Class Management (Admin only)

```
Admin navigates to → Manage Classes
    ↓
┌────────────────────────────────────────────────────────────┐
│  Workflow:                                                  │
│                                                             │
│  Create Class → Set name, level, section (A/B/C),           │
│  capacity (max students), category (Primary/Secondary)      │
│  → POST /classes → Class created                            │
│                                                             │
│  Edit Class → Modify name, level, capacity → PUT /classes   │
│                                                             │
│  Delete Class → Only if no students enrolled                 │
│                                                             │
│  View Class → Shows students in class, subjects, stats      │
│                                                             │
│  Assign Class Teacher → Select teacher → POST assignment    │
│     Class teacher gets: access to compile results,           │
│     mark attendance, manage domains                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create class | Yes | No | No | No |
| Edit class | Yes | No | No | No |
| Delete class | Yes | No | No | No |
| View classes | Yes | Own assigned | No | Own children's |
| Assign class teacher | Yes | No | No | No |
| View class stats | Yes | Own class | No | No |

#### Subject Management (Admin only)

```
Admin navigates to → Manage Subjects
    ↓
┌────────────────────────────────────────────────────────────┐
│  Workflow:                                                  │
│                                                             │
│  Create Subject → Set name, code, category                  │
│  (Creche/Nursery/Primary/JSS/SS/General),                   │
│  department, is_core (true/false) → POST /subjects          │
│                                                             │
│  Edit / Delete subject                                      │
│                                                             │
│  Register Subject for Class → Select class, term, year      │
│  → POST /subject_registrations                              │
│                                                             │
│  Assign Subject to Teacher → Select teacher, class,         │
│  subject, term, year → POST /subjects/assign                │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Subject assignment workflow:**
```
Admin assigns Subject A to Teacher T for Class C in Term 1, Academic Year 2025/2026
    → Teacher T can now enter scores for Subject A in Class C
    → Teacher T sees Class C in their dashboard
    → Only assigned teachers can enter scores for that subject
```

---

### 4. Teacher Assignment & Management

```
Admin navigates to → Manage Teachers
    ↓
┌────────────────────────────────────────────────────────────┐
│  Workflow:                                                  │
│                                                             │
│  Create Teacher → Fill details (name, employee_id, phone,   │
│  qualification, specialization, department) → Submit        │
│  → Teacher record created + User account auto-created       │
│                                                             │
│  Edit / Delete / View Teacher                               │
│                                                             │
│  Assign Subjects to Teacher → Teacher Assignment page       │
│  → Select teacher, class, subject(s), term, year → Submit   │
│  → Teachers see these in their dashboard                    │
│                                                             │
│  Assign Class Teacher → Select class → Select teacher       │
│  → POST /class_teacher_assignments                          │
│  → This teacher gets access to compile results,             │
│    mark attendance, affective/psychomotor domains           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create teacher | Yes | No | No | No |
| Edit teacher | Yes | No | No | No |
| Delete teacher | Yes | No | No | No |
| View teachers | Yes | No | No | No |
| Assign subjects | Yes | No | No | No |
| Assign class teacher | Yes | No | No | No |

---

### 5. Score Entry & Results Workflow

This is the core academic workflow with a **four-stage approval chain**.

```
Teacher navigates to → Enter Scores
    ↓
Selects Class → Selects Subject → Selects Term / Academic Year
    ↓
┌────────────────────────────────────────────────────────────┐
│  Score Entry Interface                                      │
│                                                             │
│  Student list loads with existing scores (if any)           │
│  For each student, teacher enters:                          │
│    • CA1 (Continuous Assessment 1) — out of set max         │
│    • CA2 (Continuous Assessment 2) — out of set max         │
│    • Exam — out of set max                                  │
│                                                             │
│  Special case — Creche classes:                             │
│    Only Exam score (no CA)                                  │
│                                                             │
│  Scores auto-save as Draft status                           │
│                                                             │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│  Approval Workflow Chain                                    │
│                                                             │
│  Stage 1: DRAFT                                             │
│  ─────────────────                                          │
│  • Scores saved but not yet submitted                       │
│  • Teacher can edit anytime                                 │
│  • No admin visibility for approval                        │
│    ↓                                                        │
│  Teacher clicks "Submit for Approval"                       │
│    ↓                                                        │
│  Stage 2: SUBMITTED                                         │
│  ─────────────────                                          │
│  • Scores locked from teacher editing                       │
│  • Visible to admin for review                              │
│  • Pending approval count increments on admin dashboard     │
│    ↓                                                        │
│  Admin reviews scores → Can either:                         │
│    ↓                                   ↓                    │
│  Stage 3a: APPROVED                Stage 3b: REJECTED       │
│  ──────────────────                ──────────────────      │
│  • Scores finalized &              • Reason recorded        │
│    immutable                       • Returned to teacher    │
│  • Counted for compilation         • Teacher can re-edit    │
│  • Cannot be edited                • Must re-submit         │
│    ↓                                                        │
│  (After Approval) — Admin can override:                     │
│  "Update Approved Scores" — with versioning tracking        │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Grading Scale:**

| Grade | Range | Description |
|-------|-------|-------------|
| A | 75–100 | Excellent |
| B | 60–74 | Very Good |
| C | 50–59 | Good |
| D | 40–49 | Fair |
| F | 0–39 | Fail |

**Who can do what in the score workflow:**

| Action | Admin | Teacher (Class Teacher) | Teacher (Subject Only) | Accountant | Parent |
|--------|-------|------------------------|------------------------|------------|--------|
| Enter scores | No | Own class subjects | Assigned subjects | No | No |
| Edit draft scores | No | Yes | Yes | No | No |
| Submit for approval | No | Yes | No | No | No |
| Approve scores | Yes | No | No | No | No |
| Reject scores | Yes | No | No | No | No |
| Update approved scores | Yes | No | No | No | No |
| View scores | Yes | Own class | Own class | No | Own children |

---

### 6. Result Compilation & Report Cards

The class teacher compiles final results after all scores are approved.

```
Class Teacher navigates to → Compile Results
    ↓
Selects Class → Term → Academic Year
    ↓
┌────────────────────────────────────────────────────────────┐
│  Prerequisite Checks:                                       │
│  • All subjects must have approved scores                  │
│  • All students must have attendance records               │
│  • Minimum attendance threshold must be met                │
│    ↓                                                        │
│  If prerequisites fail → Warning displayed                  │
│  with details of missing data                               │
│    ↓                                                        │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│  Compilation Process (FETS Grading System)                  │
│                                                             │
│  For each student, the system calculates:                   │
│                                                             │
│  Final Exam    = 40% of total                               │
│  Term Exam     = 20% of total                               │
│  Test 1 (CA1)  = 10% of total                               │
│  Test 2 (CA2)  = 10% of total                               │
│  Assignment    = 10% of total                               │
│  Project       = 10% of total                               │
│  ─────────────────────────────────────                      │
│  TOTAL         = 100% (0–100 scale)                         │
│                                                             │
│  Grade assigned based on total (A/B/C/D/F)                 │
│                                                             │
│  Position calculated per class (1st, 2nd, 3rd, etc.)      │
│                                                             │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│  Affective & Psychomotor Domains                            │
│                                                             │
│  Class Teacher rates each student on:                       │
│                                                             │
│  Affective (6 traits, scored 1-5 with remark):              │
│  • Attentiveness                                            │
│  • Honesty                                                  │
│  • Punctuality                                              │
│  • Neatness                                                 │
│  • Obedience                                                │
│  • Sense of Responsibility                                  │
│                                                             │
│  Psychomotor (10 traits, scored 1-5 with remark):           │
│  • Attention to Direction                                   │
│  • Considerate of Others                                    │
│  • Handwriting                                              │
│  • Sports                                                   │
│  • Handwork                                                 │
│  • Drawing                                                  │
│  • Music                                                    │
│  • Verbal Fluency                                           │
│  • Works Well Independently                                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────────┐
│  Teacher's Comments                                          │
│                                                             │
│  • Teacher's remark (auto-generated templates available)    │
│    — Templates categorized by performance level:            │
│      Excellent, Very Good, Good, Fair, Needs Improvement   │
│  • Principal's comment (added by admin later)               │
│  • School resumption date for next term                     │
│                                                             │
└────────────────────────────────────────────────────────────┘
    ↓
Teacher clicks "Compile Results" → POST /results/compile
    ↓
┌────────────────────────────────────────────────────────────┐
│  Admin Review & Finalization                                 │
│                                                             │
│  Admin navigates to → Results Management                    │
│  → View compiled results pending approval                   │
│  → Click "View Details" to see full breakdown               │
│                                                             │
│  Admin can:                                                 │
│  • Approve → Finalizes results (immutable)                  │
│  • Reject → Sends back to teacher with reason               │
│  • Delete → Removes compiled result entirely                │
│                                                             │
│  Once Approved:                                             │
│  • PDF report cards available for download                  │
│  • Parents can view results in parent portal               │
│  • Results stored permanently for the term                  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**PDF Report Card includes:**
- School name, logo, motto
- Student name, class, term, academic year, photo
- Subject-by-subject breakdown (CA1, CA2, Exam, Total, Grade)
- Total score, average, position in class
- Affective domain ratings
- Psychomotor domain ratings
- Teacher's comment
- Principal's comment
- Next term resumption date
- Digital signatures (Principal & Head Teacher)

**Who can do what:**

| Action | Admin | Teacher (Class Teacher) | Teacher (Subject Only) | Accountant | Parent |
|--------|-------|------------------------|------------------------|------------|--------|
| Compile results | No | Yes | No | No | No |
| Enter domains | No | Yes | No | No | No |
| Add teacher comment | No | Yes | No | No | No |
| Add principal comment | Yes | No | No | No | No |
| Approve compilation | Yes | No | No | No | No |
| Reject compilation | Yes | No | No | No | No |
| Delete compilation | Yes | No | No | No | No |
| View report card PDF | Yes | Own class | No | No | Own children |
| View in parent portal | Yes | No | No | No | Own children |

---

### 7. Fee Management & Payment Processing

**Fee Structure Setup (Admin/Accountant):**

```
Navigat to → Set Fees → Select Class → Term → Academic Year
    ↓
Define fee components (each with amount):
    • Tuition Fee
    • Development Levy
    • Sports Fee
    • Examination Fee
    • Books & Materials
    • Uniform Fee
    • Transport Fee
    • ICT Fee
    • Lab Fee
    • Other (custom)
    ↓
Save → POST /fee-structures → Fee structure active for class/term
```

**Payment Workflow:**

```
┌──────────────────────────────────────────────────────────┐
│                PAYMENT METHODS                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  A. Cash Payment (Recorded by Accountant):                │
│     Parent pays cash at school office                     │
│     → Accountant records payment in system                │
│     → Select student, amount, method="Cash"               │
│     → POST /payments → Status = "Verified" (auto)        │
│     → Receipt generated                                   │
│                                                           │
│  B. Bank Transfer (Parent uploads proof):                 │
│     Parent transfers to school bank account               │
│     → Parent logs into portal → Fee Management            │
│     → Select child → Enter amount → "Bank Transfer"       │
│     → Upload receipt/screenshot                           │
│     → POST /payments/bank-transfer-proof                   │
│     → Status = "Pending Verification"                     │
│     → Accountant sees in "Verify Receipts" dashboard      │
│     → Accountant reviews receipt → "Verify" or "Reject"   │
│     → If verified → Status = "Verified", invoice updated  │
│                                                           │
│  C. Online Payment via Paystack (Parent):                 │
│     Parent logs into portal → Fee Management              │
│     → Select child → Enter amount                         │
│     → Select "Online Payment"                             │
│     → Paystack modal opens (card, USSD, bank transfer)    │
│     → Payment processed by Paystack                       │
│     → Paystack webhook → POST /payments/online-verify     │
│     → Status = "Verified" (auto if successful)            │
│     → Receipt displayed                                   │
│                                                           │
│  D. Pending Payment Timeout:                              │
│     Online pending > 60 min → Auto-cancelled              │
│     Bank transfer pending > 48 hours → Flagged exception  │
│                                                           │
└──────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────┐
│  Post-Payment Workflow                                     │
│                                                             │
│  On successful verification:                                │
│  1. Invoice auto-generated (if not exists)                  │
│  2. Student fee balance updated                             │
│  3. Payment recorded in activity log                        │
│  4. Real-time event published (SSE)                        │
│  5. Parent receives notification                            │
│                                                             │
│  Reversal Workflow:                                         │
│  Admin/Accountant can reverse a payment                     │
│  → Reason required → Full audit trail:                      │
│    reversed_from_payment_id, reversed_by,                   │
│    reversal_reason, reversed_at                             │
│  → Student fee balance recalculated                         │
│                                                             │
└──────────────────────────────────────────────────────────┘
```

**Fee Breakdown Dashboard:**

```
Fee Management page shows:
    • Expected Revenue (this term)
    • Total Collected
    • Outstanding Balance
    • Students with Balance (count)
    • Collection rate percentage
    • Per-student fee breakdown
    • Debtor list
```

**Who can do what:**

| Action | Admin | Accountant | Parent | Teacher |
|--------|-------|------------|--------|---------|
| Set fee structures | Yes | Yes | No | No |
| Record cash payment | Yes | Yes | No | No |
| Verify bank transfer | Yes | Yes | No | No |
| Reverse payment | Yes | Yes | No | No |
| View all payments | Yes | Yes | Own children only | No |
| Make online payment | No | No | Yes | No |
| Upload transfer receipt | No | No | Yes | No |
| View fee balances | Yes | Yes | Own children | No |
| Apply discounts/scholarships | Yes | Yes | No | No |
| View payment reports | Yes | Yes | No | No |
| Configure bank accounts | Yes | Yes | No | No |

---

### 8. Attendance Tracking

**Marking Attendance:**

```
Teacher (Class Teacher only) navigates to → Mark Attendance
    ↓
Select Class → Date (defaults to today)
    ↓
Student list loads with current attendance status
    ↓
For each student, mark one of:
    • Present (P)
    • Absent (A)
    • Late (L)
    • Excused (E)
    ↓
Bulk action available: "Mark All Present" → then adjust individuals
    ↓
Save → POST /attendance/bulk → Records saved for the date
```

**Attendance Reports:**

```
Attendance → Attendance Reports in admin dashboard
    ↓
Filters: Class, Student, Date Range, Term, Academic Year
    ↓
Views available:
    • Daily attendance report
    • Student summary (stats per student)
    • Class summary (stats per class)
    • Dashboard widgets (bar/line charts)
    • Percentage rate calculations
```

**Attendance validation for results:**
- Students must meet minimum attendance threshold (default: 75%) to be eligible for result compilation
- The system checks `attendance_rate >= 75%` before allowing compilation

**Who can do what:**

| Action | Admin | Teacher (Class Teacher) | Teacher (Subject Only) | Accountant | Parent |
|--------|-------|------------------------|------------------------|------------|--------|
| Mark attendance | No | Yes | No | No | No |
| Bulk mark | No | Yes | No | No | No |
| View class attendance | Yes | Own class | No | No | No |
| View student summary | Yes | Own class | No | No | Own children |
| View reports | Yes | Own class | No | No | No |

---

### 9. Promotion & Progression System

**Progression Rules (Admin set-up):**

```
Admin navigates to → Promotion System
    ↓
┌────────────────────────────────────────────────────────────┐
│  Create Progression Rule:                                   │
│  From Class A → To Class B                                  │
│  (e.g., Primary 1 → Primary 2, JSS 1 → JSS 2, etc.)        │
│  → POST /progression-rules                                  │
│                                                             │
│  Rules can be active/inactive                                │
│  Multiple rules from/to classes supported                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Promotion Execution:**

```
Only available during Third Term (or manually overridden)
    ↓
Admin → Promotion System
    ↓
┌────────────────────────────────────────────────────────────┐
│  Step 1: Select source class                                │
│  Step 2: System calculates promotion eligibility:           │
│    • Attendance rate >= 75%                                │
│    • Passing average across subjects                        │
│    • Compiled results exist for the term                    │
│                                                             │
│  Step 3: Eligible students displayed with status:           │
│    • Promoted (auto-eligible)                               │
│    • Repeated (does not meet criteria)                      │
│    • Conditional (borderline, admin decides)                │
│    • On Hold / Transferred / Withdrawn (manual)             │
│                                                             │
│  Step 4: Admin can override any student's status:           │
│    → Manual class change with reason                        │
│    → Demotion option available                              │
│                                                             │
│  Step 5: Select students → Choose target class              │
│  → Click "Promote Selected"                                 │
│                                                             │
│  Step 6: Confirmation dialog → Execute                      │
│  → POST /students/promote-students                          │
│  → Students moved to new class for new academic year        │
│  → Academic year advances (e.g., 2025/2026 → 2026/2027)    │
│  → Activity logged                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Session-Level Promotion Metrics:**

When computing across all three terms of an academic year, the system:
1. Calculates average of Term 1 + Term 2 + Term 3 scores
2. Checks attendance rate across the entire year
3. Returns: `Promoted` or `Repeated`

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create progression rules | Yes | No | No | No |
| View eligibility | Yes | Own class | No | No |
| Execute promotion | Yes | No | No | No |
| Manual class change | Yes | No | No | No |
| Override status | Yes | No | No | No |
| View promotion history | Yes | Yes | No | No |

---

### 10. Communication & Notifications

**Notification System:**

```
┌──────────────────────────────────────────────────────────┐
│  SENDING NOTIFICATIONS                                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Admin: → Send Notifications page                          │
│  Teacher: → Message Parents page                           │
│                                                           │
│  Create notification with:                                 │
│    • Title                                                 │
│    • Message body                                          │
│    • Target audience: All / Admin / Teachers /             │
│      Accountants / Parents / Specific class /              │
│      Specific students / Specific parents                 │
│    • Priority: Normal / High / Urgent                     │
│    ↓                                                       │
│  POST /notifications (or POST /notifications/broadcast)   │
│  → Event published via SSE                                 │
│  → Recipients see real-time notification in dashboard      │
│                                                             │
└──────────────────────────────────────────────────────────┘
```

**Real-Time Delivery (SSE):**

```
Server-Sent Events stream via GET /realtime/stream
    ↓
Connection authenticated via JWT token (header or ?token= query param)
    ↓
On new notification → Event published to `realtime_events` table
    ↓
SSE pushes event to connected clients
    ↓
Frontend dispatches to correct topic handler
    ↓
Data reloaded for affected entity (debounced 250ms)
    ↓
Fallback: 15-second polling if SSE disconnects
```

**Topics used in real-time:**
- `new_payment` — Notify when payment received
- `notification` — New system notification
- `results` — Scores/results updated
- `assignments` — New/graded assignments
- `attendance` — Attendance recorded
- `scores` — Scores modified

**Notification display:**

| Dashboard | Top bar bell icon | Unread count | Popover preview |
|-----------|-------------------|--------------|-----------------|
| Admin | Yes | Yes (with pulse) | Top 5 unread |
| Teacher | Yes | Yes | Top 5 unread |
| Accountant | Yes | Yes | Top 5 unread |
| Parent | Yes | Yes | Full list page |

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Send broadcast notifications | Yes | No | No | No |
| Message specific role | Yes | No | No | No |
| Message own students' parents | No | Yes | Yes | No |
| Receive notifications | Yes | Yes | Yes | Yes |
| Mark as read | Yes | Yes | Yes | Yes |
| Delete notifications | Yes | Yes | Yes | Yes |
| View notification history | Yes | Yes | Yes | Yes |

---

### 11. Assignment Management

**Teacher creates assignment:**

```
Teacher → Create Assignment
    ↓
Select Class → Select Subject
    ↓
Fill: Title, Description, Due Date, Max Score
    ↓
Can attach file(s)
    ↓
POST /assignments → Created
```

**Student submissions:**

```
Students submit via their portal (currently handled by teacher/admin)
    ↓
POST /assignments/submit/{assignment_id}
    ↓
File attachment supported
```

**Grading:**

```
Teacher → View Submissions for assignment
    ↓
Enter score + feedback for each submission
    ↓
PUT /assignments/grade/{submission_id}
```

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create assignments | No | Yes | No | No |
| View assignments | Yes | Own | No | No |
| Grade submissions | No | Yes | No | No |
| Delete assignments | Yes | Own | No | No |

---

### 12. Timetable Management

**Exam Timetable:**

```
Admin → Exam Timetable
    ↓
Create timetable entries:
    • Class
    • Subject
    • Date
    • Start time / End time
    • Exam hall/room
    • Invigilator
    ↓
Displayed in both Admin and Teacher dashboards
```

**Class Timetable:**

Period-based scheduling per class with subjects, teachers, time slots (8 periods, Mon–Fri).

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create exam timetable | Yes | No | No | No |
| View exam timetable | Yes | Yes | No | No |
| Create class timetable | Yes | No | No | No |
| View class timetable | Yes | Own class | No | No |

---

### 13. System Administration

**User Management:**

```
Admin → Register User / Manage Users
    ↓
Create user with:
    • Username (auto-generated or custom)
    • Password (auto-generated or custom)
    • Role: Admin / Teacher / Accountant / Parent
    • Linked ID (links user to respective teacher/student/parent record)
    • Status: Active / Inactive
    ↓
POST /users → Account created
    ↓
Actions available:
    • Edit user details
    • Reset password (generates random password)
    • Enable / Disable account
    • Delete user
```

**School Settings:**

```
Admin → Settings
    ↓
Configure:
    • School Name
    • School Motto
    • Current Academic Year (e.g., 2025/2026)
    • Current Term (First, Second, Third)
    • Session Start Date / End Date
    • Term Start Date / End Date
    • School Address, Phone, Email
    • Principal Name
    • Head Teacher Name
    • Digital Signatures (Principal & Head Teacher)
```

**Activity Logs:**

```
Admin → Activity Logs
    ↓
View chronological audit trail:
    • User who performed action
    • Action description
    • Entity affected
    • Timestamp
    • IP address
    • Filters: date range, user, action type
```

**Data Management:**

```
Admin → Data Backup
    ↓
Options:
    • Export database dump
    • Download CSV exports of any entity
    • Database viewer (read-only table browsing)
    • Raw SQL query tool (admin only, with confirmation)
```

**File Uploads:**

```
Admin uploads:
    • School logo
    • Student photos
    • Staff signatures
    • General files (5MB max, MIME validated)

Upload via POST /files/upload → File stored in uploads/ directory
```

**Who can do what:**

| Action | Admin | Teacher | Accountant | Parent |
|--------|-------|---------|------------|--------|
| Create users | Yes | No | No | No |
| Manage users | Yes | No | No | No |
| Reset passwords | Yes | No | No | Own |
| Change own password | Yes | Yes | Yes | Yes |
| Configure school settings | Yes | No | No | No |
| View activity logs | Yes | No | No | No |
| Database viewer | Yes | No | No | No |
| Upload files | Yes | No | No | No |
| Data backup/export | Yes | No | No | No |

---

## Complete Permission Matrix

| Feature / Action | Admin | Teacher (Class Teacher) | Teacher (Subject Only) | Accountant | Parent |
|---|---|---|---|---|---|
| **Students** | | | | | |
| Create | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own class | ✅ | ✅ | ✅ | ❌ | ❌ |
| View own children | ❌ | ❌ | ❌ | ❌ | ✅ |
| CSV Import/Export | ✅ | ❌ | ❌ | ❌ | ❌ |
| Link parent | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload photo | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Classes** | | | | | |
| Create/Edit/Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own assigned | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign class teacher | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Subjects** | | | | | |
| Create/Edit/Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Register for class | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign to teacher | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Teachers** | | | | | |
| Create/Edit/Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| View | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Parents** | | | | | |
| Create/Edit/Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own record | ✅ | ❌ | ❌ | ❌ | ✅ |
| Link students | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Scores** | | | | | |
| Enter CA/Exam | ❌ | ✅ | ✅ | ❌ | ❌ |
| Edit draft scores | ❌ | ✅ | ✅ | ❌ | ❌ |
| Submit for approval | ❌ | ✅ | ❌ | ❌ | ❌ |
| Approve scores | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reject scores | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update approved | ✅ | ❌ | ❌ | ❌ | ❌ |
| View scores | ✅ | ✅ | ✅ | ❌ | Own children |
| **Results** | | | | | |
| Compile results | ❌ | ✅ | ❌ | ❌ | ❌ |
| Enter domains | ❌ | ✅ | ❌ | ❌ | ❌ |
| Add teacher comment | ❌ | ✅ | ❌ | ❌ | ❌ |
| Add principal comment | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve compilation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reject compilation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete compilation | ✅ | ❌ | ❌ | ❌ | ❌ |
| View report PDF | ✅ | Own class | ❌ | ❌ | Own children |
| **Payments** | | | | | |
| Set fee structures | ✅ | ❌ | ❌ | ✅ | ❌ |
| Record payment | ✅ | ❌ | ❌ | ✅ | ❌ |
| Verify receipt | ✅ | ❌ | ❌ | ✅ | ❌ |
| Reverse payment | ✅ | ❌ | ❌ | ✅ | ❌ |
| View all payments | ✅ | ❌ | ❌ | ✅ | ❌ |
| Make online payment | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload transfer proof | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own fee balance | ❌ | ❌ | ❌ | ❌ | ✅ |
| Discounts/Scholarships | ✅ | ❌ | ❌ | ✅ | ❌ |
| Bank account settings | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Attendance** | | | | | |
| Mark attendance | ❌ | ✅ | ❌ | ❌ | ❌ |
| Bulk mark | ❌ | ✅ | ❌ | ❌ | ❌ |
| View class reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| View child's report | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Promotion** | | | | | |
| Progression rules | ✅ | ❌ | ❌ | ❌ | ❌ |
| Execute promotion | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manual class change | ✅ | ❌ | ❌ | ❌ | ❌ |
| Override status | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Notifications** | | | | | |
| Broadcast | ✅ | ❌ | ❌ | ❌ | ❌ |
| Message parents | ✅ | ✅ | ❌ | ✅ | ❌ |
| Receive | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Assignments** | | | | | |
| Create | ❌ | ✅ | ✅ | ❌ | ❌ |
| Grade | ❌ | ✅ | ✅ | ❌ | ❌ |
| View all | ✅ | Own | Own | ❌ | ❌ |
| **Timetables** | | | | | |
| Create exam timetable | ✅ | ❌ | ❌ | ❌ | ❌ |
| View exam timetable | ✅ | ✅ | ✅ | ❌ | ❌ |
| **System** | | | | | |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |
| School settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activity logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Database viewer | ✅ | ❌ | ❌ | ❌ | ❌ |
| File uploads | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change own password | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Project Structure

**Total frontend files:** ~120 TypeScript/TSX files across 15 directories  
**Total backend files:** 17 controllers (avg ~800 lines), 6 helpers, 1 router (822 lines), config files  
**Database:** 65 tables + 5 views in MariaDB

```
/
├── .htaccess                     # Apache rewrite rules + CSP + security headers (176 lines)
├── index.html                    # SPA entry point (Vite module script)
├── package.json                  # Dependencies: React 18, Radix UI, Recharts, Paystack, jsPDF
├── vite.config.ts                # Vite 6 build config: manual chunk splitting, es2015 target
├── tsconfig.json                 # TypeScript 5.9 config with @/ path alias
│
├── src/                          # React TypeScript frontend
│   ├── main.tsx                  # App bootstrap, global error handlers, providers (76 lines)
│   ├── App.tsx                   # Route definitions — 7 routes (62 lines)
│   ├── index.css                 # Tailwind v4 directives + 5,544 lines custom CSS
│   │
│   ├── config/
│   │   └── api.ts                # API_CONFIG: BASE_URL, ENDPOINTS, token helpers (259 lines)
│   │
│   ├── contexts/
│   │   ├── SchoolContext.tsx      # Global state hub — 20+ entity arrays, ~200 methods (9,158 lines)
│   │   ├── ConnectionContext.tsx  # Network online/offline monitoring (106 lines)
│   │   └── NotificationService.tsx # Real-time SSE pub/sub + toast display (122 lines)
│   │
│   ├── services/
│   │   ├── api.ts                # ApiService — fetch + adaptive timeout + retry + token refresh (430 lines)
│   │   ├── authService.ts        # Auth helpers — singleton login/logout/refresh/validate (324 lines)
│   │   └── sqlDatabase.ts        # Offline cache: request debouncing, exponential backoff retry (787 lines)
│   │
│   ├── hooks/                    # 5 custom hooks
│   │   ├── useBatchApi.ts        # Batch API request optimization
│   │   ├── useLazyLoad.ts        # Lazy loading hook
│   │   ├── useMobileOptimization.ts
│   │   ├── useRealTimeData.ts    # Real-time data subscription
│   │   └── useTermChangeDetector.ts
│   │
│   ├── utils/                    # 18 utility files
│   │   ├── pdfGenerator.ts       # PDF report card generation via jsPDF (1,258 lines)
│   │   ├── csvExporter.ts        # CSV data export
│   │   ├── csvImporter.ts        # CSV data import
│   │   ├── databaseImporter.ts   # Database import utility
│   │   ├── tokenManager.ts       # JWT token persistence & multi-source recovery (171 lines)
│   │   ├── storageManager.ts     # LocalStorage abstraction
│   │   ├── connectionMonitor.ts  # Connection health checks
│   │   ├── dataCache.ts          # Client-side data caching
│   │   ├── errorHandler.ts       # Error handling utilities
│   │   ├── logger.ts             # Frontend logging
│   │   ├── passwordValidator.ts  # Password strength validation
│   │   ├── performance.ts        # Performance monitoring
│   │   ├── position.ts           # Position formatting (1st, 2nd, 3rd...)
│   │   ├── qrCode.ts             # QR code generation for report cards
│   │   ├── questionParser.ts     # CBT question parser
│   │   ├── classHelpers.ts       # Class level/name helpers
│   │   ├── adminOptimizations.ts # Admin page optimizations
│   │   └── systemVerification.ts # System health verification
│   │
│   ├── components/
│   │   ├── AdminDashboard.tsx    # Admin main dashboard (459 lines, 18 sidebar items)
│   │   ├── TeacherDashboard.tsx  # Teacher main dashboard
│   │   ├── AccountantDashboard.tsx  # Accountant main dashboard
│   │   ├── StudentDashboard.tsx  # Student dashboard (lazy-loaded)
│   │   ├── UniversalParentDashboardFixed.tsx  # Parent dashboard (2,028 lines)
│   │   ├── LandingPage.tsx       # Public landing page (335 lines)
│   │   ├── LoginPage.tsx         # Login form with role selection (189 lines)
│   │   ├── ProtectedRoute.tsx    # Auth guard — checks token + role (33 lines)
│   │   ├── DashboardSidebar.tsx  # Shared sidebar with design tokens (282 lines)
│   │   ├── DashboardTopBar.tsx   # Top bar with notifications bell
│   │   ├── NotificationsPage.tsx # Notifications list
│   │   ├── ProfileSettingsPage.tsx
│   │   ├── ChangePasswordPage.tsx
│   │   ├── StudentResultSheet.tsx
│   │   ├── CumulativeResultSheet.tsx
│   │   ├── PasswordStrengthIndicator.tsx
│   │   │
│   │   ├── admin/                # 48 admin feature components
│   │   │   ├── ManageStudentsPage.tsx  # Student CRUD (1,675 lines, mobile-first)
│   │   │   ├── ManageUsersPage.tsx     # User management (1,903 lines, all roles)
│   │   │   ├── ManageClassesPage.tsx   # Class CRUD (1,090 lines)
│   │   │   ├── ManageSubjectsPage.tsx  # Subject CRUD (688 lines)
│   │   │   ├── ManageTeachersPage.tsx  # Teacher CRUD
│   │   │   ├── ManageParentsPage.tsx   # Parent CRUD
│   │   │   ├── ManageStaffPage.tsx     # Staff management
│   │   │   ├── ManageTeacherAssignmentsPage.tsx  # Teacher-subject-class assignment
│   │   │   ├── ResultsManagementPage.tsx  # Results workflow (2,632 lines, largest)
│   │   │   ├── PromotionSystemPage.tsx # Student promotion (1,688 lines)
│   │   │   ├── FeeManagementPage.tsx   # Fee oversight dashboard (280 lines)
│   │   │   ├── SystemSettingsPage.tsx  # School configuration (1,138 lines)
│   │   │   ├── RegisterUserPage.tsx / CreateUserPage.tsx
│   │   │   ├── LinkStudentParentPage.tsx
│   │   │   ├── AddStudentPage.tsx / AddStudentFormSimple.tsx (lazy-loaded)
│   │   │   ├── StudentProfilePage.tsx
│   │   │   ├── StudentAdmissionApprovalPage.tsx
│   │   │   ├── TransferWithdrawalPage.tsx
│   │   │   ├── BulkStaffImportPage.tsx / QuickStaffImportPage.tsx
│   │   │   ├── SubjectRegistrationPage.tsx
│   │   │   ├── DepartmentManagementPage.tsx
│   │   │   ├── ExamTimetablePage.tsx  # Exam scheduling (411 lines)
│   │   │   ├── SendNotificationPage.tsx
│   │   │   ├── NotificationSystemPage.tsx / NotificationArchivesPage.tsx
│   │   │   ├── ViewResultSheetsPage.tsx / ResultSheetViewer.tsx
│   │   │   ├── ViewAllResultsPage.tsx
│   │   │   ├── ApproveResultsPage.tsx / ResultApprovalDetailPage.tsx
│   │   │   ├── BroadsheetViewPage.tsx
│   │   │   ├── AttendanceReportsPage.tsx  # Attendance analytics (397 lines)
│   │   │   ├── DataBackupPage.tsx / DatabaseViewer.tsx
│   │   │   ├── ActivityLogsPage.tsx / SystemReportsPage.tsx
│   │   │   ├── SignatureSettingsPage.tsx / TermSettingsPage.tsx
│   │   │   ├── ManualPaymentEntryPage.tsx / DebtorListPage.tsx
│   │   │   ├── AddTeacherPage.tsx / AddParentPage.tsx / AddAccountantPage.tsx
│   │   │   └── UserManagementPage.tsx (wrapper, 167 lines)
│   │   │
│   │   ├── teacher/              # 13 teacher page components
│   │   │   ├── ScoreEntryPage.tsx
│   │   │   ├── CompileResultsPage.tsx
│   │   │   ├── MarkAttendancePage.tsx
│   │   │   ├── ScoreApprovalPage.tsx
│   │   │   ├── ClassListPage.tsx
│   │   │   ├── DomainsPage.tsx
│   │   │   ├── AffectiveDomainsPage.tsx / PsychomotorDomainsPage.tsx
│   │   │   ├── AffectivePsychomotorPage.tsx
│   │   │   ├── CreateAssignmentPage.tsx
│   │   │   ├── MessageParentsPage.tsx
│   │   │   ├── ViewResultsPage.tsx
│   │   │   └── WorkflowGuide.tsx
│   │   │
│   │   ├── accountant/           # 8 accountant page components
│   │   │   ├── RecordPaymentPage.tsx
│   │   │   ├── PaymentHistoryPage.tsx
│   │   │   ├── VerifyReceiptsPage.tsx
│   │   │   ├── SetFeesPage.tsx
│   │   │   ├── PaymentReportsPage.tsx
│   │   │   ├── BankAccountSettingsPage.tsx
│   │   │   ├── DiscountScholarshipPage.tsx
│   │   │   └── MessageParentsPage.tsx
│   │   │
│   │   ├── parent/               # 3 parent page components
│   │   │   ├── MyChildrenPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   ├── student/              # Student dashboard components
│   │   │   └── StudentDashboard.tsx
│   │   │
│   │   ├── cbt/                  # CBT exam components
│   │   │   ├── CbtExamListPage.tsx
│   │   │   └── ... (online exam UI)
│   │   │
│   │   ├── public/               # 6 public landing pages
│   │   │   ├── AboutPage.tsx
│   │   │   ├── AdmissionsPage.tsx
│   │   │   ├── AcademicCalendarPage.tsx
│   │   │   ├── FeeStructurePage.tsx
│   │   │   ├── SchoolNewsPage.tsx
│   │   │   └── ContactPage.tsx
│   │   │
│   │   ├── shared/               # Shared cross-role views
│   │   │   ├── ViewNotificationsPage.tsx
│   │   │   ├── ViewExamTimetablePage.tsx
│   │   │   ├── StudentResultCard.tsx (1,261 lines)
│   │   │   ├── FullPageResultView.tsx (271 lines)
│   │   │   └── types/resultCard.ts
│   │   │
│   │   └── ui/                   # 26 shadcn-style UI primitives
│   │       ├── button.tsx, card.tsx, dialog.tsx, input.tsx
│   │       ├── table.tsx, select.tsx, badge.tsx, tabs.tsx
│   │       ├── form.tsx, avatar.tsx, checkbox.tsx, switch.tsx
│   │       ├── alert.tsx, label.tsx, progress.tsx, slider.tsx
│   │       ├── dropdown-menu.tsx, popover.tsx, tooltip.tsx
│   │       ├── separator.tsx, scroll-area.tsx, textarea.tsx
│   │       ├── alert-dialog.tsx, sheet.tsx, simple-dropdown.tsx
│   │       └── PaymentReceipt.tsx
│   │
│   ├── types/globals.d.ts        # Global type declarations
│   └── styles/globals.css        # Design tokens & CSS variables (273 lines)
│
├── api/                          # PHP 8.4 REST API Backend
│   ├── index.php                 # Front controller / router (822 lines)
│   ├── .env / .env.example / .env.production
│   ├── .htaccess                 # API rewrite rules
│   ├── config/
│   │   └── database.php          # Database class (PDO) + Config class (JWT, CORS, upload) (270 lines)
│   │
│   ├── helpers/                  # 7 reusable utility classes
│   │   ├── Response.php          # JSON response formatter (174 lines)
│   │   ├── Middleware.php        # Auth/role enforcement, input validation, pagination (343 lines)
│   │   ├── JWT.php               # HS256 JWT encode/decode/validate/refresh (180 lines)
│   │   ├── RateLimiter.php       # Brute force: 5 attempts/15min via APCu or file (283 lines)
│   │   ├── Logger.php            # File-based logging with levels (218 lines)
│   │   ├── DatabaseTransaction.php  # PDO transaction + savepoint helper (222 lines)
│   │   └── RealtimeEvents.php    # SSE event publisher (75 lines)
│   │
│   ├── controllers/              # 18 controllers
│   │   ├── AuthController.php    # Login/logout/profile/password/refresh (389 lines)
│   │   ├── StudentController.php # CRUD, promote, domains, statistics (1,280 lines)
│   │   ├── TeacherController.php # CRUD, assignments, class students
│   │   ├── ClassController.php   # CRUD, students/subjects/stats by class
│   │   ├── SubjectController.php # CRUD, assign, assignments listing
│   │   ├── ResultsController.php # Scores CRUD, compile, approve (~2,763 lines, largest)
│   │   ├── PaymentController.php # Payments CRUD, Paystack, verify, reverse (~1,583 lines)
│   │   ├── ParentController.php  # CRUD, link/unlink children
│   │   ├── AttendanceController.php  # Mark, bulk, summaries
│   │   ├── NotificationController.php# CRUD, broadcast, mark read
│   │   ├── AssignmentController.php  # CRUD, submit, grade
│   │   ├── InvoiceController.php # Auto-generate invoices
│   │   ├── ReportController.php  # PDF report cards, class/financial reports (611 lines)
│   │   ├── FileController.php    # Logo upload, file management
│   │   ├── UserController.php    # CRUD, password reset
│   │   ├── ProgressionController.php  # Progression rules CRUD
│   │   ├── CbtController.php     # Full CBT engine: exams/questions/attempts/scoring
│   │   └── RealtimeController.php    # SSE streaming endpoint
│   │
│   ├── standalone scripts:
│   │   ├── school_settings.php       # School settings CRUD
│   │   ├── signature_settings.php    # Digital signature settings
│   │   ├── subject_registrations.php # Subject registration listings
│   │   ├── teachers.php              # Teacher listings
│   │   ├── class_teacher_assignments.php
│   │   ├── academic_years.php
│   │   ├── upload-student-photo.php  # Photo upload handler
│   │   ├── health.php                # API health check
│   │   ├── jwt_diagnostic.php / jwt_test.php  # JWT debugging
│   │   ├── test.php / test-promotions.php / restore_first_term.php
│   │   └── auth/
│   │       └── simple_login.php     # Legacy login (disabled)
│   │
│   └── migrations/
│       └── 003_question_extensions.sql  # CBT question extensions
│
├── database/                     # SQL dumps
│   ├── mdpjhtua_graceland_academy.sql  # Full database dump (45,802 lines, 65 tables + 5 views)
│   └── whatsapp_groups.sql
│
├── build/                        # Vite production build output
├── scripts/
│   └── update-deployment.mjs     # Copies build/ to final-deployment/
├── assets/                       # Vite-compiled production assets
└── docs/
    └── backend-test.html         # Backend API test page
```

---

## Database Schema Overview

The system uses a **MariaDB 11.4** database named `mdpjhtua_graceland_academy` with **65 tables** and **5 views** across 13 functional groups:

### Core Entity Tables (5)

| Table | Rows (approx.) | Key Columns |
|-------|----------------|-------------|
| `students` | ~350 | `id`, `first_name`, `last_name`, `admission_number`, `class_id`, `parent_id`, `date_of_birth`, `gender`, `photo_url`, `passport_photo`, `status`, `academic_year` |
| `teachers` | ~34 | `id`, `first_name`, `last_name`, `employee_id`, `email`, `phone`, `gender`, `qualification`, `specialization` (JSON), `is_class_teacher`, `department_id`, `signature` |
| `parents` | ~250 | `id`, `first_name`, `last_name`, `email`, `phone`, `alternate_phone`, `address`, `occupation`, `status` |
| `accountants` | ~1 | `id`, `first_name`, `last_name`, `employee_id`, `email`, `phone`, `department`, `status` |
| `users` | ~250 | `id`, `username`, `password_hash` (bcrypt), `role` (admin/teacher/accountant/parent), `linked_id`, `email`, `status`, `last_login` |

### Academic Structure (10)

`academic_years`, `terms`, `classes` (15 classes, gemstone-themed names), `subjects` (~70), `departments`, `class_progression_rules`, `subject_registrations`, `class_whatsapp_groups`, `class_timetable` (8 periods), `exam_timetable`

### Assignments & Relationships (4)

`subject_assignments` (~1,300 records), `class_teacher_assignments`, `parent_student_links` (~600, many-to-many with relationship type), `student_promotions`

### Academic Scoring (6)

`scores` (~8,800 records — `ca1`, `ca2`, `exam`, `total` GENERATED column, `grade`, `status` workflow), `affective_domains` (6 traits 1–5), `psychomotor_domains` (10 traits 1–5), `compiled_results`, `assignments`, `assignment_submissions`

### CBT — Computer-Based Testing (5)

`cbt_exams`, `cbt_questions` (JSON options), `cbt_question_bank` (reusable), `cbt_attempts`, `cbt_answers`

### Financial (7)

`fee_structures` (GENERATED `total_fee`), `payments` (with reversal tracking), `student_fee_balances` (GENERATED `balance`), `student_term_invoices`, `scholarships`, `student_scholarships`, `bank_account_settings`

### Attendance (3)

`attendance` (UNIQUE on student+date), `attendance_backup`, `attendance_summary`

### Notifications (2)

`notifications` (JSON target_audience, read_by), `user_notifications`

### School Configuration (3)

`school_settings` (key-value), `signature_settings`, `file_uploads`

### System & Security (9)

`permissions` (37 definitions), `role_permissions`, `user_sessions`, `token_blacklist`, `password_reset_log`, `user_dashboard_responsibilities`, `school_calendar`, `manual_class_changes`, `student_domains` (view)

### Audit & Monitoring (5)

`activity_logs` (~8,500 events), `data_change_logs` (JSON snapshots), `security_logs` (JSON details), `performance_logs`, `realtime_events`

### Views (5)

`class_performance_summary`, `data_changes_summary`, `security_events_summary`, `student_domains` (UNION of affective + psychomotor), `student_summary` (joins students+classes+parents+fees), `teacher_assignments`

### Key Database Patterns

- **Generated columns**: `fee_structures.total_fee` (sum of 7 components), `scores.total` (ca1+ca2+exam), `student_fee_balances.balance` (fee - paid) — all STORED
- **JSON columns**: `teachers.specialization`, `cbt_questions.options_json/correct_answer_json`, `notifications.target_users/read_by`, `data_change_logs.old_values/new_values`, `security_logs.details`, `realtime_events.payload`
- **Check constraints**: `affective_domains`/`psychomotor_domains` traits (1–5), `class_timetable.period` (1–8)
- **Cascade deletes**: All child tables (scores, attendance, payments, results, links, etc.) cascade on parent delete
- **UNIQUE constraints**: `attendance (student_id, date)`, `affective_domains (student_id, class_id, term, academic_year)`, `/psychomotor_domains` (same), `academic_years.year`
- **Status ENUMs**: `Active/Inactive` (most entities), `Draft/Submitted/Approved/Rejected` (scores, results), `Present/Absent/Late/Excused` (attendance), `Pending/Verified/Rejected` (payments)
- **Polymorphic `linked_id`**: `users.linked_id` + `users.role` references different entity tables (teachers/parents/accountants)
- **Partitioning**: All academic tables include `academic_year` (varchar, e.g. "2024/2025") + `term` (enum) columns

---

## CBT (Computer-Based Testing) Module

The CBT module provides a complete online examination engine integrated with the school management system.

### Architecture

```
CbtController.php (backend)
  ├── Exam CRUD (create/edit/delete/publish)
  ├── Question management (single_choice, true_false)
  ├── Question bank (reusable across exams)
  ├── Attempt tracking (in_progress → submitted → scored)
  ├── Auto-scoring + manual override
  ├── AI question generation from study materials
  ├── Bulk import questions
  └── Score feeding → results system

Database (5 tables)
  ├── cbt_exams — exam definitions (duration, schedule, score_slot)
  ├── cbt_questions — questions per exam (JSON options)
  ├── cbt_question_bank — reusable question library (tags, difficulty)
  ├── cbt_attempts — student attempts (status, score, percentage)
  └── cbt_answers — individual answers (JSON answer, is_correct, marks)
```

### Workflow

```
Admin creates exam → Configure: title, class, subject, duration,
schedule, total marks, score slot (first_test/second_test)
    ↓
Add questions: single_choice (options via JSON) or true_false
    ↓
Reuse from question bank or create new
    ↓
Publish exam → Students can take it during scheduled time window
    ↓
Student starts attempt → Timer begins
    ↓
Student answers questions (one by one or review-all)
    ↓
Auto-save on each answer
    ↓
Submit → System auto-grades → Score calculated (percentage + remark)
    ↓
Feed scores into results system (first_test/second_test score slots)
```

### Question Bank

- Reusable questions tagged by subject, class, topic, difficulty (easy/medium/hard)
- AI generation: upload study material → auto-generate questions
- Bulk import: upload questions in bulk via file

---

## Security

### Apache Security Headers (`.htaccess`)

The system implements defense-in-depth via Apache `mod_headers`:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com...` | Prevents XSS and data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts API access |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Isolates cross-origin resources |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context |

### Authentication Security

- **Password hashing**: bcrypt via `password_hash()` with `PASSWORD_DEFAULT`
- **Legacy plaintext upgrade**: Parent accounts with plaintext passwords are auto-upgraded to bcrypt on first login
- **Rate limiting**: 5 login attempts per 15-minute window via APCu (in-memory) or file fallback
- **JWT**: HS256 signed tokens with 24h expiry + 48h grace period for refresh
- **CORS**: Whitelist-based — only known origins
- **Activity logging**: All authentication events logged to `activity_logs` table with IP address

### API Security

- All protected endpoints require `Authorization: Bearer <token>` header
- Role-based middleware (`requireRole`, `requireAnyRole`) enforced on every controller
- Input sanitization: `htmlspecialchars(strip_tags(trim()))` on string inputs
- SQL injection protection: PDO prepared statements with bound parameters
- File upload validation: MIME type, extension whitelist, 5MB max size
- Directory browsing disabled (`Options -Indexes`)
- Server signature hidden (`ServerSignature Off`)
- Global error suppression in production (silences 401/403 in browser console)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PHP 8.0+
- MySQL / MariaDB
- Apache (with `mod_rewrite`) or Nginx

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Production build
npm run build --mode production

# Preview production build
npm run preview
```

### Backend Setup

1. **Import the database:**
   ```bash
   mysql -u root -p graceland_academy < database/mdpjhtua_graceland_academy.sql
   ```

2. **Configure `api/.env`:**
   ```env
   DB_HOST=localhost
   DB_NAME=graceland_academy
   DB_USER=root
   DB_PASS=

   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRY=24

   CORS_ORIGINS=http://localhost:3000,http://localhost:5173

   UPLOAD_PATH=../uploads
   MAX_FILE_SIZE=5242880

   SCHOOL_NAME=Graceland Royal Academy
   SCHOOL_EMAIL=info@gracelandacademy.com
   SCHOOL_PHONE=+234-800-000-0000

   APP_ENV=development
   APP_DEBUG=true
   APP_TIMEZONE=Africa/Lagos
   ```

3. **Configure frontend `.env`:**
   ```env
   VITE_API_BASE_URL=http://localhost/api
   VITE_APP_TITLE=Graceland Royal Academy
   VITE_APP_VERSION=1.0.0
   VITE_DEV_MODE=true
   ```

4. **Enable Apache rewrites:**
   - Ensure `mod_rewrite` is enabled
   - `.htaccess` files are provided in both root and `api/` directories

### Default Login

Default credentials are seeded in the database (refer to the `users` table after import).

---

## API Overview

All endpoints live under `/api/`. Authentication is via `Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login (username + password + role) | Public |
| POST | `/auth/student-login` | Student login | Public |
| POST | `/auth/logout` | Invalidate session | All |
| GET | `/auth/profile` | Current user profile | All |
| POST | `/auth/change-password` | Update password | All |
| POST | `/auth/refresh-token` | Refresh JWT | All |

### Students
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/students` | List all (role-filtered) | All (role-aware) |
| GET | `/students/{id}` | Get by ID | All (role-aware) |
| POST | `/students` | Create | Admin |
| PUT | `/students/{id}` | Update | Admin |
| DELETE | `/students/{id}` | Delete | Admin |
| GET | `/students/by-class/{class_id}` | Students in class | Admin, Teacher |
| GET | `/students/statistics` | Dashboard stats | Admin |
| POST | `/students/promote-students` | Bulk promote | Admin |
| POST | `/students/manual-class-change` | Manual reassignment | Admin |
| POST | `/students/affective-domains` | Save affective scores | Teacher |
| POST | `/students/psychomotor-domains` | Save psychomotor scores | Teacher |

*Same routes available under `/student/*` for backwards compatibility*

### Teachers
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/teachers` | List all | Admin |
| GET | `/teachers/{id}` | Get by ID | Admin |
| POST | `/teachers` | Create | Admin |
| PUT | `/teachers/{id}` | Update | Admin |
| DELETE | `/teachers/{id}` | Delete | Admin |
| GET | `/teachers/assignments/{teacher_id}` | Subject assignments | Admin |
| GET | `/teachers/students/{teacher_id}` | Class students | Admin |

### Classes
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/classes` | List all | All |
| POST | `/classes` | Create | Admin |
| PUT | `/classes/{id}` | Update | Admin |
| DELETE | `/classes/{id}` | Delete | Admin |
| GET | `/classes/students/{id}` | Students in class | Admin, Teacher |
| GET | `/classes/subjects/{id}` | Subjects for class | Admin, Teacher |
| GET | `/classes/statistics/{id}` | Class stats | Admin |
| GET | `/classes/by-level/{level}` | Classes by level | All |
| GET | `/classes/whatsapp-groups` | WhatsApp groups | All |
| GET | `/classes/public-list` | Public class list | Public |

### Parents
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/parents` | List all | Admin |
| POST | `/parents` | Create | Admin |
| PUT | `/parents/{id}` | Update | Admin |
| DELETE | `/parents/{id}` | Delete | Admin |
| GET | `/parents/children/{parent_id}` | Linked children | All (role-aware) |
| POST | `/parents/link/{parent_id}` | Link to student | Admin |
| DELETE | `/parents/unlink/{parent_id}/{student_id}` | Unlink | Admin |

### Subjects
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/subjects` | List all | All |
| POST | `/subjects` | Create | Admin |
| PUT | `/subjects/{id}` | Update | Admin |
| DELETE | `/subjects/{id}` | Delete | Admin |
| POST | `/subjects/assign` | Assign to teacher+class | Admin |
| GET | `/subjects/assignments` | All assignments | Admin |
| GET | `/subjects/category/{category}` | By category | All |

### Results / Scores
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/results/scores/{assignment_id}` | Get scores by assignment | Teacher, Admin |
| GET | `/results/scores/by-term` | Scores by term | Teacher, Admin |
| POST | `/results/scores` | Create/update (upsert) | Teacher |
| POST | `/results/scores/approve/{id}` | Approve score | Admin |
| POST | `/results/scores/reject/{id}` | Reject score | Admin |
| POST | `/results/submit/{assignment_id}` | Submit for approval | Teacher (Class) |
| GET | `/results/student/{student_id}` | Student results | All (role-aware) |
| POST | `/results/compile` | Compile results | Teacher (Class) |
| POST | `/results/compile-cumulative` | Cumulative compilation | Teacher |
| GET | `/results/compiled` | All compiled results | Admin |
| POST | `/results/approve/{result_id}` | Approve compilation | Admin |
| POST | `/results/reject/{result_id}` | Reject compilation | Admin |
| DELETE | `/results/compiled/{id}` | Delete compiled result | Admin |
| GET | `/results/cumulative/{student_id}` | Cumulative results | All (role-aware) |
| GET | `/results/pending-approvals` | Pending approvals | Admin |
| GET | `/results/cumulative/class/{class_id}` | Class cumulative | Admin, Teacher |

### Payments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/payments` | List all | Admin, Accountant |
| POST | `/payments` | Create | Admin, Accountant |
| POST | `/payments/verify/{id}` | Verify/reject | Admin, Accountant |
| POST | `/payments/reverse/{id}` | Reverse payment | Admin, Accountant |
| POST | `/payments/online-init` | Initialize Paystack | Parent |
| POST | `/payments/bank-transfer-proof` | Upload proof | Parent |
| GET | `/payments/student/{id}/history` | Student history | All (role-aware) |
| GET | `/payments/student/{id}/balance` | Fee balance | All (role-aware) |
| GET | `/payments/reports` | Payment reports | Admin, Accountant |
| GET | `/payments/reconciliation-summary` | Reconciliation | Admin, Accountant |
| GET | `/payments/exceptions` | Payment exceptions | Admin, Accountant |

### Attendance
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/attendance` | List all | Admin, Teacher |
| GET | `/attendance/{date}` | By date | Teacher, Admin |
| POST | `/attendance` | Mark/bulk | Teacher (Class) |
| GET | `/attendance/student/{id}` | Student summary | All (role-aware) |
| GET | `/attendance/class/{id}` | Class summary | Teacher, Admin |
| GET | `/attendance/reports` | Attendance reports | Admin |

### Notifications
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/notifications` | List all | All |
| POST | `/notifications` | Create | Admin, Teacher, Accountant |
| POST | `/notifications/broadcast` | Broadcast | Admin |
| PUT | `/notifications/{id}` | Mark read | All |
| DELETE | `/notifications/{id}` | Delete | All |
| GET | `/notifications/unread-count` | Unread count | All |
| GET | `/notifications/user` | User's notifications | All |
| PUT | `/notifications/mark-all-read` | Mark all read | All |

### Assignments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/assignments` | List all | Teacher, Admin |
| POST | `/assignments` | Create | Teacher |
| PUT | `/assignments/{id}` | Update | Teacher |
| DELETE | `/assignments/{id}` | Delete | Teacher, Admin |
| POST | `/assignments/submit/{assignment_id}` | Submit | Student/Admin |
| PUT | `/assignments/grade/{submission_id}` | Grade | Teacher |

### CBT (Computer-Based Testing)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET/POST/PUT/DELETE | `/cbt/exams` | Exam CRUD | Admin, Teacher |
| GET/POST/PUT/DELETE | `/cbt/questions/{exam_id}` | Question CRUD | Admin, Teacher |
| GET/POST/DELETE | `/cbt/question-bank` | Question bank | Admin, Teacher |
| GET | `/cbt/student-exams` | Available exams | Student |
| POST | `/cbt/start/{exam_id}` | Start attempt | Student |
| POST | `/cbt/save-answer/{attempt_id}` | Save answer | Student |
| POST | `/cbt/submit/{attempt_id}` | Submit exam | Student |
| GET | `/cbt/results/{exam_id}` | Exam results | Admin, Teacher |
| POST | `/cbt/feed-scores/{exam_id}` | Feed to results | Admin, Teacher |
| POST | `/cbt/generate-questions` | AI generation | Admin, Teacher |

### Reports
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/reports/student` | Student report card PDF | All (role-aware) |
| POST | `/reports/class` | Class performance report | Admin, Teacher |
| GET | `/reports/financial` | Financial report | Admin, Accountant |
| GET | `/reports/attendance` | Attendance report | Admin, Teacher |

### System
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/school_settings` | Public school info | Public |
| POST | `/school_settings` | Update settings | Admin |
| GET | `/academic_years` | List academic years | All |
| GET | `/users` | List users | Admin |
| POST | `/users` | Create user | Admin |
| PUT | `/users/{id}` | Update user | Admin |
| DELETE | `/users/{id}` | Delete user (inactive only) | Admin |
| POST | `/users/reset-password/{id}` | Reset password | Admin |
| POST | `/files/upload` | Upload file | Admin |
| GET | `/realtime/stream` | SSE stream | All (authenticated) |
| POST | `/database/query` | Raw SQL | Admin |
| GET | `/class_teacher_assignments` | Class teacher assignments | All |
| GET | `/subject_registrations` | Subject registrations | All |
| GET | `/progression/rules` | Progression rules | Admin |
| POST | `/progression/rules` | Create rule | Admin |
| GET | `/` or `/info` | API metadata | Public |

---

## Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `/build` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run setup` | Install deps + type definitions |
| `npm run install-types` | Install Node/Vite type definitions |

---

## Deployment

A pre-packaged deployment is available in `final-deployment/`. To build fresh:

```bash
npm run build
```

**Deployment steps:**
1. Build the frontend: `npm run build`
2. Upload the `build/` directory to your web server root
3. Upload the `api/` directory to your web server root
4. Copy `.htaccess` files (root + `api/` directories)
5. Import the database dump
6. Configure `api/.env` with production credentials
7. Configure `api/.env.production` for production settings
8. Ensure `uploads/` directory is writable
9. Test the API: `GET /api/`
10. Configure your web server to rewrite all routes to `index.html` for the SPA

---

## Support

For issues, bug reports, or feature requests, please contact the development team.

**School:** Configure per deployment
**Website:** Configure per deployment
