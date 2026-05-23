import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Heart, Activity, Users, CheckCircle, RotateCcw, AlertTriangle, Save, ChevronDown, ChevronUp, Search, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useSchool } from "../../contexts/SchoolContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { API_CONFIG } from "../../config/api";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "../ui/alert-dialog";

const DEBOUNCE_MS = 600;

const AFFECTIVE_DOMAINS_LIST = [
  { field: 'attentiveness', label: 'Attentiveness' },
  { field: 'honesty', label: 'Honesty' },
  { field: 'neatness', label: 'Neatness' },
  { field: 'obedience', label: 'Obedience' },
  { field: 'sense_of_responsibility', label: 'Responsibility' }
];

const PSYCHOMOTOR_DOMAINS_LIST = [
  { field: 'attention_to_direction', label: 'Attention' },
  { field: 'considerate_of_others', label: 'Consideration' },
  { field: 'handwriting', label: 'Handwriting' },
  { field: 'sports', label: 'Sports' },
  { field: 'verbal_fluency', label: 'Verbal Fluency' },
  { field: 'works_well_independently', label: 'Independence' }
];

function getRatingColor(rating: number) {
  if (rating >= 5) return 'bg-green-100 text-green-800 border-green-200';
  if (rating >= 4) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (rating >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function getRatingText(rating: number) {
  if (rating >= 5) return 'Excellent';
  if (rating >= 4) return 'Very Good';
  if (rating >= 3) return 'Good';
  return 'Needs Improvement';
}

function getStudentPhotoCandidates(student: any): string[] {
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
}

function getInitials(student: any) {
  const a = String(student?.firstName || '').trim();
  const b = String(student?.lastName || '').trim();
  return `${a[0] || ''}${b[0] || ''}`.toUpperCase() || '??';
}

function defaultAffective() {
  return {
    attentiveness: 3, honesty: 3, neatness: 3, obedience: 3, sense_of_responsibility: 3,
    attentiveness_remark: '', honesty_remark: '', neatness_remark: '', obedience_remark: '', sense_of_responsibility_remark: ''
  };
}

function defaultPsychomotor() {
  return {
    attention_to_direction: 3, considerate_of_others: 3, handwriting: 3, sports: 3, verbal_fluency: 3, works_well_independently: 3,
    attention_to_direction_remark: '', considerate_of_others_remark: '', handwriting_remark: '', sports_remark: '', verbal_fluency_remark: '', works_well_independently_remark: ''
  };
}

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

  // ---- All hooks go here, before any conditional returns ----

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [affectiveData, setAffectiveData] = useState<Record<number, any>>({});
  const [psychomotorData, setPsychomotorData] = useState<Record<number, any>>({});
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'affective' | 'psychomotor'>('affective');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStudents, setSavingStudents] = useState<Record<string, boolean>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Refs for latest data to avoid stale closures
  const affectiveDataRef = useRef(affectiveData);
  const psychomotorDataRef = useRef(psychomotorData);
  const compiledResultsRef = useRef(compiledResults);
  const affectiveDomainsRef = useRef(affectiveDomains);
  const psychomotorDomainsRef = useRef(psychomotorDomains);
  const selectedClassIdRef = useRef(selectedClassId);
  const currentTermRef = useRef(currentTerm);
  const currentAcademicYearRef = useRef(currentAcademicYear);
  const currentUserRef = useRef(currentUser);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sync refs with state
  useEffect(() => { affectiveDataRef.current = affectiveData; }, [affectiveData]);
  useEffect(() => { psychomotorDataRef.current = psychomotorData; }, [psychomotorData]);
  useEffect(() => { compiledResultsRef.current = compiledResults; }, [compiledResults]);
  useEffect(() => { affectiveDomainsRef.current = affectiveDomains; }, [affectiveDomains]);
  useEffect(() => { psychomotorDomainsRef.current = psychomotorDomains; }, [psychomotorDomains]);
  useEffect(() => { selectedClassIdRef.current = selectedClassId; }, [selectedClassId]);
  useEffect(() => { currentTermRef.current = currentTerm; }, [currentTerm]);
  useEffect(() => { currentAcademicYearRef.current = currentAcademicYear; }, [currentAcademicYear]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Cleanup save timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(t => clearTimeout(t));
      saveTimersRef.current = {};
    };
  }, []);

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

  // ---- Regular variables (computed after hooks) ----

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

  // Auto-select first available class on load (computed AFTER teacherClasses)
  useEffect(() => {
    if (teacherClasses.length > 0 && selectedClassId === 0) {
      const firstClass = teacherClasses[0];
      const canonicalId = resolveCanonicalClassId(firstClass.id) ?? firstClass.id;
      setSelectedClassId(canonicalId);
    }
  }, [teacherClasses.length, selectedClassId]);

  const classStudents = selectedClassId
    ? (students || []).filter(s => {
        const effectiveSelectedClassId = resolveCanonicalClassId(selectedClassId) ?? selectedClassId;
        const isSameClass = String(s.class_id) === String(effectiveSelectedClassId);
        const status = String((s as any)?.status ?? '').trim().toLowerCase();
        const isActive = status === '' || status === 'active';
        return isSameClass && isActive;
      })
    : [];

  const filteredStudents = classStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.firstName || '').toLowerCase().includes(q) ||
      (s.lastName || '').toLowerCase().includes(q) ||
      (s.admissionNumber || '').toLowerCase().includes(q);
  });

  const allExpanded = filteredStudents.length > 0 && filteredStudents.every(s => expandedStudents[s.id]);

  const currentData = activeTab === 'affective' ? affectiveData : psychomotorData;
  const currentDomainsList = activeTab === 'affective' ? AFFECTIVE_DOMAINS_LIST : PSYCHOMOTOR_DOMAINS_LIST;
  const studentsToRender = searchQuery.trim() ? filteredStudents : classStudents;

  // ---- Callbacks ----

  const performSave = useCallback(async (studentId: number, domainType: 'affective' | 'psychomotor') => {
    const key = `${studentId}-${domainType}`;
    setSavingStudents(prev => ({ ...prev, [key]: true }));

    const data = domainType === 'affective' ? affectiveDataRef.current : psychomotorDataRef.current;
    const studentData = data[studentId];
    if (!studentData) {
      setSavingStudents(prev => ({ ...prev, [key]: false }));
      return;
    }

    const updateFn = domainType === 'affective' ? updateAffectiveDomain : updatePsychomotorDomain;
    const addFn = domainType === 'affective' ? addAffectiveDomain : addPsychomotorDomain;
    const domains = domainType === 'affective' ? affectiveDomainsRef.current : psychomotorDomainsRef.current;
    const theClassId = selectedClassIdRef.current;
    const theTerm = currentTermRef.current;
    const theYear = currentAcademicYearRef.current;

    try {
      const existingDomain = domains.find((d: any) => 
        d.student_id === studentId &&
        d.class_id === Number(theClassId) &&
        d.term === theTerm &&
        d.academic_year === theYear
      );

      const payload = {
        student_id: studentId,
        class_id: Number(theClassId),
        term: theTerm,
        academic_year: theYear,
        ...studentData,
        entered_by: currentUserRef.current?.id,
        entry_date: new Date().toISOString()
      };

      if (existingDomain) {
        await updateFn(existingDomain.id, payload);
      } else {
        await addFn(payload);
      }

      const latestCompiledResults = compiledResultsRef.current;
      const compiledResult = latestCompiledResults.find((cr: any) => 
        cr.student_id === studentId &&
        String(cr.class_id) === String(theClassId) &&
        cr.term === theTerm &&
        cr.academic_year === theYear
      );

      if (compiledResult) {
        if (compiledResult.status === 'Approved') {
          toast.error(`Cannot update domains: Results have been approved by admin`, {
            id: `blocked-domains-${studentId}`,
            duration: 5000
          });
          return;
        }

        await updateCompiledResult(compiledResult.id, {
          [domainType]: studentData
        });
      }
    } catch (error) {
      toast.error(`Failed to save ${domainType} data for student #${studentId}`);
    } finally {
      setSavingStudents(prev => ({ ...prev, [key]: false }));
    }
  }, [updateAffectiveDomain, updatePsychomotorDomain, addAffectiveDomain, addPsychomotorDomain, updateCompiledResult]);

  const scheduleSave = useCallback((studentId: number, domainType: 'affective' | 'psychomotor') => {
    const key = `${studentId}-${domainType}`;
    if (saveTimersRef.current[key]) {
      clearTimeout(saveTimersRef.current[key]);
    }
    saveTimersRef.current[key] = setTimeout(() => {
      performSave(studentId, domainType);
    }, DEBOUNCE_MS);
  }, [performSave]);

  const handleDomainChange = useCallback((studentId: number, domainType: 'affective' | 'psychomotor', field: string, value: any) => {
    const setData = domainType === 'affective' ? setAffectiveData : setPsychomotorData;

    setData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));

    scheduleSave(studentId, domainType);
  }, [scheduleSave]);

  const toggleStudentExpansion = useCallback((studentId: number) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClearAll = useCallback(() => {
    const clearedAffective: Record<number, any> = {};
    const clearedPsychomotor: Record<number, any> = {};

    for (const student of classStudents) {
      clearedAffective[student.id] = defaultAffective();
      clearedPsychomotor[student.id] = defaultPsychomotor();
    }

    setAffectiveData(clearedAffective);
    setPsychomotorData(clearedPsychomotor);
    toast.info('Domain ratings cleared (not saved yet — edit to trigger saves)');
    setShowClearConfirm(false);
  }, [classStudents]);

  const saveOneStudentDomains = async (studentId: number, domainType: 'affective' | 'psychomotor', data: any) => {
    const updateFn = domainType === 'affective' ? updateAffectiveDomain : updatePsychomotorDomain;
    const addFn = domainType === 'affective' ? addAffectiveDomain : addPsychomotorDomain;
    const domains = domainType === 'affective' ? affectiveDomainsRef.current : psychomotorDomainsRef.current;
    const theClassId = selectedClassIdRef.current;
    const theTerm = currentTermRef.current;
    const theYear = currentAcademicYearRef.current;

    const existingDomain = domains.find((d: any) => 
      d.student_id === studentId &&
      d.class_id === Number(theClassId) &&
      d.term === theTerm &&
      d.academic_year === theYear
    );

    const payload = {
      student_id: studentId,
      class_id: Number(theClassId),
      term: theTerm,
      academic_year: theYear,
      ...data,
      entered_by: currentUserRef.current?.id,
      entry_date: new Date().toISOString()
    };

    if (existingDomain) {
      await updateFn(existingDomain.id, payload);
    } else {
      await addFn(payload);
    }
  };

  const handleMarkAllExcellent = useCallback(async () => {
    if (classStudents.length === 0) return;
    setIsBulkSaving(true);

    const allAffective: Record<number, any> = {};
    const allPsychomotor: Record<number, any> = {};

    for (const student of classStudents) {
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
    }

    setAffectiveData(allAffective);
    setPsychomotorData(allPsychomotor);

    Object.values(saveTimersRef.current).forEach(t => clearTimeout(t));
    saveTimersRef.current = {};

    const saveTasks = classStudents.flatMap(student => [
      saveOneStudentDomains(student.id, 'affective', allAffective[student.id]),
      saveOneStudentDomains(student.id, 'psychomotor', allPsychomotor[student.id])
    ]);

    const results = await Promise.allSettled(saveTasks);
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed === 0) {
      toast.success(`All ${classStudents.length} students marked as excellent`);
    } else {
      toast.warning(`${succeeded} students saved, ${failed} failed`);
    }
    setIsBulkSaving(false);
  }, [classStudents]);

  const toggleAll = useCallback(() => {
    const next = !allExpanded;
    const map: Record<number, boolean> = {};
    for (const s of filteredStudents) { map[s.id] = next; }
    setExpandedStudents(prev => ({ ...prev, ...map }));
  }, [filteredStudents, allExpanded]);

  // Load existing data when class is selected
  useEffect(() => {
    if (selectedClassId > 0 && classStudents.length > 0) {
      try {
        const affectiveExisting: Record<number, any> = {};
        const psychomotorExisting: Record<number, any> = {};
        
        classStudents.forEach(student => {
          const compiledResult = compiledResults.find(cr => 
            cr.student_id === student.id &&
            String(cr.class_id) === String(selectedClassId) &&
            cr.term === currentTerm &&
            cr.academic_year === currentAcademicYear
          );
          
          const existingAffective = affectiveDomains.find(ad => 
            ad.student_id === student.id &&
            String(ad.class_id) === String(selectedClassId) &&
            ad.term === currentTerm &&
            ad.academic_year === currentAcademicYear
          );
          
          let affectiveSource = null;
          if (compiledResult?.affective) {
            affectiveSource = typeof compiledResult.affective === 'string' 
              ? JSON.parse(compiledResult.affective) 
              : compiledResult.affective;
          } else if (existingAffective) {
            affectiveSource = existingAffective;
          }
          
          affectiveExisting[student.id] = affectiveSource
            ? {
                attentiveness: affectiveSource.attentiveness ?? 3,
                attentiveness_remark: affectiveSource.attentiveness_remark ?? '',
                honesty: affectiveSource.honesty ?? 3,
                honesty_remark: affectiveSource.honesty_remark ?? '',
                neatness: affectiveSource.neatness ?? 3,
                neatness_remark: affectiveSource.neatness_remark ?? '',
                obedience: affectiveSource.obedience ?? 3,
                obedience_remark: affectiveSource.obedience_remark ?? '',
                sense_of_responsibility: affectiveSource.sense_of_responsibility ?? 3,
                sense_of_responsibility_remark: affectiveSource.sense_of_responsibility_remark ?? ''
              }
            : defaultAffective();
          
          const existingPsychomotor = psychomotorDomains.find(pd => 
            pd.student_id === student.id &&
            String(pd.class_id) === String(selectedClassId) &&
            pd.term === currentTerm &&
            pd.academic_year === currentAcademicYear
          );
          
          let psychomotorSource = null;
          if (compiledResult?.psychomotor) {
            psychomotorSource = typeof compiledResult.psychomotor === 'string' 
              ? JSON.parse(compiledResult.psychomotor) 
              : compiledResult.psychomotor;
          } else if (existingPsychomotor) {
            psychomotorSource = existingPsychomotor;
          }
          
          psychomotorExisting[student.id] = psychomotorSource
            ? {
                attention_to_direction: psychomotorSource.attention_to_direction ?? 3,
                attention_to_direction_remark: psychomotorSource.attention_to_direction_remark ?? '',
                considerate_of_others: psychomotorSource.considerate_of_others ?? 3,
                considerate_of_others_remark: psychomotorSource.considerate_of_others_remark ?? '',
                handwriting: psychomotorSource.handwriting ?? 3,
                handwriting_remark: psychomotorSource.handwriting_remark ?? '',
                sports: psychomotorSource.sports ?? 3,
                sports_remark: psychomotorSource.sports_remark ?? '',
                verbal_fluency: psychomotorSource.verbal_fluency ?? 3,
                verbal_fluency_remark: psychomotorSource.verbal_fluency_remark ?? '',
                works_well_independently: psychomotorSource.works_well_independently ?? 3,
                works_well_independently_remark: psychomotorSource.works_well_independently_remark ?? ''
              }
            : defaultPsychomotor();
        });
        
        setAffectiveData(affectiveExisting);
        setPsychomotorData(psychomotorExisting);
        setExpandedStudents({});
      } catch (error) {
        setAffectiveData({});
        setPsychomotorData({});
      }
    }
  }, [selectedClassId, classStudents.length, currentTerm, currentAcademicYear, affectiveDomains, psychomotorDomains, compiledResults]);

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

  // ---- Early return for no-class state ----

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

  // ---- JSX ----

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
              Record student behavior and skills - Auto-saved changes
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
              value={selectedClassId > 0 ? selectedClassId.toString() : undefined}
              onValueChange={(value) => {
                const rawId = parseInt(value);
                const canonicalId = resolveCanonicalClassId(rawId) ?? rawId;
                setSelectedClassId(canonicalId);
                setSearchQuery('');
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
                  disabled={classStudents.length === 0 || isBulkSaving}
                >
                  {isBulkSaving ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
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

      {/* Search and Toggle All */}
      {selectedClassId > 0 && classStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm rounded-lg border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleAll}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              {allExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
            <span className="text-xs text-gray-500">
              {studentsToRender.length} of {classStudents.length} students
            </span>
          </div>
        </div>
      )}

      {/* Students List */}
      {selectedClassId > 0 && studentsToRender.length > 0 && (
        <div className="space-y-3">
          {studentsToRender.map(student => {
            const studentData = currentData[student.id] || {};
            const isExpanded = expandedStudents[student.id];
            const savingKeyA = `${student.id}-affective`;
            const savingKeyP = `${student.id}-psychomotor`;
            const isSavingThis = savingStudents[savingKeyA] || savingStudents[savingKeyP];
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
                      {isSavingThis && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      )}
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

      {/* No students match search */}
      {selectedClassId > 0 && classStudents.length > 0 && studentsToRender.length === 0 && (
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students match</h3>
            <p className="text-sm text-gray-600">
              Try a different search term
            </p>
          </CardContent>
        </Card>
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

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Domain Ratings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all {activeTab} domain ratings for all students to default (Good/3).
              Changes are applied locally and will be saved as you edit fields.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}