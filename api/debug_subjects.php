<?php
header('Content-Type: text/plain');
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    echo "=== Database: OK ===\n\n";

    echo "--- Step 1: Pagination params (no auth needed) ---\n";
    $pagination = Middleware::getPaginationParams();
    echo "page={$pagination['page']} limit={$pagination['limit']} offset={$pagination['offset']}\n";
    echo "OK\n\n";

    echo "--- Step 2: Search params (no auth needed) ---\n";
    $search_params = Middleware::getSearchParams(['id', 'name', 'code', 'category']);
    echo "sort_by={$search_params['sort_by']} sort_order={$search_params['sort_order']} search='{$search_params['search']}'\n";
    echo "OK\n\n";

    // Use school_id from query param or default to 4
    $school_id = isset($_GET['school_id']) ? (int)$_GET['school_id'] : 4;
    echo "--- Using school_id: $school_id ---\n\n";

    echo "--- Step 3: Execute query ---\n";
    echo "--- Step 5: Execute query ---\n";
    $query = "SELECT s.*, 
                     (SELECT COUNT(*) FROM subject_assignments WHERE subject_id = s.id AND status = 'Active' AND school_id = :school_id_sub) as assignment_count
               FROM subjects s";
    
    $conditions = ["s.school_id = :school_id"];
    $params = [':school_id' => $school_id, ':school_id_sub' => $school_id];
    
    if (!empty($search_params['search'])) {
        $conditions[] = "(s.name LIKE :search OR s.code LIKE :search OR s.description LIKE :search)";
        $params[':search'] = '%' . $search_params['search'] . '%';
    }
    
    $hasCategoryFilter = isset($_GET['category']);
    $hasIsCoreFilter = isset($_GET['is_core']);
    
    if ($hasCategoryFilter) {
        $conditions[] = "s.category = :category";
        $params[':category'] = $_GET['category'];
    }
    if ($hasIsCoreFilter) {
        $conditions[] = "s.is_core = :is_core";
        $params[':is_core'] = (bool)$_GET['is_core'];
    }
    
    if (!empty($conditions)) {
        $query .= " WHERE " . implode(' AND ', $conditions);
    }
    
    $query .= " ORDER BY s.{$search_params['sort_by']} {$search_params['sort_order']}";
    $query .= " LIMIT :limit OFFSET :offset";
    
    echo "Query: $query\n";
    
    $stmt = $conn->prepare($query);
    
    foreach ($params as $key => $value) {
        $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
        $stmt->bindValue($key, $value, $type);
        echo "  $key = " . var_export($value, true) . " (type=$type)\n";
    }
    
    $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
    $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
    echo "  :limit = {$pagination['limit']} (INT)\n";
    echo "  :offset = {$pagination['offset']} (INT)\n";
    
    $stmt->execute();
    $subjects = $stmt->fetchAll();
    echo "\n=== Subjects found: " . count($subjects) . " ===\n";
    print_r($subjects);

} catch (PDOException $e) {
    echo "\n!!! PDOException at step ? !!!\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n";
    echo "Error Info: " . print_r($e->errorInfo, true) . "\n";
} catch (Exception $e) {
    echo "\n!!! Exception !!!\n";
    echo get_class($e) . ": " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n";
}
