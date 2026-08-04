import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { CumulativeResultSheet } from '../../CumulativeResultSheet';
import { generateCumulativePDF } from '../../../utils/pdfGenerator';
import { toast } from 'sonner';
import type { CumulativeResult as SchoolCumulativeResult } from '../../../types/school';

interface CumulativeStudent {
  id: number;
  firstName: string;
  lastName: string;
  class_id: number;
}

interface CumulativeResultsTabProps {
  selectedYear: string;
  selectedClassId: string;
  currentUser: { role: string } | null;
  loadingCumulative: boolean;
  cumulativeResults: SchoolCumulativeResult[];
  students: CumulativeStudent[];
  classes: Array<{ id: number; name: string }>;
  schoolSettings: Record<string, unknown>;
  onCompile: () => void;
  checkShouldShowPosition: (className: string | undefined) => boolean;
  getGrade: (score: number) => string;
  formatPositionWithSuffix: (pos: number) => string;
}

export const CumulativeResultsTab = React.memo(function CumulativeResultsTab({
  selectedYear,
  selectedClassId,
  currentUser,
  loadingCumulative,
  cumulativeResults,
  students,
  classes,
  schoolSettings,
  onCompile,
  checkShouldShowPosition,
  getGrade,
  formatPositionWithSuffix,
}: CumulativeResultsTabProps) {
  return (
    <div className="section-band">
      <div className="mb-4 bg-gradient-to-r from-[#0A2540] to-[#0A2540]/90 text-white rounded-t-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Cumulative Results - {selectedYear} Session
          </h3>
          {currentUser?.role === 'admin' && (
            <Button
              size="sm"
              disabled={loadingCumulative}
              onClick={onCompile}
              className="bg-white text-[#0A2540] hover:bg-[#0A2540]/5 h-7 text-xs"
            >
              {loadingCumulative ? 'Compiling...' : 'Compile Cumulative'}
            </Button>
          )}
        </div>
      </div>
      <div className="p-4">
        {selectedClassId === "all" ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Select a specific class to view cumulative results</p>
          </div>
        ) : loadingCumulative ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2540] mx-auto mb-3"></div>
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
              const student = students.find((s) => s.id === cr.student_id);
              if (!student) return null;
              const studentClass = classes.find((c) => c.id === student.class_id);
              const showPos = checkShouldShowPosition(studentClass?.name);
              return (
                <div key={cr.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-gray-500">
                        Avg: {cr.average_score.toFixed(1)}% | Grade: {getGrade(cr.average_score)}
                        {showPos && cr.position != null ? ` | Pos: ${formatPositionWithSuffix(cr.position)}` : ''}
                        {' | '}{cr.promotion_status || 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-7 text-xs rounded-lg">
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Cumulative Result - {student.firstName} {student.lastName}
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
                            className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-lg"
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
      </div>
    </div>
  );
});
