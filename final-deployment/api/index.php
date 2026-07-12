<?php

// Load database config (which loads .env)
require_once 'config/database.php';

// ─── SECURITY: Enforce request size limits ───
$maxBodySize = 10 * 1024 * 1024; // 10MB max POST body
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > $maxBodySize) {
    http_response_code(413);
    echo json_encode(['success' => false, 'message' => 'Request entity too large']);
    exit;
}

// Dynamic CORS from .env
$allowed_origins_str = Config::get('CORS_ORIGINS', 'https://smug.site.gracelandroyalacademy.com.ng,https://smug-flex-multi-school-o3to.vercel.app,http://localhost:5173,http://localhost:3000');
$allowed_origins = array_map('trim', explode(',', $allowed_origins_str));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} elseif (Config::get('APP_ENV') === 'development' && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-School-ID, Cache-Control, Pragma');
header('Access-Control-Max-Age: 3600');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include helpers
require_once 'helpers/Response.php';
require_once 'helpers/Middleware.php';
require_once 'helpers/JWT.php';
require_once 'helpers/RateLimiter.php';
require_once 'helpers/TenantMiddleware.php';

// Include controllers
require_once 'controllers/AuthController.php';
require_once 'controllers/SuperAdminController.php';
require_once 'controllers/TenantController.php';
require_once 'controllers/StudentController.php';
require_once 'controllers/TeacherController.php';
require_once 'controllers/ClassController.php';
require_once 'controllers/SubjectController.php';
require_once 'controllers/ResultsController.php';
require_once 'controllers/PaymentController.php';
require_once 'controllers/InvoiceController.php';
require_once 'controllers/ParentController.php';
require_once 'controllers/ReportController.php';
require_once 'controllers/AttendanceController.php';
require_once 'controllers/NotificationController.php';
require_once 'controllers/AssignmentController.php';
require_once 'controllers/FileController.php';
require_once 'controllers/UserController.php';
require_once 'controllers/ProgressionController.php';
require_once 'controllers/RealtimeController.php';
require_once 'controllers/CbtController.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
if (!empty($base) && $base !== '/') {
    $path = preg_replace('#^' . preg_quote($base, '#') . '#', '', $path);
}

// ─── SECURITY: Sanitize path to prevent traversal ───
$path = '/' . preg_replace('#[^a-zA-Z0-9_/.\-]#', '', $path);
$path = str_replace(['../', '..\\'], '', $path);

$path_parts = explode('/', trim($path, '/'));
$prefix = $path_parts[0] ?? '';
$action = $path_parts[1] ?? '';
$param = $path_parts[2] ?? null;
$subparam = $path_parts[3] ?? null;

// ─── SECURITY: Validate params ───
// Note: $param is NOT sanitized here because routes like
// /super-admin/schools/pending use string values in $param.
// Numeric validation is done per-route where needed.

try {
    switch ($prefix) {

        // ─── SMUGFLEX PLATFORM ROUTES ───

        case 'super-admin':
            $superAdmin = new SuperAdminController();
            if ($action === 'login' && $method === 'POST') {
                $superAdmin->login();
            } elseif ($action === 'schools' && $param === 'pending' && $method === 'GET') {
                $superAdmin->getPendingRegistrations();
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'approve' && $method === 'POST') {
                $superAdmin->approveSchool((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'reject' && $method === 'POST') {
                $superAdmin->rejectSchool((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'deactivate' && $method === 'POST') {
                $superAdmin->deactivateSchool((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'activate' && $method === 'POST') {
                $superAdmin->activateSchool((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'suspend' && $method === 'POST') {
                $superAdmin->suspendSchool((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'extend-access' && $method === 'POST') {
                $superAdmin->extendAccess((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'set-plan' && $method === 'POST') {
                $superAdmin->setSchoolPlan((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'reset-admin-password' && $method === 'POST') {
                $superAdmin->resetAdminPassword((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'credentials' && $method === 'GET') {
                $superAdmin->getInitialAdminCredentials((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $method === 'GET') {
                $superAdmin->getSchoolDetails((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $method === 'PUT') {
                $superAdmin->editSchoolDetails((int)$param);
            } elseif ($action === 'schools' && $method === 'GET') {
                $superAdmin->listSchools();
            } elseif ($action === 'check-suffix' && $method === 'GET') {
                $superAdmin->checkSuffix();
            } elseif ($action === 'stats' && $method === 'GET') {
                $superAdmin->getPlatformStats();
            } elseif ($action === 'activity-logs' && $method === 'GET') {
                $superAdmin->getActivityLogs();
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'modules' && $method === 'GET') {
                $superAdmin->getSchoolModules((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'modules' && $method === 'PUT') {
                $superAdmin->updateSchoolModules((int)$param);
            } elseif ($action === 'schools' && is_numeric($param) && $subparam === 'delete' && $method === 'POST') {
                $superAdmin->deleteSchool((int)$param);
            } elseif ($action === 'schools' && $method === 'POST') {
                $superAdmin->createSchool();
            } else {
                Response::notFound('Super Admin endpoint not found');
            }
            break;

        case 'schools':
            $tenant = new TenantController();
            if ($action === 'register' && $method === 'POST') {
                $tenant->register();
            } elseif ($action === 'public-info' && $method === 'GET') {
                $tenant->getPublicInfo();
            } elseif ($action === 'profile' && $method === 'GET') {
                $tenant->getOwnProfile();
            } elseif ($action === 'profile' && $method === 'PUT') {
                $tenant->updateOwnProfile();
            } elseif ($action === 'upload-logo' && $method === 'POST') {
                $tenant->uploadLogo();
            } else {
                Response::notFound('Tenant endpoint not found');
            }
            break;

        // ─── EXISTING SCHOOL ROUTES (unchanged routing, but controllers now use TenantMiddleware) ───

        case 'realtime':
            $realtimeController = new RealtimeController();
            if ($method === 'GET' && $action === 'stream') {
                $realtimeController->stream();
            } else {
                Response::notFound('Realtime endpoint not found');
            }
            break;

        case 'database':
            if ($method === 'POST' && $action === 'query') {
                require_once __DIR__ . '/database/query.php';
            } else {
                Response::notFound('Database endpoint not found');
            }
            break;

        case 'invoices':
            $invoiceController = new InvoiceController();
            if ($method === 'POST' && $action === 'auto-generate') {
                $invoiceController->autoGenerateInvoices();
            } elseif ($method === 'GET' && $action === 'student' && $param) {
                $invoiceController->getStudentInvoice((int)$param);
            } elseif ($method === 'GET' && $action === 'class' && $param) {
                $invoiceController->getClassInvoices((int)$param);
            } else {
                Response::notFound('Invoice endpoint not found');
            }
            break;

        case 'auth':
            $authController = new AuthController();
            if ($method === 'POST' && $action === 'login') {
                $authController->login();
            } elseif ($method === 'POST' && $action === 'student-login') {
                $authController->studentLogin();
            } elseif ($method === 'POST' && $action === 'logout') {
                $authController->logout();
            } elseif ($method === 'GET' && $action === 'profile') {
                $authController->getProfile();
            } elseif ($method === 'POST' && $action === 'change-password') {
                $authController->changePassword();
            } elseif ($method === 'POST' && $action === 'refresh-token') {
                $authController->refreshToken();
            } else {
                Response::notFound('Auth endpoint not found');
            }
            break;

        case 'users':
            $userController = new UserController();
            if ($method === 'GET' && !$action) {
                $userController->getAllUsers();
            } elseif ($method === 'POST' && $action === 'reset-password' && $param) {
                $userController->resetPassword((int)$param);
            } elseif ($method === 'POST' && !$action) {
                $userController->createUser();
            } elseif ($method === 'PUT' && $action) {
                $userController->updateUser((int)$action);
            } elseif ($method === 'DELETE' && $action) {
                $userController->deleteUser((int)$action);
            } else {
                Response::notFound('User endpoint not found');
            }
            break;

        case 'class_teacher_assignments':
            require_once __DIR__ . '/class_teacher_assignments.php';
            break;

        case 'progression':
            $progressionController = new ProgressionController();
            if ($method === 'GET' && $action === 'rules') {
                $progressionController->getProgressionRules();
            } elseif ($method === 'POST' && $action === 'rules') {
                $progressionController->createProgressionRule();
            } elseif ($method === 'PUT' && $action === 'rules' && $param) {
                $progressionController->updateProgressionRule((int)$param);
            } elseif ($method === 'DELETE' && $action === 'rules' && $param) {
                $progressionController->deleteProgressionRule((int)$param);
            } else {
                Response::notFound('Progression endpoint not found');
            }
            break;

        case 'students':
        case 'student':
            $studentController = new StudentController();
            if ($method === 'GET' && $action === 'statistics') {
                $studentController->getStudentStatistics();
            } elseif ($method === 'GET' && $action === 'promotion-history') {
                $studentController->getPromotionHistory();
            } elseif ($method === 'GET' && $action === 'by-class' && $param) {
                $studentController->getStudentsByClass((int)$param);
            } elseif ($method === 'GET' && $action) {
                $studentController->getStudentById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $studentController->getAllStudents();
            } elseif ($method === 'POST' && $action === 'promote-students') {
                $studentController->promoteStudents();
            } elseif ($method === 'POST' && $action === 'manual-class-change') {
                $studentController->manualClassChange();
            } elseif ($method === 'POST' && $action === 'affective-domains') {
                $studentController->saveAffectiveDomains();
            } elseif ($method === 'POST' && $action === 'psychomotor-domains') {
                $studentController->savePsychomotorDomains();
            } elseif ($method === 'POST' && !$action) {
                $studentController->createStudent();
            } elseif ($method === 'PUT' && $action) {
                $studentController->updateStudent((int)$action);
            } elseif ($method === 'DELETE' && $action) {
                $studentController->deleteStudent((int)$action);
            } else {
                Response::notFound('Student endpoint not found');
            }
            break;

        case 'teachers':
            $teacherController = new TeacherController();
            if ($method === 'GET' && $action === 'assignments' && $param) {
                $teacherController->getTeacherAssignments((int)$param);
            } elseif ($method === 'GET' && $action === 'students' && $param) {
                $teacherController->getTeacherClassStudents((int)$param);
            } elseif ($method === 'GET' && $action) {
                $teacherController->getTeacherById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $teacherController->getAllTeachers();
            } elseif ($method === 'POST' && !$action) {
                $teacherController->createTeacher();
            } elseif ($method === 'PUT' && $action) {
                $teacherController->updateTeacher((int)$action);
            } elseif ($method === 'DELETE' && $action) {
                $teacherController->deleteTeacher((int)$action);
            } else {
                Response::notFound('Teacher endpoint not found');
            }
            break;

        case 'classes':
            $classController = new ClassController();
            if ($method === 'GET' && $action === 'students' && $param) {
                $classController->getClassStudents((int)$param);
            } elseif ($method === 'GET' && $action === 'subjects' && $param) {
                $classController->getClassSubjects((int)$param);
            } elseif ($method === 'GET' && $action === 'statistics' && $param) {
                $classController->getClassStatistics((int)$param);
            } elseif ($method === 'GET' && $action === 'by-level' && $param) {
                $classController->getClassesByLevel($param);
            } elseif ($method === 'GET' && $action === 'whatsapp-groups') {
                $classController->getClassWhatsappGroups();
            } elseif ($method === 'GET' && $action) {
                $classController->getClassById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $classController->getAllClasses();
            } elseif ($method === 'POST' && !$action) {
                $classController->createClass();
            } elseif ($method === 'PUT' && $action) {
                $classController->updateClass((int)$action);
            } elseif ($method === 'DELETE' && $action) {
                $classController->deleteClass((int)$action);
            } else {
                Response::notFound('Class endpoint not found');
            }
            break;

        case 'subjects':
            $subjectController = new SubjectController();
            if ($method === 'GET' && $action === 'category' && $param) {
                $subjectController->getSubjectsByCategory($param);
            } elseif ($method === 'GET' && $action === 'assignments') {
                $subjectController->getAssignments();
            } elseif ($method === 'GET' && $action) {
                $subjectController->getSubjectById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $subjectController->getAllSubjects();
            } elseif ($method === 'POST' && ($action === 'assign' || $action === 'assignments')) {
                $subjectController->assignSubject();
            } elseif ($method === 'POST' && !$action) {
                $subjectController->createSubject();
            } elseif ($method === 'PUT' && $action === 'assignment' && $param) {
                $subjectController->updateAssignment((int)$param);
            } elseif ($method === 'PUT' && $action) {
                $subjectController->updateSubject((int)$action);
            } elseif ($method === 'DELETE' && $action === 'assignment' && $param) {
                $subjectController->deleteAssignment((int)$param);
            } elseif ($method === 'DELETE' && $action) {
                $subjectController->deleteSubject((int)$action);
            } else {
                Response::notFound('Subject endpoint not found');
            }
            break;

        case 'subject_registrations':
            require_once __DIR__ . '/subject_registrations.php';
            break;

        case 'results':
            $resultsController = new ResultsController();
            if ($method === 'GET' && $action === 'scores' && $param === 'by-term') {
                $resultsController->getScoresByTerm();
            } elseif ($method === 'GET' && $action === 'scores' && $param) {
                $resultsController->getScoresByAssignment((int)$param);
            } elseif ($method === 'GET' && $action === 'student' && $param) {
                $resultsController->getStudentResults((int)$param);
            } elseif ($method === 'GET' && $action === 'compiled') {
                $resultsController->getAllCompiledResults();
            } elseif ($method === 'GET' && $action === 'pending-approvals') {
                $resultsController->getPendingApprovals();
            } elseif ($method === 'GET' && $action === 'cumulative' && $param === 'class' && $subparam) {
                $resultsController->getClassCumulativeResults((int)$subparam);
            } elseif ($method === 'GET' && $action === 'cumulative' && $param) {
                $resultsController->getCumulativeResult((int)$param);
            } elseif ($method === 'POST' && $action === 'scores' && $param === 'approve' && $subparam) {
                $resultsController->approveScore((int)$subparam);
            } elseif ($method === 'POST' && $action === 'scores' && $param === 'reject' && $subparam) {
                $resultsController->rejectScore((int)$subparam);
            } elseif ($method === 'POST' && $action === 'scores') {
                $resultsController->upsertScores();
            } elseif ($method === 'POST' && $action === 'compile-cumulative') {
                $resultsController->compileCumulative();
            } elseif ($method === 'POST' && $action === 'compile') {
                $resultsController->compileResults();
            } elseif ($method === 'POST' && $action === 'check-status') {
                $resultsController->checkCompilationStatus();
            } elseif ($method === 'POST' && $action === 'student-status') {
                $resultsController->checkStudentCompilationStatus();
            } elseif ($method === 'POST' && $action === 'approve' && $param) {
                $resultsController->approveResult((int)$param);
            } elseif ($method === 'POST' && $action === 'reject' && $param) {
                $resultsController->rejectResult((int)$param);
            } elseif ($method === 'POST' && $action === 'submit' && $param) {
                $resultsController->submitScores((int)$param);
            } elseif ($method === 'DELETE' && $action === 'compiled' && $param) {
                $resultsController->deleteCompiledResult((int)$param);
            } else {
                Response::notFound('Results endpoint not found');
            }
            break;

        case 'payments':
            $paymentController = new PaymentController();
            if ($method === 'GET' && $action === 'reports') {
                $paymentController->getPaymentReports();
            } elseif ($method === 'GET' && $action === 'reconciliation-summary') {
                $paymentController->getReconciliationSummary();
            } elseif ($method === 'GET' && $action === 'exceptions') {
                $paymentController->getPaymentExceptions();
            } elseif ($method === 'GET' && $action === 'online-verify') {
                $paymentController->verifyOnlinePayment();
            } elseif ($method === 'GET' && $action === 'student' && $param && $subparam === 'history') {
                $paymentController->getStudentPaymentHistory((int)$param);
            } elseif ($method === 'GET' && $action === 'student' && $param && $subparam === 'balance') {
                $paymentController->getStudentFeeBalance((int)$param);
            } elseif ($method === 'GET' && $action) {
                $paymentController->getPaymentById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $paymentController->getAllPayments();
            } elseif ($method === 'POST' && $action === 'verify' && $param) {
                $paymentController->verifyPayment((int)$param);
            } elseif ($method === 'POST' && $action === 'reverse' && $param) {
                $paymentController->reversePayment((int)$param);
            } elseif ($method === 'POST' && $action === 'online-init') {
                $paymentController->initializeOnlinePayment();
            } elseif ($method === 'POST' && $action === 'bank-transfer-proof') {
                $paymentController->submitBankTransferProof();
            } elseif ($method === 'POST' && !$action) {
                $paymentController->createPayment();
            } else {
                Response::notFound('Payment endpoint not found');
            }
            break;

        case 'parent-student-links':
            $parentController = new ParentController();
            if ($method === 'GET') {
                $parentController->getAllParentStudentLinks();
            } else {
                Response::notFound('Parent-student-links endpoint not found');
            }
            break;

        case 'parents':
            $parentController = new ParentController();
            if ($method === 'GET' && $action === 'children' && $param) {
                $parentController->getParentChildren((int)$param);
            } elseif ($method === 'GET' && $action) {
                $parentController->getParentById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $parentController->getAllParents();
            } elseif ($method === 'POST' && $action === 'link' && $param) {
                $parentController->linkToStudent((int)$param);
            } elseif ($method === 'POST' && !$action) {
                $parentController->createParent();
            } elseif ($method === 'PUT' && $action) {
                $parentController->updateParent((int)$action);
            } elseif ($method === 'DELETE' && $action === 'unlink' && $param && $subparam) {
                $parentController->unlinkFromStudent((int)$param, (int)$subparam);
            } elseif ($method === 'DELETE' && $action) {
                $parentController->deleteParent((int)$action);
            } else {
                Response::notFound('Parent endpoint not found');
            }
            break;

        case 'attendance':
            $attendanceController = new AttendanceController();
            if ($method === 'GET' && $action === 'student' && $param) {
                $attendanceController->getStudentAttendanceSummary((int)$param);
            } elseif ($method === 'GET' && $action === 'class' && $param) {
                $attendanceController->getClassAttendanceSummary((int)$param);
            } elseif ($method === 'GET' && $action === 'reports') {
                $attendanceController->getAttendanceReports();
            } elseif ($method === 'GET' && $action) {
                $attendanceController->getAttendanceByDate($action);
            } elseif ($method === 'GET' && !$action) {
                $attendanceController->getAttendance();
            } elseif ($method === 'POST' && !$action) {
                $attendanceController->markAttendance();
            } else {
                Response::notFound('Attendance endpoint not found');
            }
            break;

        case 'notifications':
            $notificationController = new NotificationController();
            if ($method === 'GET' && $action === 'unread-count') {
                $notificationController->getUnreadCount();
            } elseif ($method === 'GET' && $action === 'user') {
                $notificationController->getUserNotifications();
            } elseif ($method === 'GET' && $action) {
                $notificationController->getNotificationById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $notificationController->getNotifications();
            } elseif ($method === 'POST' && $action === 'broadcast') {
                $notificationController->broadcastNotification();
            } elseif ($method === 'POST' && !$action) {
                $notificationController->createNotification();
            } elseif ($method === 'PUT' && $param === 'mark-all-read') {
                $notificationController->markAllAsRead();
            } elseif ($method === 'PUT' && $action) {
                $notificationController->markAsRead((int)$action);
            } elseif ($method === 'DELETE' && $action) {
                $notificationController->deleteNotification((int)$action);
            } else {
                Response::notFound('Notification endpoint not found');
            }
            break;

        case 'assignments':
            $assignmentController = new AssignmentController();
            if ($method === 'GET' && $action === 'submissions' && $param) {
                $assignmentController->getSubmissions((int)$param);
            } elseif ($method === 'GET' && $action) {
                $assignmentController->getAssignmentById((int)$action);
            } elseif ($method === 'GET' && !$action) {
                $assignmentController->getAllAssignments();
            } elseif ($method === 'POST' && $action === 'submit' && $param) {
                $assignmentController->submitAssignment((int)$param);
            } elseif ($method === 'POST' && !$action) {
                $assignmentController->createAssignment();
            } elseif ($method === 'PUT' && $action === 'grade' && $param) {
                $assignmentController->gradeAssignment((int)$param);
            } elseif ($method === 'PUT' && $action) {
                $assignmentController->updateAssignment((int)$action);
            } elseif ($method === 'DELETE' && $action) {
                $assignmentController->deleteAssignment((int)$action);
            } else {
                Response::notFound('Assignment endpoint not found');
            }
            break;

        case 'reports':
            $reportController = new ReportController();
            if ($method === 'POST' && $action === 'student') {
                $reportController->generateStudentReportCard();
            } elseif ($method === 'POST' && $action === 'class') {
                $reportController->generateClassPerformanceReport();
            } elseif ($method === 'GET' && $action === 'financial') {
                $reportController->generateFinancialReport();
            } elseif ($method === 'GET' && $action === 'attendance') {
                $reportController->generateAttendanceReport();
            } else {
                Response::notFound('Report endpoint not found');
            }
            break;

        case 'files':
            $fileController = new FileController();
            if ($method === 'POST' && $action === 'upload') {
                $fileController->uploadLogo();
            } elseif ($method === 'DELETE' && $action) {
                $fileController->deleteFile($action);
            } else {
                Response::notFound('File endpoint not found');
            }
            break;

        case 'school_settings':
            require_once __DIR__ . '/school_settings.php';
            break;

        case 'academic_years':
            require_once __DIR__ . '/academic_years.php';
            break;

        case 'signature_settings':
            require_once __DIR__ . '/signature_settings.php';
            break;

        case 'cbt':
            $cbtController = new CbtController();
            if ($method === 'GET' && $action === 'exams' && $param && $subparam === 'questions') {
                $cbtController->getExamQuestions((int)$param);
            } elseif ($method === 'GET' && $action === 'exams' && $param) {
                $cbtController->getExamById((int)$param);
            } elseif ($method === 'GET' && $action === 'exams') {
                $cbtController->getAllExams();
            } elseif ($method === 'GET' && $action === 'questions' && $param) {
                $cbtController->getExamQuestions((int)$param);
            } elseif ($method === 'GET' && $action === 'question-bank') {
                $cbtController->getQuestionBank();
            } elseif ($method === 'GET' && $action === 'attempts' && $param === 'mine') {
                $cbtController->getMyAttempts();
            } elseif ($method === 'GET' && $action === 'attempts' && $param) {
                $cbtController->getAttemptById((int)$param);
            } elseif ($method === 'GET' && $action === 'attempts') {
                $cbtController->getStudentAttempts();
            } elseif ($method === 'GET' && $action === 'results' && $param) {
                $cbtController->getExamResults((int)$param);
            } elseif ($method === 'GET' && $action === 'student-exams') {
                $cbtController->getStudentAvailableExams();
            } elseif ($method === 'POST' && $action === 'exams' && $param && $subparam === 'publish') {
                $cbtController->publishExam((int)$param);
            } elseif ($method === 'POST' && $action === 'exams') {
                $cbtController->createExam();
            } elseif ($method === 'POST' && $action === 'questions' && $param) {
                $cbtController->addQuestion((int)$param);
            } elseif ($method === 'POST' && $action === 'questions-reorder' && $param) {
                $cbtController->reorderQuestions((int)$param);
            } elseif ($method === 'POST' && $action === 'import-bank' && $param) {
                $cbtController->importFromBank((int)$param);
            } elseif ($method === 'POST' && $action === 'question-bank') {
                $cbtController->addToQuestionBank();
            } elseif ($method === 'POST' && $action === 'start' && $param) {
                $cbtController->startAttempt((int)$param);
            } elseif ($method === 'POST' && $action === 'save-answer' && $param) {
                $cbtController->saveAnswer((int)$param);
            } elseif ($method === 'POST' && $action === 'submit' && $param) {
                $cbtController->submitAttempt((int)$param);
            } elseif ($method === 'POST' && $action === 'feed-scores' && $param) {
                $cbtController->feedExamScores((int)$param);
            } elseif ($method === 'POST' && $action === 'bulk-import' && $param) {
                $cbtController->bulkImportQuestions((int)$param);
            } elseif ($method === 'POST' && $action === 'upload-image') {
                $cbtController->uploadQuestionImage();
            } elseif ($method === 'POST' && $action === 'generate-questions') {
                $cbtController->generateQuestionsFromMaterial();
            } elseif ($method === 'PUT' && $action === 'exams' && $param) {
                $cbtController->updateExam((int)$param);
            } elseif ($method === 'PUT' && $action === 'questions' && $param && $subparam) {
                $cbtController->updateQuestion((int)$param, (int)$subparam);
            } elseif ($method === 'DELETE' && $action === 'exams' && $param) {
                $cbtController->deleteExam((int)$param);
            } elseif ($method === 'DELETE' && $action === 'questions' && $param && $subparam) {
                $cbtController->deleteQuestion((int)$param, (int)$subparam);
            } elseif ($method === 'DELETE' && $action === 'question-bank' && $param) {
                $cbtController->deleteFromQuestionBank((int)$param);
            } elseif ($method === 'DELETE' && $action === 'scores' && $param) {
                $cbtController->deleteExamScores((int)$param);
            } elseif ($method === 'DELETE' && $action === 'attempts' && $param) {
                $cbtController->deleteAttempt((int)$param);
            } else {
                Response::notFound('CBT endpoint not found');
            }
            break;

        case '':
        case 'info':
            Response::success([
                'platform' => 'SMugFlex',
                'version'  => '2.0.0',
                'endpoints' => [
                    'auth'   => '/auth/*',
                    'schools' => '/schools/*',
                    'super-admin' => '/super-admin/*',
                    'students' => '/students/*',
                    'teachers' => '/teachers/*',
                    'classes'  => '/classes/*',
                ],
            ], 'SMugFlex API');
            break;

        default:
            Response::notFound('Endpoint not found');
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    Response::serverError('An internal error occurred');
}
