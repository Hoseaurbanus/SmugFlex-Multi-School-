<?php
/**
 * Notification Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

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
        
        $pagination = Middleware::getPaginationParams();
        $search_params = Middleware::getSearchParams();
        
        try {
            $query = "SELECT n.*, 
                             CONCAT(u.first_name, ' ', u.last_name) as created_by_name
                      FROM notifications n
                      LEFT JOIN users u ON n.created_by = u.id";
            
            $count_query = "SELECT COUNT(*) as total FROM notifications n";
            
            // Add search conditions
            $conditions = [];
            $params = [];
            
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
            
            // Filter by read status (for user-specific notifications)
            if (isset($_GET['is_read'])) {
                $conditions[] = "n.is_read = :is_read";
                $params[':is_read'] = (bool)$_GET['is_read'];
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
            
            // Filter by user role
            if ($token_data['role'] !== 'admin') {
                $conditions[] = "(n.target_audience = 'All' OR n.target_audience = :user_role)";
                $params[':user_role'] = ucfirst($token_data['role']);
            }
            
            if (!empty($conditions)) {
                $query .= " WHERE " . implode(' AND ', $conditions);
                $count_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY n.{$search_params['sort_by']} {$search_params['sort_order']}";
            $query .= " LIMIT :limit OFFSET :offset";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            
            $notifications = $stmt->fetchAll();
            
            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];
            
            Response::paginated($notifications, $pagination['page'], $pagination['limit'], $total);
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving notifications');
        }
    }
    
    /**
     * Get Notification by ID
     */
    public function getNotificationById($id) {
        $token_data = Middleware::requireAuth();
        $notification_id = Middleware::validateInteger($id, 'notification_id');
        
        try {
            $query = "SELECT n.*, 
                             CONCAT(u.first_name, ' ', u.last_name) as created_by_name
                      FROM notifications n
                      LEFT JOIN users u ON n.created_by = u.id
                      WHERE n.id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $notification_id);
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
            Response::serverError('Database error retrieving notification');
        }
    }
    
    /**
     * Create New Notification
     */
    public function createNotification() {
        Middleware::requireRole('admin');
        
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
            $query = "INSERT INTO notifications (title, message, type, priority, target_audience, target_users, expires_at, created_by)
                      VALUES (:title, :message, :type, :priority, :target_audience, :target_users, :expires_at, :created_by)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':title', $title);
            $stmt->bindParam(':message', $message);
            $stmt->bindParam(':type', $type);
            $stmt->bindParam(':priority', $priority);
            $stmt->bindParam(':target_audience', $target_audience);
            $stmt->bindParam(':target_users', $target_users);
            $stmt->bindParam(':expires_at', $expires_at);
            $created_by = $_SESSION['user_id'] ?? 1;
            $stmt->bindParam(':created_by', $created_by);
            
            $stmt->execute();
            $notification_id = $this->conn->lastInsertId();
            
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
            Response::serverError('Database error creating notification');
        }
    }
    
    /**
     * Mark Notification as Read
     */
    public function markAsRead($id) {
        $token_data = Middleware::requireAuth();
        $notification_id = Middleware::validateInteger($id, 'notification_id');
        
        try {
            // Check if notification exists and user has access
            $check_query = "SELECT * FROM notifications WHERE id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $notification_id);
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
            
            // Mark as read for this user
            $update_query = "INSERT INTO user_notifications (user_id, notification_id, is_read, read_at)
                            VALUES (:user_id, :notification_id, TRUE, NOW())
                            ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW()";
            
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':user_id', $token_data['user_id']);
            $update_stmt->bindParam(':notification_id', $notification_id);
            $update_stmt->execute();
            
            Response::success(null, 'Notification marked as read');
            
        } catch (PDOException $e) {
            Response::serverError('Database error marking notification as read');
        }
    }
    
    /**
     * Mark All Notifications as Read
     */
    public function markAllAsRead() {
        $token_data = Middleware::requireAuth();
        
        try {
            // Get all unread notifications for this user
            $query = "SELECT n.id FROM notifications n
                      WHERE (n.target_audience = 'All' OR n.target_audience = :user_role)
                      AND n.id NOT IN (
                          SELECT notification_id FROM user_notifications 
                          WHERE user_id = :user_id AND is_read = TRUE
                      )";
            
            $stmt = $this->conn->prepare($query);
            $user_role = ucfirst($token_data['role']);
            $stmt->bindParam(':user_role', $user_role);
            $stmt->bindParam(':user_id', $token_data['user_id']);
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
            
            Response::success(null, 'All notifications marked as read');
            
        } catch (PDOException $e) {
            Response::serverError('Database error marking all notifications as read');
        }
    }
    
    /**
     * Delete Notification
     */
    public function deleteNotification($id) {
        Middleware::requireRole('admin');
        
        $id = Middleware::validateInteger($id, 'id');
        
        try {
            // First, get notification details for logging
            $check_query = "SELECT title FROM notifications WHERE id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $id);
            $check_stmt->execute();
            $notification = $check_stmt->fetch();

            if (!$notification) {
                Response::notFound('Notification not found');
            }

            $query = "DELETE FROM notifications WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
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
            Response::serverError('Database error deleting notification');
        }
    }
    
    /**
     * Get Unread Count
     */
    public function deleteNotificationForUser($id) {
        $token_data = Middleware::requireAuth();
        $user_id = $token_data['user_id'];
        $id = Middleware::validateInteger($id, 'id');

        try {
            // First, get the current read_by array
            $query = "SELECT read_by FROM notifications WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $notification = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($notification) {
                $read_by = json_decode($notification['read_by'], true) ?: [];
                if (!in_array($user_id, $read_by)) {
                    $read_by[] = $user_id;
                }

                // Now, update the read_by array
                $update_query = "UPDATE notifications SET read_by = :read_by WHERE id = :id";
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':read_by', json_encode($read_by));
                $update_stmt->bindParam(':id', $id);
                $update_stmt->execute();
            }

            Response::success(null, 'Notification marked as deleted for user.');

        } catch (PDOException $e) {
            Response::serverError('Database error updating notification');
        }
    }

    /**
     * Get Unread Count
     */
    public function getUnreadCount() {
        $token_data = Middleware::requireAuth();
        
        try {
            $query = "SELECT COUNT(*) as unread_count
                      FROM notifications n
                      WHERE (n.target_audience = 'All' OR n.target_audience = :user_role)
                      AND n.id NOT IN (
                          SELECT notification_id FROM user_notifications 
                          WHERE user_id = :user_id AND is_read = TRUE
                      )
                      AND (n.expires_at IS NULL OR n.expires_at > NOW())";
            
            $stmt = $this->conn->prepare($query);
            $user_role = ucfirst($token_data['role']);
            $stmt->bindParam(':user_role', $user_role);
            $stmt->bindParam(':user_id', $token_data['user_id']);
            $stmt->execute();
            
            $result = $stmt->fetch();
            
            Response::success(['unread_count' => $result['unread_count']], 'Unread count retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving unread count');
        }
    }
    
    /**
     * Get User Notifications
     */
    public function getUserNotifications() {
        $token_data = Middleware::requireAuth();
        
        $pagination = Middleware::getPaginationParams();
        
        try {
            $query = "SELECT n.*, 
                             un.is_read, un.read_at,
                             CONCAT(u.first_name, ' ', u.last_name) as created_by_name
                      FROM notifications n
                      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = :user_id
                      LEFT JOIN users u ON n.created_by = u.id
                      WHERE (n.target_audience = 'All' OR n.target_audience = :user_role)
                      AND (n.expires_at IS NULL OR n.expires_at > NOW())
                      ORDER BY n.created_at DESC
                      LIMIT :limit OFFSET :offset";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $token_data['user_id']);
            $user_role = ucfirst($token_data['role']);
            $stmt->bindParam(':user_role', $user_role);
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            
            $notifications = $stmt->fetchAll();
            
            // Mark notifications as read if they're being fetched
            foreach ($notifications as $notification) {
                if (!$notification['is_read']) {
                    $update_query = "INSERT INTO user_notifications (user_id, notification_id, is_read, read_at)
                                    VALUES (:user_id, :notification_id, TRUE, NOW())
                                    ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW()";
                    
                    $update_stmt = $this->conn->prepare($update_query);
                    $update_stmt->bindParam(':user_id', $token_data['user_id']);
                    $update_stmt->bindParam(':notification_id', $notification['id']);
                    $update_stmt->execute();
                }
            }
            
            Response::success($notifications, 'User notifications retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving user notifications');
        }
    }
    
    /**
     * Broadcast Notification (Real-time simulation)
     */
    public function broadcastNotification() {
        Middleware::requireRole('admin');
        
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
            $query = "INSERT INTO notifications (title, message, type, priority, target_audience, created_by, is_broadcast)
                      VALUES (:title, :message, :type, :priority, :target_audience, :created_by, TRUE)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':title', $title);
            $stmt->bindParam(':message', $message);
            $stmt->bindParam(':type', $type);
            $stmt->bindParam(':priority', $priority);
            $stmt->bindParam(':target_audience', $target_audience);
            $created_by = $_SESSION['user_id'] ?? 1;
            $stmt->bindParam(':created_by', $created_by);
            $stmt->execute();
            
            $notification_id = $this->conn->lastInsertId();
            
            // In a real implementation, this would trigger WebSocket or SSE events
            // For now, we'll simulate it by creating user notification records
            
            // Get target users
            $users_query = "SELECT id FROM users WHERE role = :role OR :target_audience = 'All'";
            $users_stmt = $this->conn->prepare($users_query);
            
            if ($target_audience === 'All') {
                $dummy_role = 'dummy';
                $users_stmt->bindParam(':role', $dummy_role); // Won't be used
                $users_stmt->bindParam(':target_audience', $target_audience);
            } else {
                $role_param = strtolower($target_audience);
                $dummy_audience = 'dummy';
                $users_stmt->bindParam(':role', $role_param);
                $users_stmt->bindParam(':target_audience', $dummy_audience); // Won't be used
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
            Response::serverError('Database error broadcasting notification');
        }
    }
}
?>
