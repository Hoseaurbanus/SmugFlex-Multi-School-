import React from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface StudentAttendance {
  ratio: string;
  attendanceRate: number;
}

interface AttendanceDisplayCardProps {
  studentAttendance: StudentAttendance | null;
  isSubmitted: boolean;
  isRejected: boolean;
}

export const AttendanceDisplayCard = React.memo(function AttendanceDisplayCard({
  studentAttendance,
  isSubmitted,
  isRejected,
}: AttendanceDisplayCardProps) {
  return (
    <Card className="border-[#0A2540]/10 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-3 rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4" />
          Attendance Record
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-800">Attendance Ratio:</span>
              <span className="text-lg font-bold text-indigo-900">
                {studentAttendance?.ratio || '0/60'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-indigo-700">Attendance Rate:</span>
              <span className="text-sm font-semibold text-indigo-800">
                {studentAttendance?.attendanceRate.toFixed(1) || '0.0'}%
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 text-center">
              <Calendar className="w-3 h-3 inline mr-1" />
              Attendance is now managed in the Mark Attendance page
            </p>
          </div>
          
          {isSubmitted && !isRejected && (
            <p className="text-xs text-gray-600 mt-1">
              Attendance cannot be modified after result submission.
            </p>
          )}
          
          {isRejected && (
            <p className="text-xs text-orange-600 mt-1">
              Result was rejected. You can edit and resubmit.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
