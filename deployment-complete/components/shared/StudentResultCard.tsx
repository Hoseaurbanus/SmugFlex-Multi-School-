import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useSchool } from "../../contexts/SchoolContext";
import { StudentResultCardProps } from './types/resultCard';
import schoolLogo from "../../assets/images/school-logo.jpg";

// Add print styles
const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  .print-content, .print-content * {
    visibility: visible;
  }
  .print-content {
    position: absolute;
    left: 0;
    top: 0;
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    border: none;
    overflow: hidden;
  }
  @page {
    size: A4;
    margin: 0;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
}
`;

export function StudentResultCard({
  student: propStudent,
  studentClass: propStudentClass,
  result,
  detailedScores: propDetailedScores,
  showActions = false,
  onDownload,
  onPrint,
  onApprovePrint,
  currentUser
}: StudentResultCardProps) {
  const { schoolSettings, loadSchoolSettings, students, classes, teachers, scores, subjectAssignments, subjects, affectiveDomains, psychomotorDomains, loadScoresFromAPI, loadSubjectAssignmentsFromAPI, loadSubjectsFromAPI, loadAffectiveDomainsFromAPI, loadPsychomotorDomainsFromAPI, getClassTeacher } = useSchool();
  const [showDetails, setShowDetails] = useState(false);
  const [detailedScoresData, setDetailedScoresData] = useState<any[]>([]);

  // Ensure school settings are loaded for next term begins date
  useEffect(() => {
    if (!schoolSettings?.resumption_date) {
      loadSchoolSettings();
    }
  }, [schoolSettings?.resumption_date, loadSchoolSettings]);

  // Add print styles to document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Handle print function
  const handlePrint = () => {
    window.print();
  };

  // Load detailed scores when component mounts or result changes
  useEffect(() => {
    if (result && result.student_id) {
      loadDetailedScores();
      loadDomainData();
    }
  }, [result]); // Remove scores from dependencies to prevent infinite loop

  // Load affective and psychomotor domain data
  const loadDomainData = async () => {
    if (!result || !result.student_id) return;

    try {
      // Ensure domain data is loaded
      await Promise.all([
        affectiveDomains.length === 0 && loadAffectiveDomainsFromAPI(),
        psychomotorDomains.length === 0 && loadPsychomotorDomainsFromAPI()
      ]);
    } catch (error) {
      console.error('Error loading domain data:', error);
    }
  };

  // Get student's affective domain data
  const getStudentAffectiveData = () => {
    if (!result || !result.student_id) return {} as any;
    
    const studentAffective = affectiveDomains.find(domain => 
      domain.student_id === result.student_id &&
      domain.academic_year === result.academic_year &&
      domain.term === result.term
    );
    
    return studentAffective || {} as any;
  };

  // Get student's psychomotor domain data
  const getStudentPsychomotorData = () => {
    if (!result || !result.student_id) return {} as any;
    
    const studentPsychomotor = psychomotorDomains.find(domain => 
      domain.student_id === result.student_id &&
      domain.academic_year === result.academic_year &&
      domain.term === result.term
    );
    
    return studentPsychomotor || {} as any;
  };

  const loadDetailedScores = async () => {
    if (!result || !result.student_id) return;

    try {
      // Ensure all necessary data is loaded
      await Promise.all([
        scores.length === 0 && loadScoresFromAPI(),
        subjectAssignments.length === 0 && loadSubjectAssignmentsFromAPI(),
        subjects.length === 0 && loadSubjectsFromAPI()
      ]);

      // Filter scores for this student, class, term, and academic year
      let studentScores = scores.filter(score => 
        score.student_id === result.student_id &&
        score.academic_year === result.academic_year &&
        score.term === result.term
      );

      // Enhance scores with subject information and calculate class statistics
      studentScores = studentScores.map(score => {
        const subjectAssignment = subjectAssignments.find(sa => sa.id === score.subject_assignment_id);
        const subject = subjectAssignment ? subjects.find(s => s.id === subjectAssignment.subject_id) : null;
        const teacher = subjectAssignment ? teachers.find(t => t.id === subjectAssignment.teacher_id) : null;

        // Calculate class statistics for this subject
        const classScores = scores.filter(s => {
          const assignment = subjectAssignments.find(sa => sa.id === s.subject_assignment_id);
          return assignment && 
                 assignment.subject_id === subjectAssignment?.subject_id &&
                 s.academic_year === result.academic_year &&
                 s.term === result.term &&
                 s.total > 0;
        });

        const validScores = classScores.map(cs => cs.total || 0);
        const classAverage = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
        const classMinimum = validScores.length > 0 ? Math.min(...validScores) : 0;
        const classMaximum = validScores.length > 0 ? Math.max(...validScores) : 0;

        return {
          ...score,
          subject_name: subject ? subject.name : score.subject_name || 'Unknown Subject',
          subject_teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned',
          class_average: parseFloat(classAverage.toFixed(2)),
          class_minimum: classMinimum,
          class_maximum: classMaximum
        };
      }).sort((a, b) => a.subject_name.localeCompare(b.subject_name));

      // If we have detailedScores in props, use them, otherwise use result.scores or filtered scores
      if (propDetailedScores && propDetailedScores.length > 0) {
        setDetailedScoresData(propDetailedScores);
      } else if (result.scores && result.scores.length > 0) {
        // Enhance result scores with subject information too
        const enhancedResultScores = result.scores.map((score: any) => {
          const subjectAssignment = subjectAssignments.find(sa => sa.id === score.subject_assignment_id);
          const subject = subjectAssignment ? subjects.find(s => s.id === subjectAssignment.subject_id) : null;
          const teacher = subjectAssignment ? teachers.find(t => t.id === subjectAssignment.teacher_id) : null;

          // Calculate class statistics for this subject
          const classScores = scores.filter(s => {
            const assignment = subjectAssignments.find(sa => sa.id === s.subject_assignment_id);
            return assignment && 
                   assignment.subject_id === subjectAssignment?.subject_id &&
                   s.academic_year === result.academic_year &&
                   s.term === result.term &&
                   s.total > 0;
          });

          const validScores = classScores.map(cs => cs.total || 0);
          const classAverage = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
          const classMinimum = validScores.length > 0 ? Math.min(...validScores) : 0;
          const classMaximum = validScores.length > 0 ? Math.max(...validScores) : 0;
          
          return {
            ...score,
            subject_name: subject ? subject.name : score.subject_name || 'Unknown Subject',
            subject_teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned',
            class_average: parseFloat(classAverage.toFixed(2)),
            class_minimum: classMinimum,
            class_maximum: classMaximum
          };
        }).sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
        setDetailedScoresData(enhancedResultScores);
      } else {
        setDetailedScoresData(studentScores);
      }
    } catch (error) {
      console.error('Error loading detailed scores:', error);
      setDetailedScoresData([]);
    }
  };

  // Use props or find from context if not provided
  const studentData = propStudent || students.find(s => s.id === result.student_id);
  const studentClassData = propStudentClass || classes.find(c => c.id === result.class_id);

  // Get class teacher name
  const getClassTeacherName = () => {
    // First priority: Use the teacher name from compiled results (stored in database)
    if (result?.class_teacher_name && result.class_teacher_name.trim() !== '') {
      return result.class_teacher_name;
    }
    
    // Second priority: The class teacher name is already loaded in the class data as 'classTeacher'
    if (studentClassData?.classTeacher) {
      return studentClassData.classTeacher;
    }
    
    // Third priority: If class_teacher_id exists, find the teacher
    if (studentClassData?.classTeacherId) {
      const classTeacher = teachers.find((t: any) => t.id === studentClassData.classTeacherId);
      if (classTeacher) {
        return `${classTeacher.firstName} ${classTeacher.lastName}`;
      }
    }
    
    // Fourth priority: Get the assigned class teacher for this class (fallback)
    if (studentClassData?.id) {
      const assignedClassTeacher = getClassTeacher(studentClassData.id);
      if (assignedClassTeacher) {
        return `${assignedClassTeacher.firstName} ${assignedClassTeacher.lastName}`;
      }
    }
    
    // Final fallback: Return placeholder
    return '_________________';
  };

  // Calculate grade based on score - matching your design scale
  const getGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', remark: 'Excellent' };
    if (score >= 70) return { grade: 'B', remark: 'Very Good' };
    if (score >= 60) return { grade: 'C', remark: 'Good' };
    if (score >= 50) return { grade: 'D', remark: 'Satisfactory' };
    if (score >= 45) return { grade: 'E', remark: 'Fair' };
    return { grade: 'F', remark: 'Fail' };
  };

  // Get affective domain remark
  const getAffectiveRemark = (score: number) => {
    if (score === 5) return 'Excellent';
    if (score === 4) return 'Very Good';
    if (score === 3) return 'Good';
    if (score === 2) return 'Fair';
    return 'Poor';
  };

  // Helper function to convert database field names to complete readable names
  const getDomainName = (key: string): string => {
    // Affective domain mappings
    const affectiveMappings: Record<string, string> = {
      'attentiveness': 'Attentiveness',
      'honesty': 'Honesty',
      'neatness': 'Neatness',
      'obedience': 'Obedience',
      'sense_of_responsibility': 'Sense of Responsibility'
    };

    // Psychomotor domain mappings
    const psychomotorMappings: Record<string, string> = {
      'attention_to_direction': 'Attention to Direction',
      'considerate_of_others': 'Considerate of Others',
      'handwriting': 'Handwriting',
      'sports': 'Sports',
      'verbal_fluency': 'Verbal Fluency',
      'works_well_independently': 'Works Well Independently'
    };

    // Return the mapped name or format the key as fallback
    return affectiveMappings[key] || psychomotorMappings[key] || key.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
  };

  // Check if user can download/print (admin only or approved for parents)
  const canDownloadPrint = currentUser?.role === 'admin' || result.print_approved;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
            orientation: portrait;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', serif;
            font-size: 10pt;
            line-height: 1.2;
            width: 100%;
            height: 100vh;
            overflow: hidden;
          }
          
          .print-container {
            width: 100%;
            max-width: 190mm;
            min-height: 277mm;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
            padding: 4mm;
            background: white;
          }
          
          .print-header {
            page-break-after: auto;
            page-break-inside: avoid;
          }
          
          .print-table {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-section {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-affective-psychomotor {
            page-break-inside: avoid;
            display: flex !important;
            gap: 2mm !important;
          }
          
          .print-watermark {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 140mm !important;
            height: 140mm !important;
            opacity: 0.12 !important;
            z-index: 0 !important;
            pointer-events: none !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }
          
          .print-content {
            position: relative !important;
            z-index: 1 !important;
          }
          
          table {
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
          
          td, th {
            page-break-inside: avoid !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        }
      `}</style>
      
      <div className="print-container bg-white no-print" style={{ 
        fontFamily: '"Times New Roman", serif',
        width: '210mm',
        height: '297mm',
        margin: '0 auto',
        padding: '8mm',
        boxSizing: 'border-box',
        backgroundColor: 'white',
        overflow: 'hidden',
        position: 'relative',
        border: '3px double #2c3e50',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
      }}>
      
      <div className="print-content" style={{ 
        position: 'absolute', 
        left: '-8mm',
        top: '-8mm',
        width: '210mm',
        height: '297mm',
        zIndex: 1,
        textRendering: 'geometricPrecision',
        fontSmooth: 'always',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        WebkitTextStroke: '0.01px transparent',
        textShadow: '0 0 0.01px rgba(0,0,0,0.01)',
        letterSpacing: '0.01px',
        lineHeight: '1.1',
        fontWeight: '500',
        backgroundColor: 'white',
        padding: '8mm',
        boxSizing: 'border-box',
        border: '3px double #2c3e50'
      }}>
      {/* School Header */}
      <div className="print-header" style={{ textAlign: 'center', marginBottom: '3mm', padding: '2mm 0' }}>
        <div style={{ marginBottom: '1mm' }}>
          <img 
            src={schoolLogo} 
            alt="School Logo" 
            style={{ 
              width: '18mm', 
              height: '18mm', 
              display: 'block', 
              margin: '0 auto', 
              borderRadius: '50%', 
              border: '2px solid #2c3e50', 
              objectFit: 'cover',
              backgroundColor: '#ffffff',
              imageRendering: 'auto',
              WebkitImageRendering: 'auto'
            } as React.CSSProperties} 
            onError={(e) => {
              console.error('School logo failed to load:', e);
              // Try alternative logo path
              const target = e.target as HTMLImageElement;
              target.src = './assets/images/graceland-logo.jpg';
            }}
            onLoad={(e) => {
              console.log('School logo loaded successfully');
            }}
          />
        </div>
        <h1 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0.5mm 0', textTransform: 'uppercase', color: '#2c3e50', letterSpacing: '1px', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_name || 'SCHOOL NAME'}</h1>
        <p style={{ fontSize: '8pt', margin: '0.3mm 0', fontStyle: 'italic', color: '#555', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_address || 'SCHOOL ADDRESS'}</p>
        <p style={{ fontSize: '8pt', margin: '0.3mm 0', color: '#555', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{schoolSettings.school_email || 'school@email.com'}</p>
        <div style={{ marginTop: '1mm', borderBottom: '2px solid #2c3e50', width: '80%', margin: '1mm auto 0' }}></div>
      </div>

      {/* Student Information Section with Photo */}
      <div className="print-section" style={{ marginBottom: '2mm', display: 'flex', gap: '1mm', justifyContent: 'center', alignItems: 'stretch' }}>
        <div style={{ width: '75%' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #2c3e50',
            backgroundColor: '#f8f9fa',
            height: '18mm',
            pageBreakInside: 'avoid'
          }}>
            <tbody>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Name:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentData ? `${studentData.firstName} ${studentData.lastName}`.toUpperCase() : 'STUDENT NAME'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Session:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{result.academic_year || '2024/2025'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentClassData?.name || 'CLASS NAME'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentData?.gender || 'MALE'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>Next Term Begins:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }} colSpan={5}>{result?.next_term_begin || schoolSettings?.resumption_date || ''}</td>
              </tr>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Admission No:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentData?.admissionNumber || 'GRA/XXXXX'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Term:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{result.term || 'THIRD TERM'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Attendance:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{result.times_present || 0} / {result.total_attendance_days || 0} days</td>
              </tr>
              <tr>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Class:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentClassData?.name || 'CLASS NAME'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Gender:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }}>{studentData?.gender || 'MALE'}</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontWeight: 'bold', fontSize: '7pt' }}>Next Term Begins:</td>
                <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt' }} colSpan={5}>{result?.next_term_begin || schoolSettings?.resumption_date || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ width: '25%' }}>
          <div className="border border-black" style={{ height: '18mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {studentData?.photo_url ? (
              <img src={studentData.photo_url} alt="Student Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '9pt', color: '#666' }}>No Photo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Title */}
      <div style={{ textAlign: 'center', marginBottom: '1mm', padding: '1mm 0' }}>
        <h2 style={{ fontSize: '13pt', fontWeight: 'bold', textDecoration: 'underline', margin: '0.5mm 0', textTransform: 'uppercase', color: '#2c3e50', letterSpacing: '2px', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
          {result.term || 'THIRD TERM'} RESULT SHEET
        </h2>
      </div>

      {/* Result Table */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1mm' }}>
        <table className="print-table" style={{ 
          fontSize: '7pt', 
          width: '95%',
          borderCollapse: 'collapse',
          border: '2px solid #2c3e50',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid',
          pageBreakAfter: 'auto',
          textRendering: 'geometricPrecision',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
        <thead>
          <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
            <th className="border border-black" style={{ padding: '0.6mm', width: '3%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>SN</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '16%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>SUBJECT</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>1st CA</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>2nd CA</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Exams</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '6%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Total</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '5%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Grd</th>
            <th className="border border-black" style={{ padding: '0.6mm', width: '8%', fontWeight: 'bold', fontSize: '7pt', backgroundColor: '#2c3e50', color: 'white' }}>Remark</th>
                      </tr>
        </thead>
        <tbody>
          {detailedScoresData && detailedScoresData.length > 0 ? (
            detailedScoresData.map((score: any, index: number) => {
              const gradeInfo = getGrade(score.total || 0);
              return (
                <tr key={index}>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{index + 1}</td>
                  <td className="border border-black" style={{ padding: '0.4mm', fontSize: '7pt' }}>{score.subject_name || 'Subject'}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{score.ca1 || 0}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{score.ca2 || 0}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '7pt' }}>{score.exam || 0}</td>
                  <td className="border border-black text-center font-bold" style={{ padding: '0.4mm', textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>{score.total || 0}</td>
                  <td className="border border-black text-center font-bold" style={{ padding: '0.4mm', textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>{gradeInfo.grade}</td>
                  <td className="border border-black text-center" style={{ padding: '0.4mm', textAlign: 'center', fontSize: '4pt' }}>{gradeInfo.remark}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className="border border-black p-2 text-center text-gray-500" style={{ padding: '1.5mm', fontSize: '7pt' }}>
                No scores available
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Score Summary */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1mm' }}>
        <table className="print-table" style={{ 
          marginTop: '0.8mm', 
          fontSize: '6pt',
          width: '95%',
          borderCollapse: 'collapse',
          border: '2px solid #2c3e50',
          backgroundColor: '#f8f9fa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid'
        }}>
        <tbody>
          <tr>
            <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>TOTAL:</b> {result.total_score || '0.00'}</td>
            <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>AVG:</b> {result.average_score || '0.00'}</td>
            <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>CLASS AVG:</b> {result.class_average || '0.00'}</td>
            {!studentClassData?.name?.toUpperCase().includes('CRECHE') && 
             !studentClassData?.name?.toUpperCase().includes('KG1') && 
             !studentClassData?.name?.toUpperCase().includes('KG2') &&
             !studentClassData?.name?.toUpperCase().includes('KG 1') &&
             !studentClassData?.name?.toUpperCase().includes('KG 2') &&
             !studentClassData?.name?.toUpperCase().includes('KINDERGARTEN') && (
              <td className="border border-black p-1" style={{ padding: '0.8mm', width: '25%', fontSize: '7pt' }}><b>POS:</b> {result.position ? `${result.position}${result.position === 1 ? 'st' : result.position === 2 ? 'nd' : result.position === 3 ? 'rd' : 'th'}` : '___'}</td>
            )}
          </tr>
        </tbody>
      </table>
      </div>

      {/* Signature Section - Split Layout */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2mm', marginBottom: '1.5mm', gap: '2mm' }}>
        {/* Class Teacher Section - Left Side */}
        <div className="border border-black p-1" style={{ 
          padding: '2mm', 
          fontSize: '6pt',
          width: '47%',
          minHeight: '25mm',
          border: '2px solid #2c3e50',
          backgroundColor: '#f8f9fa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid',
          overflow: 'visible'
        }}>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', fontWeight: 'bold', color: '#2c3e50' }}>
            CLASS TEACHER
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt' }}>
            <b>Name:</b> {getClassTeacherName()}
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', whiteSpace: 'pre-wrap', wordWrap: 'break-word', maxWidth: '100%', overflow: 'visible', lineHeight: '1.2' }}>
            <b>Comment:</b> {
              result?.class_teacher_comment || result?.comment || 'Teacher comment will appear here.'
            }
          </p>
        </div>

        {/* Principal/Head Teacher Section - Right Side */}
        <div className="border border-black p-1" style={{ 
          padding: '2mm', 
          fontSize: '6pt',
          width: '47%',
          minHeight: '30mm',
          border: '2px solid #2c3e50',
          backgroundColor: '#f8f9fa',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pageBreakInside: 'avoid',
          overflow: 'visible'
        }}>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', fontWeight: 'bold', color: '#2c3e50' }}>
            {studentClassData?.category === 'Primary' ? 'HEAD TEACHER' : 'PRINCIPAL'}
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt' }}>
            <b>Name:</b> 
            {studentClassData?.category === 'Primary' 
              ? ` ${schoolSettings?.head_teacher_name || '_________________'}` 
              : ` ${schoolSettings?.principal_name || '_________________'}`
            }
          </p>
          <p style={{ margin: '0.3mm 0', fontSize: '7pt', whiteSpace: 'pre-wrap', wordWrap: 'break-word', maxWidth: '100%', overflow: 'visible', lineHeight: '1.2' }}>
            <b>Comment:</b> {
              studentClassData?.category === 'Primary' 
                ? (result?.principal_comment || schoolSettings?.head_teacher_comment || 'Head teacher comment will appear here.')
                : (result?.principal_comment || schoolSettings?.principal_comment || 'Principal comment will appear here.')
            }
          </p>
          <div style={{ marginTop: '1mm', marginBottom: '0.5mm', fontSize: '7pt' }}>
            <b>Signature:</b>
          </div>
          <div style={{ 
            borderBottom: '1px solid black', 
            height: '8mm', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative'
          }}>
            {studentClassData?.category === 'Primary' 
              ? (schoolSettings?.head_teacher_signature ? (
                  <img 
                    src={schoolSettings.head_teacher_signature} 
                    alt="Head Teacher Signature" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '6mm', 
                      objectFit: 'contain' 
                    }} 
                  />
                ) : (
                  <span style={{ color: '#999', fontSize: '4pt' }}></span>
                ))
              : (schoolSettings?.principal_signature ? (
                  <img 
                    src={schoolSettings.principal_signature} 
                    alt="Principal Signature" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '6mm', 
                      objectFit: 'contain' 
                    }} 
                  />
                ) : (
                  <span style={{ color: '#999', fontSize: '4pt' }}></span>
                ))
            }
          </div>
        </div>
      </div>

      {/* Affective and Psychomotor Domains */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2mm', marginBottom: '1mm', alignItems: 'flex-start' }}>
        {/* Affective Areas */}
        <div style={{ width: '48%' }}>
          <div className="text-center mb-1">
            <h3 className="font-bold underline" style={{ fontSize: '10pt', marginBottom: '0.5mm', color: '#2c3e50', letterSpacing: '1px' }}>AFFECTIVE</h3>
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid black',
            fontSize: '6pt',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            pageBreakInside: 'avoid',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1a252f', color: 'white' }}>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '50%' }}>QUALITY</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '20%' }}>SCORE</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '30%' }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const affectiveData = getStudentAffectiveData();
                return (
                  <>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('attentiveness')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{affectiveData.attentiveness || result.affective?.attentiveness || '4'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(affectiveData.attentiveness || result.affective?.attentiveness || 4))}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('honesty')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{affectiveData.honesty || result.affective?.honesty || '3'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(affectiveData.honesty || result.affective?.honesty || 3))}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('neatness')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{affectiveData.neatness || result.affective?.neatness || '4'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(affectiveData.neatness || result.affective?.neatness || 4))}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('obedience')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{affectiveData.obedience || result.affective?.obedience || '2'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(affectiveData.obedience || result.affective?.obedience || 2))}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('sense_of_responsibility')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{affectiveData.sense_of_responsibility || result.affective?.sense_of_responsibility || '3'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(affectiveData.sense_of_responsibility || result.affective?.sense_of_responsibility || 3))}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Psychomotor Skills */}
        <div style={{ width: '48%' }}>
          <div className="text-center mb-1">
            <h3 className="font-bold underline" style={{ fontSize: '10pt', marginBottom: '0.5mm', color: '#2c3e50', letterSpacing: '1px' }}>PSYCHOMOTOR</h3>
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid black',
            fontSize: '7pt',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            pageBreakInside: 'avoid',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1a252f', color: 'white' }}>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '50%' }}>SKILL</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '20%' }}>SCORE</th>
                <th className="border border-black" style={{ padding: '0.6mm', fontSize: '6pt', backgroundColor: '#1a252f', color: 'white', fontWeight: 'bold', width: '30%' }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const psychomotorData = getStudentPsychomotorData();
                return (
                  <>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('attention_to_direction')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{psychomotorData.attention_to_direction || result.psychomotor?.attention_to_direction || '4'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(psychomotorData.attention_to_direction || result.psychomotor?.attention_to_direction || 4))}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('considerate_of_others')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{psychomotorData.considerate_of_others || result.psychomotor?.considerate_of_others || '2'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(psychomotorData.considerate_of_others || result.psychomotor?.considerate_of_others || 2))}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('handwriting')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{psychomotorData.handwriting || result.psychomotor?.handwriting || '4'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(psychomotorData.handwriting || result.psychomotor?.handwriting || 4))}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('sports')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{psychomotorData.sports || result.psychomotor?.sports || '3'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(psychomotorData.sports || result.psychomotor?.sports || 3))}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('verbal_fluency')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{psychomotorData.verbal_fluency || result.psychomotor?.verbal_fluency || '4'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(psychomotorData.verbal_fluency || result.psychomotor?.verbal_fluency || 4))}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '600', color: '#000000', textRendering: 'geometricPrecision' }}>{getDomainName('works_well_independently')}</td>
                      <td className="border border-black text-center" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: 'bold', color: '#000000', textRendering: 'geometricPrecision' }}>{psychomotorData.works_well_independently || result.psychomotor?.independent_work || '5'}</td>
                      <td className="border border-black" style={{ padding: '0.5mm', fontSize: '7pt', fontWeight: '500', color: '#000000', textRendering: 'geometricPrecision' }}>{getAffectiveRemark(parseInt(psychomotorData.works_well_independently || result.psychomotor?.independent_work || 5))}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

            </div>
    </div>
    
    {/* Action Buttons - Outside Print View */}
    {showActions && (
      <div className="no-print" style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px', padding: '10px' }}>
        <Button 
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          style={{ marginRight: '8px' }}
        >
          Print Result (Ctrl+P)
        </Button>
        {onDownload && (
          <Button 
            onClick={() => onDownload(result.id)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Download PDF
          </Button>
        )}
      </div>
    )}
    </>
  );
}