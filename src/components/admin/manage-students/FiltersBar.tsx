import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Search } from "lucide-react";

interface FiltersBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterLevel: string;
  onLevelChange: (level: string) => void;
  filterClass: string;
  onClassChange: (cls: string) => void;
  levels: string[];
  classNames: string[];
  filteredCount: number;
  totalCount: number;
  onClear: () => void;
}

export function FiltersBar({
  searchTerm,
  onSearchChange,
  filterLevel,
  onLevelChange,
  filterClass,
  onClassChange,
  levels,
  classNames,
  filteredCount,
  totalCount,
  onClear,
}: FiltersBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Search</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
            <Input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or admission number..."
              className="pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Level</Label>
            <Select value={filterLevel} onValueChange={onLevelChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level === "All" ? "All Levels" : level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Class</Label>
            <Select value={filterClass} onValueChange={onClassChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classNames.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className === "All" ? "All Classes" : className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{filteredCount} of {totalCount} students</span>
          <Button onClick={onClear} variant="ghost" size="sm">
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
