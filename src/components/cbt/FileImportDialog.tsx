import { useState, useRef } from 'react';
import { Upload, FileText, File, Check, Eye, Pencil, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { readFileContent, parseQuestions, ParsedQuestion } from '../../utils/questionParser';
import { useSchool } from '../../contexts/SchoolContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number;
  onImported: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  single_choice: 'Single Choice',
  multi_select: 'Multi-Select',
  true_false: 'True/False',
  fill_in_blank: 'Fill in the Blank',
};

export function FileImportDialog({ open, onOpenChange, examId, onImported }: Props) {
  const { addCbtQuestion } = useSchool();
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setQuestions([]);
    setEditingIdx(null);
    setLoading(false);
    setImporting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'txt' && ext !== 'docx') {
      toast.error('Only .txt and .docx files are supported');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    try {
      const content = await readFileContent(file);
      const parsed = parseQuestions(content);
      if (parsed.length === 0) {
        toast.error('No questions found in the file. Check the format and try again.');
        setLoading(false);
        return;
      }
      setQuestions(parsed);
      setStep('preview');
      toast.success(`Found ${parsed.length} question${parsed.length !== 1 ? 's' : ''}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse file');
    }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateQuestion = (idx: number, patch: Partial<ParsedQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const handleImport = async () => {
    if (!questions.length) return;
    setImporting(true);
    setImportProgress(0);
    let imported = 0;
    let errors = 0;
    for (let i = 0; i < questions.length; i++) {
      setImportProgress(i + 1);
      try {
        await addCbtQuestion(examId, questions[i]);
        imported++;
      } catch {
        errors++;
      }
    }
    if (imported > 0) {
      toast.success(`Imported ${imported} question${imported !== 1 ? 's' : ''}${errors > 0 ? ` (${errors} failed)` : ''}`);
      onImported();
      handleClose();
    } else {
      toast.error('All questions failed to import. Check the format and try again.');
    }
    setImporting(false);
    setImportProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {step === 'preview' && (
              <button onClick={() => setStep('upload')} className="p-1 -ml-1 hover:bg-gray-100 rounded touch-manipulation">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {step === 'upload' ? 'Import Questions from File' : `Review Questions (${questions.length})`}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="space-y-3">
            <p className="text-xs text-[#6B7280]">Upload a <strong>.txt</strong> or <strong>.docx</strong> file. The system will automatically detect questions, options, and answer keys.</p>

            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors touch-manipulation
                ${loading ? 'border-[#8B5CF6] bg-[#F5F3FF]' : 'border-[#E5E7EB] hover:border-[#3B82F6] hover:bg-blue-50/30'}`}
            >
              <input ref={fileInputRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleFilePick} />
              {loading ? (
                <div className="space-y-2">
                  <div className="w-8 h-8 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-medium text-[#8B5CF6]">Reading & parsing file...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-[#6B7280]" />
                  <p className="text-sm font-medium text-[#1F2937]">Tap to select a file</p>
                  <p className="text-xs text-[#6B7280]">or drag and drop .txt / .docx here</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-[#6B7280]">
              <div className="p-2 bg-gray-50 rounded-lg border border-[#E5E7EB]">
                <FileText className="w-4 h-4 mx-auto mb-1 text-[#3B82F6]" />
                Plain Text (.txt)
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-[#E5E7EB]">
                <File className="w-4 h-4 mx-auto mb-1 text-[#2563EB]" />
                Word (.docx)
              </div>
            </div>

            <div className="p-2 bg-[#F0FDF4] border border-[#D1FAE5] rounded-lg">
              <p className="text-[10px] text-[#16A34A] font-medium">Supported formats:</p>
              <ul className="text-[10px] text-[#6B7280] mt-0.5 list-disc list-inside">
                <li>Numbered questions: <code className="text-[#3B82F6]">1. What is...</code></li>
                <li>Options: <code className="text-[#3B82F6]">A. Plant  B. Animal</code></li>
                <li>Answers: <code className="text-[#3B82F6]">Answer: A</code></li>
                <li>True/False, Fill-in-blank (___)</li>
                <li>Sections: <code className="text-[#3B82F6]">Section A: Objectives</code></li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 text-xs h-9">Cancel</Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="bg-[#3B82F6] flex-1 text-xs h-9">
                <Upload className="w-3.5 h-3.5 mr-1" /> Select File
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert className="py-2">
              <Eye className="w-3.5 h-3.5 text-[#3B82F6]" />
              <AlertDescription className="text-xs">
                <strong>{fileName}</strong> — {questions.length} question{questions.length !== 1 ? 's' : ''} found. Tap any question to edit before importing.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto border border-[#E5E7EB] rounded-lg p-2">
              {questions.map((q, i) => (
                <div key={i} className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  {editingIdx === i ? (
                    <div className="p-2 space-y-2 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#3B82F6]">Q{i + 1}</span>
                        <button onClick={() => setEditingIdx(null)} className="p-1 text-[#6B7280] hover:bg-gray-200 rounded touch-manipulation">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Question Text</Label>
                        <Textarea value={q.question_text} onChange={e => updateQuestion(i, { question_text: e.target.value })}
                          rows={2} className="text-xs min-h-[40px]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Type</Label>
                          <Select value={q.question_type} onValueChange={v => updateQuestion(i, { question_type: v as any, options: v === 'fill_in_blank' ? [] : v === 'true_false' ? ['True', 'False'] : q.options })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single_choice">Single Choice</SelectItem>
                              <SelectItem value="multi_select">Multi-Select</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="fill_in_blank">Fill in Blank</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Marks</Label>
                          <Input type="number" value={q.marks} onChange={e => updateQuestion(i, { marks: parseInt(e.target.value) || 1 })} min={1} className="h-7 text-xs" />
                        </div>
                      </div>
                      {q.question_type !== 'fill_in_blank' && q.question_type !== 'true_false' && (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Options (one per line)</Label>
                          <Textarea value={q.options.join('\n')} onChange={e => updateQuestion(i, { options: e.target.value.split('\n').filter(Boolean) })}
                            rows={3} className="text-xs min-h-[60px]" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-[10px]">Correct Answer</Label>
                        <Input value={q.question_type === 'multi_select' ? (Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer) : (q.correct_answer as string)}
                          onChange={e => updateQuestion(i, { correct_answer: q.question_type === 'multi_select' ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : e.target.value })}
                          className="h-7 text-xs" placeholder={q.question_type === 'multi_select' ? 'Comma-separated' : 'Answer text'} />
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => setEditingIdx(i)}>
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] bg-[#EFF6FF] text-[#3B82F6] px-1.5 py-0">Q{i + 1}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{TYPE_LABELS[q.question_type]}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.marks}m</Badge>
                      </div>
                      <p className="text-xs font-medium line-clamp-2">{q.question_text}</p>
                      {q.options.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {q.options.map((o, oi) => (
                            <span key={oi} className={`text-[10px] px-1.5 py-0.5 rounded border ${(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).includes(o) ? 'border-[#10B981] bg-[#F0FDF4] text-[#16A34A]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                              {String.fromCharCode(65 + oi)}. {o.length > 20 ? o.substring(0, 20) + '…' : o}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#6B7280]">
                          {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer ? `Answer: ${q.correct_answer}` : ''}
                        </span>
                        <Pencil className="w-3 h-3 text-[#9CA3AF]" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1 text-xs h-9">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose Different
              </Button>
              <Button onClick={handleImport} disabled={importing || !questions.length} className="bg-[#10B981] flex-1 text-xs h-9">
                <Upload className="w-3.5 h-3.5 mr-1" />
                {importing ? `Importing ${importProgress}/${questions.length}...` : `Import ${questions.length} Q${questions.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
