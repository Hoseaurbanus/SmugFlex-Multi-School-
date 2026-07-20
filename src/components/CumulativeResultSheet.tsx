import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useSchool } from "../contexts/SchoolContext";
import { formatPositionWithSuffix } from "../utils/position";
import { generateQrDataUrl } from "../utils/qrCode";
import { shouldShowPosition as checkShouldShowPosition } from "../utils/classHelpers";

interface CumulativeResultSheetProps {
  studentId: number;
  academicYear: string;
  className?: string;
}

const getGradeFromAverage = (avg: number) => {
  if (avg >= 90) return 'A';
  if (avg >= 80) return 'B';
  if (avg >= 70) return 'C';
  if (avg >= 60) return 'D';
  if (avg >= 50) return 'E';
  return 'F';
};

const getRemarkFromGrade = (grade: string) => {
  const remarks: Record<string, string> = {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Satisfactory',
    E: 'Fair',
    F: 'Fail',
  };
  return remarks[grade] || '';
};

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === '0000-00-00 00:00:00') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
};

export const CumulativeResultSheet = forwardRef<HTMLDivElement, CumulativeResultSheetProps>(
  ({ studentId, academicYear, className = "" }, ref) => {
    const {
      students,
      classes,
      schoolSettings,
      cumulativeResults,
      loadCumulativeResultsFromAPI,
      loadingCumulative,
    } = useSchool();

    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [qrGenerating, setQrGenerating] = useState(false);
    const loadedRef = useRef<string>('');

    const student = useMemo(() => students.find((s: any) => s.id === studentId), [students, studentId]);
    const cumulativeResult = useMemo(
      () => cumulativeResults.find((cr) => cr.student_id === studentId && cr.academic_year === academicYear),
      [cumulativeResults, studentId, academicYear]
    );

    const studentClass = useMemo(
      () => student ? classes.find((c: any) => c.id === student.class_id) : undefined,
      [student, classes]
    );

    const showPosition = checkShouldShowPosition(studentClass?.name);

    // Load cumulative results (once per student/year combo)
    useEffect(() => {
      const key = `${studentId}_${academicYear}`;
      if (student?.class_id && academicYear && loadedRef.current !== key) {
        loadedRef.current = key;
        loadCumulativeResultsFromAPI(student.class_id, academicYear).catch(() => {});
      }
    }, [studentId, academicYear, student?.class_id]);

    // Generate QR code
    useEffect(() => {
      if (cumulativeResult && student) {
        setQrGenerating(true);
        const qrText = [
          `Student: ${student.firstName} ${student.lastName}`,
          `Session: ${academicYear}`,
          `Average: ${cumulativeResult.average_score}%`,
          `Promotion: ${cumulativeResult.promotion_status || 'N/A'}`,
        ].join('\n');
        generateQrDataUrl(qrText, 192).then(url => {
          setQrCodeDataUrl(url);
          setQrGenerating(false);
        }).catch(() => { setQrGenerating(false); });
      }
    }, [cumulativeResult, student, academicYear]);

    if (!student) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Student not found</div>;
    }

    if (loadingCumulative && !cumulativeResult) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #e5e7eb', borderTopColor: '#4A90E2', borderRadius: '50%', animation: 'cr-spin 0.6s linear infinite', marginBottom: '12px' }}></div>
          <style>{`@keyframes cr-spin{to{transform:rotate(360deg)}}`}</style>
          <p>Loading cumulative result...</p>
        </div>
      );
    }

    if (!cumulativeResult) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <p>Cumulative result not yet available for {(student as any).firstName} {(student as any).lastName}.</p>
          <p style={{ fontSize: '12px', color: '#999' }}>Contact the school administration for assistance.</p>
        </div>
      );
    }

    const gradeFromAvg = getGradeFromAverage(cumulativeResult.average_score);
    const remarkFromGrade = getRemarkFromGrade(gradeFromAvg);

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
            
            header, section, footer {
              page-break-inside: avoid !important;
            }
            
            table {
              page-break-inside: avoid !important;
            }
          }
        `}</style>

        <div
          id={`cumulative-result-${studentId}-${academicYear}`}
          ref={ref}
          className={`print-container bg-white ${className}`}
          style={{
            fontFamily: "'Inter', sans-serif",
            width: '210mm',
            height: '297mm',
            margin: '0',
            padding: '8mm',
            fontSize: '11px',
            boxSizing: 'border-box',
            border: '1px solid #000',
          }}
        >
          {/* Watermark */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.05, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
            {schoolSettings?.school_logo_url && (
              <img src={schoolSettings.school_logo_url} alt="" style={{ width: '60%', height: 'auto', objectFit: 'contain' }} />
            )}
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #4A90E2', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '70px', height: '70px', marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                  <img
                    src={schoolSettings?.school_logo_url || '/assets/school-logo.svg'}
                    alt="School Logo"
                    style={{ maxHeight: '70px', maxWidth: '70px', objectFit: 'contain', backgroundColor: 'transparent' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.logo-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'logo-fallback';
                        fallback.style.cssText = 'font-size: 12px; font-weight: bold; color: #333; text-align: center; line-height: 60px;';
                        fallback.textContent = 'SCHOOL LOGO';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#333', fontSize: '24px', fontWeight: 700, margin: 0 }}>{schoolSettings?.school_name || ''}</h1>
                  <p style={{ color: '#555', fontSize: '11px', margin: '2px 0 0', fontStyle: 'italic' }}>{schoolSettings?.school_motto || ''}</p>
                  <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0' }}>{schoolSettings?.school_address || ''}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#333', fontSize: '14px', fontWeight: 600, margin: 0 }}>Cumulative Result - {academicYear} Session</p>
                <p style={{ color: '#555', fontSize: '12px', margin: '4px 0 0' }}>{schoolSettings?.school_email || ''} | {schoolSettings?.school_phone || ''}</p>
              </div>
            </header>

            {/* Student Info Section */}
            <section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: '80px', height: '100px', border: '2px solid #ddd', borderRadius: '8px', overflow: 'hidden', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
                  <img
                    src={(student as any).photo_url || (student as any).photoUrl || (student as any).photoURL || (student as any).passport_photo || (student as any).passportPhoto || ''}
                    alt="Student"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div style="font-size: 10px; color: #999; text-align: center;">No Photo</div>';
                      }
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#333' }}>
                  <p style={{ margin: '0 0 3px' }}><strong>Name:</strong> {(student as any).firstName} {(student as any).lastName}</p>
                  <p style={{ margin: '0 0 3px' }}><strong>Admission No:</strong> {(student as any).admissionNumber}</p>
                  <p style={{ margin: '0 0 3px' }}><strong>Class:</strong> {studentClass?.name || (student as any).className}</p>
                  <p style={{ margin: '0 0 3px' }}><strong>Gender:</strong> {(student as any).gender}</p>
                  <p style={{ margin: 0 }}><strong>Date of Birth:</strong> {formatDate((student as any).date_of_birth)}</p>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#333', textAlign: 'right' }}>
                <p style={{ margin: '0 0 3px' }}><strong>Session:</strong> {academicYear}</p>
                <p style={{ margin: '0 0 3px' }}><strong>No. in Class:</strong> {cumulativeResult.total_students}</p>
                <p style={{ margin: '0 0 3px' }}><strong>Attendance:</strong> {cumulativeResult.session_attendance_pct !== null && cumulativeResult.session_attendance_pct !== undefined ? cumulativeResult.session_attendance_pct.toFixed(1) + '%' : '-'}</p>
                <p style={{ margin: 0 }}><strong>Promotion Status:</strong> <span style={{ color: cumulativeResult.promotion_status === 'Promoted' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{cumulativeResult.promotion_status || 'Pending'}</span></p>
              </div>
            </section>

            {/* Cumulative Subject Table */}
            <section style={{ marginBottom: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4A90E2', color: 'white' }}>
                    <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Subject</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>1st Term</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>2nd Term</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>3rd Term</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Grand Total</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Average</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Grade</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeResult.subject_data && cumulativeResult.subject_data.length > 0 ? (
                    cumulativeResult.subject_data.map((entry, index) => (
                      <tr key={entry.subject_id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                        <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 500, fontSize: '10px' }}>{entry.subject_name}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{entry.first_total || '-'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{entry.second_total || '-'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{entry.third_total || '-'}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{entry.grand_total}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{entry.average.toFixed(1)}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{entry.grade}</td>
                        <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{entry.remark}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '12px', textAlign: 'center', fontSize: '10px', color: '#666' }}>No subject data available</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#e8f0fe', fontWeight: 700 }}>
                    <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 700, fontSize: '10px' }}>TOTAL</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>-</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>-</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>-</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{cumulativeResult.total_score.toFixed(1)}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{cumulativeResult.average_score.toFixed(1)}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700, fontSize: '10px' }}>{gradeFromAvg}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontSize: '10px' }}>{remarkFromGrade}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* Principal's Comment + Performance Summary */}
            <section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px' }}>
              <div style={{ width: '65%' }}>
                <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
                  <p style={{ margin: 0 }}><strong>Principal's Comment:</strong> <span style={{ fontStyle: 'italic' }}>{cumulativeResult.principal_comment || ''}</span></p>
                </div>
              </div>
              <div style={{ width: '33%', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 600, color: '#333' }}>Performance Summary</h3>
                <p style={{ margin: '0 0 3px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Total Score:</span> <strong>{cumulativeResult.total_score.toFixed(1)}</strong></p>
                <p style={{ margin: '0 0 3px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Student Average:</span> <strong>{cumulativeResult.average_score.toFixed(1)}%</strong></p>
                <p style={{ margin: '0 0 3px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Class Average:</span> <strong>{(cumulativeResult.class_average || 0).toFixed(1)}%</strong></p>
                {showPosition ? (
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Position in Class:</span> <strong>{formatPositionWithSuffix(cumulativeResult.position)}</strong></p>
                ) : (
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>Grade:</span> <strong>{gradeFromAvg}</strong></p>
                )}
              </div>
            </section>

            {/* Footer - Grading Key + QR Code */}
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
                <div style={{ width: '33%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {qrGenerating && !qrCodeDataUrl && (
                    <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '20px', height: '20px', border: '2px solid #e5e7eb', borderTopColor: '#4A90E2', borderRadius: '50%', animation: 'cr-qr-spin 0.6s linear infinite' }}></div>
                      <style>{`@keyframes cr-qr-spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                  )}
                  {qrCodeDataUrl && (
                    <div>
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
