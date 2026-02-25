<?php
/**
 * API Router
 * Graceland Royal Academy School Management System
 */

// Set enhanced CORS headers for all requests (explicit and early)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Handle preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include required files
require_once 'config/database.php';
require_once 'helpers/Response.php';
require_once 'helpers/Middleware.php';
require_once 'helpers/JWT.php';

// Include controllers
require_once 'controllers/AuthController.php';
require_once 'controllers/StudentController.php';
require_once 'controllers/TeacherController.php';
require_once 'controllers/ClassController.php';
require_once 'controllers/SubjectController.php';
require_once 'controllers/ResultsController.php';
require_once 'controllers/PaymentController.php';
require_once 'controllers/ParentController.php';
require_once 'controllers/ReportController.php';
require_once 'controllers/AttendanceController.php';
require_once 'controllers/NotificationController.php';
require_once 'controllers/AssignmentController.php';
require_once 'controllers/FileController.php';
require_once 'controllers/UserController.php';
require_once 'controllers/ProgressionController.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Dynamically strip the base directory (works for /api or /GG/api)
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
if (!empty($base) && $base !== '/') {
    $path = preg_replace('#^' . preg_quote($base, '#') . '#', '', $path);
}
$path_parts = explode('/', trim($path, '/'));

// Simple routing
try {
    switch ($path_parts[0]) {
        // TEMPORARY: Debug endpoint — DELETE AFTER DIAGNOSIS
        case 'debug-auth':
            require_once __DIR__ . '/debug-auth.php';
            break;

        // Database query routes
        case 'database':
            if ($method === 'POST' && $path_parts[1] === 'query') {
                require_once __DIR__ . '/database/query.php';
            } else {
                Response::notFound('Database endpoint not found');
            }
            break;

        // Authentication routes
        case 'auth':
            $authController = new AuthController();

            if ($method === 'POST' && $path_parts[1] === 'login') {
                $authController->login();
            } elseif ($method === 'POST' && $path_parts[1] === 'logout') {
                $authController->logout();
            } elseif ($method === 'GET' && $path_parts[1] === 'profile') {
                $authController->getProfile();
            } elseif ($method === 'POST' && $path_parts[1] === 'change-password') {
                $authController->changePassword();
            } elseif ($method === 'POST' && $path_parts[1] === 'refresh-token') {
                $authController->refreshToken();
            } else {
                Response::notFound('Authentication endpoint not found');
            }
            break;

        // Users routes
        case 'users':
            $userController = new UserController();

            if ($method === 'GET') {
                $userController->getAllUsers();
            } elseif ($method === 'POST') {
                $userController->createUser();
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                $userController->updateUser($path_parts[1]);
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $userController->deleteUser($path_parts[1]);
            } elseif ($method === 'POST' && $path_parts[1] === 'reset-password' && isset($path_parts[2])) {
                $userController->resetPassword($path_parts[2]);
            } else {
                Response::notFound('Users endpoint not found');
            }
            break;

        // Class Teacher Assignments routes
        case 'class_teacher_assignments':
            require_once __DIR__ . '/class_teacher_assignments.php';
            break;

        // Progression routes
        case 'progression':
            $progressionController = new ProgressionController($database);
            
            if ($method === 'GET') {
                if ($path_parts[1] === 'rules') {
                    $progressionController->getProgressionRules();
                } else {
                    Response::notFound('Progression endpoint not found');
                }
            } elseif ($method === 'POST') {
                if ($path_parts[1] === 'rules') {
                    $progressionController->createProgressionRule();
                } else {
                    Response::notFound('Progression endpoint not found');
                }
            } elseif ($method === 'PUT' && isset($path_parts[1]) && $path_parts[1] === 'rules' && isset($path_parts[2])) {
                $progressionController->updateProgressionRule($path_parts[2]);
            } elseif ($method === 'DELETE' && isset($path_parts[1]) && $path_parts[1] === 'rules' && isset($path_parts[2])) {
                $progressionController->deleteProgressionRule($path_parts[2]);
            } else {
                Response::notFound('Progression endpoint not found');
            }
            break;

        // Student routes
        case 'students':
            $studentController = new StudentController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'by-class' && isset($path_parts[2])) {
                        $studentController->getStudentsByClass($path_parts[2]);
                    } elseif ($path_parts[1] === 'statistics') {
                        $studentController->getStudentStatistics();
                    } elseif ($path_parts[1] === 'promotion-history') {
                        $studentController->getPromotionHistory();
                    } else {
                        $studentController->getStudentById($path_parts[1]);
                    }
                } else {
                    $studentController->getAllStudents();
                }
            } elseif ($method === 'POST') {
                if ($path_parts[1] === 'promote-students') {
                    $studentController->promoteStudents();
                } elseif ($path_parts[1] === 'manual-class-change') {
                    $studentController->manualClassChange();
                } elseif ($path_parts[1] === 'affective-domains') {
                    $studentController->saveAffectiveDomains();
                } elseif ($path_parts[1] === 'psychomotor-domains') {
                    $studentController->savePsychomotorDomains();
                } else {
                    $studentController->createStudent();
                }
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                $studentController->updateStudent($path_parts[1]);
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $studentController->deleteStudent($path_parts[1]);
            } else {
                Response::notFound('Student endpoint not found');
            }
            break;

        // Backwards-compatible alias (some clients call /api/student/* instead of /api/students/*)
        case 'student':
            $studentController = new StudentController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'by-class' && isset($path_parts[2])) {
                        $studentController->getStudentsByClass($path_parts[2]);
                    } elseif ($path_parts[1] === 'statistics') {
                        $studentController->getStudentStatistics();
                    } elseif ($path_parts[1] === 'promotion-history') {
                        $studentController->getPromotionHistory();
                    } else {
                        $studentController->getStudentById($path_parts[1]);
                    }
                } else {
                    $studentController->getAllStudents();
                }
            } elseif ($method === 'POST') {
                if ($path_parts[1] === 'promote-students') {
                    $studentController->promoteStudents();
                } elseif ($path_parts[1] === 'manual-class-change') {
                    $studentController->manualClassChange();
                } elseif ($path_parts[1] === 'affective-domains') {
                    $studentController->saveAffectiveDomains();
                } elseif ($path_parts[1] === 'psychomotor-domains') {
                    $studentController->savePsychomotorDomains();
                } else {
                    $studentController->createStudent();
                }
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                $studentController->updateStudent($path_parts[1]);
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $studentController->deleteStudent($path_parts[1]);
            } else {
                Response::notFound('Student endpoint not found');
            }
            break;

        // Teacher routes
        case 'teachers':
            $teacherController = new TeacherController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'assignments' && isset($path_parts[2])) {
                        $teacherController->getTeacherAssignments($path_parts[2]);
                    } elseif ($path_parts[1] === 'students' && isset($path_parts[2])) {
                        $teacherController->getTeacherClassStudents($path_parts[2]);
                    } else {
                        $teacherController->getTeacherById($path_parts[1]);
                    }
                } else {
                    $teacherController->getAllTeachers();
                }
            } elseif ($method === 'POST') {
                $teacherController->createTeacher();
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                $teacherController->updateTeacher($path_parts[1]);
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $teacherController->deleteTeacher($path_parts[1]);
            } else {
                Response::notFound('Teacher endpoint not found');
            }
            break;

        // Class routes
        case 'classes':
            $classController = new ClassController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'students' && isset($path_parts[2])) {
                        $classController->getClassStudents($path_parts[2]);
                    } elseif ($path_parts[1] === 'subjects' && isset($path_parts[2])) {
                        $classController->getClassSubjects($path_parts[2]);
                    } elseif ($path_parts[1] === 'statistics' && isset($path_parts[2])) {
                        $classController->getClassStatistics($path_parts[2]);
                    } elseif ($path_parts[1] === 'by-level' && isset($path_parts[2])) {
                        $classController->getClassesByLevel($path_parts[2]);
                    } else {
                        $classController->getClassById($path_parts[1]);
                    }
                } else {
                    $classController->getAllClasses();
                }
            } elseif ($method === 'POST') {
                $classController->createClass();
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                $classController->updateClass($path_parts[1]);
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $classController->deleteClass($path_parts[1]);
            } else {
                Response::notFound('Class endpoint not found');
            }
            break;

        // Results routes
        case 'results':
            $resultsController = new ResultsController();
            error_log("Results route: " . json_encode($path_parts));

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'scores' && isset($path_parts[2]) && $path_parts[2] === 'by-term') {
                        $resultsController->getScoresByTerm();
                    } elseif ($path_parts[1] === 'scores' && isset($path_parts[2]) && is_numeric($path_parts[2])) {
                        $resultsController->getScoresByAssignment($path_parts[2]);
                    } elseif ($path_parts[1] === 'student' && isset($path_parts[2])) {
                        $resultsController->getStudentResults($path_parts[2]);
                    } elseif ($path_parts[1] === 'compiled') {
                        $resultsController->getAllCompiledResults();
                    } elseif ($path_parts[1] === 'pending-approvals') {
                        $resultsController->getPendingApprovals();
                    } else {
                        Response::notFound('Results endpoint not found');
                    }
                } else {
                    Response::notFound('Results endpoint not found');
                }
            } elseif ($method === 'POST') {
                if ($path_parts[1] === 'scores' && isset($path_parts[2]) && $path_parts[2] === 'approve' && isset($path_parts[3])) {
                    $resultsController->approveScore($path_parts[3]);
                } elseif ($path_parts[1] === 'scores' && isset($path_parts[2]) && $path_parts[2] === 'reject' && isset($path_parts[3])) {
                    $resultsController->rejectScore($path_parts[3]);
                } elseif ($path_parts[1] === 'scores') {
                    $resultsController->upsertScores();
                } elseif ($path_parts[1] === 'compile') {
                    $resultsController->compileResults();
                } elseif ($path_parts[1] === 'check-status') {
                    $resultsController->checkCompilationStatus();
                } elseif ($path_parts[1] === 'student-status') {
                    $resultsController->checkStudentCompilationStatus();
                } elseif ($path_parts[1] === 'submit' && isset($path_parts[2])) {
                    $resultsController->submitScores($path_parts[2]);
                } else {
                    Response::notFound('Results endpoint not found');
                }
            } else {
                Response::notFound('Results endpoint not found');
            }
            break;

        // Payment routes
        case 'payments':
            $paymentController = new PaymentController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'reports') {
                        $paymentController->getPaymentReports();
                    } elseif ($path_parts[1] === 'online-verify') {
                        $paymentController->verifyOnlinePayment();
                    } elseif ($path_parts[1] === 'student' && isset($path_parts[2])) {
                        if (isset($path_parts[3]) && $path_parts[3] === 'history') {
                            $paymentController->getStudentPaymentHistory($path_parts[2]);
                        } elseif (isset($path_parts[3]) && $path_parts[3] === 'balance') {
                            $paymentController->getStudentFeeBalance($path_parts[2]);
                        } else {
                            Response::notFound('Payment endpoint not found');
                        }
                    } else {
                        $paymentController->getPaymentById($path_parts[1]);
                    }
                } else {
                    $paymentController->getAllPayments();
                }
            } elseif ($method === 'POST') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'verify' && isset($path_parts[2])) {
                        $paymentController->verifyPayment($path_parts[2]);
                    } elseif ($path_parts[1] === 'online-init') {
                        $paymentController->initializeOnlinePayment();
                    } elseif ($path_parts[1] === 'bank-transfer-proof') {
                        $paymentController->submitBankTransferProof();
                    } else {
                        Response::notFound('Payment endpoint not found');
                    }
                } else {
                    $paymentController->createPayment();
                }
            } else {
                Response::notFound('Payment endpoint not found');
            }
            break;

        // Parent-Student Links routes
        case 'parent-student-links':
            require_once 'controllers/ParentController.php';
            $parentController = new ParentController();

            if ($method === 'GET') {
                $parentController->getAllParentStudentLinks();
            } else {
                Response::notFound('Parent-student-links endpoint not found');
            }
            break;

        // Parents routes
        case 'parents':
            require_once 'controllers/ParentController.php';
            $parentController = new ParentController();

            // Check for special paths first (link/unlink/children)
            if (isset($path_parts[1])) {
                if ($path_parts[1] === 'children' && isset($path_parts[2])) {
                    $parentController->getParentChildren($path_parts[2]);
                } elseif ($path_parts[1] === 'link' && isset($path_parts[2])) {
                    $parentController->linkToStudent($path_parts[2]);
                } elseif ($path_parts[1] === 'unlink' && isset($path_parts[2]) && isset($path_parts[3])) {
                    $parentController->unlinkFromStudent($path_parts[2], $path_parts[3]);
                } elseif ($method === 'GET') {
                    $parentController->getParentById($path_parts[1]);
                } elseif ($method === 'PUT') {
                    $parentController->updateParent($path_parts[1]);
                } elseif ($method === 'DELETE') {
                    $parentController->deleteParent($path_parts[1]);
                } else {
                    Response::notFound('Parent endpoint not found');
                }
            } elseif ($method === 'GET') {
                $parentController->getAllParents();
            } elseif ($method === 'POST') {
                $parentController->createParent();
            } else {
                Response::notFound('Parent endpoint not found');
            }
            break;

        // Subjects routes
        case 'subjects':
            require_once 'controllers/SubjectController.php';
            $subjectController = new SubjectController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'category' && isset($path_parts[2])) {
                        $subjectController->getSubjectsByCategory($path_parts[2]);
                    } elseif ($path_parts[1] === 'assignments') {
                        $subjectController->getAssignments();
                    } elseif ($path_parts[1] === 'assign') {
                        $subjectController->assignSubject();
                    } else {
                        $subjectController->getSubjectById($path_parts[1]);
                    }
                } else {
                    $subjectController->getAllSubjects();
                }
            } elseif ($method === 'POST') {
                if (isset($path_parts[1]) && $path_parts[1] === 'assign') {
                    $subjectController->assignSubject();
                } elseif (isset($path_parts[1]) && $path_parts[1] === 'assignments') {
                    $subjectController->assignSubject();
                } else {
                    $subjectController->createSubject();
                }
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                if ($path_parts[1] === 'assignment' && isset($path_parts[2])) {
                    $subjectController->updateAssignment($path_parts[2]);
                } else {
                    $subjectController->updateSubject($path_parts[1]);
                }
            } elseif ($method === 'DELETE') {
                if (isset($path_parts[1]) && $path_parts[1] === 'assignment' && isset($path_parts[2])) {
                    $subjectController->deleteAssignment($path_parts[2]);
                } elseif (isset($path_parts[1])) {
                    $subjectController->deleteSubject($path_parts[1]);
                } else {
                    Response::notFound('Subject endpoint not found');
                }
            } else {
                Response::notFound('Subject endpoint not found');
            }
            break;

        // Subject registrations routes
        case 'subject_registrations':
            if ($method === 'GET') {
                require_once 'subject_registrations.php';
            } else {
                Response::notFound('Subject registrations endpoint not found');
            }
            break;

        // Attendance routes
        case 'attendance':
            require_once 'controllers/AttendanceController.php';
            $attendanceController = new AttendanceController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'student' && isset($path_parts[2])) {
                        $attendanceController->getStudentAttendanceSummary($path_parts[2]);
                    } elseif ($path_parts[1] === 'class' && isset($path_parts[2])) {
                        $attendanceController->getClassAttendanceSummary($path_parts[2]);
                    } elseif ($path_parts[1] === 'reports') {
                        $attendanceController->getAttendanceReports();
                    } else {
                        $attendanceController->getAttendanceByDate($path_parts[1]);
                    }
                } else {
                    $attendanceController->getAttendance();
                }
            } elseif ($method === 'POST') {
                $attendanceController->markAttendance();
            } else {
                Response::notFound('Attendance endpoint not found');
            }
            break;

        // Notifications routes
        case 'notifications':
            require_once 'controllers/NotificationController.php';
            $notificationController = new NotificationController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'unread-count') {
                        $notificationController->getUnreadCount();
                    } elseif ($path_parts[1] === 'user') {
                        $notificationController->getUserNotifications();
                    } elseif ($path_parts[1] === 'broadcast') {
                        $notificationController->broadcastNotification();
                    } elseif ($path_parts[1] === 'mark-all-read') {
                        $notificationController->markAllAsRead();
                    } else {
                        $notificationController->getNotificationById($path_parts[1]);
                    }
                } else {
                    $notificationController->getNotifications();
                }
            } elseif ($method === 'POST') {
                if (isset($path_parts[1]) && $path_parts[1] === 'broadcast') {
                    $notificationController->broadcastNotification();
                } else {
                    $notificationController->createNotification();
                }
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                if ($path_parts[1] === 'mark-all-read') {
                    $notificationController->markAllAsRead();
                } else {
                    $notificationController->markAsRead($path_parts[1]);
                }
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $notificationController->deleteNotificationForUser($path_parts[1]);
            } else {
                Response::notFound('Notification endpoint not found');
            }
            break;

        // Assignments routes
        case 'assignments':
            require_once 'controllers/AssignmentController.php';
            $assignmentController = new AssignmentController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'submissions' && isset($path_parts[2])) {
                        $assignmentController->getSubmissions($path_parts[2]);
                    } else {
                        $assignmentController->getAssignmentById($path_parts[1]);
                    }
                } else {
                    $assignmentController->getAllAssignments();
                }
            } elseif ($method === 'POST') {
                if (isset($path_parts[1]) && $path_parts[1] === 'submit') {
                    $assignmentController->submitAssignment($path_parts[2]);
                } else {
                    $assignmentController->createAssignment();
                }
            } elseif ($method === 'PUT' && isset($path_parts[1])) {
                if ($path_parts[1] === 'grade' && isset($path_parts[2])) {
                    $assignmentController->gradeAssignment($path_parts[2]);
                } else {
                    $assignmentController->updateAssignment($path_parts[1]);
                }
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $assignmentController->deleteAssignment($path_parts[1]);
            } else {
                Response::notFound('Assignment endpoint not found');
            }
            break;

        // Results routes
        case 'results':
            require_once 'controllers/ResultsController.php';
            $resultsController = new ResultsController();

            if ($method === 'GET') {
                if (isset($path_parts[1]) && $path_parts[1] === 'compiled') {
                    $resultsController->getAllCompiledResults();
                } elseif (isset($path_parts[1]) && $path_parts[1] === 'pending-approvals') {
                    $resultsController->getPendingApprovals();
                } elseif (isset($path_parts[1]) && $path_parts[1] === 'assignment' && isset($path_parts[2])) {
                    $resultsController->getScoresByAssignment($path_parts[2]);
                } else {
                    $resultsController->getScoresByTerm();
                }
            } elseif ($method === 'POST') {
                if (isset($path_parts[1]) && $path_parts[1] === 'compile') {
                    $resultsController->compileResults();
                } elseif (isset($path_parts[1]) && $path_parts[1] === 'approve' && isset($path_parts[2])) {
                    $resultsController->approveResult($path_parts[2]);
                } else {
                    Response::notFound('Results endpoint not found');
                }
            } else {
                Response::notFound('Results endpoint not found');
            }
            break;

        // Reports routes
        case 'reports':
            require_once 'controllers/ReportController.php';
            $reportController = new ReportController();

            if ($method === 'GET') {
                if (isset($path_parts[1])) {
                    if ($path_parts[1] === 'student' && $method === 'POST') {
                        $reportController->generateStudentReportCard();
                    } elseif ($path_parts[1] === 'class' && $method === 'POST') {
                        $reportController->generateClassPerformanceReport();
                    } elseif ($path_parts[1] === 'financial') {
                        $reportController->generateFinancialReport();
                    } elseif ($path_parts[1] === 'attendance') {
                        $reportController->generateAttendanceReport();
                    } else {
                        Response::notFound('Report endpoint not found');
                    }
                } else {
                    Response::notFound('Report endpoint not found');
                }
            } elseif ($method === 'POST') {
                if (isset($path_parts[1]) && $path_parts[1] === 'student') {
                    $reportController->generateStudentReportCard();
                } elseif (isset($path_parts[1]) && $path_parts[1] === 'class') {
                    $reportController->generateClassPerformanceReport();
                } else {
                    Response::notFound('Report endpoint not found');
                }
            } else {
                Response::notFound('Report endpoint not found');
            }
            break;

        // File upload routes
        case 'files':
            $fileController = new FileController();

            if ($method === 'POST' && $path_parts[1] === 'upload') {
                $fileController->uploadLogo();
            } elseif ($method === 'DELETE' && isset($path_parts[1])) {
                $fileController->deleteFile($path_parts[1]);
            } else {
                Response::notFound('File endpoint not found');
            }
            break;

        // Database query routes for CSV operations


        // School Settings routes
        case 'school_settings':
            require_once 'school_settings.php';
            break;

        // Academic Years routes
        case 'academic_years':
            require_once 'academic_years.php';
            break;

        // Default route
        default:
            // API info endpoint
            if ($path_parts[0] === '' || $path_parts[0] === 'info') {
                Response::success([
                    'name' => 'Graceland Royal Academy API',
                    'version' => '1.0.0',
                    'description' => 'School Management System REST API',
                    'endpoints' => [
                        'Authentication' => [
                            'POST /auth/login' => 'User login',
                            'POST /auth/logout' => 'User logout',
                            'GET /auth/profile' => 'Get user profile',
                            'POST /auth/change-password' => 'Change password',
                            'POST /auth/refresh-token' => 'Refresh JWT token'
                        ],
                        'Students' => [
                            'GET /students' => 'Get all students',
                            'GET /students/{id}' => 'Get student by ID',
                            'POST /students' => 'Create new student',
                            'PUT /students/{id}' => 'Update student',
                            'DELETE /students/{id}' => 'Delete student',
                            'GET /students/by-class/{class_id}' => 'Get students by class',
                            'POST /students/promote' => 'Promote students'
                        ],
                        'Teachers' => [
                            'GET /teachers' => 'Get all teachers',
                            'GET /teachers/{id}' => 'Get teacher by ID',
                            'POST /teachers' => 'Create new teacher',
                            'PUT /teachers/{id}' => 'Update teacher',
                            'DELETE /teachers/{id}' => 'Delete teacher',
                            'GET /teachers/assignments/{teacher_id}' => 'Get teacher assignments',
                            'GET /teachers/students/{teacher_id}' => 'Get teacher class students'
                        ],
                        'Classes' => [
                            'GET /classes' => 'Get all classes',
                            'GET /classes/{id}' => 'Get class by ID',
                            'POST /classes' => 'Create new class',
                            'PUT /classes/{id}' => 'Update class',
                            'DELETE /classes/{id}' => 'Delete class',
                            'GET /classes/students/{class_id}' => 'Get class students',
                            'GET /classes/subjects/{class_id}' => 'Get class subjects',
                            'GET /classes/statistics/{class_id}' => 'Get class statistics',
                            'GET /classes/by-level/{level}' => 'Get classes by level'
                        ],
                        'Results' => [
                            'GET /results/scores/{assignment_id}' => 'Get scores by assignment',
                            'POST /results/scores' => 'Create/update scores',
                            'POST /results/submit/{assignment_id}' => 'Submit scores for approval',
                            'GET /results/student/{student_id}' => 'Get student results',
                            'GET /results/compiled' => 'Get all compiled results',
                            'POST /results/compile' => 'Compile student results',
                            'GET /results/pending-approvals' => 'Get pending approvals',
                            'POST /results/approve/{result_id}' => 'Approve/reject result'
                        ],
                        'Payments' => [
                            'GET /payments' => 'Get all payments',
                            'GET /payments/{id}' => 'Get payment by ID',
                            'POST /payments' => 'Create new payment',
                            'POST /payments/verify/{id}' => 'Verify/reject payment',
                            'GET /payments/student/{student_id}/history' => 'Get student payment history',
                            'GET /payments/student/{student_id}/balance' => 'Get student fee balance',
                            'GET /payments/reports' => 'Get payment reports'
                        ],
                        'Parents' => [
                            'GET /parents' => 'Get all parents',
                            'GET /parents/{id}' => 'Get parent by ID',
                            'POST /parents' => 'Create new parent',
                            'PUT /parents/{id}' => 'Update parent',
                            'DELETE /parents/{id}' => 'Delete parent',
                            'GET /parents/children/{parent_id}' => 'Get parent children',
                            'POST /parents/link/{parent_id}' => 'Link parent to student',
                            'DELETE /parents/unlink/{parent_id}/{student_id}' => 'Unlink parent from student'
                        ],
                        'Subjects' => [
                            'GET /subjects' => 'Get all subjects',
                            'GET /subjects/{id}' => 'Get subject by ID',
                            'POST /subjects' => 'Create new subject',
                            'PUT /subjects/{id}' => 'Update subject',
                            'DELETE /subjects/{id}' => 'Delete subject',
                            'GET /subjects/category/{category}' => 'Get subjects by category',
                            'GET /subjects/assignments' => 'Get subject assignments',
                            'POST /subjects/assign' => 'Assign subject to class and teacher',
                            'PUT /subjects/assignment/{id}' => 'Update subject assignment',
                            'DELETE /subjects/assignment/{id}' => 'Delete subject assignment'
                        ],
                        'Attendance' => [
                            'GET /attendance' => 'Get all attendance records',
                            'GET /attendance/{date}' => 'Get attendance by date',
                            'POST /attendance' => 'Mark attendance',
                            'GET /attendance/student/{student_id}' => 'Get student attendance summary',
                            'GET /attendance/class/{class_id}' => 'Get class attendance summary',
                            'GET /attendance/reports' => 'Get attendance reports'
                        ],
                        'Notifications' => [
                            'GET /notifications' => 'Get all notifications',
                            'GET /notifications/{id}' => 'Get notification by ID',
                            'POST /notifications' => 'Create new notification',
                            'PUT /notifications/{id}' => 'Mark notification as read',
                            'DELETE /notifications/{id}' => 'Delete notification',
                            'GET /notifications/unread-count' => 'Get unread count',
                            'GET /notifications/user' => 'Get user notifications',
                            'POST /notifications/broadcast' => 'Broadcast notification',
                            'PUT /notifications/mark-all-read' => 'Mark all as read'
                        ],
                        'Assignments' => [
                            'GET /assignments' => 'Get all assignments',
                            'GET /assignments/{id}' => 'Get assignment by ID',
                            'POST /assignments' => 'Create new assignment',
                            'PUT /assignments/{id}' => 'Update assignment',
                            'DELETE /assignments/{id}' => 'Delete assignment',
                            'GET /assignments/submissions/{assignment_id}' => 'Get assignment submissions',
                            'POST /assignments/submit/{assignment_id}' => 'Submit assignment',
                            'PUT /assignments/grade/{submission_id}' => 'Grade assignment'
                        ],
                        'Reports' => [
                            'POST /reports/student' => 'Generate student report card',
                            'POST /reports/class' => 'Generate class performance report',
                            'GET /reports/financial' => 'Generate financial report',
                            'GET /reports/attendance' => 'Generate attendance report'
                        ]
                    ],
                    'authentication' => 'JWT Bearer Token required for protected endpoints',
                    'documentation' => 'Contact system administrator for detailed API documentation'
                ], 'API Information');
            } else {
                Response::notFound('Endpoint not found');
            }
            break;
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    Response::serverError('Internal server error');
}
?>