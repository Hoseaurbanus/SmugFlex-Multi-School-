<?php
// Academic Years endpoint
require_once 'config/database.php';
require_once 'helpers/Response.php';
require_once 'helpers/JWT.php';
require_once 'helpers/Middleware.php';
require_once 'helpers/TenantMiddleware.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $token_data = Middleware::requireAuth();
    $school_id = TenantMiddleware::resolveSchoolId($conn);
    
    try {
        $sql = "SELECT id, year, start_date, end_date, status 
                FROM academic_years 
                WHERE school_id = :school_id 
                ORDER BY year DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $years = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $years[] = [
                'id' => (int)$row['id'],
                'year' => $row['year'],
                'start_date' => $row['start_date'],
                'end_date' => $row['end_date'],
                'status' => $row['status'],
            ];
        }
        
        Response::success($years, 'Academic years loaded successfully');
    } catch (PDOException $e) {
        error_log("Academic Years Error: " . $e->getMessage());
        // Fallback: extract years from compiled_results if academic_years table has no data
        try {
            $fallback = $conn->prepare(
                "SELECT DISTINCT academic_year FROM compiled_results WHERE school_id = :school_id ORDER BY academic_year DESC"
            );
            $fallback->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $fallback->execute();
            $fallback_years = [];
            while ($row = $fallback->fetch(PDO::FETCH_ASSOC)) {
                $fallback_years[] = [
                    'year' => $row['academic_year'],
                    'status' => 'Active',
                ];
            }
            Response::success($fallback_years, 'Academic years loaded from compiled results');
        } catch (PDOException $e2) {
            Response::success([], 'No academic years found');
        }
    }
} catch (Exception $e) {
    error_log("Academic Years Error: " . $e->getMessage());
    Response::serverError('Failed to load academic years');
}
