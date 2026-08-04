import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Send, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { Timer } from './cbt-exam/Timer';
import { QuestionPalette } from './cbt-exam/QuestionPalette';
import { QuestionCard } from './cbt-exam/QuestionCard';
import { ResultsSummary } from './cbt-exam/ResultsSummary';

interface Props {
  exam: any;
  onExit: () => void;
}

export function CbtExamPlayer({ exam, onExit }: Props) {
  const { startCbtAttempt, saveCbtAnswer, submitCbtAttempt, getCbtAttemptDetail } = useSchool();
  const submittedRef = useRef(false);

  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const answerTimeouts = useRef<Record<number, NodeJS.Timeout>>({});
  const playerRef = useRef<HTMLDivElement>(null);

  const startExam = async () => {
    setLoading(true);
    try {
      const result = await startCbtAttempt(exam.id);
      if (!result) { setError('Failed to start exam. You may have already attempted it.'); setLoading(false); return; }
      const attemptData = result;
      const questionData = (result as any)?.questions || [];

      setAttempt(attemptData);
      setQuestions(questionData);
      setTabSwitchCount(attemptData?.tab_switch_count || 0);

      // Restore any previously saved answers for resumed attempts (keyed by question id)
      const savedAnswers: Record<number, any> = {};
      questionData.forEach((q: any) => {
        if (q.student_answer !== null && q.student_answer !== undefined) {
          savedAnswers[q.id] = q.student_answer;
        }
      });
      if (Object.keys(savedAnswers).length > 0) {
        setAnswers(savedAnswers);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to start exam');
      setLoading(false);
    }
  };

  useEffect(() => {
    startExam();
  }, []);

  useEffect(() => {
    if (!attempt || !questions.length) return;
    const handleVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        setTabSwitchCount(prev => prev + 1);
        toast.warning('Tab switch detected!', { duration: 3000 });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [attempt, questions.length]);

  useEffect(() => {
    if (!attempt || !playerRef.current) return;
    const el = playerRef.current;
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); toast.error('Pasting is disabled'); };
    el.addEventListener('paste', handlePaste, true);
    return () => el.removeEventListener('paste', handlePaste, true);
  }, [attempt]);

  const enterFullscreen = async () => {
    try {
      if (playerRef.current?.requestFullscreen) {
        await playerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch { /* fullscreen may be blocked */ }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const debouncedSave = (questionId: number, value: any) => {
    if (!questionId) return;
    if (answerTimeouts.current[questionId]) clearTimeout(answerTimeouts.current[questionId]);
    answerTimeouts.current[questionId] = setTimeout(async () => {
      try {
        if (attempt) await saveCbtAnswer(attempt.id, questionId, value);
      } catch { /* save may fail */ }
    }, 1000);
  };

  const handleAnswer = (value: any) => {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: value }));
    debouncedSave(q.id, value);
  };

  const handleSubmit = async () => {
    if (submittedRef.current) return;
    setIsSubmitting(true);
    try {
      // Flush any pending debounced saves so the last answer isn't lost
      Object.values(answerTimeouts.current).forEach(clearTimeout);
      answerTimeouts.current = {};
      await Promise.all(
        Object.entries(answers).map(([qId, val]) =>
          saveCbtAnswer(attempt.id, Number(qId), val)
        )
      );
      const _result = await submitCbtAttempt(attempt.id, tabSwitchCount);
      submittedRef.current = true;
      setSubmitted(true);
      const detail = await getCbtAttemptDetail(attempt.id);
      setResultData(detail);
      setShowResult(true);
      toast.success('Exam submitted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  const handleTimeUp = () => {
    if (!submittedRef.current) handleSubmit();
  };

  const answeredCount = Object.values(answers).filter(v => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Starting exam...</span>
    </div>
  );

  if (error) return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={onExit}>Back to Exams</Button>
    </div>
  );

  if (showResult && resultData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <ResultsSummary
              attempt={resultData}
              answers={resultData.answers || questions.map((_q, i) => ({
                is_correct: null,
                student_answer: answers[i],
              }))}
              questions={questions}
            />
            <div className="mt-6 text-center">
              <Button onClick={onExit} variant="outline">Back to Exams</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!attempt || !questions.length) return null;

  const currentQ = questions[currentIndex];

  return (
    <div ref={playerRef} className="max-w-5xl mx-auto">
      <div className={`flex items-center justify-between mb-4 bg-white rounded-lg border border-[#E5E7EB] p-3 ${submitted ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-semibold text-[#1F2937] text-sm md:text-base truncate">{exam.title}</h2>
          <Badge variant="outline" className="text-xs shrink-0">{answeredCount}/{questions.length}</Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {attempt && (
            <Timer
              startedAt={attempt.started_at}
              durationMinutes={exam.duration_minutes}
              remainingSeconds={attempt.remaining_seconds}
              onTimeUp={handleTimeUp}
            />
          )}
          {!isFullscreen && (
            <Button variant="ghost" size="sm" aria-label="Enter fullscreen" onClick={enterFullscreen} className="hidden sm:inline-flex">
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setShowSubmitDialog(true)} disabled={submitted}>
            <Send className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Submit</span>
          </Button>
        </div>
      </div>

      {tabSwitchCount > 0 && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Warning: {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? 'es' : ''} detected. Further switches may be flagged.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
        <div className="space-y-4 order-2 lg:order-1">
          {currentQ && (
            <QuestionCard
              question={currentQ}
              index={currentIndex}
              selectedAnswer={answers[currentQ.id]}
              onAnswer={handleAnswer}
            />
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-sm text-[#6B7280]">
              {currentIndex + 1}/{questions.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 order-1 lg:order-2 lg:sticky lg:top-4">
          <QuestionPalette
            total={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            onNavigate={setCurrentIndex}
            questions={questions}
          />
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#10B981]" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#F3F4F6]" /> Unanswered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#3B82F6]" /> Current</span>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length && ` ${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} unanswered.`}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting} className="bg-[#3B82F6]">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
