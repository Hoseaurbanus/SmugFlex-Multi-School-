<?php
/**
 * Notification Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class NotificationController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Notifications
     */
    public function getNotifications() {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        // FIX: Custom pagination allowing up to 1000
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 1000) $limit = 20;
        $offset = ($page - 1) * $limit;

        $search_params = Middleware::getSearchParams(['id', 'title', 'created_at', 'status', 'priority']);

        try {
            // FIX: Check MySQL version and column existence for schema-agnostic queries
            $version_query = $this->conn->query("SELECT VERSION()");
            $version = $version_query->fetchColumn();
            $supports_json = version_compare($version, '5.7.8', '>=') ||
                            (stripos($version, 'MariaDB') !== false && version_compare($version, '10.2.3', '>='));

            // FIX: Check if deleted_by column exists
            $col_check = $this->conn->prepare("SHOW COLUMNS FROM notifications LIKE 'deleted_by'");
            $col_check->execute();
            $has_deleted_by = $col_check->fetch(PDO::FETCH_ASSOC) !== false;

            // FIX: Check if user_notifications table exists
            $table_check = $this->conn->prepare("SHOW TABLES LIKE 'user_notifications'");
            $table_check->execute();
            $has_user_notifications = $table_check->fetch(PDO::FETCH_ASSOC) !== false;

            // Build query dynamically based on schema
            $select_cols = "n.*, COALESCE(u.username, 'System') as created_by_name";
            $joins = "LEFT JOIN users u ON n.sent_by = u.id";
            $params = [];

            if ($has_user_notifications && $token_data['role'] !== 'admin') {
                $select_cols .= ", un.is_read, un.read_at";
                $joins = "LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = :user_id " . $joins;
                $params[':user_id'] = $token_data['user_id'];
            } else {
                $select_cols .= ", 0 as is_read, NULL as read_at";
            }

            $query = "SELECT $select_cols
                      FROM notifications n
                      $joins";

            $count_query = "SELECT COUNT(*) as total FROM notifications n";

            // Add search conditions
            $conditions = [];

            if (!empty($search_params['search'])) {
                $conditions[] = "(n.title LIKE :search OR n.message LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }

            // Filter by type
            if (isset($_GET['type'])) {
                $conditions[] = "n.type = :type";
                $params[':type'] = Middleware::validateEnum($_GET['type'], ['Info', 'Warning', 'Success', 'Error'], 'type');
            }

            // Filter by priority
            if (isset($_GET['priority'])) {
                $conditions[] = "n.priority = :priority";
                $params[':priority'] = Middleware::validateEnum($_GET['priority'], ['Low', 'Medium', 'High', 'Urgent'], 'priority');
            }

            // Filter by target audience
            if (isset($_GET['target_audience'])) {
                $conditions[] = "n.target_audience = :target_audience";
                $params[':target_audience'] = Middleware::validateEnum($_GET['target_audience'], ['All', 'Admin', 'Teacher', 'Accountant', 'Parent', 'Students'], 'target_audience');
            }

            // Filter by date range
            if (isset($_GET['date_from'])) {
                $conditions[] = "n.created_at >= :date_from";
                $params[':date_from'] = Middleware::validateDate($_GET['date_from']);
            }
            if (isset($_GET['date_to'])) {
                $conditions[] = "n.created_at <= :date_to";
                $params[':date_to'] = Middleware::validateDate($_GET['date_to']);
            }

            // Filter by user role (non-admin only sees their role's notifications)
            if ($token_data['role'] !== 'admin') {
                $conditions[] = "(n.target_audience = 'All' OR n.target_audience = :user_role)";
                $params[':user_role'] = ucfirst($token_data['role']);
            }

            // School tenant scoping
            $conditions[] = "n.school_id = :school_id";
            $params[':school_id'] = $school_id;

            // Add deleted_by filter only if column exists and JSON is supported
            if ($has_deleted_by && $supports_json) {
                $conditions[] = "(
                    n.deleted_by IS NULL OR n.deleted_by = ''
                    OR JSON_VALID(n.deleted_by) = 0
                    OR JSON_CONTAINS(n.deleted_by, :user_id_json, '$') = 0
                )";
                $params[':user_id_json'] = json_encode((int)$token_data['user_id']);
            }

            if (!empty($conditions)) {
                $where_clause = " WHERE " . implode(' AND ', $conditions);
                $query .= $where_clause;
                $count_query .= $where_clause;
            }

            $query .= " ORDER BY n.{$search_params['sort_by']} {$search_params['sort_order']}";
            $query .= " LIMIT :limit OFFSET :offset";

            $stmt = $this->conn->prepare($query);

            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }

            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $notifications = $stmt->fetchAll();

            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                if ($key === ':user_id') continue;
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];

            Response::paginated($notifications, $page, $limit, $total);

        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error: ' . $e->getMessage());
        } catch (Exception $e) {
            Response::serverError('Error: ' . $e->getMessage());
        }
    }
    
    /**
     * Get Notification by ID
     */
    public function getNotificationById($id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $notification_id = Middleware::validateInteger($id, 'notification_id');
        
        try {
            $query = "SELECT n.*, 
                             COALESCE(u.username, 'System') as created_by_name
                       FROM notifications n
                       LEFT JOIN users u ON n.sent_by = u.id
                       WHERE n.id = :id AND n.school_id = :school_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $notification_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $notification = $stmt->fetch();
            
            if (!$notification) {
                Response::notFound('Notification not found');
            }
            
            // Check access permissions
            if ($token_data['role'] !== 'admin') {
                if ($notification['target_audience'] !== 'All' && $notification['target_audience'] !== ucfirst($token_data['role'])) {
                    Response::forbidden('Access denied to this notification');
                }
            }
            
            Response::success($notification, 'Notification retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error retrieving notification');
        }
    }
    
    /**
     * Create New Notification
     */
    public function createNotification() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['title', 'message', 'target_audience']);
        
        try {
            // Validate and prepare data
            $title = Middleware::sanitizeString($data['title']);
            $message = Middleware::sanitizeString($data['message']);
            $target_audience = Middleware::validateEnum($data['target_audience'], ['All', 'Admin', 'Teacher', 'Accountant', 'Parent', 'Students'], 'target_audience');
            $type = isset($data['type']) ? Middleware::validateEnum($data['type'], ['Info', 'Warning', 'Success', 'Error'], 'type') : 'Info';
            $priority = isset($data['priority']) ? Middleware::validateEnum($data['priority'], ['Low', 'Medium', 'High', 'Urgent'], 'priority') : 'Medium';
            $expires_at = isset($data['expires_at']) ? Middleware::validateDate($data['expires_at']) : null;
            
            // Handle target users for specific audience
            $target_users = null;
            if (isset($data['target_users']) && is_array($data['target_users'])) {
                $target_users = json_encode($data['target_users']);
            }
            
            // Insert notification
            $query = "INSERT INTO notifications (title, message, type, target_audience, target_users, expires_at, sent_by, school_id)
                      VALUES (:title, :message, :type, :target_audience, :target_users, :expires_at, :sent_by, :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':title', $title);
            $stmt->bindParam(':message', $message);
            $stmt->bindParam(':type', $type);
            $stmt->bindParam(':target_audience', $target_audience);
            $stmt->bindParam(':target_users', $target_users);
            $stmt->bindParam(':expires_at', $expires_at);
            $sent_by = (int)($token_data['user_id'] ?? 1);
            $stmt->bindParam(':sent_by', $sent_by);
            $stmt->bindParam(':school_id', $school_id);
            
            $stmt->execute();
            $notification_id = $this->conn->lastInsertId();

            RealtimeEvents::publish('notifications', [
                'action' => 'created',
                'notification_id' => (int)$notification_id,
                'target_audience' => $target_audience,
            ]);
            
            // Create user notification records for specific users
            if ($target_users) {
                $target_user_array = json_decode($target_users, true);
                foreach ($target_user_array as $user_id) {
                    $user_notification_query = "INSERT INTO user_notifications (user_id, notification_id, is_read) 
                                                VALUES (:user_id, :notification_id, FALSE)";
                    $user_notification_stmt = $this->conn->prepare($user_notification_query);
                    $user_notification_stmt->bindParam(':user_id', $user_id);
                    $user_notification_stmt->bindParam(':notification_id', $notification_id);
                    $user_notification_stmt->execute();
                }
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'CREATE_NOTIFICATION',
                "Notification: $title",
                'Success',
                "Notification sent to $target_audience",
                $_SESSION['user_id'] ?? null
            );
            
            Response::created(['id' => $notification_id], 'Notification created successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error creating notification');
        }
    }
    
    /**
     * Mark Notification as Read
     */
    public function markAsRead($id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $notification_id = Middleware::validateInteger($id, 'notification_id');
        
        try {
            // Check if notification exists and user has access
            $check_query = "SELECT * FROM notifications WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $notification_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $notification = $check_stmt->fetch();
            if (!$notification) {
                Response::notFound('Notification not found');
            }
            
            // Check access permissions
            if ($token_data['role'] !== 'admin') {
                if ($notification['target_audience'] !== 'All' && $notification['target_audience'] !== ucfirst($token_data['role'])) {
                    Response::forbidden('Access denied to this notification');
                }
            }
            
            // FIX: Check if user_notifications table exists
            $table_check = $this->conn->prepare("SHOW TABLES LIKE 'user_notifications'");
            $table_check->execute();
            $has_user_notifications = $table_check->fetch(PDO::FETCH_ASSOC) !== false;
            
            if ($has_user_notifications) {
                // Mark as read for this user
                $update_query = "INSERT INTO user_notifications (user_id, notification_id, is_read, read_at)
                                VALUES (:user_id, :notification_id, TRUE, NOW())
                                ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW()";
                
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':user_id', $token_data['user_id']);
                $update_stmt->bindParam(':notification_id', $notification_id);
                $update_stmt->execute();
            }

            RealtimeEvents::publish('notifications', [
                'action' => 'read',
                'notification_id' => (int)$notification_id,
                'user_id' => (int)$token_data['user_id'],
            ]);
            
            Response::success(null, 'Notification marked as read');
            
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error marking notification as read');
        }
    }
    
    /**
     * Mark All Notifications as Read
     */
    public function markAllAsRead() {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        try {
            // FIX: Check if user_notifications table exists
            $table_check = $this->conn->prepare("SHOW TABLES LIKE 'user_notifications'");
            $table_check->execute();
            $has_user_notifications = $table_check->fetch(PDO::FETCH_ASSOC) !== false;
            
            if ($has_user_notifications) {
                // Get all unread notifications for this user
                $query = "SELECT n.id FROM notifications n
                          WHERE (n.target_audience = 'All' OR n.target_audience = :user_role)
                          AND n.school_id = :school_id
                          AND n.id NOT IN (
                              SELECT notification_id FROM user_notifications 
                              WHERE user_id = :user_id AND is_read = TRUE
                          )";
                
                $stmt = $this->conn->prepare($query);
                $user_role = ucfirst($token_data['role']);
                $stmt->bindParam(':user_role', $user_role);
                $stmt->bindParam(':user_id', $token_data['user_id']);
                $stmt->bindParam(':school_id', $school_id);
                $stmt->execute();
                
                $unread_notifications = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
                
                // Mark all as read
                foreach ($unread_notifications as $notification_id) {
                    $update_query = "INSERT INTO user_notifications (user_id, notification_id, is_read, read_at)
                                    VALUES (:user_id, :notification_id, TRUE, NOW())
                                    ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW()";
                    
                    $update_stmt = $this->conn->prepare($update_query);
                    $update_stmt->bindParam(':user_id', $token_data['user_id']);
                    $update_stmt->bindParam(':notification_id', $notification_id);
                    $update_stmt->execute();
                }
            }

            RealtimeEvents::publish('notifications', [
                'action' => 'read_all',
                'user_id' => (int)$token_data['user_id'],
            ]);
            
            Response::success(null, 'All notifications marked as read');
            
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error marking all notifications as read');
        }
    }
    
    /**
     * Delete Notification
     */
    public function deleteNotification($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $id = Middleware::validateInteger($id, 'id');
        
        try {
            // First, get notification details for logging
            $check_query = "SELECT title FROM notifications WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $id);
            $check_stmt->bindParam(':school_id', $school_id);
            $notification = $check_stmt->fetch();

            if (!$notification) {
                Response::notFound('Notification not found');
            }

            $query = "DELETE FROM notifications WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':school_id', $school_id);
            
            if ($stmt->execute()) {
                RealtimeEvents::publish('notifications', [
                    'action' => 'deleted',
                    'notification_id' => (int)$id,
                ]);

                // Log activity
                Middleware::logActivity(
                    'Admin',
                    'Admin',
                    'DELETE_NOTIFICATION',
                    "Notification: {$notification['title']}",
                    'Success',
                    'Notification deleted',
                    $_SESSION['user_id'] ?? null
                );
                
                Response::success(null, 'Notification deleted successfully');
            } else {
                Response::serverError('Failed to delete notification');
            }
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error deleting notification');
        }
    }
    
    /**
     * Get Unread Count
     */
    public function deleteNotificationForUser($id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $user_id = $token_data['user_id'];
        $id = Middleware::validateInteger($id, 'id');
        
        try {
            // Ensure deleted_by column exists
            try {
                $col_check = $this->conn->prepare("SHOW COLUMNS FROM notifications LIKE 'deleted_by'");
                $col_check->execute();
                $has_col = $col_check->fetch(PDO::FETCH_ASSOC);
                if (!$has_col) {
                    $this->conn->exec("ALTER TABLE notifications ADD COLUMN deleted_by TEXT NULL");
                }
            } catch (Exception $e) {
                // Ignore schema check failures
            }

            // Get current deleted_by array
            $query = "SELECT deleted_by FROM notifications WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            $notification = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$notification) {
                Response::notFound('Notification not found');
            }

            $deleted_by = [];
            if (!empty($notification['deleted_by'])) {
                $parsed = json_decode($notification['deleted_by'], true);
                if (is_array($parsed)) {
                    $deleted_by = $parsed;
                }
            }

            if (!in_array($user_id, $deleted_by)) {
                $deleted_by[] = $user_id;
            }

            $update_query = "UPDATE notifications SET deleted_by = :deleted_by WHERE id = :id AND school_id = :school_id";
            $update_stmt = $this->conn->prepare($update_query);
            $encoded = json_encode(array_values($deleted_by));
            $update_stmt->bindParam(':deleted_by', $encoded);
            $update_stmt->bindParam(':id', $id);
            $update_stmt->bindParam(':school_id', $school_id);
            $update_stmt->execute();

            Response::success(null, 'Notification dismissed for user.');

        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error updating notification');
        }
    }

    /**
     * Get Unread Count
     */
    public function getUnreadCount() {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        try {
            // FIX: Check if user_notifications table exists
            $table_check = $this->conn->prepare("SHOW TABLES LIKE 'user_notifications'");
            $table_check->execute();
            $has_user_notifications = $table_check->fetch(PDO::FETCH_ASSOC) !== false;
            
            if ($has_user_notifications) {
                // Use user_notifications table for accurate read tracking
                $query = "SELECT COUNT(*) as unread_count
                          FROM notifications n
                          WHERE (n.target_audience = 'All' OR n.target_audience = :user_role)
                          AND n.id NOT IN (
                              SELECT notification_id FROM user_notifications 
                              WHERE user_id = :user_id AND is_read = TRUE
                          )
                           AND n.school_id = :school_id
                          AND (n.expires_at IS NULL OR n.expires_at > NOW())";
             } else {
                // Fallback: assume all notifications are unread
                $query = "SELECT COUNT(*) as unread_count
                          FROM notifications n
                          WHERE (n.target_audience = 'All' OR n.target_audience = :user_role)
                          AND n.school_id = :school_id
                          AND (n.expires_at IS NULL OR n.expires_at > NOW())";
            }
            
            $stmt = $this->conn->prepare($query);
            $user_role = ucfirst($token_data['role']);
            $stmt->bindParam(':user_role', $user_role);
            $stmt->bindParam(':school_id', $school_id);
            if ($has_user_notifications) {
                $stmt->bindParam(':user_id', $token_data['user_id']);
            }
            $stmt->execute();
            
            $result = $stmt->fetch();
            
            Response::success(['unread_count' => $result['unread_count']], 'Unread count retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error retrieving unread count');
        }
    }
    
    /**
     * Get User Notifications
     */
    public function getUserNotifications() {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        // FIX: Remove limit restriction to allow unlimited notifications
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($page < 1) $page = 1;
        if ($limit < 1) $limit = 20;
        $offset = ($page - 1) * $limit;
        
        try {
            // FIX: Check MySQL version and column existence with error handling
            $version = '5.7.0'; // Default fallback
            $supports_json = false;
            try {
                $version_query = $this->conn->query("SELECT VERSION()");
                if ($version_query) {
                    $version = $version_query->fetchColumn();
                    $supports_json = version_compare($version, '5.7.8', '>=') || 
                                    (stripos($version, 'MariaDB') !== false && version_compare($version, '10.2.3', '>='));
                }
            } catch (PDOException $e) {
                error_log("Warning: Could not check MySQL version: " . $e->getMessage());
                // Continue with default values
            }

            // FIX: Check if deleted_by column exists with error handling
            $has_deleted_by = false;
            try {
                $col_check = $this->conn->prepare("SHOW COLUMNS FROM notifications LIKE 'deleted_by'");
                if ($col_check) {
                    $col_check->execute();
                    $has_deleted_by = $col_check->fetch(PDO::FETCH_ASSOC) !== false;
                }
            } catch (PDOException $e) {
                error_log("Warning: Could not check deleted_by column: " . $e->getMessage());
                // Continue assuming column doesn't exist
            }

            // FIX: Check if user_notifications table exists with error handling
            $has_user_notifications = false;
            try {
                $table_check = $this->conn->prepare("SHOW TABLES LIKE 'user_notifications'");
                if ($table_check) {
                    $table_check->execute();
                    $has_user_notifications = $table_check->fetch(PDO::FETCH_ASSOC) !== false;
                }
            } catch (PDOException $e) {
                error_log("Warning: Could not check user_notifications table: " . $e->getMessage());
                // Continue assuming table doesn't exist
            }

            // Build query dynamically based on schema
            $select_cols = "n.*, COALESCE(u.username, 'System') as created_by_name";
            $joins = "LEFT JOIN users u ON n.sent_by = u.id";
            $params = [];
            
            if ($has_user_notifications) {
                $select_cols .= ", un.is_read, un.read_at";
                $joins = "LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = :user_id " . $joins;
                $params[':user_id'] = $token_data['user_id'];
            } else {
                $select_cols .= ", 0 as is_read, NULL as read_at";
            }

            $where = "(n.target_audience = 'All' OR n.target_audience = :user_role)";
            $params[':user_role'] = ucfirst($token_data['role']);
            $where .= " AND n.school_id = :school_id";
            $params[':school_id'] = $school_id;

            // Add target_users filtering if JSON is supported
            if ($supports_json) {
                $where .= " AND (
                    n.target_users IS NULL OR n.target_users = ''
                    OR JSON_VALID(n.target_users) = 0
                    OR JSON_CONTAINS(n.target_users, :target_user_id, '$') = 1
                )";
                $params[':target_user_id'] = json_encode((int)$token_data['user_id']);
            }

            // Add deleted_by filter only if column exists and JSON is supported
            if ($has_deleted_by && $supports_json) {
                $where .= " AND (
                    n.deleted_by IS NULL OR n.deleted_by = ''
                    OR JSON_VALID(n.deleted_by) = 0
                    OR JSON_CONTAINS(n.deleted_by, :deleted_by_user_id, '$') = 0
                )";
                $params[':deleted_by_user_id'] = json_encode((int)$token_data['user_id']);
            }

            // Add expires filter
            $where .= " AND (n.expires_at IS NULL OR n.expires_at > NOW())";

            $query = "SELECT $select_cols
                      FROM notifications n
                      $joins
                      WHERE $where
                       ORDER BY n.sent_date DESC
                      LIMIT :limit OFFSET :offset";

            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $notifications = $stmt->fetchAll();

            Response::success($notifications, 'User notifications retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("Database error in getUserNotifications: " . $e->getMessage());
            Response::serverError('Database error: ' . $e->getMessage());
        } catch (Exception $e) {
            error_log("General error in getUserNotifications: " . $e->getMessage());
            Response::serverError('Error: ' . $e->getMessage());
        }
    }
    
    /**
     * Broadcast Notification (Real-time simulation)
     */
    public function broadcastNotification() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['title', 'message', 'target_audience']);
        
        try {
            // Create notification
            $title = Middleware::sanitizeString($data['title']);
            $message = Middleware::sanitizeString($data['message']);
            $target_audience = Middleware::validateEnum($data['target_audience'], ['All', 'Admin', 'Teacher', 'Accountant', 'Parent', 'Students'], 'target_audience');
            $type = isset($data['type']) ? Middleware::validateEnum($data['type'], ['Info', 'Warning', 'Success', 'Error'], 'type') : 'Info';
            $priority = isset($data['priority']) ? Middleware::validateEnum($data['priority'], ['Low', 'Medium', 'High', 'Urgent'], 'priority') : 'Medium';
            
            // Insert notification
            $query = "INSERT INTO notifications (title, message, type, target_audience, sent_by, school_id)
                      VALUES (:title, :message, :type, :target_audience, :sent_by, :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':title', $title);
            $stmt->bindParam(':message', $message);
            $stmt->bindParam(':type', $type);
            $stmt->bindParam(':target_audience', $target_audience);
            $sent_by = (int)($token_data['user_id'] ?? 1);
            $stmt->bindParam(':sent_by', $sent_by);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $notification_id = $this->conn->lastInsertId();
            
            // In a real implementation, this would trigger WebSocket or SSE events
            // For now, we'll simulate it by creating user notification records
            
            // Get target users
            $users_query = "SELECT id FROM users WHERE (role = :role OR :target_audience = 'All') AND school_id = :school_id";
            $users_stmt = $this->conn->prepare($users_query);
            
            if ($target_audience === 'All') {
                $dummy_role = 'dummy';
                $users_stmt->bindParam(':role', $dummy_role); // Won't be used
                $users_stmt->bindParam(':target_audience', $target_audience);
                $users_stmt->bindParam(':school_id', $school_id);
            } else {
                $role_param = strtolower($target_audience);
                $dummy_audience = 'dummy';
                $users_stmt->bindParam(':role', $role_param);
                $users_stmt->bindParam(':target_audience', $dummy_audience); // Won't be used
                $users_stmt->bindParam(':school_id', $school_id);
            }
            
            $users_stmt->execute();
            $target_users = $users_stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            
            // Create user notification records
            foreach ($target_users as $user_id) {
                $user_notification_query = "INSERT INTO user_notifications (user_id, notification_id, is_read) 
                                            VALUES (:user_id, :notification_id, FALSE)";
                $user_notification_stmt = $this->conn->prepare($user_notification_query);
                $user_notification_stmt->bindParam(':user_id', $user_id);
                $user_notification_stmt->bindParam(':notification_id', $notification_id);
                $user_notification_stmt->execute();
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'BROADCAST_NOTIFICATION',
                "Notification: $title",
                'Success',
                "Notification broadcasted to $target_audience (" . count($target_users) . " users)",
                $_SESSION['user_id'] ?? null
            );
            
            Response::created(['id' => $notification_id, 'target_users' => count($target_users)], 'Notification broadcasted successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in NotificationController: " . $e->getMessage());
            Response::serverError('Database error broadcasting notification');
        }
    }
}
?>
