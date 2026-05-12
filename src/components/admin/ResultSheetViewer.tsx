import { Book, BookOpen, Loader2 } from 'lucide-react';
import { useState, useEffect } from "react";
import { useSchool } from "../../contexts/SchoolContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { StudentResultCard } from "../shared/StudentResultCard";

interface ResultSheetViewerProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialStudentId?: number;
  initialClassId?: number;
  initialTerm?: string;
  initialAcademicYear?: string;
}

export function ResultSheetViewer({
  isOpen = false,
  onClose = () => {},
  initialStudentId,
  initialClassId,
  initialTerm,
  initialAcademicYear
}: ResultSheetViewerProps) {
  const { students, classes, compiledResults, currentUser, loadCompiledResultsFromAPI } = useSchool();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(initialStudentId || null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(initialClassId || null);
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || "Third Term");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(initialAcademicYear || "2024/2025");
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [studentResultData, setStudentResultData] = useState<any>(null);

  // Get available academic years
  const academicYears = [...new Set(compiledResults.map(r => r.academic_year))].sort();

  // Get available terms
  const terms = ["First Term", "Second Term", "Third Term"];

  // Filter students based on selected class
  const filteredStudents = selectedClassId 
    ? students.filter(s => s.class_id === selectedClassId)
    : students;

  // Get selected student info
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Load compiled results when component mounts
  useEffect(() => {
    if (compiledResults.length === 0) {
      loadCompiledResultsFromAPI();
    }
  }, []);

  // Fetch student result data when selection changes
  useEffect(() => {
    if (selectedStudentId && selectedClassId && selectedTerm && selectedAcademicYear) {
      fetchStudentResultData();
    }
  }, [selectedStudentId, selectedClassId, selectedTerm, selectedAcademicYear, compiledResults]);

  const fetchStudentResultData = async () => {
    if (!selectedStudentId || !selectedClassId || !selectedTerm || !selectedAcademicYear) return;
    
    setIsLoading(true);
    try {
      // Find the compiled result for this student, class, term, and academic year
      const result = compiledResults.find(r => 
        r.student_id === selectedStudentId &&
        r.class_id === selectedClassId &&
        r.term === selectedTerm &&
        r.academic_year === selectedAcademicYear
      );

      if (result) {
        setStudentResultData(result);
      } else {
        // Create a default result structure if no compiled result exists
        const defaultResult = {
          id: 0,
          student_id: selectedStudentId,
          class_id: selectedClassId,
          term: selectedTerm,
          academic_year: selectedAcademicYear,
          scores: [],
          affective: {
            attentiveness: 4,
            honesty: 3,
            neatness: 4,
            obedience: 2,
            responsibility: 3
          },
          psychomotor: {
            attention_direction: 4,
            considerate_others: 2,
            handwriting: 4,
            sports: 3,
            verbal_fluency: 4,
            independent_work: 5
          },
          class_teacher_name: "CHRIS RHEMA",
          class_teacher_comment: "A very good result. Put more effort.",
          principal_name: "OROGUN GLORY EJIRO",
          principal_comment: "A very good result. Release your potentials cause you can do more dear.",
          status: "Draft",
          print_approved: false,
          total_score: 0,
          average_score: 0,
          class_average: 0,
          position: null
        };
        setStudentResultData(defaultResult);
      }
    } catch (error) {
      setStudentResultData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    // Print functionality removed - only use ResultsManagementPage PDF generation
  };


  const handlePreview = () => {
    if (selectedStudentId && selectedClassId && selectedTerm && selectedAcademicYear) {
      setShowPreview(true);
      fetchStudentResultData();
    }
  };

  const canGenerateResult = selectedStudentId && selectedClassId && selectedTerm && selectedAcademicYear;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Student Result Sheet Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selection Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Result Sheet Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class-select">Select Class</Label>
                  <Select value={selectedClassId?.toString() || ""} onValueChange={(value: string) => setSelectedClassId(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="student-select">Select Student</Label>
                  <Select 
                    value={selectedStudentId?.toString() || ""} 
                    onValueChange={(value: string) => setSelectedStudentId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.firstName} {student.lastName} ({student.admissionNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="term-select">Select Term</Label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year-select">Academic Year</Label>
                  <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Info Display */}
              {selectedStudent && selectedClass && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Student:</span> {selectedStudent.firstName} {selectedStudent.lastName}
                    </div>
                    <div>
                      <span className="font-semibold">Admission No:</span> {selectedStudent.admissionNumber}
                    </div>
                    <div>
                      <span className="font-semibold">Class:</span> {selectedClass.name}
                    </div>
                    <div>
                      <span className="font-semibold">Term/Year:</span> {selectedTerm} - {selectedAcademicYear}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-4">
                <Button 
                  onClick={handlePreview} 
                  disabled={!canGenerateResult}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <span className="w-4 h-4 mr-2" />
                  Preview Result Sheet
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result Sheet Preview */}
          {showPreview && canGenerateResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Result Sheet Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-gray-200 rounded-lg overflow-hidden" id="student-result-card">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading result data...</span>
                    </div>
                  ) : studentResultData ? (
                    <StudentResultCard
                      result={studentResultData}
                      currentUser={currentUser}
                    />
                  ) : (
                    <div className="text-center py-20 text-gray-500">
                      <p>No result data found for this student.</p>
                      <p className="text-sm mt-2">Please ensure the result has been compiled.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Standalone component for use in other parts of the application
export function ResultSheetViewerButton({ studentId, classId, term, academicYear }: {
  studentId: number;
  classId: number;
  term: string;
  academicYear: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { students, classes, compiledResults, currentUser, loadCompiledResultsFromAPI } = useSchool();
  const [isLoading, setIsLoading] = useState(false);
  const [studentResultData, setStudentResultData] = useState<any>(null);

  // Load compiled results when component mounts
  useEffect(() => {
    if (compiledResults.length === 0) {
      loadCompiledResultsFromAPI();
    }
  }, []);

  // Fetch student result data when dialog opens
  useEffect(() => {
    if (isOpen && studentId && classId && term && academicYear) {
      fetchStudentResultData();
    }
  }, [isOpen, studentId, classId, term, academicYear, compiledResults]);

  const fetchStudentResultData = async () => {
    setIsLoading(true);
    try {
      // Find the compiled result for this student, class, term, and academic year
      const result = compiledResults.find(r => 
        r.student_id === studentId &&
        r.class_id === classId &&
        r.term === term &&
        r.academic_year === academicYear
      );

      if (result) {
        setStudentResultData(result);
      } else {
        // Create a default result structure if no compiled result exists
        const student = students.find(s => s.id === studentId);
        const defaultResult = {
          id: 0,
          student_id: studentId,
          class_id: classId,
          term: term,
          academic_year: academicYear,
          scores: [],
          affective: {
            attentiveness: 4,
            honesty: 3,
            neatness: 4,
            obedience: 2,
            responsibility: 3
          },
          psychomotor: {
            attention_direction: 4,
            considerate_others: 2,
            handwriting: 4,
            sports: 3,
            verbal_fluency: 4,
            independent_work: 5
          },
          class_teacher_name: "CHRIS RHEMA",
          class_teacher_comment: "A very good result. Put more effort.",
          principal_name: "OROGUN GLORY EJIRO",
          principal_comment: "A very good result. Release your potentials cause you can do more dear.",
          status: "Draft",
          print_approved: false,
          total_score: 0,
          average_score: 0,
          class_average: 0,
          position: null
        };
        setStudentResultData(defaultResult);
      }
    } catch (error) {
      setStudentResultData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    // Print functionality removed - only use ResultsManagementPage PDF generation
  };

  const handleDownloadPDF = () => {
    // PDF generation removed - only use ResultsManagementPage PDF generation
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <span className="w-4 h-4 mr-2" />
          View Result Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none">
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-white w-[210mm] h-[297mm] overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading result data...</span>
              </div>
            ) : studentResultData ? (
              <StudentResultCard
                result={studentResultData}
                currentUser={currentUser}
              />
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p>No result data found for this student.</p>
                <p className="text-sm mt-2">Please ensure the result has been compiled.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
