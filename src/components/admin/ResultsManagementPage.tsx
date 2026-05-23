import { BarChart, BarChart3, ArrowLeft, Download, Eye, ClipboardCheck } from 'lucide-react';
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
import { ViewAllResultsPage } from "./ViewAllResultsPage";
import { ViewResultSheetsPage } from "./ViewResultSheetsPage";
import { FullPageResultView } from "../shared/FullPageResultView";
import { ResultSheetViewerButton } from "./ResultSheetViewer";
import { CumulativeResultSheet } from "../CumulativeResultSheet";
import { shouldShowPosition as checkShouldShowPosition, getGrade } from "../../utils/classHelpers";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import schoolLogo from "../../assets/images/school-logo.jpg";
import { API_CONFIG } from "../../config/api";
import { formatPositionWithSuffix } from "../../utils/position";
import { generatePDFFromData as generateStudentResultPdf, generateCumulativePDF } from "../../utils/pdfGenerator";

type ViewMode = "management" | "viewAll" | "viewSheets";

class ResultsManagementErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    // Silent fail for security
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Results Management Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-700">
                The page encountered an error and could not render.
              </div>
              <div className="text-xs text-gray-500 break-words">{this.state.message}</div>
              <div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

class FullPageErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch() {
    // silent
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <Card className="border-red-200 max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-red-700">Error Loading Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-700">
                The result could not be displayed due to an error.
              </div>
              <div className="text-xs text-gray-500 break-words bg-gray-50 p-2 rounded border">
                {this.state.message}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button variant="default" onClick={this.props.onClose}>
                  Back to Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    loadClassesFromAPI,
    currentTerm,
    currentAcademicYear,
    updateCompiledResult,
    deleteCompiledResult,
    addNotification,
    scores,
    affectiveDomains,
    psychomotorDomains,
    schoolSettings,
    loadSchoolSettings,
    cumulativeResults,
    loadCumulativeResultsFromAPI,
    compileCumulativeResults,
    loadingCumulative,
  } = useSchool();

  if (!currentUser) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Results Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-gray-700">You must be logged in to view this page.</div>
            <div className="text-xs text-gray-500">If you just logged in, refresh the page.</div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Ref for PDF generation
  const resultCardRef = useRef<HTMLDivElement>(null);

  const downloadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [downloadingResultIds, setDownloadingResultIds] = useState<Record<number, boolean>>({});

  const [isClosingFullPageView, setIsClosingFullPageView] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const closeFullPageView = () => {
    setIsClosingFullPageView(true);
    setFullPageView(null);
    window.setTimeout(() => setIsClosingFullPageView(false), 250);
  };

  // Direct PDF Download function - Generate from data instead of DOM
  const handleDownloadStudentPDF = async (student: any, result: any) => {
    const resultId = Number(result?.id);
    if (resultId && downloadingResultIds[resultId]) {
      return;
    }

    if (resultId) {
      // Mark as queued immediately so repeated clicks for the same row don't
      // enqueue duplicate downloads while still allowing other rows to be clicked.
      setDownloadingResultIds(prev => ({ ...prev, [resultId]: true }));
    }

    // Queue downloads so the browser always treats each save as a deliberate
    // user-triggered download and we don't overlap jsPDF/file operations.
    // Overlapping downloads can cause later clicks to appear to do nothing
    // until a hard refresh.
    const doDownload = async () => {
      try {
        const context = {
          schoolSettings,
          teachers,
          classes,
          scores,
          affectiveDomains,
          psychomotorDomains,
        };

        await generateStudentResultPdf(student, result, context, {
          downloadMethod: 'blob',
        });
        toast.success('PDF downloaded successfully!');
      } catch (error) {
        toast.error('Failed to generate PDF. Please try again.');
      } finally {
        setDownloadingResultIds(prev => {
          const next = { ...prev };
          delete next[resultId];
          return next;
        });
      }
    };

    downloadQueueRef.current = downloadQueueRef.current.then(doDownload, doDownload);
    await downloadQueueRef.current;
  };

  // Generate PDF exactly matching StudentResultSheet design - Complete rebuild using exact structure
  const generatePDFFromData = async (student: any, result: any) => {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false
    });

    const resolveImageToDataUrl = async (src: string): Promise<string> => {
      if (!src) return '';
      if (typeof src === 'string' && src.startsWith('data:image/')) return src;

      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(blob);
      });

      return dataUrl;
    };

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
    const studentData = student || students.find((s: any) => Number(s.id) === Number(result.student_id));
    const classIdToUse = (result as any)?.class_id ?? (result as any)?.classId ?? (studentData as any)?.class_id ?? (studentData as any)?.classId;
    const studentClassData = classes.find((c: any) => Number(c.id) === Number(classIdToUse));
    
    // Check if class should show position (not for early childhood classes)
    const classNameForPosition = (studentClassData as any)?.name || (studentClassData as any)?.className || '';
    const shouldShowPosition = classNameForPosition &&
      !['CRECHE', 'KG1', 'KG2', 'CRECHE (ONYX)', 'KG 1', 'KG 2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'KG 1 (SARDIUS)', 'KG 1 (SARDONYX)', 'KG 2 (SARDIUS)', 'KG 2 (SARDONYX)', 'KG 2 (PEARL)'].includes(String(classNameForPosition).toUpperCase());
    
    // EXACT same detailed scores loading as StudentResultCard - line by line copy
    let detailedScoresData: any[] = [];
    
    // EXACT StudentResultCard logic: Filter scores for this student, class, term, and academic year
    let studentScores = scores.filter((score: any) => 
      score.student_id === result.student_id &&
      score.academic_year === result.academic_year &&
      score.term === result.term
    );

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
      detailedScoresData = studentScores;
    }

    // EXACT same grade calculation as StudentResultCard
    const getGrade = (score: number) => {
      if (score >= 90) return { grade: 'A', remark: 'Excellent' };
      if (score >= 80) return { grade: 'B', remark: 'Very Good' };
      if (score >= 70) return { grade: 'C', remark: 'Good' };
      if (score >= 60) return { grade: 'D', remark: 'Satisfactory' };
      if (score >= 50) return { grade: 'E', remark: 'Fair' };
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

    // Get student's affective domain data - same as StudentResultCard
    const getStudentAffectiveData = () => {
      if (!result || !result.student_id) return {} as any;
      
      const studentAffective = affectiveDomains.find(domain => 
        domain.student_id === result.student_id &&
        domain.academic_year === result.academic_year &&
        domain.term === result.term
      );
      
      return studentAffective || {} as any;
    };

    // Get student's psychomotor domain data - same as StudentResultCard
    const getStudentPsychomotorData = () => {
      if (!result || !result.student_id) return {} as any;
      
      const studentPsychomotor = psychomotorDomains.find(domain => 
        domain.student_id === result.student_id &&
        domain.academic_year === result.academic_year &&
        domain.term === result.term
      );
      
      return studentPsychomotor || {} as any;
    };

    // EXACT same class teacher name logic as StudentResultCard
    const getClassTeacherName = () => {
      // First priority: Use result data (from compiled result)
      if (result?.class_teacher_name) {
        return result.class_teacher_name;
      }
      
      // Second priority: Check if class has a teacher assigned
      if (studentClassData?.classTeacherId) {
        const classTeacher = teachers.find((t: any) => t.id === studentClassData.classTeacherId);
        if (classTeacher) {
          return `${classTeacher.firstName} ${classTeacher.lastName}`;
        }
      }
      
      // Third priority: The class teacher name is already loaded in the class data as 'classTeacher'
      if (studentClassData?.classTeacher) {
        return studentClassData.classTeacher;
      }
      
      // Final fallback: Return placeholder
      return '_________________';
    };

    // EXACT same teacher title logic as StudentResultCard
    const teacherTitle = studentClassData?.category === 'Primary' ? 'HEAD TEACHER' : 'PRINCIPAL';

    // === PAGE BACKGROUND (Exact StudentResultCard: background: white) ===
    // Pure white background to match StudentResultCard exactly
    pdf.setFillColor(255, 255, 255); // Pure white (#ffffff) - exact match to StudentResultCard
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Reset to white for content areas
    pdf.setFillColor(255, 255, 255);

    // NOTE: Background/watermark and page border intentionally removed (requested).

    // === HEADER SECTION (Exact StudentResultCard structure - what you see in view button) ===
    // Header container - exact StudentResultCard: centered layout
    const headerY = currentY;
    
    // CENTERED LOGO (exact StudentResultCard: 18mm x 18mm, circular)
    const logoSize = 18; // 18mm as in StudentResultCard
    const logoX = pageWidth / 2 - (logoSize / 2); // Centered
    
    // Try to load logo from multiple sources. To avoid blur, we render a high-resolution
    // circular PNG via canvas first, then embed that PNG into the PDF.
    const logoStrokeColor: [number, number, number] = [0, 51, 102]; // Dark blue
    const logoStrokeWidthMm = 0.8;
    const logoCenterX = pageWidth / 2;
    const logoCenterY = headerY + (logoSize / 2);
    const logoRadius = logoSize / 2;

    const createCircularPngDataUrl = async (src: string, sizePx: number): Promise<string> => {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = src;
      });

      const canvas = document.createElement('canvas');
      canvas.width = sizePx;
      canvas.height = sizePx;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Crop image to a centered square first
      const s = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
      const sx = ((img.naturalWidth || img.width) - s) / 2;
      const sy = ((img.naturalHeight || img.height) - s) / 2;

      // Draw circular clipped image at high resolution
      ctx.clearRect(0, 0, sizePx, sizePx);
      ctx.beginPath();
      ctx.arc(sizePx / 2, sizePx / 2, sizePx / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, s, s, 0, 0, sizePx, sizePx);

      return canvas.toDataURL('image/png');
    };

    let logoLoaded = false;
    const logoCandidates = [
      // Use same asset as LoginPage first to guarantee a reliable logo.
      schoolLogo,
      schoolSettings?.school_logo_url,
      './assets/images/graceland-logo.jpg',
    ].filter(Boolean) as string[];

    for (const candidate of logoCandidates) {
      try {
        // 18mm in PDF is small; use a larger raster to keep it crisp.
        const hiResPx = 512;
        const circularLogoPng = await createCircularPngDataUrl(candidate, hiResPx);
        pdf.addImage(circularLogoPng, 'PNG', logoX, headerY, logoSize, logoSize);
        logoLoaded = true;
        break;
      } catch (e) {
        // Try next candidate
      }
    }

    if (!logoLoaded) {
      // Fallback: show text inside a circle
      pdf.setFillColor(255, 255, 255);
      pdf.circle(logoCenterX, logoCenterY, logoRadius, 'F');
      pdf.setTextColor(logoStrokeColor[0], logoStrokeColor[1], logoStrokeColor[2]);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LOGO', logoCenterX, logoCenterY + 2, { align: 'center' });
    }

    // Dark blue circular stroke (requested)
    pdf.setDrawColor(logoStrokeColor[0], logoStrokeColor[1], logoStrokeColor[2]);
    pdf.setLineWidth(logoStrokeWidthMm);
    pdf.circle(logoCenterX, logoCenterY, logoRadius, 'S');
    pdf.setLineWidth(1);
    
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

    // CENTERED SCHOOL PHONE NUMBER (under email)
    currentTextY += 5; // Spacing consistent with address/email
    pdf.setFont('helvetica', 'normal');
    const schoolPhone =
      (schoolSettings as any)?.school_phone ||
      (schoolSettings as any)?.school_phone_number ||
      (schoolSettings as any)?.school_contact_phone ||
      '';
    addText(schoolPhone || 'Phone: __________', pageWidth / 2, currentTextY, 9, 'normal', 'center');
    
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
    
    // Student info table content - Better organized layout
    const studentDobText =
      (studentData as any)?.date_of_birth ||
      (studentData as any)?.dateOfBirth ||
      (studentData as any)?.dob ||
      '';

    const resolvedStudentName = (() => {
      const first =
        (studentData as any)?.firstName ||
        (studentData as any)?.first_name ||
        '';
      const last =
        (studentData as any)?.lastName ||
        (studentData as any)?.last_name ||
        '';
      const other =
        (studentData as any)?.otherName ||
        (studentData as any)?.other_name ||
        '';

      return `${String(last).trim()} ${String(first).trim()} ${String(other).trim()}`.replace(/\s+/g, ' ').trim();
    })();

    const totalStudentsInClass = students.filter((s: any) => {
      const sClassId = (s as any)?.class_id ?? (s as any)?.classId;
      if (classIdToUse === undefined || classIdToUse === null || classIdToUse === '') return false;
      if (Number(sClassId) !== Number(classIdToUse)) return false;

      const status = String((s as any)?.status || '').toLowerCase();
      if (status === 'inactive') return false;

      return true;
    }).length;

    const studentClassNameText =
      (studentClassData as any)?.name ||
      (studentClassData as any)?.className ||
      (result as any)?.class_name ||
      (result as any)?.className ||
      (studentData as any)?.class_name ||
      (studentData as any)?.className ||
      '';

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

    const rowHeight = 4.4;
    const studentInfoTableHeight = rowHeight * 5;

    const signatureResumptionDate = await getSignatureResumptionDate(String((result as any)?.academic_year || ''), String((result as any)?.term || ''));

    const compiledNext = String((result as any)?.next_term_begin ?? '').trim();
    const compiledNextValid = compiledNext !== '' && compiledNext !== '0000-00-00' && compiledNext !== '0000-00-00 00:00:00';
    const nextTermBeginValue =
      signatureResumptionDate ||
      (compiledNextValid ? compiledNext : '') ||
      '';

    const tableData: Array<Array<{ type: 'label' | 'value'; text: string; width: number }>> = [
      [
        { type: 'label', text: 'Name:', width: 0.15 },
        { type: 'value', text: String((resolvedStudentName || '').toUpperCase()), width: 0.35 },
        { type: 'label', text: 'Session:', width: 0.15 },
        { type: 'value', text: String((result as any)?.academic_year || ''), width: 0.35 },
      ],
      [
        { type: 'label', text: 'Admission No:', width: 0.15 },
        { type: 'value', text: String((studentData as any)?.admissionNumber || (studentData as any)?.admission_number || ''), width: 0.35 },
        { type: 'label', text: 'Term:', width: 0.15 },
        { type: 'value', text: String((result as any)?.term || ''), width: 0.35 },
      ],
      [
        { type: 'label', text: 'Class:', width: 0.15 },
        { type: 'value', text: String(studentClassNameText || ''), width: 0.35 },
        { type: 'label', text: 'Gender:', width: 0.15 },
        { type: 'value', text: String((studentData as any)?.gender || ''), width: 0.35 },
      ],
      [
        { type: 'label', text: 'Attendance:', width: 0.15 },
        { type: 'value', text: `${(result as any)?.times_present || 0} / ${(result as any)?.total_attendance_days || 0} days`, width: 0.35 },
        { type: 'label', text: 'Total in Class:', width: 0.15 },
        { type: 'value', text: String(totalStudentsInClass || 0), width: 0.35 },
      ],
      [
        { type: 'label', text: 'Date of Birth:', width: 0.15 },
        { type: 'value', text: String(studentDobText || ''), width: 0.35 },
        { type: 'label', text: 'Next Term Begins:', width: 0.15 },
        { type: 'value', text: String(nextTermBeginValue || ''), width: 0.35 },
      ],
    ];

    pdf.setDrawColor(44, 60, 80); // #2c3e50 border
    pdf.setLineWidth(0.7); // 2px border = 0.7mm
    pdf.rect(startX, studentInfoY, studentInfoTableWidth, studentInfoTableHeight);
    pdf.setLineWidth(1); // Reset to default
    
    let studentInfoTableY = studentInfoY;
    tableData.forEach((row, rowIndex) => {
      let cellX = startX;
      
      row.forEach((cell, cellIndex) => {
        // Skip empty cells
        if (!cell.text || cell.width === 0) {
          cellX += studentInfoTableWidth * cell.width;
          return;
        }
        
        // Calculate cell width based on predefined percentages
        const cellWidth = studentInfoTableWidth * cell.width;

        const fitText = (text: string, maxWidth: number) => {
          if (!text) return '';
          if (pdf.getTextWidth(text) <= maxWidth) return text;
          const ellipsis = '...';
          const ellipsisWidth = pdf.getTextWidth(ellipsis);
          let trimmed = text;
          while (trimmed.length > 0 && pdf.getTextWidth(trimmed) + ellipsisWidth > maxWidth) {
            trimmed = trimmed.slice(0, -1);
          }
          return trimmed.length > 0 ? trimmed + ellipsis : ellipsis;
        };
        
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
          pdf.text(fitText(cell.text, cellWidth - 2), cellX + 1, studentInfoTableY + 3); // 1mm padding
        } else {
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text(fitText(cell.text, cellWidth - 2), cellX + 1, studentInfoTableY + 3); // 1mm padding
        }
        
        cellX += cellWidth;
      });
      
      studentInfoTableY += rowHeight;
    });

    // Student photo (25% width) - exact StudentResultCard with proper gap and border
    const photoX = startX + studentInfoTableWidth + sectionGap; // Use startX and proper gap
    pdf.setDrawColor(0, 0, 0); // Black border like StudentResultCard
    pdf.setLineWidth(0.35); // 1px border = 0.35mm
    pdf.rect(photoX, studentInfoY, studentPhotoWidth, studentPhotoHeight); // Photo container with exact dimensions
    pdf.setLineWidth(1); // Reset to default

    const rawPhotoUrl =
      (studentData as any)?.photo_url ||
      (studentData as any)?.photoUrl ||
      (studentData as any)?.photoURL ||
      '';

    const buildStudentPhotoCandidates = (): string[] => {
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

    const getPhotoFormat = (src: string): 'PNG' | 'JPEG' => {
      if (
        typeof src === 'string' &&
        (src.toLowerCase().includes('image/jpeg') ||
          src.toLowerCase().includes('image/jpg') ||
          src.toLowerCase().endsWith('.jpg') ||
          src.toLowerCase().endsWith('.jpeg'))
      ) {
        return 'JPEG';
      }
      return 'PNG';
    };

    const photoCandidates = buildStudentPhotoCandidates();
    let embeddedPhotoDataUrl = '';
    let embeddedPhotoFormat: 'PNG' | 'JPEG' = 'PNG';

    if (photoCandidates.length > 0) {
      for (const candidate of photoCandidates) {
        try {
          embeddedPhotoDataUrl = await resolveImageToDataUrl(candidate);
          embeddedPhotoFormat = getPhotoFormat(candidate);
          break;
        } catch {
          // try next candidate
        }
      }
    }

    if (embeddedPhotoDataUrl) {
      pdf.addImage(embeddedPhotoDataUrl, embeddedPhotoFormat as any, photoX, studentInfoY, studentPhotoWidth, studentPhotoHeight);
    } else {
      // Fallback with exact StudentResultCard styling
      pdf.setFillColor(245, 245, 245); // #f5f5f5
      pdf.rect(photoX, studentInfoY, studentPhotoWidth, studentPhotoHeight, 'F');
      pdf.setTextColor(102, 102, 102); // #666
      pdf.setFontSize(9);
      pdf.text('No Photo', photoX + studentPhotoWidth / 2, studentInfoY + (studentPhotoHeight / 2), { align: 'center' });
    }

    currentY = studentInfoY + 30; // Increased from 20 to 30 for more spacing

    // === RESULT TITLE (enhanced visibility and fit) ===
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
    
    const summaryData = shouldShowPosition
      ? [
          `TOTAL: ${result?.total_score || '0.00'}`,
          `AVG: ${result?.average_score || '0.00'}`,
          `CLASS AVG: ${result?.class_average || '0.00'}`,
          `POS: ${formatPositionWithSuffix(result?.position)}`
        ]
      : [
          `TOTAL: ${result?.total_score || '0.00'}`,
          `AVG: ${result?.average_score || '0.00'}`,
          `CLASS AVG: ${result?.class_average || '0.00'}`,
          `GRADE: ${getGrade(Number(result?.average_score || 0)).grade}`
        ];
    
    // Draw summary cells
    let summaryCellX = summaryX;
    const summaryCellWidth = summaryWidth / 4;
    
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
    const signatureY = currentY;
    const signatureWidth = contentWidth * 0.47; // 47% width each
    const signatureGap = 2; // 2mm gap
    const signatureLeftX = (pageWidth - (2 * signatureWidth + signatureGap)) / 2;
    const signatureRightX = signatureLeftX + signatureWidth + signatureGap;
  
  // Class Teacher Section - Left Side (exact StudentResultCard: 25mm height)
    pdf.setFillColor(248, 249, 250); // #f8f9fa background
    const signatureBlockHeight = 30;
    pdf.rect(signatureLeftX, signatureY, signatureWidth, signatureBlockHeight, 'F');
    pdf.setDrawColor(44, 60, 80); // #2c3e50 border
    pdf.setLineWidth(0.7);
    pdf.rect(signatureLeftX, signatureY, signatureWidth, signatureBlockHeight);
    pdf.setLineWidth(1);
    
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
    {
      const commentLabel = 'Comment: ';
      const commentText = `${commentLabel}${comment}`;
      const maxWidth = signatureWidth - 4;
      const wrapped = pdf.splitTextToSize(commentText, maxWidth);
      const maxLines = 2;
      const lines = wrapped.slice(0, maxLines);
      pdf.text(lines, signatureLeftX + 2, signatureY + 14);
    }
    
    // Principal/Head Teacher Section - Right Side (exact StudentResultCard: 30mm height)
    pdf.setFillColor(248, 249, 250); // #f8f9fa background
    pdf.rect(signatureRightX, signatureY, signatureWidth, signatureBlockHeight, 'F');
    pdf.setDrawColor(44, 60, 80); // #2c3e50 border
    pdf.setLineWidth(0.7);
    pdf.rect(signatureRightX, signatureY, signatureWidth, signatureBlockHeight);
    pdf.setLineWidth(1);
    
    // Principal/Head Teacher content with proper spacing to prevent overlap
    const classTextForSection = String(
      (studentClassData as any)?.level ||
        (studentClassData as any)?.section ||
        (studentClassData as any)?.name ||
        studentClassNameText ||
        ''
    ).toLowerCase();

    const isSecondarySection =
      (studentClassData as any)?.category === 'Secondary' ||
      classTextForSection.includes('jss') ||
      classTextForSection.includes('ss');

    const signatureTitle = isSecondarySection ? 'PRINCIPAL' : 'HEAD TEACHER';
    pdf.setTextColor(44, 60, 80); // #2c3e50
    pdf.setFontSize(7); // 7pt
    pdf.setFont('helvetica', 'bold');
    pdf.text(signatureTitle, signatureRightX + 2, signatureY + 4); // Increased from 3 to 4
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const teacherName = isSecondarySection
      ? ((schoolSettings as any)?.principal_name || '_________________')
      : ((schoolSettings as any)?.head_teacher_name || '_________________');
    pdf.text(`Name: ${teacherName}`, signatureRightX + 2, signatureY + 9); // Increased from 7 to 9
    
    // Use result data for comment (from compiled result)
    const firstNonEmpty = (...vals: Array<unknown>) => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim() !== '') return v;
        if (v !== null && v !== undefined && typeof v !== 'string') return String(v);
      }
      return '';
    };

    const settingsHeadTeacherComment = firstNonEmpty(
      (schoolSettings as any)?.head_teacher_comment,
      (schoolSettings as any)?.headTeacherComment,
      (schoolSettings as any)?.head_teacher_comments,
      (schoolSettings as any)?.headTeacherComments
    );

    const settingsPrincipalComment = firstNonEmpty(
      (schoolSettings as any)?.principal_comment,
      (schoolSettings as any)?.principalComment,
      (schoolSettings as any)?.principal_comments,
      (schoolSettings as any)?.principalComments
    );

    const principalComment = firstNonEmpty(
      isSecondarySection
        ? (settingsPrincipalComment || 'Principal comment will appear here.')
        : (settingsHeadTeacherComment || 'Head teacher comment will appear here.')
    );
    pdf.setFont('times', 'normal'); // Professional Times font for comments
    pdf.setFontSize(8); // Smaller font for comments
    {
      const commentText = `Comment: ${principalComment}`;
      const maxWidth = signatureWidth - 4;
      const wrapped = pdf.splitTextToSize(commentText, maxWidth);
      const maxLines = 2;
      const lines = wrapped.slice(0, maxLines);
      pdf.text(lines, signatureRightX + 2, signatureY + 14);
    }
  
  // Signature image (prefer School Settings)
  const settingsSignature = isSecondarySection
    ? (schoolSettings as any)?.principal_signature
    : (schoolSettings as any)?.head_teacher_signature;

  const signatureImage = settingsSignature || (result as any)?.principal_signature;
  if (signatureImage) {
    try {
      pdf.addImage(signatureImage, 'PNG', signatureRightX + 2, signatureY + 18, signatureWidth - 4, 6);
    } catch (error) {
      // Silent fail for security
    }
  }

  currentY = signatureY + 45; // Increased from 35 to 45 for more spacing

  // === AFFECTIVE AND PSYCHOMOTOR DOMAINS (Exact StudentResultCard copy) ===
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
  const domainHeaderHeight = 6;
  const domainRowHeight = 4.8;

  // Affective + Psychomotor data must be declared before calculating shared layout
  const affectiveDataObj = getStudentAffectiveData();
  const affectiveData = [
    { quality: getDomainName('attentiveness'), score: affectiveDataObj.attentiveness || result?.affective?.attentiveness || '4' },
    { quality: getDomainName('honesty'), score: affectiveDataObj.honesty || result?.affective?.honesty || '3' },
    { quality: getDomainName('neatness'), score: affectiveDataObj.neatness || result?.affective?.neatness || '4' },
    { quality: getDomainName('obedience'), score: affectiveDataObj.obedience || result?.affective?.obedience || '2' },
    { quality: getDomainName('sense_of_responsibility'), score: affectiveDataObj.sense_of_responsibility || result?.affective?.sense_of_responsibility || '3' }
  ];

  const psychomotorDataObj = getStudentPsychomotorData();
  const psychomotorData = [
    { key: 'attention_to_direction', score: psychomotorDataObj.attention_to_direction || result?.psychomotor?.attention_to_direction || '4' },
    { key: 'considerate_of_others', score: psychomotorDataObj.considerate_of_others || result?.psychomotor?.considerate_of_others || '2' },
    { key: 'handwriting', score: psychomotorDataObj.handwriting || result?.psychomotor?.handwriting || '4' },
    { key: 'sports', score: psychomotorDataObj.sports || result?.psychomotor?.sports || '3' },
    { key: 'verbal_fluency', score: psychomotorDataObj.verbal_fluency || result?.psychomotor?.verbal_fluency || '4' },
    { key: 'works_well_independently', score: psychomotorDataObj.works_well_independently || result?.psychomotor?.works_well_independently || '5' }
  ];

  const maxDomainRows = Math.max(affectiveData.length, psychomotorData.length);
  const affectiveTableHeight = domainHeaderHeight + (maxDomainRows * domainRowHeight);

  // Affective table background
  pdf.setFillColor(255, 255, 255); // White background
  pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight, 'F');
  pdf.setDrawColor(0, 0, 0); // Black border
  pdf.rect(affectiveX, affectiveTableY, domainWidth, affectiveTableHeight);

  // Affective table header (enhanced visibility with standard font)
  pdf.setFillColor(26, 37, 47); // Dark professional color
  pdf.rect(affectiveX, affectiveTableY, domainWidth, domainHeaderHeight, 'F');
  
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

  let affectiveRowY = affectiveTableY + domainHeaderHeight;
  for (let index = 0; index < maxDomainRows; index++) {
    const item = affectiveData[index];

    // Alternating background colors (exact StudentResultCard)
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(affectiveX, affectiveRowY, domainWidth, domainRowHeight, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(affectiveX, affectiveRowY, domainWidth, domainRowHeight);

    if (item) {
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7); // 7pt
      let affectiveCellX = affectiveX;

      // Quality column
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.quality, affectiveCellX + 2, affectiveRowY + 3);
      affectiveCellX += domainWidth * 0.5;

      // Score column
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.score, affectiveCellX + domainWidth * 0.1, affectiveRowY + 3, { align: 'center' });
      affectiveCellX += domainWidth * 0.2;

      // Remark column
      pdf.setFont('helvetica', 'normal');
      const remark = getAffectiveRemark(parseInt(item.score));
      pdf.text(remark, affectiveCellX + 2, affectiveRowY + 3);
    }

    affectiveRowY += domainRowHeight;
  }

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
  pdf.rect(psychomotorX, affectiveTableY, domainWidth, domainHeaderHeight, 'F');
  pdf.setTextColor(255, 255, 255); // White text for contrast
  pdf.setFontSize(8); // Increased from 6pt to 8pt for better readability
  pdf.setFont('times', 'bold'); // Professional Times font
  pdf.text('SKILL', psychomotorX + 3, affectiveTableY + 4); // Increased from 2 to 3
  pdf.text('SCORE', psychomotorX + (domainWidth * 0.5), affectiveTableY + 4, { align: 'center' });
  pdf.text('REMARK', psychomotorX + (domainWidth * 0.75), affectiveTableY + 4, { align: 'center' });

  let psychomotorRowY = affectiveTableY + domainHeaderHeight;
  for (let index = 0; index < maxDomainRows; index++) {
    const item = psychomotorData[index];
    // Alternating colors
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250); // #f8f9fa
    } else {
      pdf.setFillColor(255, 255, 255); // White
    }
    pdf.rect(psychomotorX, psychomotorRowY, domainWidth, domainRowHeight, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(psychomotorX, psychomotorRowY, domainWidth, domainRowHeight);

    if (item) {
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7); // 7pt
      pdf.setFont('helvetica', 'bold');
      pdf.text(getDomainName(item.key), psychomotorX + 3, psychomotorRowY + 3);

      pdf.setFont('helvetica', 'bold');
      pdf.text(item.score, psychomotorX + (domainWidth * 0.5), psychomotorRowY + 3, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.text(getAffectiveRemark(parseInt(item.score)), psychomotorX + (domainWidth * 0.75), psychomotorRowY + 3, { align: 'center' });
    }

    psychomotorRowY += domainRowHeight;
  }

  currentY = affectiveTableY + 35; // Move below domains section

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
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm ?? "");
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear ?? "");
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [fullPageView, setFullPageView] = useState<{ studentId: number; resultId: number } | null>(null);
  const [principalComment, setPrincipalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);

  // Keep selected term/year in sync with system settings once they load.
  // This prevents the page from getting stuck with empty filters on first mount.
  useEffect(() => {
    if (!selectedTerm && currentTerm) {
      setSelectedTerm(currentTerm);
    }
    if (!selectedYear && currentAcademicYear) {
      setSelectedYear(currentAcademicYear);
    }
  }, [currentTerm, currentAcademicYear, selectedTerm, selectedYear]);

  const resultSheetRef = useRef<HTMLDivElement>(null);

  // Optimized academic years loading with memoization
  const loadAcademicYears = useMemo(() => async () => {
    try {
      const years = await getAllAcademicYears();
      if (years) {
        setAcademicYears(years);
      }
    } catch (error) {
      // Silent fail for security
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
          loadCompiledResultsFromAPI(null),
          loadAcademicYears(),
          loadSchoolSettings()
        ]);
      } catch (error) {
        if (isMounted) {
          // Silent fail for security
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
  }, [loadCompiledResultsFromAPI, loadAcademicYears, loadSchoolSettings, loadClassesFromAPI]);

  // Debounced loading for year/term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedYear && selectedTerm) {
        loadResultsForYearAndTerm(false);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedTerm]);

  // Optimized historical results loading with caching
  const loadResultsForYearAndTerm = async (forceRefresh: boolean) => {
    const currentYear = currentAcademicYear ?? '';
    const currentSelectedYear = selectedYear ?? '';
    const currentSelectedTerm = selectedTerm ?? '';
    const currentSystemTerm = currentTerm ?? '';

    if (currentSelectedYear === currentYear && currentSelectedTerm === currentSystemTerm) {
      // Load current session results normally
      await loadCompiledResultsFromAPI(null);
    } else {
      // Load historical results
      try {
        const results = await getCompiledResultsByYearAndTerm(selectedYear, selectedTerm);
        setHistoricalResults(results);
      } catch (error) {
        setHistoricalResults([]);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        loadAcademicYears(),
        loadSchoolSettings(),
        loadClassesFromAPI(),
      ]);

      await loadResultsForYearAndTerm(true);
      toast.success('Refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    }
  };

  // Filter results based on active tab (must be called before early returns)
  const filteredResults = useMemo(() => {
    const normalize = (v: any) => String(v ?? '').trim().toLowerCase();
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };
    const getResultTerm = (r: any) => r?.term ?? r?.Term;
    const getResultYear = (r: any) => r?.academic_year ?? r?.academicYear ?? r?.session ?? r?.Session;
    const getResultClassId = (r: any) => r?.class_id ?? r?.classId ?? r?.class ?? r?.classID;

    // Use historical results if not current term/year, otherwise use compiledResults
    const currentYear = currentAcademicYear ?? '';
    const currentSystemTerm = currentTerm ?? '';
    const isCurrentSession = selectedYear === currentYear && selectedTerm === currentSystemTerm;

    let allResults = isCurrentSession 
      ? compiledResults 
      : historicalResults;

    const selectedTermNorm = normalize(selectedTerm);
    const selectedYearNorm = normalize(selectedYear);

    let results = allResults.filter((r: any) => {
      const resultTermNorm = normalize(getResultTerm(r));
      const resultYearNorm = normalize(getResultYear(r));
      const resultClassId = getResultClassId(r);

      const matchesTerm = resultTermNorm === selectedTermNorm;
      const matchesYear = resultYearNorm === selectedYearNorm;
      const matchesClass =
        selectedClassId === 'all' || String(resultClassId ?? '') === String(selectedClassId);

      return matchesTerm && matchesYear && matchesClass;
    });

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
        const rStudentId = toNum(r?.student_id);
        const student = students.find((s: any) => toNum(s?.id) === rStudentId);
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

  const tabCounts = useMemo(() => {
    const normalize = (v: any) => String(v ?? '').trim().toLowerCase();
    const getResultTerm = (r: any) => r?.term ?? r?.Term;
    const getResultYear = (r: any) => r?.academic_year ?? r?.academicYear ?? r?.session ?? r?.Session;

    const currentYear = currentAcademicYear ?? '';
    const currentSystemTerm = currentTerm ?? '';
    const isCurrentSession = selectedYear === currentYear && selectedTerm === currentSystemTerm;
    const allResults = isCurrentSession ? compiledResults : historicalResults;

    const selectedTermNorm = normalize(selectedTerm);
    const selectedYearNorm = normalize(selectedYear);
    const base = (Array.isArray(allResults) ? allResults : []).filter((r: any) => {
      const resultTermNorm = normalize(getResultTerm(r));
      const resultYearNorm = normalize(getResultYear(r));
      return resultTermNorm === selectedTermNorm && resultYearNorm === selectedYearNorm;
    });

    return {
      pending: base.filter((r: any) => r.status === 'Submitted').length,
      approved: base.filter((r: any) => r.status === 'Approved').length,
      rejected: base.filter((r: any) => r.status === 'Rejected').length,
      all: base.filter((r: any) => r.status !== 'Rejected').length,
    };
  }, [compiledResults, historicalResults, selectedTerm, selectedYear, currentTerm, currentAcademicYear]);

  // Get students with results
  const studentsWithResults = useMemo(() => {
    return filteredResults
      .map((result: any) => {
        const student = students.find((s: any) => Number(s.id) === Number(result.student_id));
        return student ? { ...student, result } : null;
      })
      .filter(Boolean);
  }, [filteredResults, students]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedClassId, selectedTerm, selectedYear]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(studentsWithResults.length / pageSize));
  }, [studentsWithResults.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedStudentsWithResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return studentsWithResults.slice(start, start + pageSize);
  }, [studentsWithResults, currentPage, pageSize]);

  // Get selected result
  const selectedResultData = useMemo(() => {
    if (!selectedResult) return null;
    return compiledResults.find((r: any) => r.id === selectedResult);
  }, [selectedResult, compiledResults]);

  const selectedStudent = useMemo(() => {
    if (!selectedResultData) return null;
    return students.find((s: any) => s.id === selectedResultData.student_id);
  }, [selectedResultData, students]);

  // Get results for current class (bulk operations)
  const classResults = useMemo(() => {
    if (!selectedClassId || selectedClassId === "all") return filteredResults;
    return filteredResults.filter((r: any) => String(r.class_id ?? r.classId) === String(selectedClassId));
  }, [filteredResults, selectedClassId]);

  // If viewing other pages, render them (after all hooks have been called)
  if (viewMode === "viewAll") {
    return (
      <div className="space-y-6">
        <ViewAllResultsPage
          onBack={() => setViewMode("management")}
          onViewResult={(studentId, resultId) => {
            setFullPageView({ studentId, resultId });
          }}
        />
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

  // Match parent behavior: when full page view is open, render it as the only page.
  // This prevents click-through / immediate re-open issues and makes Back reliable.
  if (fullPageView) {
    return (
      <FullPageErrorBoundary onClose={closeFullPageView}>
        <FullPageResultView
          studentId={fullPageView.studentId}
          resultId={fullPageView.resultId}
          onClose={closeFullPageView}
        />
      </FullPageErrorBoundary>
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
      await loadCompiledResultsFromAPI(null);
      
      const student = students.find((s: any) => s.id === result.student_id);
      toast.success(`Result approved for ${student?.firstName} ${student?.lastName || 'Student'}`);
    } catch (error) {
      toast.error('Failed to approve result');
    }
  };

  // Handle reject
  const handleReject = async (resultId: number) => {
    const reason = (rejectionReason || '').trim();
    await updateCompiledResult(resultId, {
      status: "Rejected",
      rejection_reason: reason,
    });

    // Refresh data to ensure UI updates
    await loadCompiledResultsFromAPI(null);

    const result = compiledResults.find((r) => r.id === resultId);
    const student = students.find((s) => s.id === result?.student_id);
    
    if (student && result) {
      const notificationData = {
        title: "Result Rejected ⚠",
        message: `${student.firstName} ${student.lastName}'s result for ${result.term} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
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
            message: `Result for ${student.firstName} ${student.lastName} (${classInfo.name}) was rejected.${reason ? ` Reason: ${reason}.` : ''} Please review and resubmit.`,
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
      (async () => {
        try {
          await deleteCompiledResult(resultId);
          toast.success("Result deleted successfully");
          setSelectedResult(null);
        } catch (error) {
          toast.error('Failed to delete result');
        }
      })();
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
    const selectableIds = filteredResults.map((r: any) => r.id);
    const selectedSet = new Set(selectedResults);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id: number) => selectedSet.has(id));
    setSelectedResults(allSelected ? [] : selectableIds);
  };

  // Keep selections aligned with current filters/tab; avoid approving hidden/unrelated results.
  useEffect(() => {
    setSelectedResults([]);
  }, [activeTab, selectedClassId, selectedTerm, selectedYear, searchQuery]);

  // Bulk approve function
  const handleBulkApprove = async () => {
    if (selectedResults.length === 0) return;

    const isCurrentSession = selectedYear === currentAcademicYear && selectedTerm === currentTerm;
    if (!isCurrentSession) {
      toast.error('Bulk approval is only available for the current Term/Session. Switch filters back to Current.');
      return;
    }

    // Only approve what is currently visible/filtered (safety).
    const filteredIdSet = new Set(filteredResults.map((r: any) => r.id));
    const idsToApprove = selectedResults.filter(id => filteredIdSet.has(id));
    if (idsToApprove.length === 0) {
      toast.error('No selected results match the current filters.');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const resultId of idsToApprove) {
        try {
          // Ensure print approval flag is set, then run the canonical approval flow.
          await updateCompiledResult(resultId, {
            principal_signature: "",
            print_approved: 1,
          });
          await approveCompiledResult(resultId);
          successCount++;
        } catch (e) {
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Approved ${successCount} results successfully!`);
      } else if (successCount > 0) {
        toast.warning(`Approved ${successCount} results. Failed to approve ${failCount}.`);
      } else {
        toast.error('Failed to approve selected results');
      }
      setSelectedResults([]);
      setBulkComment("");
      setShowBulkApproveDialog(false);
      await loadCompiledResultsFromAPI(null);
    } catch (error) {
      toast.error('Failed to approve some results');
    }
  };

  // Bulk reject function
  const handleBulkReject = async () => {
    const reason = (bulkRejectionReason || '').trim();

    for (const resultId of selectedResults) {
      const result = compiledResults.find((r) => r.id === resultId);
      const student = students.find((s) => s.id === result?.student_id);
      
      await updateCompiledResult(resultId, {
        status: "Rejected",
        rejection_reason: reason,
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
              message: `Result for ${student.firstName} ${student.lastName} (${classInfo.name}) was rejected.${reason ? ` Reason: ${reason}.` : ''} Please review and resubmit.`,
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
    await loadCompiledResultsFromAPI(null);
  };

  return (
    <ResultsManagementErrorBoundary>
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
              onClick={handleRefresh}
              className="flex items-center gap-2 h-8 text-xs"
            >
              <span className="w-3 h-3" />
              Refresh
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
        <TabsList className={`grid w-full grid-cols-2 sm:grid-cols-${selectedTerm === "Third Term" ? '5' : '4'} bg-gray-50 rounded-lg p-1 h-8 sm:h-9 gap-1`}>
          <TabsTrigger value="pending" className="rounded-md text-xs data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800">
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">P</span>
            ({tabCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-md text-xs data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
            <span className="hidden sm:inline">Approved</span>
            <span className="sm:hidden">A</span>
            ({tabCounts.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-md text-xs data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
            <span className="hidden sm:inline">Rejected</span>
            <span className="sm:hidden">R</span>
            ({tabCounts.rejected})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-md text-xs data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
            <span className="hidden sm:inline">All</span>
            <span className="sm:hidden">All</span>
            ({tabCounts.all})
          </TabsTrigger>
          {selectedTerm === "Third Term" && (
            <TabsTrigger value="cumulative" className="rounded-md text-xs data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <span className="hidden sm:inline">Cumulative</span>
              <span className="sm:hidden">C</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Main tabs content (Pending/Approved/Rejected/All) */}
        {activeTab !== "cumulative" && (
          <TabsContent value={activeTab} className="mt-4">
          {/* Compact Bulk Actions */}
          {activeTab === "pending" && filteredResults.length > 0 && (
            <Card className="border-gray-200 shadow-sm mb-3">
              <CardContent className="p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        aria-label="Select all results"
                      />
                      <span className="sr-only">Select all results</span>
                    </label>
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
                  {paginatedStudentsWithResults.map((studentData) => (
                    <div
                      key={studentData!.id}
                      className="p-2 sm:p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          {activeTab === "pending" && (
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedResults.includes(studentData!.result.id)}
                                onChange={() => handleSelectResult(studentData!.result.id)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 mt-1"
                                aria-label={`Select result for ${studentData!.firstName} ${studentData!.lastName}`}
                              />
                              <span className="sr-only">Select result for {studentData!.firstName} {studentData!.lastName}</span>
                            </label>
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
                              onClick={() => {
                                if (isClosingFullPageView) return;
                                setFullPageView({ studentId: studentData!.id, resultId: studentData!.result.id });
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              className={studentData!.result.status === 'Approved' ? "border-green-200 text-green-700 hover:bg-green-50 h-7 sm:h-8 text-xs" : "border-gray-200 text-gray-500 hover:bg-gray-50 h-7 sm:h-8 text-xs"}
                              onClick={() => handleDownloadStudentPDF(studentData!, studentData!.result)}
                              disabled={!!downloadingResultIds[Number(studentData!.result.id)]}
                            >
                              <Download className="w-4 h-4 mr-1.5" />
                              <span className="hidden sm:inline">{!!downloadingResultIds[Number(studentData!.result.id)] ? 'Preparing…' : (studentData!.result.status === 'Approved' ? 'Download PDF' : `PDF (${studentData!.result.status})`)}</span>
                              <span className="sm:hidden">PDF</span>
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl h-7 sm:h-8 text-xs"
                                  onClick={() => setSelectedResult(studentData!.result.id)}
                                >
                                  <ClipboardCheck className="w-4 h-4 mr-1.5" />
                                  <span className="hidden sm:inline">Review</span>
                                  <span className="sm:hidden">R</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-full max-h-[95vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '1200px' }}>
                                <DialogHeader>
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="outline"
                                      onClick={() => setSelectedResult(null)}
                                      className="flex items-center gap-2"
                                    >
                                      <ArrowLeft className="w-4 h-4" />
                                      Back to Results
                                    </Button>
                                    <div>
                                      <DialogTitle>
                                        Review Result - {studentData!.firstName} {studentData!.lastName}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Review and approve or reject student results
                                      </DialogDescription>
                                    </div>
                                  </div>
                                </DialogHeader>

                              <div className="space-y-6">
                                {/* Result Card */}
                                <div id={`result-card-${studentData!.result.id}`} ref={resultCardRef} className="w-full overflow-auto">
                                  <StudentResultCard
                                    result={studentData!.result}
                                    currentUser={currentUser}
                                  />
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

              {studentsWithResults.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(studentsWithResults.length, (currentPage - 1) * pageSize + 1)}-{Math.min(studentsWithResults.length, currentPage * pageSize)} of {studentsWithResults.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v) || 20)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                        <SelectItem value="100">100 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-gray-700 min-w-[90px] text-center">
                      Page {currentPage} / {totalPages}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Cumulative tab content */}
        {activeTab === "cumulative" && (
          <TabsContent value="cumulative" className="mt-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Cumulative Results - {selectedYear} Session
                  </CardTitle>
                  {currentUser?.role === 'admin' && (
                    <Button
                      size="sm"
                      disabled={loadingCumulative}
                      onClick={async () => {
                        if (!selectedClassId || selectedClassId === "all") {
                          toast.error('Please select a specific class first');
                          return;
                        }
                        const classId = Number(selectedClassId);
                        if (!classId) {
                          toast.error('Invalid class selected');
                          return;
                        }
                        toast.loading('Compiling cumulative results...');
                        const result = await compileCumulativeResults(classId, selectedYear);
                        toast.dismiss();
                        if (result.success) {
                          toast.success(result.message);
                          await loadCumulativeResultsFromAPI(classId, selectedYear);
                        } else {
                          toast.error(result.message);
                        }
                      }}
                      className="bg-white text-purple-700 hover:bg-purple-50 h-7 text-xs"
                    >
                      {loadingCumulative ? 'Compiling...' : 'Compile Cumulative'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {selectedClassId === "all" ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Select a specific class to view cumulative results</p>
                  </div>
                ) : loadingCumulative ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Loading cumulative results...</p>
                  </div>
                ) : cumulativeResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No cumulative results found</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Compile Cumulative" to generate results for this class</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cumulativeResults.map((cr) => {
                      const student = students.find((s: any) => s.id === cr.student_id);
                      if (!student) return null;
                      const studentClass = classes.find((c: any) => c.id === (student as any).class_id);
                      const showPos = checkShouldShowPosition(studentClass?.name);
                      return (
                        <div key={cr.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{(student as any).firstName} {(student as any).lastName}</p>
                              <p className="text-xs text-gray-500">
                                Avg: {cr.average_score.toFixed(1)}% | Grade: {getGrade(cr.average_score)}
                                {showPos ? ` | Pos: ${formatPositionWithSuffix(cr.position)}` : ''}
                                {' | '}{cr.promotion_status || 'Pending'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs rounded-lg">
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Cumulative Result - {(student as any).firstName} {(student as any).lastName}
                                  </DialogTitle>
                                </DialogHeader>
                                <CumulativeResultSheet
                                  studentId={cr.student_id}
                                  academicYear={selectedYear}
                                />
                                <div className="flex gap-3 justify-end border-t pt-4 mt-4">
                                  <Button
                                    disabled={loadingCumulative}
                                    onClick={async () => {
                                      try {
                                        await generateCumulativePDF(student, cr, schoolSettings, classes, selectedYear);
                                        toast.success('PDF downloaded');
                                      } catch { toast.error('Failed to generate PDF'); }
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    {loadingCumulative ? 'Loading...' : 'Download PDF'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
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

      </div>
    </ResultsManagementErrorBoundary>
  );
}


