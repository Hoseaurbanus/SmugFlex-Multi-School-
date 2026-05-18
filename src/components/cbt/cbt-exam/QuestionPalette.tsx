interface QuestionPaletteProps {
  total: number;
  currentIndex: number;
  answers: Record<number, any>;
  onNavigate: (index: number) => void;
  questions?: any[];
}

export function QuestionPalette({ total, currentIndex, answers, onNavigate, questions }: QuestionPaletteProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-[#1F2937] mb-3">Question Palette</h4>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }, (_, i) => {
          const qNum = i + 1;
          const qId = questions && questions[i] ? questions[i].id : i;
          const hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
          const isCurrent = i === currentIndex;
          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                isCurrent
                  ? 'bg-[#3B82F6] text-white ring-2 ring-[#3B82F6] ring-offset-1'
                  : hasAnswer
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              {qNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
