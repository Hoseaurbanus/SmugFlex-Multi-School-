import React from 'react';
import { Eye, Download, CheckSquare, ArrowLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../ui/dialog';
import { StudentResultCard } from '../../shared/StudentResultCard';

interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className?: string;
  result: {
    id: number;
    average_score: number | string;
    position: number;
    total_students: number;
    status: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ResultRowCardProps {
  studentData: StudentData;
  activeTab: string;
  isSelected: boolean;
  isDownloading: boolean;
  isClosingFullPageView: boolean;
  resultCardRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (resultId: number) => void;
  onView: (studentId: number, resultId: number) => void;
  onDownload: (studentData: StudentData, result: StudentData['result']) => void;
  onSetSelectedResult: (resultId: number | null) => void;
}

export const ResultRowCard = React.memo(function ResultRowCard({
  studentData,
  activeTab,
  isSelected,
  isDownloading,
  isClosingFullPageView,
  resultCardRef,
  onSelect,
  onView,
  onDownload,
  onSetSelectedResult,
}: ResultRowCardProps) {
  return (
    <div className="p-2 sm:p-3 border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {activeTab === "pending" && (
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(studentData.result.id)}
                className="w-4 h-4 text-[#0A2540] rounded border-gray-300 mt-1"
                aria-label={`Select result for ${studentData.firstName} ${studentData.lastName}`}
              />
              <span className="sr-only">Select result for {studentData.firstName} {studentData.lastName}</span>
            </label>
          )}
          <div className="w-8 h-8 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
            {studentData.firstName[0]}
            {studentData.lastName[0]}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-gray-800 leading-tight truncate">
              {studentData.firstName} {studentData.lastName}
            </p>
            <p className="text-xs text-gray-500 font-medium">
              {studentData.admissionNumber} • {studentData.className}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-500 font-medium">Average</p>
              <p className="text-base sm:text-lg font-bold text-gray-800">
                {studentData.result.average_score}%
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-500 font-medium">Position</p>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-lg text-xs font-medium px-2 py-1">
                {studentData.result.position}/{studentData.result.total_students}
              </Badge>
            </div>

            <div>
              <Badge
                className={`rounded-lg text-xs font-medium px-2 py-1 ${
                  studentData.result.status === "Submitted"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : studentData.result.status === "Approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {studentData.result.status}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-[#0A2540]/20 text-[#0A2540] hover:bg-[#0A2540]/5 h-7 sm:h-8 text-xs"
              onClick={() => {
                if (isClosingFullPageView) return;
                onView(studentData.id, studentData.result.id);
              }}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              View
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className={studentData.result.status === 'Approved' ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-7 sm:h-8 text-xs" : "border-gray-200 text-gray-500 hover:bg-gray-50 h-7 sm:h-8 text-xs"}
              onClick={() => onDownload(studentData, studentData.result)}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">{isDownloading ? 'Preparing…' : (studentData.result.status === 'Approved' ? 'Download PDF' : `PDF (${studentData.result.status})`)}</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-[#0A2540] hover:bg-[#082030] text-white rounded-xl h-7 sm:h-8 text-xs"
                  onClick={() => onSetSelectedResult(studentData.result.id)}
                >
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Review</span>
                  <span className="sm:hidden">R</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-full max-h-[95vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '1200px' }}>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => onSetSelectedResult(null)}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Results
                    </Button>
                    <div>
                      <DialogTitle>
                        Review Result - {studentData.firstName} {studentData.lastName}
                      </DialogTitle>
                      <DialogDescription>
                        Review and approve or reject student results
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

              <div className="space-y-6">
                <div id={`result-card-${studentData.result.id}`} ref={resultCardRef} className="w-full overflow-auto">
                  <StudentResultCard
                    result={studentData.result}
                    currentUser={null}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
});
