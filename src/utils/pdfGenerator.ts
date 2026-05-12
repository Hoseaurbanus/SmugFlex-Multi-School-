// Shared PDF generation utility for both admin and parent dashboards
import { useSchool } from "../contexts/SchoolContext";
import schoolLogo from "../assets/images/school-logo.jpg";
import { API_CONFIG } from "../config/api";
import { formatPositionWithSuffix } from "./position";
import { generateQrDataUrl } from "./qrCode";

type PdfDownloadMethod = 'save' | 'blob';

type GeneratePdfOptions = {
  downloadMethod?: PdfDownloadMethod;
  filenameOverride?: string;
  returnBlob?: boolean;
};

// Grade calculation
const getGrade = (score: number) => {
  if (score >= 90) return { grade: 'A', remark: 'Excellent' };
  if (score >= 80) return { grade: 'B', remark: 'Very Good' };
  if (score >= 70) return { grade: 'C', remark: 'Good' };
  if (score >= 60) return { grade: 'D', remark: 'Satisfactory' };
  if (score >= 50) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
};

const fetchScoresByTerm = async (term: string, academicYear: string): Promise<any[]> => {
  const token = localStorage.getItem('jwt_token');
  const endpoint = `${API_CONFIG.BASE_URL}/results/scores/by-term?term=${encodeURIComponent(String(term))}&academic_year=${encodeURIComponent(String(academicYear))}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const json = await response.json();
  const rows = (json as any)?.data;
  return Array.isArray(rows) ? rows : [];
};

const getSignatureResumptionDate = async (academicYear: string, term: string): Promise<string> => {
  try {
    if (!academicYear || !term) return '';
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
    return String((json as any)?.data?.resumption_date ?? '');
  } catch {
    return '';
  }
};

const getValidNextTermBegin = (nextTermBegin: any): string => {
  const val = String(nextTermBegin ?? '').trim();
  if (!val) return '';
  if (val === '0000-00-00' || val === '0000-00-00 00:00:00') return '';
  return val;
};

// Format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const createCircularPngDataUrl = async (src: string, sizePx: number): Promise<string> => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const s = Math.min(img.width, img.height);
  const sx = (img.width - s) / 2;
  const sy = (img.height - s) / 2;

  ctx.clearRect(0, 0, sizePx, sizePx);
  ctx.beginPath();
  ctx.arc(sizePx / 2, sizePx / 2, sizePx / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  // @ts-ignore
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, s, s, 0, 0, sizePx, sizePx);

  return canvas.toDataURL('image/png');
};

const createCoverPngDataUrl = async (src: string, targetWidthPx: number, targetHeightPx: number): Promise<string> => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetWidthPx;
  canvas.height = targetHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const srcAspect = srcW / srcH;
  const targetAspect = targetWidthPx / targetHeightPx;

  let sx = 0;
  let sy = 0;
  let sWidth = srcW;
  let sHeight = srcH;

  if (srcAspect > targetAspect) {
    sHeight = srcH;
    sWidth = Math.round(srcH * targetAspect);
    sx = Math.round((srcW - sWidth) / 2);
  } else {
    sWidth = srcW;
    sHeight = Math.round(srcW / targetAspect);
    sy = Math.round((srcH - sHeight) / 2);
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidthPx, targetHeightPx);
  return canvas.toDataURL('image/png');
};

// Get affective domain remark - Enhanced to handle missing data
const getAffectiveRemark = (score: any) => {
  if (score === 'N/A' || score === null || score === undefined || score === '') {
    return 'Not Assessed';
  }
  const numScore = parseInt(score);
  if (isNaN(numScore)) return 'Not Assessed';
  if (numScore >= 5) return 'Excellent';
  if (numScore >= 4) return 'Very Good';
  if (numScore >= 3) return 'Good';
  if (numScore >= 2) return 'Fair';
  return 'Needs Improvement';
};

// Get domain name
const getDomainName = (key: string) => {
  const names: { [key: string]: string } = {
    'attentiveness': 'Attentiveness',
    'honesty': 'Honesty',
    'neatness': 'Neatness',
    'obedience': 'Obedience',
    'sense_of_responsibility': 'Sense of Responsibility',
    'sports': 'Sports',
    'handwriting': 'Handwriting',
    'fluency': 'Fluency',
    'creativity': 'Creativity',
    'handling_tools': 'Handling Tools'
  };
  return names[key] || key;
};

// Main PDF generation function with comprehensive validation
export const generatePDFFromData = async (student: any, result: any, context: any, options?: GeneratePdfOptions) => {
  const { schoolSettings, teachers, classes, affectiveDomains, psychomotorDomains } = context;

  const signatureResumptionDate = await getSignatureResumptionDate(
    String(result?.academic_year || ''),
    String(result?.term || '')
  );
  
  //console.log('=== PDF GENERATION - ALL DATA MODE (NO VALIDATION) ===');
  
  
  
  
  
  
  // MINIMAL VALIDATION - Only check for absolutely required data
  if (!student || !student.id) {
    throw new Error('Student data is required for PDF generation');
  }
  
  if (!result || !result.id) {
    throw new Error('Result data is required for PDF generation');
  }
  
  
  
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false
  });

  

  // Exact page dimensions from StudentResultSheet
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 6; // tighter margin to help single-page fit
  const contentWidth = pageWidth - (margin * 2);
  
  let currentY = margin;

  // Helper functions matching StudentResultSheet exactly
  const addText = (text: string, x: number, y: number, fontSize: number, fontWeight: string = 'normal', align: string = 'left') => {
    // Enhanced text rendering for better visibility
    pdf.setFontSize(fontSize);
    if (fontWeight === 'bold') {
      pdf.setFont('times', 'bold'); // Professional Times font for bold text
    } else if (fontWeight === 'italic') {
      pdf.setFont('helvetica', 'italic');
    } else {
      pdf.setFont('times', 'normal'); // Professional Times font for normal text
    }
    
    pdf.setTextColor(0, 0, 0); // Ensure black text
    
    if (align === 'center') {
      pdf.text(text, x, y, { align: 'center' });
    } else {
      pdf.text(text, x, y);
    }
    
    return y + (fontSize * 0.35); // Line height based on font size
  };

  // Ensure arrays are safe before using .find()
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeAffectiveDomains = Array.isArray(affectiveDomains) ? affectiveDomains : [];
  const safePsychomotorDomains = Array.isArray(psychomotorDomains) ? psychomotorDomains : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const safeStudents = Array.isArray((context as any)?.students) ? (context as any).students : [];

  const resolvedClassId =
    (result as any)?.class_id ??
    (result as any)?.classId ??
    (student as any)?.class_id ??
    (student as any)?.classId;

  const studentClassData = safeClasses.find((c: any) => String(c.id) === String(resolvedClassId));

  const totalStudentsInClass = (() => {
    const fromResult =
      (result as any)?.total_students ??
      (result as any)?.totalStudents ??
      (student as any)?.total_students ??
      (student as any)?.totalStudents;
    const numericFromResult = Number(fromResult);
    if (Number.isFinite(numericFromResult) && numericFromResult > 0) {
      return numericFromResult;
    }

    if (!resolvedClassId && resolvedClassId !== 0) {
      return 0;
    }

    if (safeStudents.length === 0) {
      return 0;
    }

    return safeStudents.filter((s: any) => {
      const sClassId = (s as any)?.class_id ?? (s as any)?.classId;
      if (Number(sClassId) !== Number(resolvedClassId)) return false;
      const status = String((s as any)?.status || '').toLowerCase();
      if (status === 'inactive') return false;
      return true;
    }).length;
  })();
  
  // Get student's affective domain data - same as admin ResultsManagementPage
  const getStudentAffectiveData = () => {
    if (!result || !result.student_id || !safeAffectiveDomains || safeAffectiveDomains.length === 0) return {} as any;
    
    const studentAffective = safeAffectiveDomains.find((domain: any) =>
      String(domain.student_id) === String(result.student_id) &&
      String(domain.academic_year) === String(result.academic_year) &&
      String(domain.term) === String(result.term)
    );
    
    return studentAffective || {} as any;
  };

  // Get student's psychomotor domain data - same as admin ResultsManagementPage
  const getStudentPsychomotorData = () => {
    if (!result || !result.student_id || !safePsychomotorDomains || safePsychomotorDomains.length === 0) return {} as any;
    
    const studentPsychomotor = safePsychomotorDomains.find((domain: any) =>
      String(domain.student_id) === String(result.student_id) &&
      String(domain.academic_year) === String(result.academic_year) &&
      String(domain.term) === String(result.term)
    );
    
    return studentPsychomotor || {} as any;
  };

  const resolveDomainScore = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    const s = String(val).trim();
    return s === '' ? 'N/A' : s;
  };

  // EXACT same domain name mapping as admin ResultsManagementPage
  const getDomainName = (key: string): string => {
    const affectiveMappings: Record<string, string> = {
      'attentiveness': 'Attentiveness',
      'honesty': 'Honesty',
      'neatness': 'Neatness',
      'obedience': 'Obedience',
      'punctuality': 'Punctuality',
      'sense_of_responsibility': 'Sense of Responsibility'
    };

    const psychomotorMappings: Record<string, string> = {
      'attention_to_direction': 'Attention to Direction',
      'considerate_of_others': 'Considerate of Others',
      'handwriting': 'Handwriting',
      'sports': 'Sports',
      'handwork': 'Handwork',
      'drawing': 'Drawing',
      'music': 'Music',
      'verbal_fluency': 'Verbal Fluency',
      'works_well_independently': 'Works Well Independently'
    };

    return affectiveMappings[key] || psychomotorMappings[key] || key.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
  };
  
  // Check if class should show position
  const shouldShowPosition = studentClassData?.name && 
    !['CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)', 'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)', 'KG 2 (PEARL)'].includes(studentClassData.name.toUpperCase());

  const getImageFormat = (src: string): 'PNG' | 'JPEG' => {
    const s = String(src || '').toLowerCase();
    if (s.startsWith('data:image/jpeg') || s.startsWith('data:image/jpg') || s.endsWith('.jpg') || s.endsWith('.jpeg')) {
      return 'JPEG';
    }
    return 'PNG';
  };

  // Initialize with empty arrays to handle missing data gracefully
  let detailedScoresData: any[] = [];
  
  // SCORES DATA - Handle missing data gracefully
  
  
  
  
  
  
  // Try to get scores from multiple sources with fallbacks
  if (result?.scores && Array.isArray(result.scores) && result.scores.length > 0) {
    
    detailedScoresData = result.scores.map((score: any) => ({
      ...score,
      subject_name: score.subject_name || 'Unknown Subject',
      subject_teacher: score.subject_teacher || 'Not Assigned',
      class_average: score.class_average || 0,
      class_minimum: score.class_minimum || 0,
      class_maximum: score.class_maximum || 0,
      first_ca: score.first_ca || score.ca1 || 0,
      second_ca: score.second_ca || score.ca2 || 0,
      exams: score.exams || score.exam || 0,
      total: score.total || 0
    })).sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
  } else if (context.scores && Array.isArray(context.scores) && context.scores.length > 0) {
    
    let studentScores = context.scores.filter((score: any) => 
      score.student_id === result.student_id &&
      score.academic_year === result.academic_year &&
      score.term === result.term
    );
    detailedScoresData = studentScores;
  } else {
    // As a final fallback (common for parent dashboard), fetch just this term/year score rows
    // and filter to the student. This avoids needing to pre-load all scores into context.
    try {
      const term = String(result?.term || '').trim();
      const year = String(result?.academic_year || '').trim();
      if (term && year) {
        const rows = await fetchScoresByTerm(term, year);
        detailedScoresData = rows
          .filter((r: any) => Number(r?.student_id) === Number(result?.student_id))
          .map((score: any) => ({
            ...score,
            subject_name: score.subject_name || 'Unknown Subject',
            subject_teacher: score.teacher_name || score.subject_teacher || 'Not Assigned',
            class_average: score.class_average || 0,
            class_minimum: score.class_minimum || 0,
            class_maximum: score.class_maximum || 0,
            first_ca: score.first_ca ?? score.ca1 ?? 0,
            second_ca: score.second_ca ?? score.ca2 ?? 0,
            exams: score.exams ?? score.exam ?? 0,
            total: score.total ?? 0,
          }))
          .sort((a: any, b: any) => String(a.subject_name).localeCompare(String(b.subject_name)));
      } else {
        detailedScoresData = [];
      }
    } catch {
      detailedScoresData = [];
    }
  }

  
  //console.log('Final detailedScoresData sample:', detailedScoresData.slice(0, 2));

  // === PAGE BACKGROUND (Exact StudentResultCard: background: white) ===
  // Pure white background to match StudentResultCard exactly
  pdf.setFillColor(255, 255, 255); // Pure white (#ffffff) - exact match to StudentResultCard
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Reset to white for content areas
  pdf.setFillColor(255, 255, 255);

  // === HEADER SECTION (Exact StudentResultCard structure - what you see in view button) ===
  
  
  // Header container - exact StudentResultCard: centered layout
  const headerY = currentY;
  
  // CENTERED LOGO (exact StudentResultCard: 18mm x 18mm, circular)
  const logoSize = 18; // 18mm as in StudentResultCard
  const logoX = pageWidth / 2 - (logoSize / 2); // Centered
  
  // Try to load logo using the same crisp circular rendering as admin PDF
  let logoLoaded = false;
  const logoSrc = schoolLogo;
  if (logoSrc) {
    try {
      const circularLogo = await createCircularPngDataUrl(String(logoSrc), 256);
      pdf.addImage(circularLogo, 'PNG', logoX, headerY, logoSize, logoSize);
      logoLoaded = true;
    } catch (error) {
      logoLoaded = false;
    }
  }

  // Border ring (same styling as admin)
  pdf.setDrawColor(44, 60, 80); // #2c3e50
  pdf.setLineWidth(0.7);
  pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'S');
  pdf.setLineWidth(1);

  // If logo failed to load, show text fallback
  if (!logoLoaded) {
    // Logo container with circular styling - exact StudentResultCard
    pdf.setFillColor(255, 255, 255); // White background
    pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'F'); // Filled circle
    pdf.setDrawColor(44, 60, 80); // #2c3e50 border
    pdf.setLineWidth(0.5); // 2px border = 0.5mm
    pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'S'); // Circle border
    pdf.setLineWidth(1); // Reset to default
    
    // Add LOGO text
    pdf.setTextColor(44, 60, 80);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LOGO', pageWidth / 2, headerY + (logoSize / 2) + 2, { align: 'center' });
  }
  
  // CENTERED SCHOOL NAME (enhanced visibility and fit) - with strong fallback
  let currentTextY = headerY + logoSize + 5; // Increased spacing from 2mm to 5mm for better separation
  pdf.setTextColor(26, 37, 47); // Darker professional color instead of #2c3e50
  pdf.setFontSize(18); // Increased to 18pt for better prominence
  pdf.setFont('times', 'bold'); // Professional Times font instead of helvetica
  // Use multiple fallbacks to ensure school name always shows
  const fallbackSchoolName = 'YOUR SCHOOL NAME';
  const schoolName = (schoolSettings?.school_name || 
                      (window as any).schoolSettings?.school_name || 
                      fallbackSchoolName).toUpperCase();
  // Reduced letter spacing for better fit
  const spacedSchoolName = schoolName.split('').join(' ');
  addText(spacedSchoolName, pageWidth / 2, currentTextY, 18, 'bold', 'center');
  
  // CENTERED SCHOOL ADDRESS (enhanced visibility)
  currentTextY += 5; // Increased from 3mm to 5mm for better spacing
  pdf.setTextColor(85, 85, 85); // #555
  pdf.setFontSize(9); // Increased from 8pt to 9pt for better readability
  pdf.setFont('helvetica', 'italic');
  addText((schoolSettings?.school_address || (window as any).schoolSettings?.school_address || 'SCHOOL ADDRESS'), pageWidth / 2, currentTextY, 9, 'italic', 'center');
  
  // CENTERED SCHOOL EMAIL (enhanced visibility)
  currentTextY += 5; // Increased from 3mm to 5mm for better spacing
  pdf.setFont('helvetica', 'normal');
  addText(schoolSettings?.school_email || 'school@email.com', pageWidth / 2, currentTextY, 9, 'normal', 'center');

  // CENTERED SCHOOL PHONE
  currentTextY += 5;
  addText(
    schoolSettings?.school_phone || (window as any).schoolSettings?.school_phone || '',
    pageWidth / 2,
    currentTextY,
    9,
    'normal',
    'center'
  );
  
  // CENTERED DIVIDER LINE (exact StudentResultCard: marginTop: 1mm, width: 80%, margin: 1mm auto 0)
  currentTextY += 3; // Spacing below phone
  pdf.setDrawColor(44, 60, 80); // #2c3e50
  pdf.setLineWidth(0.7); // 2px = 0.7mm
  const dividerWidth = pageWidth * 0.8; // 80% width
  const dividerX = (pageWidth - dividerWidth) / 2; // Centered
  pdf.line(dividerX, currentTextY, dividerX + dividerWidth, currentTextY);
  pdf.setLineWidth(1); // Reset to default
  
  currentY = currentTextY + 8; // Header marginBottom: increased from 3mm to 8mm for better separation

  // === STUDENT INFORMATION SECTION (Exact StudentResultCard copy) ===
  
  
  // Student info section container (exact StudentResultCard: marginBottom: 2mm, gap: 1mm, centered)
  const studentInfoY = currentY;
  const studentInfoTableWidth = contentWidth * 0.75; // 75% width
  const studentPhotoWidth = 25; // mm
  const studentPhotoHeight = 30; // mm
  const sectionGap = 1; // 1mm gap between table and photo
  const totalWidth = studentInfoTableWidth + sectionGap + studentPhotoWidth;
  const startX = (pageWidth - totalWidth) / 2; // Center the entire section
  
  // Student info table - exact StudentResultCard styling
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(startX, studentInfoY, studentInfoTableWidth, 20, 'F'); // tighter to help single-page fit
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.setLineWidth(0.7); // 2px border = 0.7mm
  pdf.rect(startX, studentInfoY, studentInfoTableWidth, 20);
  pdf.setLineWidth(1); // Reset to default
  
  // Student info table content - Better organized layout
  const resolvedStudentName = student
    ? String(
        (student as any).fullName ||
          [(student as any).firstName, (student as any).otherName, (student as any).lastName]
            .filter((p: any) => String(p || '').trim() !== '')
            .join(' ')
      ).trim()
    : '';

  const tableData = [
    [
      // Row 1: 4 cells - Name, Name value, Session, Session value
      { type: 'label', text: 'Name:', width: 0.15 },
      { type: 'value', text: resolvedStudentName ? resolvedStudentName.toUpperCase() : 'STUDENT NAME', width: 0.35 },
      { type: 'label', text: 'Session:', width: 0.15 },
      { type: 'value', text: result.academic_year || '2024/2025', width: 0.35 }
    ],
    [
      // Row 2: 4 cells - Admission No, Admission No value, Term, Term value
      { type: 'label', text: 'Admission No:', width: 0.15 },
      { type: 'value', text: student?.admissionNumber || 'GRA/XXXXX', width: 0.35 },
      { type: 'label', text: 'Term:', width: 0.15 },
      { type: 'value', text: result.term || '', width: 0.35 }
    ],
    [
      // Row 3: 4 cells - Class, Class value, Gender, Gender value
      { type: 'label', text: 'Class:', width: 0.15 },
      { type: 'value', text: studentClassData?.name || 'CLASS NAME', width: 0.35 },
      { type: 'label', text: 'Gender:', width: 0.15 },
      { type: 'value', text: student?.gender || 'MALE', width: 0.35 }
    ],
    [
      // Row 4: 4 cells - Attendance, Attendance value, Position (if regular class), Position value
      { type: 'label', text: 'Attendance:', width: 0.15 },
      { type: 'value', text: `${result.times_present || 0} / ${result.total_attendance_days || 0} days`, width: 0.35 },
      { type: 'label', text: 'Total in Class:', width: 0.15 },
      { type: 'value', text: String(totalStudentsInClass || 0), width: 0.35 }
    ],
    [
      // Row 5: Next Term Begins (separate cells for label and value)
      { type: 'label', text: 'Next Term Begins:', width: 0.2 },
      { type: 'value', text: signatureResumptionDate || getValidNextTermBegin((result as any)?.next_term_begin) || '', width: 0.8 }
    ]
  ];
  
  let studentInfoTableY = studentInfoY;
  tableData.forEach((row, rowIndex) => {
    const rowHeight = 4.0; // tighter rows
    let cellX = startX;
    
    row.forEach((cell, cellIndex) => {
      // Skip empty cells
      if (!cell.text || cell.width === 0) {
        cellX += studentInfoTableWidth * cell.width;
        return;
      }
      
      // Calculate cell width based on predefined percentages
      const cellWidth = studentInfoTableWidth * cell.width;
      
      // Draw cell border
      pdf.setDrawColor(44, 60, 80);
      pdf.setLineWidth(0.3);
      pdf.rect(cellX, studentInfoTableY, cellWidth, rowHeight);
      pdf.setLineWidth(1);
      
      // Add text based on cell type with enhanced visibility
      if (cell.type === 'label') {
        pdf.setTextColor(44, 60, 80);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(cell.text, cellX + 1, studentInfoTableY + 3); // 1mm padding
      } else {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(cell.text, cellX + 1, studentInfoTableY + 3); // 1mm padding
      }
      
      cellX += cellWidth;
    });
    
    studentInfoTableY += rowHeight;
  });

  // Student photo frame (portrait) - match Results Management PDF + StudentResultCard
  const photoX = startX + studentInfoTableWidth + sectionGap;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.35);
  pdf.rect(photoX, studentInfoY, studentPhotoWidth, studentPhotoHeight);
  pdf.setLineWidth(1);

  const rawPhotoUrl =
    (student as any)?.photo_url ||
    (student as any)?.photoUrl ||
    (student as any)?.photoURL ||
    '';

  const buildPhotoCandidates = (): string[] => {
    if (!rawPhotoUrl || typeof rawPhotoUrl !== 'string') return [];
    const trimmed = rawPhotoUrl.trim();
    if (!trimmed) return [];

    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
      return [trimmed];
    }

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    let apiOrigin = '';
    try {
      apiOrigin = API_CONFIG?.BASE_URL ? new URL(API_CONFIG.BASE_URL).origin : '';
    } catch {
      apiOrigin = '';
    }
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

    const candidates = [
      appOrigin ? `${appOrigin}${normalizedPath}` : '',
      apiOrigin ? `${apiOrigin}${normalizedPath}` : '',
      trimmed,
    ].filter(Boolean);

    return Array.from(new Set(candidates));
  };

  const photoCandidates = buildPhotoCandidates();
  let photoEmbedded = false;

  if (photoCandidates.length > 0) {
    for (const candidate of photoCandidates) {
      try {
        const embeddedPhoto = await createCoverPngDataUrl(String(candidate), 500, 600);
        pdf.addImage(embeddedPhoto, 'PNG', photoX, studentInfoY, studentPhotoWidth, studentPhotoHeight);
        photoEmbedded = true;
        break;
      } catch {
        // try next candidate
      }
    }
  }

  if (!photoEmbedded) {
    pdf.setFillColor(245, 245, 245);
    pdf.rect(photoX, studentInfoY, studentPhotoWidth, studentPhotoHeight, 'F');
    pdf.setTextColor(102, 102, 102);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('No Photo', photoX + studentPhotoWidth / 2, studentInfoY + (studentPhotoHeight / 2), { align: 'center' });
  }

  currentY = studentInfoY + 23; // Space below student info table

  // Result title (match view result): "<TERM> RESULT SHEET" centered + underlined
  const termTitle = `${String(result?.term || '').toUpperCase()} RESULT SHEET`;
  pdf.setTextColor(44, 60, 80);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const termTitleY = currentY + 5;
  pdf.text(termTitle, pageWidth / 2, termTitleY, { align: 'center' });
  const termTitleWidth = pdf.getTextWidth(termTitle);
  pdf.setLineWidth(0.4);
  pdf.setDrawColor(44, 60, 80);
  pdf.line((pageWidth - termTitleWidth) / 2, termTitleY + 1.2, (pageWidth + termTitleWidth) / 2, termTitleY + 1.2);
  pdf.setLineWidth(1);
  currentY += 8;

  // === RESULT TABLE (Exact StudentResultCard copy) ===
  
  
  const resultTableY = currentY;
  const tableWidth = contentWidth * 0.95; // 95% width
  const tableX = (pageWidth - tableWidth) / 2; // Centered
  
  // Table headers - balanced proportions for proper table fit
  const headers = ['SN', 'SUBJECT', '1st CA', '2nd CA', 'Exams', 'Total', 'Grd', 'Remark'];
  const headerWidths = [0.05, 0.30, 0.10, 0.10, 0.10, 0.10, 0.10, 0.15]; // Balanced: Total = 100%
  
  // Draw header background
  pdf.setFillColor(44, 60, 80); // #2c3e50 background
  pdf.rect(tableX, resultTableY, tableWidth, 6, 'F');
  
  // Draw header borders and text
  let headerX = tableX;
  headers.forEach((header, index) => {
    const cellWidth = tableWidth * headerWidths[index];
    
    // Cell border - match StudentResultCard thickness
    pdf.setDrawColor(44, 60, 80);
    pdf.setLineWidth(0.5); // Match StudentResultCard border thickness
    pdf.rect(headerX, resultTableY, cellWidth, 6);
    pdf.setLineWidth(1); // Reset to default
    
    // Header text - enhanced visibility
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(7); // tighter
    pdf.setFont('helvetica', 'bold');
    
    // Center header text like data cells
    if (index === 0 || index >= 2) { // Center align SN, CA, Exams, Total, Grade, Remark
      pdf.text(header, headerX + cellWidth / 2, resultTableY + 4.2, { align: 'center' });
    } else { // Left align Subject with proper padding for larger cell
      pdf.text(header, headerX + 2, resultTableY + 4.2); // Match data cell padding
    }
    
    headerX += cellWidth;
  });
  
  // Draw table rows
  let rowY = resultTableY + 6;
  const scoresList = detailedScoresData; // Use exact same data as StudentResultCard
  
    
  if (scoresList.length > 0) {
    const defaultRowHeight = 4.2;
    const minRowHeight = 3.6;
    // Reserve space for sections after the scores table without referencing domain arrays
    // (those are declared later in the function).
    // Conservative estimate:
    // - summary + spacing
    // - signature section
    // - domains block (max rows among affective(5) and psychomotor(6) => 6 rows)
    // - QR + bottom margin
    const maxDomainRowsEstimate = 6;
    const reservedDomainsEstimate = 7 + (maxDomainRowsEstimate * 5.0) + 22;
    const reservedAfterTable = 8 + 10 + 38 + reservedDomainsEstimate + margin;
    const availableForRows = Math.max(0, pageHeight - reservedAfterTable - rowY);
    const computedRowHeight = scoresList.length > 0
      ? Math.max(minRowHeight, Math.min(defaultRowHeight, availableForRows / scoresList.length))
      : defaultRowHeight;

    scoresList.forEach((score: any, index: number) => {
      const rowHeight = computedRowHeight;
      
      const gradeInfo = getGrade(score.total || 0);
      const rowData = [
        (index + 1).toString(),
        score.subject_name || 'Subject',
        String(score.first_ca ?? score.ca1 ?? 0),
        String(score.second_ca ?? score.ca2 ?? 0),
        String(score.exams ?? score.exam ?? 0),
        (score.total || 0).toString(),
        gradeInfo.grade,
        gradeInfo.remark
      ];
      
      let cellX = tableX;
      rowData.forEach((cellData, cellIndex) => {
        const cellWidth = tableWidth * headerWidths[cellIndex];
        
        // Cell background to overlay watermark
        pdf.setFillColor(255, 255, 255); // White background to hide watermark
        pdf.rect(cellX, rowY, cellWidth, rowHeight, 'F'); // Fill background
        
        // Cell border - match StudentResultCard thickness
        pdf.setDrawColor(44, 60, 80);
        pdf.setLineWidth(0.5); // Match StudentResultCard border thickness
        pdf.rect(cellX, rowY, cellWidth, rowHeight); // Draw border
        pdf.setLineWidth(1); // Reset to default
        
        // Cell text with enhanced visibility
        pdf.setTextColor(0, 0, 0);
        if (cellIndex === 7) { // Remark column - 5pt (increased from 4pt)
          pdf.setFontSize(4.5); // tighter
        } else {
          pdf.setFontSize(7); // tighter
        }
        if (cellIndex === 5 || cellIndex === 6) { // Total and Grade columns - bold
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        // Text alignment and positioning
        const textY = rowY + (rowHeight * 0.72);
        if (cellIndex === 0) { // S/N column - center
          pdf.text(cellData, cellX + cellWidth / 2, textY, { align: 'center' });
        } else if (cellIndex === 5 || cellIndex === 6) { // Total and Grade columns - center
          pdf.text(cellData, cellX + cellWidth / 2, textY, { align: 'center' });
        } else if (cellIndex === 7) { // Remark column - left with padding
          pdf.text(cellData, cellX + 2, textY);
        } else { // Other columns - center
          pdf.text(cellData, cellX + cellWidth / 2, textY, { align: 'center' });
        }
        
        cellX += cellWidth;
      });
      
      rowY += rowHeight + 0.3;
    });
  }

  currentY = rowY + 6; // Space below result table

  // === SCORE SUMMARY (Exact StudentResultCard copy) ===
  
  
  const summaryY = currentY;
  const summaryWidth = contentWidth * 0.95; // 95% width
  const summaryX = (pageWidth - summaryWidth) / 2; // Centered
  
  // Summary table - exact StudentResultCard styling
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(summaryX, summaryY, summaryWidth, 8, 'F'); // 8mm height
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.setLineWidth(0.7); // 2px border
  pdf.rect(summaryX, summaryY, summaryWidth, 8);
  pdf.setLineWidth(1); // Reset to default
  
  // Summary data - using exact StudentResultCard data and position formatting
  const summaryData = shouldShowPosition ? [
    `TOTAL: ${result?.total_score || '0.00'}`,
    `AVG: ${result?.average_score || '0.00'}`,
    `CLASS AVG: ${result?.class_average || '0.00'}`,
    `POS: ${formatPositionWithSuffix(result?.position)}`
  ] : [
    `TOTAL: ${result?.total_score || '0.00'}`,
    `AVG: ${result?.average_score || '0.00'}`,
    `CLASS AVG: ${result?.class_average || '0.00'}`,
    `GRADE: ${getGrade(Number(result?.average_score || 0)).grade}`
  ];
  
  // Draw summary text
  pdf.setTextColor(44, 60, 80); // #2c3e50
  pdf.setFontSize(6.5); // tighter
  pdf.setFont('helvetica', 'bold');
  
  const summarySpacing = summaryWidth / summaryData.length;
  summaryData.forEach((text, index) => {
    const textX = summaryX + (summarySpacing * index) + (summarySpacing / 2);
    pdf.text(text, textX, summaryY + 5, { align: 'center' });
  });

  currentY = summaryY + 10; // Space below summary

  // === SIGNATURE SECTION (Exact StudentResultCard copy) ===
  
  
  const signatureY = currentY;
  const signatureGap = 10; // 10mm gap between signatures
  const signatureLeftX = tableX;
  const signatureWidth = (tableWidth - signatureGap) / 2;
  const signatureRightX = signatureLeftX + signatureWidth + signatureGap;
  
  // Class Teacher Section - Left Side
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(signatureLeftX, signatureY, signatureWidth, 24, 'F');
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.rect(signatureLeftX, signatureY, signatureWidth, 24);
  
  // Class Teacher content with proper spacing to prevent overlap
  pdf.setTextColor(44, 60, 80); // #2c3e50
  pdf.setFontSize(6.5); // tighter
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLASS TEACHER', signatureLeftX + 2, signatureY + 4); // Increased from 3 to 4
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  // Exact StudentResultCard teacher name logic
  const getClassTeacherName = () => {
    if (studentClassData?.classTeacherId) {
      const classTeacher = safeTeachers.find((t: any) => t.id === studentClassData.classTeacherId);
      if (classTeacher) {
        return `${classTeacher.firstName} ${classTeacher.lastName}`;
      }
    }
    
    // Fallback to result data
    if (result?.class_teacher_name) {
      return result.class_teacher_name;
    }
    
    return '_________________';
  };
  
  pdf.text(`Name: ${getClassTeacherName()}`, signatureLeftX + 2, signatureY + 9); // Increased from 7 to 9
  
  // Class teacher comment (exact StudentResultCard logic)
  const comment = result?.class_teacher_comment || 'Class teacher comment will appear here.';
  pdf.setFont('times', 'normal'); // Professional Times font for comments
  pdf.setFontSize(7); // tighter
  pdf.text(`Comment: ${comment}`, signatureLeftX + 2, signatureY + 14); // Increased from 11 to 14
  
  // Principal/Head Teacher Section - Right Side
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(signatureRightX, signatureY, signatureWidth, 24, 'F');
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.rect(signatureRightX, signatureY, signatureWidth, 24);
  
  // Principal/Head Teacher content with proper spacing to prevent overlap
  const classTextForSection = String(
    (studentClassData as any)?.level ||
      (studentClassData as any)?.section ||
      (studentClassData as any)?.name ||
      ''
  ).toLowerCase();

  const isSecondarySection =
    (studentClassData as any)?.category === 'Secondary' ||
    classTextForSection.includes('jss') ||
    classTextForSection.includes('ss');

  const signatureTitle = isSecondarySection ? 'PRINCIPAL' : 'HEAD TEACHER';
  pdf.setTextColor(44, 60, 80); // #2c3e50
  pdf.setFontSize(6.5); // tighter
  pdf.setFont('helvetica', 'bold');
  pdf.text(signatureTitle, signatureRightX + 2, signatureY + 4); // Increased from 3 to 4
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  const teacherName = isSecondarySection
    ? ((schoolSettings as any)?.principal_name || '_________________')
    : ((schoolSettings as any)?.head_teacher_name || '_________________');
  pdf.text(`Name: ${teacherName}`, signatureRightX + 2, signatureY + 9); // Increased from 7 to 9
  
  const principalComment = isSecondarySection
    ? ((schoolSettings as any)?.principal_comment || 'Principal comment will appear here.')
    : ((schoolSettings as any)?.head_teacher_comment || 'Head teacher comment will appear here.');
  pdf.setFont('times', 'normal'); // Professional Times font for comments
  pdf.setFontSize(7); // tighter
  pdf.text(`Comment: ${principalComment}`, signatureRightX + 2, signatureY + 14); // Increased from 11 to 14

  // Signature image (prefer School Settings)
  const settingsSignature = isSecondarySection
    ? (schoolSettings as any)?.principal_signature
    : (schoolSettings as any)?.head_teacher_signature;

  if (settingsSignature) {
    try {
      pdf.addImage(settingsSignature, getImageFormat(settingsSignature), signatureRightX + 2, signatureY + 17, signatureWidth - 4, 5);
    } catch (error) {
      
    }
  }

  currentY = signatureY + 38; // tighter spacing

  // === AFFECTIVE AND PSYCHOMOTOR DOMAINS (Exact StudentResultCard copy) ===
  // Domain data rows - include all keys and ensure table height fits all rows
  const affectiveDataObj = getStudentAffectiveData();
  const affectiveData = [
    { quality: getDomainName('attentiveness'), score: resolveDomainScore(affectiveDataObj.attentiveness ?? result?.affective?.attentiveness) },
    { quality: getDomainName('honesty'), score: resolveDomainScore(affectiveDataObj.honesty ?? result?.affective?.honesty) },
    { quality: getDomainName('neatness'), score: resolveDomainScore(affectiveDataObj.neatness ?? result?.affective?.neatness) },
    { quality: getDomainName('obedience'), score: resolveDomainScore(affectiveDataObj.obedience ?? result?.affective?.obedience) },
    { quality: getDomainName('sense_of_responsibility'), score: resolveDomainScore(affectiveDataObj.sense_of_responsibility ?? result?.affective?.sense_of_responsibility) }
  ];

  const psychomotorDataObj = getStudentPsychomotorData();
  const psychomotorData = [
    { skill: getDomainName('attention_to_direction'), score: resolveDomainScore(psychomotorDataObj.attention_to_direction ?? result?.psychomotor?.attention_to_direction) },
    { skill: getDomainName('considerate_of_others'), score: resolveDomainScore(psychomotorDataObj.considerate_of_others ?? result?.psychomotor?.considerate_of_others) },
    { skill: getDomainName('handwriting'), score: resolveDomainScore(psychomotorDataObj.handwriting ?? result?.psychomotor?.handwriting) },
    { skill: getDomainName('sports'), score: resolveDomainScore(psychomotorDataObj.sports ?? result?.psychomotor?.sports) },
    { skill: getDomainName('verbal_fluency'), score: resolveDomainScore(psychomotorDataObj.verbal_fluency ?? result?.psychomotor?.verbal_fluency) },
    { skill: getDomainName('works_well_independently'), score: resolveDomainScore(psychomotorDataObj.works_well_independently ?? result?.psychomotor?.works_well_independently) }
  ];

  const affectiveRowHeight = 5.0;
  const domainsHeaderHeight = 7;
  const maxDomainRows = Math.max(affectiveData.length, psychomotorData.length);
  const affectiveTableHeight = domainsHeaderHeight + (maxDomainRows * affectiveRowHeight);

  // QR size (slightly reduced to fit reliably below domains on a single page)
  const qrSize = 16; // mm

  const domainsY = currentY;
  const domainGap = 2; // 2mm gap
  const affectiveX = tableX;
  const domainWidth = (tableWidth - domainGap) / 2;
  const psychomotorX = affectiveX + domainWidth + domainGap;

  // Affective Domains - exact StudentResultCard structure
  // Affective title (enhanced visibility with standard font)
  pdf.setTextColor(26, 37, 47); // Dark professional color
  pdf.setFontSize(11); // tighter
  pdf.setFont('times', 'bold'); // Professional Times font instead of helvetica
  const spacedAffectiveTitle = 'AFFECTIVE'.split('').join(' ');
  pdf.text(spacedAffectiveTitle, affectiveX + (domainWidth / 2), domainsY, { align: 'center' });

  // Underline for title
  const affectiveTitleWidth = pdf.getTextWidth(spacedAffectiveTitle);
  pdf.setDrawColor(44, 60, 80);
  pdf.setLineWidth(0.5);
  pdf.line(affectiveX + (domainWidth - affectiveTitleWidth) / 2, domainsY + 2, affectiveX + (domainWidth + affectiveTitleWidth) / 2, domainsY + 2);

  // Affective table background and border (exact StudentResultCard styling)
  const affectiveTableY = domainsY + 3;

  // Affective table background
  pdf.setFillColor(255, 255, 255); // White background
  pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight, 'F');
  pdf.setDrawColor(0, 0, 0); // Black border
  pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight);

  // Affective table header (enhanced visibility with standard font)
  pdf.setFillColor(26, 37, 47); // Dark professional color
  pdf.rect(affectiveX, affectiveTableY, domainWidth, domainsHeaderHeight, 'F');
  
  pdf.setTextColor(255, 255, 255); // White text for contrast
  pdf.setFontSize(8);
  pdf.setFont('times', 'bold'); // Professional Times font
  pdf.text('QUALITY', affectiveX + 2, affectiveTableY + 5); // Adjusted for larger header
  pdf.text('SCORE', affectiveX + (domainWidth * 0.5) + 2, affectiveTableY + 5); // Adjusted for larger header
  pdf.text('REMARK', affectiveX + (domainWidth * 0.75) + 2, affectiveTableY + 5); // Adjusted for larger header

  let affectiveRowY = affectiveTableY + domainsHeaderHeight;
  affectiveData.forEach((item, index) => {
    // Alternating background colors (exact StudentResultCard)
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
      pdf.rect(affectiveX, affectiveRowY, domainWidth, affectiveRowHeight, 'F');
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8); // Increased from 7pt to 8pt for better readability
    let affectiveCellX = affectiveX;

    // Quality column with proper spacing
    pdf.setFont('helvetica', '600'); // Semi-bold
    pdf.text(item.quality, affectiveCellX + 2, affectiveRowY + 3.5); // Adjusted for larger row height
    affectiveCellX += domainWidth * 0.5;

    // Score column
    pdf.setFont('helvetica', '600');
    pdf.text(item.score, affectiveCellX + domainWidth * 0.1, affectiveRowY + 3.5, { align: 'center' }); // Adjusted for larger row height
    affectiveCellX += domainWidth * 0.2;

    // Remark column with proper spacing
    pdf.setFont('helvetica', 'normal');
    const remark = getAffectiveRemark(parseInt(item.score));
    pdf.text(remark, affectiveCellX + 2, affectiveRowY + 3.5); // Adjusted for larger row height

    affectiveRowY += affectiveRowHeight;
  });

  // Psychomotor Domains - exact StudentResultCard structure
  // Psychomotor title (enhanced visibility with standard font)
  pdf.setTextColor(26, 37, 47); // Dark professional color
  pdf.setFontSize(12); // Increased from 10pt to 12pt for better visibility
  pdf.setFont('times', 'bold'); // Professional Times font instead of helvetica
  const spacedPsychomotorTitle = 'PSYCHOMOTOR'.split('').join(' ');
  pdf.text(spacedPsychomotorTitle, psychomotorX + (domainWidth / 2), domainsY, { align: 'center' });

  // Underline for title
  const psychomotorTitleWidth = pdf.getTextWidth(spacedPsychomotorTitle);
  pdf.setDrawColor(44, 60, 80);
  pdf.setLineWidth(0.5);
  pdf.line(psychomotorX + (domainWidth - psychomotorTitleWidth) / 2, domainsY + 2, psychomotorX + (domainWidth + psychomotorTitleWidth) / 2, domainsY + 2);

  // Psychomotor table background and border (exact StudentResultCard styling)
  pdf.setFillColor(255, 255, 255); // White background
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, affectiveTableHeight, 'F'); // Use same height as affective
  pdf.setDrawColor(0, 0, 0); // Black border
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, affectiveTableHeight);

  // Psychomotor table headers with enhanced visibility
  pdf.setFillColor(26, 37, 47); // Dark professional color
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, domainsHeaderHeight, 'F');
  pdf.setTextColor(255, 255, 255); // White text for contrast
  pdf.setFontSize(8);
  pdf.setFont('times', 'bold'); // Professional Times font
  pdf.text('SKILL', psychomotorX + 3, affectiveTableY + 5); // Adjusted for larger header
  pdf.text('SCORE', psychomotorX + (domainWidth * 0.5), affectiveTableY + 5, { align: 'center' }); // Adjusted
  pdf.text('REMARK', psychomotorX + (domainWidth * 0.75), affectiveTableY + 5, { align: 'center' }); // Adjusted
  
  let psychomotorRowY = affectiveTableY + domainsHeaderHeight;
  psychomotorData.forEach((item, index) => {
    // Alternating background colors (exact StudentResultCard)
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
      pdf.rect(psychomotorX, psychomotorRowY, domainWidth, affectiveRowHeight, 'F');
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8); // Same font size as affective
    let psychomotorCellX = psychomotorX;

    // Skill column with proper spacing
    pdf.setFont('helvetica', '600'); // Semi-bold
    pdf.text(item.skill, psychomotorCellX + 2, psychomotorRowY + 3.5); // Adjusted for larger row height
    psychomotorCellX += domainWidth * 0.5;

    // Score column
    pdf.setFont('helvetica', '600');
    pdf.text(item.score, psychomotorCellX + domainWidth * 0.1, psychomotorRowY + 3.5, { align: 'center' }); // Adjusted
    psychomotorCellX += domainWidth * 0.2;

    // Remark column with proper spacing
    pdf.setFont('helvetica', 'normal');
    const psychomotorRemark = getAffectiveRemark(parseInt(item.score));
    pdf.text(psychomotorRemark, psychomotorCellX + 2, psychomotorRowY + 3.5); // Adjusted

    psychomotorRowY += affectiveRowHeight;
  });

  currentY = affectiveTableY + affectiveTableHeight + 1; // Move below domains section

  // QR code (bottom-left, below domains) - keep non-fatal if generation fails.
  try {
    const studentId = Number(student?.id ?? (result as any)?.student_id ?? 0);
    const resultId = Number(result?.id ?? 0);
    const term = String(result?.term ?? '').trim();
    const academicYear = String(result?.academic_year ?? '').trim();
    const averageScoreRaw = (result as any)?.average_score ?? (result as any)?.averageScore ?? '';
    const averageScore = String(averageScoreRaw).trim();

    if (studentId && resultId && term && academicYear) {
      const payload = JSON.stringify({
        result_id: resultId,
        student_id: studentId,
        term,
        academic_year: academicYear,
        average_score: averageScore,
      });

      const qrDataUrl = await generateQrDataUrl(payload, 220);
      const qrX = margin;
      const qrY = currentY + 1;

      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }
  } catch {
    // ignore
  }

  // Save the PDF
  const safeNameForFile = String(
    resolvedStudentName ||
      `${(student as any)?.firstName || ''} ${(student as any)?.otherName || ''} ${(student as any)?.lastName || ''}`
  )
    .trim()
    .replace(/\s+/g, '_');
  const defaultFilename = `${safeNameForFile}_${result?.term}_${result?.academic_year}_Progress_Report.pdf`;
  const filename = String(options?.filenameOverride || defaultFilename);

  const downloadMethod: PdfDownloadMethod = options?.downloadMethod || 'save';

  if (options?.returnBlob || downloadMethod === 'blob') {
    const blob = pdf.output('blob');
    if (options?.returnBlob) {
      return { blob, filename } as any;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  pdf.save(filename);
  
};

// Wrapper function for easy import
export const handleDownloadStudentPDF = async (student: any, result: any, context: any) => {
  try {
    
    
    
    
    
    
    
    // Get school context from parameters or global window
    const pdfContext = context || {
      schoolSettings: (window as any).schoolSettings || {
        school_name: 'SCHOOL NAME',
        school_address: 'SCHOOL ADDRESS',
        school_email: 'school@email.com',
        school_logo_url: '',
        resumption_date: '',
        head_teacher_name: '_________________',
        principal_name: '_________________',
        head_teacher_comment: 'Head teacher comment will appear here.',
        principal_comment: 'Principal comment will appear here.'
      },
      teachers: (window as any).teachers || [],
      classes: (window as any).classes || [],
      scores: (window as any).scores || [], // ← IMPORTANT: Add scores context
      affectiveDomains: (window as any).affectiveDomains || [], // ← Add affective domains
      psychomotorDomains: (window as any).psychomotorDomains || [] // ← Add psychomotor domains
    };
    
    //console.log('School settings available:', !!(window as any).schoolSettings);
    
    
    
    
    
    // Generate PDF directly from compiled result data (same as StudentResultSheet)
    await generatePDFFromData(student, result, pdfContext);
    
    
  } catch (error) {
    
    
    throw error;
  }
};
