// Shared PDF generation utility for both admin and parent dashboards
import { useSchool } from "../contexts/SchoolContext";

// Grade calculation
const getGrade = (score: number) => {
  if (score >= 80) return { grade: 'A', remark: 'Excellent' };
  if (score >= 70) return { grade: 'B', remark: 'Very Good' };
  if (score >= 60) return { grade: 'C', remark: 'Good' };
  if (score >= 50) return { grade: 'D', remark: 'Satisfactory' };
  if (score >= 45) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
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

// Get affective domain remark
const getAffectiveRemark = (score: number) => {
  if (score >= 5) return 'Excellent';
  if (score >= 4) return 'Very Good';
  if (score >= 3) return 'Good';
  if (score >= 2) return 'Fair';
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

// Main PDF generation function
export const generatePDFFromData = async (student: any, result: any, context: any) => {
  const { schoolSettings, teachers, classes } = context;
  
  console.log('=== PDF GENERATION - EXACT STUDENTRESULTSHEET MATCH ===');
  console.log('School settings available:', !!schoolSettings);
  console.log('School settings object:', schoolSettings);
  console.log('School name from settings:', schoolSettings?.school_name);
  
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false
  });

  console.log('PDF instance created');

  // Exact page dimensions from StudentResultSheet
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 8; // 8mm margins like StudentResultSheet
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
    
    // Set black color for maximum contrast
    pdf.setTextColor(0, 0, 0);
    
    if (align === 'right') {
      const textWidth = pdf.getTextWidth(text);
      pdf.text(text, x - textWidth, y);
    } else if (align === 'center') {
      pdf.text(text, x, y, { align: 'center' });
    } else {
      pdf.text(text, x, y);
    }
    
    return y + (fontSize * 0.35); // Line height based on font size
  };

  const studentClassData = classes.find((c: any) => c.id === result.class_id);
  
  // Check if class should show position
  const shouldShowPosition = studentClassData?.name && 
    !['CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)', 'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)'].includes(studentClassData.name.toUpperCase());

  // Get scores data - EXACT same logic as admin ResultsManagementPage
  let detailedScoresData: any[] = [];
  
  console.log('=== SCORES DEBUG ===');
  console.log('Context scores length:', context.scores?.length);
  console.log('Result object keys:', Object.keys(result));
  console.log('Result object:', result);
  console.log('Result.scores:', result.scores);
  console.log('Result.scores type:', typeof result.scores);
  console.log('Result.scores length:', result.scores?.length);
  
  // EXACT same logic as admin - use context.scores and filter for this student
  if (context.scores && context.scores.length > 0) {
    console.log('Using context.scores - Admin approach');
    
    // EXACT Admin logic: Filter scores for this student, class, term, and academic year
    let studentScores = context.scores.filter((score: any) => 
      score.student_id === result.student_id &&
      score.academic_year === result.academic_year &&
      score.term === result.term
    );

    console.log('Filtered studentScores count:', studentScores.length);
    console.log('Sample filtered scores:', studentScores.slice(0, 2));

    // EXACT Admin logic: If we have result.scores, use them, otherwise use filtered scores
    if (result.scores && result.scores.length > 0) {
      console.log('Using result.scores - Admin approach');
      console.log('Result.scores data:', result.scores.slice(0, 2));
      
      // Use result.scores directly (same as admin)
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
    } else {
      console.log('Using filtered studentScores - Admin approach');
      console.log('Final studentScores data:', studentScores.slice(0, 2));
      detailedScoresData = studentScores;
    }
  } else {
    console.log('No scores available in context');
  }

  console.log('Final detailedScoresData count:', detailedScoresData.length);
  console.log('Final detailedScoresData sample:', detailedScoresData.slice(0, 2));

  // === PAGE BACKGROUND (Exact StudentResultCard: background: white) ===
  // Pure white background to match StudentResultCard exactly
  pdf.setFillColor(255, 255, 255); // Pure white (#ffffff) - exact match to StudentResultCard
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Reset to white for content areas
  pdf.setFillColor(255, 255, 255);

  // === DECORATIVE BORDER DESIGN ===
  // Add elegant border around the entire page
  pdf.setDrawColor(26, 37, 47); // Dark professional color (#1a252f)
  pdf.setLineWidth(2); // 2mm thick border
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10); // Outer border with 5mm margin
  
  // Add inner decorative border
  pdf.setDrawColor(44, 60, 80); // Medium color (#2c3e50)
  pdf.setLineWidth(0.5); // 0.5mm thin border
  pdf.rect(7, 7, pageWidth - 14, pageHeight - 14); // Inner border
  
  // Add school name in the border (bottom center) - with strong fallback
  const schoolNameForBorder = (schoolSettings?.school_name || 
                              (window as any).schoolSettings?.school_name || 
                              'YOUR SCHOOL NAME').toUpperCase();
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(26, 37, 47); // Dark professional color
  pdf.text(schoolNameForBorder, pageWidth / 2, pageHeight - 8, { align: 'center' });

  // === WATERMARK (Large size but reduced visibility - positioned in background) ===
  const watermarkUrl = schoolSettings?.school_logo_url || "./assets/images/school-logo.jpg";
  let watermarkLoaded = false;
  
  // Try to load watermark from multiple sources - large size but positioned for reduced visibility
  if (watermarkUrl) {
    // First try: school_settings logo_url
    if (schoolSettings?.school_logo_url) {
      try {
        pdf.addImage(schoolSettings.school_logo_url, 'PNG', pageWidth / 2 - 70, pageHeight / 2 - 70, 140, 140); // Centered
        watermarkLoaded = true;
        console.log('School logo loaded from settings');
      } catch (error) {
        console.log('Settings logo failed to load:', error);
      }
    }
    
    // Fallback: exact StudentResultCard path
    if (!watermarkLoaded) {
      try {
        const publicLogoUrl = "./assets/images/school-logo.jpg"; // Exact StudentResultCard path
        pdf.addImage(publicLogoUrl, 'PNG', pageWidth / 2 - 70, pageHeight / 2 - 70, 140, 140); // Centered
        watermarkLoaded = true;
        console.log('Fallback watermark loaded - centered position');
      } catch (error) {
        console.log('All watermark attempts failed:', error);
      }
    }
  }

  // === HEADER SECTION (Exact StudentResultCard structure - what you see in view button) ===
  console.log('Drawing header section...');
  
  // Header container - exact StudentResultCard: centered layout
  const headerY = currentY;
  
  // CENTERED LOGO (exact StudentResultCard: 18mm x 18mm, circular)
  const logoSize = 18; // 18mm as in StudentResultCard
  const logoX = pageWidth / 2 - (logoSize / 2); // Centered
  
  // Try to load logo from multiple sources with circular clipping
  let logoLoaded = false;
  
  // First try: school_settings logo_url
  if (schoolSettings?.school_logo_url) {
    try {
      // Create circular clipping path first
      pdf.setFillColor(255, 255, 255); // White background
      pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'F'); // Filled circle
      pdf.setDrawColor(44, 60, 80); // #2c3e50 border
      pdf.setLineWidth(0.7); // 2px border = 0.7mm
      pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'S'); // Circle border
      pdf.setLineWidth(1); // Reset to default
      
      // Add image within circular bounds
      pdf.addImage(schoolSettings.school_logo_url, 'PNG', logoX, headerY, logoSize, logoSize);
      logoLoaded = true;
      console.log('School logo loaded from settings');
    } catch (error) {
      console.log('Settings logo failed to load:', error);
    }
  }
  
  // Second try: exact StudentResultCard primary path
  if (!logoLoaded) {
    try {
      const publicLogoUrl = "./assets/images/school-logo.jpg"; // Exact StudentResultCard path
      // Create circular clipping path first
      pdf.setFillColor(255, 255, 255); // White background
      pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'F'); // Filled circle
      pdf.setDrawColor(44, 60, 80); // #2c3e50 border
      pdf.setLineWidth(0.7); // 2px border = 0.7mm
      pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'S'); // Circle border
      pdf.setLineWidth(1); // Reset to default
      
      // Add image within circular bounds
      pdf.addImage(publicLogoUrl, 'PNG', logoX, headerY, logoSize, logoSize);
      logoLoaded = true;
      console.log('Public logo loaded from exact StudentResultCard path');
    } catch (error) {
      console.log('Public logo failed to load:', error);
    }
  }
  
  // Third try: exact StudentResultCard fallback
  if (!logoLoaded) {
    try {
      const fallbackUrl = "./assets/images/school-logo.png"; // Exact StudentResultCard fallback
      pdf.addImage(fallbackUrl, 'PNG', pageWidth / 2 - 70, pageHeight / 2 - 70, 140, 140); // Centered
      watermarkLoaded = true;
      console.log('Fallback watermark loaded - centered position');
    } catch (fallbackError) {
      console.log('All logo attempts failed, using text fallback:', fallbackError);
    }
  }
  
  // If no logo loaded, show text fallback
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
  
  // CENTERED DIVIDER LINE (exact StudentResultCard: marginTop: 1mm, width: 80%, margin: 1mm auto 0)
  currentTextY += 3; // Increased from 1mm to 3mm for better spacing below email
  pdf.setDrawColor(44, 60, 80); // #2c3e50
  pdf.setLineWidth(0.7); // 2px = 0.7mm
  const dividerWidth = pageWidth * 0.8; // 80% width
  const dividerX = (pageWidth - dividerWidth) / 2; // Centered
  pdf.line(dividerX, currentTextY, dividerX + dividerWidth, currentTextY);
  pdf.setLineWidth(1); // Reset to default
  
  currentY = currentTextY + 8; // Header marginBottom: increased from 3mm to 8mm for better separation

  // === STUDENT INFORMATION SECTION (Exact StudentResultCard copy) ===
  console.log('Drawing student info section...');
  
  // Student info section container (exact StudentResultCard: marginBottom: 2mm, gap: 1mm, centered)
  const studentInfoY = currentY;
  const studentInfoTableWidth = contentWidth * 0.75; // 75% width
  const studentPhotoWidth = contentWidth * 0.25; // 25% width
  const sectionGap = 1; // 1mm gap between table and photo
  const totalWidth = studentInfoTableWidth + sectionGap + studentPhotoWidth;
  const startX = (pageWidth - totalWidth) / 2; // Center the entire section
  
  // Student info table - exact StudentResultCard styling
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(startX, studentInfoY, studentInfoTableWidth, 22, 'F'); // Increased to 22mm height for 5 rows
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.setLineWidth(0.7); // 2px border = 0.7mm
  pdf.rect(startX, studentInfoY, studentInfoTableWidth, 22);
  pdf.setLineWidth(1); // Reset to default
  
  // Student info table content - Better organized layout
  const tableData = [
    [
      // Row 1: 4 cells - Name, Name value, Session, Session value
      { type: 'label', text: 'Name:', width: 0.15 },
      { type: 'value', text: student ? `${student.firstName} ${student.lastName}`.toUpperCase() : 'STUDENT NAME', width: 0.35 },
      { type: 'label', text: 'Session:', width: 0.15 },
      { type: 'value', text: result.academic_year || '2024/2025', width: 0.35 }
    ],
    [
      // Row 2: 4 cells - Admission No, Admission No value, Term, Term value
      { type: 'label', text: 'Admission No:', width: 0.15 },
      { type: 'value', text: student?.admissionNumber || 'GRA/XXXXX', width: 0.35 },
      { type: 'label', text: 'Term:', width: 0.15 },
      { type: 'value', text: result.term || 'THIRD TERM', width: 0.35 }
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
      { type: 'label', text: shouldShowPosition ? 'Position:' : '', width: shouldShowPosition ? 0.15 : 0 },
      { type: 'value', text: shouldShowPosition ? `${result.position || '___'} / ${result.total_students || '___'}` : '', width: shouldShowPosition ? 0.35 : 0 }
    ],
    [
      // Row 5: Next Term Begins (separate cells for label and value)
      { type: 'label', text: 'Next Term Begins:', width: 0.2 },
      { type: 'value', text: schoolSettings?.resumption_date || '', width: 0.8 }
    ]
  ];
  
  let studentInfoTableY = studentInfoY;
  tableData.forEach((row, rowIndex) => {
    const rowHeight = 4.4; // 4.4mm per row (22mm / 5 rows)
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

  currentY = studentInfoY + 25; // Space below student info table

  // === RESULT TABLE (Exact StudentResultCard copy) ===
  console.log('Drawing result table...');
  
  const resultTableY = currentY;
  const tableWidth = contentWidth * 0.95; // 95% width
  const tableX = (pageWidth - tableWidth) / 2; // Centered
  
  // Table headers - balanced proportions for proper table fit
  const headers = ['SN', 'SUBJECT', '1st CA', '2nd CA', 'Exams', 'Total', 'Grd', 'Remark'];
  const headerWidths = [0.05, 0.30, 0.10, 0.10, 0.10, 0.10, 0.10, 0.15]; // Balanced: Total = 100%
  
  // Draw header background
  pdf.setFillColor(44, 60, 80); // #2c3e50 background
  pdf.rect(tableX, resultTableY, tableWidth, 8, 'F');
  
  // Draw header borders and text
  let headerX = tableX;
  headers.forEach((header, index) => {
    const cellWidth = tableWidth * headerWidths[index];
    
    // Cell border - match StudentResultCard thickness
    pdf.setDrawColor(44, 60, 80);
    pdf.setLineWidth(0.5); // Match StudentResultCard border thickness
    pdf.rect(headerX, resultTableY, cellWidth, 8);
    pdf.setLineWidth(1); // Reset to default
    
    // Header text - enhanced visibility
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(8); // Increased from 7pt to 8pt for better readability
    pdf.setFont('helvetica', 'bold');
    
    // Center header text like data cells
    if (index === 0 || index >= 2) { // Center align SN, CA, Exams, Total, Grade, Remark
      pdf.text(header, headerX + cellWidth / 2, resultTableY + 5, { align: 'center' });
    } else { // Left align Subject with proper padding for larger cell
      pdf.text(header, headerX + 2, resultTableY + 5); // Match data cell padding
    }
    
    headerX += cellWidth;
  });
  
  // Draw table rows
  let rowY = resultTableY + 8;
  const scoresList = detailedScoresData; // Use exact same data as StudentResultCard
  
  console.log('=== TABLE RENDERING DEBUG ===');
  console.log('scoresList length:', scoresList.length);
  console.log('scoresList data:', scoresList);
  
  if (scoresList.length > 0) {
    scoresList.forEach((score: any, index: number) => {
      if (rowY > pageHeight - 20) {
        pdf.addPage();
        rowY = margin; // Reset to top margin
      }
      
      const gradeInfo = getGrade(score.total || 0);
      const rowData = [
        (index + 1).toString(),
        score.subject_name || 'Subject',
        (score.ca1 || 0).toString(),
        (score.ca2 || 0).toString(),
        (score.exam || 0).toString(),
        (score.total || 0).toString(),
        gradeInfo.grade,
        gradeInfo.remark
      ];
      
      let cellX = tableX;
      rowData.forEach((cellData, cellIndex) => {
        const cellWidth = tableWidth * headerWidths[cellIndex];
        
        // Cell background to overlay watermark
        pdf.setFillColor(255, 255, 255); // White background to hide watermark
        pdf.rect(cellX, rowY, cellWidth, 5, 'F'); // Fill background
        
        // Cell border - match StudentResultCard thickness
        pdf.setDrawColor(44, 60, 80);
        pdf.setLineWidth(0.5); // Match StudentResultCard border thickness
        pdf.rect(cellX, rowY, cellWidth, 5); // Draw border
        pdf.setLineWidth(1); // Reset to default
        
        // Cell text with enhanced visibility
        pdf.setTextColor(0, 0, 0);
        if (cellIndex === 7) { // Remark column - 5pt (increased from 4pt)
          pdf.setFontSize(5); // Increased from 4pt to 5pt for better readability
        } else {
          pdf.setFontSize(8); // Increased from 7pt to 8pt for better readability
        }
        if (cellIndex === 5 || cellIndex === 6) { // Total and Grade columns - bold
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        // Text alignment and positioning
        if (cellIndex === 0) { // S/N column - center
          pdf.text(cellData, cellX + cellWidth / 2, rowY + 3.5, { align: 'center' });
        } else if (cellIndex === 5 || cellIndex === 6) { // Total and Grade columns - center
          pdf.text(cellData, cellX + cellWidth / 2, rowY + 3.5, { align: 'center' });
        } else if (cellIndex === 7) { // Remark column - left with padding
          pdf.text(cellData, cellX + 2, rowY + 3.5);
        } else { // Other columns - center
          pdf.text(cellData, cellX + cellWidth / 2, rowY + 3.5, { align: 'center' });
        }
        
        cellX += cellWidth;
      });
      
      rowY += 5.5; // Row spacing (exact same as admin)
    });
  }

  currentY = rowY + 10; // Space below result table

  // === SCORE SUMMARY (Exact StudentResultCard copy) ===
  console.log('Drawing score summary...');
  
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
  const getPositionWithSuffix = (position: number) => {
    if (!position) return '___';
    if (position === 1) return `${position}st`;
    if (position === 2) return `${position}nd`;
    if (position === 3) return `${position}rd`;
    return `${position}th`;
  };
  
  const summaryData = shouldShowPosition ? [
    `TOTAL: ${result?.total_score || '0.00'}`,
    `AVG: ${result?.average_score || '0.00'}`,
    `CLASS AVG: ${result?.class_average || '0.00'}`,
    `POS: ${getPositionWithSuffix(result?.position)}`
  ] : [
    `TOTAL: ${result?.total_score || '0.00'}`,
    `AVG: ${result?.average_score || '0.00'}`,
    `CLASS AVG: ${result?.class_average || '0.00'}`,
    `HIGHEST: ${result?.highest_score || '0.00'}`
  ];
  
  // Draw summary text
  pdf.setTextColor(44, 60, 80); // #2c3e50
  pdf.setFontSize(7); // 7pt
  pdf.setFont('helvetica', 'bold');
  
  const summarySpacing = summaryWidth / summaryData.length;
  summaryData.forEach((text, index) => {
    const textX = summaryX + (summarySpacing * index) + (summarySpacing / 2);
    pdf.text(text, textX, summaryY + 5, { align: 'center' });
  });

  currentY = summaryY + 12; // Space below summary

  // === SIGNATURE SECTION (Exact StudentResultCard copy) ===
  console.log('Drawing signature section...');
  
  const signatureY = currentY;
  const signatureWidth = contentWidth * 0.45; // 45% width for each signature box
  const signatureLeftX = margin;
  const signatureRightX = margin + signatureWidth + 10; // 10mm gap between signatures
  
  // Class Teacher Section - Left Side (exact StudentResultCard: 30mm height)
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(signatureLeftX, signatureY, signatureWidth, 30, 'F'); // 30mm height
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.rect(signatureLeftX, signatureY, signatureWidth, 30);
  
  // Class Teacher content with proper spacing to prevent overlap
  pdf.setTextColor(44, 60, 80); // #2c3e50
  pdf.setFontSize(7); // 7pt
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLASS TEACHER', signatureLeftX + 2, signatureY + 4); // Increased from 3 to 4
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  // Exact StudentResultCard teacher name logic
  const getClassTeacherName = () => {
    if (studentClassData?.classTeacherId) {
      const classTeacher = teachers.find((t: any) => t.id === studentClassData.classTeacherId);
      if (classTeacher) {
        return `${classTeacher.firstName} ${classTeacher.lastName}`;
      }
    }
    
    // Final fallback: Return placeholder
    return '_________________';
  };
  
  pdf.text(`Name: ${getClassTeacherName()}`, signatureLeftX + 2, signatureY + 9); // Increased from 7 to 9
  
  // Class teacher comment (exact StudentResultCard logic)
  const comment = result?.class_teacher_comment || 'Class teacher comment will appear here.';
  pdf.setFont('times', 'normal'); // Professional Times font for comments
  pdf.setFontSize(8); // Smaller font for comments
  pdf.text(`Comment: ${comment}`, signatureLeftX + 2, signatureY + 14); // Increased from 11 to 14
  
  // Principal/Head Teacher Section - Right Side (exact StudentResultCard: 30mm height)
  pdf.setFillColor(248, 249, 250); // #f8f9fa background
  pdf.rect(signatureRightX, signatureY, signatureWidth, 30, 'F'); // 30mm height
  pdf.setDrawColor(44, 60, 80); // #2c3e50 border
  pdf.rect(signatureRightX, signatureY, signatureWidth, 30);
  
  // Principal/Head Teacher content with proper spacing to prevent overlap
  const signatureTitle = studentClassData?.category === 'Primary' ? 'HEAD TEACHER' : 'PRINCIPAL';
  pdf.setTextColor(44, 60, 80); // #2c3e50
  pdf.setFontSize(7); // 7pt
  pdf.setFont('helvetica', 'bold');
  pdf.text(signatureTitle, signatureRightX + 2, signatureY + 4); // Increased from 3 to 4
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  // Exact StudentResultCard teacher name logic
  const teacherName = studentClassData?.category === 'Primary' 
    ? (schoolSettings?.head_teacher_name || '_________________')
    : (schoolSettings?.principal_name || '_________________');
  pdf.text(`Name: ${teacherName}`, signatureRightX + 2, signatureY + 9); // Increased from 7 to 9
  
  // Principal comment (exact StudentResultCard logic)
  const principalComment = studentClassData?.category === 'Primary'
    ? (schoolSettings?.head_teacher_comment || 'Head teacher comment will appear here.')
    : (schoolSettings?.principal_comment || 'Principal comment will appear here.');
  pdf.setFont('times', 'normal'); // Professional Times font for comments
  pdf.setFontSize(8); // Smaller font for comments
  pdf.text(`Comment: ${principalComment}`, signatureRightX + 2, signatureY + 14); // Increased from 11 to 14

  // Signature line with proper spacing
  pdf.text('Signature:', signatureRightX + 2, signatureY + 19); // Increased from 15 to 19
  pdf.setDrawColor(0, 0, 0);
  pdf.line(signatureRightX + 2, signatureY + 22, signatureRightX + signatureWidth - 2, signatureY + 22); // Increased from 18 to 22
  
  // Signature image if available - using real database signature field
  if (result?.principal_signature) {
    try {
      pdf.addImage(result.principal_signature, 'PNG', signatureRightX + 2, signatureY + 18, signatureWidth - 4, 6);
    } catch (error) {
      console.log('Could not add signature:', error);
    }
  }

  currentY = signatureY + 45; // Increased from 35 to 45 for more spacing

  // === AFFECTIVE AND PSYCHOMOTOR DOMAINS (Exact StudentResultCard copy) ===
  console.log('Drawing affective and psychomotor domains...');
  
  const domainsY = currentY;
  const domainWidth = contentWidth * 0.48; // 48% width each
  const domainGap = 2; // 2mm gap
  const affectiveX = (pageWidth - (2 * domainWidth + domainGap)) / 2;
  const psychomotorX = affectiveX + domainWidth + domainGap;
  
  // Affective Domains - exact StudentResultCard structure
  // Affective title (enhanced visibility with standard font)
  pdf.setTextColor(26, 37, 47); // Dark professional color
  pdf.setFontSize(12); // Increased from 10pt to 12pt for better visibility
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
  const affectiveTableHeight = 30; // 30mm height

  // Affective table background
  pdf.setFillColor(255, 255, 255); // White background
  pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight, 'F');
  pdf.setDrawColor(0, 0, 0); // Black border
  pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight);

  // Affective table header (enhanced visibility with standard font)
  pdf.setFillColor(26, 37, 47); // Dark professional color
  pdf.rect(affectiveX, affectiveTableY, domainWidth, 6, 'F');
  
  pdf.setTextColor(255, 255, 255); // White text for contrast
  pdf.setFontSize(8); // Increased from 6pt to 8pt for better readability
  pdf.setFont('times', 'bold'); // Professional Times font
  pdf.text('QUALITY', affectiveX + 2, affectiveTableY + 4); // Left aligned with padding
  pdf.text('SCORE', affectiveX + (domainWidth * 0.5) + 2, affectiveTableY + 4); // Left aligned with padding
  pdf.text('REMARK', affectiveX + (domainWidth * 0.75) + 2, affectiveTableY + 4); // Left aligned with padding
  
  // Affective data rows
  const affectiveData = [
    { quality: getDomainName('attentiveness'), score: result?.affective?.attentiveness || '4' },
    { quality: getDomainName('honesty'), score: result?.affective?.honesty || '3' },
    { quality: getDomainName('neatness'), score: result?.affective?.neatness || '4' },
    { quality: getDomainName('obedience'), score: result?.affective?.obedience || '2' },
    { quality: getDomainName('sense_of_responsibility'), score: result?.affective?.sense_of_responsibility || '3' }
  ];

  let affectiveRowY = affectiveTableY + 6;
  affectiveData.forEach((item, index) => {
    // Alternating background colors (exact StudentResultCard)
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
      pdf.rect(affectiveX, affectiveRowY, domainWidth, 4.8, 'F');
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7); // 7pt
    let affectiveCellX = affectiveX;

    // Quality column with proper spacing
    pdf.setFont('helvetica', '600'); // Semi-bold
    pdf.text(item.quality, affectiveCellX + 2, affectiveRowY + 3); // Increased from 1 to 2
    affectiveCellX += domainWidth * 0.5;

    // Score column
    pdf.setFont('helvetica', '600');
    pdf.text(item.score, affectiveCellX + domainWidth * 0.1, affectiveRowY + 3, { align: 'center' });
    affectiveCellX += domainWidth * 0.2;

    // Remark column with proper spacing
    pdf.setFont('helvetica', 'normal');
    const remark = getAffectiveRemark(parseInt(item.score));
    pdf.text(remark, affectiveCellX + 2, affectiveRowY + 3); // Increased from 1 to 2

    affectiveRowY += 4.8;
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
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, affectiveTableHeight, 'F');
  pdf.setDrawColor(0, 0, 0); // Black border
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, affectiveTableHeight);

  // Psychomotor table headers with enhanced visibility
  pdf.setFillColor(26, 37, 47); // Dark professional color
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, 6, 'F');
  pdf.setTextColor(255, 255, 255); // White text for contrast
  pdf.setFontSize(8); // Increased from 6pt to 8pt for better readability
  pdf.setFont('times', 'bold'); // Professional Times font
  pdf.text('SKILL', psychomotorX + 3, affectiveTableY + 4); // Increased from 2 to 3
  pdf.text('SCORE', psychomotorX + (domainWidth * 0.5), affectiveTableY + 4, { align: 'center' });
  pdf.text('REMARK', psychomotorX + (domainWidth * 0.75), affectiveTableY + 4, { align: 'center' });
  
  // Psychomotor data rows
  const psychomotorData = [
    { skill: getDomainName('sports'), score: result?.psychomotor?.sports || '4' },
    { skill: getDomainName('handwriting'), score: result?.psychomotor?.handwriting || '3' },
    { skill: getDomainName('fluency'), score: result?.psychomotor?.fluency || '4' },
    { skill: getDomainName('creativity'), score: result?.psychomotor?.creativity || '3' },
    { skill: getDomainName('handling_tools'), score: result?.psychomotor?.handling_tools || '4' }
  ];

  let psychomotorRowY = affectiveTableY + 6;
  psychomotorData.forEach((item, index) => {
    // Alternating background colors (exact StudentResultCard)
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
      pdf.rect(psychomotorX, psychomotorRowY, domainWidth, 4.8, 'F');
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7); // 7pt
    let psychomotorCellX = psychomotorX;

    // Skill column with proper spacing
    pdf.setFont('helvetica', '600'); // Semi-bold
    pdf.text(item.skill, psychomotorCellX + 2, psychomotorRowY + 3); // Increased from 1 to 2
    psychomotorCellX += domainWidth * 0.5;

    // Score column
    pdf.setFont('helvetica', '600');
    pdf.text(item.score, psychomotorCellX + domainWidth * 0.1, psychomotorRowY + 3, { align: 'center' });
    psychomotorCellX += domainWidth * 0.2;

    // Remark column with proper spacing
    pdf.setFont('helvetica', 'normal');
    const psychomotorRemark = getAffectiveRemark(parseInt(item.score));
    pdf.text(psychomotorRemark, psychomotorCellX + 2, psychomotorRowY + 3); // Increased from 1 to 2

    psychomotorRowY += 4.8;
  });

  currentY = affectiveTableY + 35; // Move below domains section

  console.log('PDF generation completed successfully');

  // Save the PDF
  const filename = `${student.firstName}_${student.lastName}_${result?.term}_${result?.academic_year}_Progress_Report.pdf`;
  pdf.save(filename);
};

// Wrapper function for easy import
export const handleDownloadStudentPDF = async (student: any, result: any, context: any) => {
  try {
    console.log('=== DIRECT PDF DOWNLOAD STARTED ===');
    console.log('Student:', student.firstName, student.lastName);
    console.log('Student ID:', student.id);
    console.log('Result ID:', result.id);
    console.log('Student data:', student);
    console.log('Result data:', result);
    
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
      scores: (window as any).scores || [] // ← IMPORTANT: Add scores context
    };
    
    console.log('School settings available:', !!(window as any).schoolSettings);
    console.log('Scores context available:', pdfContext.scores.length);
    console.log('Using context:', pdfContext);
    
    // Generate PDF directly from compiled result data (same as StudentResultSheet)
    await generatePDFFromData(student, result, pdfContext);
    
    console.log('=== DIRECT PDF COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('=== DIRECT PDF GENERATION FAILED ===');
    console.error('Error:', error);
    throw error;
  }
};
