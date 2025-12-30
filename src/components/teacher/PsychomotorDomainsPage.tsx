import { useState, useEffect } from "react";
import { Activity, Users, CheckCircle, XCircle, RotateCcw, AlertTriangle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useSchool } from "../../contexts/SchoolContext";

export function PsychomotorDomainsPage() {
  const { 
    currentUser, 
    teachers, 
    classes, 
    students, 
    getStudentsByClass, 
    psychomotorDomains,
    loadPsychomotorDomainsFromAPI,
    updatePsychomotorDomain,
    addPsychomotorDomain,
    currentTerm,
    currentAcademicYear
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [psychomotorData, setPsychomotorData] = useState<{[studentId: number]: any}>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load psychomotor domains data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadPsychomotorDomainsFromAPI();
      } catch (error) {
        // Silently continue with empty data
      }
    };
    loadData();
  }, []);

  // Get current teacher's classes
  const currentTeacher = teachers.find(t => t.id === currentUser?.linked_id);
  const teacherClasses = classes.filter((c: any) => c.classTeacherId === currentTeacher?.id);

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

  const classStudents = selectedClassId ? getStudentsByClass(selectedClassId) : [];

  // Load existing psychomotor data when class is selected
  useEffect(() => {
    if (selectedClassId > 0 && classStudents.length > 0) {
      try {
        const existingData: {[studentId: number]: any} = {};
        
        classStudents.forEach(student => {
          const existingPsychomotor = psychomotorDomains.find(pd => 
            pd.student_id === student.id &&
            pd.class_id === Number(selectedClassId) &&
            pd.term === currentTerm &&
            pd.academic_year === currentAcademicYear
          );
          
          if (existingPsychomotor) {
            existingData[student.id] = {
              attention_to_direction: existingPsychomotor.attention_to_direction || 3,
              attention_to_direction_remark: existingPsychomotor.attention_to_direction_remark || '',
              considerate_of_others: existingPsychomotor.considerate_of_others || 3,
              considerate_of_others_remark: existingPsychomotor.considerate_of_others_remark || '',
              handwriting: existingPsychomotor.handwriting || 3,
              handwriting_remark: existingPsychomotor.handwriting_remark || '',
              sports: existingPsychomotor.sports || 3,
              sports_remark: existingPsychomotor.sports_remark || '',
              verbal_fluency: existingPsychomotor.verbal_fluency || 3,
              verbal_fluency_remark: existingPsychomotor.verbal_fluency_remark || '',
              works_well_independently: existingPsychomotor.works_well_independently || 3,
              works_well_independently_remark: existingPsychomotor.works_well_independently_remark || ''
            };
          } else {
            // Default values
            existingData[student.id] = {
              attention_to_direction: 3,
              attention_to_direction_remark: '',
              considerate_of_others: 3,
              considerate_of_others_remark: '',
              handwriting: 3,
              handwriting_remark: '',
              sports: 3,
              sports_remark: '',
              verbal_fluency: 3,
              verbal_fluency_remark: '',
              works_well_independently: 3,
              works_well_independently_remark: ''
            };
          }
        });
        
        setPsychomotorData(existingData);
      } catch (error) {
        setPsychomotorData({});
      }
    }
  }, [selectedClassId, classStudents, currentTerm, currentAcademicYear, psychomotorDomains]);

  // Handle psychomotor domain change with real-time save
  const handlePsychomotorChange = async (studentId: number, field: string, value: any) => {
    // Update local state immediately
    setPsychomotorData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));

    // Save to database immediately
    try {
      const studentData = psychomotorData[studentId] || {};
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

      const existingPsychomotor = psychomotorDomains.find(pd => 
        pd.student_id === studentId &&
        pd.class_id === Number(selectedClassId) &&
        pd.term === currentTerm &&
        pd.academic_year === currentAcademicYear
      );

      if (existingPsychomotor) {
        await updatePsychomotorDomain(existingPsychomotor.id, payload);
      } else {
        await addPsychomotorDomain(payload);
      }
    } catch (error) {
      console.error('Error saving psychomotor domain data:', error);
    }
  };

  // Quick actions
  const handleMarkAllExcellent = async () => {
    const allExcellent: {[studentId: number]: any} = {};
    classStudents.forEach(student => {
      allExcellent[student.id] = {
        attention_to_direction: 5,
        attention_to_direction_remark: 'Excellent attention',
        considerate_of_others: 5,
        considerate_of_others_remark: 'Very considerate',
        handwriting: 5,
        handwriting_remark: 'Beautiful handwriting',
        sports: 5,
        sports_remark: 'Excellent in sports',
        verbal_fluency: 5,
        verbal_fluency_remark: 'Very fluent',
        works_well_independently: 5,
        works_well_independently_remark: 'Highly independent'
      };
    });
    setPsychomotorData(allExcellent);
    
    // Save all to database
    for (const student of classStudents) {
      const data = allExcellent[student.id];
      for (const [field, value] of Object.entries(data)) {
        await handlePsychomotorChange(student.id, field, value);
      }
    }
    
    toast.success('All students marked as excellent');
  };

  const handleClearAll = () => {
    const clearedData: {[studentId: number]: any} = {};
    classStudents.forEach(student => {
      clearedData[student.id] = {
        attention_to_direction: 3,
        attention_to_direction_remark: '',
        considerate_of_others: 3,
        considerate_of_others_remark: '',
        handwriting: 3,
        handwriting_remark: '',
        sports: 3,
        sports_remark: '',
        verbal_fluency: 3,
        verbal_fluency_remark: '',
        works_well_independently: 3,
        works_well_independently_remark: ''
      };
    });
    setPsychomotorData(clearedData);
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
              <Activity className="w-5 h-5 text-green-600" />
              Psychomotor Domains
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Record student skills and physical development - Automatically synced with compile results
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
                const studentData = psychomotorData[student.id] || {};
                
                return (
                  <div key={student.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Student Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-green-600">
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
                          ((studentData.attention_to_direction || 3) + 
                           (studentData.considerate_of_others || 3) + 
                           (studentData.handwriting || 3) + 
                           (studentData.sports || 3) + 
                           (studentData.verbal_fluency || 3) + 
                           (studentData.works_well_independently || 3)) / 6
                        )}
                      </Badge>
                    </div>

                    {/* Psychomotor Domains Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { field: 'attention_to_direction', label: 'Attention to Direction' },
                        { field: 'considerate_of_others', label: 'Considerate of Others' },
                        { field: 'handwriting', label: 'Handwriting' },
                        { field: 'sports', label: 'Sports' },
                        { field: 'verbal_fluency', label: 'Verbal Fluency' },
                        { field: 'works_well_independently', label: 'Works Well Independently' }
                      ].map(domain => (
                        <div key={domain.field} className="space-y-2">
                          <Label className="text-xs font-medium text-gray-700">
                            {domain.label}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={(studentData[domain.field] || 3).toString()}
                              onValueChange={(value) => handlePsychomotorChange(student.id, domain.field, parseInt(value))}
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
                            onChange={(e) => handlePsychomotorChange(student.id, `${domain.field}_remark`, e.target.value)}
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
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
            <p className="text-sm text-gray-600">
              Choose a class to start recording psychomotor domains
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
