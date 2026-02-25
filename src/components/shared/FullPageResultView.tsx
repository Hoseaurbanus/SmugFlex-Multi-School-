import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StudentResultCard } from "./StudentResultCard";
import { useSchool } from "../../contexts/SchoolContext";
import { StudentData, ClassData, CompiledResultData } from "./types/resultCard";
import { ArrowLeft, Printer, Download } from 'lucide-react';

interface FullPageResultViewProps {
  studentId: number;
  resultId: number;
  onClose: () => void;
}

export function FullPageResultView({ studentId, resultId, onClose }: FullPageResultViewProps) {
  const { students, classes, compiledResults } = useSchool();
  const [student, setStudent] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [studentClass, setStudentClass] = useState<any>(null);

  useEffect(() => {
    // Ensure arrays before using .find()
    const safeStudents = Array.isArray(students) ? students : [];
    const safeCompiledResults = Array.isArray(compiledResults) ? compiledResults : [];
    const safeClasses = Array.isArray(classes) ? classes : [];
    
    // Find student, result, and class data
    const foundStudent = safeStudents.find(s => s.id === studentId);
    const foundResult = safeCompiledResults.find(cr => cr.id === resultId);
    const foundClass = safeClasses.find(c => c.id === foundResult?.class_id);

    setStudent(foundStudent);
    setResult(foundResult);
    setStudentClass(foundClass);
  }, [studentId, resultId, students, compiledResults, classes]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Trigger download from the StudentResultCard component
    const downloadButton = document.querySelector('[data-download-pdf]') as HTMLButtonElement;
    if (downloadButton) {
      downloadButton.click();
    }
  };

  if (!student || !result) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading result...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media screen {
          body {
            margin: 0;
            padding: 0;
            overflow-x: auto;
            background: #f3f4f6;
          }
          
          .full-page-container {
            background: #f3f4f6;
            min-height: 100vh;
            padding: 2rem 0;
          }
          
          .no-print {
            display: block !important;
          }
          
          .print-only {
            display: none !important;
          }
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            overflow: visible !important;
          }
          
          .full-page-container {
            background: white !important;
            padding: 0 !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .full-page-container {
            background: white !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .bg-white.shadow-2xl.mx-auto {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        {/* Header Controls - No Print */}
        <div className="no-print bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Results
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {student.firstName} {student.lastName} - Result Sheet
                  </h1>
                  <p className="text-sm text-gray-600">
                    {studentClass?.name} • {result.term} • {result.academic_year}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                  data-download-pdf
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Full Page A4 Container */}
        <div className="full-page-container py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* A4 Size Container */}
            <div className="bg-white shadow-2xl mx-auto overflow-auto" style={{ 
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '100%',
              aspectRatio: '210/297',
              overflow: 'visible'
            }}>
              {/* Scale container for proper A4 display */}
              <div className="transform-gpu" style={{ 
                transform: 'scale(1)',
                transformOrigin: 'top center',
                width: '100%',
                height: '100%',
                overflow: 'visible'
              }}>
                <StudentResultCard
                  student={student}
                  studentClass={studentClass}
                  result={result}
                  showActions={false}
                  currentUser={{ role: 'admin' }}
                />
              </div>
            </div>

            {/* Instructions for screen viewing - No Print */}
            <div className="no-print mt-8 text-center text-gray-600">
              <p className="text-sm">
                This is displayed in A4 format. Use the Print button to print or Download PDF to save.
              </p>
              <p className="text-xs mt-2">
                The result sheet is optimized for A4 paper size (210mm × 297mm).
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
