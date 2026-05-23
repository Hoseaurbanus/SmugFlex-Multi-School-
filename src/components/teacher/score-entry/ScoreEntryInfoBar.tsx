import { AlertTriangle, CheckCircle, Lock, Clock, Trophy, User } from 'lucide-react';

interface ScoreEntryInfoBarProps {
  selectedClass: { name?: string } | null;
  selectedAssignment: { subject_name?: string } | null;
  statistics: {
    average: string;
    max: string;
    min: string;
    highestScorer: { firstName?: string; lastName?: string } | null;
  };
  currentTeacher: { firstName?: string; lastName?: string } | null;
  autoSaveStatus: string;
  isLocked: boolean;
  hasSubmittedScores: boolean;
  existingScores: any[];
  students: any[];
  isEditMode: boolean;
}

export function ScoreEntryInfoBar({
  selectedClass,
  selectedAssignment,
  statistics,
  currentTeacher,
  autoSaveStatus,
  isLocked,
  hasSubmittedScores,
  existingScores,
  students,
  isEditMode,
}: ScoreEntryInfoBarProps) {
  const rejectedScores = existingScores.filter(s => s.status === 'Rejected');
  const hasRejectedScores = rejectedScores.length > 0;
  const hasAnyScores = existingScores.length > 0;

  return (
    <>
      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <p className="text-xs text-slate-500 mb-1">Class</p>
          <p className="text-sm font-medium text-slate-800">{selectedClass?.name || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Subject</p>
          <p className="text-sm font-medium text-slate-800">{selectedAssignment?.subject_name || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Average</p>
          <p className="text-sm font-semibold text-slate-800">{statistics.average}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Max</p>
          <p className="text-sm font-semibold text-emerald-600">{statistics.max}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Min</p>
          <p className="text-sm font-semibold text-red-600">{statistics.min}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Highest Scorer</p>
          <p className="text-sm font-semibold text-indigo-600 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" />
            {statistics.highestScorer
              ? `${statistics.highestScorer.firstName || ''} ${statistics.highestScorer.lastName || ''}`
              : '-'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Teacher</p>
          <p className="text-sm font-semibold text-slate-800 flex items-center justify-end gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {currentTeacher
              ? `${currentTeacher.firstName || ''} ${currentTeacher.lastName || ''}`.toUpperCase()
              : 'TEACHER'}
          </p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        {autoSaveStatus && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            autoSaveStatus === 'Auto-saved' || autoSaveStatus === 'All changes saved'
              ? 'bg-emerald-50 text-emerald-700'
              : autoSaveStatus === 'Auto-saving...'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {autoSaveStatus === 'Auto-saved' || autoSaveStatus === 'All changes saved' ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            {autoSaveStatus}
          </div>
        )}

        {isLocked && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
            <Lock className="w-3.5 h-3.5" />
            Scores locked — Admin has approved results
          </div>
        )}

        {hasSubmittedScores && !isLocked && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            <Clock className="w-3.5 h-3.5" />
            Scores submitted — editing allowed until admin approval
          </div>
        )}
      </div>

      {/* Rejected Scores Alert */}
      {hasRejectedScores && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                {rejectedScores.length} Rejected Score{rejectedScores.length > 1 ? 's' : ''} Need Correction
              </h3>
              <div className="space-y-2">
                {rejectedScores.map((score: any) => (
                  <div key={score.id} className="p-2 bg-white rounded border border-red-200 text-sm">
                    <p className="font-medium text-red-900">
                      {students.find((s: any) => s.id === score.student_id)?.firstName}{' '}
                      {students.find((s: any) => s.id === score.student_id)?.lastName}
                    </p>
                    {score.rejection_reason && (
                      <p className="text-xs text-slate-500 mt-0.5">Reason: {score.rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Good Alert */}
      {!hasRejectedScores && hasAnyScores && !isEditMode && (
        <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-lg mt-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-emerald-800">No Rejected Scores</h3>
              <p className="text-xs text-emerald-600 mt-0.5">All your scores for this class and subject are in good standing.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
