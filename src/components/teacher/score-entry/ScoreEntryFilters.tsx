import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface ClassOption {
  id: number;
  name: string;
}

interface SubjectOption {
  id: number;
  subject_id: number;
  subject_name: string;
  name: string;
}

interface ScoreEntryFiltersProps {
  selectedClassId: string;
  selectedSubjectId: string;
  selectedTerm: string;
  selectedYear: string;
  assignedClasses: ClassOption[];
  availableSubjects: SubjectOption[];
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onYearChange: (value: string) => void;
}

const TERMS = ['First Term', 'Second Term', 'Third Term'];
const YEARS = ['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'];

export function ScoreEntryFilters({
  selectedClassId,
  selectedSubjectId,
  selectedTerm,
  selectedYear,
  assignedClasses,
  availableSubjects,
  onClassChange,
  onSubjectChange,
  onTermChange,
  onYearChange,
}: ScoreEntryFiltersProps) {
  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div>
        <Label className="text-slate-700 mb-2 block text-sm font-medium">Class</Label>
        <Select value={selectedClassId} onValueChange={onClassChange}>
          <SelectTrigger className="rounded-lg border-slate-200">
            <SelectValue placeholder="Choose a class" />
          </SelectTrigger>
          <SelectContent>
            {assignedClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id.toString()}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-700 mb-2 block text-sm font-medium">Subject</Label>
        <Select value={selectedSubjectId} onValueChange={onSubjectChange}>
          <SelectTrigger className="rounded-lg border-slate-200" disabled={!selectedClassId}>
            <SelectValue placeholder="Choose a subject" />
          </SelectTrigger>
          <SelectContent>
            {availableSubjects.map((subject) => (
              <SelectItem key={subject.subject_id} value={subject.subject_id.toString()}>
                {subject.subject_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-700 mb-2 block text-sm font-medium">Term</Label>
        <Select value={selectedTerm} onValueChange={onTermChange}>
          <SelectTrigger className="rounded-lg border-slate-200">
            <SelectValue placeholder="Choose term" />
          </SelectTrigger>
          <SelectContent>
            {TERMS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-700 mb-2 block text-sm font-medium">Academic Year</Label>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="rounded-lg border-slate-200">
            <SelectValue placeholder="Choose year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
