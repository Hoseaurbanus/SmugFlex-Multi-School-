import { Check, Minus } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';

interface QuestionCardProps {
  question: any;
  index: number;
  selectedAnswer: any;
  onAnswer: (answer: any) => void;
}

export function QuestionCard({ question, index, selectedAnswer, onAnswer }: QuestionCardProps) {
  const qNum = index + 1;

  const isSelected = (value: string) => {
    if (question.question_type === 'multi_select') {
      return Array.isArray(selectedAnswer) && selectedAnswer.includes(value);
    }
    return selectedAnswer === value;
  };

  const handleOptionClick = (value: string) => {
    if (question.question_type === 'multi_select') {
      const arr: string[] = Array.isArray(selectedAnswer) ? [...selectedAnswer] : [];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(value);
      onAnswer(arr);
    } else {
      onAnswer(value === selectedAnswer ? '' : value);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#3B82F6] text-white text-sm font-bold shrink-0">
          {qNum}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {question.question_type === 'single_choice' ? 'Single Choice' :
               question.question_type === 'true_false' ? 'True/False' :
               question.question_type === 'fill_in_blank' ? 'Fill in the Blank' : 'Multi-Select'} · {question.marks} mark{question.marks !== 1 ? 's' : ''}
            </Badge>
          </div>

          {question.passage_text && (
            <div className="mb-4 p-4 bg-gray-50 border border-[#E5E7EB] rounded-lg text-sm leading-relaxed text-[#4B5563]">
              <strong className="text-[#1F2937] block mb-1 text-xs uppercase tracking-wider">Passage:</strong>
              {question.passage_text}
            </div>
          )}

          <div className="text-base font-medium text-[#1F2937]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.question_text, { ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'sub', 'sup', 'br', 'p', 'span'] }) }} />

          {question.image_url && (
            <div className="mt-3 border border-[#E5E7EB] rounded-lg overflow-hidden bg-gray-50 p-2">
              <img src={question.image_url} alt="Question diagram" className="max-h-64 object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
      </div>

      {question.question_type === 'fill_in_blank' ? (
        <div className="ml-11 space-y-2">
          <Input
            value={selectedAnswer || ''}
            onChange={e => onAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="max-w-md"
          />
        </div>
      ) : (
        <div className="space-y-2 ml-11">
          {question.options?.map((opt: string, i: number) => {
            const selected = isSelected(opt);
            const isMulti = question.question_type === 'multi_select';
            return (
              <button
                key={i}
                onClick={() => handleOptionClick(opt)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  selected
                    ? 'border-[#3B82F6] bg-blue-50 ring-1 ring-[#3B82F6]'
                    : 'border-[#E5E7EB] hover:border-[#3B82F6] hover:bg-gray-50'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                  isMulti ? 'rounded' : 'rounded-full'
                } border-2 ${
                  selected ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'border-[#D1D5DB]'
                }`}>
                  {(selected && !isMulti) && <Check className="w-3 h-3" />}
                  {(selected && isMulti) && <Check className="w-3 h-3" />}
                  {!selected && isMulti && <Minus className="w-3 h-3 opacity-0" />}
                </span>
                <span className="text-sm font-medium">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
