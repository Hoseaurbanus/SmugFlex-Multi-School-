import { ArrowLeft, Plus, Trash2, Pencil, Library, Check, X, AlertCircle, Bold, Italic, Underline, List, ListOrdered, Image, Eye, Upload, Sparkles, GripVertical, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { CbtQuestionBankDrawer } from './CbtQuestionBankDrawer';

interface Props {
  exam: any;
  onBack: () => void;
}

const SECTION_OPTIONS = [
  { value: '', label: 'No Section' },
  { value: 'Section A: Objectives', label: 'Section A: Objectives' },
  { value: 'Section B: Theory', label: 'Section B: Theory' },
  { value: 'Section C: Comprehension', label: 'Section C: Comprehension' },
];

export function CbtQuestionEditor({ exam, onBack }: Props) {
  const { loadCbtQuestionsFromAPI, addCbtQuestion, updateCbtQuestion, deleteCbtQuestion, bulkImportQuestions, uploadQuestionImage, generateQuestionsFromMaterial } = useSchool();
  const { cbtQuestions } = useSchool();
  const [questions, setQuestions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiType, setAiType] = useState('single_choice');
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const questionTextRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromApi();
  }, [exam.id]);

  useEffect(() => {
    setQuestions(cbtQuestions);
  }, [cbtQuestions]);

  const loadFromApi = async () => {
    await loadCbtQuestionsFromAPI(exam.id);
  };

  const emptyQuestion = {
    question_type: 'single_choice',
    question_text: '',
    passage_text: '',
    image_url: '',
    options: ['', ''],
    correct_answer: '',
    marks: parseInt(exam.total_marks) > 0 ? Math.max(1, Math.floor(parseInt(exam.total_marks) / 10)) : 1,
    sort_order: 0,
    section: '',
    section_instructions: '',
  };

  const [newQuestion, setNewQuestion] = useState<any>({ ...emptyQuestion });

  useEffect(() => {
    setShowPassage(!!newQuestion.passage_text);
  }, [newQuestion.passage_text]);

  const handleTypeChange = (type: string) => {
    const base = { ...newQuestion, question_type: type, correct_answer: '' };
    if (type === 'true_false') {
      base.options = ['True', 'False'];
    } else if (type === 'multi_select') {
      base.options = ['', ''];
      base.correct_answer = [];
    } else if (type === 'fill_in_blank') {
      base.options = [];
      base.correct_answer = '';
    } else {
      base.options = ['', ''];
    }
    setNewQuestion(base);
  };

  const addOption = () => {
    setNewQuestion({ ...newQuestion, options: [...(newQuestion.options || []), ''] });
  };

  const removeOption = (idx: number) => {
    const opts = [...(newQuestion.options || [])];
    opts.splice(idx, 1);
    setNewQuestion({ ...newQuestion, options: opts });
  };

  const updateOption = (idx: number, value: string) => {
    const opts = [...(newQuestion.options || [])];
    opts[idx] = value;
    setNewQuestion({ ...newQuestion, options: opts });
  };

  const setCorrect = (value: any) => {
    if (newQuestion.question_type === 'multi_select') {
      const arr: string[] = Array.isArray(newQuestion.correct_answer) ? [...newQuestion.correct_answer] : [];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(value);
      setNewQuestion({ ...newQuestion, correct_answer: arr });
    } else {
      setNewQuestion({ ...newQuestion, correct_answer: value });
    }
  };

  const isCorrectSelected = (value: string) => {
    if (newQuestion.question_type === 'multi_select') {
      return Array.isArray(newQuestion.correct_answer) && newQuestion.correct_answer.includes(value);
    }
    return newQuestion.correct_answer === value;
  };

  const execFormat = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val || '');
    questionTextRef.current?.focus();
  };

  const insertImageUrl = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      execFormat('insertImage', url);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadQuestionImage(file);
      if (result?.url) {
        setNewQuestion({ ...newQuestion, image_url: result.url });
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Failed to upload image');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRichTextInput = () => {
    if (questionTextRef.current) {
      setNewQuestion({ ...newQuestion, question_text: questionTextRef.current.innerHTML });
    }
  };

  const handleAdd = async () => {
    const text = questionTextRef.current ? questionTextRef.current.innerHTML : newQuestion.question_text;
    if (!text || text === '<br>') { toast.error('Question text is required'); return; }
    if (!['fill_in_blank', 'true_false'].includes(newQuestion.question_type) &&
        (newQuestion.options || []).some((o: string) => o.trim() === '')) {
      toast.error('All options must have text'); return;
    }
    if (newQuestion.question_type === 'fill_in_blank' && !newQuestion.correct_answer?.toString().trim()) {
      toast.error('Please enter a correct answer'); return;
    }
    if (!['fill_in_blank'].includes(newQuestion.question_type) &&
        (!newQuestion.correct_answer || (Array.isArray(newQuestion.correct_answer) && newQuestion.correct_answer.length === 0))) {
      toast.error('Please select a correct answer'); return;
    }
    if (newQuestion.marks < 1) { toast.error('Marks must be at least 1'); return; }

    setLoading(true);
    try {
      const payload = { ...newQuestion, question_text: text };
      if (editingId) {
        await updateCbtQuestion(exam.id, editingId, payload);
        setEditingId(null);
        toast.success('Question updated');
      } else {
        await addCbtQuestion(exam.id, {
          ...payload,
          sort_order: questions.length + 1,
        });
        toast.success('Question added');
      }
      setNewQuestion({ ...emptyQuestion, question_type: newQuestion.question_type });
      if (questionTextRef.current) questionTextRef.current.innerHTML = '';
    } catch {
      toast.error(editingId ? 'Failed to update question' : 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCbtQuestion(exam.id, deleteId);
      setDeleteId(null);
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const startEdit = (q: any) => {
    setEditingId(q.id);
    setNewQuestion({
      question_type: q.question_type,
      question_text: q.question_text,
      passage_text: q.passage_text || '',
      image_url: q.image_url || '',
      options: q.options || ['', ''],
      correct_answer: q.correct_answer,
      marks: q.marks,
      sort_order: q.sort_order,
      section: q.section || '',
      section_instructions: q.section_instructions || '',
    });
    setShowPassage(!!q.passage_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewQuestion({ ...emptyQuestion, question_type: newQuestion.question_type });
    if (questionTextRef.current) questionTextRef.current.innerHTML = '';
  };

  const questionTypeLabel = (t: string) => {
    switch (t) {
      case 'single_choice': return 'Single Choice';
      case 'true_false': return 'True/False';
      case 'multi_select': return 'Multi-Select';
      case 'fill_in_blank': return 'Fill in the Blank';
      default: return t;
    }
  };

  const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);

  const handleBulkImport = async () => {
    if (!bulkText.trim()) { toast.error('Paste questions in JSON format'); return; }
    try {
      const parsed = JSON.parse(bulkText);
      const questionsArr = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      if (questionsArr.length === 0) { toast.error('No questions found in input'); return; }
      const result = await bulkImportQuestions(exam.id, questionsArr);
      const count = result?.imported || questionsArr.length;
      toast.success(`Imported ${count} questions`);
      setShowBulkImport(false);
      setBulkText('');
    } catch {
      toast.error('Invalid JSON format. Use an array of question objects.');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiText.trim()) { toast.error('Enter or paste material text'); return; }
    setAiLoading(true);
    try {
      const result = await generateQuestionsFromMaterial(aiText, aiType, aiCount);
      if (result?.questions) {
        toast.success(`Generated ${result.questions.length} questions`);
        setShowAIGen(false);
        setAiText('');
        await loadFromApi();
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    setQuestions(reordered);
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  const sections = [...new Set(questions.map((q: any) => q.section || '').filter(Boolean))];

  const renderQuestionForm = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1F2937]">{editingId ? 'Edit Question' : 'Add New Question'}</h3>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={newQuestion.question_type} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_choice">Single Choice</SelectItem>
                <SelectItem value="multi_select">Multi-Select</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
                <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Marks</Label>
            <Input type="number" value={newQuestion.marks} onChange={e => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })} min={1} />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={newQuestion.section} onValueChange={v => setNewQuestion({ ...newQuestion, section: v })}>
              <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
              <SelectContent>
                {SECTION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button variant="outline" className="w-full" onClick={() => setShowPreview(newQuestion)}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
          </div>
        </div>

        {newQuestion.section && (
          <div className="space-y-2">
            <Label>Section Instructions</Label>
            <Input value={newQuestion.section_instructions || ''} onChange={e => setNewQuestion({ ...newQuestion, section_instructions: e.target.value })} placeholder="e.g. Answer all questions in this section" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Question Text</Label>
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="flex items-center gap-1 p-1.5 bg-gray-50 border-b border-[#E5E7EB] flex-wrap">
              <button type="button" onClick={() => execFormat('bold')} className="p-1.5 hover:bg-gray-200 rounded" title="Bold"><Bold className="w-4 h-4" /></button>
              <button type="button" onClick={() => execFormat('italic')} className="p-1.5 hover:bg-gray-200 rounded" title="Italic"><Italic className="w-4 h-4" /></button>
              <button type="button" onClick={() => execFormat('underline')} className="p-1.5 hover:bg-gray-200 rounded" title="Underline"><Underline className="w-4 h-4" /></button>
              <span className="w-px h-5 bg-gray-300 mx-1" />
              <button type="button" onClick={() => execFormat('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded" title="Bullet List"><List className="w-4 h-4" /></button>
              <button type="button" onClick={() => execFormat('insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
              <span className="w-px h-5 bg-gray-300 mx-1" />
              <button type="button" onClick={insertImageUrl} className="p-1.5 hover:bg-gray-200 rounded" title="Insert Image"><Image className="w-4 h-4" /></button>
            </div>
            <div
              ref={questionTextRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleRichTextInput}
              className="p-3 min-h-[80px] text-sm focus:outline-none"
              data-placeholder="Type or paste question text with formatting..."
              style={{ fontFamily: 'inherit' }}
              dangerouslySetInnerHTML={{ __html: newQuestion.question_text }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Upload Image
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {newQuestion.image_url && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280] truncate max-w-[200px]">{newQuestion.image_url}</span>
              <button onClick={() => setNewQuestion({ ...newQuestion, image_url: '' })} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        {newQuestion.image_url && (
          <div className="border border-[#E5E7EB] rounded-lg p-2 bg-gray-50">
            <img src={newQuestion.image_url} alt="Question" className="max-h-48 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowPassage(!showPassage)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${showPassage ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-white border-[#E5E7EB] hover:border-[#3B82F6]'}`}>
            {showPassage ? 'Passage ▼' : 'Passage ›'}
          </button>
        </div>

        {showPassage && (
          <div className="space-y-2">
            <Label>Passage Text (for comprehension)</Label>
            <Textarea value={newQuestion.passage_text || ''} onChange={e => setNewQuestion({ ...newQuestion, passage_text: e.target.value })} rows={4} placeholder="Paste a reading passage here. Used for comprehension-style questions..." className="text-sm" />
          </div>
        )}

        {newQuestion.question_type === 'fill_in_blank' ? (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <Input value={newQuestion.correct_answer || ''} onChange={e => setCorrect(e.target.value)} placeholder="Enter the correct answer" />
            <p className="text-xs text-[#6B7280]">Students will type their answer. Matching is case-insensitive.</p>
          </div>
        ) : newQuestion.question_type !== 'true_false' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options  <span className="text-xs text-[#6B7280] font-normal">(click ○ to mark correct answer)</span></Label>
              <Button variant="ghost" size="sm" onClick={addOption}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {(newQuestion.options || []).map((opt: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#6B7280] w-6 text-center">{String.fromCharCode(65 + idx)}.</span>
                  <div className="flex-1">
                    <Input value={opt} onChange={e => updateOption(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + idx)}`} />
                  </div>
                  <button type="button" onClick={() => setCorrect(opt)} className={`p-2 rounded-lg border transition-all ${isCorrectSelected(opt) ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm' : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#3B82F6]'}`} title="Mark as correct answer">
                    {newQuestion.question_type === 'multi_select' ? (
                      <div className={`w-4 h-4 flex items-center justify-center ${isCorrectSelected(opt) ? '' : 'border border-[#D1D5DB] rounded'}`}>
                        {isCorrectSelected(opt) && <Check className="w-3.5 h-3.5" />}
                      </div>
                    ) : (
                      isCorrectSelected(opt) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-[#D1D5DB]" />
                    )}
                  </button>
                  {(newQuestion.options || []).length > 2 && (
                    <button type="button" onClick={() => removeOption(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <div className="flex gap-3">
              {['True', 'False'].map(v => (
                <button key={v} type="button" onClick={() => setCorrect(v)} className={`px-5 py-2.5 rounded-lg border font-medium transition-all ${isCorrectSelected(v) ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm' : 'border-[#E5E7EB] hover:border-[#3B82F6]'}`}>
                  {v === 'True' ? '✓ True' : '✗ False'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleAdd} disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB]">
            {editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {loading ? 'Saving...' : editingId ? 'Update Question' : 'Add Question'}
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(newQuestion)}>
            <Eye className="w-4 h-4 mr-2" /> Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderQuestionList = () => {
    if (questions.length === 0) {
      return <div className="text-center py-16 text-[#6B7280]"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" /><p className="text-lg font-medium">No questions yet</p><p className="text-sm mt-1">Add your first question above, or import from the Question Bank.</p></div>;
    }

    const grouped = sections.length > 0;
    let questionIdx = 0;
    const rendered: any[] = [];

    if (grouped) {
      sections.forEach(section => {
        const sectionQuestions = questions.filter((q: any) => q.section === section);
        if (sectionQuestions.length > 0) {
          rendered.push(
            <div key={`section-${section}`} className="pt-4 pb-2">
              <h4 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider">{section}</h4>
              {sectionQuestions[0]?.section_instructions && (
                <p className="text-xs text-[#6B7280] mt-1">{sectionQuestions[0].section_instructions}</p>
              )}
            </div>
          );
          sectionQuestions.forEach((q: any) => {
            const idx = questionIdx++;
            rendered.push(renderQuestionCard(q, idx));
          });
        }
      });
      const unassigned = questions.filter((q: any) => !q.section);
      if (unassigned.length > 0) {
        rendered.push(<div key="no-section" className="pt-4 pb-2"><h4 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">General</h4></div>);
        unassigned.forEach((q: any) => rendered.push(renderQuestionCard(q, questionIdx++)));
      }
    } else {
      questions.forEach((q: any, idx: number) => rendered.push(renderQuestionCard(q, idx)));
    }

    return <div className="space-y-3">{rendered}</div>;
  };

  const renderQuestionCard = (q: any, idx: number) => (
    <div
      key={q.id || idx}
      draggable
      onDragStart={() => handleDragStart(idx)}
      onDragOver={(e) => handleDragOver(e, idx)}
      onDragEnd={handleDragEnd}
      className={`transition-all ${dragIndex === idx ? 'opacity-50 scale-[1.02]' : ''}`}
    >
      <Card className={`group hover:shadow-md transition-shadow ${dragIndex === idx ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/20' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="cursor-grab active:cursor-grabbing text-[#D1D5DB] hover:text-[#6B7280] mt-0.5 shrink-0" title="Drag to reorder">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]">Q{idx + 1}</Badge>
                  <Badge variant="outline" className="text-xs">{questionTypeLabel(q.question_type)}</Badge>
                  <Badge variant="outline" className="text-xs">{q.marks} mark{q.marks !== 1 ? 's' : ''}</Badge>
                  {q.section && <Badge variant="outline" className="text-xs bg-[#F3E8FF] text-[#9333EA] border-[#D8B4FE]">{q.section}</Badge>}
                  {q.difficulty && <Badge className={`text-xs ${q.difficulty === 'easy' ? 'bg-[#10B981]' : q.difficulty === 'hard' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`}>{q.difficulty}</Badge>}
                </div>
                {q.passage_text && (
                  <div className="mb-2 p-2 bg-gray-50 border border-[#E5E7EB] rounded text-xs text-[#6B7280] italic line-clamp-2">
                    Passage: {q.passage_text.substring(0, 150)}{q.passage_text.length > 150 ? '...' : ''}
                  </div>
                )}
                <div className="text-sm font-medium text-[#1F2937] [&_img]:max-h-20 [&_img]:rounded" dangerouslySetInnerHTML={{ __html: q.question_text }} />
                {q.image_url && (
                  <img src={q.image_url} alt="" className="mt-2 max-h-16 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                {q.question_type !== 'fill_in_blank' && q.options?.length > 0 && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {q.options.filter(Boolean).map((opt: string, oi: number) => (
                      <span key={oi} className={`text-xs px-2 py-0.5 rounded border ${(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).includes(opt) ? 'border-[#10B981] bg-[#F0FDF4] text-[#16A34A]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                        {String.fromCharCode(65 + oi)}. {opt.length > 30 ? opt.substring(0, 30) + '…' : opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => startEdit(q)} title="Edit">
                <Pencil className="w-4 h-4 text-[#6B7280]" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(q.id)} title="Delete">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-[#1F2937]">{exam.title}</h2>
            <p className="text-sm text-[#6B7280]">{questions.length} question{questions.length !== 1 ? 's' : ''} · {totalMarks} total marks</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowBulkImport(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Bulk Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAIGen(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> AI Generate
          </Button>
          <Button variant="outline" onClick={() => setBankOpen(true)}>
            <Library className="w-4 h-4 mr-2" /> Question Bank
          </Button>
        </div>
      </div>

      {totalMarks !== parseInt(exam.total_marks) && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Total marks ({totalMarks}) does not match exam total ({exam.total_marks}). Update question marks to match.</AlertDescription>
        </Alert>
      )}

      {renderQuestionForm()}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1F2937]">All Questions</h3>
        <span className="text-sm text-[#6B7280]">Drag to reorder · {questions.length} total</span>
      </div>

      {renderQuestionList()}

      {/* Question Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Question Preview</DialogTitle></DialogHeader>
          {showPreview && (
            <div className="space-y-4">
              {showPreview.section && <Badge className="bg-[#9333EA]">{showPreview.section}</Badge>}
              {showPreview.passage_text && (
                <div className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-lg text-sm italic text-[#4B5563]">
                  <strong className="not-italic">Passage:</strong><br />{showPreview.passage_text}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B82F6] text-white text-sm font-bold">1</span>
                <Badge variant="outline" className="text-xs">{questionTypeLabel(showPreview.question_type)} · {showPreview.marks} mark{showPreview.marks !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="text-base font-medium text-[#1F2937]" dangerouslySetInnerHTML={{ __html: showPreview.question_text || 'No question text' }} />
              {showPreview.image_url && <img src={showPreview.image_url} alt="" className="max-h-48 rounded object-contain border" />}
              {showPreview.question_type === 'fill_in_blank' ? (
                <div className="p-3 border border-dashed border-[#D1D5DB] rounded-lg bg-gray-50">
                  <Input placeholder="Type your answer here..." disabled />
                  <p className="text-xs text-[#6B7280] mt-1">Expected answer: <strong>{showPreview.correct_answer}</strong></p>
                </div>
              ) : showPreview.question_type === 'true_false' ? (
                <div className="flex gap-3">
                  {['True', 'False'].map(v => (
                    <button key={v} disabled className={`px-5 py-2.5 rounded-lg border font-medium ${showPreview.correct_answer === v ? 'bg-[#10B981] text-white border-[#10B981]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>{v}</button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(showPreview.options || []).filter(Boolean).map((opt: string, oi: number) => (
                    <div key={oi} className={`flex items-center gap-3 p-3 rounded-lg border ${(Array.isArray(showPreview.correct_answer) ? showPreview.correct_answer : [showPreview.correct_answer]).includes(opt) ? 'border-[#10B981] bg-[#F0FDF4]' : 'border-[#E5E7EB]'}`}>
                      <span className={`w-5 h-5 flex items-center justify-center shrink-0 border-2 rounded-full ${(Array.isArray(showPreview.correct_answer) ? showPreview.correct_answer : [showPreview.correct_answer]).includes(opt) ? 'bg-[#10B981] border-[#10B981]' : 'border-[#D1D5DB]'}`}>
                        {(Array.isArray(showPreview.correct_answer) ? showPreview.correct_answer : [showPreview.correct_answer]).includes(opt) && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="text-sm">{String.fromCharCode(65 + oi)}. {opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bulk Import Questions</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">Paste a JSON array of questions. Each question object needs: <code>question_text</code>, <code>question_type</code>, <code>correct_answer</code>, <code>options</code>.</p>
            <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={10} placeholder='[
  {
    "question_text": "What is 2+2?",
    "question_type": "single_choice",
    "options": ["3", "4", "5", "6"],
    "correct_answer": "4",
    "marks": 1,
    "section": "Section A: Objectives"
  }
]' className="font-mono text-sm" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBulkImport(false)}>Cancel</Button>
              <Button onClick={handleBulkImport} className="bg-[#3B82F6]">
                <Upload className="w-4 h-4 mr-2" /> Import Questions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAIGen} onOpenChange={setShowAIGen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Generate Questions with AI</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">Paste material (textbook content, notes, passage) and AI will generate JAMB/WAEC standard questions.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={aiType} onValueChange={v => setAiType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="multi_select">Multi-Select</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Input type="number" value={aiCount} onChange={e => setAiCount(parseInt(e.target.value) || 5)} min={1} max={20} />
              </div>
            </div>
            <Textarea value={aiText} onChange={e => setAiText(e.target.value)} rows={8} placeholder="Paste textbook content, notes, or any educational material here..." />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAIGen(false)}>Cancel</Button>
              <Button onClick={handleAIGenerate} disabled={aiLoading || !aiText.trim()} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
                <Sparkles className="w-4 h-4 mr-2" />
                {aiLoading ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CbtQuestionBankDrawer
        open={bankOpen}
        onOpenChange={setBankOpen}
        examId={exam.id}
        subjectId={exam.subject_id}
        onImported={loadFromApi}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. The question will be permanently removed from this exam.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
