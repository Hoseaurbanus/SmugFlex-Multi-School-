<?php
/**
 * Check Terms Status Script
 * Shows current term distribution across all academic years
 */

header('Content-Type: application/json');
require_once 'config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $results = [
        'success' => true,
        'message' => 'Terms status retrieved successfully',
        'current_settings' => [],
        'term_distribution' => [],
        'summary' => []
    ];
    
    // Get current school settings
    $settings_query = "SELECT setting_key, setting_value FROM school_settings 
                      WHERE setting_key IN ('current_term', 'current_academic_year', 'available_terms')";
    $settings_stmt = $conn->prepare($settings_query);
    $settings_stmt->execute();
    $settings = $settings_stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    $results['current_settings'] = [
        'current_term' => $settings['current_term'] ?? 'Not Set',
        'current_academic_year' => $settings['current_academic_year'] ?? 'Not Set',
        'available_terms' => $settings['available_terms'] ?? 'Not Configured'
    ];
    
    // Get term distribution for subject registrations
    $subject_terms_query = "SELECT academic_year, term, COUNT(*) as count 
                           FROM subject_registrations 
                           GROUP BY academic_year, term 
                           ORDER BY academic_year DESC, term";
    $subject_terms_stmt = $conn->prepare($subject_terms_query);
    $subject_terms_stmt->execute();
    $subject_terms = $subject_terms_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get term distribution for class teacher assignments
    $teacher_terms_query = "SELECT academic_year, term, COUNT(*) as count 
                           FROM class_teacher_assignments 
                           GROUP BY academic_year, term 
                           ORDER BY academic_year DESC, term";
    $teacher_terms_stmt = $conn->prepare($teacher_terms_query);
    $teacher_terms_stmt->execute();
    $teacher_terms = $teacher_terms_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get term distribution for subject assignments
    $assignment_terms_query = "SELECT academic_year, term, COUNT(*) as count 
                              FROM subject_assignments 
                              GROUP BY academic_year, term 
                              ORDER BY academic_year DESC, term";
    $assignment_terms_stmt = $conn->prepare($assignment_terms_query);
    $assignment_terms_stmt->execute();
    $assignment_terms = $assignment_terms_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Organize data by academic year and term
    $all_years = [];
    
    // Process subject registrations
    foreach ($subject_terms as $item) {
        $year = $item['academic_year'];
        $term = $item['term'];
        
        if (!isset($all_years[$year])) {
            $all_years[$year] = [
                'academic_year' => $year,
                'subject_registrations' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0],
                'class_teacher_assignments' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0],
                'subject_assignments' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0]
            ];
        }
        
        $all_years[$year]['subject_registrations'][$term] = (int)$item['count'];
    }
    
    // Process class teacher assignments
    foreach ($teacher_terms as $item) {
        $year = $item['academic_year'];
        $term = $item['term'];
        
        if (!isset($all_years[$year])) {
            $all_years[$year] = [
                'academic_year' => $year,
                'subject_registrations' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0],
                'class_teacher_assignments' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0],
                'subject_assignments' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0]
            ];
        }
        
        $all_years[$year]['class_teacher_assignments'][$term] = (int)$item['count'];
    }
    
    // Process subject assignments
    foreach ($assignment_terms as $item) {
        $year = $item['academic_year'];
        $term = $item['term'];
        
        if (!isset($all_years[$year])) {
            $all_years[$year] = [
                'academic_year' => $year,
                'subject_registrations' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0],
                'class_teacher_assignments' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0],
                'subject_assignments' => ['First Term' => 0, 'Second Term' => 0, 'Third Term' => 0]
            ];
        }
        
        $all_years[$year]['subject_assignments'][$term] = (int)$item['count'];
    }
    
    $results['term_distribution'] = array_values($all_years);
    
    // Create summary
    $summary = [
        'total_academic_years' => count($all_years),
        'years_with_all_terms' => 0,
        'years_with_only_first_term' => 0,
        'total_subject_registrations' => 0,
        'total_class_teacher_assignments' => 0,
        'total_subject_assignments' => 0
    ];
    
    foreach ($all_years as $year_data) {
        $has_all_terms = $year_data['subject_registrations']['Second Term'] > 0 && 
                         $year_data['subject_registrations']['Third Term'] > 0;
        
        if ($has_all_terms) {
            $summary['years_with_all_terms']++;
        } else {
            $summary['years_with_only_first_term']++;
        }
        
        $summary['total_subject_registrations'] += array_sum($year_data['subject_registrations']);
        $summary['total_class_teacher_assignments'] += array_sum($year_data['class_teacher_assignments']);
        $summary['total_subject_assignments'] += array_sum($year_data['subject_assignments']);
    }
    
    $results['summary'] = $summary;
    
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error checking terms status: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}
?>
