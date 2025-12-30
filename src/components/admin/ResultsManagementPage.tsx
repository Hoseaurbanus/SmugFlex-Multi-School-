import { BarChart, BarChart3, ArrowLeft } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { StudentResultCard } from "../shared/StudentResultCard";
import { FullPageResultView } from "../shared/FullPageResultView";
import { ResultSheetViewerButton } from "./ResultSheetViewer";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

type ViewMode = "management" | "viewAll" | "viewSheets";

export function ResultsManagementPage() {
  const {
    currentUser,
    students,
    teachers,
    classes,
    subjects,
    subjectAssignments,
    compiledResults,
    getPendingApprovals,
    approveCompiledResult,
    getCompiledResultsByYearAndTerm,
    getAllAcademicYears,
    loadCompiledResultsFromAPI,
    currentTerm,
    currentAcademicYear,
    updateCompiledResult,
    deleteCompiledResult,
    addNotification,
    scores,
    affectiveDomains,
    psychomotorDomains,
    schoolSettings,
  } = useSchool();
  
  // Ref for PDF generation
  const resultCardRef = useRef<HTMLDivElement>(null);

  // Direct PDF Download function - Generate from data instead of DOM
  const handleDownloadStudentPDF = async (student: any, result: any) => {
    try {
      console.log('=== DIRECT PDF DOWNLOAD STARTED ===');
      console.log('Student:', student.firstName, student.lastName);
      console.log('Student ID:', student.id);
      console.log('Result ID:', result.id);
      console.log('Student data:', student);
      console.log('Result data:', result);
      console.log('School settings available:', !!(window as any).schoolSettings);
      
      // Generate PDF directly from compiled result data (same as StudentResultSheet)
      await generatePDFFromData(student, result);
      
      console.log('=== DIRECT PDF COMPLETED SUCCESSFULLY ===');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('=== DIRECT PDF GENERATION FAILED ===');
      console.error('Error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  // Generate PDF exactly matching StudentResultSheet design - Complete rebuild using exact structure
  const generatePDFFromData = async (student: any, result: any) => {
    console.log('=== PDF GENERATION - EXACT STUDENTRESULTSHEET MATCH ===');
    
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

    // Exact formatDate from StudentResultSheet
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    // EXACT data fetching from StudentResultCard - no custom logic
    const studentData = student || students.find((s: any) => s.id === result.student_id);
    const studentClassData = classes.find((c: any) => c.id === result.class_id);
    
    // Check if class should show position (not for early childhood classes)
    const shouldShowPosition = studentClassData?.name && 
      !['CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)', 'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)'].includes(studentClassData.name.toUpperCase());
    
    // EXACT same detailed scores loading as StudentResultCard - line by line copy
    let detailedScoresData: any[] = [];
    
    console.log('=== SCORE FETCHING DEBUG ===');
    console.log('Total scores in context:', scores.length);
    console.log('Result student_id:', result.student_id);
    console.log('Result academic_year:', result.academic_year);
    console.log('Result term:', result.term);
    console.log('Result.scores length:', result.scores ? result.scores.length : 0);
    console.log('Sample scores from context:', scores.slice(0, 3));
    
    // EXACT StudentResultCard logic: Filter scores for this student, class, term, and academic year
    let studentScores = scores.filter((score: any) => 
      score.student_id === result.student_id &&
      score.academic_year === result.academic_year &&
      score.term === result.term
    );

    console.log('Filtered studentScores count:', studentScores.length);
    console.log('Sample filtered scores:', studentScores.slice(0, 2));

    // EXACT StudentResultCard logic: Enhance scores with subject information and calculate class statistics
    studentScores = studentScores.map((score: any) => {
      const subjectAssignment = subjectAssignments.find((sa: any) => sa.id === score.subject_assignment_id);
      const subject = subjectAssignment ? subjects.find((s: any) => s.id === subjectAssignment.subject_id) : null;
      const teacher = subjectAssignment ? teachers.find((t: any) => t.id === subjectAssignment.teacher_id) : null;

      // EXACT StudentResultCard logic: Calculate class statistics for this subject
      const classScores = scores.filter((s: any) => {
        const assignment = subjectAssignments.find((sa: any) => sa.id === s.subject_assignment_id);
        return assignment && 
               assignment.subject_id === subjectAssignment?.subject_id &&
               s.academic_year === result.academic_year &&
               s.term === result.term &&
               s.total > 0;
      });

      const validScores = classScores.map((cs: any) => cs.total || 0);
      const classAverage = validScores.length > 0 ? validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length : 0;
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

    // EXACT StudentResultCard logic: If we have result.scores, use them, otherwise use filtered scores
    if (result.scores && result.scores.length > 0) {
      console.log('Using result.scores - StudentResultCard approach');
      console.log('Result.scores data:', result.scores.slice(0, 2));
      // EXACT StudentResultCard logic: Enhance result scores with subject information too
      const enhancedResultScores = result.scores.map((score: any) => {
        const subjectAssignment = subjectAssignments.find((sa: any) => sa.id === score.subject_assignment_id);
        const subject = subjectAssignment ? subjects.find((s: any) => s.id === subjectAssignment.subject_id) : null;
        const teacher = subjectAssignment ? teachers.find((t: any) => t.id === subjectAssignment.teacher_id) : null;

        // EXACT StudentResultCard logic: Calculate class statistics for this subject
        const classScores = scores.filter((s: any) => {
          const assignment = subjectAssignments.find((sa: any) => sa.id === s.subject_assignment_id);
          return assignment && 
                 assignment.subject_id === subjectAssignment?.subject_id &&
                 s.academic_year === result.academic_year &&
                 s.term === result.term &&
                 s.total > 0;
        });

        const validScores = classScores.map((cs: any) => cs.total || 0);
        const classAverage = validScores.length > 0 ? validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length : 0;
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
      detailedScoresData = enhancedResultScores;
    } else {
      console.log('Using filtered studentScores - StudentResultCard approach');
      console.log('Final studentScores data:', studentScores.slice(0, 2));
      detailedScoresData = studentScores;
    }

    console.log('Final detailedScoresData count:', detailedScoresData.length);
    console.log('Final detailedScoresData sample:', detailedScoresData.slice(0, 2));

    // EXACT same grade calculation as StudentResultCard
    const getGrade = (score: number) => {
      if (score >= 80) return { grade: 'A', remark: 'Excellent' };
      if (score >= 70) return { grade: 'B', remark: 'Very Good' };
      if (score >= 60) return { grade: 'C', remark: 'Good' };
      if (score >= 50) return { grade: 'D', remark: 'Satisfactory' };
      if (score >= 45) return { grade: 'E', remark: 'Fair' };
      return { grade: 'F', remark: 'Fail' };
    };

    // EXACT same affective remark as StudentResultCard
    const getAffectiveRemark = (score: number) => {
      if (score === 5) return 'Excellent';
      if (score === 4) return 'Very Good';
      if (score === 3) return 'Good';
      if (score === 2) return 'Fair';
      return 'Poor';
    };

    // EXACT same domain name mapping as StudentResultCard
    const getDomainName = (key: string): string => {
      const affectiveMappings: Record<string, string> = {
        'attentiveness': 'Attentiveness',
        'honesty': 'Honesty',
        'neatness': 'Neatness',
        'obedience': 'Obedience',
        'sense_of_responsibility': 'Sense of Responsibility'
      };

      const psychomotorMappings: Record<string, string> = {
        'attention_to_direction': 'Attention to Direction',
        'considerate_of_others': 'Considerate of Others',
        'handwriting': 'Handwriting',
        'sports': 'Sports',
        'verbal_fluency': 'Verbal Fluency',
        'works_well_independently': 'Works Well Independently'
      };

      return affectiveMappings[key] || psychomotorMappings[key] || key.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
    };

    // EXACT same class teacher name logic as StudentResultCard
    const getClassTeacherName = () => {
      // First priority: Use the teacher name from compiled results (already stored in DB)
      if (result?.class_teacher_name) {
        return result.class_teacher_name;
      }
      
      // Second priority: The class teacher name is already loaded in the class data as 'classTeacher'
      if (studentClassData?.classTeacher) {
        return studentClassData.classTeacher;
      }
      
      // Fallback: If class_teacher_id exists, find the teacher
      if (studentClassData?.classTeacherId) {
        const classTeacher = teachers.find((t: any) => t.id === studentClassData.classTeacherId);
        if (classTeacher) {
          return `${classTeacher.firstName} ${classTeacher.lastName}`;
        }
      }
      
      // Final fallback: Return placeholder
      return '_________________';
    };

    // EXACT same teacher title logic as StudentResultCard
    const teacherTitle = studentClassData?.category === 'Primary' ? 'HEAD TEACHER' : 'PRINCIPAL';

    console.log('Using exact StudentResultSheet data and design');

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
    
    // Add school name in the border (bottom center)
    const schoolNameForBorder = (schoolSettings?.school_name || 'SCHOOL NAME').toUpperCase();
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
          pdf.addImage(
            schoolSettings.school_logo_url, 
            'PNG', 
            pageWidth / 2 - 70, // Centered watermark
            pageHeight / 2 - 70, // Centered watermark
            140, // Large size maintained at 140mm
            140  // Large size maintained at 140mm
          );
          watermarkLoaded = true;
          console.log('Watermark loaded from settings - centered position');
        } catch (error) {
          console.log('Settings watermark failed:', error);
        }
      }
      
      // Second try: exact StudentResultCard primary path
      if (!watermarkLoaded) {
        try {
          const primaryUrl = "./assets/images/school-logo.jpg"; // Exact StudentResultCard path
          pdf.addImage(primaryUrl, 'PNG', pageWidth / 2 - 70, pageHeight / 2 - 70, 140, 140); // Centered
          watermarkLoaded = true;
          console.log('Primary watermark loaded - centered position');
        } catch (error) {
          console.log('Primary watermark failed:', error);
        }
      }
      
      // Third try: exact StudentResultCard fallback path
      if (!watermarkLoaded) {
        try {
          const fallbackUrl = "./assets/images/school-logo.png"; // Exact StudentResultCard fallback
          pdf.addImage(fallbackUrl, 'PNG', pageWidth / 2 - 70, pageHeight / 2 - 70, 140, 140); // Centered
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
        console.log('Primary logo loaded (StudentResultCard path)');
      } catch (error) {
        console.log('Primary logo failed to load:', error);
      }
    }
    
    // Third try: exact StudentResultCard fallback path
    if (!logoLoaded) {
      try {
        const fallbackUrl = "./assets/images/graceland-logo.jpg"; // Exact StudentResultCard fallback
        // Create circular clipping path first
        pdf.setFillColor(255, 255, 255); // White background
        pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'F'); // Filled circle
        pdf.setDrawColor(44, 60, 80); // #2c3e50 border
        pdf.setLineWidth(0.7); // 2px border = 0.7mm
        pdf.circle(pageWidth / 2, headerY + (logoSize / 2), logoSize / 2, 'S'); // Circle border
        pdf.setLineWidth(1); // Reset to default
        
        // Add image within circular bounds
        pdf.addImage(fallbackUrl, 'PNG', logoX, headerY, logoSize, logoSize);
        logoLoaded = true;
        console.log('Fallback logo loaded (StudentResultCard path)');
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
    
    // CENTERED SCHOOL NAME (enhanced visibility and fit)
    let currentTextY = headerY + logoSize + 5; // Increased spacing from 2mm to 5mm for better separation
    pdf.setTextColor(26, 37, 47); // Darker professional color instead of #2c3e50
    pdf.setFontSize(18); // Increased to 18pt for better prominence
    pdf.setFont('times', 'bold'); // Professional Times font instead of helvetica
    const schoolName = (schoolSettings?.school_name || 'SCHOOL NAME').toUpperCase();
    // Reduced letter spacing for better fit
    const spacedSchoolName = schoolName.split('').join(' ');
    addText(spacedSchoolName, pageWidth / 2, currentTextY, 18, 'bold', 'center');
    
    // CENTERED SCHOOL ADDRESS (enhanced visibility)
    currentTextY += 5; // Increased from 3mm to 5mm for better spacing
    pdf.setTextColor(85, 85, 85); // #555
    pdf.setFontSize(9); // Increased from 8pt to 9pt for better readability
    pdf.setFont('helvetica', 'italic');
    addText(schoolSettings?.school_address || 'SCHOOL ADDRESS', pageWidth / 2, currentTextY, 9, 'italic', 'center');
    
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
        { type: 'value', text: studentData ? `${studentData.firstName} ${studentData.lastName}`.toUpperCase() : 'STUDENT NAME', width: 0.35 },
        { type: 'label', text: 'Session:', width: 0.15 },
        { type: 'value', text: result.academic_year || '2024/2025', width: 0.35 }
      ],
      [
        // Row 2: 4 cells - Admission No, Admission No value, Term, Term value
        { type: 'label', text: 'Admission No:', width: 0.15 },
        { type: 'value', text: studentData?.admissionNumber || 'GRA/XXXXX', width: 0.35 },
        { type: 'label', text: 'Term:', width: 0.15 },
        { type: 'value', text: result.term || 'THIRD TERM', width: 0.35 }
      ],
      [
        // Row 3: 4 cells - Class, Class value, Gender, Gender value
        { type: 'label', text: 'Class:', width: 0.15 },
        { type: 'value', text: studentClassData?.name || 'CLASS NAME', width: 0.35 },
        { type: 'label', text: 'Gender:', width: 0.15 },
        { type: 'value', text: studentData?.gender || 'MALE', width: 0.35 }
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
    
    // Student photo (25% width) - exact StudentResultCard with proper gap and border
    const photoX = startX + studentInfoTableWidth + sectionGap; // Use startX and proper gap
    pdf.setDrawColor(0, 0, 0); // Black border like StudentResultCard
    pdf.setLineWidth(0.35); // 1px border = 0.35mm
    pdf.rect(photoX, studentInfoY, studentPhotoWidth, 18); // Photo container with exact dimensions
    pdf.setLineWidth(1); // Reset to default
    
    if (studentData?.photo_url) {
      try {
        pdf.addImage(studentData.photo_url, 'PNG', photoX, studentInfoY, studentPhotoWidth, 18);
      } catch (error) {
        // Fallback text with exact StudentResultCard styling
        pdf.setFillColor(245, 245, 245); // #f5f5f5 background
        pdf.rect(photoX, studentInfoY, studentPhotoWidth, 18, 'F');
        pdf.setTextColor(102, 102, 102); // #666
        pdf.setFontSize(9);
        pdf.text('No Photo', photoX + studentPhotoWidth / 2, studentInfoY + 9, { align: 'center' });
      }
    } else {
      // Fallback with exact StudentResultCard styling
      pdf.setFillColor(245, 245, 245); // #f5f5f5 background
      pdf.rect(photoX, studentInfoY, studentPhotoWidth, 18, 'F');
      pdf.setTextColor(102, 102, 102); // #666
      pdf.setFontSize(9);
      pdf.text('No Photo', photoX + studentPhotoWidth / 2, studentInfoY + 9, { align: 'center' });
    }
    
    currentY = studentInfoY + 30; // Increased from 20 to 30 for more spacing

    // === RESULT TITLE (enhanced visibility and fit) ===
    console.log('Drawing result title...');
    
    const resultTitleY = currentY;
    const resultTitle = `${result?.term || 'THIRD TERM'} RESULT SHEET`;
    pdf.setTextColor(44, 60, 80); // #2c3e50
    pdf.setFontSize(15); // Increased from 13pt to 15pt for better visibility
    pdf.setFont('helvetica', 'bold');
    // Optimized letter spacing for perfect fit
    const spacedTitle = resultTitle.toUpperCase().split('').join(' ');
    pdf.text(spacedTitle, pageWidth / 2, resultTitleY + 5, { align: 'center' });
    
    // Underline for title (exact StudentResultCard: textDecoration: 'underline')
    const titleWidth = pdf.getTextWidth(spacedTitle);
    pdf.setDrawColor(44, 60, 80);
    pdf.setLineWidth(0.5); // Thinner underline
    pdf.line((pageWidth - titleWidth) / 2, resultTitleY + 6, (pageWidth + titleWidth) / 2, resultTitleY + 6);
    pdf.setLineWidth(1); // Reset to default
    
    currentY = resultTitleY + 10; // 1mm margin below title

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
          
          if (cellIndex === 0 || cellIndex >= 2) { // Center align SN, CA, Exams, Total, Grade, Remark
            pdf.text(cellData, cellX + cellWidth / 2, rowY + 3.5, { align: 'center' }); // Adjust Y for 5mm row height
          } else { // Left align Subject with proper padding for larger cell
            pdf.text(cellData, cellX + 2, rowY + 3.5); // Increased padding for 30% subject cell
          }
          
          cellX += cellWidth;
        });
        
        rowY += 5; // Match 5mm row height
      });
    } else {
      // No scores row - add white background to hide watermark
      pdf.setFillColor(255, 255, 255); // White background to hide watermark
      pdf.rect(tableX, rowY, tableWidth, 6, 'F'); // Fill background
      
      pdf.setDrawColor(44, 60, 80);
      pdf.rect(tableX, rowY, tableWidth, 6);
      pdf.setTextColor(128, 128, 128);
      pdf.setFontSize(7);
      pdf.text('No scores available', tableX + tableWidth / 2, rowY + 4, { align: 'center' });
      rowY += 6;
    }
    
    currentY = rowY + 2; // 0.8mm margin below table

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
      `CLASS AVG: ${result?.class_average || '0.00'}`
    ];
    
    // Draw summary cells
    let summaryCellX = summaryX;
    const summaryCellWidth = shouldShowPosition ? summaryWidth / 4 : summaryWidth / 3;
    
    summaryData.forEach((data, index) => {
      // Cell border
      pdf.setDrawColor(44, 60, 80);
      pdf.rect(summaryCellX, summaryY, summaryCellWidth, 8);
      
      // Cell text - Enhanced visibility
      pdf.setTextColor(0, 0, 0); // Pure black for maximum contrast
      pdf.setFontSize(8); // Increased from 7pt to 8pt for better readability
      pdf.setFont('helvetica', 'bold');
      pdf.text(data, summaryCellX + 2, summaryY + 5);
      
      summaryCellX += summaryCellWidth;
    });
    
    currentY = summaryY + 10; // 2mm margin below summary

    // === SIGNATURE SECTION (Exact StudentResultCard copy) ===
    console.log('Drawing signature section...');
    
    const signatureY = currentY;
    const signatureWidth = contentWidth * 0.47; // 47% width each
    const signatureGap = 2; // 2mm gap
    const signatureLeftX = (pageWidth - (2 * signatureWidth + signatureGap)) / 2;
    const signatureRightX = signatureLeftX + signatureWidth + signatureGap;
  
  // Class Teacher Section - Left Side (exact StudentResultCard: 25mm height)
    pdf.setFillColor(248, 249, 250); // #f8f9fa background
    pdf.rect(signatureLeftX, signatureY, signatureWidth, 25, 'F'); // 25mm height
    pdf.setDrawColor(44, 60, 80); // #2c3e50 border
    pdf.rect(signatureLeftX, signatureY, signatureWidth, 25);
    
    // Class Teacher content with proper spacing to prevent overlap
    pdf.setTextColor(44, 60, 80); // #2c3e50
    pdf.setFontSize(7); // 7pt
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLASS TEACHER', signatureLeftX + 2, signatureY + 4); // Increased from 3 to 4
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${getClassTeacherName()}`, signatureLeftX + 2, signatureY + 9); // Increased from 7 to 9
    
    // Comment with proper spacing (exact StudentResultCard: result?.class_teacher_comment || result?.comment)
    const comment = result?.class_teacher_comment || result?.comment || 'Teacher comment will appear here.';
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

  // Affective Domains - exact StudentResultCard structure and styling
  // Affective header (enhanced visibility with standard font)
  pdf.setTextColor(26, 37, 47); // Dark professional color
  pdf.setFontSize(12); // Increased from 10pt to 12pt for better visibility
  pdf.setFont('times', 'bold'); // Professional Times font instead of helvetica
  const spacedAffectiveTitle = 'AFFECTIVE'.split('').join(' ');
  pdf.text(spacedAffectiveTitle, affectiveX + (domainWidth / 2), domainsY, { align: 'center' });

  // Underline for title
  const affectiveTitleWidth = pdf.getTextWidth(spacedAffectiveTitle);
  pdf.setDrawColor(44, 60, 80);
  pdf.setLineWidth(0.5);
  pdf.line(affectiveX + (domainWidth - affectiveTitleWidth) / 2, domainsY + 1, affectiveX + (domainWidth + affectiveTitleWidth) / 2, domainsY + 1);
  pdf.setLineWidth(1);

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
  
  const affectiveHeaders = ['QUALITY', 'SCORE', 'REMARK'];
  const affectiveWidths = [0.5, 0.2, 0.3]; // Exact StudentResultCard percentages
  let affectiveHeaderX = affectiveX;

  affectiveHeaders.forEach((header, index) => {
    const cellWidth = domainWidth * affectiveWidths[index];
    pdf.text(header, affectiveHeaderX + 1, affectiveTableY + 4);
    affectiveHeaderX += cellWidth;
  });

  // Affective table data (exact StudentResultCard structure)
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
    pdf.setFont('helvetica', 'bold');
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
  pdf.line(psychomotorX + (domainWidth - psychomotorTitleWidth) / 2, domainsY + 1, psychomotorX + (domainWidth + psychomotorTitleWidth) / 2, domainsY + 1);
  pdf.setLineWidth(1);

  // Psychomotor table background
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

  // Psychomotor data rows (exact StudentResultCard fields)
  const psychomotorData = [
    { key: 'attention_to_direction', score: result?.psychomotor?.attention_to_direction || '4' },
    { key: 'considerate_of_others', score: result?.psychomotor?.considerate_of_others || '2' },
    { key: 'handwriting', score: result?.psychomotor?.handwriting || '4' },
    { key: 'sports', score: result?.psychomotor?.sports || '3' },
    { key: 'verbal_fluency', score: result?.psychomotor?.verbal_fluency || '4' },
    { key: 'works_well_independently', score: result?.psychomotor?.works_well_independently || '5' }
  ];

  let psychomotorRowY = affectiveTableY + 6;
  psychomotorData.forEach((item, index) => {
    // Alternating colors
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
    } else {
      pdf.setFillColor(255, 255, 255); // White
    }
    pdf.rect(psychomotorX, psychomotorRowY, domainWidth, 4.8, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(psychomotorX, psychomotorRowY, domainWidth, 4.8);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7); // 7pt
    pdf.setFont('helvetica', 'bold');
    pdf.text(getDomainName(item.key), psychomotorX + 3, psychomotorRowY + 3); // Increased from 2 to 3

    pdf.setFont('helvetica', 'bold');
    pdf.text(item.score, psychomotorX + (domainWidth * 0.5), psychomotorRowY + 3, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.text(getAffectiveRemark(parseInt(item.score)), psychomotorX + (domainWidth * 0.75), psychomotorRowY + 3, { align: 'center' });

    psychomotorRowY += 4.8;
  });

  currentY = affectiveTableY + 35; // Move below domains section

  console.log('PDF generation completed successfully');

  // Save the PDF
  const filename = `${student.firstName}_${student.lastName}_${result?.term}_${result?.academic_year}_Progress_Report.pdf`;
  pdf.save(filename);
  };

  // Bulk selection state
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkComment, setBulkComment] = useState("");
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  // const { broadcast } = useNotificationService();

  const [viewMode, setViewMode] = useState<ViewMode>("management");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm);
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [fullPageView, setFullPageView] = useState<{ studentId: number; resultId: number } | null>(null);
  const [principalComment, setPrincipalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);

  const resultSheetRef = useRef<HTMLDivElement>(null);

  // Optimized academic years loading with memoization
  const loadAcademicYears = useMemo(() => async () => {
    try {
      const years = await getAllAcademicYears();
      if (years) {
        setAcademicYears(years);
      }
    } catch (error) {
      console.error('Error loading academic years:', error);
    }
  }, [getAllAcademicYears]);

  // Optimized data loading with caching and real-time updates
  useEffect(() => {
    let isMounted = true;
    let lastUpdate = 0;
    const CACHE_DURATION = 30000; // Reduced to 30 seconds for fresher data
    let refreshInterval: NodeJS.Timeout;
    
    const loadData = async (forceRefresh = false) => {
      const now = Date.now();
      
      // Skip if not enough time passed and not forcing refresh
      if (!forceRefresh && (now - lastUpdate) < CACHE_DURATION) {
        return;
      }
      
      lastUpdate = now;
      
      try {
        // Load all data in parallel for better performance
        await Promise.all([
          loadCompiledResultsFromAPI(),
          loadAcademicYears()
        ]);
      } catch (error) {
        if (isMounted) {
          console.error('Error loading data:', error);
        }
      }
    };
    
    // Initial load
    loadData(true);
    
    // Set up smart refresh - only when window is focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        loadData(true);
      }
    };
    
    // Set up periodic refresh with longer interval
    refreshInterval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        loadData();
      }
    }, 30000); // Refresh every 30 seconds
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadCompiledResultsFromAPI, loadAcademicYears]);

  // Debounced loading for year/term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedYear && selectedTerm) {
        loadResultsForYearAndTerm();
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedTerm]);

  // Optimized historical results loading with caching
  const loadResultsForYearAndTerm = async () => {
    if (selectedYear === currentAcademicYear && selectedTerm === currentTerm) {
      // Load current session results normally
      await loadCompiledResultsFromAPI();
    } else {
      // Load historical results with caching
      try {
        const cacheKey = `historical_${selectedYear}_${selectedTerm}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        const now = Date.now();
        
        // Use cached data if less than 5 minutes old
        if (cached && cacheTime && (now - parseInt(cacheTime)) < 300000) {
          setHistoricalResults(JSON.parse(cached));
          return;
        }
        
        const results = await getCompiledResultsByYearAndTerm(selectedYear, selectedTerm);
        
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify(results));
        localStorage.setItem(`${cacheKey}_time`, now.toString());
        
        setHistoricalResults(results);
      } catch (error) {
        console.error('Error loading historical results:', error);
        setHistoricalResults([]);
      }
    }
  };

  // Filter results based on active tab (must be called before early returns)
  const filteredResults = useMemo(() => {
    // Use historical results if not current term/year, otherwise use compiledResults
    let allResults = (selectedYear === currentAcademicYear && selectedTerm === currentTerm) 
      ? compiledResults 
      : historicalResults;

    let results = allResults.filter(
      (r: any) =>
        r.term === selectedTerm &&
        r.academic_year === selectedYear &&
        (selectedClassId === "all" || String(r.class_id) === selectedClassId)
    );

    // Filter by status based on tab
    if (activeTab === "pending") {
      results = results.filter((r: any) => r.status === "Submitted");
    } else if (activeTab === "approved") {
      results = results.filter((r: any) => r.status === "Approved");
    } else if (activeTab === "rejected") {
      results = results.filter((r: any) => r.status === "Rejected");
    } else if (activeTab === "all") {
      // Show all results EXCEPT rejected ones
      results = results.filter((r: any) => r.status !== "Rejected");
    }

    // Search filter
    if (searchQuery) {
      results = results.filter((r: any) => {
        const student = students.find((s: any) => s.id === r.student_id);
        if (!student) return false;
        const query = searchQuery.toLowerCase();
        return (
          (student.firstName && student.firstName.toLowerCase().includes(query)) ||
          (student.lastName && student.lastName.toLowerCase().includes(query)) ||
          (student.admissionNumber && student.admissionNumber.toLowerCase().includes(query))
        );
      });
    }

    return results;
  }, [compiledResults, historicalResults, selectedTerm, selectedYear, selectedClassId, activeTab, searchQuery, students, currentTerm, currentAcademicYear]);

  // Get students with results
  const studentsWithResults = useMemo(() => {
    return filteredResults
      .map((result: any) => {
        const student = students.find((s: any) => s.id === result.student_id);
        return student ? { ...student, result } : null;
      })
      .filter(Boolean);
  }, [filteredResults, students]);

  // Get selected result
  const selectedResultData = useMemo(() => {
    if (!selectedResult) return null;
    return compiledResults.find((r: any) => r.id === selectedResult);
  }, [selectedResult, compiledResults]);

  const selectedStudent = useMemo(() => {
    if (!selectedResultData) return null;
    return students.find((s: any) => s.id === selectedResultData.student_id);
  }, [selectedResultData, students]);

  // If viewing other pages, render them (after all hooks have been called)
  if (viewMode === "viewAll") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setViewMode("management")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Management
          </Button>
          <h1 className="text-[#0A2540]">View All Results</h1>
        </div>
        <ViewAllResultsPage onBack={() => setViewMode("management")} />
      </div>
    );
  }

  if (viewMode === "viewSheets") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setViewMode("management")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Management
          </Button>
          <h1 className="text-[#0A2540]">View Result Sheets</h1>
        </div>
        <ViewResultSheetsPage onBack={() => setViewMode("management")} />
      </div>
    );
  }

  // Handle approve
  const handleApprove = async (resultId: number) => {
    const result = compiledResults.find((r: any) => r.id === resultId);
    if (!result) return;

    try {
      // First update with print_approved
      await updateCompiledResult(resultId, {
        principal_signature: "", // Can add signature upload later
        print_approved: 1, // Set print approval to true
      });

      // Then approve using the proper approval function
      await approveCompiledResult(resultId);
      
      // Refresh
      await loadCompiledResultsFromAPI();
      
      const student = students.find((s: any) => s.id === result.student_id);
      toast.success(`Result approved for ${student?.firstName} ${student?.lastName || 'Student'}`);
    } catch (error) {
      console.error('Error approving result:', error);
      toast.error('Failed to approve result');
    }
  };

  // Handle reject
  const handleReject = async (resultId: number) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    await updateCompiledResult(resultId, {
      status: "Rejected",
      rejection_reason: rejectionReason,
    });

    // Refresh data to ensure UI updates
    await loadCompiledResultsFromAPI();

    const result = compiledResults.find((r) => r.id === resultId);
    const student = students.find((s) => s.id === result?.student_id);
    
    if (student && result) {
      const notificationData = {
        title: "Result Rejected ⚠",
        message: `${student.firstName} ${student.lastName}'s result for ${result.term} has been rejected. Reason: ${rejectionReason}`,
        type: "warning" as const,
        targetAudience: "all" as const,
        sentBy: currentUser!.id,
      };
      
      // Create real database notification
      await addNotification({
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        targetAudience: notificationData.targetAudience,
        sentBy: notificationData.sentBy,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: []
      });

      // Notify class teacher specifically
      const classInfo = classes.find((c: any) => c.id === result.class_id);
      if (classInfo?.classTeacherId) {
        const classTeacher = teachers.find((t: any) => t.id === classInfo.classTeacherId);
        if (classTeacher) {
          const teacherNotification = {
            title: "Result Rejected - Action Required",
            message: `Result for ${student.firstName} ${student.lastName} (${classInfo.name}) was rejected. Reason: ${rejectionReason}. Please review and resubmit.`,
            type: "warning" as const,
            targetAudience: "teachers" as const,
            sentBy: currentUser!.id,
          };
          // Create real database notification for teacher
          await addNotification({
            title: teacherNotification.title,
            message: teacherNotification.message,
            type: teacherNotification.type,
            targetAudience: teacherNotification.targetAudience,
            sentBy: teacherNotification.sentBy,
            sentDate: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
          
          toast.info(`Notification sent to ${classTeacher.firstName} ${classTeacher.lastName}`);
        }
      }
    }

    toast.warning("Result rejected");
    setRejectionReason("");
    setSelectedResult(null);
  };

  // Handle delete
  const handleDelete = (resultId: number) => {
    if (window.confirm("Are you sure you want to delete this result? This action cannot be undone.")) {
      deleteCompiledResult(resultId);
      toast.success("Result deleted successfully");
      setSelectedResult(null);
    }
  };

  // Handle print with improved PDF generation - only for approved results
  const handlePrint = async () => {
    // Check if result is approved before allowing print
    if (!selectedResultData || selectedResultData.status !== "Approved") {
      toast.error("Only approved results can be printed");
      return;
    }

    if (resultSheetRef.current) {
      try {
        // Create a new window for printing
        const printWindow = window.open("", "_blank", "width=800,height=600");
        if (!printWindow) {
          toast.error("Please allow popups to print result sheets");
          return;
        }

        // Get the content with proper CSS
        const content = resultSheetRef.current.innerHTML;
        const printCSS = `
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            @media print {
              body { 
                margin: 0; 
                font-size: 8pt;
                line-height: 0.9;
              }
              .print-container {
                width: 190mm !important;
                height: 277mm !important;
                overflow: hidden !important;
                page-break-after: always;
              }
              img {
                max-width: 100% !important;
                height: auto !important;
              }
            }
          </style>
        `;

        // Write the complete HTML document
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Result Sheet - ${selectedStudent?.firstName || 'Student'} ${selectedStudent?.lastName || ''}</title>
            ${printCSS}
          </head>
          <body>
            ${content}
          </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          toast.success("Result sheet printed successfully");
        }, 1000);

      } catch (error) {
        console.error('Error printing result sheet:', error);
        toast.error("Failed to print result sheet. Please try again.");
      }
    }
  };


  // Bulk selection handlers
  const handleSelectResult = (resultId: number) => {
    setSelectedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  const handleSelectAll = () => {
    if (selectedResults.length === filteredResults.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(filteredResults.map(r => r.id));
    }
  };

  // Bulk approve function
  const handleBulkApprove = async () => {
    if (selectedResults.length === 0) return;

    try {
      for (const resultId of selectedResults) {
        await updateCompiledResult(resultId, {
          status: "Approved",
          approved_by: currentUser?.id,
          approved_date: new Date().toISOString(),
          print_approved: 1, // Set print approval to true
        });
        await approveCompiledResult(resultId);
      }

      toast.success(`Approved ${selectedResults.length} results successfully!`);
      setSelectedResults([]);
      setBulkComment("");
      setShowBulkApproveDialog(false);
      await loadCompiledResultsFromAPI();
    } catch (error) {
      console.error('Error in bulk approval:', error);
      toast.error('Failed to approve some results');
    }
  };

  // Bulk reject function
  const handleBulkReject = async () => {
    if (!bulkRejectionReason.trim()) {
      toast.error("Please provide a reason for bulk rejection");
      return;
    }

    for (const resultId of selectedResults) {
      const result = compiledResults.find((r) => r.id === resultId);
      const student = students.find((s) => s.id === result?.student_id);
      
      updateCompiledResult(resultId, {
        status: "Rejected",
        rejection_reason: bulkRejectionReason,
      });

      // Notify class teacher for correction
      if (student && result) {
        const classInfo = classes.find((c: any) => c.id === result.class_id);
        if (classInfo?.classTeacherId) {
          const classTeacher = teachers.find((t: any) => t.id === classInfo.classTeacherId);
          if (classTeacher) {
            // Create notification for teacher
            const teacherNotification = {
              title: "Result Rejected - Action Required",
              message: `Result for ${student.firstName} ${student.lastName} (${classInfo.name}) was rejected. Reason: ${bulkRejectionReason}. Please review and resubmit.`,
              type: "warning" as const,
              targetAudience: "teachers" as const,
              sentBy: currentUser!.id,
              sentDate: new Date().toISOString(),
            };
            
            // Create real database notification
            await addNotification({
              title: teacherNotification.title,
              message: teacherNotification.message,
              type: teacherNotification.type,
              targetAudience: teacherNotification.targetAudience,
              sentBy: teacherNotification.sentBy,
              sentDate: teacherNotification.sentDate,
              isRead: false,
              readBy: []
            });
            
            toast.info(`Notification sent to ${classTeacher.firstName} ${classTeacher.lastName}`);
          }
        }
      }
    }

    toast.warning(`Rejected ${selectedResults.length} results! Teachers notified for corrections.`);
    setSelectedResults([]);
    setBulkRejectionReason("");
    setShowBulkRejectDialog(false);
  };

  // Get results for current class (bulk operations)
  const classResults = useMemo(() => {
    if (!selectedClassId || selectedClassId === "all") return filteredResults;
    return filteredResults.filter(r => r.class_id === parseInt(selectedClassId));
  }, [filteredResults, selectedClassId]);

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 max-w-full overflow-x-hidden">
      {/* Compact Header - Mobile Responsive */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Results Management</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Approve and manage student results</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadCompiledResultsFromAPI();
                loadResultsForYearAndTerm();
              }}
              className="flex items-center gap-2 h-8 text-xs"
            >
              <span className="w-3 h-3" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("viewAll")}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 h-8 text-xs"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              All Results
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const approvedResult = compiledResults.find(cr => cr.print_approved === 1);
                if (approvedResult) {
                  const student = students.find(s => s.id === approvedResult.student_id);
                  if (student) {
                    handleDownloadStudentPDF(student, approvedResult);
                  }
                } else {
                  toast.error('No approved results available for download');
                }
              }}
              className="border-green-200 text-green-700 hover:bg-green-50 h-8 text-xs"
            >
              <span className="w-3 h-3 mr-1" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year} className="text-xs sm:text-sm">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term" className="text-xs sm:text-sm">First</SelectItem>
                  <SelectItem value="Second Term" className="text-xs sm:text-sm">Second</SelectItem>
                  <SelectItem value="Third Term" className="text-xs sm:text-sm">Third</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-xs sm:text-sm">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-gray-600 mb-1 block">Search</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <Input
                  placeholder="Student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              Showing {filteredResults.length} results
            </div>
            <div className="flex items-center gap-2">
              {selectedYear !== currentAcademicYear || selectedTerm !== currentTerm ? (
                <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                  <span className="w-3 h-3" />
                  <span>Historical</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <span className="w-3 h-3" />
                  <span>Current</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-gray-50 rounded-lg p-1 h-8 sm:h-9 gap-1">
          <TabsTrigger value="pending" className="rounded-md text-xs data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800">
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">P</span>
            ({compiledResults.filter(r => r.status === "Submitted" && r.term === selectedTerm && r.academic_year === selectedYear).length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-md text-xs data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
            <span className="hidden sm:inline">Approved</span>
            <span className="sm:hidden">A</span>
            ({compiledResults.filter(r => r.status === "Approved" && r.term === selectedTerm && r.academic_year === selectedYear).length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-md text-xs data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
            <span className="hidden sm:inline">Rejected</span>
            <span className="sm:hidden">R</span>
            ({compiledResults.filter(r => r.status === "Rejected" && r.term === selectedTerm && r.academic_year === selectedYear).length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-md text-xs data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
            <span className="hidden sm:inline">All</span>
            <span className="sm:hidden">All</span>
            ({compiledResults.filter(r => r.status !== "Rejected" && r.term === selectedTerm && r.academic_year === selectedYear).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Compact Bulk Actions */}
          {activeTab === "pending" && filteredResults.length > 0 && (
            <Card className="border-gray-200 shadow-sm mb-3">
              <CardContent className="p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-xs sm:text-sm text-gray-600">
                      {selectedResults.length} of {filteredResults.length} selected
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowBulkApproveDialog(true)}
                      disabled={selectedResults.length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white h-7 sm:h-8 text-xs"
                    >
                      <span className="w-3 h-3 mr-1" />
                      Approve ({selectedResults.length})
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkRejectDialog(true)}
                      disabled={selectedResults.length === 0}
                      variant="destructive"
                      className="h-7 sm:h-8 text-xs"
                    >
                      <span className="w-3 h-3 mr-1" />
                      Reject ({selectedResults.length})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact Results List */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                {activeTab === "pending" && "Pending Approval"}
                {activeTab === "approved" && "Approved Results"}
                {activeTab === "rejected" && "Rejected Results"}
                {activeTab === "all" && "All Results"}
                <span className="ml-2 text-xs text-gray-500">({filteredResults.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {studentsWithResults.length === 0 ? (
                <div className="text-center py-8">
                  <span className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No results found</p>
                  <p className="text-xs text-gray-400">
                    {activeTab === "pending" && "No results pending approval"}
                    {activeTab === "approved" && "No approved results"}
                    {activeTab === "rejected" && "No rejected results"}
                    {activeTab === "all" && "No results available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentsWithResults.map((studentData) => (
                    <div
                      key={studentData!.id}
                      className="p-2 sm:p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          {activeTab === "pending" && (
                            <input
                              type="checkbox"
                              checked={selectedResults.includes(studentData!.result.id)}
                              onChange={() => handleSelectResult(studentData!.result.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 mt-1"
                            />
                          )}
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {studentData!.firstName[0]}
                            {studentData!.lastName[0]}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base font-semibold text-gray-800 leading-tight truncate">
                              {studentData!.firstName} {studentData!.lastName}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">
                              {studentData!.admissionNumber} • {studentData!.className}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                              <p className="text-xs text-gray-500 font-medium">Average</p>
                              <p className="text-base sm:text-lg font-bold text-gray-800">
                                {studentData!.result.average_score}%
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-xs text-gray-500 font-medium">Position</p>
                              <Badge className="bg-green-50 text-green-700 border-green-200 rounded-lg text-xs font-medium px-2 py-1">
                                {studentData!.result.position}/{studentData!.result.total_students}
                              </Badge>
                            </div>

                            <div>
                              <Badge
                                className={`rounded-lg text-xs font-medium px-2 py-1 ${
                                  studentData!.result.status === "Submitted"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : studentData!.result.status === "Approved"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {studentData!.result.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-200 text-purple-700 hover:bg-purple-50 h-7 sm:h-8 text-xs"
                              onClick={() => setFullPageView({ studentId: studentData!.id, resultId: studentData!.result.id })}
                            >
                              <span className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              className={studentData!.result.status === 'Approved' ? "border-green-200 text-green-700 hover:bg-green-50 h-7 sm:h-8 text-xs" : "border-gray-200 text-gray-500 hover:bg-gray-50 h-7 sm:h-8 text-xs"}
                              onClick={() => handleDownloadStudentPDF(studentData!, studentData!.result)}
                            >
                              <span className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">{studentData!.result.status === 'Approved' ? 'Download PDF' : `PDF (${studentData!.result.status})`}</span>
                              <span className="sm:hidden">PDF</span>
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl h-7 sm:h-8 text-xs"
                                  onClick={() => setSelectedResult(studentData!.result.id)}
                                >
                                  <span className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Review</span>
                                  <span className="sm:hidden">R</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-full max-h-[95vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '1200px' }}>
                                <DialogHeader>
                                  <DialogTitle>
                                    Review Result - {studentData!.firstName} {studentData!.lastName}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Review and approve or reject student results
                                  </DialogDescription>
                                </DialogHeader>

                              <div className="space-y-6">
                                {/* Result Card */}
                                <div id={`result-card-${studentData!.result.id}`} ref={resultCardRef} className="w-full overflow-auto">
                                  <StudentResultCard
                                    result={studentData!.result}
                                    currentUser={currentUser}
                                  />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                  <Button
                                    variant="outline"
                                    onClick={() => setSelectedResult(null)}
                                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setBulkRejectionReason("");
                                      setShowBulkRejectDialog(true);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setBulkComment("");
                                      setShowBulkApproveDialog(true);
                                    }}
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                  >
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Approve Dialog */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-green-600">Bulk Approve Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to approve {selectedResults.length} result(s). This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <span className="w-4 h-4 mr-2" />
                Approve {selectedResults.length} Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkApproveDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Bulk Reject Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to reject {selectedResults.length} result(s). This action cannot be undone.
            </p>
            <div>
              <Label className="text-sm font-medium">Rejection Reason</Label>
              <Textarea
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleBulkReject}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <span className="w-4 h-4 mr-2" />
                Reject {selectedResults.length} Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkRejectDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Page Result View */}
      {fullPageView && (
        <FullPageResultView
          studentId={fullPageView.studentId}
          resultId={fullPageView.resultId}
          onClose={() => setFullPageView(null)}
        />
      )}
    </div>
  );
}

function ViewAllResultsPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button onClick={onBack || (() => {})} variant="outline" className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Management
        </Button>
        <h2 className="text-2xl font-bold">All Results</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">View all results functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ViewResultSheetsPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button onClick={onBack || (() => {})} variant="outline" className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Management
        </Button>
        <h2 className="text-2xl font-bold">Result Sheets</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">View result sheets functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
