import { useState, useEffect } from 'react';
import { Search, Check, Plus, Filter, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number;
  subjectId?: number;
  onImported: () => void;
}

export function CbtQuestionBankDrawer({ open, onOpenChange, examId, subjectId, onImported }: Props) {
  const { cbtQuestionBank, loadCbtQuestionBankFromAPI, importFromCbtBank } = useSchool();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (open) {
      loadCbtQuestionBankFromAPI(subjectId ? { subject_id: subjectId } : undefined);
      setSelected([]);
      setSearchQuery('');
      setFilterType('all');
      setFilterDifficulty('all');
      setFilterTopic('all');
    }
  }, [open, subjectId]);

  const topics = [...new Set(cbtQuestionBank.map(q => q.topic).filter(Boolean))] as string[];

  const filtered = cbtQuestionBank.filter(q => {
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(q.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(q.tags || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (filterType !== 'all' && q.question_type !== filterType) return false;
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
    if (filterTopic !== 'all' && q.topic !== filterTopic) return false;
    if (subjectId && q.subject_id !== subjectId) return false;
    return q.status === 'Active';
  });

  const toggle = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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

  const handleImport = async () => {
    if (selected.length === 0) { toast.error('Select questions to import'); return; }
    setLoading(true);
    try {
      const result = await importFromCbtBank(examId, selected);
      const count = result?.imported || selected.length;
      toast.success(`Imported ${count} question${count !== 1 ? 's' : ''}`);
      setSelected([]);
      onImported();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to import questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Question Bank</SheetTitle>
            <span className="text-xs text-[#6B7280]">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input
              placeholder="Search questions, topics, tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            <button onClick={() => setShowFilters(!showFilters)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors ${showFilters ? 'bg-[#3B82F6] text-white' : 'text-[#6B7280] hover:bg-gray-100'}`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        {showFilters && (
          <div className="p-4 border-b bg-gray-50 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="multi_select">Multi-Select</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1">Difficulty</label>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1">Topic</label>
                <Select value={filterTopic} onValueChange={setFilterTopic}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(filterType !== 'all' || filterDifficulty !== 'all' || filterTopic !== 'all') && (
              <button onClick={() => { setFilterType('all'); setFilterDifficulty('all'); setFilterTopic('all'); }} className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <p className="font-medium">{searchQuery || filterType !== 'all' || filterDifficulty !== 'all' || filterTopic !== 'all' ? 'No matching questions' : 'Question bank is empty'}</p>
              <p className="text-sm mt-1">Save questions to the bank while creating exams.</p>
            </div>
          ) : (
            filtered.map(q => {
              const isSelected = selected.includes(q.id);
              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-[#3B82F6] bg-blue-50 ring-1 ring-[#3B82F6]' : 'border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-sm'}`}
                  onClick={() => toggle(q.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#D1D5DB]'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{questionTypeLabel(q.question_type)}</Badge>
                        {q.difficulty && (
                          <Badge className={`text-xs ${
                            q.difficulty === 'easy' ? 'bg-[#10B981]' :
                            q.difficulty === 'hard' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                          }`}>{q.difficulty}</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#1F2937] line-clamp-2">{q.question_text}</p>
                      {q.topic && <span className="text-xs text-[#6B7280] mt-1 block">Topic: {q.topic}</span>}
                      {q.tags && q.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {q.tags.map((tag: string, ti: number) => (
                            <span key={ti} className="text-xs px-1.5 py-0.5 bg-[#F3F4F6] rounded text-[#6B7280]">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <SheetFooter className="border-t bg-white p-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium text-[#6B7280]">{selected.length} selected</span>
            <Button onClick={handleImport} disabled={loading || selected.length === 0} className="bg-[#3B82F6]">
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Importing...' : `Import to Exam (${selected.length})`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
