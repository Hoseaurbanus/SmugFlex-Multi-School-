import React from 'react';
import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface Subject {
  id: number;
  name: string;
  subject_id: number;
  subject_code?: string;
}

interface SubjectScore {
  subject_assignment_id?: number;
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
}

interface SubjectScoresCardProps {
  classSubjects: Subject[];
  scores: SubjectScore[];
  assignmentIdToSubjectId: Map<number, string | number>;
}

export const SubjectScoresCard = React.memo(function SubjectScoresCard({
  classSubjects,
  scores,
  assignmentIdToSubjectId,
}: SubjectScoresCardProps) {
  return (
    <Card className="border-[#0A2540]/10 shadow-lg">
      <CardHeader className="border-b border-[#0A2540]/10 bg-gradient-to-r from-[#10B981]/5 to-[#059669]/5">
        <CardTitle className="flex items-center gap-3 text-lg font-bold text-[#0A2540]">
          <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          Subject Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {(classSubjects || []).map((subject: Subject) => {
            const score = (scores || []).find((s: SubjectScore) => {
              const subId = assignmentIdToSubjectId.get(Number(s?.subject_assignment_id));
              return String(subId || '') === String(subject?.subject_id || '');
            });

            return (
              <div key={subject.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-[#0A2540]">{subject.name || 'Unknown Subject'}</p>
                    <p className="text-xs text-[#64748B] font-mono">{subject.subject_code || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-center bg-white p-2 rounded-lg border border-gray-200 min-w-[60px]">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">CA1</p>
                    <p className="text-sm sm:text-base font-bold text-[#0A2540]">{score?.ca1 || 0}</p>
                  </div>
                  <div className="text-center bg-white p-2 rounded-lg border border-gray-200 min-w-[60px]">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">CA2</p>
                    <p className="text-sm sm:text-base font-bold text-[#0A2540]">{score?.ca2 || 0}</p>
                  </div>
                  <div className="text-center bg-white p-2 rounded-lg border border-gray-200 min-w-[60px]">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Exam</p>
                    <p className="text-sm sm:text-base font-bold text-[#0A2540]">{score?.exam || 0}</p>
                  </div>
                  <div className="text-center bg-gradient-to-r from-green-100 to-green-200 p-2 rounded-xl border border-green-300 min-w-[60px]">
                    <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Total</p>
                    <p className="text-sm sm:text-base font-bold text-green-600">{score?.total || 0}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
