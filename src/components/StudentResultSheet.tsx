import { forwardRef, useEffect, useMemo, useState } from "react";
import { useSchool } from "../contexts/SchoolContext";
import { API_CONFIG } from "../config/api";
import { formatPositionWithSuffix } from "../utils/position";
import { generateQrDataUrl } from "../utils/qrCode";

interface StudentResultSheetProps {
  studentId: number;
  term: string;
  academicYear: string;
  className?: string;
}

export const StudentResultSheet = forwardRef<HTMLDivElement, StudentResultSheetProps>(
  ({ studentId, term, academicYear, className = "" }, ref) => {
    const {
      students,
      classes,
      scores,
      affectiveDomains,
      psychomotorDomains,
      compiledResults,
      subjectAssignments,
      schoolSettings,
      subjects,
      loadSchoolSettings,
    } = useSchool();

    const [signatureResumptionDate, setSignatureResumptionDate] = useState<string>('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // Load school settings for branding (logo/name/motto/signatures). This is unrelated to Next Term Begins.
    useEffect(() => {
      if (!schoolSettings || Object.keys(schoolSettings).length === 0) {
        loadSchoolSettings();
      }
    }, [schoolSettings, loadSchoolSettings]);

    useEffect(() => {
      let isMounted = true;
      const loadSignatureResumptionDate = async () => {
        try {
          if (!academicYear || !term) return;

          const token = localStorage.getItem('jwt_token');
          const query = new URLSearchParams({ academic_year: academicYear, term });
          const resp = await fetch(`${API_CONFIG.BASE_URL}/signature_settings.php?${query.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });

          const json = await resp.json();
          const date = String((json as any)?.data?.resumption_date ?? '').trim();
          if (!date || date === '0000-00-00' || date === '0000-00-00 00:00:00') {
            if (isMounted) setSignatureResumptionDate('');
            return;
          }
          const normalized = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : date;
          if (isMounted) setSignatureResumptionDate(normalized);
        } catch {
          if (isMounted) setSignatureResumptionDate('');
        }
      };

      loadSignatureResumptionDate();
      return () => {
        isMounted = false;
      };
    }, [academicYear, term]);

    // Generate QR code
    useEffect(() => {
      let cancelled = false;
      const generate = async () => {
        const resultId = (compiledResult as any)?.id;
        if (!resultId || !studentId) return;
        const payload = JSON.stringify({
          result_id: resultId,
          student_id: studentId,
          term,
          academic_year: academicYear,
          average_score: (compiledResult as any)?.average_score || 0,
        });
        try {
          const url = await generateQrDataUrl(payload, 220);
          if (!cancelled) setQrCodeDataUrl(url);
        } catch {
          // silently ignore
        }
      };
      generate();
      return () => { cancelled = true; };
    }, [studentId, term, academicYear]);

    // Get student
    const student = students.find((s) => s.id === studentId);

    const studentPhotoCandidates = useMemo(() => {
      const raw =
        (student as any)?.photo_url ||
        (student as any)?.photoUrl ||
        (student as any)?.photoURL ||
        (student as any)?.passport_photo ||
        (student as any)?.passportPhoto ||
        '';

      if (typeof raw !== 'string') return [];
      const trimmed = raw.trim();
      if (!trimmed) return [];

      if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
        return [trimmed];
      }

      let apiOrigin: string;
      try {
        apiOrigin = API_CONFIG?.BASE_URL ? new URL(API_CONFIG.BASE_URL).origin : '';
      } catch {
        apiOrigin = '';
      }

      const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

      const candidates = [
        appOrigin ? `${appOrigin}${normalizedPath}` : '',
        apiOrigin ? `${apiOrigin}${normalizedPath}` : '',
        trimmed,
      ].filter(Boolean);

      return Array.from(new Set(candidates));
    }, [student]);

    if (!student) return null;

    // Get compiled result
    const safeCompiledResults = Array.isArray(compiledResults) ? compiledResults : [];
    const compiledResult = safeCompiledResults.find(
      (r) =>
        r.student_id === studentId &&
        r.term === term &&
        r.academic_year === academicYear &&
        (r.status === "Approved" || r.status === "Submitted")
    );

    if (!compiledResult) {
      return (
        <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-gray-600">No result available for this term</p>
        </div>
      );
    }

    // Get class info
    const studentClass = classes.find((c) => c.id === student.class_id);

    // Check if class should show position (not for early childhood classes)
    const shouldShowPosition = studentClass?.name && 
      !['CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)', 'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)', 'KG 2 (PEARL)'].includes(studentClass.name.toUpperCase());

    // Get student scores — prefer embedded, fall back to context scores + subject join
    const studentScores = compiledResult.scores?.length > 0
      ? compiledResult.scores
      : scores
          .filter((s) => s.student_id === studentId && s.term === term && s.academic_year === academicYear)
          .map((s) => {
            const assignment = subjectAssignments.find((sa) => sa.id === s.subject_assignment_id);
            const subject = subjects.find((sub) => sub.id === assignment?.subject_id);
            return {
              ...s,
              subject_name: subject?.name || subject?.subject_name || 'Unknown'
            };
          });

    // Get affective and psychomotor — prefer embedded, fall back to context arrays
    const affective = compiledResult.affective || (
      Array.isArray(affectiveDomains) ? affectiveDomains.find(
        (a: any) => a.student_id === studentId && a.term === term && a.academic_year === academicYear
      ) : null
    );
    const psychomotor = compiledResult.psychomotor || (
      Array.isArray(psychomotorDomains) ? psychomotorDomains.find(
        (p: any) => p.student_id === studentId && p.term === term && p.academic_year === academicYear
      ) : null
    );
    
    // Calculate total score and average from compiled result data
    const totalScore = compiledResult.total_score || 0;
    const studentAverage = compiledResult.average_score || 0;

    // Format dates
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const getRatingRemark = (value: number): string => {
      if (value === 5) return "Excellent";
      if (value === 4) return "Very Good";
      if (value === 3) return "Good";
      if (value === 2) return "Fair";
      if (value === 1) return "Poor";
      return "";
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

    // Get next term date from compiled result or school settings
    const getNextTermBegin = () => {
      const compiledNext = String((compiledResult as any)?.next_term_begin ?? '').trim();
      const compiledNextValid = compiledNext !== '' && compiledNext !== '0000-00-00' && compiledNext !== '0000-00-00 00:00:00';
      return (
        signatureResumptionDate ||
        (compiledNextValid ? compiledNext : '') ||
        ''
      );
    };

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
          
          @media print {
            @page {
              size: A4;
              margin: 0mm;
            }
            
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              font-size: 8pt !important;
            }
            
            .print-container {
              box-shadow: none !important;
              border: 1px solid #000 !important;
              margin: 0 !important;
              padding: 8mm !important;
              width: 210mm !important;
              height: 297mm !important;
              overflow: hidden !important;
              background: white !important;
              position: relative !important;
              font-size: 7pt !important;
              line-height: 0.9 !important;
              box-sizing: border-box !important;
            }
            
            .print-container * {
              font-size: 8pt !important;
              line-height: 1.0 !important;
            }
            
            .print-container table {
              font-size: 7pt !important;
            }
            
            .print-container th,
            .print-container td {
              padding: 2px !important;
              font-size: 7pt !important;
            }
            
            .no-print {
              display: none !important;
            }
            
            /* Ensure all sections maintain their layout */
            header {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              border-bottom: 4px solid #4A90E2 !important;
              padding-bottom: 12px !important;
              margin-bottom: 16px !important;
              page-break-inside: avoid !important;
            }
            
            header > div:first-child {
              display: flex !important;
              align-items: center !important;
            }
            
            header img {
              width: 60px !important;
              height: 60px !important;
              margin-right: 16px !important;
            }
            
            header h1 {
              font-family: 'Playfair Display', serif !important;
              color: #333 !important;
              font-size: 20pt !important;
              font-weight: 700 !important;
              margin: 0 !important;
            }
            
            header p {
              color: #555 !important;
              font-size: 10pt !important;
              margin: 4px 0 0 !important;
            }
            
            /* Student info section */
            section:first-of-type {
              display: flex !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              margin-bottom: 16px !important;
              page-break-inside: avoid !important;
            }
            
            section:first-of-type > div:first-child {
              display: flex !important;
              align-items: center !important;
            }
            
            section:first-of-type img {
              width: 70px !important;
              height: 90px !important;
              border-radius: 8px !important;
              margin-right: 16px !important;
              border: 2px solid #4A90E2 !important;
            }
            
            section:first-of-type h2 {
              font-family: 'Inter', sans-serif !important;
              color: #333 !important;
              font-size: 16pt !important;
              font-weight: 600 !important;
              margin: 0 0 4px !important;
            }
            
            section:first-of-type p {
              color: #666 !important;
              font-size: 9pt !important;
              margin: 2px 0 !important;
            }
            
            section:first-of-type div:last-child {
              font-size: 9pt !important;
              color: #333 !important;
              text-align: right !important;
            }
            
            /* Tables maintain their structure */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 9pt !important;
              page-break-inside: avoid !important;
            }
            
            th {
              background-color: #4A90E2 !important;
              color: white !important;
              padding: 5px !important;
              border: 1px solid #ddd !important;
              text-align: left !important;
              font-weight: 600 !important;
              font-size: 9pt !important;
            }
            
            td {
              padding: 4px 5px !important;
              border: 1px solid #ddd !important;
              vertical-align: top !important;
              font-size: 9pt !important;
            }
            
            /* Psychomotor and Affective tables */
            .psychomotor-affective {
              display: flex !important;
              gap: 16px !important;
              margin-bottom: 16px !important;
              page-break-inside: avoid !important;
            }
            
            .psychomotor-affective > div {
              flex: 1 !important;
            }
            
            .psychomotor-affective table {
              font-size: 8pt !important;
            }
            
            .psychomotor-affective th {
              padding: 3px !important;
              font-size: 8pt !important;
            }
            
            .psychomotor-affective td {
              padding: 2px 3px !important;
              font-size: 8pt !important;
            }
            
            /* Comments section */
            .comments-section {
              margin-bottom: 16px !important;
              page-break-inside: avoid !important;
            }
            
            .comments-section table {
              font-size: 9pt !important;
            }
            
            .comments-section th {
              background-color: #4A90E2 !important;
              color: white !important;
              padding: 5px !important;
              font-size: 9pt !important;
            }
            
            .comments-section td {
              padding: 5px !important;
              font-size: 9pt !important;
            }
            
            /* Footer section */
            footer {
              display: flex !important;
              justify-content: space-between !important;
              align-items: flex-end !important;
              margin-top: 16px !important;
              page-break-inside: avoid !important;
            }
            
            footer > div {
              width: 33% !important;
              text-align: center !important;
            }
            
            footer img {
              height: 35px !important;
              margin: 0 auto 8px !important;
            }
            
            footer p {
              border-top: 1px solid #333 !important;
              padding-top: 4px !important;
              margin: 0 !important;
              font-size: 8pt !important;
            }
            
            footer div:last-child p {
              margin: 0 !important;
              font-style: italic !important;
              border-top: 2px solid #4A90E2 !important;
              padding-top: 6px !important;
            }
            
            /* Watermark */
            .print-container > div:first-child {
              position: absolute !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 0 !important;
            }
            
            .print-container > div:nth-child(2) {
              position: relative !important;
              z-index: 1 !important;
            }
            
            /* Prevent page breaks inside important elements */
            h1, h2, h3, table, .psychomotor-affective, .comments-section, header, footer {
              page-break-inside: avoid !important;
            }
          }
        `}</style>
        <div id={`student-result-${studentId}-${term}-${academicYear}`} ref={ref} className={`print-container bg-white ${className}`} style={{ fontFamily: "'Inter', sans-serif", width: '210mm', height: '297mm', margin: '0', padding: '8mm', fontSize: '11px', boxSizing: 'border-box', border: '1px solid #000' }}>
          {/* Watermark */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundImage: `url("${schoolSettings?.school_logo_url || "/assets/school-logo.svg"}")`,
            backgroundSize: '120mm',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.05,
            zIndex: 0,
            width: '100%',
            height: '100%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #4A90E2', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* School Logo with robust error handling */}
            <div style={{ 
              width: '70px', 
              height: '70px', 
              marginRight: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px'
            }}>
              <img 
                src={schoolSettings?.school_logo_url || "/assets/school-logo.svg"} 
                alt="School Logo" 
                style={{ 
                  maxHeight: '70px',
                  maxWidth: '70px',
                  objectFit: 'contain',
                  backgroundColor: 'transparent'
                }} 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Remove error state and show fallback
                  target.style.display = 'none';
                  // Create text fallback
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-fallback';
                    fallback.style.cssText = `
                      font-size: 12px;
                      font-weight: bold;
                      color: #333;
                      text-align: center;
                      line-height: 60px;
                    `;
                    fallback.textContent = 'SCHOOL LOGO';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#333', fontSize: '24px', fontWeight: 700, margin: 0 }}>{schoolSettings?.school_name || ''}</h1>
              <p style={{ color: '#555', fontSize: '12px', margin: '4px 0 0' }}>{schoolSettings?.school_address || ''}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#333', fontSize: '14px', fontWeight: 600, margin: 0 }}>Student Progress Report</p>
            <p style={{ color: '#555', fontSize: '12px', margin: '4px 0 0' }}>{schoolSettings?.school_email || ''} | {schoolSettings?.school_phone || ''}</p>
          </div>
        </header>

        {/* Student Info Section */}
        <section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: '80px', height: '100px', border: '2px solid #ddd', borderRadius: '8px', overflow: 'hidden', marginRight: '8px' }}>
              <img
                src={studentPhotoCandidates[0] || ''}
                alt="Student"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                data-candidate-idx={0}
                onError={(e) => {
                  const target = e.currentTarget;
                  const idx = Number(target.getAttribute('data-candidate-idx') || '0');
                  const nextIdx = idx + 1;
                  if (nextIdx < studentPhotoCandidates.length) {
                    target.setAttribute('data-candidate-idx', String(nextIdx));
                    target.src = studentPhotoCandidates[nextIdx];
                  }
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#333' }}>
              <p style={{ margin: '0 0 3px' }}><strong>Name:</strong> {student.firstName} {student.lastName}</p>
              <p style={{ margin: '0 0 3px' }}><strong>Admission No:</strong> {student.admissionNumber}</p>
              <p style={{ margin: '0 0 3px' }}><strong>Class:</strong> {studentClass?.name || student.className}</p>
              <p style={{ margin: '0 0 3px' }}><strong>Gender:</strong> {student.gender}</p>
              <p style={{ margin: 0 }}><strong>Date of Birth:</strong> {formatDate(student.date_of_birth)}</p>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#333', textAlign: 'right' }}>
            <p style={{ margin: '0 0 3px' }}><strong>Session:</strong> {academicYear}</p>
            <p style={{ margin: '0 0 3px' }}><strong>Term:</strong> {term}</p>
            <p style={{ margin: '0 0 3px' }}><strong>No. in Class:</strong> {compiledResult.total_students}</p>
            <p style={{ margin: '0 0 3px' }}><strong>Attendance:</strong> {compiledResult.times_present || 0} / {compiledResult.total_attendance_days || 0} days</p>
            <p style={{ margin: 0 }}><strong>Next Term Begins:</strong> {getNextTermBegin()}</p>
          </div>
        </section>

        {/* Main Result Table */}
        <section style={{ marginBottom: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#4A90E2', color: 'white' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', width: '5%' }}>SN</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Subject</th>
                {!studentClass?.name?.toUpperCase().includes('CRECHE') && (
                  <>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>CA1 (20)</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>CA2 (20)</th>
                  </>
                )}
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Exam ({studentClass?.name?.toUpperCase().includes('CRECHE') ? '100' : '60'})</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Total (100)</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Grade</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {studentScores.map((score, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{index + 1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 500, fontSize: '10px' }}>{score.subject_name || 'UNKNOWN'}</td>
                  {!studentClass?.name?.toUpperCase().includes('CRECHE') && (
                    <>
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{score.ca1 ?? 0}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{score.ca2 ?? 0}</td>
                    </>
                  )}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{score.exam ?? 0}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{score.total || 0}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{score.grade}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{score.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Summary & Comments Section */}
        <section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px' }}>
          <div style={{ width: '65%' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
              <p style={{ margin: '0 0 6px' }}><strong>Class Teacher's Comment:</strong> <span style={{ fontStyle: 'italic' }}>{compiledResult.class_teacher_comment}</span></p>
              <p style={{ margin: 0 }}><strong>{studentClass?.name?.includes('JSS') ? 'Principal' : 'Head Teacher'}'s Comment:</strong> <span style={{ fontStyle: 'italic' }}>{studentClass?.name?.includes('JSS') ? (compiledResult.principal_comment || '') : (compiledResult.principal_comment || '')}</span></p>
            </div>
          </div>
          <div style={{ width: '33%', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 600, color: '#333' }}>Performance Summary</h3>
            <p style={{ margin: '0 0 3px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Total Score:</span> <strong>{totalScore.toFixed(1)}</strong></p>
            <p style={{ margin: '0 0 3px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Student Average:</span> <strong>{studentAverage.toFixed(1)}%</strong></p>
            <p style={{ margin: '0 0 3px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Class Average:</span> <strong>{(compiledResult.class_average || 0).toFixed(1)}%</strong></p>
            {shouldShowPosition && (
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Position in Class:</span> <strong>{formatPositionWithSuffix(compiledResult.position)}</strong></p>
            )}
          </div>
        </section>

        {/* Affective and Psychomotor Section */}
        <section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px' }}>
          {/* Affective */}
          <div style={{ width: '49%' }}>
            <h3 style={{ backgroundColor: '#2c3e50', color: 'white', padding: '6px', borderRadius: '4px 4px 0 0', margin: 0, fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }}>Affective Domain</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #2c3e50', fontSize: '10px' }}>
              <thead><tr style={{ backgroundColor: '#34495e', color: 'white' }}><th style={{ padding: '4px 6px', border: '1px solid #2c3e50', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' }}>Trait</th><th style={{ padding: '4px 6px', border: '1px solid #2c3e50', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>Rating</th><th style={{ padding: '4px 6px', border: '1px solid #2c3e50', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>Remark</th></tr></thead>
              <tbody>
                {affective ? Object.entries(affective).filter(([key]) => !['_remark', 'id', 'student_id', 'class_id', 'term', 'academic_year', 'entered_by', 'entered_date'].some(k => key.includes(k))).map(([key, value], i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8f9fa' : 'white' }}><td style={{ padding: '3px 6px', border: '1px solid #ddd', fontSize: '9px', fontWeight: '500' }}>{getDomainName(key)}</td><td style={{ padding: '3px 6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>{value}</td><td style={{ padding: '3px 6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '9px' }}>{getRatingRemark(Number(value))}</td></tr>
                )) : <tr><td colSpan={3} style={{ padding: '6px', textAlign: 'center', fontSize: '9px', color: '#666' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Psychomotor */}
          <div style={{ width: '49%' }}>
            <h3 style={{ backgroundColor: '#2c3e50', color: 'white', padding: '6px', borderRadius: '4px 4px 0 0', margin: 0, fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }}>Psychomotor Domain</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #2c3e50', fontSize: '10px' }}>
              <thead><tr style={{ backgroundColor: '#34495e', color: 'white' }}><th style={{ padding: '4px 6px', border: '1px solid #2c3e50', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' }}>Skill</th><th style={{ padding: '4px 6px', border: '1px solid #2c3e50', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>Rating</th><th style={{ padding: '4px 6px', border: '1px solid #2c3e50', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>Remark</th></tr></thead>
              <tbody>
                {psychomotor ? Object.entries(psychomotor).filter(([key]) => !['_remark', 'id', 'student_id', 'class_id', 'term', 'academic_year', 'entered_by', 'entered_date'].some(k => key.includes(k))).map(([key, value], i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8f9fa' : 'white' }}><td style={{ padding: '3px 6px', border: '1px solid #ddd', fontSize: '9px', fontWeight: '500' }}>{getDomainName(key)}</td><td style={{ padding: '3px 6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>{value}</td><td style={{ padding: '3px 6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '9px' }}>{getRatingRemark(Number(value))}</td></tr>
                )) : <tr><td colSpan={3} style={{ padding: '6px', textAlign: 'center', fontSize: '9px', color: '#666' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Grading Key and Footer */}
        <footer style={{ marginTop: '16px', fontSize: '10px', color: '#333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '65%' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600 }}>Grading Key</h3>
              <p style={{ margin: '0 0 4px' }}>A: 90-100 (Excellent)</p>
              <p style={{ margin: '0 0 4px' }}>B: 80-89 (Very Good)</p>
              <p style={{ margin: '0 0 4px' }}>C: 70-79 (Good)</p>
              <p style={{ margin: '0 0 4px' }}>D: 60-69 (Satisfactory)</p>
              <p style={{ margin: '0 0 4px' }}>E: 50-59 (Fair)</p>
              <p style={{ margin: 0 }}>F: 0-49 (Fail)</p>
            </div>
            <div style={{ width: '33%', textAlign: 'center' }}>
              <div style={{ marginBottom: '40px' }}>
                <img src={schoolSettings?.principal_signature || ''} alt={`${studentClass?.name?.includes('JSS') ? 'Principal' : 'Head Teacher'}'s Signature`} style={{ height: '40px', margin: '0 auto -10px' }} />
                <p style={{ borderTop: '1px solid #333', paddingTop: '4px', margin: 0 }}>{studentClass?.name?.includes('JSS') ? 'Principal' : 'Head Teacher'}'s Signature</p>
              </div>
              <div>
                <p style={{ borderTop: '1px solid #333', paddingTop: '4px', margin: '0 0 4px' }}><strong>Class Teacher:</strong> {compiledResult.class_teacher_name || '_________________'}</p>
                <p style={{ borderTop: '1px solid #333', paddingTop: '4px', margin: 0 }}>Class Teacher's Signature</p>
              </div>
              {qrCodeDataUrl && (
                <div style={{ marginTop: '8px' }}>
                  <img src={qrCodeDataUrl} alt="QR Code" style={{ width: '64px', height: '64px' }} />
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '2px solid #4A90E2', paddingTop: '8px' }}>
            <p style={{ margin: 0, fontStyle: 'italic' }}>{schoolSettings?.school_motto || ''}</p>
          </div>
        </footer>
          </div>
        </div>
      </>
    );
  }
);

StudentResultSheet.displayName = "StudentResultSheet";
