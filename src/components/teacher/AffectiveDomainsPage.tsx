import { useState, useEffect } from "react";
import { Heart, Users, CheckCircle, XCircle, RotateCcw, AlertTriangle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useSchool } from "../../contexts/SchoolContext";

export function AffectiveDomainsPage() {
  const { 
    currentUser, 
    teachers, 
    classes, 
    students, 
    getStudentsByClass, 
    getTeacherAssignments,
    affectiveDomains,
    loadAffectiveDomainsFromAPI,
    updateAffectiveDomain,
    addAffectiveDomain,
    currentTerm,
    currentAcademicYear
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [affectiveData, setAffectiveData] = useState<{[studentId: number]: any}>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load affective domains data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadAffectiveDomainsFromAPI();
      } catch (error) {
        // Silently continue with empty data
      }
    };
    loadData();
  }, []);

  // Get current teacher's classes - both as class teacher and subject teacher
  const currentTeacher = teachers.find(t => t.id === currentUser?.linked_id);
  const teacherAssignments = currentTeacher ? getTeacherAssignments(typeof currentTeacher.id === 'number' ? currentTeacher.id : Number(currentTeacher.id)) : [];
  
  // Get classes where teacher is either class teacher or subject teacher
  const teacherClasses = [
    // Classes where teacher is class teacher
    ...classes.filter((c: any) => c.classTeacherId === (currentTeacher?.id?.toString() || '')),
    // Classes where teacher has subject assignments
    ...teacherAssignments.map(a => classes.find((c: any) => c.id === a.class_id)).filter((c): c is any => Boolean(c))
  ];
  
  // Remove duplicates
  const uniqueTeacherClasses = Array.from(new Map(teacherClasses.map(c => [c.id, c])).values());

  // Enhanced validation - teacher must have some assignment (class or subject)
  if (uniqueTeacherClasses.length === 0) {
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

  const classStudents = selectedClassId ? getStudentsByClass(selectedClassId) : [];

  // Load existing affective data when class is selected
  useEffect(() => {
    if (selectedClassId > 0 && classStudents.length > 0) {
      try {
        const existingData: {[studentId: number]: any} = {};
        
        classStudents.forEach(student => {
          const existingAffective = affectiveDomains.find(ad => 
            ad.student_id === student.id &&
            ad.class_id === Number(selectedClassId) &&
            ad.term === currentTerm &&
            ad.academic_year === currentAcademicYear
          );
          
          if (existingAffective) {
            existingData[student.id] = {
              attentiveness: existingAffective.attentiveness || 3,
              attentiveness_remark: existingAffective.attentiveness_remark || '',
              honesty: existingAffective.honesty || 3,
              honesty_remark: existingAffective.honesty_remark || '',
              neatness: existingAffective.neatness || 3,
              neatness_remark: existingAffective.neatness_remark || '',
              obedience: existingAffective.obedience || 3,
              obedience_remark: existingAffective.obedience_remark || '',
              sense_of_responsibility: existingAffective.sense_of_responsibility || 3,
              sense_of_responsibility_remark: existingAffective.sense_of_responsibility_remark || ''
            };
          } else {
            // Default values
            existingData[student.id] = {
              attentiveness: 3,
              attentiveness_remark: '',
              honesty: 3,
              honesty_remark: '',
              neatness: 3,
              neatness_remark: '',
              obedience: 3,
              obedience_remark: '',
              sense_of_responsibility: 3,
              sense_of_responsibility_remark: ''
            };
          }
        });
        
        setAffectiveData(existingData);
      } catch (error) {
        setAffectiveData({});
      }
    }
  }, [selectedClassId, classStudents, currentTerm, currentAcademicYear, affectiveDomains]);

  // Handle affective domain change with real-time save
  const handleAffectiveChange = async (studentId: number, field: string, value: any) => {
    // Update local state immediately
    setAffectiveData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));

    // Save to database immediately
    try {
      const studentData = affectiveData[studentId] || {};
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

      const existingAffective = affectiveDomains.find(ad => 
        ad.student_id === studentId &&
        ad.class_id === Number(selectedClassId) &&
        ad.term === currentTerm &&
        ad.academic_year === currentAcademicYear
      );

      if (existingAffective) {
        await updateAffectiveDomain(existingAffective.id, payload);
      } else {
        await addAffectiveDomain(payload);
      }
    } catch (error) {
      console.error('Error saving affective domain data:', error);
    }
  };

  // Quick actions
  const handleMarkAllExcellent = async () => {
    const allExcellent: {[studentId: number]: any} = {};
    classStudents.forEach(student => {
      allExcellent[student.id] = {
        attentiveness: 5,
        attentiveness_remark: 'Excellent performance',
        honesty: 5,
        honesty_remark: 'Very honest',
        neatness: 5,
        neatness_remark: 'Always neat',
        obedience: 5,
        obedience_remark: 'Perfect obedience',
        sense_of_responsibility: 5,
        sense_of_responsibility_remark: 'Highly responsible'
      };
    });
    setAffectiveData(allExcellent);
    
    // Save all to database
    for (const student of classStudents) {
      const data = allExcellent[student.id];
      for (const [field, value] of Object.entries(data)) {
        await handleAffectiveChange(student.id, field, value);
      }
    }
    
    toast.success('All students marked as excellent');
  };

  const handleClearAll = () => {
    const clearedData: {[studentId: number]: any} = {};
    classStudents.forEach(student => {
      clearedData[student.id] = {
        attentiveness: 3,
        attentiveness_remark: '',
        honesty: 3,
        honesty_remark: '',
        neatness: 3,
        neatness_remark: '',
        obedience: 3,
        obedience_remark: '',
        sense_of_responsibility: 3,
        sense_of_responsibility_remark: ''
      };
    });
    setAffectiveData(clearedData);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 5) return 'text-green-600 bg-green-50';
    if (rating >= 4) return 'text-blue-600 bg-blue-50';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 5) return 'Excellent';
    if (rating >= 4) return 'Very Good';
    if (rating >= 3) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Affective Domains
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Record student behavior and attitude - Automatically synced with compile results
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {currentTeacher && `${currentTeacher.firstName} ${currentTeacher.lastName}`}
            </div>
            <div className="text-xs text-gray-500">
              {currentTerm} • {currentAcademicYear}
            </div>
          </div>
        </div>
      </div>

      {/* Class Selection */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Class</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={selectedClassId.toString()} onValueChange={(value) => setSelectedClassId(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class..." />
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

      {/* Quick Actions */}
      {selectedClassId > 0 && classStudents.length > 0 && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Save className="w-4 h-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleMarkAllExcellent}
                size="sm"
                className="text-xs"
                disabled={classStudents.length === 0}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Mark All Excellent
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
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      {selectedClassId > 0 && classStudents.length > 0 && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students - {classStudents.length} Total
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {classStudents.map(student => {
                const studentData = affectiveData[student.id] || {};
                
                return (
                  <div key={student.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Student Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-red-600">
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {student.admissionNumber} • {student.gender}
                          </p>
                        </div>
                      </div>
                      
                      <Badge className="text-xs">
                        Overall: {getRatingText(
                          ((studentData.attentiveness || 3) + 
                           (studentData.honesty || 3) + 
                           (studentData.neatness || 3) + 
                           (studentData.obedience || 3) + 
                           (studentData.sense_of_responsibility || 3)) / 5
                        )}
                      </Badge>
                    </div>

                    {/* Affective Domains Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { field: 'attentiveness', label: 'Attentiveness' },
                        { field: 'honesty', label: 'Honesty' },
                        { field: 'neatness', label: 'Neatness' },
                        { field: 'obedience', label: 'Obedience' },
                        { field: 'sense_of_responsibility', label: 'Sense of Responsibility' }
                      ].map(domain => (
                        <div key={domain.field} className="space-y-2">
                          <Label className="text-xs font-medium text-gray-700">
                            {domain.label}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={(studentData[domain.field] || 3).toString()}
                              onValueChange={(value) => handleAffectiveChange(student.id, domain.field, parseInt(value))}
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
                            placeholder={`Add remarks for ${domain.label.toLowerCase()}...`}
                            value={studentData[`${domain.field}_remark`] || ''}
                            onChange={(e) => handleAffectiveChange(student.id, `${domain.field}_remark`, e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedClassId === 0 && (
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
            <p className="text-sm text-gray-600">
              Choose a class to start recording affective domains
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
