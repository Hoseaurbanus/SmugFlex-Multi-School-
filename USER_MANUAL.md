# Graceland Academy School Management System — User Manual

> **Version:** 1.0 | **Last Updated:** May 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Admin Role](#3-admin-role)
   - 3.1 Dashboard
   - 3.2 Register User
   - 3.3 Manage Users
   - 3.4 Manage Students
   - 3.5 Link Student-Parent
   - 3.6 Manage Classes
   - 3.7 Manage Subjects
   - 3.8 Teacher Assignments
   - 3.9 Promotion System
   - 3.10 Results Management
   - 3.11 Exam Timetable
   - 3.12 CBT Exams
   - 3.13 Send Notifications
   - 3.14 View Messages
   - 3.15 Data Backup
   - 3.16 Settings
   - 3.17 Activity Logs
   - 3.18 Attendance Reports
4. [Teacher Role](#4-teacher-role)
   - 4.1 Dashboard
   - 4.2 Class List
   - 4.3 Enter Scores
   - 4.4 Compile Results
   - 4.5 Approve Scores
   - 4.6 Message Parents
   - 4.7 Change Password
   - 4.8 Exam Timetable
   - 4.9 CBT Exams
   - 4.10 Mark Attendance
   - 4.11 Student Domains
5. [Accountant Role](#5-accountant-role)
   - 5.1 Dashboard
   - 5.2 Set Fees
   - 5.3 Record Payments
   - 5.4 Verify Receipts
   - 5.5 Payment Reports
   - 5.6 Payment History
   - 5.7 Bank Settings
   - 5.8 Scholarships
   - 5.9 Message Parents
6. [Parent Role](#6-parent-role)
   - 6.1 Dashboard
   - 6.2 My Children
   - 6.3 Notifications
   - 6.4 Settings
   - 6.5 Fee Management
   - 6.6 Messages
7. [Student Role](#7-student-role)
   - 7.1 Dashboard
   - 7.2 My Exams
   - 7.3 My Results

---

## 1. Introduction

Graceland Academy School Management System is a comprehensive web-based platform for managing all aspects of a K-12 school. The system supports five user roles — **Admin**, **Teacher**, **Accountant**, **Parent**, and **Student** — each with a tailored dashboard and feature set.

**Key Capabilities:**
- User, student, class, and subject management
- Score entry with CBT integration and CSV import/export
- Results compilation, approval workflow (4-stage)
- Fee management: structures, payments, receipts, verification
- Exam timetable scheduling
- CB T (Computer-Based Testing) exam creation and delivery
- Attendance tracking
- Affective and psychomotor domain ratings
- Notification/messaging system
- Student promotion across academic levels
- Parent-teacher communication

---

## 2. Getting Started

### 2.1 Login

1. Navigate to the application URL in your browser
2. Enter your **Username** and **Password** provided by the school administration
3. Click the **Login** button
4. You will be redirected to your role-specific dashboard

### 2.2 Dashboard Layout

Every role's dashboard shares a common layout:
- **Left Sidebar** — Role-specific navigation menu (collapses on mobile)
- **Top Bar** — User name, role badge, notification bell with unread count, logout button
- **Main Content Area** — Displays the selected page or dashboard widgets

### 2.3 Global Actions

- **Notification Bell** (Top Bar) — Click to open a notification dialog showing all your notifications
- **Logout** (Sidebar bottom) — Ends your session
- **Change Password** (Top Bar or Settings page) — Update your login password

---

## 3. Admin Role

The Admin role has full access to all system features. The sidebar contains 16+ navigation items.

### 3.1 Dashboard

**Purpose:** System overview with key metrics and quick-access buttons.

**Statistics Cards (clickable):**
- **Total Students** — Count of active students. Click to open Manage Students
- **Teaching Staff** — Count of active teachers. Click to open Manage Users
- **Pending Results** — Number of results awaiting approval. Click to open Results Management
- **Notifications** — Unread notification count. Click to open View Messages

**Active Session Card:**
- Academic Session (e.g., "2025/2026")
- Current Term (e.g., "First Term")
- Status ("In Progress")

**Quick Actions Info:**
- Reference card summarizing sidebar features

**Floating Action Buttons (bottom-right):**
- **Orange Plus (+)** — Opens Register User
- **Green Database** — Opens Results Management

**Refresh Button** (top-right) — Reloads all dashboard data.

### 3.2 Register User

**Purpose:** Register new teachers, parents, or accountants with login credentials.

**Form Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| Select Role | Select | Yes | Teacher, Parent/Guardian, Accountant |
| Profile Photo | File (image) | No | JPG/PNG/GIF, max 5MB, 500x500px recommended |
| First Name | Text | Yes | |
| Last Name | Text | Yes | |
| Email | Email | No | Auto-generated if empty: `username@school.local` |
| Phone Number | Tel | Yes | |
| Username | Text | Yes | Real-time availability check |
| Password | Password | No | Default: `1234567` |

**Teacher-specific fields (shown when role=Teacher):**
| Field | Type | Notes |
|---|---|---|
| Qualification | Select | NCE, B.Ed, B.Sc, B.A, M.Ed, M.Sc, PhD |
| Assign as Class Teacher | Checkbox | When checked, shows Assigned Class dropdown |
| Assigned Class | Select | Active classes only |

**Accountant-specific fields:**
| Field | Type | Notes |
|---|---|---|
| Department | Text | Required, e.g., "Finance" |

**Buttons:**
- **Reset Form** — Clears all fields
- **Register [Role]** — Submits the registration

**Workflow:**
1. Select role → Role-specific fields appear
2. Optionally upload photo
3. Fill in personal details and username
4. Fill role-specific fields
5. Click **Register** → Success toast with username

### 3.3 Manage Users

**Purpose:** View, create, edit, delete, reset passwords, and toggle status for all system users.

**Statistics Cards:** Total Users, Active Users, Inactive Users, Admin Users.

**Filters:**
- **Role Filter Buttons:** All, Teachers, Parents, Accountants — each shows count
- **Search Input:** "Search by name, email, or phone..."

**Desktop Table Columns:**
| Column | Content |
|---|---|
| User | Name, email, phone |
| Role | Badge: Admin (red), Teacher (blue), Accountant (yellow), Parent (green) |
| Status | Active (green badge) / Inactive (red badge) |
| Last Login | Date or "Never" |
| Actions | View, Edit, Reset Password, Deactivate/Activate, Delete |

**Mobile Card View (block on small screens):**
Each card shows: Avatar initials, Name, Email, Role badge, Status badge, 5 action buttons in a grid.

**Action Buttons per user:**
- **View** (Eye icon) — Opens View User dialog
- **Edit** (Pencil icon) — Opens Edit User dialog
- **Reset Password** (Key icon) — Opens Reset Password confirmation
- **Deactivate/Activate** (UserX/UserCheck icon) — Toggles user status
- **Delete** (Trash2 icon) — Opens Delete User confirmation (with role-specific warnings)

**Top Buttons:**
- **Create User** (+ icon) — Opens Create User dialog (same form as Register User with additional fields)
- **Export** (FileText icon) — Placeholder for CSV export

**Create User Dialog Fields:**
- Username (required), Password (optional, default: `{role}123`)
- Role: Admin, Teacher, Accountant, Parent
- First Name, Last Name (required), Email (required), Phone
- **Teacher-specific:** Gender (Male/Female, required), Qualification, Specialization, Department, Is Class Teacher checkbox, Assigned Class
- **Parent-specific:** Address (required), Alternate Phone, Occupation (required)
- **Accountant-specific:** Department
- **Status:** Active/Inactive

**Edit User Dialog:** All fields editable, role changeable, status toggle.

**View User Dialog:** Read-only display of all user info.

**Reset Password Dialog:** Confirmation with checkboxes for "Send via Email" / "Send via SMS".

**Deactivate/Activate Dialog:** Confirmation with warning about system access.

**Delete User Dialog:** Confirmation with role-specific data loss warnings.

**Workflow:**
1. Search/filter users by role or name
2. Click action icons on any row/card
3. Create new users via **Create User** button

### 3.4 Manage Students

**Purpose:** View, add, edit, delete, bulk delete, link/unlink guardians, reset passwords, upload photos, import/export students.

**Statistics Cards:** Total, Active, Primary, Secondary.

**Views:** Card view (mobile default) and Table view toggle.

**Filters:** Search (name/admission), Level select, Class select, "Clear Filters" button.

**Bulk Selection:** Select All checkbox + individual checkboxes. When items selected: shows count bar with "Clear Selection" and "Delete Selected" buttons.

**Desktop Table Columns:**
Admission Number, Student Name (First+Last), Class, Gender, Status, Guardian, Actions (View, Edit, Manage Guardian, Reset Password, Photo, Delete).

**Add Student Dialog:**
- Admission Number (auto-generated)
- First Name, Last Name, Other Name
- Gender (Male/Female)
- Date of Birth (date picker)
- Class (dropdown of active classes)
- Address (textarea)
- Parent Phone
- Status (Active/Inactive/Transferred/Graduated)
- Photo upload

**Edit Student Dialog:** Same fields as Add, pre-filled.

**Manage Guardian Dialog:** Search and link existing parents to the student.

**Bulk Delete Dialog:** Confirmation with count of students to delete.

**Workflow:**
1. Search/filter by name/admission/level/class
2. Click **Add Student** to create new
3. Use row actions: View, Edit, Manage Guardian, Reset Password, Upload Photo, Delete
4. Checkbox select → Bulk Delete Selected

### 3.5 Link Student-Parent

**Purpose:** Link students to parent/guardian accounts so parents can view results and manage fees.

**Filters:** Search by student name, parent name, or class.

**Table Columns:** Student Name (with admission number), Class, Current Guardian, Linked Parents.

**Action per row:** **Link Parent** button — Opens a dialog to search and link a parent.

**Link Dialog:**
- Search for parent by name or username
- Select parent from results
- Click Link

**Workflow:**
1. Search for a student
2. Click **Link Parent** on the row
3. Search and select the parent
4. Confirm link

### 3.6 Manage Classes

**Purpose:** View, create, edit, and manage classes with capacity tracking.

**Grid View:** Each class displayed as a card with:
- Class name, level, category, section
- Student count / Capacity (with progress bar, color-coded: green <80%, yellow 80-90%, red >90%)
- Status badge (Active/Inactive)
- Actions: Edit, Delete

**Filters:** Search, Level (Nursery/Primary/Secondary), Category, Status.

**Create/Edit Class Dialog:**
- Class Name (text, required)
- Level (select: Nursery/Primary/Secondary, required)
- Category (select: Creche/Playgroup/Nursery 1-3/Primary 1-6/JSS 1-3/SS 1-3, required)
- Section (text)
- Capacity (number, required)
- Status (Active/Inactive)
- Description (textarea)

**Delete Class Dialog:** Confirmation with warning about associated data.

**Workflow:**
1. View all classes in grid
2. Create new via **Add Class** button
3. Edit or Delete via card action buttons

### 3.7 Manage Subjects

**Purpose:** Manage school subjects with category grouping, status toggle, and CSV export.

**Filters:** Search by subject name or code, Category filter.

**Table Columns:**
| Column | Content |
|---|---|
| Subject Name | With code |
| Category | Badge: Core/Elective/Other |
| Class | Applicable class |
| Status | Active/Inactive (toggle) |
| Actions | Edit, Delete |

**Create/Edit Subject Dialog:**
- Subject Name (required)
- Subject Code (required, e.g., "MTH101")
- Category (Core/Elective/Other)
- Applicable Class (dropdown)
- Description (textarea)
- Status (Active/Inactive)

**CSV Export** — Downloads all subjects as CSV.

**Workflow:**
1. Search/filter subjects
2. Click **Add Subject** to create
3. Toggle status inline or Edit/Delete

### 3.8 Teacher Assignments

**Purpose:** Assign subject teachers and class teachers to classes for the current term.

**Tabs:**
- **Subject Teachers** — Assign teachers to subjects for each class
- **Class Teachers** — Assign class teachers (homeroom teachers)

**Subject Teachers Tab:**
- Select Class → Shows list of subjects
- For each subject: dropdown to select a teacher
- **Save Assignments** button

**Class Teachers Tab:**
- Select Class → Shows current class teacher
- Change teacher via dropdown
- **Save Assignment** button

**Workflow:**
1. Go to Subject Teachers tab
2. Select class → For each subject, choose a teacher from dropdown
3. Click **Save Assignments**
4. Repeat for Class Teachers tab

### 3.9 Promotion System

**Purpose:** Promote students from one class/level to the next based on academic performance.

**Promotion Rules Configuration:**
- Select **From Class** and **To Class**
- Set **Passing Percentage** (minimum average to pass)
- Choose **Promotion Type**: Automatic (all pass), By Performance (pass/fail based on score), Custom Selection
- Set Term/Academic Year

**Eligibility Calculation:**
- Button: **Calculate Eligibility** — analyzes all students in the source class
- Shows per-student: Name, Current Average, Status (Eligible/Not Eligible/At Risk)

**Promotion Statuses:**
- Pending, Eligible, Not Eligible, Promoted, Retained, Graduated, Transferred, At Risk

**Promotion Execution:**
- Select individual students or **Select All**
- **Promote Selected** — moves students to the target class
- **Retain Selected** — keeps students in current class
- **Reset Promotions** — undoes promotions for the batch

**Target Class Selector:** Dropdown showing available classes at the next level.

**Workflow:**
1. Select source class and target class
2. Set passing criteria
3. Click **Calculate Eligibility**
4. Review eligible/not eligible students
5. Select students and click **Promote Selected**
6. Confirm promotion

### 3.10 Results Management

**Purpose:** Full results approval workflow — review, approve, reject, and view compiled results. 2,632-line component with 5 tabs.

**Tabs:**
1. **Pending Approval** — Results submitted by teachers awaiting admin review
2. **Approved** — Results that have been approved and published
3. **Rejected** — Results sent back to teachers for correction
4. **All Results** — Complete list of all compiled results
5. **Cumulative** — Multi-term aggregated results per student

**Filters (per tab):**
- Search by student name or admission number
- Class filter
- Term filter
- Academic year filter

**Pending Approval Workflow:**
- Each result card shows: Student name, Class, Term, Total/Average score, Position, Subject breakdown
- **View Details** — Opens full result detail
- **Approve** — Approves and publishes the result (makes it visible to parents/students)
- **Reject** — Opens dialog to enter rejection reason, sends notification to teacher

**Approval Stages (4-stage):**
1. Teacher enters scores → Status: Draft
2. Teacher submits for approval → Status: Submitted
3. Class teacher approves scores → Status: Score Approved
4. Admin reviews compiled result → Status: Approved/Rejected

**Full Page Result View:**
- School header with logo
- Student info (name, class, term, admission number)
- Subject scores table (subject, CA1, CA2, Exam, Total, Grade, Position)
- Affective domain ratings
- Psychomotor domain ratings
- Attendance (times present/absent)
- Class teacher's comment
- Principal's comment
- Download PDF button

**Cumulative Tab:**
- Select student → Shows term-by-term results for the academic year
- Aggregate scores and position across terms

**Workflow:**
1. Review results in Pending Approval tab
2. Click **View Details** to see full result
3. Click **Approve** to publish or **Reject** with reason
4. Approved results become visible to parents/students

### 3.11 Exam Timetable

**Purpose:** Create and manage the school's end-of-term examination timetable.

**Create Exam Entry Form:**
- **Class** (select)
- **Subject** (select — filtered by selected class)
- **Exam Date** (date picker)
- **Start Time** (time picker)
- **End Time** (time picker)
- **Venue/Hall** (text)
- **Invigilator** (select — list of teachers)
- **Exam Type** (select: Theory, Objective, Both)
- **Instructions** (textarea, optional)

**Timetable Display:**
- Grouped by date, sorted by time
- Each entry shows: Subject, Class, Time (Start-End), Venue, Invigilator, Type
- Summary: Total exams, exam days, first/last date

**Buttons:**
- **Add Exam** — Adds the entry to the timetable
- **Edit** (per entry) — Opens edit form
- **Delete** (per entry) — Removes the entry
- **Download CSV** — Exports timetable

**Workflow:**
1. Fill in exam entry form
2. Click **Add Exam**
3. View complete timetable grouped by date
4. Edit or delete entries as needed

### 3.12 CBT Exams

**Purpose:** Create and manage Computer-Based Testing (CBT) exams. Entry point to question editor and results view.

**Exam List (Table):**
| Column | Content |
|---|---|
| Title | Exam name |
| Subject | Subject name |
| Class | Target class |
| Duration | Minutes |
| Total Marks | Max score |
| Feed Into | Badge: CA2 (if feeds into score slot) |
| Questions | Count |
| Status | Active/Archived badge |
| Actions | Questions, Results, Edit, Publish/Unpublish, Archive, Delete |

**Buttons:**
- **Create Exam** — Opens CBT exam creation form
- **Search** — Filter by title, subject, or class
- **Status Filter** — All, Active, Archived
- **Pagination** — 15 per page

**Create/Edit Exam Form (CbtExamForm):**
- Title (required)
- Subject (select)
- Class (select)
- Duration (minutes, number)
- Total Marks (number)
- Instructions (textarea)
- Feed Into Score Slot (select: none/CA2)
- Status (Active/Archived)
- Published checkbox — Controls student visibility

**Question Editor:**
- Add questions one by one
- Each question: Question text, Option A/B/C/D, Correct answer
- Supports multiple choice only

**Results View:**
- Per-student: Name, Score, Percentage, Grade
- Class average, highest, lowest

**Exam Player (student-facing):**
- Full-screen timed exam interface
- Question navigation (Previous/Next)
- Question palette (answered/unanswered color coding)
- Auto-submit on time expiration
- Results summary after submission

**Workflow:**
1. Click **Create Exam** → Fill form → Save
2. Click **Questions** → Add questions with options and correct answer
3. Click **Publish** to make available to students
4. Students take exam → Results auto-populate
5. Click **Results** to view scores (can feed into Score Entry as CA2)

### 3.13 Send Notifications

**Purpose:** Send broadcast notifications to users by role.

**Form Fields:**
| Field | Type | Notes |
|---|---|---|
| Notification Title | Text | Required |
| Recipients | Select | All Users, All Teachers, All Parents, All Accountants, Custom Selection |
| Priority | Select | Info, Success, Warning, Urgent |
| Message | Textarea | Required |

**Custom Selection:** When "Custom Selection" chosen, checkboxes for Teachers, Parents, Accountants.

**Notification Analytics Sidebar:**
- Sent This Week count
- Total Sent count
- Read Rate (%)
- Delivery Rate (%)

**Recent Notifications:** List of last 10 sent notifications with priority badge, title, date.

**Workflow:**
1. Enter title, select recipients, choose priority
2. Write message
3. Click **Send Notification**

### 3.14 View Messages

**Purpose:** View all system notifications, filter by read/unread, manage WhatsApp groups (admin only).

**Notification Display:**
- Notifications shown as cards, sorted newest first
- Each card: Title, Type badge, Date, Message preview, Read/Unread indicator

**Unread Section:** Separate "Unread Notifications" section if unread > 0.

**Filters:**
- Inline "Mark Read" button per notification
- Delete button per notification (soft delete)

**Detail Modal:** Click a notification to open full detail with title, badge, date/time, message body, audience, status.

**Admin-only: WhatsApp Groups Section:**
- Fetches all WhatsApp group links
- Each group card: Group name, Class name, **Join Group** button (opens link in new tab)

**Workflow:**
1. View notification list
2. Click **Mark Read** to acknowledge
3. Click notification for full detail
4. Delete to dismiss

### 3.15 Data Backup

**Purpose:** Manage database backups — create, download, and restore.

**Backup List Table:**
| Column | Content |
|---|---|
| Filename | Backup file name |
| Size | File size |
| Date Created | Timestamp |
| Status | Success/Failed badge |
| Actions | Download, Restore, Delete |

**Buttons:**
- **Create Backup** — Generates a new database backup
- **Download** (per backup) — Downloads the backup file
- **Restore** (per backup) — Restores database from backup (with confirmation)
- **Delete** (per backup) — Removes backup file

**Workflow:**
1. Click **Create Backup** to generate
2. Use **Download** for offsite storage
3. **Restore** to rollback (with confirmation dialog)

### 3.16 Settings

**Purpose:** Configure school information, term dates, logo, signature uploads, and system preferences. (1,138 lines)

**Sections:**

**School Information:**
- School Name (text, required)
- School Address (textarea)
- School Phone (text)
- School Email (email)
- School Motto (text)
- School Website (url)

**Academic Session:**
- Current Academic Year (text, e.g., "2025/2026")
- Current Term (select: First/Second/Third)
- Term Start Date (date picker)
- Term End Date (date picker)
- Next Term Start Date (date picker)

**Uploads:**
- **School Logo** — Image upload (used on reports and PDFs)
- **Principal's Signature** — Image upload (used on result sheets)
- **Principal's Name** — Text field
- **Principal's Title** — Text field

**System Preferences:**
- Enable/Disable features
- Default page size
- Session timeout duration

**Buttons:**
- **Save Settings** — Saves all configuration
- **Reset to Defaults** — Reverts changes

**Workflow:**
1. Update any fields in any section
2. Upload logo or signature images
3. Click **Save Settings**

### 3.17 Activity Logs

**Purpose:** View a filtered audit trail of all system activities.

**Filters:**
- User (select)
- Action type (select: Create, Update, Delete, Login, Logout)
- Date range (from/to)
- Search (keyword)

**Table Columns:**
| Column | Content |
|---|---|
| Timestamp | Date and time |
| User | Username and role |
| Action | Create/Update/Delete/Login/Logout |
| Description | Details of the action |
| IP Address | Source IP |

**Workflow:**
1. Apply filters (user, action, date range)
2. View activity entries
3. Use for audit and compliance

### 3.18 Attendance Reports

**Purpose:** View attendance statistics and reports across classes and terms.

**Filters:**
- Class (select)
- Term (select)
- Academic Year (select)
- Student (search)

**Statistics Cards:**
- Average Attendance Rate (%)
- Total Students Tracked
- Classes with >90% Attendance
- Classes with <75% Attendance

**Display:**
- Per-student attendance: Name, Class, Days Present, Days Absent, Total Days, Percentage
- Color-coded: Green (≥90%), Amber (75-89%), Red (<75%)

**Buttons:**
- **Export CSV** — Download attendance data
- **Print Report** — Print-friendly view

**Workflow:**
1. Select class and term
2. View per-student attendance rates
3. Export or print as needed

---

## 4. Teacher Role

The Teacher role has responsibility-specific sidebar items. Class teachers have additional features (Class List, Compile Results, Approve Scores, Mark Attendance, Domains).

### 4.1 Dashboard

**Purpose:** Overview of teacher's assigned classes, subjects, and students.

**Statistics Cards:**
- **Classes Assigned** — Number of classes the teacher teaches
- **Total Students** — Sum of students across all assigned classes
- **Class Teacher Role** — Number of classes where teacher is class teacher
- **Subject Assignments** — Total subjects being taught
- **Class Teacher Status** — Active/Not Assigned

**Classes & Subjects Card:**
- Each assigned class shown with: Class name, Level, Student count, Subjects count
- Subject list (badges)
- **View Students** button → Opens Class List
- **Enter Scores** button → Opens Score Entry (only shown if subjects assigned)

**Refresh Button** — Reloads dashboard data.

**Load Error Banner:** If data fails to load, shows error with **Retry** button.

### 4.2 Class List (Class Teacher only)

**Purpose:** View, search, filter, and export the class teacher's class list with performance/attendance stats.

**Statistics Cards (top):** Total Students, Male count, Female count, Avg Attendance %, Class Average %.

**Filters:** Class selector, Search (name/admission/parent), Gender toggle (All/Male/Female), Page size (10/20/50).

**Student Card Display (per student):**
- Position (#, 🏆, 🥈, 🥉 — color-coded)
- Avatar (initials or photo)
- Name, Admission#, Gender badge
- Score percentage with color coding (≥70 green, ≥50 amber, <50 red)
- Attendance progress bar (≥90 green, ≥75 amber, <75 red)
- Action dropdown (3 dots): View Details, Message Parent, View Result

**Student Details Dialog (click card):**
- Avatar, Name, Admission#, Gender, Position, DOB
- Average Score, Attendance %
- Parent info: Name, Phone, Email
- Buttons: **Message** (placeholder), **View Result** (placeholder)

**Buttons:** CSV export, Previous/Next pagination.

**Workflow:**
1. Select class
2. View stats + student cards
3. Search/filter as needed
4. Click student card for details
5. Export CSV if needed

### 4.3 Enter Scores

**Purpose:** Enter/mark student assessment scores (CA1, CA2, Exam) for assigned subjects. (799 lines)

**Filters (top):**
- **Class** (select — teacher's assigned classes only)
- **Subject** (select — subjects for selected class)
- **Term** (auto-filled)
- **Academic Year** (auto-filled)

**Score Entry Table Columns:**
| Column | Notes |
|---|---|
| S/No | Row number |
| Reg ID | Student registration/admission number |
| Student Name | Full name |
| 1st CA [20] | Numeric input, max 20 |
| 2nd CA [20] | Numeric input, max 20 |
| Exam [60] | Numeric input, max 60 (100 for Creche) |
| Total [100] | Auto-calculated |
| Status | Draft/Pending Review/Approved/Rejected badge |
| Actions | CBT Override toggle (if CBT exams exist) |

**CBT Integration:** If CBT exams exist for the subject, a **CBT Override** toggle per student replaces manual scores with auto-computed CBT scores.

**Buttons:**
- **Export CSV** — Downloads scores as CSV with proper headers
- **Import CSV** — File upload for batch score import (strict header validation)
- **Refresh** — Reloads scores from database
- **Submit for Approval** — Changes status from Draft to Submitted
- **Toggle Edit Mode** — Enables editing of already-submitted or rejected scores
- **Resubmit** — Resubmits corrected rejected scores

**Auto-Save:** Every 2 seconds with debounce. Auto-refresh every 5 minutes.

**Score Validation:**
- CA1: 0-20, CA2: 0-20, Exam: 0-60 (or 0-100 for Creche)
- Creche classes: Exam only (no CA1/CA2)

**Workflow:**
1. Select class → Select subject
2. Enter scores for each student (or Import CSV)
3. Scores auto-save every 2 seconds
4. Click **Submit for Approval** when ready
5. If rejected, toggle Edit Mode → Correct → Resubmit

### 4.4 Compile Results (Class Teacher only)

**Purpose:** Compile final term results — combine scores, domain ratings, and attendance into a report card.

**Class Selector:** Dropdown of class-teacher-assigned classes.

**Student List:** Each student shows:
- Name, Admission Number
- Scores completed (X/Y subjects)
- Affective indicator (heart icon — green if rated)
- Psychomotor indicator (star icon — green if rated)
- Status badge: Submitted, Needs Resubmit, Ready, Pending

**Click Student → Detail View:**
- **Subject Scores:** Read-only table of all subjects with CA1, CA2, Exam, Total
- **Affective Domains:** Read-only display of 5 domains (Attentiveness, Honesty, Neatness, Obedience, Responsibility) rated 1-5
- **Psychomotor Domains:** Read-only display of 6 domains (Attention, Consideration, Handwriting, Sports, Verbal Fluency, Independence) rated 1-5
- **Class Teacher's Comment:** Auto-generated based on average score (Excellent → Fail), editable
- **Principal's Comment:** Auto-generated

**Comment Templates:** Based on average score range:
- 80-100: Excellent, 70-79: Very Good, 60-69: Good, 50-59: Average, 40-49: Below Average, <40: Poor
- Position-based templates (top, upper, middle, lower)
- Constructive feedback templates per level

**Buttons:**
- **Refresh Data** — Reloads all data from API
- **Generate Results** — Validates and generates results for the class
- **Submit** (per student) — Submits selected student's result
- **Submit All (N)** — Bulk submits all eligible students

**Workflow:**
1. Select class → Students load with completion status
2. Click student → View scores/domains/attendance
3. Review/Edit auto-generated comment
4. Click **Submit** or **Submit All**
5. If rejected: Edit scores/domains → Resubmit

### 4.5 Approve Scores (Class Teacher only)

**Purpose:** Review and approve/reject scores submitted by subject teachers for the class teacher's class.

**Filters:**
- Search (global — by student, subject, class, or teacher)
- Class filter
- Subject filter
- Student filter (popover with search)
- Status filter (Pending Review, Rejected, Approved, All)
- Show/Hide Filters (mobile)

**Score Cards (per submitted score):**
- Checkbox (for bulk select)
- Student Name, Class, Subject, Teacher name
- Score breakdown: CA1, CA2, Exam (each in colored boxes)
- Total score, Grade (A-F color-coded)
- Status badge: Pending Review (blue), Rejected (red), Approved (green), Draft (gray)
- Rejection details (if rejected): reason + date
- Teacher's remark (if present)
- Submitted date

**Buttons:**
- **Refresh** — Reloads scores
- **Approve Selected (N)** — Bulk approve all checked scores
- **Approve** (green, per card) — Approve individual score
- **Reject** (red outline, per card) — Opens reject dialog
- **View Details** (blue outline, per card) — Placeholder

**Reject Score Dialog:**
- Shows: Student name, Subject, Class, Score total
- **Rejection Reason** textarea (required)
- **Reject Score** / **Cancel** buttons

**Auto-Refresh:** Polls every 2 minutes + on tab focus/visibility change.

**Notifications:** Teachers are auto-notified on approve/reject.

**Workflow:**
1. Filter scores by class/subject/student/status
2. Review each score card
3. Click **Approve** to accept or **Reject** with reason
4. Or bulk approve using checkboxes + **Approve Selected**

### 4.6 Message Parents

**Purpose:** Send messages/notifications to parents of students in the teacher's classes.

**Form Fields:**
| Field | Type | Notes |
|---|---|---|
| Recipient Type | Select | Single Student Parent / All Parents in Class / All Parents |
| Student Search | Text | Search by name |
| Student Select | Select | Shows class + parent name |
| Class Select | Select | Shows parent count |
| Priority | Select | Normal / High Priority / Urgent |
| Subject | Text | Required |
| Message | Textarea | Required |
| Photo Upload | File (image) | Multiple, max 3 |

**Quick Template Buttons:**
- **Parent Meeting Request**
- **Homework Reminder**
- **Behavior Update**
- **Absence Notification**

**Sent Messages Sidebar (right side):**
- Each message: Subject, Priority badge, Attachment count, Date, Recipient count, Sender, Message preview

**Workflow:**
1. Select recipient type
2. Choose student or class
3. Optionally click a Quick Template
4. Write subject + message
5. Optionally upload photos (max 3)
6. Click **Send Message**

### 4.7 Change Password

**Purpose:** Change account password.

**Form Fields:**
- **Current Password** — Password input with show/hide toggle
- **New Password** — Password input (min 6 chars)
- **Confirm Password** — Must match New Password

**Buttons:**
- **Show/Hide** (eye icon per field)
- **Reset** — Clears form
- **Change Password** — Submits

**Validation:** Inline errors for required fields, minimum length, password match.

**Workflow:**
1. Enter current password
2. Enter new password (min 6 chars)
3. Confirm new password
4. Click **Change Password**

### 4.8 Exam Timetable

**Purpose:** View the school's examination timetable for the teacher's classes. (Shared component with parents/students)

**Class Selector:** Shows only the teacher's assigned classes.

**Display:**
- **Summary Card:** Total Exams, Exam Days, First Exam date, Last Exam date
- **Per Day:** Day name, Date, Exam count badge
- **Per Exam:** Subject, Exam type badge, Class name, Duration badge, Start-End time, Venue, Instructions

**Guidelines Card:** 5 examination rules listed.

**Button:** **Download** — Exports timetable as CSV.

### 4.9 CBT Exams

**Purpose:** View CBT exams and take exams assigned to the teacher (same component as admin CBT exam list).

### 4.10 Mark Attendance (Class Teacher only)

**Purpose:** Record term attendance days for each student.

**Form Controls:**
- **Class Selector** — "Choose class..." with student count
- Per student: **Days Present** (numeric input, max = requiredDays), **Remarks** (shown for low attendance)

**Quick Fill Buttons:**
- **Mark All Full Attendance** — Sets all to required days
- **Mark All Zero** — Sets all to 0
- **Clear All** — Resets all inputs
- Per student: **0**, **½**, **Full** buttons

**Student Display:**
- Avatar, Name, Admission#, Gender
- Attendance % badge (color-coded: ≥75 green, ≥50 secondary, <50 red)
- Days present / required days

**Real-Time Save:** Each keystroke saves to database automatically.

**Low Attendance Notifications:** Automatically sent to parents when attendance <75%.

**Workflow:**
1. Select class
2. Enter days present for each student (auto-saves)
3. Use quick-fill buttons for bulk operations
4. Low attendance triggers parent notification

### 4.11 Student Domains (Class Teacher only)

**Purpose:** Record affective (behavior) and psychomotor (skills) domain ratings.

**Tabs:** **Affective** | **Psychomotor**

**Affective Domains (5):** Attentiveness, Honesty, Neatness, Obedience, Sense of Responsibility

**Psychomotor Domains (6):** Attention to Direction, Consideration for Others, Handwriting, Sports, Verbal Fluency, Works Well Independently

**Per Domain Rating:** Select 1-5 with color coding:
- 5 = Excellent (green), 4 = Very Good (blue), 3 = Good (yellow), 1-2 = Poor/Fair (red)

**Per Domain Remark:** Textarea (optional)

**Student Cards (collapsible):**
- Header: Avatar, Name, Admission#, Gender, Overall rating badge (Needs Improvement/Good/Very Good/Excellent)
- Expanded: Grid of domains with Select + Badge + Textarea

**Buttons:**
- **All Excellent** — Bulk set all students all domains to 5
- **Clear All** — With confirmation dialog, resets all to 3
- **Expand All / Collapse All**
- **Search** — Filter students

**Auto-Save:** 600ms debounce per student per domain type.

**Workflow:**
1. Select class
2. Choose Affective or Psychomotor tab
3. Expand student card
4. Rate each domain and add remarks (auto-saves)
5. Use bulk actions for efficiency

---

## 5. Accountant Role

The Accountant role manages all financial operations. The sidebar theme color is teal (#007C91).

### 5.1 Dashboard

**Purpose:** Financial dashboard with collection stats, pending verifications, and quick actions.

**Statistics Cards:**
- **Total Collected** — Sum of verified payments (teal gradient card)
- **Today's Revenue** — Today's verified payments (green gradient)
- **Pending Verification** — Count of unverified payments (amber gradient)
- **Outstanding** — Total unpaid balances (red gradient)

**Collection Progress Card:**
- Collection rate (% with progress bar)
- Expected (total fee required), Collected, Outstanding — each with ₦ amount

**Pending Payment Verifications Table:**
| Column | Content |
|---|---|
| Student Name | |
| Term | |
| Amount | ₦ |
| Date | |
| Payment Method | |
| Action | **Verify** button → Opens Verify Receipts |

**Recent Verified Payments:** List of last 5 verified payments (Student name, type, amount, date).

**Quick Action Cards (clickable):**
- **Set Fee Structure** → Opens Set Fees
- **Record Payment** → Opens Record Payments
- **Payment Reports** → Opens Payment Reports

**Connection Monitoring:** Checks connection every 2 minutes; shows warning if issues detected.

### 5.2 Set Fees

**Purpose:** Configure fee structures for each class (tuition, development levy, exam fee, books, transport).

**Form Fields:**
- **Class** (select)
- **Term** (select)
- **Academic Year** (text)
- Tuition Fee (₦)
- Development Levy (₦)
- Exam Fee (₦)
- Books Fee (₦)
- Transport Fee (₦)
- Total Fee (auto-calculated)

**Existing Fee Structures Table:**
| Column | Content |
|---|---|
| Class | |
| Tuition | ₦ |
| Development | ₦ |
| Exam | ₦ |
| Books | ₦ |
| Transport | ₦ |
| Total | ₦ |
| Actions | Edit, Delete |

**Buttons:**
- **Save Fee Structure** — Creates or updates
- **Edit** (per row) — Opens edit form
- **Delete** (per row) — Removes fee structure

**Workflow:**
1. Select class and fill fee components
2. Click **Save Fee Structure**
3. View/edit/delete existing structures in the table

### 5.3 Record Payments

**Purpose:** Record fee payments from students with receipt printing.

**Student Search:**
- Input: "Enter student name or admission number..."
- Results: Student name, class, admission number
- Click to select

**Selected Student Info:**
- Name, Class, Admission number
- Fee structure for current term
- Invoice summary (total fee, paid, outstanding, credit)
- Outstanding/Credit balance display

**Payment Form:**
| Field | Type | Notes |
|---|---|---|
| Amount Paid (₦) | Number | Step 0.01 |
| Payment Method | Select | Cash, Bank Transfer, POS, Online Payment |
| Reference Number | Text | Optional |

**Quick Amount Presets:** Full Amount, Half, Quarter — dynamically shown based on outstanding.

**Recent Payments (expandable):** Table of recent payments for this student: Date, Amount, Method, Status badge.

**Confirmation Dialog (before submit):**
- Student name, Amount, Method, Outstanding balance
- Warning if amount exceeds outstanding (credit will be created)
- **Cancel** / **Confirm** buttons

**Receipt Modal (after successful payment):**
- Success checkmark
- Receipt number
- Student name, Class
- Amount, Method, Term/Session, Date
- **Close** / **Print Receipt** buttons

**Workflow:**
1. Search and select student
2. View fee summary and outstanding
3. Enter amount (or use quick preset)
4. Select payment method (optional reference)
5. Click **Record Payment**
6. Confirm dialog → Execute
7. Receipt modal → Print if needed

### 5.4 Verify Receipts

**Purpose:** Review and verify/ reject pending payment receipts, including bank transfer proofs.

**Filters:**
- Search by student name or receipt number
- Date range
- Payment method filter

**Pending Payments Table:**
| Column | Content |
|---|---|
| Student Name | |
| Amount | ₦ |
| Payment Method | |
| Receipt Number | |
| Date | |
| Proof | View link (for bank transfers) |
| Actions | Verify, Reject |

**Verify Dialog:** Confirmation with receipt details.

**Reject Dialog:** Reason textarea (required).

**Receipt Image Viewer:** For bank transfers, click to view uploaded receipt image.

**Workflow:**
1. Review pending payments
2. Click **View Proof** to see bank transfer receipt
3. Click **Verify** to confirm or **Reject** with reason
4. Verified payments update student's fee balance

### 5.5 Payment Reports

**Purpose:** Generate and view payment/fee collection reports.

**Filters:**
- Date range (from/to)
- Class (select)
- Payment method (select)
- Status (select: All/Verified/Pending/Rejected)

**Statistics Cards:**
- Total Payments
- Total Amount (₦)
- Average Payment (₦)
- Number of Students

**Report Table:**
| Column | Content |
|---|---|
| Date | |
| Student | Name, Class |
| Amount | ₦ |
| Method | |
| Status | Badge |
| Receipt # | |

**Buttons:**
- **Generate Report** — Applies filters and refreshes
- **Export CSV** — Downloads report as CSV
- **Print** — Print-friendly view

**Workflow:**
1. Set filters (date range, class, method, status)
2. Click **Generate Report**
3. View or Export/Print

### 5.6 Payment History

**Purpose:** View complete payment history with search and filtering.

**Filters:**
- Student search
- Date range
- Payment method
- Status

**Table Columns:**
| Column | Content |
|---|---|
| Date | |
| Receipt # | |
| Student | Name, Class |
| Payment Type | |
| Amount | ₦ |
| Method | |
| Status | Badge |
| Recorded By | |

**Per-row Actions:**
- **View Receipt** — Opens receipt dialog with print option
- **Reverse Payment** — With confirmation (for erroneous payments)

**Workflow:**
1. Search by student or filter by date/method/status
2. Click **View Receipt** to see details
3. Click **Reverse Payment** if needed (with confirmation)

### 5.7 Bank Settings

**Purpose:** Configure school bank account details displayed to parents for bank transfers.

**Form Fields:**
- **Bank Name** (text)
- **Account Name** (text)
- **Account Number** (text)
- **Sort Code** (text, optional)
- **Branch** (text, optional)

**Buttons:**
- **Save Bank Details** — Updates bank info
- **Clear** — Resets form

**Display:** Current bank details shown in a preview card.

**Workflow:**
1. Enter bank name, account name, account number
2. Optionally add sort code and branch
3. Click **Save Bank Details**

### 5.8 Scholarships

**Purpose:** Manage discounts and scholarships applied to student fee structures.

**Create Discount/Scholarship:**
| Field | Type | Notes |
|---|---|---|
| Student | Select | Search and select |
| Discount Type | Select | Percentage / Fixed Amount |
| Value | Number | Percentage (1-100) or Fixed ₦ amount |
| Reason | Textarea | Required |
| Valid From | Date | |
| Valid Until | Date | |

**Active Discounts Table:**
| Column | Content |
|---|---|
| Student | Name, Class |
| Type | Percentage/Fixed |
| Value | |
| Reason | |
| Valid Period | From - Until |
| Status | Active/Expired badge |
| Actions | Edit, Revoke |

**Workflow:**
1. Select student, discount type, and value
2. Enter reason and validity period
3. Click **Save**
4. View/edit/revoke in the table

### 5.9 Message Parents

**Purpose:** Send financial-related messages to parents (payment reminders, receipts, etc.).

**Form Fields:**
| Field | Type | Notes |
|---|---|---|
| Recipient | Select | Specific Student Parent / All Parents with Outstanding |
| Student | Text | Search (shown for specific student) |
| Message Type | Select | Payment Reminder, Receipt Notification, Outstanding Balance, Custom |
| Subject | Text | Required |
| Message | Textarea | Required |

**Template Buttons:**
- **Payment Overdue Reminder** — Pre-fills subject/message
- **Receipt Available** — Pre-fills subject/message

**Workflow:**
1. Select recipient and message type
2. Write or use template
3. Click **Send Message**

---

## 6. Parent Role

The Parent role can view their children's progress, manage fees, and communicate with the school.

### 6.1 Dashboard

**Purpose:** Overview of linked children, recent results, fee status, and quick actions.

**Welcome Banner:** Parent name, academic year, term badges, children count, notification count.

**Statistics Cards:**
- **My Children** — Count of linked students (blue)
- **Current Term** — Current term with academic year (green)
- **Notifications** — Unread count (amber)
- **Profile Status** — Active (purple)

**Children Overview Widget:**
- List of children (up to 3) with avatar, name, class
- **View** button → Opens My Children page
- **View All** button (if >3 children)

**Recent Results Widget:**
- Approved results for linked children
- Each result: Child name, Term, Average score
- **View** link → Opens result detail
- **View All** button (if >3 results)

**Fee Status Widget:**
- Total Fees (₦), Paid (₦), Outstanding (₦)
- Color-coded (purple, green, orange)
- **View Fee History** → Opens Fee Management
- **Make Payment** → Opens Payment dialog

**Quick Actions:**
- **View Children** → My Children page
- **Results** → My Children page
- **Settings** → Settings page
- **Notifications** → Notifications page

### 6.2 My Children

**Purpose:** View individual child details, approved results, and cumulative results with PDF download. (563 lines)

**Header:** Parent name, Children count, Results count badges.

**Search and View Toggle:**
- **Search** — Filter children by name, admission, or class
- **View Toggle** — Grid view / List view

**Child Card (per child):**
- Avatar (initials or photo), Name, Admission number
- Status badge (Active, etc.)
- Class name, Gender, Class level
- Approved Results count badge
- Action buttons:
  - **Eye** — View result detail (FullPageResultView)
  - **Download** — Download result PDF
  - **Award** (Third Term only) — View cumulative result

**Result Detail View (FullPageResultView):**
- School header with logo
- Student info (name, class, term, admission number)
- Subject scores table with grades
- Affective domain ratings
- Psychomotor domain ratings
- Attendance (times present/absent)
- Teacher's comment / Principal's comment
- **Download PDF** button

**Cumulative Result Dialog:**
- CumulativeResultSheet component
- Term-by-term aggregated results
- **Download PDF** button

**Workflow:**
1. View all children in grid/list
2. Click a child card to view details
3. Click **Eye** to see full result breakdown
4. Click **Download** to get PDF of latest result
5. In Third Term: Click **Award** for cumulative results

### 6.3 Notifications

**Purpose:** View and manage notifications.

**Filters:** All Notifications, Unread (with count), Read — toggle buttons.

**Notification Cards:**
- Title, Type badge (info/success/warning/error)
- Unread indicator (blue dot)
- Message preview
- Date
- **Mark as Read** button
- **Delete** button

**Empty State:** Shows "No notifications" with icon.

**Workflow:**
1. Filter by All/Unread/Read
2. Click **Mark as Read** on individual notifications
3. Delete old notifications

### 6.4 Settings

**Purpose:** Account settings with password change.

**Password Settings Card:**
- **Current Password** — Input
- **New Password** — Input (min 8 chars)
- **Confirm New Password** — Input (must match)
- **Change Password** button

**Validation:**
- Passwords must match
- Min 8 characters
- Current password verified against backend

**Workflow:**
1. Enter current password
2. Enter new password (min 8 chars)
3. Confirm
4. Click **Change Password**

### 6.5 Fee Management

**Purpose:** View fee breakdown by child, payment history, and make payments online or via bank transfer. (Embedded in parent dashboard, ~480 lines)

**Statistics Cards:**
- **Total Fees** (₦) — Sum across all children
- **Total Paid** (₦)
- **Current Term Fees** (₦)
- **Payment Status** — Children paid count (e.g., "2/3")

**Fee Breakdown Table (by child):**
| Column | Content |
|---|---|
| Child | Name, Class, pending online warning |
| Total Fees | ₦ |
| Paid | ₦ (green) |
| Balance | ₦ (red if >0, green if 0) |
| Status | Paid (green) / Partial (yellow) / Unpaid (red) |
| Actions | **Pay**, **Check Status** (if pending online), **Receipt** (icon) |

**Recent Transactions Table:**
| Column | Content |
|---|---|
| Date | |
| Child | |
| Description | Payment type |
| Amount | ₦ |
| Status | Color-coded badge |
| Receipt # | |
| Action | **Check Status** (for pending online payments) |

**Make Payment Dialog:**
- Selected child info (name, class, outstanding)
- Pending online payment warning (if exists)
- **Payment Amount** (₦) — Number input
- **Payment Method** — Online Payment (card) / Bank Transfer
- **Online Payment:** Opens Paystack inline checkout (supports card, bank transfer, USSD)
- **Bank Transfer:** Shows school bank details + **Upload Receipt** (file upload, image)
- **Cancel** / **Pay** or **Upload Receipt** button

**Online Payment Workflow:**
1. Enter amount
2. Select Online Payment
3. Click **Pay** → Paystack modal opens
4. Complete payment → Auto-verification → Receipt shown
5. Fee balance updates

**Bank Transfer Workflow:**
1. Enter amount
2. Select Bank Transfer
3. View school bank account details
4. Transfer money via your bank
5. Upload receipt image
6. Click **Upload Receipt**
7. Payment marked as Pending → Accountant verifies later

**Check Payment Status:** For pending online payments, queries the payment gateway for status update.

**Receipt Dialog:** Shows full payment receipt with **Print** option.

### 6.6 Messages

**Purpose:** View class WhatsApp group links and communicate with school administration.

**Class WhatsApp Groups Section:**
- Shows groups for each child's class
- Each group card: Class name, Group name
- **Join Group** button — Opens WhatsApp group link in new tab (only available if configured by admin)
- Loading spinner while fetching

**Message to School Form:**
| Field | Type | Notes |
|---|---|---|
| Recipient | Select | Admin or Teacher |
| Subject | Text | Required |
| Message | Textarea | Required |

**Workflow:**
1. View WhatsApp group links for children's classes
2. Click **Join Group** to join class communication
3. Send message to school admin or teachers

---

## 7. Student Role

The Student role can take CBT exams and view results. 3 sidebar items.

### 7.1 Dashboard

**Purpose:** Overview of available and completed CBT exams.

**Statistics Cards:**
- **Available Exams** — Count of published active exams
- **Completed** — Count of submitted/scored exams
- **In Progress** — Count of exams started but not submitted

**Available Exams Card:**
- List of exams (up to 5)
- Each exam: Title, Subject, Duration, Total marks
- **Start Exam** button (if not attempted)
- Completed badge (green, if submitted/scored)
- In Progress badge (amber, if started)

**Buttons:**
- **Start Exam** → Opens CBT exam player (full-screen)

### 7.2 My Exams

**Purpose:** View all available CBT exams with status and scores.

**Exam Cards (grid):**
- Title, Subject, Duration, Total marks, Class name
- If not attempted: **Start** button
- If in progress: **Continue** button
- If completed: Score badge (e.g., "28/40"), **View** button (opens result detail)

**Workflow:**
1. Browse available exams
2. Click **Start** or **Continue** to enter exam player
3. Complete exam → Results automatically saved

### 7.3 My Results

**Purpose:** View completed CBT exam results with score breakdown.

**Result Cards:**
- Exam title, Subject
- Score (e.g., "28/40"), Percentage
- Score bar (color-coded: ≥70 green, ≥50 amber, <50 red)
- Status badge: Scored / Submitted
- **Details** button → Opens exam attempt detail dialog

**Attempt Detail Dialog (ResultsSummary):**
- Score breakdown
- Per-question review: Question, Your answer, Correct answer
- Marked as correct/incorrect

**Workflow:**
1. View completed exam results
2. Click **Details** to review per-question performance

---

## Appendix: Common Features Across Roles

### Sidebar Navigation
- All roles have a left sidebar with role-specific menu items
- Active item is highlighted
- Mobile: Sidebar collapses, toggleable via hamburger menu
- Bottom of sidebar: Logout button

### Top Bar
- Displays user name and role badge
- Notification bell with unread count
- Clicking bell opens notification dialog
- Logout functionality

### Notifications
- Received in real-time (polling + focus events)
- Types: Info, Success, Warning, Error
- Parent messages shown with purple badge
- Per-user read tracking (readBy array)
- Soft delete (deletedBy array)

### PDF Generation
- Result sheets: `generatePDFFromData()` — Includes school logo, header, scores, domains, attendance, comments
- Cumulative results: `generateCumulativePDF()` — Multi-term aggregated results

### Data Loading
- All data loaded via SchoolContext API
- Periodic auto-refresh (varies by role: 10s parent, 15s admin, 60s teacher)
- Refresh on tab focus and visibility change
- Connection monitoring with auto-retry
