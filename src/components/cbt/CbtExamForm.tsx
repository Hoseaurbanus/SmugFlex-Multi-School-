import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';

interface CbtExamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: any;
  onSaved: () => void;
}

export function CbtExamForm({ open, onOpenChange, exam, onSaved }: CbtExamFormProps) {
  const { classes, subjects, currentUser, createCbtExam, updateCbtExam, getTeacherAssignments } = useSchool();
  const isEditing = !!exam;

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [questionsPerStudent, setQuestionsPerStudent] = useState('');
  const [scoreSlot, setScoreSlot] = useState<'first_test' | 'second_test' | ''>('');
  const [feedIntoScores, setFeedIntoScores] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [loading, setLoading] = useState(false);

  const currentAssignments = currentUser?.role === 'teacher' && currentUser.linked_id
    ? getTeacherAssignments(Number(currentUser.linked_id))
    : [];

  const teacherClasses = currentUser?.role === 'teacher'
    ? classes.filter((c: any) =>
        currentAssignments.some((sa: any) => String(sa.class_id) === String(c.id)) || (isEditing && Number(exam?.class_id) === c.id)
      )
    : classes;

  const availableClasses = currentUser?.role === 'teacher'
    ? (subjectId
        ? teacherClasses.filter((c: any) =>
            currentAssignments.some((sa: any) =>
              String(sa.class_id) === String(c.id) && String(sa.subject_id) === String(subjectId)
            )
          )
        : teacherClasses)
    : classes;

  const teacherSubjects = currentUser?.role === 'teacher'
    ? (() => {
        const subjectsForClass = currentAssignments
          .filter((sa: any) => !classId || String(sa.class_id) === String(classId))
          .map((sa: any) => ({ id: sa.subject_id, name: sa.subject_name }));

        if (isEditing && classId && Number(classId) === Number(exam?.class_id) && exam?.subject_id) {
          const selectedSubjectId = Number(exam.subject_id);
          if (!subjectsForClass.some((s: any) => Number(s.id) === selectedSubjectId)) {
            subjectsForClass.push({ id: selectedSubjectId, name: exam.subject_name || 'Selected Subject' });
          }
        }

        return subjectsForClass.filter((s: any, i: number, a: any[]) => a.findIndex((x: any) => Number(x.id) === Number(s.id)) === i);
      })()
    : subjects;

  useEffect(() => {
    if (exam) {
      setTitle(exam.title || '');
      setInstructions(exam.instructions || '');
      setClassId(String(exam.class_id || ''));
      setSubjectId(String(exam.subject_id || ''));
      setDurationMinutes(String(exam.duration_minutes || '30'));
      setScoreSlot(exam.score_slot || '');
      setFeedIntoScores(!!exam.feed_into_scores);
      setShuffleQuestions(!!exam.shuffle_questions);
      setQuestionsPerStudent(exam.questions_per_student ? String(exam.questions_per_student) : '');
    } else {
      setTitle('');
      setInstructions('');
      setClassId('');
      setSubjectId('');
      setDurationMinutes('30');
      setScoreSlot('');
      setFeedIntoScores(false);
      setShuffleQuestions(true);
      setQuestionsPerStudent('');
    }
  }, [exam, open]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!classId) { toast.error('Class is required'); return; }
    if (!subjectId) { toast.error('Subject is required'); return; }
    if (!durationMinutes || parseInt(durationMinutes) < 1) { toast.error('Valid duration is required'); return; }

    setLoading(true);
    try {
      const qps = questionsPerStudent.trim();
      const payload = {
        title: title.trim(),
        instructions: instructions.trim(),
        class_id: parseInt(classId),
        subject_id: parseInt(subjectId),
        duration_minutes: parseInt(durationMinutes),
        score_slot: feedIntoScores && scoreSlot ? scoreSlot : null,
        feed_into_scores: feedIntoScores ? 1 : 0,
        shuffle_questions: shuffleQuestions ? 1 : 0,
        questions_per_student: qps ? parseInt(qps) : null,
      };

      if (isEditing && exam) {
        await updateCbtExam(exam.id, payload);
        toast.success('Exam updated');
      } else {
        await createCbtExam(payload as any);
        toast.success('Exam created');
      }
      onSaved();
    } catch {
      toast.error(isEditing ? 'Failed to update exam' : 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Exam Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. First Term CBT" />
          </div>

          <div className="space-y-2">
            <Label>Instructions (optional)</Label>
            <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} placeholder="Instructions for students..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {(currentUser?.role === 'teacher' ? availableClasses : classes).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {teacherSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} min={1} />
          </div>

          <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-3">
            <div>
              <Label className="text-sm font-medium">Shuffle Questions</Label>
              <p className="text-xs text-[#6B7280]">Randomize question order for each student</p>
            </div>
            <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
          </div>

          <div className="space-y-2">
            <Label>Questions per Student <span className="text-[#6B7280] font-normal">(optional)</span></Label>
            <Input
              type="number"
              value={questionsPerStudent}
              onChange={e => setQuestionsPerStudent(e.target.value)}
              min={1}
              placeholder="Leave empty to show all questions"
            />
            <p className="text-xs text-[#6B7280]">Create more questions than this number to give each student a random subset.</p>
          </div>

          <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-3">
            <div>
              <Label className="text-sm font-medium">Feed into Scores</Label>
              <p className="text-xs text-[#6B7280]">Auto-assign scores to CA slot</p>
            </div>
            <Switch checked={feedIntoScores} onCheckedChange={setFeedIntoScores} />
          </div>

          {feedIntoScores && (
            <div className="space-y-2">
              <Label>Score Slot</Label>
              <Select value={scoreSlot} onValueChange={(v: any) => setScoreSlot(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_test">First Test (CA1)</SelectItem>
                  <SelectItem value="second_test">Second Test (CA2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB]">
            {loading ? 'Saving...' : isEditing ? 'Update Exam' : 'Create Exam'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
