// Admin PDF Generator - Exact copy from ResultsManagementPage.tsx
// This ensures parents get the exact same PDF as admins

export const generateAdminPDF = async (student: any, result: any, context?: any) => {
    console.log('=== ADMIN PDF GENERATION - EXACT APPROVED RESULT ===');
    console.log('Context provided:', !!context);
    
    // Use provided context or fall back to component state
    const pdfContext = context || {
      schoolSettings: context?.schoolSettings,
      teachers: context?.teachers,
      classes: context?.classes,
      scores: context?.scores,
      affectiveDomains: context?.affectiveDomains,
      psychomotorDomains: context?.psychomotorDomains,
      subjects: context?.subjects || [],
      subjectAssignments: context?.subjectAssignments || [],
      students: context?.students || []
    };
    
    console.log('Final PDF context:', pdfContext);
    
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

    // Helper function to format dates
    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Helper function to get grade from score
    const getGrade = (score: number) => {
      if (score >= 90) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 80) return 'A-';
      if (score >= 75) return 'B+';
      if (score >= 70) return 'B';
      if (score >= 65) return 'B-';
      if (score >= 60) return 'C+';
      if (score >= 55) return 'C';
      if (score >= 50) return 'C-';
      if (score >= 45) return 'D+';
      if (score >= 40) return 'D';
      return 'F';
    };

    // Helper function to get affective remark
    const getAffectiveRemark = (score: number) => {
      if (score >= 5) return 'Excellent';
      if (score >= 4) return 'Very Good';
      if (score >= 3) return 'Good';
      if (score >= 2) return 'Fair';
      return 'Needs Improvement';
    };

    // Helper function to get domain name
    const getDomainName = (domainKey: string) => {
      const domainNames: { [key: string]: string } = {
        attentiveness: 'Attentiveness',
        honesty: 'Honesty',
        neatness: 'Neatness',
        obedience: 'Obedience',
        sense_of_responsibility: 'Sense of Responsibility',
        attention_to_direction: 'Attention to Direction',
        considerate_of_others: 'Considerate of Others',
        handwriting: 'Handwriting',
        sports: 'Sports',
        verbal_fluency: 'Verbal Fluency',
        works_well_independently: 'Works Well Independently'
      };
      return domainNames[domainKey] || domainKey;
    };

    // Helper function to get class teacher name
    const getClassTeacherName = () => {
      if (!student || !student.classId) return 'Not Assigned';
      
      const teacherClass = pdfContext.teachers?.find((tc: any) => 
        tc.classId === student.classId && tc.isClassTeacher
      );
      
      if (teacherClass) {
        const teacher = pdfContext.teachers?.find((t: any) => t.id === teacherClass.teacherId);
        return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned';
      }
      
      return 'Not Assigned';
    };

    // Helper function to get student affective data
    const getStudentAffectiveData = () => {
      if (!student || !pdfContext.affectiveDomains) return {};
      
      const studentAffective = pdfContext.affectiveDomains.find((ad: any) => 
        ad.studentId === student.id
      );
      
      return studentAffective || {};
    };

    // Helper function to get student psychomotor data
    const getStudentPsychomotorData = () => {
      if (!student || !pdfContext.psychomotorDomains) return {};
      
      const studentPsychomotor = pdfContext.psychomotorDomains.find((pd: any) => 
        pd.studentId === student.id
      );
      
      return studentPsychomotor || {};
    };

    // === SCHOOL HEADER (Exact StudentResultCard copy) ===
    console.log('Drawing school header...');
    
    // School name and logo
    if (pdfContext.schoolSettings?.logo) {
      try {
        pdf.addImage(pdfContext.schoolSettings.logo, 'PNG', margin, currentY, 25, 25);
      } catch (error) {
        console.log('Could not add school logo:', error);
      }
    }
    
    // School details
    const schoolX = margin + (pdfContext.schoolSettings?.logo ? 30 : 0);
    currentY = addText(
      pdfContext.schoolSettings?.name || 'School Name', 
      schoolX, 
      currentY + 5, 
      16, 
      'bold'
    );
    
    currentY = addText(
      pdfContext.schoolSettings?.address || 'School Address', 
      schoolX, 
      currentY, 
      10, 
      'normal'
    );
    
    currentY = addText(
      `Email: ${pdfContext.schoolSettings?.email || 'school@example.com'}`, 
      schoolX, 
      currentY, 
      9, 
      'normal'
    );
    
    currentY = addText(
      `Phone: ${pdfContext.schoolSettings?.phone || '+1234567890'}`, 
      schoolX, 
      currentY, 
      9, 
      'normal'
    );

    currentY += 5;

    // === RESULT TITLE (Exact StudentResultCard copy) ===
    console.log('Drawing result title...');
    
    currentY = addText('PROGRESS REPORT', pageWidth / 2, currentY, 18, 'bold', 'center');
    currentY = addText(`${result?.term || 'Term'} ${result?.academic_year || 'Academic Year'}`, pageWidth / 2, currentY, 14, 'bold', 'center');
    currentY += 5;

    // === STUDENT INFORMATION (Exact StudentResultCard copy) ===
    console.log('Drawing student information...');
    
    const studentClassData = pdfContext.classes?.find((c: any) => c.id === student.classId);
    
    // Student info box
    pdf.setFillColor(248, 249, 250); // #f8f9fa background
    pdf.rect(margin, currentY, contentWidth, 25, 'F');
    pdf.setDrawColor(44, 60, 80); // #2c3e50 border
    pdf.rect(margin, currentY, contentWidth, 25);
    
    // Student details
    pdf.setTextColor(44, 60, 80);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STUDENT INFORMATION', margin + 2, currentY + 4);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    const studentInfo = [
      `Name: ${student?.firstName || 'N/A'} ${student?.lastName || 'N/A'}`,
      `Class: ${studentClassData?.name || 'N/A'}`,
      `Admission No: ${student?.admissionNumber || 'N/A'}`,
      `Gender: ${student?.gender || 'N/A'}`
    ];
    
    let infoX = margin + 2;
    let infoY = currentY + 10;
    studentInfo.forEach((info, index) => {
      pdf.text(info, infoX, infoY);
      if (index === 1) { // After class, move to second column
        infoX = margin + contentWidth / 2 + 2;
        infoY = currentY + 10;
      } else {
        infoY += 5;
      }
    });
    
    currentY += 30;

    // === RESULT TABLE (Exact StudentResultCard copy) ===
    console.log('Drawing result table...');
    
    const tableHeaders = ['SN', 'SUBJECT', 'CA', 'EXAMS', 'TOTAL', 'GRADE', 'REMARK'];
    const tableWidths = [0.08, 0.30, 0.12, 0.12, 0.12, 0.08, 0.18]; // Exact StudentResultCard percentages
    const tableX = margin;
    const tableY = currentY;
    const tableWidth = contentWidth;
    const headerHeight = 6;
    const rowHeight = 5;
    
    // Table header
    pdf.setFillColor(26, 37, 47); // Dark professional color
    pdf.rect(tableX, tableY, tableWidth, headerHeight, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    
    let headerX = tableX;
    tableHeaders.forEach((header, index) => {
      const cellWidth = tableWidth * tableWidths[index];
      if (index === 0 || index >= 2) { // Center align SN, CA, Exams, Total, Grade, Remark
        pdf.text(header, headerX + cellWidth / 2, tableY + 4, { align: 'center' });
      } else { // Left align Subject
        pdf.text(header, headerX + 2, tableY + 4);
      }
      headerX += cellWidth;
    });
    
    // Table rows - Using exact StudentResultCard logic
    let rowY = tableY + headerHeight;
    const studentScores = pdfContext.scores?.filter((s: any) => s.studentId === student.id) || [];
    
    if (studentScores.length > 0) {
      studentScores.forEach((score: any, index: number) => {
        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 249, 250); // #f8f9fa
          pdf.rect(tableX, rowY, tableWidth, rowHeight, 'F');
        }
        
        pdf.setDrawColor(44, 60, 80);
        pdf.rect(tableX, rowY, tableWidth, rowHeight);
        
        // Row data
        const rowData = [
          (index + 1).toString(),
          score.subjectName || 'N/A',
          score.caScore?.toString() || '0',
          score.examScore?.toString() || '0',
          score.totalScore?.toString() || '0',
          getGrade(score.totalScore || 0),
          score.remark || 'N/A'
        ];
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(7);
        let cellX = tableX;
        
        rowData.forEach((cellData, cellIndex) => {
          const cellWidth = tableWidth * tableWidths[cellIndex];
          
          if (cellIndex === 0 || cellIndex >= 2) { // Center align SN, CA, Exams, Total, Grade, Remark
            pdf.text(cellData, cellX + cellWidth / 2, rowY + 3.5, { align: 'center' });
          } else { // Left align Subject
            pdf.text(cellData, cellX + 2, rowY + 3.5);
          }
          
          cellX += cellWidth;
        });
        
        rowY += rowHeight;
      });
    } else {
      // No scores row
      pdf.setFillColor(255, 255, 255);
      pdf.rect(tableX, rowY, tableWidth, 6, 'F');
      pdf.setDrawColor(44, 60, 80);
      pdf.rect(tableX, rowY, tableWidth, 6);
      pdf.setTextColor(128, 128, 128);
      pdf.setFontSize(7);
      pdf.text('No scores available', tableX + tableWidth / 2, rowY + 4, { align: 'center' });
      rowY += 6;
    }
    
    currentY = rowY + 2;

    // === SCORE SUMMARY (Exact StudentResultCard copy) ===
    console.log('Drawing score summary...');
    
    const summaryY = currentY;
    const summaryWidth = contentWidth * 0.95;
    const summaryX = (pageWidth - summaryWidth) / 2;
    
    // Summary table
    pdf.setFillColor(248, 249, 250);
    pdf.rect(summaryX, summaryY, summaryWidth, 8, 'F');
    pdf.setDrawColor(44, 60, 80);
    pdf.setLineWidth(0.7);
    pdf.rect(summaryX, summaryY, summaryWidth, 8);
    pdf.setLineWidth(1);
    
    const getPositionWithSuffix = (position: number) => {
      if (!position) return '___';
      if (position === 1) return `${position}st`;
      if (position === 2) return `${position}nd`;
      if (position === 3) return `${position}rd`;
      return `${position}th`;
    };
    
    const shouldShowPosition = result?.position && result.position > 0;
    const summaryData = shouldShowPosition ? [
      `TOTAL: ${result?.total_score || '0.00'}`,
      `AVG: ${result?.average_score || '0.00'}`,
      `CLASS AVG: ${result?.class_average || '0.00'}`,
      `POS: ${getPositionWithSuffix(result?.position)}`
    ] : [
      `TOTAL: ${result?.total_score || '0.00'}`,
      `AVG: ${result?.average_score || '0.00'}`,
      `CLASS AVG: ${result?.class_average || '0.00'}`
    ];
    
    let summaryCellX = summaryX;
    const summaryCellWidth = shouldShowPosition ? summaryWidth / 4 : summaryWidth / 3;
    
    summaryData.forEach((data, index) => {
      pdf.setDrawColor(44, 60, 80);
      pdf.rect(summaryCellX, summaryY, summaryCellWidth, 8);
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(data, summaryCellX + 2, summaryY + 5);
      
      summaryCellX += summaryCellWidth;
    });
    
    currentY = summaryY + 10;

    // === SIGNATURE SECTION (Exact StudentResultCard copy) ===
    console.log('Drawing signature section...');
    
    const signatureY = currentY;
    const signatureWidth = contentWidth * 0.47;
    const signatureGap = 2;
    const signatureLeftX = (pageWidth - (2 * signatureWidth + signatureGap)) / 2;
    const signatureRightX = signatureLeftX + signatureWidth + signatureGap;
  
    // Class Teacher Section
    pdf.setFillColor(248, 249, 250);
    pdf.rect(signatureLeftX, signatureY, signatureWidth, 25, 'F');
    pdf.setDrawColor(44, 60, 80);
    pdf.rect(signatureLeftX, signatureY, signatureWidth, 25);
    
    pdf.setTextColor(44, 60, 80);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLASS TEACHER', signatureLeftX + 2, signatureY + 4);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${getClassTeacherName()}`, signatureLeftX + 2, signatureY + 9);
    
    const comment = result?.class_teacher_comment || result?.comment || 'Teacher comment will appear here.';
    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Comment: ${comment}`, signatureLeftX + 2, signatureY + 14);
    
    // Principal/Head Teacher Section
    pdf.setFillColor(248, 249, 250);
    pdf.rect(signatureRightX, signatureY, signatureWidth, 30, 'F');
    pdf.setDrawColor(44, 60, 80);
    pdf.rect(signatureRightX, signatureY, signatureWidth, 30);
    
    const signatureTitle = studentClassData?.category === 'Primary' ? 'HEAD TEACHER' : 'PRINCIPAL';
    pdf.setTextColor(44, 60, 80);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(signatureTitle, signatureRightX + 2, signatureY + 4);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const teacherName = studentClassData?.category === 'Primary' 
      ? (pdfContext.schoolSettings?.head_teacher_name || '_________________')
      : (pdfContext.schoolSettings?.principal_name || '_________________');
    pdf.text(`Name: ${teacherName}`, signatureRightX + 2, signatureY + 9);
    
    const principalComment = studentClassData?.category === 'Primary'
      ? (pdfContext.schoolSettings?.head_teacher_comment || 'Head teacher comment will appear here.')
      : (pdfContext.schoolSettings?.principal_comment || 'Principal comment will appear here.');
    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Comment: ${principalComment}`, signatureRightX + 2, signatureY + 14);
  
    pdf.text('Signature:', signatureRightX + 2, signatureY + 19);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(signatureRightX + 2, signatureY + 22, signatureRightX + signatureWidth - 2, signatureY + 22);
  
    if (result?.principal_signature) {
      try {
        pdf.addImage(result.principal_signature, 'PNG', signatureRightX + 2, signatureY + 18, signatureWidth - 4, 6);
      } catch (error) {
        console.log('Could not add signature:', error);
      }
    }

    currentY = signatureY + 45;

    // === AFFECTIVE AND PSYCHOMOTOR DOMAINS (Exact StudentResultCard copy) ===
    console.log('Drawing affective and psychomotor domains...');
    
    const domainsY = currentY;
    const domainWidth = contentWidth * 0.48;
    const domainGap = 2;
    const affectiveX = (pageWidth - (2 * domainWidth + domainGap)) / 2;
    const psychomotorX = affectiveX + domainWidth + domainGap;

    // Affective Domains
    pdf.setTextColor(26, 37, 47);
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    const spacedAffectiveTitle = 'AFFECTIVE'.split('').join(' ');
    pdf.text(spacedAffectiveTitle, affectiveX + (domainWidth / 2), domainsY, { align: 'center' });

    const affectiveTitleWidth = pdf.getTextWidth(spacedAffectiveTitle);
    pdf.setDrawColor(44, 60, 80);
    pdf.setLineWidth(0.5);
    pdf.line(affectiveX + (domainWidth - affectiveTitleWidth) / 2, domainsY + 1, affectiveX + (domainWidth + affectiveTitleWidth) / 2, domainsY + 1);
    pdf.setLineWidth(1);

    const affectiveTableY = domainsY + 3;
    const affectiveTableHeight = 30;

    pdf.setFillColor(255, 255, 255);
    pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight);

    pdf.setFillColor(26, 37, 47);
    pdf.rect(affectiveX, affectiveTableY, domainWidth, 6, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('times', 'bold');
    
    const affectiveHeaders = ['QUALITY', 'SCORE', 'REMARK'];
    const affectiveWidths = [0.5, 0.2, 0.3];
    let affectiveHeaderX = affectiveX;

    affectiveHeaders.forEach((header, index) => {
      const cellWidth = domainWidth * affectiveWidths[index];
      pdf.text(header, affectiveHeaderX + 1, affectiveTableY + 4);
      affectiveHeaderX += cellWidth;
    });

    const affectiveData = [
      { quality: getDomainName('attentiveness'), score: getStudentAffectiveData().attentiveness || result?.affective?.attentiveness || '4' },
      { quality: getDomainName('honesty'), score: getStudentAffectiveData().honesty || result?.affective?.honesty || '3' },
      { quality: getDomainName('neatness'), score: getStudentAffectiveData().neatness || result?.affective?.neatness || '4' },
      { quality: getDomainName('obedience'), score: getStudentAffectiveData().obedience || result?.affective?.obedience || '2' },
      { quality: getDomainName('sense_of_responsibility'), score: getStudentAffectiveData().sense_of_responsibility || result?.affective?.sense_of_responsibility || '3' }
    ];

    let affectiveRowY = affectiveTableY + 6;
    affectiveData.forEach((item, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(affectiveX, affectiveRowY, domainWidth, 4.8, 'F');
      }

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7);
      let affectiveCellX = affectiveX;

      pdf.setFont('helvetica', '600');
      pdf.text(item.quality, affectiveCellX + 2, affectiveRowY + 3);
      affectiveCellX += domainWidth * 0.5;

      pdf.setFont('helvetica', 'bold');
      pdf.text(item.score, affectiveCellX + domainWidth * 0.1, affectiveRowY + 3, { align: 'center' });
      affectiveCellX += domainWidth * 0.2;

      pdf.setFont('helvetica', 'normal');
      const remark = getAffectiveRemark(parseInt(item.score));
      pdf.text(remark, affectiveCellX + 2, affectiveRowY + 3);

      affectiveRowY += 4.8;
    });

    // Psychomotor Domains
    pdf.setTextColor(26, 37, 47);
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    const spacedPsychomotorTitle = 'PSYCHOMOTOR'.split('').join(' ');
    pdf.text(spacedPsychomotorTitle, psychomotorX + (domainWidth / 2), domainsY, { align: 'center' });

    const psychomotorTitleWidth = pdf.getTextWidth(spacedPsychomotorTitle);
    pdf.setDrawColor(44, 60, 80);
    pdf.setLineWidth(0.5);
    pdf.line(psychomotorX + (domainWidth - psychomotorTitleWidth) / 2, domainsY + 1, psychomotorX + (domainWidth + psychomotorTitleWidth) / 2, domainsY + 1);
    pdf.setLineWidth(1);

    pdf.setFillColor(255, 255, 255);
    pdf.rect(psychomotorX, affectiveTableY, domainWidth, affectiveTableHeight, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(psychomotorX, affectiveTableY, domainWidth, affectiveTableHeight);

    pdf.setFillColor(26, 37, 47);
    pdf.rect(psychomotorX, affectiveTableY, domainWidth, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('times', 'bold');
    pdf.text('SKILL', psychomotorX + 3, affectiveTableY + 4);
    pdf.text('SCORE', psychomotorX + (domainWidth * 0.5), affectiveTableY + 4, { align: 'center' });
    pdf.text('REMARK', psychomotorX + (domainWidth * 0.75), affectiveTableY + 4, { align: 'center' });

    const psychomotorData = [
      { key: 'attention_to_direction', score: getStudentPsychomotorData().attention_to_direction || result?.psychomotor?.attention_to_direction || '4' },
      { key: 'considerate_of_others', score: getStudentPsychomotorData().considerate_of_others || result?.psychomotor?.considerate_of_others || '2' },
      { key: 'handwriting', score: getStudentPsychomotorData().handwriting || result?.psychomotor?.handwriting || '4' },
      { key: 'sports', score: getStudentPsychomotorData().sports || result?.psychomotor?.sports || '3' },
      { key: 'verbal_fluency', score: getStudentPsychomotorData().verbal_fluency || result?.psychomotor?.verbal_fluency || '4' },
      { key: 'works_well_independently', score: getStudentPsychomotorData().works_well_independently || result?.psychomotor?.works_well_independently || result?.psychomotor?.independent_work || '5' }
    ];

    let psychomotorRowY = affectiveTableY + 6;
    psychomotorData.forEach((item, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(248, 249, 250);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(psychomotorX, psychomotorRowY, domainWidth, 4.8, 'F');
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(psychomotorX, psychomotorRowY, domainWidth, 4.8);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(getDomainName(item.key), psychomotorX + 3, psychomotorRowY + 3);

      pdf.setFont('helvetica', 'bold');
      pdf.text(item.score, psychomotorX + (domainWidth * 0.5), psychomotorRowY + 3, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.text(getAffectiveRemark(parseInt(item.score)), psychomotorX + (domainWidth * 0.75), psychomotorRowY + 3, { align: 'center' });

      psychomotorRowY += 4.8;
    });

    console.log('PDF generation completed successfully');

    // Save the PDF
    const filename = `${student.firstName}_${student.lastName}_${result?.term}_${result?.academic_year}_Progress_Report.pdf`;
    pdf.save(filename);
};
