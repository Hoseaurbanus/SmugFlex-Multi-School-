import { Brain, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

interface DomainRatings {
  value: number;
  remark: string;
}

export function AffectivePsychomotorPage() {
  const {
    currentUser,
    teachers,
    students,
    classes,
    affectiveDomains,
    psychomotorDomains,
    currentTerm,
    currentAcademicYear,
    getTeacherAssignments,
    classTeacherAssignments,
    addAffectiveDomain,
    updateAffectiveDomain,
    addPsychomotorDomain,
    updatePsychomotorDomain,
    loadAffectiveDomainsFromAPI,
    loadPsychomotorDomainsFromAPI
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'affective' | 'psychomotor'>('affective');

  // Affective domain ratings
  const [affectiveRatings, setAffectiveRatings] = useState({
    attentiveness: { value: 0, remark: '' },
    honesty: { value: 0, remark: '' },
    neatness: { value: 0, remark: '' },
    obedience: { value: 0, remark: '' },
    senseOfResponsibility: { value: 0, remark: '' }
  });

  // Psychomotor domain ratings
  const [psychomotorRatings, setPsychomotorRatings] = useState({
    attentionToDirection: { value: 0, remark: '' },
    considerateOfOthers: { value: 0, remark: '' },
    handwriting: { value: 0, remark: '' },
    sports: { value: 0, remark: '' },
    verbalFluency: { value: 0, remark: '' },
    worksWellIndependently: { value: 0, remark: '' }
  });

  // Get current teacher
  const currentTeacher = currentUser ? teachers.find(t => t.id === String(currentUser.linked_id)) : null;
  const teacherAssignments = currentTeacher ? getTeacherAssignments(Number(currentTeacher.id)) : [];
  
  // Check if teacher has any assignments (class or subject)
  const hasAssignments = useMemo(() => {
    if (!currentTeacher) return false;
    
    // Check class teacher assignments
    const hasClassAssignment = classes.some((c: any) => {
      const assignment = classTeacherAssignments.find((cta: any) => 
        String(cta.teacher_id) === String(currentTeacher.id) && 
        String(cta.class_id) === String(c.id) &&
        cta.academic_year === currentAcademicYear && 
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return !!assignment;
    });
    
    // Check subject assignments
    const hasSubjectAssignment = teacherAssignments.length > 0;
    
    return hasClassAssignment || hasSubjectAssignment;
  }, [currentTeacher, classes, classTeacherAssignments, currentAcademicYear, currentTerm]);

  // Get classes where this teacher is either class teacher or subject teacher
  const teacherClasses = useMemo(() => {
    if (!currentTeacher) {
      return [];
    }
    
    const classTeacherClasses = classes.filter((c: any) => {
      const assignment = classTeacherAssignments.find((cta: any) => 
        String(cta.teacher_id) === String(currentTeacher.id) && 
        String(cta.class_id) === String(c.id) &&
        cta.academic_year === currentAcademicYear && 
        cta.term === currentTerm &&
        cta.status === 'Active'
      );
      return !!assignment;
    });
    const subjectClasses = teacherAssignments
      .map(a => classes.find((c: any) => c.id === a.class_id))
      .filter((c): c is any => Boolean(c));
    
    // Remove duplicates
    return Array.from(new Map([...classTeacherClasses, ...subjectClasses].map(c => [c.id, c])).values());
  }, [currentTeacher, classes, teacherAssignments, classTeacherAssignments, currentAcademicYear, currentTerm]);

  // Get students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter(s => s.class_id === Number(selectedClassId) && s.status === 'Active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [selectedClassId, students]);

  // Check if teacher has access to this page (class teacher or subject teacher for this class)
  const hasAccessToClass = useMemo(() => {
    if (!currentTeacher || !selectedClassId) return false;
    
    // Check if teacher is assigned as class teacher to this class
    const isClassTeacherForClass = classTeacherAssignments.some((cta: any) => 
      String(cta.teacher_id) === String(currentUser?.linked_id) && 
      String(cta.class_id) === String(selectedClassId) &&
      cta.academic_year === currentAcademicYear && 
      cta.term === currentTerm &&
      cta.status === 'Active'
    );
    
    // Check if teacher has subject assignments for this class
    const hasSubjectAssignmentForClass = teacherAssignments.some(assignment => 
      assignment.class_id === Number(selectedClassId) &&
      assignment.term === currentTerm &&
      assignment.academic_year === currentAcademicYear &&
      assignment.status === 'Active'
    );
    
    return isClassTeacherForClass || hasSubjectAssignmentForClass;
  }, [currentTeacher, selectedClassId, classTeacherAssignments, teacherAssignments, currentAcademicYear, currentTerm, currentUser?.linked_id]);

  // Show no access message if teacher doesn't have access
  if (!hasAccessToClass) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-center py-8">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-medium">No Class Assignment</h3>
              <p className="text-sm text-amber-700 mt-1">
                You are not assigned as a class teacher for any active class.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to convert database field names to complete readable names
  const getDomainName = (key: string): string => {
    // Affective domain mappings
    const affectiveMappings: Record<string, string> = {
      'attentiveness': 'Attentiveness',
      'honesty': 'Honesty',
      'neatness': 'Neatness',
      'obedience': 'Obedience',
      'senseOfResponsibility': 'Sense of Responsibility'
    };

    // Psychomotor domain mappings
    const psychomotorMappings: Record<string, string> = {
      'attentionToDirection': 'Attention to Direction',
      'considerateOfOthers': 'Considerate of Others',
      'handwriting': 'Handwriting',
      'sports': 'Sports',
      'verbalFluency': 'Verbal Fluency',
      'worksWellIndependently': 'Works Well Independently'
    };

    // Return the mapped name or format the key as fallback
    return affectiveMappings[key] || psychomotorMappings[key] || key.replace(/([A-Z])/g, ' $1').trim();
  };

  // Get rating label based on value
  const getRatingLabel = (value: number): string => {
    if (value === 5) return "Excellent";
    if (value === 4) return "Very Good";
    if (value === 3) return "Good";
    if (value === 2) return "Fair";
    if (value === 1) return "Poor";
    return "";
  };

  // Get rating color
  const getRatingColor = (value: number): string => {
    if (value === 5) return 'bg-[#10B981]';
    if (value === 4) return 'bg-[#3B82F6]';
    if (value === 3) return 'bg-[#F59E0B]';
    if (value === 2) return 'bg-[#F97316]';
    if (value === 1) return 'bg-[#EF4444]';
    return 'bg-[#9CA3AF]';
  };

  // Open modal for student
  const openModal = (studentId: number) => {
    setSelectedStudentId(studentId);
    
    // Load existing data
    const existingAffective = affectiveDomains.find(a =>
      a.student_id === studentId &&
      a.class_id === Number(selectedClassId) &&
      a.term === currentTerm &&
      a.academic_year === currentAcademicYear
    );

    const existingPsychomotor = psychomotorDomains.find(p =>
      p.student_id === studentId &&
      p.class_id === Number(selectedClassId) &&
      p.term === currentTerm &&
      p.academic_year === currentAcademicYear
    );

    if (existingAffective) {
      setAffectiveRatings({
        attentiveness: { value: existingAffective.attentiveness, remark: existingAffective.attentiveness_remark },
        honesty: { value: existingAffective.honesty, remark: existingAffective.honesty_remark },
        neatness: { value: existingAffective.neatness, remark: existingAffective.neatness_remark },
        obedience: { value: existingAffective.obedience, remark: existingAffective.obedience_remark },
        senseOfResponsibility: { value: existingAffective.sense_of_responsibility, remark: existingAffective.sense_of_responsibility_remark }
      });
    } else {
      setAffectiveRatings({
        attentiveness: { value: 0, remark: '' },
        honesty: { value: 0, remark: '' },
        neatness: { value: 0, remark: '' },
        obedience: { value: 0, remark: '' },
        senseOfResponsibility: { value: 0, remark: '' }
      });
    }

    if (existingPsychomotor) {
      setPsychomotorRatings({
        attentionToDirection: { value: existingPsychomotor.attention_to_direction, remark: existingPsychomotor.attention_to_direction_remark },
        considerateOfOthers: { value: existingPsychomotor.considerate_of_others, remark: existingPsychomotor.considerate_of_others_remark },
        handwriting: { value: existingPsychomotor.handwriting, remark: existingPsychomotor.handwriting_remark },
        sports: { value: existingPsychomotor.sports, remark: existingPsychomotor.sports_remark },
        verbalFluency: { value: existingPsychomotor.verbal_fluency, remark: existingPsychomotor.verbal_fluency_remark },
        worksWellIndependently: { value: existingPsychomotor.works_well_independently, remark: existingPsychomotor.works_well_independently_remark }
      });
    } else {
      setPsychomotorRatings({
        attentionToDirection: { value: 0, remark: '' },
        considerateOfOthers: { value: 0, remark: '' },
        handwriting: { value: 0, remark: '' },
        sports: { value: 0, remark: '' },
        verbalFluency: { value: 0, remark: '' },
        worksWellIndependently: { value: 0, remark: '' }
      });
    }

    setShowModal(true);
  };

  // Save assessments
  const handleSave = () => {
    if (!selectedStudentId || !currentTeacher) return;

    // Check if all ratings are provided
    const affectiveComplete = Object.values(affectiveRatings).every(r => r.value > 0);
    const psychomotorComplete = Object.values(psychomotorRatings).every(r => r.value > 0);

    if (!affectiveComplete || !psychomotorComplete) {
      toast.error("Please provide ratings for all traits");
      return;
    }

    const existingAffective = affectiveDomains.find(a =>
      a.student_id === selectedStudentId &&
      a.class_id === Number(selectedClassId) &&
      a.term === currentTerm &&
      a.academic_year === currentAcademicYear
    );

    const existingPsychomotor = psychomotorDomains.find(p =>
      p.student_id === selectedStudentId &&
      p.class_id === Number(selectedClassId) &&
      p.term === currentTerm &&
      p.academic_year === currentAcademicYear
    );

    // Save affective
    const affectiveData = {
      student_id: selectedStudentId,
      class_id: Number(selectedClassId),
      term: currentTerm,
      academic_year: currentAcademicYear,
      attentiveness: affectiveRatings.attentiveness.value,
      attentiveness_remark: affectiveRatings.attentiveness.remark || getRatingLabel(affectiveRatings.attentiveness.value),
      honesty: affectiveRatings.honesty.value,
      honesty_remark: affectiveRatings.honesty.remark || getRatingLabel(affectiveRatings.honesty.value),
      neatness: affectiveRatings.neatness.value,
      neatness_remark: affectiveRatings.neatness.remark || getRatingLabel(affectiveRatings.neatness.value),
      obedience: affectiveRatings.obedience.value,
      obedience_remark: affectiveRatings.obedience.remark || getRatingLabel(affectiveRatings.obedience.value),
      sense_of_responsibility: affectiveRatings.senseOfResponsibility.value,
      sense_of_responsibility_remark: affectiveRatings.senseOfResponsibility.remark || getRatingLabel(affectiveRatings.senseOfResponsibility.value),
      entered_by: currentUser?.id || 0,
      entered_date: new Date().toISOString()
    };

    // Save psychomotor
    const psychomotorData = {
      student_id: selectedStudentId,
      class_id: Number(selectedClassId),
      term: currentTerm,
      academic_year: currentAcademicYear,
      attention_to_direction: psychomotorRatings.attentionToDirection.value,
      attention_to_direction_remark: psychomotorRatings.attentionToDirection.remark || getRatingLabel(psychomotorRatings.attentionToDirection.value),
      considerate_of_others: psychomotorRatings.considerateOfOthers.value,
      considerate_of_others_remark: psychomotorRatings.considerateOfOthers.remark || getRatingLabel(psychomotorRatings.considerateOfOthers.value),
      handwriting: psychomotorRatings.handwriting.value,
      handwriting_remark: psychomotorRatings.handwriting.remark || getRatingLabel(psychomotorRatings.handwriting.value),
      sports: psychomotorRatings.sports.value,
      sports_remark: psychomotorRatings.sports.remark || getRatingLabel(psychomotorRatings.sports.value),
      verbal_fluency: psychomotorRatings.verbalFluency.value,
      verbal_fluency_remark: psychomotorRatings.verbalFluency.remark || getRatingLabel(psychomotorRatings.verbalFluency.value),
      works_well_independently: psychomotorRatings.worksWellIndependently.value,
      works_well_independently_remark: psychomotorRatings.worksWellIndependently.remark || getRatingLabel(psychomotorRatings.worksWellIndependently.value),
      entered_by: currentUser?.id || 0,
      entered_date: new Date().toISOString()
    };

    // Save affective domain to database
    if (existingAffective) {
      updateAffectiveDomain(existingAffective.id, affectiveData);
      toast.success("Affective domain assessment updated");
    } else {
      addAffectiveDomain(affectiveData);
      toast.success("Affective domain assessment saved");
    }

    // Save psychomotor domain to database
    if (existingPsychomotor) {
      updatePsychomotorDomain(existingPsychomotor.id, psychomotorData);
      toast.success("Psychomotor domain assessment updated");
    } else {
      addPsychomotorDomain(psychomotorData);
      toast.success("Psychomotor domain assessment saved");
    }

    // Refresh data to reflect changes immediately
    loadAffectiveDomainsFromAPI();
    loadPsychomotorDomainsFromAPI();

    const student = classStudents.find(s => s.id === selectedStudentId);
    toast.success(`Assessments saved for ${student?.firstName} ${student?.lastName}`);
    setShowModal(false);
  };

  // Check if student has complete assessments
  const hasCompleteAssessments = (studentId: number): boolean => {
    const affective = affectiveDomains.find(a =>
      a.student_id === studentId &&
      a.class_id === Number(selectedClassId) &&
      a.term === currentTerm &&
      a.academic_year === currentAcademicYear
    );

    const psychomotor = psychomotorDomains.find(p =>
      p.student_id === studentId &&
      p.class_id === Number(selectedClassId) &&
      p.term === currentTerm &&
      p.academic_year === currentAcademicYear
    );

    return affective !== undefined && psychomotor !== undefined;
  };

  if (!hasAssignments) {
    return (
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-12 text-center">
          <span className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
          <h3 className="text-[#1F2937] mb-2">No Assignment</h3>
          <p className="text-[#6B7280]">
            You are not assigned as a class teacher or subject teacher for any class. Please contact the administrator to get assigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Affective & Psychomotor Assessment</h1>
        <p className="text-[#6B7280]">Evaluate students' behavioral and physical development</p>
      </div>

      {/* Class Selection */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-[#1F2937]">Select Class</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-md">
            <Label className="text-[#1F2937] mb-2 block">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]">
                <SelectValue placeholder="Select your class" />
              </SelectTrigger>
              <SelectContent>
                {teacherClasses.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      {selectedClassId && classStudents.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white border-0 shadow-clinical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Total Students</p>
              <h3 className="text-white">{classStudents.length}</h3>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-0 shadow-clinical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Completed</p>
              <h3 className="text-white">
                {(classStudents || []).filter(s => hasCompleteAssessments(s.id)).length}
              </h3>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#F4B400] text-white border-0 shadow-clinical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Pending</p>
              <h3 className="text-white">
                {(classStudents || []).filter(s => !hasCompleteAssessments(s.id)).length}
              </h3>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student List */}
      {selectedClassId && classStudents.length > 0 && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-6 border-b border-[#E5E7EB]">
            <CardTitle className="text-[#1F2937]">Students ({classStudents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#2563EB] text-white">
                    <th className="text-left p-4">#</th>
                    <th className="text-left p-4">Student Name</th>
                    <th className="text-left p-4">Admission Number</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-center p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => {
                    const isComplete = hasCompleteAssessments(student.id);
                    return (
                      <tr key={student.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-4 text-[#6B7280]">{index + 1}</td>
                        <td className="p-4 text-[#1F2937]">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="p-4 text-[#6B7280]">{student.admissionNumber}</td>
                        <td className="p-4 text-center">
                          {isComplete ? (
                            <Badge className="bg-[#10B981] text-white rounded-full">
                              <span className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge className="bg-[#F59E0B] text-white rounded-full">
                              <span className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            onClick={() => openModal(student.id)}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg shadow-clinical"
                          >
                            <span className="w-4 h-4 mr-2" />
                            {isComplete ? 'Edit' : 'Add'} Assessment
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudentId && classStudents.find(s => s.id === selectedStudentId) && (
                <>
                  Assessment for {classStudents.find(s => s.id === selectedStudentId)?.firstName}{' '}
                  {classStudents.find(s => s.id === selectedStudentId)?.lastName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>Enter affective and psychomotor domain assessments for this student.</DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#E5E7EB]">
            <button
              onClick={() => setActiveTab('affective')}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === 'affective'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              <span className="w-4 h-4 inline mr-2" />
              Affective Domain
            </button>
            <button
              onClick={() => setActiveTab('psychomotor')}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === 'psychomotor'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              <Brain className="w-4 h-4 inline mr-2" />
              Psychomotor Domain
            </button>
          </div>

          {/* Affective Tab */}
          {activeTab === 'affective' && (
            <div className="space-y-4 mt-4">
              {Object.entries(affectiveRatings).map(([key, rating]) => (
                <div key={key} className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <Label className="text-[#1F2937] mb-3 block capitalize">
                    {getDomainName(key)}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Rating (1-5)</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            onClick={() => setAffectiveRatings(prev => ({
                              ...prev,
                              [key]: { ...prev[key as keyof typeof affectiveRatings], value }
                            }))}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                              rating.value === value
                                ? `${getRatingColor(value)} text-white shadow-clinical`
                                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      {rating.value > 0 && (
                        <p className="text-sm text-[#6B7280] mt-2">
                          {getRatingLabel(rating.value)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Remark (Optional)</Label>
                      <Input
                        value={rating.remark}
                        onChange={(e) => setAffectiveRatings(prev => ({
                          ...prev,
                          [key]: { ...prev[key as keyof typeof affectiveRatings], remark: e.target.value }
                        }))}
                        placeholder={getRatingLabel(rating.value)}
                        className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Psychomotor Tab */}
          {activeTab === 'psychomotor' && (
            <div className="space-y-4 mt-4">
              {Object.entries(psychomotorRatings).map(([key, rating]) => (
                <div key={key} className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <Label className="text-[#1F2937] mb-3 block capitalize">
                    {getDomainName(key)}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Rating (1-5)</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            onClick={() => setPsychomotorRatings(prev => ({
                              ...prev,
                              [key]: { ...prev[key as keyof typeof psychomotorRatings], value }
                            }))}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                              rating.value === value
                                ? `${getRatingColor(value)} text-white shadow-clinical`
                                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      {rating.value > 0 && (
                        <p className="text-sm text-[#6B7280] mt-2">
                          {getRatingLabel(rating.value)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Remark (Optional)</Label>
                      <Input
                        value={rating.remark}
                        onChange={(e) => setPsychomotorRatings(prev => ({
                          ...prev,
                          [key]: { ...prev[key as keyof typeof psychomotorRatings], remark: e.target.value }
                        }))}
                        placeholder={getRatingLabel(rating.value)}
                        className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E5E7EB]">
            <Button
              onClick={() => setShowModal(false)}
              variant="outline"
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical"
            >
              <span className="w-4 h-4 mr-2" />
              Save Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card className="rounded-xl bg-gradient-to-r from-[#3B82F6]/10 to-[#3B82F6]/5 border border-[#3B82F6]/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-[#1F2937]">
              <p><strong>Assessment Guidelines:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                <li><strong>Rating Scale:</strong> 1 (Poor), 2 (Fair), 3 (Good), 4 (Very Good), 5 (Excellent)</li>
                <li><strong>Affective Domain:</strong> Behavioral traits including attentiveness, honesty, neatness, obedience, and sense of responsibility</li>
                <li><strong>Psychomotor Domain:</strong> Physical and cognitive skills including attention to direction, handwriting, sports ability, and verbal fluency</li>
                <li>You can optionally add custom remarks for each trait</li>
                <li>Both affective and psychomotor assessments must be completed before results can be compiled</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
