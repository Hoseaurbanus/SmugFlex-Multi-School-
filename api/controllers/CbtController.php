<?php
/**
 * CBT Controller
 * Computer-Based Test management system
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

class CbtController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // ─── EXAMS ───────────────────────────────────────────────

    public function getAllExams() {
        $token_data = Middleware::requireAuth();
        $pagination = Middleware::getPaginationParams();
        $search = Middleware::getSearchParams();

        try {
            $where = "1=1";
            $params = [];

            if ($token_data['role'] === 'teacher') {
                $where .= " AND e.teacher_id = :teacher_id";
                $params[':teacher_id'] = $token_data['linked_id'];
            }

            if (!empty($search['search'])) {
                $where .= " AND (e.title LIKE :search OR s.name LIKE :search2)";
                $params[':search'] = '%' . $search['search'] . '%';
                $params[':search2'] = '%' . $search['search'] . '%';
            }

            if (!empty($_GET['class_id'])) {
                $where .= " AND e.class_id = :class_id";
                $params[':class_id'] = (int)$_GET['class_id'];
            }

            if (!empty($_GET['subject_id'])) {
                $where .= " AND e.subject_id = :subject_id";
                $params[':subject_id'] = (int)$_GET['subject_id'];
            }

            if (!empty($_GET['status'])) {
                $where .= " AND e.status = :status";
                $params[':status'] = $_GET['status'];
            }

            $countQuery = "SELECT COUNT(*) as total FROM cbt_exams e LEFT JOIN subjects s ON e.subject_id = s.id WHERE $where";
            $countStmt = $this->conn->prepare($countQuery);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            $sortOrder = $search['sort_order'] === 'DESC' ? 'DESC' : 'ASC';
            $query = "SELECT e.*, s.name as subject_name, c.name as class_name
                      FROM cbt_exams e
                      LEFT JOIN subjects s ON e.subject_id = s.id
                      LEFT JOIN classes c ON e.class_id = c.id
                      WHERE $where
                      ORDER BY e.created_at $sortOrder
                      LIMIT :limit OFFSET :offset";
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::paginated($exams, $pagination['page'], $pagination['limit'], $total);
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving exams');
        }
    }

    public function getExamById($id) {
        $token_data = Middleware::requireAuth();

        try {
            $id = Middleware::validateInteger($id, 'exam_id');

            $query = "SELECT e.*, s.name as subject_name, c.name as class_name
                      FROM cbt_exams e
                      LEFT JOIN subjects s ON e.subject_id = s.id
                      LEFT JOIN classes c ON e.class_id = c.id
                      WHERE e.id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Exam not found');
            }

            Response::success($exam, 'Exam retrieved successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving exam');
        }
    }

    public function createExam() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['title', 'class_id', 'subject_id', 'duration_minutes']);

        try {
            $teacher_id = $token_data['role'] === 'teacher'
                ? $token_data['linked_id']
                : ($data['teacher_id'] ?? $token_data['linked_id']);

            $query = "INSERT INTO cbt_exams
                      (title, instructions, class_id, subject_id, teacher_id, academic_year, term,
                       duration_minutes, total_marks, score_slot, feed_into_scores, shuffle_questions,
                       published, allow_review, starts_at, ends_at, status)
                      VALUES
                      (:title, :instructions, :class_id, :subject_id, :teacher_id, :academic_year, :term,
                       :duration_minutes, 0, :score_slot, :feed_into_scores, :shuffle_questions,
                       0, :allow_review, :starts_at, :ends_at, 'Active')";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':title', Middleware::sanitizeString($data['title']));
            $stmt->bindValue(':instructions', $data['instructions'] ?? '');
            $stmt->bindValue(':class_id', (int)$data['class_id']);
            $stmt->bindValue(':subject_id', (int)$data['subject_id']);
            $stmt->bindValue(':teacher_id', (int)$teacher_id);
            $stmt->bindValue(':academic_year', $data['academic_year'] ?? date('Y') . '/' . (date('Y') + 1));
            $stmt->bindValue(':term', $data['term'] ?? 'First Term');
            $stmt->bindValue(':duration_minutes', (int)$data['duration_minutes']);
            $stmt->bindValue(':score_slot', $data['score_slot'] ?? null);
            $stmt->bindValue(':feed_into_scores', !empty($data['feed_into_scores']) ? 1 : 0);
            $stmt->bindValue(':shuffle_questions', !empty($data['shuffle_questions']) ? 1 : 0);
            $stmt->bindValue(':allow_review', !empty($data['allow_review']) ? 1 : 0);
            $stmt->bindValue(':starts_at', $data['starts_at'] ?? null);
            $stmt->bindValue(':ends_at', $data['ends_at'] ?? null);
            $stmt->execute();

            $examId = $this->conn->lastInsertId();
            Response::created(['id' => (int)$examId], 'Exam created successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error creating exam');
        }
    }

    public function updateExam($id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            Response::badRequest('No data provided');
        }

        try {
            $id = Middleware::validateInteger($id, 'exam_id');

            $query = "SELECT * FROM cbt_exams WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Exam not found');
            }

            if ($token_data['role'] === 'teacher' && (int)$exam['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only edit your own exams');
            }

            $fields = [];
            $params = [':id' => $id];

            $allowedFields = ['title', 'instructions', 'duration_minutes', 'score_slot', 'feed_into_scores',
                             'shuffle_questions', 'allow_review', 'starts_at', 'ends_at', 'status',
                             'total_marks', 'published'];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $fields[] = "`$field` = :$field";
                    $params[":$field"] = $data[$field];
                }
            }

            if (empty($fields)) {
                Response::badRequest('No valid fields to update');
            }

            $query = "UPDATE cbt_exams SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            Response::success(['id' => $id], 'Exam updated successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error updating exam');
        }
    }

    public function deleteExam($id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $id = Middleware::validateInteger($id, 'exam_id');

            $query = "SELECT * FROM cbt_exams WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Exam not found');
            }

            if ($token_data['role'] === 'teacher' && (int)$exam['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only delete your own exams');
            }

            $this->conn->beginTransaction();
            $stmt = $this->conn->prepare("DELETE FROM cbt_answers WHERE question_id IN (SELECT id FROM cbt_questions WHERE exam_id = :id)");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            $stmt = $this->conn->prepare("DELETE FROM cbt_attempts WHERE exam_id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            $stmt = $this->conn->prepare("DELETE FROM cbt_questions WHERE exam_id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            $stmt = $this->conn->prepare("DELETE FROM cbt_exams WHERE id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            $this->conn->commit();
            Response::noContent('Exam deleted successfully');
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error deleting exam');
        }
    }

    public function publishExam($id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $id = Middleware::validateInteger($id, 'exam_id');

            $query = "SELECT * FROM cbt_exams WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Exam not found');
            }

            if ($token_data['role'] === 'teacher' && (int)$exam['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only publish your own exams');
            }

            $questionCount = $this->getQuestionCount($id);
            if ($questionCount === 0) {
                Response::badRequest('Cannot publish an exam with no questions');
            }

            $query = "UPDATE cbt_exams SET published = 1, published_at = NOW() WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            Response::success(['id' => $id], 'Exam published successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error publishing exam');
        }
    }

    // ─── QUESTIONS ───────────────────────────────────────────

    public function getExamQuestions($exam_id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');

            $query = "SELECT * FROM cbt_questions WHERE exam_id = :exam_id ORDER BY sort_order ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':exam_id', $exam_id);
            $stmt->execute();
            $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode JSON fields for each question
            foreach ($questions as &$question) {
                $question['options'] = json_decode($question['options_json'] ?? '[]', true);
                $question['correct_answer'] = json_decode($question['correct_answer_json'] ?? '[]', true);
                unset($question['options_json']);
                unset($question['correct_answer_json']);
            }

            Response::success($questions, 'Questions retrieved successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving questions');
        }
    }

    public function addQuestion($exam_id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['question_text', 'question_type', 'correct_answer']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');

            $options_json = json_encode($data['options'] ?? []);
            $correct_answer_json = json_encode($data['correct_answer']);

            $sort_order = $data['sort_order'] ?? $this->getNextSortOrder($exam_id);

            $query = "INSERT INTO cbt_questions (exam_id, question_type, question_text, passage_text, image_url, options_json, correct_answer_json, marks, sort_order, section, section_instructions)
                      VALUES (:exam_id, :question_type, :question_text, :passage_text, :image_url, :options_json, :correct_answer_json, :marks, :sort_order, :section, :section_instructions)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':exam_id', $exam_id);
            $stmt->bindValue(':question_type', $data['question_type']);
            $stmt->bindValue(':question_text', $data['question_text']);
            $stmt->bindValue(':passage_text', $data['passage_text'] ?? null);
            $stmt->bindValue(':image_url', $data['image_url'] ?? null);
            $stmt->bindValue(':options_json', $options_json);
            $stmt->bindValue(':correct_answer_json', $correct_answer_json);
            $stmt->bindValue(':marks', $data['marks'] ?? 1);
            $stmt->bindValue(':sort_order', $sort_order);
            $stmt->bindValue(':section', $data['section'] ?? null);
            $stmt->bindValue(':section_instructions', $data['section_instructions'] ?? null);
            $stmt->execute();

            $questionId = $this->conn->lastInsertId();

            // Update total marks
            $this->recalculateTotalMarks($exam_id);

            Response::created(['id' => (int)$questionId], 'Question added successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error adding question');
        }
    }

    public function updateQuestion($exam_id, $question_id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            Response::badRequest('No data provided');
        }

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');
            $question_id = Middleware::validateInteger($question_id, 'question_id');

            $fields = [];
            $params = [':id' => $question_id, ':exam_id' => $exam_id];

            if (isset($data['question_text'])) {
                $fields[] = "question_text = :question_text";
                $params[':question_text'] = $data['question_text'];
            }
            if (isset($data['question_type'])) {
                $fields[] = "question_type = :question_type";
                $params[':question_type'] = $data['question_type'];
            }
            if (isset($data['options'])) {
                $fields[] = "options_json = :options_json";
                $params[':options_json'] = json_encode($data['options']);
            }
            if (isset($data['correct_answer'])) {
                $fields[] = "correct_answer_json = :correct_answer_json";
                $params[':correct_answer_json'] = json_encode($data['correct_answer']);
            }
            if (isset($data['marks'])) {
                $fields[] = "marks = :marks";
                $params[':marks'] = (int)$data['marks'];
            }
            if (isset($data['sort_order'])) {
                $fields[] = "sort_order = :sort_order";
                $params[':sort_order'] = (int)$data['sort_order'];
            }
            if (isset($data['passage_text'])) {
                $fields[] = "passage_text = :passage_text";
                $params[':passage_text'] = $data['passage_text'];
            }
            if (isset($data['image_url'])) {
                $fields[] = "image_url = :image_url";
                $params[':image_url'] = $data['image_url'];
            }
            if (isset($data['section'])) {
                $fields[] = "section = :section";
                $params[':section'] = $data['section'];
            }
            if (isset($data['section_instructions'])) {
                $fields[] = "section_instructions = :section_instructions";
                $params[':section_instructions'] = $data['section_instructions'];
            }

            if (empty($fields)) {
                Response::badRequest('No valid fields to update');
            }

            $query = "UPDATE cbt_questions SET " . implode(', ', $fields) . " WHERE id = :id AND exam_id = :exam_id";
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $this->recalculateTotalMarks($exam_id);

            Response::success(['id' => $question_id], 'Question updated successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error updating question');
        }
    }

    public function deleteQuestion($exam_id, $question_id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');
            $question_id = Middleware::validateInteger($question_id, 'question_id');

            $query = "DELETE FROM cbt_questions WHERE id = :id AND exam_id = :exam_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $question_id);
            $stmt->bindValue(':exam_id', $exam_id);
            $stmt->execute();

            $this->recalculateTotalMarks($exam_id);

            Response::noContent('Question deleted successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error deleting question');
        }
    }

    public function reorderQuestions($exam_id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['order']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');
            $order = $data['order'];

            $query = "UPDATE cbt_questions SET sort_order = :sort_order WHERE id = :id AND exam_id = :exam_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':exam_id', $exam_id);

            foreach ($order as $item) {
                $stmt->bindValue(':sort_order', $item['sort_order']);
                $stmt->bindValue(':id', $item['question_id']);
                $stmt->execute();
            }

            Response::success(null, 'Questions reordered successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error reordering questions');
        }
    }

    // ─── QUESTION BANK ───────────────────────────────────────

    public function getQuestionBank() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $pagination = Middleware::getPaginationParams();
        $search = Middleware::getSearchParams();

        try {
            $where = "1=1";
            $params = [];

            if ($token_data['role'] === 'teacher') {
                $where .= " AND (qb.teacher_id = :teacher_id OR qb.teacher_id IS NULL)";
                $params[':teacher_id'] = $token_data['linked_id'];
            }

            if (!empty($_GET['subject_id'])) {
                $where .= " AND qb.subject_id = :subject_id";
                $params[':subject_id'] = (int)$_GET['subject_id'];
            }

            if (!empty($_GET['difficulty'])) {
                $where .= " AND qb.difficulty = :difficulty";
                $params[':difficulty'] = $_GET['difficulty'];
            }

            if (!empty($_GET['topic'])) {
                $where .= " AND qb.topic LIKE :topic";
                $params[':topic'] = '%' . $_GET['topic'] . '%';
            }

            if (!empty($search['search'])) {
                $where .= " AND qb.question_text LIKE :search";
                $params[':search'] = '%' . $search['search'] . '%';
            }

            $where .= " AND qb.status = 'Active'";

            $countQuery = "SELECT COUNT(*) as total FROM cbt_question_bank qb WHERE $where";
            $countStmt = $this->conn->prepare($countQuery);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            $query = "SELECT qb.*, s.name as subject_name
                      FROM cbt_question_bank qb
                      LEFT JOIN subjects s ON qb.subject_id = s.id
                      WHERE $where
                      ORDER BY qb.created_at DESC
                      LIMIT :limit OFFSET :offset";
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($questions as &$question) {
                $question['options'] = json_decode($question['options_json'] ?? '[]', true);
                $question['correct_answer'] = json_decode($question['correct_answer_json'] ?? '[]', true);
                $question['tags'] = json_decode($question['tags_json'] ?? '[]', true);
                unset($question['options_json']);
                unset($question['correct_answer_json']);
                unset($question['tags_json']);
            }

            Response::paginated($questions, $pagination['page'], $pagination['limit'], $total);
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving question bank');
        }
    }

    public function addToQuestionBank() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['question_text', 'question_type', 'correct_answer', 'subject_id']);

        try {
            $options_json = json_encode($data['options'] ?? []);
            $correct_answer_json = json_encode($data['correct_answer']);
            $tags_json = json_encode($data['tags'] ?? []);

            $query = "INSERT INTO cbt_question_bank
                      (teacher_id, subject_id, class_id, question_type, question_text,
                       passage_text, image_url, options_json, correct_answer_json, marks, difficulty, topic, tags_json)
                      VALUES
                      (:teacher_id, :subject_id, :class_id, :question_type, :question_text,
                       :passage_text, :image_url, :options_json, :correct_answer_json, :marks, :difficulty, :topic, :tags_json)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':teacher_id', $token_data['linked_id']);
            $stmt->bindValue(':subject_id', (int)$data['subject_id']);
            $stmt->bindValue(':class_id', $data['class_id'] ?? null);
            $stmt->bindValue(':question_type', $data['question_type']);
            $stmt->bindValue(':question_text', $data['question_text']);
            $stmt->bindValue(':passage_text', $data['passage_text'] ?? null);
            $stmt->bindValue(':image_url', $data['image_url'] ?? null);
            $stmt->bindValue(':options_json', $options_json);
            $stmt->bindValue(':correct_answer_json', $correct_answer_json);
            $stmt->bindValue(':marks', $data['marks'] ?? 1);
            $stmt->bindValue(':difficulty', $data['difficulty'] ?? 'medium');
            $stmt->bindValue(':topic', $data['topic'] ?? null);
            $stmt->bindValue(':tags_json', $tags_json);
            $stmt->execute();

            $id = $this->conn->lastInsertId();
            Response::created(['id' => (int)$id], 'Question added to bank');
        } catch (PDOException $e) {
            Response::serverError('Database error adding to question bank');
        }
    }

    public function deleteFromQuestionBank($id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $id = Middleware::validateInteger($id, 'question_id');

            $query = "UPDATE cbt_question_bank SET status = 'Archived' WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            Response::noContent('Question removed from bank');
        } catch (PDOException $e) {
            Response::serverError('Database error removing from question bank');
        }
    }

    public function importFromBank($exam_id) {
        Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['question_ids']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');
            $question_ids = $data['question_ids'];

            $placeholders = implode(',', array_fill(0, count($question_ids), '?'));
            $query = "SELECT * FROM cbt_question_bank WHERE id IN ($placeholders) AND status = 'Active'";
            $stmt = $this->conn->prepare($query);
            foreach ($question_ids as $i => $qid) {
                $stmt->bindValue($i + 1, (int)$qid);
            }
            $stmt->execute();
            $bankQuestions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $nextSort = $this->getNextSortOrder($exam_id);
            $insertedIds = [];

            $insertQuery = "INSERT INTO cbt_questions
                           (exam_id, question_type, question_text, passage_text, image_url, options_json, correct_answer_json, marks, sort_order, section, section_instructions)
                           VALUES (:exam_id, :question_type, :question_text, :passage_text, :image_url, :options_json, :correct_answer_json, :marks, :sort_order, :section, :section_instructions)";
            $insertStmt = $this->conn->prepare($insertQuery);

            foreach ($bankQuestions as $q) {
                $insertStmt->bindValue(':exam_id', $exam_id);
                $insertStmt->bindValue(':question_type', $q['question_type']);
                $insertStmt->bindValue(':question_text', $q['question_text']);
                $insertStmt->bindValue(':passage_text', $q['passage_text'] ?? null);
                $insertStmt->bindValue(':image_url', $q['image_url'] ?? null);
                $insertStmt->bindValue(':options_json', $q['options_json']);
                $insertStmt->bindValue(':correct_answer_json', $q['correct_answer_json']);
                $insertStmt->bindValue(':marks', $q['marks']);
                $insertStmt->bindValue(':sort_order', $nextSort++);
                $insertStmt->bindValue(':section', $q['section'] ?? null);
                $insertStmt->bindValue(':section_instructions', $q['section_instructions'] ?? null);
                $insertStmt->execute();
                $insertedIds[] = $this->conn->lastInsertId();
            }

            $this->recalculateTotalMarks($exam_id);

            Response::created(['ids' => $insertedIds], count($insertedIds) . ' questions imported from bank');
        } catch (PDOException $e) {
            Response::serverError('Database error importing from question bank');
        }
    }

    // ─── ATTEMPTS ────────────────────────────────────────────

    public function getStudentAttempts() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $student_id = $_GET['student_id'] ?? null;
            $exam_id = $_GET['exam_id'] ?? null;

            $where = "1=1";
            $params = [];

            if ($student_id) {
                $where .= " AND a.student_id = :student_id";
                $params[':student_id'] = (int)$student_id;
            }
            if ($exam_id) {
                $where .= " AND a.exam_id = :exam_id";
                $params[':exam_id'] = (int)$exam_id;
            }
            if ($token_data['role'] === 'teacher') {
                $where .= " AND e.teacher_id = :teacher_id";
                $params[':teacher_id'] = $token_data['linked_id'];
            }

            $query = "SELECT a.*, e.title as exam_title, s.first_name, s.last_name, s.admission_number,
                             CONCAT(s.first_name, ' ', s.last_name) as student_name
                      FROM cbt_attempts a
                      JOIN cbt_exams e ON a.exam_id = e.id
                      JOIN students s ON a.student_id = s.id
                      WHERE $where
                      ORDER BY a.created_at DESC";
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($attempts, 'Attempts retrieved successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving attempts');
        }
    }

    public function getAttemptById($attempt_id) {
        $token_data = Middleware::requireAuth();

        try {
            $attempt_id = Middleware::validateInteger($attempt_id, 'attempt_id');

            $query = "SELECT a.*, e.title as exam_title, e.subject_id, e.class_id, e.teacher_id,
                             s.name as subject_name
                      FROM cbt_attempts a
                      JOIN cbt_exams e ON a.exam_id = e.id
                      LEFT JOIN subjects s ON e.subject_id = s.id
                      WHERE a.id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $attempt_id);
            $stmt->execute();
            $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$attempt) {
                Response::notFound('Attempt not found');
            }

            // Ownership check: students can only view their own
            if ($token_data['role'] === 'student' && (int)$attempt['student_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only view your own attempts');
            }

            // Teachers may only view attempts for exams they own
            if ($token_data['role'] === 'teacher' && (int)$attempt['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only view attempts for your exams');
            }

            // Get answers
            $query = "SELECT cbt_answers.*, cbt_questions.question_text, cbt_questions.question_type,
                             cbt_questions.options_json, cbt_questions.correct_answer_json, cbt_questions.marks as max_marks
                      FROM cbt_answers
                      JOIN cbt_questions ON cbt_answers.question_id = cbt_questions.id
                      WHERE cbt_answers.attempt_id = :attempt_id
                      ORDER BY cbt_questions.sort_order";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':attempt_id', $attempt_id);
            $stmt->execute();
            $answers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Students can see correct answers only after submission (for review)
            $isStudent = $token_data['role'] === 'student';
            $hideCorrect = $isStudent && $attempt['status'] === 'in_progress';
            foreach ($answers as &$answer) {
                $answer['student_answer'] = json_decode($answer['answer_json'] ?? 'null', true);
                $answer['correct_answer'] = $hideCorrect ? null : json_decode($answer['correct_answer_json'] ?? '[]', true);
                $answer['options'] = json_decode($answer['options_json'] ?? '[]', true);
                unset($answer['answer_json']);
                unset($answer['correct_answer_json']);
                unset($answer['options_json']);
            }

            $attempt['answers'] = $answers;
            Response::success($attempt, 'Attempt retrieved successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving attempt');
        }
    }

    public function getMyAttempts() {
        $token_data = Middleware::requireAuth();

        try {
            $student_id = $token_data['linked_id'];

            // Ensure the student belongs to the exam class (if exam is class-specific)
            $query = "SELECT a.*, e.title as exam_title, e.subject_id, e.class_id,
                             s.name as subject_name
                      FROM cbt_attempts a
                      JOIN cbt_exams e ON a.exam_id = e.id
                      LEFT JOIN subjects s ON e.subject_id = s.id
                      WHERE a.student_id = :student_id
                      ORDER BY a.created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':student_id', $student_id);
            $stmt->execute();
            $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($attempts, 'Your attempts retrieved successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving your attempts');
        }
    }

    public function startAttempt($exam_id) {
        $token_data = Middleware::requireAuth();
        if ($token_data['role'] !== 'student') {
            Response::forbidden('Only students can start exams');
        }

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');

            $query = "SELECT * FROM cbt_exams WHERE id = :id AND published = 1 AND status = 'Active'";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $exam_id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Published exam not found');
            }

            // Time window check
            $now = date('Y-m-d H:i:s');
            if ($exam['starts_at'] && $exam['starts_at'] > $now) {
                Response::badRequest('This exam has not started yet');
            }
            if ($exam['ends_at'] && $exam['ends_at'] < $now) {
                Response::badRequest('This exam has already ended');
            }

            $student_id = $token_data['linked_id'];

            // Ensure the student belongs to the exam class
            $studentClassQuery = "SELECT class_id FROM students WHERE id = :student_id";
            $stmt = $this->conn->prepare($studentClassQuery);
            $stmt->bindValue(':student_id', $student_id);
            $stmt->execute();
            $student = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student || (int)$student['class_id'] !== (int)$exam['class_id']) {
                Response::forbidden('You are not registered for this class exam');
            }

            $query = "SELECT id, status FROM cbt_attempts WHERE exam_id = :exam_id AND student_id = :student_id ORDER BY created_at DESC LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':exam_id', $exam_id);
            $stmt->bindValue(':student_id', $student_id);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing && $existing['status'] === 'in_progress') {
                // Return full attempt data + questions for resumed attempt
                return $this->getAttemptResponse($existing['id'], $exam);
            }

            if ($existing && $existing['status'] === 'submitted') {
                Response::conflict('You have already submitted this exam');
            }

            $this->conn->beginTransaction();

            $query = "INSERT INTO cbt_attempts
                      (exam_id, student_id, academic_year, term, status, started_at, score, max_score, percentage, ip_address, user_agent)
                      VALUES
                      (:exam_id, :student_id, :academic_year, :term, 'in_progress', NOW(), 0, :max_score, 0, :ip, :ua)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':exam_id', $exam_id);
            $stmt->bindValue(':student_id', $student_id);
            $stmt->bindValue(':academic_year', $exam['academic_year']);
            $stmt->bindValue(':term', $exam['term']);
            $stmt->bindValue(':max_score', $exam['total_marks']);
            $stmt->bindValue(':ip', $_SERVER['REMOTE_ADDR'] ?? null);
            $stmt->bindValue(':ua', $_SERVER['HTTP_USER_AGENT'] ?? null);
            $stmt->execute();
            $attempt_id = $this->conn->lastInsertId();

            // Get full questions with shuffle
            $questionQuery = "SELECT * FROM cbt_questions WHERE exam_id = :exam_id ORDER BY sort_order ASC";
            $stmt = $this->conn->prepare($questionQuery);
            $stmt->bindValue(':exam_id', $exam_id);
            $stmt->execute();
            $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($exam['shuffle_questions']) {
                shuffle($questions);
            }

            $questionOrder = array_map(function($question) {
                return (int)$question['id'];
            }, $questions);

            // Pre-create answer records and strip correct answers for student response
            $insertAnswer = $this->conn->prepare(
                "INSERT INTO cbt_answers (attempt_id, question_id, marks_awarded) VALUES (:attempt_id, :question_id, 0)"
            );
            $responseQuestions = [];
            foreach ($questions as $q) {
                $insertAnswer->bindValue(':attempt_id', $attempt_id);
                $insertAnswer->bindValue(':question_id', $q['id']);
                $insertAnswer->execute();

                $responseQuestions[] = [
                    'id' => (int)$q['id'],
                    'question_type' => $q['question_type'],
                    'question_text' => $q['question_text'],
                    'options' => json_decode($q['options_json'] ?? '[]', true),
                    'marks' => (int)$q['marks'],
                    'sort_order' => (int)$q['sort_order'],
                ];
            }

            try {
                $metaJson = json_encode(['question_order' => $questionOrder]);
                $upd = $this->conn->prepare("UPDATE cbt_attempts SET metadata = :meta WHERE id = :id");
                $upd->bindValue(':meta', $metaJson);
                $upd->bindValue(':id', $attempt_id);
                $upd->execute();
            } catch (PDOException $e) {
                error_log('Failed to persist CBT attempt metadata: ' . $e->getMessage());
            }

            // Fetch the just-inserted attempt for start time
            $attemptQuery = "SELECT * FROM cbt_attempts WHERE id = :id";
            $stmt = $this->conn->prepare($attemptQuery);
            $stmt->bindValue(':id', $attempt_id);
            $stmt->execute();
            $attemptData = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->conn->commit();
            Response::created([
                'attempt' => [
                    'id' => (int)$attempt_id,
                    'exam_id' => (int)$exam_id,
                    'student_id' => (int)$student_id,
                    'status' => 'in_progress',
                    'started_at' => $attemptData['started_at'],
                    'score' => 0,
                    'max_score' => (int)$exam['total_marks'],
                ],
                'questions' => $responseQuestions,
                'duration_minutes' => (int)$exam['duration_minutes'],
            ], 'Attempt started');
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error starting attempt');
        }
    }

    private function getAttemptResponse($attempt_id, $exam) {
        $query = "SELECT * FROM cbt_attempts WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $attempt_id);
        $stmt->execute();
        $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$attempt) {
            Response::notFound('Attempt not found');
        }

        // Load questions; prefer persisted question_order from attempt metadata if present
        $questions = [];
        $questionOrder = [];
        if (!empty($attempt['metadata'])) {
            $meta = json_decode($attempt['metadata'], true);
            if (is_array($meta) && !empty($meta['question_order']) && is_array($meta['question_order'])) {
                $questionOrder = $meta['question_order'];
            }
        }

        if (!empty($questionOrder)) {
            // Fetch questions in bulk and reorder according to saved order
            $in = implode(',', array_map('intval', $questionOrder));
            $q = "SELECT * FROM cbt_questions WHERE id IN ($in)";
            $stmt = $this->conn->prepare($q);
            $stmt->execute();
            $fetched = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $byId = [];
            foreach ($fetched as $fq) $byId[$fq['id']] = $fq;
            foreach ($questionOrder as $qid) {
                if (isset($byId[$qid])) $questions[] = $byId[$qid];
            }
        } else {
            $questionQuery = "SELECT * FROM cbt_questions WHERE exam_id = :exam_id ORDER BY sort_order ASC";
            $stmt = $this->conn->prepare($questionQuery);
            $stmt->bindValue(':exam_id', $exam['id']);
            $stmt->execute();
            $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($exam['shuffle_questions']) {
                shuffle($questions);
            }
        }

        $responseQuestions = [];
        foreach ($questions as $q) {
            // Load any previously saved answer
            $answerQuery = "SELECT answer_json FROM cbt_answers WHERE attempt_id = :attempt_id AND question_id = :question_id";
            $aStmt = $this->conn->prepare($answerQuery);
            $aStmt->bindValue(':attempt_id', $attempt_id);
            $aStmt->bindValue(':question_id', $q['id']);
            $aStmt->execute();
            $savedAnswer = $aStmt->fetchColumn();

            $responseQuestions[] = [
                'id' => (int)$q['id'],
                'question_type' => $q['question_type'],
                'question_text' => $q['question_text'],
                'options' => json_decode($q['options_json'] ?? '[]', true),
                'marks' => (int)$q['marks'],
                'sort_order' => (int)$q['sort_order'],
                'student_answer' => $savedAnswer ? json_decode($savedAnswer, true) : null,
            ];
        }

        Response::success([
            'attempt' => $attempt,
            'questions' => $responseQuestions,
            'duration_minutes' => (int)$exam['duration_minutes'],
            'resumed' => true,
        ], 'Resuming existing attempt');
    }

    public function saveAnswer($attempt_id) {
        $token_data = Middleware::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['question_id']);

        try {
            $attempt_id = Middleware::validateInteger($attempt_id, 'attempt_id');
            $question_id = (int)$data['question_id'];

            $query = "SELECT a.*, e.duration_minutes, e.title
                      FROM cbt_attempts a
                      JOIN cbt_exams e ON a.exam_id = e.id
                      WHERE a.id = :id AND a.student_id = :student_id AND a.status = 'in_progress'";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $attempt_id);
            $stmt->bindValue(':student_id', $token_data['linked_id']);
            $stmt->execute();
            $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$attempt) {
                Response::notFound('Active attempt not found');
            }

            // Check time limit
            $started = strtotime($attempt['started_at']);
            $timeLimit = $attempt['duration_minutes'] * 60;
            if (time() - $started > $timeLimit) {
                Response::badRequest('Time limit exceeded');
            }

            $answer_json = json_encode($data['answer'] ?? null);

            $query = "INSERT INTO cbt_answers (attempt_id, question_id, answer_json, updated_at)
                      VALUES (:attempt_id, :question_id, :answer_json, NOW())
                      ON DUPLICATE KEY UPDATE answer_json = VALUES(answer_json), updated_at = NOW()";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':answer_json', $answer_json);
            $stmt->bindValue(':attempt_id', $attempt_id);
            $stmt->bindValue(':question_id', $question_id);
            $stmt->execute();

            Response::success(null, 'Answer saved');
        } catch (PDOException $e) {
            Response::serverError('Database error saving answer');
        }
    }

    public function submitAttempt($attempt_id) {
        $token_data = Middleware::requireAuth();

        try {
            $attempt_id = Middleware::validateInteger($attempt_id, 'attempt_id');
            $data = json_decode(file_get_contents('php://input'), true);

            $student_id = $token_data['linked_id'];

            $query = "SELECT a.*, e.duration_minutes, e.title, e.subject_id, e.class_id,
                             e.feed_into_scores, e.score_slot, e.academic_year, e.term, e.teacher_id
                      FROM cbt_attempts a
                      JOIN cbt_exams e ON a.exam_id = e.id
                      WHERE a.id = :id AND a.student_id = :student_id AND a.status = 'in_progress'";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $attempt_id);
            $stmt->bindValue(':student_id', $student_id);
            $stmt->execute();
            $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$attempt) {
                Response::notFound('Active attempt not found');
            }

            // Grade
            $query = "SELECT ca.*, q.correct_answer_json, q.marks, q.question_type
                      FROM cbt_answers ca
                      JOIN cbt_questions q ON ca.question_id = q.id
                      WHERE ca.attempt_id = :attempt_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':attempt_id', $attempt_id);
            $stmt->execute();
            $answers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalScore = 0;
            $maxScore = 0;

            $updateStmt = $this->conn->prepare(
                "UPDATE cbt_answers SET is_correct = :is_correct, marks_awarded = :marks_awarded WHERE id = :id"
            );

            $tabSwitchCount = isset($data['tab_switch_count']) ? (int)$data['tab_switch_count'] : ($attempt['tab_switch_count'] ?? 0);

            foreach ($answers as $answer) {
                $correct = json_decode($answer['correct_answer_json'], true);
                $studentAnswer = json_decode($answer['answer_json'], true);
                $marks = (int)$answer['marks'];
                $maxScore += $marks;

                $isCorrect = false;
                $awarded = 0;

                if ($studentAnswer !== null) {
                    switch ($answer['question_type']) {
                        case 'single_choice':
                        case 'true_false':
                            $isCorrect = strcasecmp(trim((string)$studentAnswer), trim((string)$correct)) === 0;
                            $awarded = $isCorrect ? $marks : 0;
                            break;

                        case 'multi_select':
                            if (is_array($studentAnswer) && is_array($correct)) {
                                // Normalize case for multi-select
                                $studentNorm = array_map(function($v) { return strtolower(trim((string)$v)); }, $studentAnswer);
                                $correctNorm = array_map(function($v) { return strtolower(trim((string)$v)); }, $correct);
                                $correctSelected = count(array_intersect($studentNorm, $correctNorm));
                                $incorrectSelected = count(array_diff($studentNorm, $correctNorm));
                                $totalCorrect = count($correctNorm);
                                if ($totalCorrect > 0) {
                                    $net = $correctSelected - $incorrectSelected;
                                    $raw = floor($marks * max(0, $net) / $totalCorrect);
                                    $awarded = max(0, (int)$raw);
                                }
                                $isCorrect = $awarded === $marks;
                            }
                            break;

                        case 'fill_in_blank':
                            $studentNorm = trim(strtolower((string)$studentAnswer));
                            $correctNorm = trim(strtolower((string)$correct));
                            if ($studentNorm === $correctNorm) {
                                $isCorrect = true;
                                $awarded = $marks;
                            } elseif (!empty($studentNorm) && !empty($correctNorm)) {
                                // Partial: student answer contains correct or vice versa
                                if (str_contains($studentNorm, $correctNorm) || str_contains($correctNorm, $studentNorm)) {
                                    $awarded = max(1, (int)ceil($marks / 2));
                                    $isCorrect = false;
                                }
                            }
                            break;
                    }
                }

                $correctFlag = $isCorrect ? 1 : 0;
                $updateStmt->bindValue(':is_correct', $correctFlag, PDO::PARAM_INT);
                $updateStmt->bindValue(':marks_awarded', $awarded, PDO::PARAM_INT);
                $updateStmt->bindValue(':id', $answer['id'], PDO::PARAM_INT);
                $updateStmt->execute();

                $totalScore += $awarded;
            }

            $percentage = $maxScore > 0 ? round(($totalScore / $maxScore) * 100, 2) : 0;

            $remark = $this->getRemark($percentage);

            $existingMetadata = [];
            if (!empty($attempt['metadata'])) {
                $existingMetadata = json_decode($attempt['metadata'], true);
                if (!is_array($existingMetadata)) {
                    $existingMetadata = [];
                }
            }

            $metadata = json_encode(array_merge($existingMetadata, [
                'tab_switch_count' => $tabSwitchCount,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'submitted_from' => $data['submitted_from'] ?? 'normal',
            ]));

            $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;

            $query = "UPDATE cbt_attempts SET
                      status = 'submitted', submitted_at = NOW(),
                      score = :score, max_score = :max_score, percentage = :percentage,
                      remark = :remark, metadata = :metadata, tab_switch_count = :tab_switch_count,
                      ip_address = :ip_address, user_agent = :user_agent
                      WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':score', $totalScore, PDO::PARAM_INT);
            $stmt->bindValue(':max_score', $maxScore, PDO::PARAM_INT);
            $stmt->bindValue(':percentage', $percentage);
            $stmt->bindValue(':remark', $remark);
            $stmt->bindValue(':metadata', $metadata);
            $stmt->bindValue(':tab_switch_count', $tabSwitchCount, PDO::PARAM_INT);
            $stmt->bindValue(':ip_address', $ip_address);
            $stmt->bindValue(':user_agent', $user_agent);
            $stmt->bindValue(':id', $attempt_id, PDO::PARAM_INT);
            $stmt->execute();

            // Feed into scores if enabled
            if ($attempt['feed_into_scores'] && $attempt['score_slot']) {
                $this->feedIntoScores($student_id, $attempt['subject_id'], $attempt['class_id'],
                    $attempt['academic_year'], $attempt['term'], $attempt['score_slot'], $percentage, $attempt['teacher_id'],
                    $attempt['exam_id']);
            }

            Response::success([
                'attempt_id' => (int)$attempt_id,
                'score' => $totalScore,
                'max_score' => $maxScore,
                'percentage' => $percentage,
                'remark' => $remark,
            ], 'Exam submitted successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error submitting attempt');
        }
    }

    public function getStudentAvailableExams() {
        $token_data = Middleware::requireAuth();

        try {
            $student_id = $token_data['linked_id'];

            $query = "SELECT s.class_id FROM students s WHERE s.id = :student_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':student_id', $student_id);
            $stmt->execute();
            $student = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                Response::notFound('Student not found');
            }

            $class_id = $student['class_id'];

            $now = date('Y-m-d H:i:s');
            $examsQuery = "SELECT e.*, s.name as subject_name, c.name as class_name
                           FROM cbt_exams e
                           LEFT JOIN subjects s ON e.subject_id = s.id
                           LEFT JOIN classes c ON e.class_id = c.id
                           WHERE e.class_id = :class_id
                           AND e.published = 1
                           AND e.status = 'Active'
                           AND (e.starts_at IS NULL OR e.starts_at <= :now1)
                           AND (e.ends_at IS NULL OR e.ends_at >= :now2)
                           ORDER BY e.created_at DESC";
            $stmt = $this->conn->prepare($examsQuery);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindValue(':now1', $now);
            $stmt->bindValue(':now2', $now);
            $stmt->execute();
            $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Attach attempt status
            foreach ($exams as &$exam) {
                $query = "SELECT id, status, score, percentage, started_at, submitted_at
                          FROM cbt_attempts WHERE exam_id = :exam_id AND student_id = :student_id
                          ORDER BY created_at DESC LIMIT 1";
                $stmt2 = $this->conn->prepare($query);
                $stmt2->bindValue(':exam_id', $exam['id']);
                $stmt2->bindValue(':student_id', $student_id);
                $stmt2->execute();
                $attempt = $stmt2->fetch(PDO::FETCH_ASSOC);
                $exam['attempt'] = $attempt ? $attempt : null;
            }

            Response::success($exams, 'Available exams retrieved');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving available exams');
        }
    }

    // ─── EXAM RESULTS ────────────────────────────────────────

    public function getExamResults($exam_id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');

            // Restrict teachers to their own exams
            if ($token_data['role'] === 'teacher') {
                $q = "SELECT teacher_id FROM cbt_exams WHERE id = :id";
                $s = $this->conn->prepare($q);
                $s->bindValue(':id', $exam_id);
                $s->execute();
                $ex = $s->fetch(PDO::FETCH_ASSOC);
                if (!$ex) Response::notFound('Exam not found');
                if ((int)$ex['teacher_id'] !== (int)$token_data['linked_id']) {
                    Response::forbidden('You can only view results for your own exams');
                }
            }

            $query = "SELECT a.*, CONCAT(s.first_name, ' ', s.last_name) as student_name,
                             s.admission_number
                      FROM cbt_attempts a
                      JOIN students s ON a.student_id = s.id
                      WHERE a.exam_id = :exam_id AND a.status IN ('submitted', 'scored')
                      ORDER BY a.percentage DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':exam_id', $exam_id);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($results, 'Exam results retrieved');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving exam results');
        }
    }

    public function deleteAttempt($attempt_id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $attempt_id = Middleware::validateInteger($attempt_id, 'attempt_id');

            $query = "SELECT a.*, e.teacher_id FROM cbt_attempts a
                      JOIN cbt_exams e ON a.exam_id = e.id
                      WHERE a.id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $attempt_id);
            $stmt->execute();
            $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$attempt) {
                Response::notFound('Attempt not found');
            }

            if ($token_data['role'] === 'teacher' && (int)$attempt['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only delete attempts for your own exams');
            }

            $this->conn->beginTransaction();
            $stmt = $this->conn->prepare("DELETE FROM cbt_answers WHERE attempt_id = :id");
            $stmt->bindParam(':id', $attempt_id);
            $stmt->execute();

            $stmt = $this->conn->prepare("DELETE FROM cbt_attempts WHERE id = :id");
            $stmt->bindParam(':id', $attempt_id);
            $stmt->execute();

            $this->conn->commit();
            Response::noContent('Attempt deleted successfully');
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error deleting attempt');
        }
    }

    // ─── SCORE MANAGEMENT ──────────────────────────────────

    public function feedExamScores($exam_id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');

            $query = "SELECT * FROM cbt_exams WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $exam_id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Exam not found');
            }

            if ($token_data['role'] === 'teacher' && (int)$exam['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only feed scores for your own exams');
            }

            // Allow override of score_slot from request body
            $score_slot = $data['score_slot'] ?? $exam['score_slot'];
            if (!$score_slot) {
                Response::badRequest('No score slot configured. Set score_slot on the exam or provide one.');
            }

            // Find all submitted attempts
            $query = "SELECT id, student_id, percentage FROM cbt_attempts
                      WHERE exam_id = :exam_id AND status IN ('submitted', 'scored')";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':exam_id', $exam_id);
            $stmt->execute();
            $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($attempts)) {
                Response::badRequest('No submitted attempts found for this exam');
            }

            $fed = 0;
            foreach ($attempts as $attempt) {
                $this->feedIntoScores(
                    $attempt['student_id'],
                    $exam['subject_id'],
                    $exam['class_id'],
                    $exam['academic_year'],
                    $exam['term'],
                    $score_slot,
                    $attempt['percentage'],
                    $token_data['linked_id'],
                    $exam_id
                );
                $fed++;
            }

            Response::success(['fed_count' => $fed], "$fed score(s) fed successfully");
        } catch (PDOException $e) {
            Response::serverError('Database error feeding scores');
        }
    }

    public function deleteExamScores($exam_id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');

            $query = "SELECT * FROM cbt_exams WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $exam_id);
            $stmt->execute();
            $exam = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$exam) {
                Response::notFound('Exam not found');
            }

            if ($token_data['role'] === 'teacher' && (int)$exam['teacher_id'] !== (int)$token_data['linked_id']) {
                Response::forbidden('You can only delete scores for your own exams');
            }

            // Nullify the CA field(s) that were fed by this exam
            $field = $exam['score_slot'] === 'second_test' ? 'ca2' : 'ca1';

            $query = "UPDATE scores SET $field = NULL, cbt_exam_id = NULL WHERE cbt_exam_id = :exam_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':exam_id', $exam_id, PDO::PARAM_INT);
            $stmt->execute();

            $affected = $stmt->rowCount();
            Response::success(['deleted_count' => $affected], "$affected score(s) deleted");
        } catch (PDOException $e) {
            Response::serverError('Database error deleting scores');
        }
    }

    // ─── BULK IMPORT ─────────────────────────────────────────

    public function bulkImportQuestions($exam_id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data) || !isset($data['questions']) || !is_array($data['questions'])) {
            Response::badRequest('Expected JSON with "questions" array');
        }

        try {
            $exam_id = Middleware::validateInteger($exam_id, 'exam_id');
            $questions = $data['questions'];
            $imported = 0;
            $errors = [];

            $nextSort = $this->getNextSortOrder($exam_id);

            foreach ($questions as $i => $q) {
                try {
                    if (empty($q['question_text']) || empty($q['question_type'])) {
                        $errors[] = "Row $i: missing question_text or question_type";
                        continue;
                    }

                    $options_json = json_encode($q['options'] ?? []);
                    $correct_answer_json = json_encode($q['correct_answer'] ?? '');
                    $sort = $nextSort + $imported;

                    $stmt = $this->conn->prepare(
                        "INSERT INTO cbt_questions (exam_id, question_type, question_text, passage_text, image_url, options_json, correct_answer_json, marks, sort_order, section, section_instructions)
                         VALUES (:exam_id, :question_type, :question_text, :passage_text, :image_url, :options_json, :correct_answer_json, :marks, :sort_order, :section, :section_instructions)"
                    );
                    $stmt->bindValue(':exam_id', $exam_id);
                    $stmt->bindValue(':question_type', $q['question_type']);
                    $stmt->bindValue(':question_text', $q['question_text']);
                    $stmt->bindValue(':passage_text', $q['passage_text'] ?? null);
                    $stmt->bindValue(':image_url', $q['image_url'] ?? null);
                    $stmt->bindValue(':options_json', $options_json);
                    $stmt->bindValue(':correct_answer_json', $correct_answer_json);
                    $stmt->bindValue(':marks', $q['marks'] ?? 1);
                    $stmt->bindValue(':sort_order', $sort);
                    $stmt->bindValue(':section', $q['section'] ?? null);
                    $stmt->bindValue(':section_instructions', $q['section_instructions'] ?? null);
                    $stmt->execute();
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Row $i: " . $e->getMessage();
                }
            }

            $this->recalculateTotalMarks($exam_id);

            Response::success([
                'imported' => $imported,
                'errors' => $errors
            ], "$imported question(s) imported successfully" . (!empty($errors) ? ' with ' . count($errors) . ' error(s)' : ''));
        } catch (PDOException $e) {
            Response::serverError('Database error during bulk import');
        }
    }

    // ─── IMAGE UPLOAD ─────────────────────────────────────────

    public function uploadQuestionImage() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        if (!isset($_FILES['image'])) {
            Response::badRequest('No image file provided');
        }

        $file = $_FILES['image'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5MB

        if (!in_array($file['type'], $allowedTypes)) {
            Response::badRequest('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
        }

        if ($file['size'] > $maxSize) {
            Response::badRequest('File too large. Maximum 5MB');
        }

        $uploadDir = __DIR__ . '/../uploads/questions/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'q_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            Response::serverError('Failed to upload image');
        }

        $url = '/api/uploads/questions/' . $filename;
        Response::success(['url' => $url, 'filename' => $filename], 'Image uploaded successfully');
    }

    // ─── AI QUESTION GENERATION ───────────────────────────────

    public function generateQuestionsFromMaterial() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['material_text', 'question_type', 'count']);

        $materialText = $data['material_text'];
        $questionType = $data['question_type'];
        $count = min((int)($data['count'] ?? 5), 30);
        $difficulty = $data['difficulty'] ?? 'mixed';
        $examType = $data['exam_type'] ?? 'JAMB/WAEC';
        $topic = $data['topic'] ?? '';
        $includeExplanations = !empty($data['include_explanations']);

        try {
            $geminiKey = getenv('GEMINI_API_KEY');

            // Try Gemini AI (free tier) if key is configured
            if ($geminiKey) {
                $questions = $this->generateWithGemini($geminiKey, $materialText, $questionType, $count, $difficulty, $examType, $topic, $includeExplanations);
                Response::success(['questions' => $questions], count($questions) . ' questions generated successfully');
            } else {
                // Fallback: generate template questions locally (no API key needed)
                $questions = $this->generateLocalFallback($materialText, $questionType, $count, $difficulty, $includeExplanations);
                Response::success(['questions' => $questions], count($questions) . ' questions generated (local mode) — Set GEMINI_API_KEY for AI-powered generation');
            }
        } catch (\Exception $e) {
            Response::serverError('Error generating questions: ' . $e->getMessage());
        }
    }

    private function generateWithGemini($apiKey, $materialText, $questionType, $count, $difficulty, $examType, $topic, $includeExplanations) {
        $difficultyGuide = $difficulty === 'mixed'
            ? 'Mix of easy, medium, and hard questions'
            : "All questions should be $difficulty difficulty";

        $typeGuide = [
            'single_choice' => 'multiple choice with 4 options (A, B, C, D). One correct answer.',
            'multi_select' => 'multiple-select where 2 or more options are correct.',
            'true_false' => 'true/false with exactly TWO options: "True" and "False". The correct_answer must be either "True" or "False".',
        ];

        $prompt = "You are an expert JAMB/WAEC/NECO question setter with 20+ years of experience. ";
        $prompt .= "Generate exactly $count high-quality $examType-standard ";
        $prompt .= $typeGuide[$questionType] ?? 'multiple choice questions';
        $prompt .= " from the following material.\n\n";
        $prompt .= "REQUIREMENTS:\n";
        $prompt .= "- Each question must test understanding, not just recall\n";
        $prompt .= "- Distractors (wrong options) must be plausible and relevant\n";
        $prompt .= "- $difficultyGuide\n";
        $prompt .= "- Each question_text can include simple HTML like <b>bold</b>, <i>italic</i>, <sub>subscript</sub>, <sup>superscript</sup> for formulas\n";
        if ($topic) $prompt .= "- Topic: $topic\n";
        if ($includeExplanations) $prompt .= "- Include an 'explanation' field explaining why the correct answer is right\n";

        $prompt .= "\nOutput ONLY a valid JSON array. Each object must have:\n";
        $prompt .= "- question_text (string)\n";
        $prompt .= "- options (array of strings)\n";
        $prompt .= "- correct_answer (string, or array of strings for multi_select)\n";
        $prompt .= "- marks (integer, 1-3 depending on difficulty: easy=1, medium=2, hard=3)\n";
        $prompt .= "- difficulty ('easy', 'medium', or 'hard')\n";
        $prompt .= "- topic (string)\n";
        if ($includeExplanations) $prompt .= "- explanation (string)\n";

        $prompt .= "\n\nMaterial to generate from:\n" . substr($materialText, 0, 10000);

        $requestBody = [
            'contents' => [
                ['parts' => [['text' => $prompt]]]
            ],
            'generationConfig' => [
                'temperature' => 0.8,
                'maxOutputTokens' => 8192,
            ],
        ];

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($requestBody),
            CURLOPT_TIMEOUT => 90,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $errorMsg = 'Gemini API error (HTTP ' . $httpCode . ')';
            $result = json_decode($response, true);
            if (isset($result['error']['message'])) {
                $errorMsg .= ': ' . $result['error']['message'];
            }
            // Fall back to local generation if Gemini fails
            return $this->generateLocalFallback($materialText, $questionType, $count, $difficulty, $includeExplanations);
        }

        $result = json_decode($response, true);
        $content = $result['candidates'][0]['content']['parts'][0]['text'] ?? '[]';
        $content = trim($content);

        // Remove markdown code fences if present
        if (str_starts_with($content, '```')) {
            $content = preg_replace('/^```(?:json)?\s*/i', '', $content);
            $content = preg_replace('/\s*```$/', '', $content);
        }

        $generated = json_decode($content, true);
        if (!is_array($generated)) {
            return $this->generateLocalFallback($materialText, $questionType, $count, $difficulty, $includeExplanations);
        }

        return $generated;
    }

    private function generateLocalFallback($materialText, $questionType, $count, $difficulty, $includeExplanations) {
        $questions = [];

        // Extract meaningful sentences from material
        $sentences = preg_split('/[.!?]+/', $materialText);
        $sentences = array_map('trim', $sentences);
        $sentences = array_filter($sentences, function($s) {
            return strlen($s) > 20;
        });
        $sentences = array_values($sentences);

        if (empty($sentences)) {
            // Use generic educational topics if material is too short
            $topics = ['the main concept', 'the key principle', 'the fundamental idea', 'the core topic', 'the primary theme'];
            for ($i = 0; $i < min($count, 5); $i++) {
                $questions[] = $this->makeLocalQuestion($topics[$i] ?? 'this topic', $questionType, $difficulty, $includeExplanations, $i);
            }
            return $questions;
        }

        $used = [];
        $maxQuestions = min($count, count($sentences), 10);

        for ($i = 0; $i < $maxQuestions; $i++) {
            // Pick a sentence, avoiding repeats
            $idx = $i % count($sentences);
            $sentence = $sentences[$idx];

            $questions[] = $this->makeLocalQuestion($sentence, $questionType, $difficulty, $includeExplanations, $i);
        }

        return $questions;
    }

    private function makeLocalQuestion($sentence, $questionType, $difficulty, $includeExplanations, $index) {
        $diffList = ['easy', 'medium', 'hard'];
        $diff = $difficulty === 'mixed' ? $diffList[$index % 3] : $difficulty;

        $marks = $diff === 'easy' ? 1 : ($diff === 'medium' ? 2 : 3);
        $words = str_word_count($sentence);
        $short = mb_substr($sentence, 0, min(mb_strlen($sentence), 80));

        // Extract a key term for fill-in-the-blank
        $allWords = str_word_count($sentence, 1);
        $keyWord = !empty($allWords) ? $allWords[min($index, count($allWords) - 1)] : 'concept';

        $question = [
            'question_type' => $questionType,
            'marks' => $marks,
            'difficulty' => $diff,
            'topic' => 'General',
        ];

        if ($questionType === 'true_false') {
            $statement = "Based on the material, is the following statement correct? \"$short\"";
            $question['question_text'] = htmlspecialchars($statement, ENT_QUOTES, 'UTF-8');
            $question['options'] = ['True', 'False'];
            $question['correct_answer'] = 'True';
            if ($includeExplanations) {
                $question['explanation'] = 'The statement is derived directly from the material provided.';
            }
        } elseif ($questionType === 'fill_in_blank') {
            $blanked = str_ireplace($keyWord, '_____', $short);
            $question['question_text'] = 'Fill in the blank: ' . htmlspecialchars($blanked, ENT_QUOTES, 'UTF-8');
            $question['options'] = [];
            $question['correct_answer'] = $keyWord;
            if ($includeExplanations) {
                $question['explanation'] = "The correct answer is \"$keyWord\" based on the material.";
            }
        } elseif ($questionType === 'multi_select') {
            $question['question_text'] = 'Which of the following are mentioned in the material? (Select all that apply)';
            $parts = array_slice(str_word_count($sentence, 1), 0, 6);
            $correct = array_slice($parts, 0, 2);
            $question['options'] = array_map(function($w) { return htmlspecialchars($w, ENT_QUOTES, 'UTF-8'); }, $parts);
            $question['correct_answer'] = array_map(function($w) { return htmlspecialchars($w, ENT_QUOTES, 'UTF-8'); }, $correct);
            if ($includeExplanations) {
                $question['explanation'] = 'These terms appear in the provided material.';
            }
        } else {
            $question['question_text'] = 'According to the material, what is meant by: "' . htmlspecialchars($short, ENT_QUOTES, 'UTF-8') . '"?';
            $question['options'] = [
                htmlspecialchars($short, ENT_QUOTES, 'UTF-8'),
                'The opposite of what is described',
                'An unrelated concept',
                'None of the above'
            ];
            $question['correct_answer'] = htmlspecialchars($short, ENT_QUOTES, 'UTF-8');
            if ($includeExplanations) {
                $question['explanation'] = 'This is stated directly in the provided material. Review the passage for the exact wording.';
            }
        }

        return $question;
    }

    // ─── HELPER METHODS ──────────────────────────────────────

    private function getQuestionCount($exam_id) {
        $query = "SELECT COUNT(*) as count FROM cbt_questions WHERE exam_id = :exam_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':exam_id', $exam_id);
        $stmt->execute();
        return (int)$stmt->fetch(PDO::FETCH_ASSOC)['count'];
    }

    private function getNextSortOrder($exam_id) {
        $query = "SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM cbt_questions WHERE exam_id = :exam_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':exam_id', $exam_id);
        $stmt->execute();
        return (int)$stmt->fetch(PDO::FETCH_ASSOC)['next'];
    }

    private function recalculateTotalMarks($exam_id) {
        $query = "UPDATE cbt_exams SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM cbt_questions WHERE exam_id = :exam_id1) WHERE id = :exam_id2";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':exam_id1', $exam_id);
        $stmt->bindValue(':exam_id2', $exam_id);
        $stmt->execute();
    }

    private function getRemark($percentage) {
        if ($percentage >= 90) return 'Excellent';
        if ($percentage >= 80) return 'Very Good';
        if ($percentage >= 70) return 'Good';
        if ($percentage >= 60) return 'Satisfactory';
        if ($percentage >= 50) return 'Fair';
        return 'Needs Improvement';
    }

    private function feedIntoScores($student_id, $subject_id, $class_id, $academic_year, $term, $score_slot, $percentage, $teacher_id, $exam_id = null) {
        try {
            // Find subject_assignment_id
            $query = "SELECT id FROM subject_assignments
                      WHERE subject_id = :subject_id AND class_id = :class_id
                      AND academic_year = :academic_year AND term = :term AND status = 'Active'
                      LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':subject_id', $subject_id);
            $stmt->bindValue(':class_id', $class_id);
            $stmt->bindValue(':academic_year', $academic_year);
            $stmt->bindValue(':term', $term);
            $stmt->execute();
            $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$assignment) {
                return;
            }

            $assignment_id = $assignment['id'];

            // Scale percentage (0-100) to CA max (usually 20)
            $ca_score = round(($percentage / 100) * 20, 1);

            // Check existing score
            $query = "SELECT id, ca1, ca2 FROM scores WHERE student_id = :student_id AND subject_assignment_id = :assignment_id LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':student_id', $student_id);
            $stmt->bindValue(':assignment_id', $assignment_id);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            $field = $score_slot === 'first_test' ? 'ca1' : 'ca2';

            if ($existing) {
                $query = "UPDATE scores SET $field = :ca_score, cbt_exam_id = :cbt_exam_id WHERE id = :id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':ca_score', $ca_score);
                $stmt->bindValue(':cbt_exam_id', $exam_id, PDO::PARAM_INT);
                $stmt->bindValue(':id', $existing['id']);
                $stmt->execute();
            } else {
                $query = "INSERT INTO scores (student_id, subject_assignment_id, $field, cbt_exam_id, term, academic_year, entered_by, entered_date, status)
                          VALUES (:student_id, :assignment_id, :ca_score, :cbt_exam_id, :term, :academic_year, :teacher_id, NOW(), 'Submitted')";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':student_id', $student_id);
                $stmt->bindValue(':assignment_id', $assignment_id);
                $stmt->bindValue(':ca_score', $ca_score);
                $stmt->bindValue(':cbt_exam_id', $exam_id, PDO::PARAM_INT);
                $stmt->bindValue(':term', $term);
                $stmt->bindValue(':academic_year', $academic_year);
                $stmt->bindValue(':teacher_id', $teacher_id);
                $stmt->execute();
            }
        } catch (PDOException $e) {
            error_log("CBT score feed error: " . $e->getMessage());
        }
    }
}
