import { Input } from '../../ui/input';
import { Edit, Check } from 'lucide-react';
import { calculateTotal, getGrade, getScoreStatusBadge, getPerformanceColor, CA1_MAX, CA2_MAX, EXAM_MAX, CRECHE_EXAM_MAX } from './scoreConfig';

interface StudentData {
  id: number;
  firstName?: string;
  lastName?: string;
  otherName?: string;
  admissionNumber?: string;
}

interface ScoreData {
  ca1: string;
  ca2: string;
  exam: string;
}

interface ExistingScore {
  student_id: number;
  ca1?: number | null;
  ca2?: number | null;
  exam?: number | null;
  status?: string;
  id?: number;
  rejection_reason?: string;
}

interface CbtScore {
  slot: string;
  score: number;
  max: number;
  percentage: number;
}

interface ScoreEntryTableProps {
  classStudents: StudentData[];
  scoresData: Record<number, ScoreData>;
  existingScores: ExistingScore[];
  isLocked: boolean;
  isCrecheClass: boolean;
  isEditMode: boolean;
  onScoreChange: (studentId: number, field: 'ca1' | 'ca2' | 'exam', value: string) => void;
  cbtScoresByStudent: Record<number, CbtScore>;
  cbtOverride: Record<number, boolean>;
  onCbtOverride: (studentId: number, value: boolean) => void;
  onToggleEditMode: () => void;
  onResubmit: () => void;
  onSubmit: () => void;
  hasRejectedScores: boolean;
  allDraft: boolean;
  showSubmitButton: boolean;
}

export function ScoreEntryTable({
  classStudents,
  scoresData,
  isLocked,
  isCrecheClass,
  isEditMode,
  onScoreChange,
  cbtScoresByStudent,
  cbtOverride,
  onCbtOverride,
  onToggleEditMode,
  onResubmit,
  onSubmit,
  hasRejectedScores,
  allDraft,
  showSubmitButton,
}: ScoreEntryTableProps) {
  const renderCbtButton = (studentId: number, slot: string) => {
    const cbt = cbtScoresByStudent[studentId];
    if (!cbt || cbt.slot !== slot) return null;
    if (!cbtOverride[studentId]) {
      return (
        <button
          type="button"
          onClick={() => onCbtOverride(studentId, true)}
          className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white whitespace-nowrap hover:bg-emerald-600"
          title={`CBT score: ${cbt.score}/${cbt.max} (${cbt.percentage}%). Click to override`}
        >
          CBT
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onCbtOverride(studentId, false)}
        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white whitespace-nowrap hover:bg-amber-600"
      >
        Override
      </button>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">Reg ID</th>
              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
              <th className="text-center p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              {!isCrecheClass && (
                <>
                  <th className="text-center p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">1st CA [{CA1_MAX}]</th>
                  <th className="text-center p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">2nd CA [{CA2_MAX}]</th>
                </>
              )}
              <th className="text-center p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Exam [{isCrecheClass ? CRECHE_EXAM_MAX : EXAM_MAX}]
              </th>
              <th className="text-center p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
              <th className="text-center p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">Grade</th>
            </tr>
          </thead>
          <tbody>
            {classStudents.map((student, index) => {
              const data = scoresData[student.id] || { ca1: '', ca2: '', exam: '' };

              const { total } = calculateTotal(data.ca1, data.ca2, data.exam, isCrecheClass);
              const hasScore = data.ca1 !== '' || data.ca2 !== '' || data.exam !== '';
              const statusBadge = getScoreStatusBadge(data, isCrecheClass);

              return (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-2 sm:p-3 text-[11px] sm:text-xs text-slate-500">{index + 1}</td>
                  <td className="p-2 sm:p-3 text-[11px] sm:text-xs font-medium text-slate-700">{student.admissionNumber}</td>
                  <td className="p-2 sm:p-3 text-[11px] sm:text-xs text-indigo-600 font-medium whitespace-nowrap">
                    {student.firstName} {student.lastName} {student.otherName || ''}
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium border ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  {!isCrecheClass && (
                    <>
                      <td className="p-1 sm:p-1.5 text-center">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.ca1}
                            onChange={(e) => onScoreChange(student.id, 'ca1', e.target.value)}
                            className="w-14 sm:w-16 mx-auto text-center rounded-lg border-slate-200 text-[11px] sm:text-xs h-8 sm:h-8"
                            disabled={isLocked}
                            placeholder="0"
                          />
                          {renderCbtButton(student.id, 'first_test')}
                        </div>
                      </td>
                      <td className="p-1 sm:p-1.5 text-center">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={data.ca2}
                            onChange={(e) => onScoreChange(student.id, 'ca2', e.target.value)}
                            className="w-14 sm:w-16 mx-auto text-center rounded-lg border-slate-200 text-[11px] sm:text-xs h-8 sm:h-8"
                            disabled={isLocked}
                            placeholder="0"
                          />
                          {renderCbtButton(student.id, 'second_test')}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="p-1 sm:p-1.5 text-center">
                    <Input
                      type="number"
                      min="0"
                      max={isCrecheClass ? CRECHE_EXAM_MAX : EXAM_MAX}
                      value={data.exam}
                      onChange={(e) => onScoreChange(student.id, 'exam', e.target.value)}
                      className="w-14 sm:w-16 mx-auto text-center rounded-lg border-slate-200 text-[11px] sm:text-xs h-8 sm:h-8"
                      disabled={isLocked}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    <span className={`text-xs sm:text-sm font-semibold ${hasScore ? 'text-slate-800' : 'text-slate-300'}`}>
                      {hasScore ? total.toFixed(2) : '-'}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    {hasScore ? (
                      <span className={`text-xs sm:text-sm font-bold ${getPerformanceColor(total)}`}>
                        {getGrade(total)}
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-6 border-t border-slate-200 bg-slate-50">
        <div className="text-[11px] sm:text-xs text-slate-400">
          {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {hasRejectedScores && !isEditMode ? (
            <button
              onClick={onToggleEditMode}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              <Edit className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              Enable Edit Mode
            </button>
          ) : hasRejectedScores && isEditMode ? (
            <button
              onClick={onResubmit}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              disabled={isLocked}
            >
              <Check className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              Resubmit Corrected
            </button>
          ) : allDraft ? (
            <button
              onClick={onSubmit}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              Submit for Approval
            </button>
          ) : showSubmitButton ? (
            <button
              onClick={onSubmit}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              disabled={isLocked}
            >
              <Check className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              {isEditMode ? 'Update Scores' : 'Submit'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
