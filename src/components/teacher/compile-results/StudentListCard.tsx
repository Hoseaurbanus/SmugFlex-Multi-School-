import React from 'react';
import { Users, CheckCircle, Heart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { getStudentPhotoCandidates, handleStudentPhotoError } from '../../../utils/studentPhoto';
import type { Student } from '../../../types/school';

interface StudentCompletion {
  studentId: number;
  completedSubjects: number;
  totalSubjects: number;
  hasAffective: boolean;
  hasPsychomotor: boolean;
  isComplete: boolean;
  isSubmitted: boolean;
  isRejected: boolean;
}

interface StudentListCardProps {
  selectedClassId: string | number | null;
  classStudents: Student[];
  studentsCompletion: StudentCompletion[];
  resultsGenerated: boolean;
  allSubmitted: boolean;
  submittedCount: number;
  eligibleForSubmission: StudentCompletion[];
  onSelectStudent: (id: number) => void;
  onSubmitAll: () => void;
}

export const StudentListCard = React.memo(function StudentListCard({
  selectedClassId,
  classStudents,
  studentsCompletion,
  resultsGenerated,
  allSubmitted,
  submittedCount,
  eligibleForSubmission,
  onSelectStudent,
  onSubmitAll,
}: StudentListCardProps) {
  if (!selectedClassId) return null;

  return (
    <Card className="border-[#0A2540]/10 shadow-lg">
      <CardHeader className="border-b border-[#0A2540]/10 bg-gradient-to-r from-[#0A2540]/5 to-[#1E40AF]/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0A2540] flex items-center gap-2">
              <Users className="w-6 h-6 text-[#1E40AF]" />
              Students List
            </h2>
            <p className="text-[#64748B] font-medium">
              {classStudents.length} students in class
            </p>
          </div>
          <div className="flex gap-3">
            {allSubmitted ? (
              <Button
                disabled={true}
                className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 rounded-xl px-4 py-2 font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                All Submitted ({submittedCount})
              </Button>
            ) : (
              <Button
                onClick={onSubmitAll}
                disabled={!resultsGenerated || eligibleForSubmission.length === 0}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-4 py-2 font-semibold transition-all transform hover:scale-105"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit All ({eligibleForSubmission.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-3">
        {classStudents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold text-base">No students in this class</p>
            <p className="text-gray-400 text-xs sm:text-sm">Students will appear here once they are enrolled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classStudents.map((student) => {
              const completion = Array.isArray(studentsCompletion) ? studentsCompletion.find(s => s.studentId === student.id) : undefined;

              return (
                <div
                  key={student.id}
                  className="p-3 sm:p-4 border border-[#0A2540]/10 rounded-xl hover:border-[#1E40AF]/30 hover:bg-gradient-to-r hover:from-[#0A2540]/5 hover:to-[#1E40AF]/5 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => onSelectStudent(student.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-[#1E40AF] shadow-sm">
                        {student.photo_url ? (
                          <img 
                            src={getStudentPhotoCandidates(student as unknown as Record<string, unknown>)[0] || ''} 
                            alt={`${student.firstName} ${student.lastName}`}
                            className="w-full h-full object-cover rounded-full"
                            data-candidate-idx={0}
                            onError={(e) => {
                              handleStudentPhotoError(e, student as unknown as Record<string, unknown>);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <AvatarFallback className="bg-[#1E40AF] text-white font-bold">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <p className="text-[#0A2540] font-semibold text-sm sm:text-base">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">{student.admissionNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-[#64748B] mb-1">Scores</p>
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={completion?.completedSubjects === completion?.totalSubjects ? "default" : "outline"}
                            className={`rounded-full text-xs font-semibold px-2 py-1 ${
                              completion?.completedSubjects === completion?.totalSubjects 
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                                : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                            }`}
                          >
                            {completion?.completedSubjects || 0}/{completion?.totalSubjects || 0}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-center hidden sm:block">
                        <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${completion?.hasAffective ? 'text-green-500' : 'text-gray-300'}`} />
                        <p className="text-xs text-gray-500 mt-1 hidden sm:block">Affective</p>
                      </div>

                      <div className="text-center hidden sm:block">
                        <Activity className={`w-4 h-4 sm:w-5 sm:h-5 ${completion?.hasPsychomotor ? 'text-green-500' : 'text-gray-300'}`} />
                        <p className="text-xs text-gray-500 mt-1 hidden sm:block">Psychomotor</p>
                      </div>

                      <div className="text-center">
                        {completion?.isSubmitted ? (
                          <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Submitted</span>
                            <span className="sm:hidden">Sub</span>
                          </Badge>
                        ) : completion?.isRejected ? (
                          <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Resubmit</span>
                            <span className="sm:hidden">Res</span>
                          </Badge>
                        ) : completion?.isComplete ? (
                          <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                            Ready
                          </Badge>
                        ) : (
                          <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 rounded-full text-xs font-semibold px-2 sm:px-3 py-1">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
