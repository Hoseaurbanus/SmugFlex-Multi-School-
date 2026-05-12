import { useState, useEffect } from "react";
import { Heart, Activity, Users, CheckCircle, RotateCcw, AlertTriangle, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useSchool } from "../../contexts/SchoolContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { API_CONFIG } from "../../config/api";

export function DomainsPage() {
  const { 
    currentUser, 
    teachers, 
    classes, 
    students, 
    getStudentsByClass, 
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    loadAffectiveDomainsFromAPI,
    loadPsychomotorDomainsFromAPI,
    updateAffectiveDomain,
    updatePsychomotorDomain,
    addAffectiveDomain,
    addPsychomotorDomain,
    updateCompiledResult,
    currentTerm,
    currentAcademicYear,
    classTeacherAssignments,
    loadClassTeacherAssignmentsFromAPI
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [affectiveData, setAffectiveData] = useState<{[studentId: number]: any}>({});
  const [psychomotorData, setPsychomotorData] = useState<{[studentId: number]: any}>({});
  const [expandedStudents, setExpandedStudents] = useState<{[studentId: number]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'affective' | 'psychomotor'>('affective');

  const getStudentPhotoCandidates = (student: any): string[] => {
    const rawUrl =
      student?.photoUrl ||
      student?.photo_url ||
      student?.photoURL ||
      student?.passportPhoto ||
      student?.passport_photo ||
      student?.passport;

    if (!rawUrl || typeof rawUrl !== 'string') return [];
    const trimmed = rawUrl.trim();
    if (!trimmed) return [];

    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return [trimmed];

    let apiOrigin = '';
    try {
      const apiBase = API_CONFIG?.BASE_URL || '';
      apiOrigin = apiBase ? new URL(apiBase).origin : '';
    } catch {
      apiOrigin = '';
    }

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

    const candidates: string[] = [];
    if (appOrigin) candidates.push(`${appOrigin}${normalizedPath}`);
    if (apiOrigin) candidates.push(`${apiOrigin}${normalizedPath}`);
    candidates.push(trimmed);

    return Array.from(new Set(candidates)).filter(Boolean);
  };

  const handleStudentPhotoError = (e: React.SyntheticEvent<HTMLImageElement>, student: any) => {
    const img = e.currentTarget;
    const candidates = getStudentPhotoCandidates(student);
    const idx = Number(img.dataset.candidateIdx || '0');
    const nextIdx = idx + 1;
    if (nextIdx < candidates.length) {
      img.dataset.candidateIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };

  const getInitials = (student: any) => {
    const a = String(student?.firstName || '').trim();
    const b = String(student?.lastName || '').trim();
    return `${a[0] || ''}${b[0] || ''}`.toUpperCase() || '??';
  };

  const resolveCanonicalClassId = (classId: any): number | null => {
    if (!classId) return null;
    const baseClass = (classes || []).find((c: any) => String(c.id) === String(classId));
    if (!baseClass) return Number(classId) || null;

    const siblings = (classes || []).filter((c: any) =>
      String(c.name).trim().toLowerCase() === String(baseClass.name).trim().toLowerCase() &&
      String(c.level).trim().toLowerCase() === String(baseClass.level).trim().toLowerCase()
    );

    if (siblings.length <= 1) return Number(baseClass.id) || null;

    const best = siblings
      .map((c: any) => ({
        id: c.id,
        count: (students || []).filter((s: any) => String(s.class_id) === String(c.id)).length,
      }))
      .sort((a: any, b: any) => b.count - a.count)[0];

    return best?.id ? Number(best.id) : (Number(baseClass.id) || null);
  };

  // Load domains data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (currentTerm && currentAcademicYear) {
          await loadClassTeacherAssignmentsFromAPI(true, currentTerm, currentAcademicYear);
        }
        await Promise.all([
          loadAffectiveDomainsFromAPI(),
          loadPsychomotorDomainsFromAPI()
        ]);
      } catch (error) {
        // Silently continue with empty data
      }
    };
    loadData();
  }, [currentTerm, currentAcademicYear, loadClassTeacherAssignmentsFromAPI, loadAffectiveDomainsFromAPI, loadPsychomotorDomainsFromAPI]);

  // Get current teacher's classes - use same logic as ClassListPage
  const currentTeacher = teachers.find(t => t.id === currentUser?.linked_id);
  const teacherClasses = classes.filter((c: any) => {
    const assignment = classTeacherAssignments.find((cta: any) => 
      String(cta.teacher_id) === String(currentUser?.linked_id) && 
      String(cta.class_id) === String(c.id) &&
      cta.academic_year === currentAcademicYear && 
      cta.term === currentTerm &&
      cta.status === 'Active'
    );
    return !!assignment;
  });

  // Enhanced validation - teacher must be assigned as class teacher
  if (teacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center gap-3 text-amber-600">
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

  const classStudents = selectedClassId
    ? (students || []).filter(s => {
        const effectiveSelectedClassId = resolveCanonicalClassId(selectedClassId) ?? selectedClassId;
        const isSameClass = String(s.class_id) === String(effectiveSelectedClassId);
        const status = String((s as any)?.status ?? '').trim().toLowerCase();
        const isActive = status === '' || status === 'active';
        return isSameClass && isActive;
      })
    : [];

  // Load existing data when class is selected
  useEffect(() => {
    if (selectedClassId > 0 && classStudents.length > 0) {
      try {
        const affectiveExisting: {[studentId: number]: any} = {};
        const psychomotorExisting: {[studentId: number]: any} = {};
        
        classStudents.forEach(student => {
          // Check compiled results first (priority), then domains tables
          const compiledResult = compiledResults.find(cr => 
            cr.student_id === student.id &&
            String(cr.class_id) === String(selectedClassId) &&
            cr.term === currentTerm &&
            cr.academic_year === currentAcademicYear
          );
          
          // Affective domains
          const existingAffective = affectiveDomains.find(ad => 
            ad.student_id === student.id &&
            String(ad.class_id) === String(selectedClassId) &&
            ad.term === currentTerm &&
            ad.academic_year === currentAcademicYear
          );
          
          // Use compiled results data if available, otherwise use domains table
          let affectiveSource = null;
          if (compiledResult?.affective) {
            affectiveSource = typeof compiledResult.affective === 'string' 
              ? JSON.parse(compiledResult.affective) 
              : compiledResult.affective;
          } else if (existingAffective) {
            affectiveSource = existingAffective;
          }
          
          if (affectiveSource) {
            affectiveExisting[student.id] = {
              attentiveness: affectiveSource.attentiveness || 3,
              attentiveness_remark: affectiveSource.attentiveness_remark || '',
              honesty: affectiveSource.honesty || 3,
              honesty_remark: affectiveSource.honesty_remark || '',
              neatness: affectiveSource.neatness || 3,
              neatness_remark: affectiveSource.neatness_remark || '',
              obedience: affectiveSource.obedience || 3,
              obedience_remark: affectiveSource.obedience_remark || '',
              sense_of_responsibility: affectiveSource.sense_of_responsibility || 3,
              sense_of_responsibility_remark: affectiveSource.sense_of_responsibility_remark || ''
            };
          } else {
            affectiveExisting[student.id] = {
              attentiveness: 3, honesty: 3, neatness: 3, obedience: 3, sense_of_responsibility: 3,
              attentiveness_remark: '', honesty_remark: '', neatness_remark: '', obedience_remark: '', sense_of_responsibility_remark: ''
            };
          }
          
          // Psychomotor domains
          const existingPsychomotor = psychomotorDomains.find(pd => 
            pd.student_id === student.id &&
            String(pd.class_id) === String(selectedClassId) &&
            pd.term === currentTerm &&
            pd.academic_year === currentAcademicYear
          );
          
          // Use compiled results data if available, otherwise use domains table
          let psychomotorSource = null;
          if (compiledResult?.psychomotor) {
            psychomotorSource = typeof compiledResult.psychomotor === 'string' 
              ? JSON.parse(compiledResult.psychomotor) 
              : compiledResult.psychomotor;
          } else if (existingPsychomotor) {
            psychomotorSource = existingPsychomotor;
          }
          
          if (psychomotorSource) {
            psychomotorExisting[student.id] = {
              attention_to_direction: psychomotorSource.attention_to_direction || 3,
              attention_to_direction_remark: psychomotorSource.attention_to_direction_remark || '',
              considerate_of_others: psychomotorSource.considerate_of_others || 3,
              considerate_of_others_remark: psychomotorSource.considerate_of_others_remark || '',
              handwriting: psychomotorSource.handwriting || 3,
              handwriting_remark: psychomotorSource.handwriting_remark || '',
              sports: psychomotorSource.sports || 3,
              sports_remark: psychomotorSource.sports_remark || '',
              verbal_fluency: psychomotorSource.verbal_fluency || 3,
              verbal_fluency_remark: psychomotorSource.verbal_fluency_remark || '',
              works_well_independently: psychomotorSource.works_well_independently || 3,
              works_well_independently_remark: psychomotorSource.works_well_independently_remark || ''
            };
          } else {
            psychomotorExisting[student.id] = {
              attention_to_direction: 3, considerate_of_others: 3, handwriting: 3, sports: 3, verbal_fluency: 3, works_well_independently: 3,
              attention_to_direction_remark: '', considerate_of_others_remark: '', handwriting_remark: '', sports_remark: '', verbal_fluency_remark: '', works_well_independently_remark: ''
            };
          }
        });
        
        setAffectiveData(affectiveExisting);
        setPsychomotorData(psychomotorExisting);
      } catch (error) {
        setAffectiveData({});
        setPsychomotorData({});
      }
    }
  }, [selectedClassId, classStudents, currentTerm, currentAcademicYear, affectiveDomains, psychomotorDomains, compiledResults]);

  // Handle domain change with real-time save
  const handleDomainChange = async (studentId: number, domainType: 'affective' | 'psychomotor', field: string, value: any) => {
    const setData = domainType === 'affective' ? setAffectiveData : setPsychomotorData;
    const data = domainType === 'affective' ? affectiveData : psychomotorData;
    const updateFn = domainType === 'affective' ? updateAffectiveDomain : updatePsychomotorDomain;
    const addFn = domainType === 'affective' ? addAffectiveDomain : addPsychomotorDomain;
    const domains = domainType === 'affective' ? affectiveDomains : psychomotorDomains;

    if (!currentTerm || !currentAcademicYear) {
      toast.error('Current term and academic year are required');
      return;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));

    // Save to database immediately
    try {
      const studentData = data[studentId] || {};
      const payload = {
        student_id: studentId,
        class_id: Number(selectedClassId),
        term: currentTerm,
        academic_year: currentAcademicYear,
        ...studentData,
        [field]: value,
        entered_by: currentUser?.id,
        entry_date: new Date().toISOString()
      };

      const existingDomain = domains.find(d => 
        d.student_id === studentId &&
        d.class_id === Number(selectedClassId) &&
        d.term === currentTerm &&
        d.academic_year === currentAcademicYear
      );

      if (existingDomain) {
        await updateFn(existingDomain.id, payload);
      } else {
        await addFn(payload);
      }

      // Also update compiled results if they exist
      const compiledResult = compiledResults.find(cr => 
        cr.student_id === studentId &&
        cr.class_id === Number(selectedClassId) &&
        cr.term === currentTerm &&
        cr.academic_year === currentAcademicYear
      );

      if (compiledResult) {
        // Check if results are already approved
        if (compiledResult.status === 'Approved') {
          const student = classStudents.find(s => s.id === studentId);
          toast.error(`Cannot update domains for ${student?.firstName} ${student?.lastName}: Results have been approved by admin`, {
            id: `blocked-domains-${studentId}`,
            duration: 5000
          });
          return;
        }
        
        // Get the updated data for both domains
        const updatedAffective = { ...affectiveData[studentId], [field]: value };
        const updatedPsychomotor = { ...psychomotorData[studentId], [field]: value };
        
        const updatePayload = {
          affective: domainType === 'affective' ? updatedAffective : affectiveData[studentId],
          psychomotor: domainType === 'psychomotor' ? updatedPsychomotor : psychomotorData[studentId]
        };

        await updateCompiledResult(compiledResult.id, updatePayload);
      }
    } catch (error) {
      // Silent fail for security
    }
  };

  // Quick actions
  const handleMarkAllExcellent = async () => {
    const allAffective: {[studentId: number]: any} = {};
    const allPsychomotor: {[studentId: number]: any} = {};
    
    classStudents.forEach(student => {
      allAffective[student.id] = {
        attentiveness: 5, honesty: 5, neatness: 5, obedience: 5, sense_of_responsibility: 5,
        attentiveness_remark: 'Excellent', honesty_remark: 'Very honest', neatness_remark: 'Always neat',
        obedience_remark: 'Perfect obedience', sense_of_responsibility_remark: 'Highly responsible'
      };
      allPsychomotor[student.id] = {
        attention_to_direction: 5, considerate_of_others: 5, handwriting: 5, sports: 5, verbal_fluency: 5, works_well_independently: 5,
        attention_to_direction_remark: 'Excellent', considerate_of_others_remark: 'Very considerate', handwriting_remark: 'Beautiful',
        sports_remark: 'Excellent', verbal_fluency_remark: 'Very fluent', works_well_independently_remark: 'Highly independent'
      };
    });
    
    setAffectiveData(allAffective);
    setPsychomotorData(allPsychomotor);
    
    // Save all to database
    for (const student of classStudents) {
      const affective = allAffective[student.id];
      const psychomotor = allPsychomotor[student.id];
      
      for (const [field, value] of Object.entries(affective)) {
        await handleDomainChange(student.id, 'affective', field, value);
      }
      for (const [field, value] of Object.entries(psychomotor)) {
        await handleDomainChange(student.id, 'psychomotor', field, value);
      }
    }
    
    toast.success('All students marked as excellent');
  };

  const handleClearAll = () => {
    const clearedAffective: {[studentId: number]: any} = {};
    const clearedPsychomotor: {[studentId: number]: any} = {};
    
    classStudents.forEach(student => {
      clearedAffective[student.id] = {
        attentiveness: 3, honesty: 3, neatness: 3, obedience: 3, sense_of_responsibility: 3,
        attentiveness_remark: '', honesty_remark: '', neatness_remark: '', obedience_remark: '', sense_of_responsibility_remark: ''
      };
      clearedPsychomotor[student.id] = {
        attention_to_direction: 3, considerate_of_others: 3, handwriting: 3, sports: 3, verbal_fluency: 3, works_well_independently: 3,
        attention_to_direction_remark: '', considerate_of_others_remark: '', handwriting_remark: '', sports_remark: '', verbal_fluency_remark: '', works_well_independently_remark: ''
      };
    });
    
    setAffectiveData(clearedAffective);
    setPsychomotorData(clearedPsychomotor);
  };

  const toggleStudentExpansion = (studentId: number) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 5) return 'bg-green-100 text-green-800 border-green-200';
    if (rating >= 4) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (rating >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 5) return 'Excellent';
    if (rating >= 4) return 'Very Good';
    if (rating >= 3) return 'Good';
    return 'Needs Improvement';
  };

  const affectiveDomainsList = [
    { field: 'attentiveness', label: 'Attentiveness' },
    { field: 'honesty', label: 'Honesty' },
    { field: 'neatness', label: 'Neatness' },
    { field: 'obedience', label: 'Obedience' },
    { field: 'sense_of_responsibility', label: 'Responsibility' }
  ];

  const psychomotorDomainsList = [
    { field: 'attention_to_direction', label: 'Attention' },
    { field: 'considerate_of_others', label: 'Consideration' },
    { field: 'handwriting', label: 'Handwriting' },
    { field: 'sports', label: 'Sports' },
    { field: 'verbal_fluency', label: 'Verbal Fluency' },
    { field: 'works_well_independently', label: 'Independence' }
  ];

  const currentData = activeTab === 'affective' ? affectiveData : psychomotorData;
  const currentDomainsList = activeTab === 'affective' ? affectiveDomainsList : psychomotorDomainsList;
  const currentIcon = activeTab === 'affective' ? Heart : Activity;
  const currentColor = activeTab === 'affective' ? 'red' : 'green';

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {activeTab === 'affective' ? (
                <Heart className="w-5 h-5 text-red-600" />
              ) : (
                <Activity className="w-5 h-5 text-green-600" />
              )}
              Student Domains Assessment
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Record student behavior and skills - Real-time sync with compile results
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{currentTeacher && `${currentTeacher.firstName} ${currentTeacher.lastName}`}</span>
            <span>•</span>
            <span>{currentTerm} • {currentAcademicYear}</span>
          </div>
        </div>
      </div>

      {/* Class Selection and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <Label className="text-sm font-medium text-gray-700 block mb-2">Select Class</Label>
            <Select
              value={selectedClassId.toString()}
              onValueChange={(value) => {
                const rawId = parseInt(value);
                const canonicalId = resolveCanonicalClassId(rawId) ?? rawId;
                setSelectedClassId(canonicalId);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose class..." />
              </SelectTrigger>
              <SelectContent>
                {teacherClasses.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name} - {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Tab Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 flex-1">
                <button
                  onClick={() => setActiveTab('affective')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'affective' 
                      ? 'bg-white text-red-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Affective
                </button>
                <button
                  onClick={() => setActiveTab('psychomotor')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'psychomotor' 
                      ? 'bg-white text-green-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Psychomotor
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleMarkAllExcellent}
                  size="sm"
                  className="text-xs"
                  disabled={classStudents.length === 0}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All Excellent
                </Button>
                <Button
                  onClick={handleClearAll}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={classStudents.length === 0}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      {selectedClassId > 0 && classStudents.length > 0 && (
        <div className="space-y-3">
          {classStudents.map(student => {
            const studentData = currentData[student.id] || {};
            const isExpanded = expandedStudents[student.id];
            const overallRating = currentDomainsList.reduce((sum, domain) => sum + (studentData[domain.field] || 3), 0) / currentDomainsList.length;
            
            return (
              <Card key={student.id} className="bg-white shadow-sm">
                <CardContent className="p-4">
                  {/* Student Header - Always Visible */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleStudentExpansion(student.id)}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Avatar className="h-8 w-8 bg-gray-100 text-gray-600">
                          <AvatarImage
                            src={getStudentPhotoCandidates(student)[0] || ''}
                            alt={`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'}
                            className="object-cover"
                            data-candidate-idx={0}
                            onError={(e) => handleStudentPhotoError(e, student)}
                          />
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                            {getInitials(student)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {student.admissionNumber} • {student.gender}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getRatingColor(Math.round(overallRating))}`}>
                        {getRatingText(Math.round(overallRating))}
                      </Badge>
                      <button
                        onClick={() => toggleStudentExpansion(student.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Domain Details - Expandable */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {currentDomainsList.map(domain => (
                          <div key={domain.field} className="space-y-2">
                            <Label className="text-xs font-medium text-gray-700">
                              {domain.label}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={(studentData[domain.field] || 3).toString()}
                                onValueChange={(value) => handleDomainChange(student.id, activeTab, domain.field, parseInt(value))}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 - Poor</SelectItem>
                                  <SelectItem value="2">2 - Fair</SelectItem>
                                  <SelectItem value="3">3 - Good</SelectItem>
                                  <SelectItem value="4">4 - Very Good</SelectItem>
                                  <SelectItem value="5">5 - Excellent</SelectItem>
                                </SelectContent>
                              </Select>
                              <Badge className={`text-xs ${getRatingColor(studentData[domain.field] || 3)}`}>
                                {getRatingText(studentData[domain.field] || 3)}
                              </Badge>
                            </div>
                            <Textarea
                              placeholder={`Remarks...`}
                              value={studentData[`${domain.field}_remark`] || ''}
                              onChange={(e) => handleDomainChange(student.id, activeTab, `${domain.field}_remark`, e.target.value)}
                              className="text-sm resize-none"
                              rows={2}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {selectedClassId === 0 && (
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'affective' ? (
                <Heart className="w-6 h-6 text-red-600" />
              ) : (
                <Activity className="w-6 h-6 text-green-600" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
            <p className="text-sm text-gray-600">
              Choose a class to start recording {activeTab} domains
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
