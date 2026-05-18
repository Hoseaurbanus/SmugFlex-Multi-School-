import { CheckCircle2, XCircle, HelpCircle, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface ResultsSummaryProps {
  attempt: any;
  answers: any[];
  questions: any[];
}

export function ResultsSummary({ attempt, answers, questions }: ResultsSummaryProps) {
  const correctCount = answers.filter(a => a.is_correct).length;
  const incorrectCount = answers.filter(a => a.is_correct === false).length;
  const unansweredCount = answers.filter(a => a.is_correct === null || a.is_correct === undefined).length;
  const total = questions.length;

  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: 'A+', color: 'text-[#10B981]', desc: 'Excellent' };
    if (pct >= 75) return { label: 'A', color: 'text-[#10B981]', desc: 'Very Good' };
    if (pct >= 60) return { label: 'B', color: 'text-[#3B82F6]', desc: 'Good' };
    if (pct >= 50) return { label: 'C', color: 'text-[#F59E0B]', desc: 'Average' };
    if (pct >= 40) return { label: 'D', color: 'text-[#F97316]', desc: 'Below Average' };
    return { label: 'F', color: 'text-[#EF4444]', desc: 'Fail' };
  };

  const grade = getGrade(attempt.percentage);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`text-5xl font-bold ${grade.color} mb-2`}>{grade.label}</div>
        <p className="text-lg font-medium text-[#1F2937]">{grade.desc}</p>
        <p className="text-sm text-[#6B7280]">{attempt.subject_name} · {attempt.exam_title}</p>
      </div>

      <div className="flex justify-center gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-[#1F2937]">{attempt.score}</div>
          <p className="text-xs text-[#6B7280]">Score</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-[#1F2937]">{attempt.max_score}</div>
          <p className="text-xs text-[#6B7280]">Max</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-[#1F2937]">{attempt.percentage}%</div>
          <p className="text-xs text-[#6B7280]">Percentage</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-[#10B981] mx-auto mb-1" />
            <p className="text-xl font-bold text-[#10B981]">{correctCount}</p>
            <p className="text-xs text-[#6B7280]">Correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-5 h-5 text-[#EF4444] mx-auto mb-1" />
            <p className="text-xl font-bold text-[#EF4444]">{incorrectCount}</p>
            <p className="text-xs text-[#6B7280]">Incorrect</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <HelpCircle className="w-5 h-5 text-[#F59E0B] mx-auto mb-1" />
            <p className="text-xl font-bold text-[#F59E0B]">{unansweredCount}</p>
            <p className="text-xs text-[#6B7280]">Unanswered</p>
          </CardContent>
        </Card>
      </div>

      {attempt.tab_switch_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-sm">
          Tab switches detected: <strong>{attempt.tab_switch_count}</strong>
        </div>
      )}

      {attempt.remark && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-[#1F2937]">
          {attempt.remark}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[#1F2937]">Review Answers</h4>
        {questions.map((q: any, i: number) => {
          const ans = answers[i];
          return (
            <div key={i} className={`p-3 rounded-lg border ${ans?.is_correct ? 'border-[#10B981] bg-green-50' : ans?.is_correct === false ? 'border-[#EF4444] bg-red-50' : 'border-[#E5E7EB]'}`}>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold mt-0.5">Q{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.question_text}</p>
                  <p className="text-xs mt-1">
                    Your answer: <strong>{ans?.student_answer !== undefined && ans?.student_answer !== null && ans?.student_answer !== '' ? String(ans.student_answer) : 'Not answered'}</strong>
                  </p>
                  {ans?.is_correct === false && q.correct_answer && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      Correct answer: <strong>{Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer)}</strong>
                    </p>
                  )}
                </div>
                {ans?.is_correct ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                ) : ans?.is_correct === false ? (
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
