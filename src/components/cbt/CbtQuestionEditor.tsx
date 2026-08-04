import { ArrowLeft, Plus, Trash2, Pencil, Library, Check, X, AlertCircle, Bold, Italic, Underline, List, ListOrdered, Image, Eye, Upload, Sparkles, GripVertical, FileText, FileUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
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
import { FileImportDialog } from './FileImportDialog';
import { readFileContent } from '../../utils/questionParser';

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

function typeLabel(t: string) {
  const m: Record<string, string> = { single_choice: 'Single', multi_select: 'Multi', true_false: 'T/F', fill_in_blank: 'Fill' };
  return m[t] || t;
}

export function CbtQuestionEditor({ exam, onBack }: Props) {
  const { loadCbtQuestionsFromAPI, addCbtQuestion, updateCbtQuestion, deleteCbtQuestion, uploadQuestionImage, generateQuestionsFromMaterial, addToCbtQuestionBank } = useSchool();
  const { cbtQuestions } = useSchool();

  const [questions, setQuestions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [showFileImport, setShowFileImport] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiType, setAiType] = useState('single_choice');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('mixed');
  const [aiExamType, setAiExamType] = useState('JAMB/WAEC');
  const [aiTopic, setAiTopic] = useState('');
  const [aiExplanations, setAiExplanations] = useState(true);
  const [_aiDiagrams, _setAiDiagrams] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<any[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savingBank, setSavingBank] = useState<number | null>(null);
  const questionTextRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFromApi(); }, [exam.id]);
  useEffect(() => { setQuestions(cbtQuestions); }, [cbtQuestions]);

  const loadFromApi = async () => { await loadCbtQuestionsFromAPI(exam.id); };

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
  useEffect(() => { setShowPassage(!!newQuestion.passage_text); }, [newQuestion.passage_text]);

  const handleTypeChange = (type: string) => {
    const base = { ...newQuestion, question_type: type, correct_answer: '' };
    if (type === 'true_false') { base.options = ['True', 'False']; }
    else if (type === 'multi_select') { base.options = ['', '']; base.correct_answer = []; }
    else if (type === 'fill_in_blank') { base.options = []; base.correct_answer = ''; }
    else { base.options = ['', '']; }
    setNewQuestion(base);
  };

  const addOption = () => setNewQuestion({ ...newQuestion, options: [...(newQuestion.options || []), ''] });
  const removeOption = (idx: number) => { const o = [...(newQuestion.options || [])]; o.splice(idx, 1); setNewQuestion({ ...newQuestion, options: o }); };
  const updateOption = (idx: number, v: string) => { const o = [...(newQuestion.options || [])]; o[idx] = v; setNewQuestion({ ...newQuestion, options: o }); };

  const setCorrect = (v: any) => {
    if (newQuestion.question_type === 'multi_select') {
      const a: string[] = Array.isArray(newQuestion.correct_answer) ? [...newQuestion.correct_answer] : [];
      const i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v);
      setNewQuestion({ ...newQuestion, correct_answer: a });
    } else { setNewQuestion({ ...newQuestion, correct_answer: v }); }
  };

  const isCorrect = (v: string) => newQuestion.question_type === 'multi_select'
    ? Array.isArray(newQuestion.correct_answer) && newQuestion.correct_answer.includes(v)
    : newQuestion.correct_answer === v;

  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val || ''); questionTextRef.current?.focus(); };
  const insImg = () => { const u = window.prompt('Image URL:'); if (u) exec('insertImage', u); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const r = await uploadQuestionImage(f); if (r?.url) { setNewQuestion({ ...newQuestion, image_url: r.url }); toast.success('Image uploaded'); } }
    catch { toast.error('Failed'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRichInput = () => { if (questionTextRef.current) setNewQuestion({ ...newQuestion, question_text: questionTextRef.current.innerHTML }); };

  const handleAdd = async () => {
    const t = questionTextRef.current ? questionTextRef.current.innerHTML : newQuestion.question_text;
    if (!t || t === '<br>') { toast.error('Question text required'); return; }
    if (!['fill_in_blank', 'true_false'].includes(newQuestion.question_type) && (newQuestion.options || []).some((o: string) => !o.trim())) { toast.error('All options need text'); return; }
    if (newQuestion.question_type === 'fill_in_blank' && !newQuestion.correct_answer?.toString().trim()) { toast.error('Enter correct answer'); return; }
    if (!['fill_in_blank'].includes(newQuestion.question_type) && (!newQuestion.correct_answer || (Array.isArray(newQuestion.correct_answer) && !newQuestion.correct_answer.length))) { toast.error('Select correct answer'); return; }
    if (newQuestion.marks < 1) { toast.error('Marks >= 1'); return; }
    setLoading(true);
    try {
      const p = { ...newQuestion, question_text: t };
      if (editingId) { await updateCbtQuestion(exam.id, editingId, p); setEditingId(null); toast.success('Updated'); }
      else { await addCbtQuestion(exam.id, { ...p, sort_order: questions.length + 1 }); toast.success('Added'); }
      setNewQuestion({ ...emptyQuestion, question_type: newQuestion.question_type });
      if (questionTextRef.current) questionTextRef.current.innerHTML = '';
    } catch { toast.error(editingId ? 'Update failed' : 'Add failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteCbtQuestion(exam.id, deleteId); setDeleteId(null); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const startEdit = (q: any) => {
    setEditingId(q.id);
    setNewQuestion({
      question_type: q.question_type, question_text: q.question_text, passage_text: q.passage_text || '', image_url: q.image_url || '',
      options: q.options || ['', ''], correct_answer: q.correct_answer, marks: q.marks, sort_order: q.sort_order,
      section: q.section || '', section_instructions: q.section_instructions || '',
    });
    setShowPassage(!!q.passage_text);
  };

  const cancelEdit = () => { setEditingId(null); setNewQuestion({ ...emptyQuestion, question_type: newQuestion.question_type }); if (questionTextRef.current) questionTextRef.current.innerHTML = ''; };

  const totalMarks = questions.reduce((s: number, q: any) => s + (q.marks || 0), 0);



  const handleAIGenerate = async () => {
    if (!aiText.trim()) { toast.error('Enter material text'); return; }
    setAiLoading(true);
    try {
      const r = await generateQuestionsFromMaterial(aiText, aiType, aiCount, { difficulty: aiDifficulty, exam_type: aiExamType, topic: aiTopic, include_explanations: aiExplanations });
      if (r && Array.isArray(r)) { setAiPreview(r); toast.success(`Generated ${r.length} questions`); }
    } catch (e: any) { toast.error(e.message || 'AI failed'); }
    finally { setAiLoading(false); }
  };

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const content = await readFileContent(f);
      setAiText(prev => prev ? prev + '\n\n' + content : content);
      toast.success(`Loaded ${f.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to read file');
    }
    if (aiFileInputRef.current) aiFileInputRef.current.value = '';
  };

  const handleImportAi = async () => {
    if (!aiPreview?.length) return;
    setAiLoading(true);
    let imported = 0;
    let errors = 0;
    for (const q of aiPreview) {
      try {
        await addCbtQuestion(exam.id, q);
        imported++;
      } catch {
        errors++;
      }
    }
    if (imported > 0) {
      toast.success(`Imported ${imported} question${imported !== 1 ? 's' : ''}${errors > 0 ? ` (${errors} failed)` : ''}`);
      setShowAIGen(false); setAiPreview(null); setAiText('');
    } else {
      toast.error('All questions failed to import');
    }
    setAiLoading(false);
  };

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const r = [...questions]; const [m] = r.splice(dragIndex, 1); r.splice(i, 0, m);
    setQuestions(r); setDragIndex(i);
  };
  const handleDragEnd = () => setDragIndex(null);

  const sections = [...new Set(questions.map((q: any) => q.section || '').filter(Boolean))];

  const tb = (onClick: () => void, title: string, icon: React.ReactNode) => (
    <button type="button" onClick={onClick} className="p-1.5 hover:bg-gray-200 rounded touch-manipulation active:scale-90 transition-transform" title={title}>{icon}</button>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Button variant="ghost" onClick={onBack} className="p-1.5 shrink-0 -ml-1 -mt-0.5 touch-manipulation">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[#1F2937] truncate leading-tight">{exam.title}</h2>
          <p className="text-xs text-[#6B7280]">{questions.length} question{questions.length !== 1 ? 's' : ''} · {totalMarks} total marks</p>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFileImport(true)} className="text-xs h-9">
          <FileText className="w-3.5 h-3.5 mr-1.5 shrink-0" /> File
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowAIGen(true)} className="text-xs h-9">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0" /> AI
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBankOpen(true)} className="text-xs h-9">
          <Library className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Bank
        </Button>
      </div>

      {totalMarks !== parseInt(exam.total_marks) && (
        <Alert className="py-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <AlertDescription className="text-xs">Total marks ({totalMarks}) ≠ exam total ({exam.total_marks}). Update marks to match.</AlertDescription>
        </Alert>
      )}

      {/* Question Form */}
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-semibold">{editingId ? 'Edit Question' : 'Add New Question'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>}
          </div>
        </CardHeader>
        <CardContent className="px-3 py-2 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
          {/* Row 1: Type + Marks + Section + Preview (2-col on mobile) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <Label className="text-xs">Type</Label>
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
            <div className="space-y-1">
              <Label className="text-xs">Marks</Label>
              <Input type="number" value={newQuestion.marks} onChange={e => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })} min={1} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Section</Label>
              <Select value={newQuestion.section} onValueChange={v => setNewQuestion({ ...newQuestion, section: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {SECTION_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setShowPreview(newQuestion)}>
                <Eye className="w-3.5 h-3.5 mr-1" /> Preview
              </Button>
            </div>
          </div>

          {/* Section Instructions */}
          {newQuestion.section && (
            <div className="space-y-1">
              <Label className="text-xs">Section Instructions</Label>
              <Input value={newQuestion.section_instructions || ''} onChange={e => setNewQuestion({ ...newQuestion, section_instructions: e.target.value })} placeholder="e.g. Answer all questions in this section" className="h-9 text-sm" />
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-1">
            <Label className="text-xs">Question Text</Label>
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <div className="flex items-center gap-0.5 p-1 bg-gray-50 border-b border-[#E5E7EB] flex-wrap">
                {tb(() => exec('bold'), 'Bold', <Bold className="w-3.5 h-3.5" />)}
                {tb(() => exec('italic'), 'Italic', <Italic className="w-3.5 h-3.5" />)}
                {tb(() => exec('underline'), 'Underline', <Underline className="w-3.5 h-3.5" />)}
                <span className="w-px h-4 bg-gray-300 mx-0.5" />
                {tb(() => exec('insertUnorderedList'), 'Bullets', <List className="w-3.5 h-3.5" />)}
                {tb(() => exec('insertOrderedList'), 'Numbers', <ListOrdered className="w-3.5 h-3.5" />)}
                <span className="w-px h-4 bg-gray-300 mx-0.5" />
                {tb(insImg, 'Image', <Image className="w-3.5 h-3.5" />)}
              </div>
              <div
                ref={questionTextRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleRichInput}
                className="p-2 min-h-[70px] sm:min-h-[80px] text-sm focus:outline-none"
                data-placeholder="Type or paste question text..."
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(newQuestion.question_text, { ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'sub', 'sup', 'br', 'p', 'span'] }) }}
              />
            </div>
          </div>

          {/* Image + Passage Toggles */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-8 px-2.5">
              <Upload className="w-3.5 h-3.5 mr-1" /> Image
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button type="button" onClick={() => setShowPassage(!showPassage)} className={`text-xs px-2.5 h-8 rounded-full border transition-colors ${showPassage ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-white border-[#E5E7EB] hover:border-[#3B82F6]'}`}>
              Passage {showPassage ? '▼' : '›'}
            </button>
            {newQuestion.image_url && (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] text-[#6B7280] truncate max-w-[100px]">{newQuestion.image_url}</span>
                <button onClick={() => setNewQuestion({ ...newQuestion, image_url: '' })} className="text-red-400 hover:bg-red-50 p-1 rounded shrink-0"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          {/* Image Preview */}
          {newQuestion.image_url && (
            <div className="border border-[#E5E7EB] rounded-lg p-1.5 bg-gray-50">
              <img src={newQuestion.image_url} alt="" className="max-h-28 sm:max-h-40 object-contain rounded mx-auto" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          {/* Passage */}
          {showPassage && (
            <div className="space-y-1">
              <Label className="text-xs">Passage <span className="text-[#6B7280] font-normal">(comprehension)</span></Label>
              <Textarea value={newQuestion.passage_text || ''} onChange={e => setNewQuestion({ ...newQuestion, passage_text: e.target.value })} rows={3} placeholder="Paste reading passage..." className="text-sm" />
            </div>
          )}

          {/* Fill in the blank */}
          {newQuestion.question_type === 'fill_in_blank' && (
            <div className="space-y-1">
              <Label className="text-xs">Correct Answer</Label>
              <Input value={newQuestion.correct_answer || ''} onChange={e => setCorrect(e.target.value)} placeholder="Enter the correct answer" className="h-9 text-sm" />
              <p className="text-[10px] text-[#6B7280]">Case-insensitive matching.</p>
            </div>
          )}

          {/* Options */}
          {newQuestion.question_type !== 'fill_in_blank' && newQuestion.question_type !== 'true_false' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Options <span className="font-normal text-[#6B7280]">(click ○ to mark correct)</span></Label>
                <Button variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs"><Plus className="w-3 h-3 mr-0.5" /> Add</Button>
              </div>
              <div className="space-y-1.5">
                {(newQuestion.options || []).map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#6B7280] w-4 text-center shrink-0">{String.fromCharCode(65 + i)}.</span>
                    <div className="flex-1 min-w-0">
                      <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="h-9 text-sm" />
                    </div>
                    <button type="button" onClick={() => setCorrect(opt)}
                      className={`p-1.5 rounded-lg border shrink-0 touch-manipulation active:scale-90 ${isCorrect(opt) ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm' : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#3B82F6]'}`}
                      title="Mark correct">
                      {isCorrect(opt)
                        ? <Check className="w-3.5 h-3.5" />
                        : <div className={`w-3.5 h-3.5 ${newQuestion.question_type === 'multi_select' ? 'border border-[#D1D5DB] rounded' : 'rounded-full border-2 border-[#D1D5DB]'}`} />
                      }
                    </button>
                    {(newQuestion.options || []).length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 touch-manipulation">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True/False */}
          {newQuestion.question_type === 'true_false' && (
            <div className="space-y-1">
              <Label className="text-xs">Correct Answer</Label>
              <div className="flex gap-2">
                {['True', 'False'].map(v => (
                  <button key={v} type="button" onClick={() => setCorrect(v)}
                    className={`flex-1 py-2 rounded-lg border font-medium text-xs transition-all touch-manipulation active:scale-95 ${isCorrect(v) ? 'bg-[#10B981] text-white border-[#10B981] shadow-sm' : 'border-[#E5E7EB] hover:border-[#3B82F6]'}`}>
                    {v === 'True' ? '✓ True' : '✗ False'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleAdd} disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB] flex-1 h-9 text-sm">
              {editingId ? <Pencil className="w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {loading ? 'Saving...' : editingId ? 'Update' : 'Add Question'}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(newQuestion)} className="h-9 text-sm px-3">
              <Eye className="w-3.5 h-3.5 mr-1" /> Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">All Questions</h3>
        <span className="text-xs text-[#6B7280]">Drag · {questions.length} total</span>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 text-[#6B7280]">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No questions yet</p>
          <p className="text-xs mt-1">Add or import from the Question Bank.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const grouped = sections.length > 0;
            let qi = 0;
            const out: any[] = [];
            const pushSection = (title: string, instr?: string) => out.push(
              <div key={`h-${title}`} className="pt-2 pb-1"><h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">{title}</h4>{instr && <p className="text-[10px] text-[#6B7280]">{instr}</p>}</div>
            );
            if (grouped) {
              for (const s of sections) {
                const sq = questions.filter((q: any) => q.section === s);
                if (!sq.length) continue;
                pushSection(s, sq[0]?.section_instructions);
                for (const q of sq) { const idx = qi++; out.push(renderCard(q, idx)); }
              }
              const ua = questions.filter((q: any) => !q.section);
              if (ua.length) { pushSection('General'); for (const q of ua) { const idx = qi++; out.push(renderCard(q, idx)); } }
            } else {
              questions.forEach((q, i) => out.push(renderCard(q, i)));
            }
            return out;
          })()}
        </div>
      )}

      {/* Question Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">Question Preview</DialogTitle></DialogHeader>
          {showPreview && (
            <div className="space-y-3 text-sm">
              {showPreview.section && <Badge className="bg-[#9333EA] text-[10px]">{showPreview.section}</Badge>}
              {showPreview.passage_text && (
                <div className="p-2 bg-gray-50 border border-[#E5E7EB] rounded text-xs italic text-[#4B5563]">
                  <strong className="not-italic">Passage:</strong><br />{showPreview.passage_text}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#3B82F6] text-white text-xs font-bold shrink-0">1</span>
                <Badge variant="outline" className="text-[10px]">{typeLabel(showPreview.question_type)} · {showPreview.marks}m</Badge>
              </div>
              <div className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(showPreview.question_text || '', { ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'sub', 'sup', 'br', 'p', 'span'] }) }} />
              {showPreview.image_url && <img src={showPreview.image_url} alt="" className="max-h-32 rounded object-contain border mx-auto" />}
              {showPreview.question_type === 'fill_in_blank' ? (
                <div className="p-2 border border-dashed border-[#D1D5DB] rounded bg-gray-50">
                  <Input placeholder="Type answer..." disabled className="h-8 text-sm" />
                  <p className="text-[10px] text-[#6B7280] mt-1">Expected: <strong>{showPreview.correct_answer}</strong></p>
                </div>
              ) : showPreview.question_type === 'true_false' ? (
                <div className="flex gap-2">
                  {['True', 'False'].map(v => (
                    <span key={v} className={`flex-1 py-2 rounded-lg border text-center text-xs font-medium ${showPreview.correct_answer === v ? 'bg-[#10B981] text-white border-[#10B981]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>{v}</span>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {(showPreview.options || []).filter(Boolean).map((opt: string, oi: number) => (
                    <div key={oi} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${(Array.isArray(showPreview.correct_answer) ? showPreview.correct_answer : [showPreview.correct_answer]).includes(opt) ? 'border-[#10B981] bg-[#F0FDF4]' : 'border-[#E5E7EB]'}`}>
                      <span className={`w-4 h-4 flex items-center justify-center shrink-0 border-2 rounded-full ${(Array.isArray(showPreview.correct_answer) ? showPreview.correct_answer : [showPreview.correct_answer]).includes(opt) ? 'bg-[#10B981] border-[#10B981]' : 'border-[#D1D5DB]'}`}>
                        {(Array.isArray(showPreview.correct_answer) ? showPreview.correct_answer : [showPreview.correct_answer]).includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FileImportDialog open={showFileImport} onOpenChange={setShowFileImport} examId={exam.id} onImported={loadFromApi} />

      {/* AI Generation Dialog */}
      <Dialog open={showAIGen} onOpenChange={(o) => { if (!o) { setShowAIGen(false); setAiPreview(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">{aiPreview ? 'Review Generated Questions' : 'Generate with AI'}</DialogTitle></DialogHeader>

          {aiPreview ? (
            <div className="space-y-3">
              <Alert className="py-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /><AlertDescription className="text-xs">{aiPreview.length} question{aiPreview.length > 1 ? 's' : ''} generated.</AlertDescription></Alert>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-[#E5E7EB] rounded p-2">
                {aiPreview.map((q, i) => (
                  <div key={i} className="p-2 border border-[#E5E7EB] rounded hover:bg-gray-50">
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] bg-[#EFF6FF] text-[#3B82F6] px-1.5 py-0">Q{i + 1}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabel(q.question_type)}</Badge>
                      {q.marks && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.marks}m</Badge>}
                      {q.difficulty && <Badge className={`text-[10px] px-1.5 py-0 ${q.difficulty === 'easy' ? 'bg-[#10B981]' : q.difficulty === 'hard' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`}>{q.difficulty}</Badge>}
                      {q.topic && <Badge variant="outline" className="text-[10px] text-[#9333EA] border-[#D8B4FE] px-1.5 py-0">{q.topic}</Badge>}
                    </div>
                    <div className="text-xs font-medium mb-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question_text, { ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'sub', 'sup', 'br', 'p', 'span'] }) }} />
                    {q.options?.length > 0 && q.question_type !== 'true_false' && (
                      <div className="space-y-0.5">
                        {q.options.filter(Boolean).map((o: string, oi: number) => (
                          <div key={oi} className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mr-1 mb-0.5 ${(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).includes(o) ? 'border-[#10B981] bg-[#F0FDF4] text-[#16A34A]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                            {String.fromCharCode(65 + oi)}. {o}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.image_url && <img src={q.image_url} alt="" className="mt-1 max-h-10 rounded object-contain" />}
                    {q.explanation && <p className="mt-0.5 text-[10px] text-[#6B7280] italic"><strong>Why:</strong> {q.explanation}</p>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiPreview(null)} className="flex-1 text-xs h-9"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Button>
                <Button onClick={handleImportAi} disabled={aiLoading} className="bg-[#10B981] flex-1 text-xs h-9">
                  <Upload className="w-3.5 h-3.5 mr-1" />{aiLoading ? 'Importing...' : `Import ${aiPreview.length}`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#6B7280]">Paste material and AI generates JAMB/WAEC/NECO-standard questions. <span className="text-[#10B981] font-medium">Free</span> — uses Google Gemini or local generation.</p>

              <div className="space-y-1">
                <Label className="text-xs">Question Type</Label>
                <Select value={aiType} onValueChange={v => setAiType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="multi_select">Multi-Select</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Count</Label>
                  <Input type="number" value={aiCount} onChange={e => setAiCount(parseInt(e.target.value) || 5)} min={1} max={30} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={aiDifficulty} onValueChange={v => setAiDifficulty(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Exam Standard</Label>
                <Select value={aiExamType} onValueChange={v => setAiExamType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JAMB/WAEC">JAMB / WAEC</SelectItem>
                    <SelectItem value="NECO">NECO</SelectItem>
                    <SelectItem value="Post-UTME">Post-UTME</SelectItem>
                    <SelectItem value="IGCSE">IGCSE</SelectItem>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Topic <span className="font-normal text-[#9CA3AF]">(optional)</span></Label>
                <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g. Photosynthesis" className="h-9 text-sm" />
              </div>

              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-[#E5E7EB]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={aiExplanations} onChange={e => setAiExplanations(e.target.checked)} className="w-3.5 h-3.5" />
                  <span className="text-xs">Explanations</span>
                </label>
                <span className="text-[10px] text-[#10B981] font-medium">Free · No API key needed</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Material</Label>
                <Textarea value={aiText} onChange={e => setAiText(e.target.value)} rows={4} placeholder="Paste textbook content, notes, past questions..." className="text-xs min-h-[80px]" />
                <div className="flex items-center gap-1">
                  <input ref={aiFileInputRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleAiFileUpload} />
                  <button type="button" onClick={() => aiFileInputRef.current?.click()} className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-1">
                    <FileUp className="w-3 h-3" /> Upload .txt or .docx
                  </button>
                  <span className="text-[10px] text-[#9CA3AF]">to fill material</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAIGen(false)} className="flex-1 text-xs h-9">Cancel</Button>
                <Button onClick={handleAIGenerate} disabled={aiLoading || !aiText.trim()} className="bg-[#8B5CF6] flex-1 text-xs h-9">
                  <Sparkles className={`w-3.5 h-3.5 mr-1 ${aiLoading ? 'animate-pulse' : ''}`} />
                  {aiLoading ? <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gen...</span> : 'Generate'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CbtQuestionBankDrawer open={bankOpen} onOpenChange={setBankOpen} examId={exam.id} subjectId={exam.subject_id} onImported={loadFromApi} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="!p-4 sm:!p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Question?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">This cannot be undone. The question will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 flex-1 text-xs h-9">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const saveToBank = async (q: any, idx: number) => {
    setSavingBank(idx);
    try {
      await addToCbtQuestionBank({
        question_type: q.question_type,
        question_text: q.question_text,
        image_url: q.image_url || null,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        marks: q.marks || 1,
        difficulty: q.difficulty || 'medium',
        topic: q.topic || '',
        tags: [],
        subject_id: exam.subject_id,
        teacher_id: 0,
        status: 'Active' as const,
      });
      toast.success('Saved to question bank');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save to bank');
    }
    setSavingBank(null);
  };

  function renderCard(q: any, idx: number) {
    return (
      <div key={q.id || idx} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd} className={dragIndex === idx ? 'opacity-50 scale-[1.02]' : ''}>
        <Card className={`group hover:shadow-md transition-shadow ${dragIndex === idx ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/20' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="cursor-grab active:cursor-grabbing text-[#D1D5DB] hover:text-[#6B7280] mt-0.5 shrink-0 touch-manipulation" title="Drag">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-[#EFF6FF] text-[#3B82F6] px-1.5 py-0">Q{idx + 1}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabel(q.question_type)}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.marks}m</Badge>
                  {q.section && <Badge variant="outline" className="text-[10px] bg-[#F3E8FF] text-[#9333EA] border-[#D8B4FE] px-1.5 py-0">{q.section.replace('Section ', 'S')}</Badge>}
                  {q.difficulty && <Badge className={`text-[10px] px-1.5 py-0 ${q.difficulty === 'easy' ? 'bg-[#10B981]' : q.difficulty === 'hard' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`}>{q.difficulty}</Badge>}
                </div>
                {q.passage_text && <div className="mb-1 p-1.5 bg-gray-50 border border-[#E5E7EB] rounded text-[10px] text-[#6B7280] italic line-clamp-1">Passage: {q.passage_text.substring(0, 80)}...</div>}
                <div className="text-xs font-medium [&_img]:max-h-12 [&_img]:rounded" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question_text, { ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'sub', 'sup', 'br', 'p', 'span', 'img'] }) }} />
                {q.image_url && <img src={q.image_url} alt="" className="mt-1 max-h-10 rounded object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                {q.question_type !== 'fill_in_blank' && q.options?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {q.options.filter(Boolean).map((o: string, oi: number) => (
                      <span key={oi} className={`text-[10px] px-1.5 py-0.5 rounded border ${(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).includes(o) ? 'border-[#10B981] bg-[#F0FDF4] text-[#16A34A]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                        {String.fromCharCode(65 + oi)}. {o.length > 18 ? o.substring(0, 18) + '…' : o}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => saveToBank(q, idx)} disabled={savingBank === idx} className="p-1.5 text-[#8B5CF6] hover:bg-purple-50 rounded touch-manipulation disabled:opacity-40" title="Save to question bank">
                  {savingBank === idx ? <span className="w-3.5 h-3.5 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin block" /> : <Library className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => startEdit(q)} className="p-1.5 text-[#6B7280] hover:bg-gray-100 rounded touch-manipulation" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(q.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded touch-manipulation" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
